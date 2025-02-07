import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import Sentiment from "sentiment";
import { Maximize2, Minimize2 } from "lucide-react";

/* -------------------------------------------------------------------------
 * CONSTANTS & TYPES
 * ------------------------------------------------------------------------- */

/** List of valid languages supported for sentiment analysis. */
const VALID_LANGUAGES = ["de", "en", "fr", "es"] as const;

/** Window size for the moving average smoothing. */
const WINDOW_SIZE = 100;

/** Colors for each sentiment type for the chart. */
const SENTIMENT_COLORS: Record<"positive" | "negative", string> = {
  positive: "#2BA02B",
  negative: "#D62727",
};

/** A single data point used to plot the sentiment over time. */
interface SentimentDataPoint {
  date: Date;
  positive: number;
  negative: number;
}

/** Chat message type (adjust as needed). */
interface ChatMessage {
  date: Date;
  message: string;
  isUsed: boolean;
}

/* -------------------------------------------------------------------------
 * HELPER FUNCTIONS
 * ------------------------------------------------------------------------- */

/**
 * Generates a continuous series of dates (day by day) from a start to an end date.
 * @param start - The starting date.
 * @param end - The ending date.
 * @returns An array of dates representing every day in the range [start, end].
 */
function getDateRange(start: Date, end: Date): Date[] {
  return d3.timeDay.range(start, d3.timeDay.offset(end, 1));
}

/**
 * Fills in missing days within the sorted daily sentiment data,
 * using the last known value for any missing date.
 * @param sortedData - The sentiment data points sorted by date.
 * @returns A new array where missing dates are filled with the previous day's data.
 */
function fillMissingDays(
  sortedData: SentimentDataPoint[]
): SentimentDataPoint[] {
  if (!sortedData.length) return [];

  const filledData: SentimentDataPoint[] = [];
  const firstDate = sortedData[0].date;
  const lastDate = sortedData[sortedData.length - 1].date;
  const allDates = getDateRange(firstDate, lastDate);

  // Create a Map for quick lookup by date string (YYYY-MM-DD).
  const dataMap = new Map<string, SentimentDataPoint>();
  sortedData.forEach((d) => {
    const key = d.date.toISOString().split("T")[0];
    dataMap.set(key, { ...d });
  });

  let lastValid: SentimentDataPoint | null = null;

  // For each day in the continuous range, fill data with the last valid entry if missing.
  allDates.forEach((currentDate) => {
    const key = currentDate.toISOString().split("T")[0];
    if (dataMap.has(key)) {
      const dataPoint = dataMap.get(key)!;
      filledData.push({ ...dataPoint });
      lastValid = { ...dataPoint };
    } else if (lastValid) {
      filledData.push({
        date: currentDate,
        positive: lastValid.positive,
        negative: lastValid.negative,
      });
    } else {
      // Fallback for unexpected case: if there's no "last valid" data yet
      // (should not happen if the first day is in the data).
      filledData.push({
        date: currentDate,
        positive: 0,
        negative: 0,
      });
    }
  });

  return filledData;
}

/**
 * Applies a simple moving average smoothing over the sentiment data using a
 * specified window size. If the data length is shorter than the window, the
 * window size shrinks to the data length.
 * @param data - The daily sentiment data to smooth.
 * @param windowSize - The maximum size of the smoothing window.
 * @returns A new array with smoothed sentiment values.
 */
function smoothData(
  data: SentimentDataPoint[],
  windowSize: number
): SentimentDataPoint[] {
  if (!data.length) return [];

  const effectiveWindowSize = Math.min(data.length, windowSize);
  const halfWindow = Math.floor(effectiveWindowSize / 2);

  return data.map((point, i, arr) => {
    const startIndex = Math.max(0, i - halfWindow);
    const endIndex = Math.min(arr.length - 1, i + halfWindow);
    const windowSlice = arr.slice(startIndex, endIndex + 1);

    return {
      date: point.date,
      positive: d3.mean(windowSlice, (d) => d.positive) ?? point.positive,
      negative: d3.mean(windowSlice, (d) => d.negative) ?? point.negative,
    };
  });
}

/**
 * Draws the sentiment chart (positive and negative lines) within a provided SVG element.
 * @param svgRef - The ref to the SVG element.
 * @param sentimentData - The data points to visualize.
 * @param dimensions - The container dimensions for responsive sizing.
 * @param darkMode - Flag indicating whether the dark mode is active.
 */
function drawChart(
  svgRef: React.RefObject<SVGSVGElement>,
  sentimentData: SentimentDataPoint[],
  dimensions: { width: number; height: number },
  darkMode: boolean
) {
  const { width, height } = dimensions;
  let margin = { top: 20, right: 10, bottom: 70, left: 30 };

  if (window.innerWidth <= 768) {
    margin.right = 20;
    margin.left = 40;
  }

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Select the SVG element and clear previous content.
  const svg = d3.select(svgRef.current);
  svg.selectAll("*").remove();

  // Scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
    .range([0, innerWidth]);

  // Determine max Y value from both positive and negative ranges.
  const yMax =
    d3.max(sentimentData, (d) => Math.max(d.positive, d.negative)) || 1;
  const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

  // Line generator for a specific sentiment key: "positive" or "negative".
  function createLineGenerator(key: keyof Omit<SentimentDataPoint, "date">) {
    return d3
      .line<SentimentDataPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d[key]))
      .curve(d3.curveBasis);
  }

  // Create main group with margin offset.
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X Axis
  const maxXTicks = Math.floor(innerWidth / 80);
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(maxXTicks))
    .selectAll("text")
    .style("font-size", "14px")
    .attr("dy", "1em")
    .style("text-anchor", "middle");

  // Y Axis
  g.append("g").call(d3.axisLeft(yScale).ticks(5)).style("font-size", "14px");

  // Draw the sentiment lines (positive and negative).
  Object.entries(SENTIMENT_COLORS).forEach(([sentimentKey, color]) => {
    g.append("path")
      .datum(sentimentData)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr(
        "d",
        createLineGenerator(
          sentimentKey as keyof Omit<SentimentDataPoint, "date">
        )
      );
  });

  // Draw a legend at the top-right of the chart.
  const legendGroup = g
    .append("g")
    .attr("transform", `translate(${innerWidth - 180}, -20)`);
  let legendX = 0;
  Object.entries(SENTIMENT_COLORS).forEach(([key, color]) => {
    const legendItem = legendGroup
      .append("g")
      .attr("transform", `translate(${legendX}, 0)`);

    legendItem
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color);

    legendItem
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("fill", darkMode ? "white" : "black")
      .attr("font-size", "14px")
      .text(key);

    legendX += 80;
  });
}

/* -------------------------------------------------------------------------
 * SENTIMENT ANALYSIS COMPONENT
 * ------------------------------------------------------------------------- */

/**
 * Renders a line chart of daily sentiment (positive/negative) over time.
 * - Loads and registers the AFINN lexicon for the currently selected language (fallback: "en").
 * - Aggregates sentiment per day, averages it, and fills in missing days using previous values.
 * - Applies a moving average smoothing over the data (WINDOW_SIZE).
 * - Provides an expand/collapse button and dark mode styling.
 */
const SentimentAnalysis: React.FC = () => {
  // Pull relevant values from the ChatContext (adjust as needed in your context).
  const { messages, darkMode, language } = useChat();

  // Refs for the container (to measure size) and the SVG (for drawing the chart).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // State to track if the chart is expanded (increasing width for a larger view).
  const [expanded, setExpanded] = useState(false);

  // Observe container size changes for responsive chart rendering.
  const dimensions = useResizeObserver(containerRef);

  // Memoized Sentiment analyzer instance (only created once).
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);

  // Holds the loaded AFINN lexicon data for the current language.
  const [afinn, setAfinn] = useState<Record<string, number>>({});

  // Tracks if the language has been successfully registered in the Sentiment instance.
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);

  /* -----------------------------------------------------------------------
   * EFFECT: Load the AFINN lexicon for the selected language (fallback: "en").
   * ----------------------------------------------------------------------- */
  useEffect(() => {
    if (!language) return;

    // Determine which language lexicon to load or fallback to "en".
    const langToLoad = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    import(`../../assets/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
      })
      .catch((error) => {
        console.error(`Error loading AFINN-${langToLoad}:`, error);
      });
  }, [language]);

  /* -----------------------------------------------------------------------
   * EFFECT: Register the loaded lexicon with the Sentiment analyzer.
   * ----------------------------------------------------------------------- */
  useEffect(() => {
    if (!language || Object.keys(afinn).length === 0) return;

    // Determine which language to register or fallback to "en".
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    // Register the lexicon with the sentiment analyzer.
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });

    try {
      // Verify registration by analyzing a dummy text.
      sentimentAnalyzer.analyze("Test", { language: langToUse });
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [language, afinn, sentimentAnalyzer]);

  /* -----------------------------------------------------------------------
   * MEMOIZED: Compute sentiment data per day (positive/negative).
   * - Only runs if the language is selected and registered.
   * - Averages sentiment by day, fills missing days, and smooths the final result.
   * ----------------------------------------------------------------------- */
  const sentimentData = useMemo<SentimentDataPoint[]>(() => {
    if (!language || !isLanguageRegistered) return [];

    // Decide which language to use, fallback to "en".
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    // 1) Aggregate sentiment by date.
    const dailyTotals: Record<
      string,
      { positive: number; negative: number; count: number }
    > = {};

    (messages as ChatMessage[]).forEach((msg) => {
      if (!msg.isUsed) return;

      const dateKey = new Date(msg.date).toISOString().split("T")[0];

      // Initialize if not present yet.
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { positive: 0, negative: 0, count: 0 };
      }

      try {
        const result = sentimentAnalyzer.analyze(msg.message, {
          language: langToUse,
        });
        const score = result.score;
        dailyTotals[dateKey].count += 1;

        // For positive scores, add to `positive`; for negative, add absolute to `negative`.
        if (score > 0) {
          dailyTotals[dateKey].positive += score;
        } else if (score < 0) {
          dailyTotals[dateKey].negative += Math.abs(score);
        }
      } catch (error) {
        console.error(
          `Error analyzing message with language ${langToUse}:`,
          error
        );
      }
    });

    // 2) Convert aggregated data into a sorted array (by date).
    const rawData = Object.entries(dailyTotals)
      .map(([date, { positive, negative, count }]) => ({
        date: new Date(date),
        positive: positive / count,
        negative: negative / count,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (!rawData.length) return [];

    // 3) Fill in missing days.
    const filledData = fillMissingDays(rawData);

    // 4) Smooth the data using a moving average.
    return smoothData(filledData, WINDOW_SIZE);
  }, [messages, language, isLanguageRegistered, sentimentAnalyzer]);

  /* -----------------------------------------------------------------------
   * EFFECT: Draws the chart via d3 whenever dimensions or sentiment data change.
   * ----------------------------------------------------------------------- */
  useEffect(() => {
    if (!dimensions || sentimentData.length === 0) return;
    drawChart(svgRef, sentimentData, dimensions, darkMode);
  }, [dimensions, sentimentData, darkMode]);

  /* -----------------------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------------------- */
  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[500px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[500px]"
      } p-4 px-0 md:p-4 flex-grow flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Header with Title and Expand/Collapse Button */}
      <div className="flex items-center justify-between px-4 md:px-0">
        <h2
          className={`text-lg font-semibold mb-4 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Sentiment Analysis over Time
        </h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? "text-white" : "text-black"
          }`}
          onClick={() => {
            setExpanded(!expanded);
            // Force a resize event to update the chart layout when toggling size.
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 200);
          }}
          style={{
            background: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          {expanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Chart Area */}
      <div className="flex-grow flex justify-center items-center max-h-full">
        {sentimentData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis;
