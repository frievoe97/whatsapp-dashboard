import { useEffect, useRef, useMemo, useState, FC } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";
import { Maximize2, Minimize2 } from "lucide-react";

// -----------------------------------------------------------------------------
// Constants and Types
// -----------------------------------------------------------------------------

/**
 * The list of properties available for selection.
 */
const properties = [
  { key: "messageCount", label: "Number of Messages" },
  { key: "averageWordsPerMessage", label: "Avg. Words per Message" },
  { key: "medianWordsPerMessage", label: "Median Words per Message" },
  { key: "totalWordsSent", label: "Total Words Sent" },
  { key: "maxWordsInMessage", label: "Max Words in a Message" },
  { key: "activeDays", label: "Active Days" },
  { key: "uniqueWordsCount", label: "Unique Words Count" },
  { key: "averageCharactersPerMessage", label: "Avg. Characters per Message" },
] as const;

/**
 * The shape of the aggregated statistics per sender.
 */
interface AggregatedStat {
  sender: string;
  messageCount: number;
  averageWordsPerMessage: number;
  medianWordsPerMessage: number;
  totalWordsSent: number;
  maxWordsInMessage: number;
  activeDays: number;
  uniqueWordsCount: number;
  averageCharactersPerMessage: number;
}

/**
 * Minimum bar width in pixels.
 */
const MIN_BAR_WIDTH = 80;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Calculates the median value from an array of numbers.
 * @param values Array of numbers.
 * @returns The median value.
 */
const calculateMedian = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

// -----------------------------------------------------------------------------
// SenderComparisonBarChart Component
// -----------------------------------------------------------------------------

/**
 * A bar chart comparing various statistics between senders.
 *
 * Features:
 * - Aggregates statistics (message count, words per message, etc.) per sender.
 * - Allows selection of a property (via a dropdown) to plot.
 * - Paginates the bars based on available container width.
 * - Supports an "expanded" view (with larger width) and updates the chart accordingly.
 * - Uses D3 for rendering the chart.
 */
const SenderComparisonBarChart: FC = () => {
  // Extract data and settings from the ChatContext.
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();

  // Refs for the container and SVG element.
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Get container dimensions using a custom resize observer hook.
  const dimensions = useResizeObserver(containerRef);

  // Component state.
  const [selectedProperty, setSelectedProperty] = useState<string>(
    properties[0].key
  );
  const [expanded, setExpanded] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  // ---------------------------------------------------------------------------
  // Compute Aggregated Statistics
  // ---------------------------------------------------------------------------

  /**
   * Aggregates statistics per sender from the list of messages.
   * Only messages flagged as "isUsed" are considered.
   * Senders with a message count lower than the threshold (minMessagePercentage)
   * are filtered out.
   */
  const aggregatedStats = useMemo<AggregatedStat[]>(() => {
    // Filter messages that are used.
    const validMessages = messages.filter((msg) => msg.isUsed);
    const totalMessages = validMessages.length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Accumulate stats for each sender.
    const stats: Record<
      string,
      {
        messageCount: number;
        totalWordsSent: number;
        wordCounts: number[];
        maxWordsInMessage: number;
        uniqueWords: Set<string>;
        totalCharacters: number;
        activeDays: Set<string>;
      }
    > = {};

    validMessages.forEach((msg) => {
      const sender = msg.sender;
      if (!stats[sender]) {
        stats[sender] = {
          messageCount: 0,
          totalWordsSent: 0,
          wordCounts: [],
          maxWordsInMessage: 0,
          uniqueWords: new Set(),
          totalCharacters: 0,
          activeDays: new Set(),
        };
      }
      const words = msg.message.split(/\s+/).filter((w) => w.length > 0);
      stats[sender].messageCount++;
      stats[sender].totalWordsSent += words.length;
      stats[sender].wordCounts.push(words.length);
      stats[sender].maxWordsInMessage = Math.max(
        stats[sender].maxWordsInMessage,
        words.length
      );
      words.forEach((word) => stats[sender].uniqueWords.add(word));
      stats[sender].totalCharacters += msg.message.length;
      stats[sender].activeDays.add(new Date(msg.date).toDateString());
    });

    // Convert the stats object to an array and compute additional metrics.
    return Object.keys(stats)
      .map((sender) => {
        const data = stats[sender];
        return {
          sender,
          messageCount: data.messageCount,
          averageWordsPerMessage: data.totalWordsSent / data.messageCount,
          medianWordsPerMessage: calculateMedian(data.wordCounts),
          totalWordsSent: data.totalWordsSent,
          maxWordsInMessage: data.maxWordsInMessage,
          activeDays: data.activeDays.size,
          uniqueWordsCount: data.uniqueWords.size,
          averageCharactersPerMessage: data.totalCharacters / data.messageCount,
        };
      })
      .filter((stat) => stat.messageCount >= minMessages);
  }, [messages, minMessagePercentage]);

  // ---------------------------------------------------------------------------
  // D3 Color Scale
  // ---------------------------------------------------------------------------

  /**
   * Creates an ordinal color scale based on the sender names.
   * Uses different color schemes for dark mode vs. light mode.
   */
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3
      .scaleOrdinal<string, string>(colors)
      .domain(aggregatedStats.map((d) => d.sender));
  }, [aggregatedStats, darkMode]);

  // ---------------------------------------------------------------------------
  // Pagination Calculations
  // ---------------------------------------------------------------------------

  /**
   * Calculates the total number of pages based on the aggregated statistics
   * and the number of items that can fit in the current container width.
   */
  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedStats.length / itemsPerPage);
  }, [aggregatedStats, itemsPerPage]);

  /**
   * Sorts the aggregated statistics by the currently selected property
   * (in descending order) and then slices the sorted array to obtain the stats
   * for the current page.
   */
  const currentStats = useMemo(() => {
    const sortedStats = [...aggregatedStats].sort((a, b) => {
      const aValue = a[selectedProperty as keyof AggregatedStat] as number;
      const bValue = b[selectedProperty as keyof AggregatedStat] as number;
      return bValue - aValue; // Descending order.
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage, selectedProperty]);

  /**
   * Array of sender names for the current page; used for labeling the x-axis.
   */
  const currentSenders = useMemo(
    () => currentStats.map((stat) => stat.sender),
    [currentStats]
  );

  // ---------------------------------------------------------------------------
  // Update Items Per Page on Resize and Expand Changes
  // ---------------------------------------------------------------------------

  /**
   * When the container dimensions or the "expanded" state change,
   * recalculate the number of items (bars) that can be displayed per page.
   * Also, reset the current page to 1.
   */
  useEffect(() => {
    if (containerRef.current) {
      // Prefer the dimensions from the ResizeObserver, falling back to offsetWidth.
      const width = dimensions?.width || containerRef.current.offsetWidth;
      const newItemsPerPage = Math.max(1, Math.floor(width / MIN_BAR_WIDTH));
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    }
  }, [dimensions, expanded]);

  // ---------------------------------------------------------------------------
  // D3 Chart Rendering
  // ---------------------------------------------------------------------------

  /**
   * Draws the D3 bar chart.
   * This effect re-renders the chart whenever the dimensions, current stats,
   * selected property, dark mode, or color scale changes.
   */
  useEffect(() => {
    if (!dimensions || currentStats.length === 0) return;

    // Set up the SVG container.
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 250, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear any existing content.
    svg.selectAll("*").remove();

    // Append a group element for the chart area.
    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create the x-scale using the index of the current stats.
    const xScale = d3
      .scaleBand<string>()
      .domain(currentStats.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    // Determine the maximum value for the y-axis based on the selected property.
    const yMax =
      d3.max(
        currentStats,
        (d) => d[selectedProperty as keyof AggregatedStat] as number
      ) || 10;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Append the x-axis.
    chart
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((_, i) => currentSenders[i] || ""))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px");

    // Append the y-axis.
    const yTicks = Math.max(5, Math.floor(innerHeight / 40));
    chart
      .append("g")
      .call(d3.axisLeft(yScale).ticks(yTicks).tickFormat(d3.format(".2s")))
      .style("font-size", "14px");

    // Draw the bars.
    chart
      .selectAll(".bar")
      .data(currentStats)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => xScale(i.toString()) ?? 0)
      .attr("y", (d) =>
        yScale(d[selectedProperty as keyof AggregatedStat] as number)
      )
      .attr("width", xScale.bandwidth())
      .attr("height", (d) =>
        Math.max(
          0,
          innerHeight -
            yScale(d[selectedProperty as keyof AggregatedStat] as number)
        )
      )
      .attr("fill", (d) => colorScale(d.sender));
  }, [
    dimensions,
    currentStats,
    selectedProperty,
    darkMode,
    colorScale,
    currentSenders,
  ]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Toggles the expanded state of the chart.
   */
  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  // ---------------------------------------------------------------------------
  // Render Component
  // ---------------------------------------------------------------------------
  return (
    <div
      id="plot-sender-comparison"
      ref={containerRef}
      className={`border min-h-96 w-full md:min-w-[740px] flex-grow p-4 flex flex-col ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } ${expanded ? "md:basis-[3000px]" : "md:basis-[800px]"}`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Header with title and expand/minimize button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold mb-4">Sender Comparison</h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? "text-white" : "text-black"
          }`}
          onClick={handleToggleExpand}
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

      {/* Property selection dropdown */}
      <div id="property-select" className="mb-4">
        <select
          id="property-dropdown"
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className={`mt-1.5 w-fit border text-sm font-medium outline-none focus:ring-0 appearance-none p-2 ${
            darkMode
              ? "border-gray-300 bg-black text-white"
              : "border-black bg-white text-black"
          }`}
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {properties.map((prop) => (
            <option
              key={prop.key}
              value={prop.key}
              className={
                darkMode ? "bg-black text-white" : "bg-white text-black"
              }
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {prop.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chart or loading indicator */}
      {isUploading ? (
        <ClipLoader color={darkMode ? "#ffffff" : "#000000"} size={50} />
      ) : (
        <svg ref={svgRef} className="w-full"></svg>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`px-2 py-1 border ${
            darkMode ? "border-gray-300 text-white" : "border-black text-black"
          } ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : ""}`}
        >
          Previous
        </button>
        <span className={darkMode ? "text-white" : "text-black"}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className={`px-2 py-1 border ${
            darkMode ? "border-gray-300 text-white" : "border-black text-black"
          } ${
            currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : ""
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SenderComparisonBarChart;
