import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../../hooks/useResizeObserver";
import Switch from "react-switch";
import {
  Hash,
  Percent,
  Maximize2,
  Minimize2,
  Split,
  Merge,
} from "lucide-react";
import { ChatMessage } from "../../types/chatTypes";

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
 */
const getCategoryFromMessage = (msg: ChatMessage, mode: Mode): string => {
  const date = typeof msg.date === "string" ? new Date(msg.date) : msg.date;
  if (mode === "weekday") {
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
    return parseInt(msg.time.split(":")[0], 10).toString();
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
 * Es werden alle Nachrichten aus filteredMessages verwendet.
 * Die Prozentwerte werden nur berechnet, wenn showPercentage aktiv ist.
 */
const aggregateMessages = (
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  showPercentage: boolean
): AggregatedData[] => {
  if (messages.length === 0) return [];

  console.log("Messages", messages);

  // Build a nested object: sender -> category -> count
  const dataMap: Record<string, Record<string, number>> = {};
  messages.forEach((msg) => {
    const sender = msg.sender;
    console.log();
    const category = getCategoryFromMessage(msg, mode);
    if (!dataMap[sender]) {
      dataMap[sender] = {};
      categories.forEach((cat) => (dataMap[sender][cat] = 0));
    }
    dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
  });

  let result: AggregatedData[] = Object.keys(dataMap).map((sender) => {
    const values = categories.map((category) => ({
      category,
      count: dataMap[sender][category],
    }));
    return { sender, values };
  });

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
 * Rendert den interaktiven D3-Plot für zeitbasierte Aggregation.
 */
const AggregatePerTime: React.FC = () => {
  // Statt "messages" nun ausschließlich "filteredMessages" verwenden
  const { filteredMessages, darkMode } = useChat();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // Lokale Zustände für expand, Modus und Prozent-/Merge-Ansicht
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>("hour");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState<boolean>(false);

  // Kategorien basierend auf dem aktuellen Modus
  const categories = useMemo(() => getCategories(mode), [mode]);

  // Aggregiere die Daten aus filteredMessages
  const aggregatedData = useMemo(
    () => aggregateMessages(filteredMessages, mode, categories, showPercentage),
    [filteredMessages, mode, categories, showPercentage]
  );

  // Extrahiere Sendernamen für Legende und Farbskala
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  // Setze den Modus zurück, falls keine Nachrichten vorhanden sind
  useEffect(() => {
    if (filteredMessages.length === 0) {
      setMode("hour");
      setShowPercentage(false);
    }
  }, [filteredMessages]);

  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  const getLineColor = (sender: string) => {
    if (showMerged) {
      return darkMode ? "#fff" : "#000";
    }
    return colorScale(sender);
  };

  // Falls "showMerged" aktiv: Summiere die Werte über alle Sender
  const mergedData = useMemo(() => {
    if (!showMerged) return aggregatedData;
    const mergedValues = categories.map((category) => {
      const sum = aggregatedData.reduce((acc, senderData) => {
        const value = senderData.values.find((v) => v.category === category);
        return acc + (value ? value.count : 0);
      }, 0);
      return { category, count: sum };
    });
    return [{ sender: "Total", values: mergedValues }];
  }, [aggregatedData, showMerged, categories]);

  // Erstelle einmalig das Tooltip-Element
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

  // Passe Tooltip-Stile bei Dark Mode an
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  // D3-Rendering
  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    let margin = { top: 20, right: 20, bottom: 30, left: 40 };

    if (window.innerWidth <= 768) {
      margin.right = 20;
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

    const xScale = d3
      .scalePoint<string>()
      .domain(categories)
      .range([0, innerWidth])
      .padding(0);

    const yMax = showPercentage
      ? d3.max(mergedData, (d) => d3.max(d.values, (v) => v.percentage ?? 0)) ||
        100
      : d3.max(mergedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

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

    const lineGenerator = d3
      .line<DataPoint>()
      .defined((d) => d.count !== null && d.count !== undefined)
      .x((d) => xScale(d.category) as number)
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    let chartGroup = svg.select<SVGGElement>(".chart-group");
    if (chartGroup.empty()) {
      chartGroup = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
      chartGroup.selectAll(".x-grid, .y-grid, .x-axis, .y-axis").remove();
    }

    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Overlay für Maus-Events
    const overlay = chartGroup
      .append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    // Hover-Linie
    const hoverLine = chartGroup
      .append("line")
      .attr("class", "hover-line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .style("opacity", 0);

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

        // Bestimme die nächstgelegene Kategorie
        const xPositions = categories.map((cat) => xScale(cat) as number);
        const distances = xPositions.map((xPos) => Math.abs(xPos - mx));
        const minIndex = distances.indexOf(Math.min(...distances));
        const nearestCategory = categories[minIndex];

        const tooltipData = mergedData.map((d) => {
          const point = d.values.find((v) => v.category === nearestCategory);
          const value =
            showPercentage && point?.percentage !== undefined
              ? (point.percentage ?? 0).toFixed(2) + "%"
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

    // X-Grid
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

    // Y-Grid
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

    // X-Achse
    chartGroup
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate(0,5)")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", darkMode ? "white" : "black");

    // Y-Achse
    chartGroup
      .append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "14px")
      .style("fill", darkMode ? "white" : "black");

    // Zeichne bzw. update die Linien
    const lines = chartGroup
      .selectAll<SVGPathElement, AggregatedData>(".line")
      .data(mergedData, (d) => d.sender);

    lines.join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", (d) => getLineColor(d.sender))
          .attr("stroke-width", showMerged ? 2 : 2)
          .attr("d", (d) => lineGenerator(d.values) as string),
      (update) =>
        update
          .transition()
          .duration(1000)
          .attr("stroke", (d) => getLineColor(d.sender))
          .attr("stroke-width", showMerged ? 2 : 2)
          .attr("d", (d) => lineGenerator(d.values) as string),
      (exit) => exit.remove()
    );
  }, [
    dimensions,
    colorScale,
    mode,
    showPercentage,
    darkMode,
    categories,
    showMerged,
    aggregatedData,
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
      {/* Control Panel */}
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
          <Split
            className={`hidden md:inline-block ${
              darkMode ? "text-white" : "text-gray-700"
            } w-4 h-4 md:w-5 md:h-5`}
          />

          {/* Desktop Switch */}
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

          {/* Desktop Switch */}
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                setShowPercentage(!showPercentage);
                if (!showPercentage) setShowMerged(false);
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
              setShowPercentage(!showPercentage);
              if (!showPercentage) setShowMerged(false);
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

      {/* Legende (nur wenn nicht gemergt) */}
      {!showMerged && (
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
      )}

      {/* Chart-Container: Wird nur angezeigt, wenn filteredMessages vorhanden sind */}
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
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

export default AggregatePerTime;
