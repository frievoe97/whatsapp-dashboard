import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import Sentiment from "sentiment";

// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

// List of valid languages supported for sentiment analysis
const VALID_LANGUAGES = ["de", "en", "fr"] as const;

// Window size for the moving average smoothing
const WINDOW_SIZE = 100;

// Colors for each sentiment type for the chart
const SENTIMENT_COLORS: Record<"positive" | "negative", string> = {
  positive: "#2BA02B",
  negative: "#D62727",
};

// Type for a data point used to plot the sentiment over time
interface SentimentDataPoint {
  date: Date;
  positive: number;
  negative: number;
}

// Chat message type (adjust as needed)
interface ChatMessage {
  date: Date;
  message: string;
  isUsed: boolean;
}

// -----------------------------------------------------------------------------
// SENTIMENT ANALYSIS COMPONENT
// -----------------------------------------------------------------------------

/**
 * SentimentAnalysis component displays a line chart of sentiment over time.
 * It loads the appropriate AFINN lexicon based on the current language, registers the lexicon
 * with the sentiment analyzer, processes messages to compute daily sentiment scores (filling in
 * missing days with the previous day’s value), and then smooths the results with a moving average.
 */
const SentimentAnalysis: React.FC = () => {
  // Extract context values (messages, darkMode, language) from ChatContext.
  const { messages, darkMode, language } = useChat();

  // Refs for the container and SVG elements.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Observe container dimensions to make the chart responsive.
  const dimensions = useResizeObserver(containerRef);

  // Create and memoize the Sentiment analyzer instance.
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);

  // State to hold the loaded AFINN lexicon.
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  // State to track if the language has been successfully registered.
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);

  // ---------------------------------------------------------------------------
  // EFFECT: Load AFINN lexicon based on the selected language.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!language) return;

    // Determine which language to load; default to "en" if unsupported.
    const langToLoad = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    console.log(`Loading AFINN-${langToLoad}.json`);

    import(`../../assets/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
        console.log(`AFINN-${langToLoad} loaded successfully.`);
      })
      .catch((error) =>
        console.error(`Error loading AFINN-${langToLoad}:`, error)
      );
  }, [language]);

  // ---------------------------------------------------------------------------
  // EFFECT: Register the language with the sentiment analyzer.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!language || Object.keys(afinn).length === 0) return;

    // Determine which language to use; default to "en" if unsupported.
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    console.log("Registering language:", langToUse);

    // Register the lexicon with the sentiment analyzer.
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });

    try {
      // Test the registration by analyzing a sample text.
      sentimentAnalyzer.analyze("Test", { language: langToUse });
      console.log(`Language ${langToUse} successfully registered.`);
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [language, afinn, sentimentAnalyzer]);

  // ---------------------------------------------------------------------------
  // COMPUTE SENTIMENT DATA
  // Process messages to compute aggregated sentiment per day.
  // Then fill in missing days with the previous day's value and smooth the data
  // using a moving average.
  // ---------------------------------------------------------------------------
  const sentimentData: SentimentDataPoint[] = useMemo(() => {
    // Only proceed if a language is selected and registered.
    if (!language || !isLanguageRegistered) return [];
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    // Aggregate raw sentiment scores per day.
    const dataMap: Record<
      string,
      { positive: number; negative: number; count: number }
    > = {};

    (messages as ChatMessage[]).forEach((msg) => {
      if (!msg.isUsed) return;

      // Create a date key (YYYY-MM-DD) from the message date.
      const dateKey = new Date(msg.date).toISOString().split("T")[0];

      try {
        // Analyze the sentiment of the message.
        const result = sentimentAnalyzer.analyze(msg.message, {
          language: langToUse,
        });
        const score = result.score;

        // Initialize the day's data if not already present.
        if (!dataMap[dateKey]) {
          dataMap[dateKey] = { positive: 0, negative: 0, count: 0 };
        }
        dataMap[dateKey].count += 1;

        // Aggregate sentiment scores: for positive scores, add; for negative, add absolute value.
        if (score > 0) {
          dataMap[dateKey].positive += score;
        } else if (score < 0) {
          dataMap[dateKey].negative += Math.abs(score);
        }
      } catch (error) {
        console.error(
          `Error during sentiment analysis for language ${langToUse}:`,
          error
        );
      }
    });

    // Convert aggregated data into a sorted array of raw data points.
    const rawData: (SentimentDataPoint & { count: number })[] = Object.entries(
      dataMap
    )
      .map(([date, values]) => ({
        date: new Date(date),
        positive: values.positive / values.count, // average positive score
        negative: values.negative / values.count, // average negative score
        count: values.count,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (rawData.length === 0) return [];

    // Generate a continuous daily series from the first to the last date.
    const firstDate = rawData[0].date;
    const lastDate = rawData[rawData.length - 1].date;
    const allDates = d3.timeDay.range(
      firstDate,
      d3.timeDay.offset(lastDate, 1)
    );

    // Create a lookup map for rawData by date string.
    const rawDataMap = new Map<string, SentimentDataPoint>();
    rawData.forEach((d) => {
      const key = d.date.toISOString().split("T")[0];
      rawDataMap.set(key, {
        date: d.date,
        positive: d.positive,
        negative: d.negative,
      });
    });

    // Fill in missing days:
    // For each day in the continuous range, if there's no data, use the previous day's value.
    const dailyData: SentimentDataPoint[] = [];
    let lastValid: SentimentDataPoint | null = null;
    allDates.forEach((date) => {
      const key = date.toISOString().split("T")[0];
      if (rawDataMap.has(key)) {
        const dataPoint = rawDataMap.get(key)!;
        dailyData.push({
          date,
          positive: dataPoint.positive,
          negative: dataPoint.negative,
        });
        lastValid = {
          date,
          positive: dataPoint.positive,
          negative: dataPoint.negative,
        };
      } else if (lastValid) {
        // Use the previous day's sentiment values if no data is available for the day.
        dailyData.push({
          date,
          positive: lastValid.positive,
          negative: lastValid.negative,
        });
      } else {
        // Fallback (should not occur as the first day is always present).
        dailyData.push({ date, positive: 0, negative: 0 });
      }
    });

    // -------------------------------------------------------------------------
    // SMOOTHING: Apply moving average to reduce noise.
    // Here, we use a window of 7 (WINDOW_SIZE) days (or fewer if there aren't enough data points).
    // -------------------------------------------------------------------------
    const windowSize =
      dailyData.length >= WINDOW_SIZE ? WINDOW_SIZE : dailyData.length;
    const halfWindow = Math.floor(windowSize / 2);

    const smoothedData: SentimentDataPoint[] = dailyData.map((d, i, arr) => {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(arr.length - 1, i + halfWindow);
      const windowSlice = arr.slice(start, end + 1);
      return {
        date: d.date,
        positive: d3.mean(windowSlice, (x) => x.positive) ?? d.positive,
        negative: d3.mean(windowSlice, (x) => x.negative) ?? d.negative,
      };
    });

    return smoothedData;
  }, [messages, language, isLanguageRegistered, sentimentAnalyzer]);

  // ---------------------------------------------------------------------------
  // EFFECT: Draw the chart using d3
  // This effect is triggered when container dimensions or sentimentData change.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dimensions || sentimentData.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 70, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Select the SVG element and clear previous content.
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create scales for the x and y axes.
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yMax =
      d3.max(sentimentData, (d) => Math.max(d.positive, d.negative)) || 1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Helper function to generate a line for a given sentiment key.
    const lineGenerator = (key: keyof Omit<SentimentDataPoint, "date">) =>
      d3
        .line<SentimentDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[key]))
        .curve(d3.curveBasis);

    // Append a group element for chart margins.
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw the X Axis.
    const maxXTicks = Math.floor(innerWidth / 80);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(maxXTicks))
      .selectAll("text")
      .style("font-size", "14px")
      .attr("dy", "1em")
      .style("text-anchor", "middle");

    // Draw the Y Axis.
    g.append("g").call(d3.axisLeft(yScale).ticks(5)).style("font-size", "14px");

    // Draw sentiment lines.
    Object.entries(SENTIMENT_COLORS).forEach(([key, color]) => {
      g.append("path")
        .datum(sentimentData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr(
          "d",
          lineGenerator(key as keyof Omit<SentimentDataPoint, "date">)
        );
    });

    // Draw a legend at the top-right of the chart.
    const legend = g
      .append("g")
      .attr("transform", `translate(${innerWidth - 180}, -20)`);
    let legendX = 0;
    Object.entries(SENTIMENT_COLORS).forEach(([key, color]) => {
      const legendItem = legend
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
  }, [dimensions, sentimentData, darkMode]);

  // ---------------------------------------------------------------------------
  // COMPONENT RENDERING
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Sentiment Analysis over Time
      </h2>
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
