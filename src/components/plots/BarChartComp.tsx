import { FC, useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import * as d3 from "d3";
import ClipLoader from "react-spinners/ClipLoader";
import { Maximize2, Minimize2, ChevronRight, ChevronLeft } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";

/* -------------------------------------------------------------------------- */
/*                               Constants & Types                            */
/* -------------------------------------------------------------------------- */

/**
 * The list of properties available for selection in the dropdown.
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

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the median value from an array of numbers.
 *
 * @param values - The array of numbers.
 * @returns The median value of the input array.
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length === 0) {
    return 0;
  }

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Aggregates statistics per sender from the list of messages.
 * Only messages flagged as `isUsed` are considered.
 * Senders with a message count below the threshold (`minMessagePercentage`) are filtered out.
 *
 * @param messages - The array of messages (from context).
 * @param minMessagePercentage - The threshold (in %) below which a sender is filtered out.
 * @returns An array of aggregated statistics per sender.
 */
function aggregateSenderStats(
  messages: { sender: string; message: string; date: Date; isUsed: boolean }[],
  minMessagePercentage: number
): AggregatedStat[] {
  const validMessages = messages.filter((msg) => msg.isUsed);
  const totalMessages = validMessages.length;
  const minMessages = (minMessagePercentage / 100) * totalMessages;

  // Temporary record to accumulate stats
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

  // Convert the aggregated record into an array and compute additional metrics
  const aggregated: AggregatedStat[] = Object.keys(stats)
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

  return aggregated;
}

/**
 * Calculates the total height of an element (identified by `elementId`)
 * including its vertical margins.
 *
 * @param elementId - The `id` of the DOM element to measure.
 * @returns The total height (in px) including margins, or `0` if element not found.
 */
function getTotalHeightIncludingMargin(elementId: string): number {
  const element = document.getElementById(elementId);
  if (!element) return 0;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  const marginTop = parseFloat(computedStyle.marginTop) || 0;
  const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

  return rect.height + marginTop + marginBottom;
}

/* -------------------------------------------------------------------------- */
/*                     SenderComparisonBarChart Component                     */
/* -------------------------------------------------------------------------- */

/**
 * A bar chart comparing various statistics between senders.
 *
 * **Features**:
 * - Aggregates statistics (message count, words per message, etc.) per sender.
 * - Allows selection of a property (via a dropdown) to plot.
 * - Paginates the bars based on available container width.
 * - Supports an "expanded" view (with larger width) and updates the chart accordingly.
 * - Uses D3 for rendering the chart.
 * - Handles dark vs. light mode.
 * - Shows a loading spinner when data is uploading.
 */
const SenderComparisonBarChart: FC = () => {
  // Extract data and settings from the ChatContext
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();

  // References for container and SVG
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Capture container dimensions via custom ResizeObserver hook
  const dimensions = useResizeObserver(containerRef);

  /* ------------------------------------------------------------------------ */
  /*                              Component State                              */
  /* ------------------------------------------------------------------------ */

  // The currently selected property to visualize
  const [selectedProperty, setSelectedProperty] = useState<string>(
    properties[0].key
  );

  // Expanded (wider) chart vs. collapsed chart
  const [expanded, setExpanded] = useState<boolean>(false);

  // Current page for bar pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Items (bars) per page (dynamic based on container width)
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  /* ------------------------------------------------------------------------ */
  /*                         Aggregated Statistics (Memo)                     */
  /* ------------------------------------------------------------------------ */

  /**
   * Memoized calculation of aggregated stats.
   */
  const aggregatedStats = useMemo<AggregatedStat[]>(() => {
    return aggregateSenderStats(messages, minMessagePercentage);
  }, [messages, minMessagePercentage]);

  /* ------------------------------------------------------------------------ */
  /*                            D3 Color Scale (Memo)                         */
  /* ------------------------------------------------------------------------ */

  /**
   * Creates an ordinal color scale based on sender names.
   * Uses different color schemes for dark mode vs. light mode.
   */
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3
      .scaleOrdinal<string, string>(colors)
      .domain(aggregatedStats.map((d) => d.sender));
  }, [aggregatedStats, darkMode]);

  /* ------------------------------------------------------------------------ */
  /*                           Pagination (Memo)                              */
  /* ------------------------------------------------------------------------ */

  /**
   * Calculates the total number of pages based on aggregatedStats and itemsPerPage.
   */
  const totalPages = useMemo(() => {
    if (aggregatedStats.length === 0) return 1;
    return Math.ceil(aggregatedStats.length / itemsPerPage);
  }, [aggregatedStats, itemsPerPage]);

  /**
   * Sorts the aggregated stats by the selected property (descending)
   * and slices to get the stats for the current page.
   */
  const currentStats = useMemo(() => {
    const sorted = [...aggregatedStats].sort((a, b) => {
      const aValue = a[selectedProperty as keyof AggregatedStat] as number;
      const bValue = b[selectedProperty as keyof AggregatedStat] as number;
      return bValue - aValue;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    let pageStats = sorted.slice(startIndex, startIndex + itemsPerPage);

    // If there are fewer items on the last page, pad with empty placeholders
    if (totalPages > 1 && pageStats.length < itemsPerPage) {
      while (pageStats.length < itemsPerPage) {
        pageStats.push({
          sender: " ",
          messageCount: 0,
          averageWordsPerMessage: 0,
          medianWordsPerMessage: 0,
          totalWordsSent: 0,
          maxWordsInMessage: 0,
          activeDays: 0,
          uniqueWordsCount: 0,
          averageCharactersPerMessage: 0,
        });
      }
    }

    return pageStats;
  }, [
    aggregatedStats,
    currentPage,
    itemsPerPage,
    selectedProperty,
    totalPages,
  ]);

  /**
   * Array of sender names for the current page; used for the x-axis labels.
   */
  const currentSenders = useMemo(
    () => currentStats.map((stat) => stat.sender),
    [currentStats]
  );

  /* ------------------------------------------------------------------------ */
  /*                   Update itemsPerPage on resize/expand                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (containerRef.current && dimensions) {
      const width = dimensions.width || containerRef.current.offsetWidth;
      const newItemsPerPage = Math.max(1, Math.floor(width / MIN_BAR_WIDTH));

      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1); // reset to first page when layout changes
    }
  }, [dimensions, expanded]);

  /* ------------------------------------------------------------------------ */
  /*                          D3 Chart Rendering                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!dimensions || currentStats.length === 0) return;

    // D3 selections
    const svg = d3.select(svgRef.current);
    let { width, height } = dimensions;

    // Subtract any known UI element heights from the container

    const headerHeight = getTotalHeightIncludingMargin("bar-chart-header");
    const propertySelectHeight =
      getTotalHeightIncludingMargin("property-select");
    const paginationHeight = getTotalHeightIncludingMargin(
      "bar-chart-pagination"
    );

    height = height - headerHeight - propertySelectHeight - paginationHeight;

    // Define margins and inner chart area
    const margin = { top: 20, right: 20, bottom: 70, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear the SVG before drawing
    svg.selectAll("*").remove();

    // Create chart area group
    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X-scale (band scale, based on currentStats indices)
    const xScale = d3
      .scaleBand<string>()
      .domain(currentStats.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    // Y-scale (linear, based on the selected property)
    const yMax =
      d3.max(
        currentStats,
        (d) => d[selectedProperty as keyof AggregatedStat] as number
      ) || 10;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // X-axis
    chart
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((_, i) => currentSenders[i] || ""))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end")
      .style("font-size", "12px");

    // Y-axis
    const yTicks = Math.max(5, Math.floor(innerHeight / 40));
    chart
      .append("g")
      .call(d3.axisLeft(yScale).ticks(yTicks).tickFormat(d3.format(".2s")))
      .style("font-size", "14px");

    // Draw bars
    chart
      .selectAll(".bar")
      .data(currentStats)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => xScale(i.toString()) || 0)
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

  /* ------------------------------------------------------------------------ */
  /*                              Event Handlers                              */
  /* ------------------------------------------------------------------------ */

  /**
   * Toggle expand/collapse of the chart.
   */
  function handleToggleExpand() {
    setExpanded((prev) => !prev);
  }

  /**
   * Handle changing the selected property in the dropdown.
   */
  function handlePropertyChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedProperty(event.target.value);
  }

  /**
   * Move to the previous page of bars.
   */
  function handlePreviousPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  /**
   * Move to the next page of bars.
   */
  function handleNextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }

  /* ------------------------------------------------------------------------ */
  /*                          Component Rendering                             */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      id="plot-sender-comparison"
      ref={containerRef}
      className={`border w-full flex-grow p-4  flex-col ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } ${expanded ? "md:basis-[3000px]" : "md:basis-[550px]"}`}
      style={{ minHeight: "500px", maxHeight: "550px", overflow: "hidden" }}
    >
      {/* Header with title and expand/minimize button */}
      <div id="bar-chart-header" className="flex items-center justify-between">
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
          onChange={handlePropertyChange}
          className={`mt-1.5 w-fit border text-sm font-medium outline-none focus:ring-0 appearance-none p-2 ${
            darkMode
              ? "border-gray-300 bg-gray-800 text-white"
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
        <div className="flex justify-center items-center flex-grow">
          <ClipLoader color={darkMode ? "#ffffff" : "#000000"} size={50} />
        </div>
      ) : (
        <svg ref={svgRef} className="w-full"></svg>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          id="bar-chart-pagination"
          className="flex justify-center items-center space-x-2"
        >
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`px-2 py-1 border ${
              darkMode ? "bg-gray-800 text-white " : "text-black bg-white "
            } ${
              currentPage === 1 ? "text-gray-400 cursor-not-allowed" : ""
            } focus:outline-none focus:ring-0 focus:border-none active:border-none hover:border-none`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className={darkMode ? "text-white" : "text-black"}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`px-2 py-1 border ${
              darkMode ? "bg-gray-800 text-white " : "text-black bg-white "
            } ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : ""
            } focus:outline-none focus:ring-0 focus:border-none active:border-none hover:border-none`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SenderComparisonBarChart;
