// src/components/Plot2.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import Switch from "react-switch";
import "./AggregatePerTimePlot.css"; // Using the same CSS as Plot1
import ClipLoader from "react-spinners/ClipLoader";
import { Hash, Percent, Maximize2, Minimize2 } from "lucide-react";

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

/**
 * Returns the sorted unique categories (as strings) from the chat messages based on the current mode.
 *
 * @param mode - The current mode ("year" or "month")
 * @param messages - Array of chat messages
 * @returns An array of unique category strings.
 */
const getTimeCategories = (mode: Mode, messages: ChatMessage[]): string[] => {
  if (mode === "year") {
    return Array.from(
      new Set(
        messages.map((msg) => new Date(msg.date).getFullYear().toString())
      )
    ).sort();
  } else if (mode === "month") {
    return Array.from(
      new Set(messages.map((msg) => d3.timeFormat("%Y-%m")(new Date(msg.date))))
    ).sort();
  }
  return [];
};

/**
 * Returns the category string for a given chat message based on the current mode.
 *
 * @param msg - A chat message.
 * @param mode - The current mode ("year" or "month").
 * @returns A category string (e.g. "2023" or "2023-04").
 */
const getCategoryFromMessage = (msg: ChatMessage, mode: Mode): string => {
  const date = new Date(msg.date);
  return mode === "year"
    ? date.getFullYear().toString()
    : d3.timeFormat("%Y-%m")(date);
};

/**
 * Aggregates chat messages per sender and per time category.
 *
 * Only messages with `isUsed === true` are considered. A sender is included only if its
 * total number of messages is at least the specified percentage of all used messages.
 *
 * If `showPercentage` is true, each category’s count is converted to a percentage.
 *
 * @param messages - Array of chat messages.
 * @param mode - The current mode ("year" or "month").
 * @param categories - Array of categories based on the current mode.
 * @param minMessagePercentage - Minimum percentage threshold (0–100).
 * @param showPercentage - Flag indicating if values should be converted to percentages.
 * @returns An array of aggregated data by sender.
 */
const aggregateTimeMessages = (
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  minMessagePercentage: number,
  showPercentage: boolean
): TimeAggregatedData[] => {
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

  // Create an intermediate result that also contains the total count per sender.
  const intermediate: TimeAggregatedData[] = Object.keys(dataMap)
    .map((sender) => {
      const values = categories.map((category) => {
        let date: Date;
        if (mode === "year") {
          date = new Date(parseInt(category), 0, 1);
        } else {
          const [year, month] = category.split("-").map(Number);
          date = new Date(year, month - 1, 1);
        }
        return { date, count: dataMap[sender][category] };
      });
      const total = values.reduce((sum, v) => sum + v.count, 0);
      return { sender, values, total };
    })
    .filter((d) => d.total >= minMessages)
    .map(({ sender, values }) => ({ sender, values }));

  // If percentage display is enabled, calculate percentages per sender.
  const result = showPercentage
    ? intermediate.map((senderData) => {
        const total = d3.sum(senderData.values, (d) => d.count);
        return {
          ...senderData,
          values: senderData.values.map((d) => ({
            ...d,
            percentage: total > 0 ? (d.count / total) * 100 : 0,
          })),
        };
      })
    : intermediate;

  return result;
};

/**
 * Plot2 Component
 *
 * This component renders an interactive D3 timeline chart that aggregates chat messages
 * by sender over time. It supports two modes ("year" and "month"), a toggle between
 * absolute counts and percentages, tooltips, smooth transitions, a dynamic legend,
 * date–range filtering, and an expand/collapse feature.
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // Local state for expand toggle, mode selection, and percentage view.
  const [expanded, setExpanded] = useState(false);
  const [uniqueYearsLessThanThree, setUniqueYearsLessThanThree] =
    useState(false);
  const [mode, setMode] = useState<Mode>("year");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  // Create the tooltip element once.
  useEffect(() => {
    if (!containerRef.current) return;
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");
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

  // Update tooltip styling on dark mode changes.
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  // Generate the sorted categories for the current mode.
  const categories = useMemo(
    () => getTimeCategories(mode, messages),
    [mode, messages]
  );

  // Aggregate chat messages by sender and time category.
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

  // Extract sender names for the legend and color scale.
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  // Create a color scale based on sender names and dark mode.
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  // Reset mode and percentage view if there are no messages.
  useEffect(() => {
    if (messages.length === 0) {
      setMode("month");
      setShowPercentage(false);
    }
  }, [messages]);

  // D3 chart drawing effect.
  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const fallbackDate = new Date(2000, 0, 1);

    // Filtere die Datenpunkte anhand von startDate und endDate
    const filteredData = aggregatedData.map((d) => ({
      sender: d.sender,
      values: d.values.filter((v) => {
        if (mode === "year") {
          const startYear = startDate
            ? new Date(startDate).getFullYear()
            : -Infinity;
          const endYear = endDate ? new Date(endDate).getFullYear() : Infinity;
          return (
            v.date.getFullYear() >= startYear && v.date.getFullYear() <= endYear
          );
        } else {
          const startMonth = startDate
            ? new Date(
                new Date(startDate).getFullYear(),
                new Date(startDate).getMonth(),
                1
              )
            : null;
          const endMonth = endDate
            ? new Date(
                new Date(endDate).getFullYear(),
                new Date(endDate).getMonth(),
                1
              )
            : null;
          if (startMonth && v.date < startMonth) return false;
          if (endMonth && v.date > endMonth) return false;
          return true;
        }
      }),
    }));

    // Extrahiere alle verbleibenden Datumswerte
    const filteredDates = filteredData.flatMap((d) =>
      d.values.map((v) => v.date)
    );

    // Ermittle das minimale und maximale Datum der gefilterten Nachrichten
    const minDate = d3.min(filteredDates) || fallbackDate;
    const maxDate = d3.max(filteredDates) || new Date();

    // Passe computedStartDate und computedEndDate abhängig vom Modus an
    let computedStartDate: Date, computedEndDate: Date;
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

    // Bestimme die einzigartigen Jahre in den gefilterten Daten (so wie sie im "year"-Modus betrachtet würden)
    const uniqueYears = new Set(
      filteredDates.map((date) => date.getFullYear())
    );

    // Falls weniger als drei einzigartige Jahre vorhanden sind, wechsle in den "month"-Modus
    const hasLessThanThreeYears = uniqueYears.size < 3;
    setUniqueYearsLessThanThree(hasLessThanThreeYears);
    if (hasLessThanThreeYears) {
      setMode("month");
    }

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const headerHeight = getTotalHeightIncludingMargin("timeline-plot-header");
    const legendHeight = getTotalHeightIncludingMargin("timeline-plot-legend");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight =
      height - margin.top - margin.bottom - headerHeight - legendHeight;

    if (filteredData.every((d) => d.values.length === 0)) return;

    // Create scales for the chart.
    const xScale = d3
      .scaleTime()
      .domain([computedStartDate, computedEndDate])
      .range([0, innerWidth]);

    const yMax = showPercentage
      ? d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.percentage)) ||
        100
      : d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Dynamically compute the maximum number of ticks based on available width.
    const maxTicks = Math.floor(innerWidth / 80);
    const xAxis = d3.axisBottom(xScale).ticks(maxTicks);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => (showPercentage ? `${d}%` : `${d}`));

    // Create a line generator for the timeline.
    const lineGenerator = d3
      .line<TimeDataPoint>()
      .defined((d) => d.date >= computedStartDate && d.date <= computedEndDate)
      .x((d) => xScale(d.date))
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Select or create the main chart group.
    let chartGroup = svg.select<SVGGElement>(".chart-group");
    if (chartGroup.empty()) {
      chartGroup = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Draw X–grid.
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

      // Draw Y–grid.
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

      // Draw X–axis.
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

      // Draw Y–axis.
      chartGroup
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Draw initial lines for each sender with an animation.
      chartGroup
        .selectAll<SVGPathElement, TimeAggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", (d) => colorScale(d.sender))
        .attr("stroke-width", 3)
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
    } else {
      // Update grid lines and axes.
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
        .selectAll(".x-grid line")
        .filter((_, i, nodes) => i === nodes.length - 1)
        .attr("stroke", "none");

      chartGroup
        .select<SVGGElement>(".x-axis")
        .transition()
        .duration(1000)
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      chartGroup
        .select<SVGGElement>(".y-axis")
        .transition()
        .duration(1000)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Update the lines with transitions.
      const lines = chartGroup
        .selectAll<SVGPathElement, TimeAggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender);

      lines.join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", (d) => colorScale(d.sender))
            .attr("stroke-width", 3)
            .attr("d", (d) => {
              const initialValues = d.values.map((v) => ({
                ...v,
                y: innerHeight,
              }));
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
    }

    // Tooltip and overlay handling.
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Add or update the overlay rectangle to capture mouse events.
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
        const [mx, my] = d3.pointer(event);
        chartGroup
          .select("line.hover-line")
          .attr("x1", mx)
          .attr("x2", mx)
          .attr("y1", 0)
          .attr("y2", innerHeight);

        // Use a bisector to find the nearest date.
        const bisectDate = d3.bisector((d: Date) => d).left;
        const dates = aggregatedData[0]?.values.map((v) => v.date) || [];
        const x0 = xScale.invert(mx);
        const i = bisectDate(dates, x0);
        const d0 = dates[i - 1];
        const d1 = dates[i];
        const nearestDate =
          !d0 ||
          (d1 && x0.getTime() - d0.getTime() > d1.getTime() - x0.getTime())
            ? d1
            : d0;
        const dateFormatter =
          mode === "year" ? d3.timeFormat("%Y") : d3.timeFormat("%Y-%m");
        const formattedDate = nearestDate ? dateFormatter(nearestDate) : "";

        // Prepare tooltip content for each sender.
        const tooltipData = aggregatedData.map((d) => {
          const point = d.values.find(
            (v) => dateFormatter(v.date) === formattedDate
          );
          const value =
            showPercentage && point?.percentage !== undefined
              ? point.percentage.toFixed(2) + "%"
              : point?.count;
          return { sender: d.sender, value };
        });

        tooltip.html(
          `<strong>${formattedDate}</strong><br>` +
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
        chartGroup.select("line.hover-line").style("opacity", 0);
        tooltip.style("display", "none");
      });

    // Ensure the hover-line exists.
    if (chartGroup.select("line.hover-line").empty()) {
      chartGroup
        .append("line")
        .attr("class", "hover-line")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .style("opacity", 0);
    }
  }, [
    aggregatedData,
    dimensions,
    colorScale,
    mode,
    showPercentage,
    darkMode,
    categories,
  ]);

  /**
   * This function calculates the total height of an element including its margins.
   * @param elementId ID of the element to calculate the total height for.
   * @returns Returns the total height of the element including margins.
   */
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
      } flex-grow p-4 flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Control Panel: Mode Buttons, Percentage Toggle, and Expand/Collapse */}
      <div
        id="timeline-plot-header"
        className="flex items-center justify-between mb-2"
      >
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
        className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2"
      >
        {senders.map((sender) => (
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
      {/* Chart Area */}
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
          ></svg>
        )}
      </div>
    </div>
  );
};

export default Plot2;
