import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../context/ChatContext";
import useResizeObserver from "../hooks/useResizeObserver";
import Sentiment from "sentiment";

// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

// List of valid languages supported for sentiment analysis
const VALID_LANGUAGES = ["de", "en", "fr"] as const;

// Colors for each sentiment type for the chart
const SENTIMENT_COLORS: Record<"positive" | "negative", string> = {
  positive: "#2BA02B",
  // neutral: "#7F7F7F",
  negative: "#D62727",
};

// Type for a data point used to plot the sentiment over time
interface SentimentDataPoint {
  date: Date;
  positive: number;
  // neutral: number;
  negative: number;
}

// Adjust the properties as needed based on your ChatContext.
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
 * It loads the appropriate AFINN lexicon based on the current language,
 * registers the lexicon with the sentiment analyzer, processes messages to
 * compute daily sentiment scores (with smoothing), and renders the chart using d3.
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

  // State to hold the loaded AFINN lexicon (a mapping from word to score).
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

    import(`../assets/AFINN-${langToLoad}.json`)
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
  // This ensures that the analyzer uses the loaded lexicon.
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
  // Then smooth the results over a sliding window.
  // ---------------------------------------------------------------------------
  const sentimentData: SentimentDataPoint[] = useMemo(() => {
    // Only proceed if a language is selected and registered.
    if (!language || !isLanguageRegistered) return [];
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    // Initialize an object to aggregate sentiment scores per day.
    const dataMap: Record<
      string,
      { positive: number; neutral: number; negative: number; count: number }
    > = {};

    // Process each message from the ChatContext.
    (messages as ChatMessage[]).forEach((msg) => {
      // Skip messages that are not marked for use.
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
          dataMap[dateKey] = { positive: 0, neutral: 0, negative: 0, count: 0 };
        }

        // Increase the message count for that day.
        dataMap[dateKey].count += 1;

        // Aggregate the sentiment scores.
        if (score > 0) {
          dataMap[dateKey].positive += score;
        } else if (score < 0) {
          dataMap[dateKey].negative += Math.abs(score);
        } else {
          // For a neutral score, you might want to count it (currently remains 0).
          dataMap[dateKey].neutral += 0;
        }
      } catch (error) {
        console.error(
          `Error during sentiment analysis for language ${langToUse}:`,
          error
        );
      }
    });

    // Convert the aggregated data into a sorted array of data points.
    const rawData: (SentimentDataPoint & {
      count: number;
    })[] = Object.entries(dataMap)
      .map(([date, values]) => ({
        date: new Date(date),
        ...values,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Determine the smoothing window size (10% of the data points, at least 1).
    const windowSize = Math.max(1, Math.floor(rawData.length / 10));

    // Smooth the data by averaging over a sliding window.
    const smoothedData: SentimentDataPoint[] = rawData.map((_, i, arr) => {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(arr.length - 1, i + windowSize);
      const windowSlice = arr.slice(start, end + 1);

      // Total number of messages in the window (avoid division by zero).
      const totalCount = d3.sum(windowSlice, (d) => d.count) || 1;

      return {
        date: arr[i].date,
        positive: (d3.sum(windowSlice, (d) => d.positive) || 0) / totalCount,
        // neutral: (d3.sum(windowSlice, (d) => d.neutral) || 0) / totalCount,
        negative: (d3.sum(windowSlice, (d) => d.negative) || 0) / totalCount,
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

    // Define margins and calculate inner chart dimensions.
    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 70, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Select the SVG element and clear any previous content.
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create scales for the x and y axes.
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    // const yMax = d3.max(sentimentData, (d) => Math.max(d.positive, d.neutral, d.negative)) || 1;

    const yMax =
      d3.max(sentimentData, (d) => Math.max(d.positive, d.negative)) || 1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Helper function to create a line generator for a given sentiment key.
    const lineGenerator = (key: keyof typeof SENTIMENT_COLORS) =>
      d3
        .line<SentimentDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[key]))
        .curve(d3.curveBasisOpen);

    // Append a group element for margins.
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
      .style("text-anchor", "middle")
      .attr("transform", null);

    // Draw the Y Axis.
    const yTicks = 5;
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(yTicks))
      .style("font-size", "14px");

    // Draw lines for each sentiment type.
    Object.entries(SENTIMENT_COLORS).forEach(([key, color]) => {
      g.append("path")
        .datum(sentimentData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator(key as keyof typeof SENTIMENT_COLORS));
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

      // Colored rectangle for the legend.
      legendItem
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color);

      // Label text for the legend.
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
  // The container includes a header and either the chart (if data exists) or
  // a placeholder message.
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full p-4 flex-grow flex flex-col`}
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
