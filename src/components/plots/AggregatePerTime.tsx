// src/components/AggregatePerTimePlot.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import Switch from "react-switch";
import "./AggregatePerTimePlot.css";
import ClipLoader from "react-spinners/ClipLoader";
import { Hash, Percent, Maximize2, Minimize2 } from "lucide-react";

/**
 * DataPoint interface for a single category value.
 */
interface DataPoint {
  category: string;
  count: number;
  percentage?: number;
}

/**
 * AggregatedData interface represents aggregated counts per sender.
 */
interface AggregatedData {
  sender: string;
  values: DataPoint[];
}

/**
 * Mode type representing the current time-based mode.
 */
type Mode = "weekday" | "hour" | "month";

/**
 * Returns the list of categories based on the current mode.
 *
 * @param mode - The current mode ("weekday", "hour", or "month")
 * @returns An array of category names.
 */
const getCategories = (mode: Mode): string[] => {
  switch (mode) {
    case "weekday":
      return [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
    case "hour":
      return Array.from({ length: 24 }, (_, i) => i.toString());
    case "month":
      return [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
    default:
      return [];
  }
};

/**
 * Returns the category for a given message based on the current mode.
 *
 * @param msg - A ChatMessage object.
 * @param mode - The current mode ("weekday", "hour", or "month").
 * @returns The category (e.g. "Monday", "14", "March").
 */
const getCategoryFromMessage = (msg: ChatMessage, mode: Mode): string => {
  const date = new Date(msg.date);
  if (mode === "weekday") {
    // Adjust so that Monday is the first day (getDay returns 0 for Sunday)
    return [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ][(date.getDay() + 6) % 7];
  } else if (mode === "hour") {
    return date.getHours().toString();
  } else if (mode === "month") {
    return [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][date.getMonth()];
  }
  return "";
};

/**
 * Aggregates chat messages by sender and category.
 *
 * Only messages with `isUsed` set to true are considered.
 * A sender is only included if its total count exceeds the configured
 * minimum percentage of all messages.
 *
 * If `showPercentage` is true, each category count is converted to a percentage.
 *
 * @param messages - Array of ChatMessage objects.
 * @param mode - Current mode.
 * @param categories - Array of categories.
 * @param minMessagePercentage - Minimum percentage threshold for a sender.
 * @param showPercentage - Flag to indicate if percentages should be calculated.
 * @returns An array of AggregatedData.
 */
const aggregateMessages = (
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  minMessagePercentage: number,
  showPercentage: boolean
): AggregatedData[] => {
  if (messages.length === 0) return [];

  // Calculate threshold based on percentage of used messages
  const totalMessages = messages.filter((msg) => msg.isUsed).length;
  const minMessagesThreshold = (minMessagePercentage / 100) * totalMessages;

  // Build a nested object: sender -> category -> count
  const dataMap: Record<string, Record<string, number>> = {};
  messages.forEach((msg) => {
    if (!msg.isUsed) return;
    const sender = msg.sender;
    const category = getCategoryFromMessage(msg, mode);
    if (!dataMap[sender]) {
      dataMap[sender] = {};
      categories.forEach((cat) => (dataMap[sender][cat] = 0));
    }
    dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
  });

  // Convert the dataMap into an array of AggregatedData, filtering by total count
  let result: AggregatedData[] = Object.keys(dataMap)
    .map((sender) => {
      const values = categories.map((category) => ({
        category,
        count: dataMap[sender][category],
      }));
      const total = values.reduce((sum, val) => sum + val.count, 0);
      return { sender, values, total };
    })
    .filter((d) => d.total >= minMessagesThreshold)
    .map(({ sender, values }) => ({ sender, values }));

  // If showing percentages, calculate and add the percentage to each data point.
  if (showPercentage) {
    result = result.map((senderData) => {
      const total = d3.sum(senderData.values, (d) => d.count);
      return {
        ...senderData,
        values: senderData.values.map((d) => ({
          ...d,
          percentage: total > 0 ? (d.count / total) * 100 : 0,
        })),
      };
    });
  }

  return result;
};

/**
 * AggregatePerTimePlot Component
 *
 * This component renders an interactive D3 line chart displaying aggregated chat data.
 * It supports toggling between different time modes (hour, weekday, month), a percentage view,
 * tooltips, smooth transitions, a dynamic legend, and a expand/collapse feature.
 */
const AggregatePerTimePlot: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();

  // Refs for container and SVG elements
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // Local state for expand toggle, mode selection, and percentage view
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>("hour");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  // Get the categories for the current mode
  const categories = useMemo(() => getCategories(mode), [mode]);

  // Aggregate data from chat messages
  const aggregatedData = useMemo(
    () =>
      aggregateMessages(
        messages,
        mode,
        categories,
        minMessagePercentage,
        showPercentage
      ),
    [messages, mode, categories, minMessagePercentage, showPercentage]
  );

  // Extract sender names for legend and color scaling
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  // Reset mode and percentage view if there are no messages.
  useEffect(() => {
    if (messages.length === 0) {
      setMode("hour");
      setShowPercentage(false);
    }
  }, [messages]);

  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  // Create the tooltip element (only once)
  useEffect(() => {
    if (!containerRef.current) return;
    const tooltipSelection = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");
    if (tooltipSelection.empty()) {
      d3.select(containerRef.current)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "1000")
        .style("padding", "6px")
        .style("border", "1px solid #999")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("display", "none");
    }
  }, []);

  // Update tooltip style when dark mode changes
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  // D3 chart drawing effect: draws and updates the chart based on aggregated data and dimensions.
  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    let margin = { top: 20, right: 30, bottom: 30, left: 30 };

    if (window.innerWidth <= 768) {
      margin.right = 30;
      margin.left = 40;
    }

    const headerHeight = getTotalHeightIncludingMargin(
      "aggregate-per-time-plot-header"
    );
    const legendHeight = getTotalHeightIncludingMargin(
      "aggregate-per-time-plot-legend"
    );

    const innerWidth = width - margin.left - margin.right;
    const innerHeight =
      height - margin.top - margin.bottom - headerHeight - legendHeight;

    // Define scales for the chart.
    const xScale = d3
      .scalePoint<string>()
      .domain(categories)
      .range([0, innerWidth])
      .padding(0);

    const yMax = showPercentage
      ? d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.percentage)) ||
        100
      : d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    const tickSpacing = mode === "hour" ? 20 : mode === "weekday" ? 55 : 55;
    const maxTicks = Math.max(2, Math.floor(innerWidth / tickSpacing));

    const xTickValues = categories.filter(
      (_, i) => i % Math.ceil(categories.length / maxTicks) === 0
    );

    const xAxis = d3.axisBottom(xScale).tickValues(xTickValues);

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2s"));

    // Create a line generator.
    const lineGenerator = d3
      .line<DataPoint>()
      .defined((d) => d.count !== null && d.count !== undefined)
      .x((d) => xScale(d.category) as number)
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Select or create the main chart group.
    let chartGroup = svg.select<SVGGElement>(".chart-group");
    if (chartGroup.empty()) {
      chartGroup = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
      // Remove previous overlays, axes, and grid lines to avoid duplication.
      chartGroup
        .selectAll(".overlay, .hover-line, .x-grid, .y-grid, .x-axis, .y-axis")
        .remove();
    }

    // Select the tooltip element.
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Append an overlay rectangle to capture mouse events.
    const overlay = chartGroup
      .append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    // Append a hover line to indicate the current mouse position.
    const hoverLine = chartGroup
      .append("line")
      .attr("class", "hover-line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .style("opacity", 0);

    // Mouse event handlers for the overlay.
    overlay
      .on("mouseover", () => {
        hoverLine.style("opacity", 1);
        tooltip.style("display", "block");
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event);
        hoverLine
          .attr("x1", mx)
          .attr("x2", mx)
          .attr("y1", 0)
          .attr("y2", innerHeight);

        // Determine the nearest category for the mouse x-coordinate.
        const xPositions = categories.map((cat) => xScale(cat) as number);
        const distances = xPositions.map((xPos) => Math.abs(xPos - mx));
        const minIndex = distances.indexOf(Math.min(...distances));
        const nearestCategory = categories[minIndex];

        // Prepare tooltip content for each sender.
        const tooltipData = aggregatedData.map((d) => {
          const point = d.values.find((v) => v.category === nearestCategory);
          const value =
            showPercentage && point?.percentage !== undefined
              ? point.percentage.toFixed(2) + "%"
              : point?.count;
          return { sender: d.sender, value };
        });

        tooltip.html(
          `<strong>${nearestCategory}</strong><br>` +
            tooltipData
              .map(
                (d) =>
                  `<span style="color:${colorScale(d.sender)}">${d.sender}: ${
                    d.value
                  }</span>`
              )
              .join("<br>")
        );
        tooltip
          .style("left", `${mx + margin.left + 10}px`)
          .style("top", `${my + margin.top + 10}px`);
      })
      .on("mouseleave", () => {
        hoverLine.style("opacity", 0);
        tooltip.style("display", "none");
      });

    // Draw grid lines and axes.
    // X Grid
    const xGrid = chartGroup
      .append("g")
      .attr("class", "x-grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      );
    xGrid
      .selectAll("line")
      .attr("stroke", darkMode ? "#606060" : "#e0e0e0")
      .attr("stroke-width", 1);

    // Y Grid
    const yGrid = chartGroup
      .append("g")
      .attr("class", "y-grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      );
    yGrid.selectAll("line").attr("stroke", darkMode ? "#606060" : "#e0e0e0");

    // Draw X Axis
    chartGroup
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate(0,5)")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", darkMode ? "white" : "black");

    // Draw Y Axis
    chartGroup
      .append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", darkMode ? "white" : "black");

    // Bind aggregated data to path elements for each sender and apply transitions.
    const lines = chartGroup
      .selectAll<SVGPathElement, AggregatedData>(".line")
      .data(aggregatedData, (d) => d.sender);

    lines.join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .style("z-index", "500")
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("stroke-width", 3)
          // Start from the bottom (for the initial animation)
          .attr("d", (d) => {
            const initialValues = d.values.map((v) => ({
              ...v,
              y: innerHeight,
            }));
            const initialLine = d3
              .line<DataPoint>()
              .x((v) => xScale(v.category) as number)
              .y(() => innerHeight)
              .curve(d3.curveMonotoneX);
            return initialLine(initialValues) as string;
          })
          .transition()
          .duration(2000)
          .ease(d3.easeCubic)
          .attr("d", (d) => lineGenerator(d.values) as string),
      (update) =>
        update
          .transition()
          .duration(1000)
          .ease(d3.easeCubic)
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("d", (d) => lineGenerator(d.values) as string),
      (exit) =>
        exit
          .transition()
          .duration(1000)
          .attr("stroke-dashoffset", function (this: SVGPathElement) {
            return this.getTotalLength();
          })
          .remove()
    );
  }, [
    aggregatedData,
    dimensions,
    colorScale,
    mode,
    showPercentage,
    darkMode,
    categories,
  ]);

  function getTotalHeightIncludingMargin(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return 0;

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

    return rect.height + marginTop + marginBottom;
  }

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[730px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[800px]"
      } flex-grow py-2 pt-4 px-0 md:p-4 flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Control Panel: Mode buttons, percentage toggle, and expand/collapse button */}
      <div
        id="aggregate-per-time-plot-header"
        className="flex items-center justify-between mb-2 px-4 md:px-0"
      >
        <div className="flex space-x-2">
          {(["hour", "weekday", "month"] as Mode[]).map((item) => {
            const isActive = mode === item;
            const buttonClass = isActive
              ? darkMode
                ? "bg-white text-black border border-gray-300 hover:border-gray-300"
                : "bg-black text-white border-none"
              : darkMode
              ? "bg-gray-700 text-white border border-gray-300 hover:border-gray-300"
              : "bg-white text-gray-700 border border-black hover:border-black";
            return (
              <button
                key={item}
                className={`px-3 py-1 md:text-base text-sm rounded-none ${buttonClass}`}
                onClick={() => setMode(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center w-fit md:w-auto justify-center md:justify-end">
          <Hash
            className={`${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <Switch
            onChange={() => setShowPercentage(!showPercentage)}
            checked={showPercentage}
            offColor={darkMode ? "#444" : "#ccc"}
            onColor="#000"
            uncheckedIcon={false}
            checkedIcon={false}
            height={20}
            width={48}
            handleDiameter={16}
            borderRadius={20}
            boxShadow="none"
            activeBoxShadow="none"
            className="custom-switch mx-1 md:mx-2"
          />
          <Percent
            className={`${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <button
            className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
              darkMode ? "text-white" : "text-black"
            }`}
            onClick={() => {
              setExpanded(!expanded);
              // Dispatch a resize event for layout update after expanding/collapsing.
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
      </div>
      {/* Legend showing sender names with their corresponding colors */}
      <div
        id="aggregate-per-time-plot-legend"
        className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2 px-4 md:px-0"
      >
        {senders.map((sender) => (
          <div key={sender} className="flex items-center mr-4 mb-2">
            <div
              className="w-4 h-4 mr-1"
              style={{ backgroundColor: colorScale(sender) }}
            ></div>
            <span
              className="text-sm whitespace-nowrap"
              style={{ color: darkMode ? "#fff" : "#000" }}
            >
              {sender}
            </span>
          </div>
        ))}
      </div>
      {/* Chart container: shows a spinner while uploading, a message when no data is available,
          or the SVG chart otherwise. */}
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : messages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg
            id="aggregate_plot"
            ref={svgRef}
            className="h-full w-full flex-grow"
          ></svg>
        )}
      </div>
    </div>
  );
};

export default AggregatePerTimePlot;
