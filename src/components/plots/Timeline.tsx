// src/components/Plot2.tsx

import React, { useEffect, useRef, useMemo, useState, RefObject } from "react";
import * as d3 from "d3";
import {
  Hash,
  Percent,
  Maximize2,
  Minimize2,
  Split,
  Merge,
} from "lucide-react";
import Switch from "react-switch";
import ClipLoader from "react-spinners/ClipLoader";

import { useChat } from "../../context/ChatContext";
import { ChatMessage } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";

/** ------------------------------------------------------------------ */
/**                          TYPE DEFINITIONS                          */
/** ------------------------------------------------------------------ */

/**
 * Data structure for a single data point in the timeline.
 */
interface TimeDataPoint {
  date: Date;
  count: number;
  percentage?: number;
}

/**
 * Aggregated data per sender for the timeline chart.
 */
interface TimeAggregatedData {
  sender: string;
  values: TimeDataPoint[];
}

/**
 * Mode of time aggregation.
 * "year" aggregates by year, while "month" aggregates by month.
 */
type Mode = "year" | "month";

/** ------------------------------------------------------------------ */
/**                      HELPER / UTILITY FUNCTIONS                    */
/** ------------------------------------------------------------------ */

/**
 * Returns the sorted unique categories (as strings) from the chat messages
 * based on the current mode.
 *
 * @param mode - The current mode ("year" or "month")
 * @param messages - Array of chat messages
 * @returns An array of unique category strings (e.g. ["2023","2024"] or ["2023-01","2023-02"]).
 */
function getTimeCategories(mode: Mode, messages: ChatMessage[]): string[] {
  if (mode === "year") {
    return Array.from(
      new Set(
        messages.map((msg) => new Date(msg.date).getFullYear().toString())
      )
    ).sort();
  } else {
    return Array.from(
      new Set(messages.map((msg) => d3.timeFormat("%Y-%m")(new Date(msg.date))))
    ).sort();
  }
}

/**
 * Returns the category string for a given chat message based on the current mode.
 *
 * @param msg - A chat message.
 * @param mode - The current mode ("year" or "month").
 * @returns A category string (e.g. "2023" or "2023-04").
 */
function getCategoryFromMessage(msg: ChatMessage, mode: Mode): string {
  const date = new Date(msg.date);
  if (mode === "year") {
    return date.getFullYear().toString();
  } else {
    return d3.timeFormat("%Y-%m")(date);
  }
}

/**
 * Aggregates chat messages per sender and per time category.
 *
 * Only messages with `isUsed === true` are considered. A sender is included
 * only if its total number of messages is at least the specified percentage
 * of all used messages. If `showPercentage` is true, each category’s count
 * is converted to a percentage of that sender’s total.
 *
 * @param messages - Array of chat messages.
 * @param mode - The current mode ("year" or "month").
 * @param categories - Array of categories based on the current mode.
 * @param minMessagePercentage - Minimum percentage threshold (0–100).
 * @param showPercentage - Flag indicating if values should be converted to percentages.
 * @returns An array of aggregated data by sender.
 */
function aggregateTimeMessages(
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  minMessagePercentage: number,
  showPercentage: boolean
): TimeAggregatedData[] {
  if (messages.length === 0) return [];

  const totalMessages = messages.filter((msg) => msg.isUsed).length;
  const minMessages = (minMessagePercentage / 100) * totalMessages;

  // Build a nested object: sender -> category -> count
  const dataMap: { [sender: string]: { [category: string]: number } } = {};

  messages.forEach((msg) => {
    if (!msg.isUsed) return;
    const sender = msg.sender;
    const category = getCategoryFromMessage(msg, mode);
    if (!dataMap[sender]) {
      dataMap[sender] = {};
      categories.forEach((cat) => {
        dataMap[sender][cat] = 0;
      });
    }
    dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
  });

  // Create an intermediate result that also tracks total count per sender
  const intermediate: (TimeAggregatedData & { total: number })[] = Object.keys(
    dataMap
  )
    .map((sender) => {
      const values = categories.map((cat) => {
        let date: Date;
        if (mode === "year") {
          date = new Date(parseInt(cat), 0, 1);
        } else {
          const [year, month] = cat.split("-").map(Number);
          date = new Date(year, (month || 1) - 1, 1);
        }
        return { date, count: dataMap[sender][cat] || 0 };
      });
      const total = values.reduce((sum, v) => sum + v.count, 0);
      return { sender, values, total };
    })
    .filter((data) => data.total >= minMessages);

  // If percentage display is enabled, calculate percentages per sender
  if (showPercentage) {
    return intermediate.map(({ sender, values }) => {
      const total = d3.sum(values, (v) => v.count);
      return {
        sender,
        values: values.map((v) => ({
          ...v,
          percentage: total > 0 ? (v.count / total) * 100 : 0,
        })),
      };
    });
  } else {
    // Return the same structure without percentage
    return intermediate.map(({ sender, values }) => ({ sender, values }));
  }
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

/** ------------------------------------------------------------------ */
/**                  CUSTOM HOOK: useTimelineChart                     */
/** ------------------------------------------------------------------ */

/**
 * A custom hook that handles all the D3 drawing and updating logic for the timeline chart.
 *
 * @param svgRef - A ref to the <svg> element where the chart is rendered.
 * @param containerRef - A ref to the container <div> that wraps the chart.
 * @param dimensions - The observed width/height from the resize observer.
 * @param aggregatedData - The aggregated data for each sender.
 * @param mode - The current time aggregation mode ("year" or "month").
 * @param showPercentage - If true, values are displayed as percentages.
 * @param darkMode - Whether the app is in dark mode or not.
 * @param startDate - Optional lower bound for date filtering.
 * @param endDate - Optional upper bound for date filtering.
 * @param setMode - Callback to switch mode externally if needed (e.g., from year to month).
 * @param setUniqueYearsLessThanThree - Callback to control forced switching of the mode.
 */
function useTimelineChart(
  svgRef: RefObject<SVGSVGElement>,
  containerRef: RefObject<HTMLDivElement>,
  dimensions: { width: number; height: number } | undefined,
  aggregatedData: TimeAggregatedData[],
  mergedData: TimeAggregatedData[], // ⬅️ Neu hinzugefügt
  mode: Mode,
  showPercentage: boolean,
  darkMode: boolean,
  startDate: Date | undefined,
  endDate: Date | undefined,
  setMode: React.Dispatch<React.SetStateAction<Mode>>,
  setUniqueYearsLessThanThree: React.Dispatch<React.SetStateAction<boolean>>,
  showMerged: boolean // ⬅️ Neu hinzugefügt
): void {
  useEffect(() => {
    // If no valid dimensions or no data, do not render.
    if (!dimensions || aggregatedData.length === 0) return;

    const fallbackDate = new Date(2000, 0, 1);

    // 1) Filter data to respect the date range [startDate, endDate].
    //    This is done so we only plot points that lie within the selected date range.
    const filteredData = (showMerged ? mergedData : aggregatedData).map(
      (d) => ({
        sender: d.sender,
        values: d.values.filter((v) => {
          if (mode === "year") {
            const startYear = startDate
              ? new Date(startDate).getFullYear()
              : -Infinity;
            const endYear = endDate
              ? new Date(endDate).getFullYear()
              : Infinity;
            return (
              v.date.getFullYear() >= startYear &&
              v.date.getFullYear() <= endYear
            );
          } else {
            const startMonth = startDate
              ? new Date(startDate.getFullYear(), startDate.getMonth(), 1)
              : null;
            const endMonth = endDate
              ? new Date(endDate.getFullYear(), endDate.getMonth(), 1)
              : null;
            if (startMonth && v.date < startMonth) return false;
            if (endMonth && v.date > endMonth) return false;
            return true;
          }
        }),
      })
    );

    // 2) Gather all dates from the filtered data and determine min/max.
    const filteredDates = filteredData.flatMap((d) =>
      d.values.map((v) => v.date)
    );
    const minDate = d3.min(filteredDates) || fallbackDate;
    const maxDate = d3.max(filteredDates) || new Date();

    // 3) Compute domain start/end depending on the mode.
    let computedStartDate: Date;
    let computedEndDate: Date;
    if (mode === "year") {
      computedStartDate = new Date(minDate.getFullYear(), 0, 1);
      computedEndDate = new Date(maxDate.getFullYear(), 0, 1);
    } else {
      computedStartDate = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        1
      );
      computedEndDate = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        maxDate.getDate()
      );
    }

    // 4) Check how many unique years are in the filtered data. If fewer than 3, force "month" mode.
    const uniqueYears = new Set(
      filteredDates.map((date) => date.getFullYear())
    );

    const hasLessThanThreeYears = uniqueYears.size < 3;
    setUniqueYearsLessThanThree(hasLessThanThreeYears);
    if (hasLessThanThreeYears) {
      setMode("month");
    }

    // 5) Initialize or update the D3 scales, axes, and the chart area.
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    // Calculate leftover space after margins and header/legend.
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    // Adjust side margins for small screens
    if (window.innerWidth <= 768) {
      margin.right = 20;
      margin.left = 40;
    }

    // Deduct the heights occupied by the header and legend.
    const headerHeight = getTotalHeightIncludingMargin("timeline-plot-header");
    const legendHeight = getTotalHeightIncludingMargin("timeline-plot-legend");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight =
      height - margin.top - margin.bottom - headerHeight - legendHeight;

    // If there's no valid data after filtering, do not proceed.
    if (filteredData.every((d) => d.values.length === 0)) return;

    // X-scale based on time
    const xScale = d3
      .scaleTime()
      .domain([computedStartDate, computedEndDate])
      .range([0, innerWidth]);

    // Y-scale depends on whether we show percentage or absolute counts
    const yMax = showPercentage
      ? d3.max(showMerged ? mergedData : aggregatedData, (d) =>
          d3.max(d.values, (v) => v.percentage)
        ) || 100
      : d3.max(showMerged ? mergedData : aggregatedData, (d) =>
          d3.max(d.values, (v) => v.count)
        ) || 10;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Axes
    const maxTicks = Math.floor(innerWidth / 100); // dynamic # of ticks
    const xAxis = d3.axisBottom<Date>(xScale).ticks(maxTicks);
    const yAxis = d3
      .axisLeft<number>(yScale)
      .ticks(5)
      .tickFormat(d3.format(".2s"));

    // Line generator
    const lineGenerator = d3
      .line<TimeDataPoint>()
      .defined((d) => d.date >= computedStartDate && d.date <= computedEndDate)
      .x((d) => xScale(d.date))
      .y((d) => yScale(showPercentage ? d.percentage ?? 0 : d.count))
      .curve(d3.curveMonotoneX);

    // 6) Grab or create main chart group
    let chartGroup = svg.select<SVGGElement>(".chart-group");
    if (chartGroup.empty()) {
      // Create chart group if it doesn't exist
      chartGroup = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // X-grid
      chartGroup
        .append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => "")
        )
        .selectAll("line")
        .attr("stroke", darkMode ? "#606060" : "#e0e0e0");

      // Y-grid
      chartGroup
        .append("g")
        .attr("class", "y-grid")
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => "")
        )
        .selectAll("line")
        .attr("stroke", darkMode ? "#606060" : "#e0e0e0");

      // X-axis
      chartGroup
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", darkMode ? "white" : "black")
        .style("font-weight", "normal");

      // Y-axis
      chartGroup
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "14px")
        .style("fill", darkMode ? "white" : "black")
        .style("font-weight", "normal");

      // Lines (initial creation with transition from bottom)
      chartGroup
        .selectAll<SVGPathElement, TimeAggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke", "gray") // will be updated below
        .attr("d", (d) => {
          const initialValues = d.values.map((v) => ({ ...v, y: innerHeight }));
          const initialLine = d3
            .line<TimeDataPoint>()
            .x((d) => xScale(d.date))
            .y(() => innerHeight)
            .curve(d3.curveMonotoneX);
          return initialLine(initialValues) as string;
        })
        .transition()
        .duration(2000)
        .ease(d3.easeCubic)
        .attr("d", (d) => lineGenerator(d.values) as string);
    }

    // 7) Update grids and axes on subsequent renders
    chartGroup
      .select<SVGGElement>(".x-grid")
      .transition()
      .duration(1000)
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", darkMode ? "#a0a0a0" : "#e0e0e0");

    chartGroup
      .select<SVGGElement>(".y-grid")
      .transition()
      .duration(1000)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", darkMode ? "#a0a0a0" : "#e0e0e0");

    chartGroup
      .select<SVGGElement>(".x-axis")
      .transition()
      .duration(1000)
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", darkMode ? "white" : "black")
      .style("font-size", "14px");

    chartGroup
      .select<SVGGElement>(".y-axis")
      .transition()
      .duration(1000)
      .call(yAxis)
      .selectAll("text")
      .style("fill", darkMode ? "white" : "black")
      .style("font-size", "14px");

    // 8) Update existing lines or create/remove lines for new/old senders
    const lines = chartGroup
      .selectAll<SVGPathElement, TimeAggregatedData>(".line")
      .data(showMerged ? mergedData : aggregatedData, (d) => d.sender);

    // Color scale for lines (we re-instantiate here each render)
    const senders = aggregatedData.map((d) => d.sender);

    const getColorScale = () => {
      if (showMerged) {
        return () => (darkMode ? "#fff" : "#000");
      }
      const colorRange = darkMode ? d3.schemeSet2 : d3.schemePaired;
      return d3.scaleOrdinal<string, string>(colorRange).domain(senders);
    };

    const colorScale = getColorScale();

    lines.join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("stroke-width", showMerged ? 2 : 2) // Dickere Linie für summierte Darstellung
          .attr("d", (d) => lineGenerator(d.values) as string),
      (update) =>
        update
          .transition()
          .duration(1000)
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("stroke-width", showMerged ? 2 : 2) // Dickere Linie für summierte Darstellung
          .attr("d", (d) => lineGenerator(d.values) as string),
      (exit) => exit.remove()
    );

    // 9) Tooltip handling
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Create or update overlay for capturing mouse events
    chartGroup
      .selectAll<SVGRectElement, null>("rect.overlay")
      .data([null])
      .join((enter) => enter.append("rect").attr("class", "overlay"))
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        chartGroup.select("line.hover-line").style("opacity", 1);
        tooltip.style("display", "block");
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, this);

        // Move the hover-line
        chartGroup
          .select("line.hover-line")
          .attr("x1", mx)
          .attr("x2", mx)
          .attr("y1", 0)
          .attr("y2", innerHeight);

        // Determine the nearest date using a bisector
        const bisectDate = d3.bisector<Date, Date>((d) => d).left;
        const dates = filteredData[0]?.values.map((v) => v.date) || [];
        const x0 = xScale.invert(mx);
        const i = bisectDate(dates, x0);
        const d0 = dates[i - 1];
        const d1 = dates[i];
        const nearestDate =
          !d0 ||
          (d1 && x0.getTime() - d0.getTime() > d1.getTime() - x0.getTime())
            ? d1
            : d0;

        // Format date for either year or month
        const dateFormatter =
          mode === "year" ? d3.timeFormat("%Y") : d3.timeFormat("%Y-%m");
        const formattedDate = nearestDate ? dateFormatter(nearestDate) : "";

        // Prepare tooltip content
        const tooltipData = filteredData.map((fd) => {
          const point = fd.values.find(
            (v) => dateFormatter(v.date) === formattedDate
          );
          const value =
            showPercentage && point?.percentage !== undefined
              ? `${point.percentage.toFixed(2)}%`
              : point?.count ?? 0;
          return { sender: fd.sender, value };
        });

        tooltip.html(
          `<strong>${formattedDate}</strong><br>` +
            tooltipData
              .map(
                (td) =>
                  `<span style="color:${colorScale(td.sender)}">${td.sender}: ${
                    td.value
                  }</span>`
              )
              .join("<br>")
        );

        tooltip
          .style("left", `${mx + margin.left + 10}px`)
          .style("top", `${my + margin.top + 10}px`);
      })
      .on("mouseleave", () => {
        chartGroup.select("line.hover-line").style("opacity", 0);
        tooltip.style("display", "none");
      });

    // Ensure hover-line exists
    if (chartGroup.select("line.hover-line").empty()) {
      chartGroup
        .append("line")
        .attr("class", "hover-line")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .style("opacity", 0);
    }
  }, [
    svgRef,
    containerRef,
    dimensions,
    aggregatedData,
    mode,
    showPercentage,
    darkMode,
    setUniqueYearsLessThanThree,
    setMode,
  ]);
}

/** ------------------------------------------------------------------ */
/**                       MAIN COMPONENT: Plot2                        */
/** ------------------------------------------------------------------ */

/**
 * **Plot2**
 * Renders an interactive D3 timeline chart that aggregates chat messages by sender over time.
 *
 * - Supports two modes ("year" and "month").
 * - Toggles between absolute counts and percentages.
 * - Displays tooltips, smooth transitions, a dynamic legend, and date–range filtering.
 * - Allows expand/collapse for a larger view.
 * - Reactive to dark mode.
 */
const Plot2: React.FC = () => {
  const {
    messages,
    darkMode,
    isUploading,
    startDate,
    endDate,
    minMessagePercentage,
  } = useChat();

  // Refs for the container <div> and the <svg>
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Observed dimensions from the container
  const dimensions = useResizeObserver(containerRef);

  // Local UI states
  const [expanded, setExpanded] = useState(false);
  const [uniqueYearsLessThanThree, setUniqueYearsLessThanThree] =
    useState(false);
  const [mode, setMode] = useState<Mode>("year");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState(false);

  /**
   * Create the tooltip element once on mount (if it doesn't exist).
   */
  useEffect(() => {
    if (!containerRef.current) return;
    const tooltip = d3.select(containerRef.current).select(".tooltip");
    if (tooltip.empty()) {
      d3.select(containerRef.current)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px")
        .style("border", "1px solid #999")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("display", "none");
    }
  }, []);

  /**
   * Update the tooltip's styling whenever dark mode changes.
   */
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  /**
   * If there are no messages at all, reset the mode to "month" and
   * disable percentage view.
   */
  useEffect(() => {
    if (messages.length === 0) {
      setMode("month");
      setShowPercentage(false);
    }
  }, [messages]);

  // 1) Compute the time categories for the selected mode
  const categories = useMemo(
    () => getTimeCategories(mode, messages),
    [mode, messages]
  );

  // 2) Aggregate messages by sender
  const aggregatedData = useMemo(
    () =>
      aggregateTimeMessages(
        messages,
        mode,
        categories,
        minMessagePercentage,
        showPercentage
      ),
    [messages, mode, categories, minMessagePercentage, showPercentage]
  );

  // Summierte Daten für alle Sender berechnen, falls `showMerged` aktiv ist
  const mergedData = useMemo(() => {
    if (!showMerged) return aggregatedData;

    // Alle einzigartigen Zeitstempel aus aggregatedData sammeln
    const allDates = Array.from(
      new Set(
        aggregatedData.flatMap((d) => d.values.map((v) => v.date.getTime()))
      )
    ).sort((a, b) => a - b); // Sortieren nach Zeitstempel

    const mergedValues = allDates.map((timestamp) => {
      const date = new Date(timestamp);
      const totalCount = aggregatedData.reduce((sum, senderData) => {
        const value = senderData.values.find(
          (v) => v.date.getTime() === timestamp
        );
        return sum + (value ? value.count : 0);
      }, 0);

      return { date, count: totalCount };
    });

    return [{ sender: "Total", values: mergedValues }];
  }, [aggregatedData, showMerged]);

  // 3) Extract sender names for the legend and color scale
  const senders = useMemo(() => {
    if (showMerged) return ["Total"];
    return aggregatedData.map((d) => d.sender);
  }, [aggregatedData, showMerged]);

  useTimelineChart(
    svgRef,
    containerRef,
    dimensions,
    showMerged ? mergedData : aggregatedData,
    mergedData,
    mode,
    showPercentage,
    darkMode,
    startDate,
    endDate,
    setMode,
    setUniqueYearsLessThanThree,
    showMerged
  );

  /**
   * Determines the color for each sender. Re-created after each render to keep
   * legend colors consistent with the lines in the chart.
   */
  const getColorScale = () => {
    if (showMerged) {
      return () => (darkMode ? "#fff" : "#000");
    }
    const colorRange = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colorRange).domain(senders);
  };

  const colorScale = getColorScale();

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full py-2 pt-4 px-0 md:p-4 md:min-w-[730px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[800px]"
      } flex-grow flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Header with Mode Toggle, Percentage Switch, and Expand/Collapse */}
      <div
        id="timeline-plot-header"
        className="flex items-center justify-between mb-2 px-4 md:px-0"
      >
        {/* Only show year/month buttons if we do NOT force switch to month mode */}
        {!uniqueYearsLessThanThree ? (
          <div className="flex space-x-2 mt-0">
            <button
              className={`px-3 py-1 md:text-base text-sm rounded-none ${
                mode === "year"
                  ? darkMode
                    ? "bg-white text-black border border-gray-300 hover:border-gray-300"
                    : "bg-black text-white border-none"
                  : darkMode
                  ? "bg-gray-700 text-white border border-gray-300 hover:border-gray-300"
                  : "bg-white text-gray-700 border border-black hover:border-black"
              }`}
              onClick={() => setMode("year")}
            >
              Year
            </button>
            <button
              className={`px-3 py-1 md:text-base text-sm rounded-none ${
                mode === "month"
                  ? darkMode
                    ? "bg-white text-black border border-gray-300 hover:border-gray-300"
                    : "bg-black text-white border-none"
                  : darkMode
                  ? "bg-gray-700 text-white border border-gray-300 hover:border-gray-300"
                  : "bg-white text-gray-700 border border-black hover:border-black"
              }`}
              onClick={() => setMode("month")}
            >
              Month
            </button>
          </div>
        ) : (
          <div></div>
        )}

        {/* Switch for Absolute vs. Percentage */}
        <div className="flex items-center w-fit md:w-auto justify-center md:justify-end">
          <Split
            className={`hidden md:inline-block ${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />

          {/* Switch für Desktop, Button für Mobile */}
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                if (showPercentage) {
                  setShowPercentage(false);
                }
                setShowMerged(!showMerged);
              }}
              checked={showMerged}
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
              className="custom-switch"
            />
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => {
              if (showPercentage) {
                setShowPercentage(false);
              }
              setShowMerged(!showMerged);
            }}
            className={`md:hidden p-2 rounded-none border ${
              darkMode ? "border-white bg-gray-700" : "border-black bg-white"
            }`}
          >
            {showMerged ? (
              <Split
                className={`w-3 h-3 ${
                  darkMode
                    ? "text-white border-white"
                    : "text-gray-700 border-black"
                }`}
              />
            ) : (
              <Merge
                className={`w-3 h-3 ${
                  darkMode
                    ? "text-white border-white"
                    : "text-gray-700 border-black"
                }`}
              />
            )}
          </button>

          <Merge
            className={`hidden md:inline-block ${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />

          <Hash
            className={`ml-4 hidden md:inline-block ${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />

          {/* Switch für Desktop, Button für Mobile */}
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                if (showMerged) {
                  setShowMerged(false);
                }
                setShowPercentage(!showPercentage);
              }}
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
              className="custom-switch"
            />
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => {
              if (showMerged) {
                setShowMerged(false);
              }
              setShowPercentage(!showPercentage);
            }}
            className={`ml-1 md:hidden p-2 rounded-none border ${
              darkMode ? "border-white bg-gray-700" : "border-black bg-white"
            }`}
          >
            {showPercentage ? (
              <Hash
                className={`w-3 h-3 ${
                  darkMode
                    ? "text-white border-white"
                    : "text-gray-700 border-black"
                }`}
              />
            ) : (
              <Percent
                className={`w-3 h-3 ${
                  darkMode
                    ? "text-white border-white"
                    : "text-gray-700 border-black"
                }`}
              />
            )}
          </button>

          <Percent
            className={`hidden md:inline-block ${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />

          {/* Expand / Collapse Button */}
          <button
            className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
              darkMode ? "text-white" : "text-black"
            }`}
            onClick={() => {
              setExpanded(!expanded);
              // Resize Event für D3-Render-Update auslösen
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

      {/* Legend */}
      <div
        id="timeline-plot-legend"
        className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2 px-4 md:px-0"
      >
        {senders
          .filter((sender) => sender !== "Total") // 👈 "Total" aus der Legende entfernen
          .map((sender) => (
            <div key={sender} className="flex items-center mr-4 mb-2">
              <div
                className="w-4 h-4 mr-1"
                style={{ backgroundColor: colorScale(sender) }}
              ></div>
              <span
                className="text-sm text-nowrap"
                style={{ color: darkMode ? "#fff" : "#000" }}
              >
                {sender}
              </span>
            </div>
          ))}
      </div>

      {/* Chart or Loader / No Data Message */}
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
            id="timeline_plot"
            ref={svgRef}
            className="h-full w-full flex-grow"
          />
        )}
      </div>
    </div>
  );
};

export default Plot2;
