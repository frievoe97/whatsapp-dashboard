// src/components/Plot1.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../context/ChatContext";
import useResizeObserver from "../hooks/useResizeObserver";
import Switch from "react-switch";
import "./Plot1.css"; // Importiere die CSS-Datei
import ClipLoader from "react-spinners/ClipLoader";
import { Hash, Percent, Maximize2, Minimize2 } from "lucide-react";

interface AggregatedData {
  sender: string;
  values: Array<{
    category: string;
    count: number;
    percentage?: number;
  }>;
}

type Mode = "weekday" | "hour" | "month";

const Plot1: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const [expanded, setExpanded] = useState(false);

  // State für Modus und Darstellung
  const [mode, setMode] = useState<Mode>("hour");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  // Kategorien definieren
  const categories: string[] = useMemo(() => {
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
  }, [mode]);

  // Aggregiere Daten
  const aggregatedData: AggregatedData[] = useMemo(() => {
    if (messages.length === 0) return [];

    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const getCategory = (msg: ChatMessage): string => {
      const date = new Date(msg.date);
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
          ][(date.getDay() + 6) % 7];
        case "hour":
          return date.getHours().toString();
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
          ][date.getMonth()];
        default:
          return "";
      }
    };

    const dataMap: { [sender: string]: { [category: string]: number } } = {};

    messages.forEach((msg: ChatMessage) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
      const category = getCategory(msg);
      if (!dataMap[sender]) {
        dataMap[sender] = {};
        categories.forEach((cat) => (dataMap[sender][cat] = 0));
      }
      dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
    });

    let result: AggregatedData[] = Object.keys(dataMap)
      .map((sender) => ({
        sender,
        total: Object.values(dataMap[sender]).reduce(
          (sum, count) => sum + count,
          0
        ),
        values: categories.map((category) => ({
          category,
          count: dataMap[sender][category],
        })),
      }))
      .filter((d) => d.total >= minMessages) // Nur Sender mit ausreichend Nachrichten behalten
      .map(({ sender, values }) => ({ sender, values }));

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
  }, [messages, mode, showPercentage, categories, minMessagePercentage]);

  // Extrahiere die Sender (für die Legende)
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  useEffect(() => {
    if (messages.length === 0) {
      setMode("hour");
      setShowPercentage(false);
    }
  }, [messages]);

  useEffect(() => {
    // console.log("Is Uploading changed", isUploading);
  }, [isUploading]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  // --- Tooltip einmalig erstellen ---
  // --- Tooltip einmalig erstellen ---
  useEffect(() => {
    if (!containerRef.current) return;
    const existingTooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");
    if (existingTooltip.empty()) {
      d3.select(containerRef.current)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "1000") // NEU: z-index hinzufügen
        .style("padding", "6px")
        .style("border", "1px solid #999")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("display", "none");
    }
  }, []);

  // --- Tooltip-Style aktualisieren bei Dark Mode-Wechsel ---
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  // --- D3-Diagramm erstellen ---
  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 10, right: 20, bottom: 110, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3
      .scalePoint<string>()
      .domain(categories)
      .range([0, innerWidth])
      .padding(0); // Kein Padding mehr, damit der Graph genau bei der ersten und letzten Kategorie beginnt

    const yMax = showPercentage
      ? d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.percentage)) ||
        100
      : d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    const maxTicks = mode === "hour" ? 30 : mode === "weekday" ? 30 : 10;

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(
        categories.filter(
          (_, i) => i % Math.ceil(categories.length / maxTicks) === 0
        )
      );

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => (showPercentage ? `${d}%` : `${d}`));

    // Linien-Generator
    const line = d3
      .line<{ category: string; count: number; percentage?: number }>()
      .defined((d) => d.count !== null && d.count !== undefined)
      .x((d) => xScale(d.category) as number)
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Erstelle (oder wähle) die Chart-Gruppe
    let chart = svg.select<SVGGElement>(".chart-group");
    if (chart.empty()) {
      chart = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    // Tooltip-Element (bereits erstellt)
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Overlay-Rechteck zum Abfangen von Mausereignissen
    const overlay = chart
      .append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    // Horizontale Hilfslinie
    const hoverLine = chart
      .append("line")
      .attr("class", "hover-line")
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .style("opacity", 0);

    // Mausereignisse
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

        const xPositions = categories.map((cat) => xScale(cat) as number);
        const distances = xPositions.map((xPos) => Math.abs(xPos - mx));
        const minIndex = distances.indexOf(Math.min(...distances));
        const nearestCategory = categories[minIndex];

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

    // Hier folgt der Code für das Zeichnen (bzw. Aktualisieren) des Diagramms
    // (Grid, Achsen, Linien etc.)
    // Entferne zuerst ggf. alte Grid-Elemente und Achsen:
    chart.select(".x-grid").remove();
    chart.select(".y-grid").remove();
    chart.select(".x-axis").remove();
    chart.select(".y-axis").remove();

    // Zeichne das X-Grid
    const xGrid = chart
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

    // Zeichne das Y-Grid
    chart
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

    // Zeichne die X-Achse
    chart
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate(0,5)")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", darkMode ? "white" : "black");

    // Zeichne die Y-Achse
    chart
      .append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", darkMode ? "white" : "black");

    const lines = chart
      .selectAll<SVGPathElement, AggregatedData>(".line")
      .data(aggregatedData, (d) => d.sender);

    lines.join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .style("z-index", "500") // NEU: z-index hinzufügen
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("stroke-width", 3)
          .attr("d", (d) => {
            const initialValues = d.values.map((v) => ({
              ...v,
              y: innerHeight,
            }));
            const initialLine = d3
              .line<{ category: string; count: number; percentage?: number }>()
              .x((d) => xScale(d.category) as number)
              .y(() => innerHeight)
              .curve(d3.curveMonotoneX);
            return initialLine(initialValues) as string;
          })
          .transition()
          .duration(2000)
          .ease(d3.easeCubic)
          .attr("d", (d) => line(d.values) as string),
      (update) =>
        update
          .transition()
          .duration(1000)
          .ease(d3.easeCubic)
          .attr("stroke", (d) => colorScale(d.sender))
          .attr("d", (d) => line(d.values) as string),
      (exit) =>
        exit
          .transition()
          .duration(1000)
          .attr("stroke-dashoffset", function (this: SVGPathElement) {
            return this.getTotalLength();
          })
          .remove()
    );

    // Linien (für jeden Sender)
  }, [
    aggregatedData,
    dimensions,
    colorScale,
    mode,
    showPercentage,
    darkMode,
    categories,
  ]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[740px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[800px]"
      } flex-grow p-4 flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      {/* Buttons und Switch */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 md:text-base text-sm rounded-none ${
              mode === "hour"
                ? darkMode
                  ? "bg-white text-black border border-gray-300 hover:border-gray-300"
                  : "bg-black text-white border-none"
                : darkMode
                ? "bg-gray-700 text-white border border-gray-300 hover:border-gray-300"
                : "bg-white text-gray-700 border border-black hover:border-black"
            }`}
            onClick={() => setMode("hour")}
          >
            Hour
          </button>
          <button
            className={`px-3 py-1 md:text-base text-sm rounded-none ${
              mode === "weekday"
                ? darkMode
                  ? "bg-white text-black border border-gray-300 hover:border-gray-300"
                  : "bg-black text-white border-none"
                : darkMode
                ? "bg-gray-700 text-white border border-gray-300 hover:border-gray-300"
                : "bg-white text-gray-700 border border-black hover:border-black"
            }`}
            onClick={() => setMode("weekday")}
          >
            Weekday
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
              }, 200); // Kleine Verzögerung für reflow
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
      {/* Legende */}
      <div className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2">
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
      {/* Inhalt / Diagramm oder Ladeanimation */}
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

export default Plot1;
