// src/components/Plot1.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../context/ChatContext";
import useResizeObserver from "../hooks/useResizeObserver";

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
  const { messages, darkMode, isUploading } = useChat();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // State für Modus und Darstellung
  const [mode, setMode] = useState<Mode>("hour");
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  // Aggregiere Daten basierend auf dem aktuellen Modus und der Darstellung
  const aggregatedData: AggregatedData[] = useMemo(() => {
    if (messages.length === 0) return [];

    let categories: string[] = [];
    switch (mode) {
      case "weekday":
        categories = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        break;
      case "hour":
        categories = Array.from({ length: 24 }, (_, i) => i.toString());
        break;
      case "month":
        categories = [
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
        break;
      default:
        categories = [];
    }

    // Funktion zur Extraktion der Kategorie basierend auf dem Modus
    const getCategory = (msg: ChatMessage): string => {
      const date = new Date(msg.date);
      switch (mode) {
        case "weekday":
          const dayIndex = date.getDay(); // 0 (Sunday) to 6 (Saturday)
          return [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ][(dayIndex + 6) % 7];
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

    // Aggregiere Nachrichten nach Sender und Kategorie
    const dataMap: { [sender: string]: { [category: string]: number } } = {};

    messages.forEach((msg: ChatMessage) => {
      if (!msg.isUsed) return;

      const sender = msg.sender;
      const category = getCategory(msg);

      if (!dataMap[sender]) {
        dataMap[sender] = {};
        categories.forEach((cat) => {
          dataMap[sender][cat] = 0;
        });
      }

      if (dataMap[sender][category] !== undefined) {
        dataMap[sender][category] += 1;
      } else {
        dataMap[sender][category] = 1;
      }
    });

    // Konvertiere das Map in ein Array für D3
    let result: AggregatedData[] = Object.keys(dataMap).map((sender) => ({
      sender,
      values: categories.map((category) => ({
        category,
        count: dataMap[sender][category],
      })),
    }));

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
  }, [messages, mode, showPercentage]);

  // Extrahiere die Sender für die Legende
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  useEffect(() => {
    if (messages.length === 0) {
      setMode("hour"); // Standardmodus
      setShowPercentage(false); // Prozente zurücksetzen
    }
  }, [messages]);

  useEffect(() => {
    console.log("Is Uploading changed");
    console.log(isUploading);
  }, [isUploading]);

  // Definiere die Farbschemen basierend auf den Sendern
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string, string>(d3.schemeCategory10).domain(senders);
  }, [senders]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    // D3 Diagramm erstellen
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 10, right: 10, bottom: 110, left: 40 }; // Beibehaltung der Ränder
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Kategorien basierend auf dem Modus
    let categories: string[] = [];
    switch (mode) {
      case "weekday":
        categories = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        break;
      case "hour":
        categories = Array.from({ length: 24 }, (_, i) => i.toString());
        break;
      case "month":
        categories = [
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
        break;
      default:
        categories = [];
    }

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(categories)
      .range([0, innerWidth])
      .padding(0.5);

    const yMax = showPercentage
      ? d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.percentage)) ||
        100
      : d3.max(aggregatedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Achsen
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    // Linien-Generator mit Glättung
    const line = d3
      .line<{ category: string; count: number; percentage?: number }>()
      .x((d) => xScale(d.category) as number)
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Check if chart-group exists
    let chart = svg.select<SVGGElement>(".chart-group");

    if (chart.empty()) {
      // Create chart-group
      chart = svg
        .append("g")
        .attr("class", "chart-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Append X-Achse
      chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

      // Append Y-Achse
      chart
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px");

      // Append initial lines
      chart
        .selectAll<SVGPathElement, AggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", (d) => colorScale(d.sender))
        .attr("stroke-width", 3)
        .attr("d", (d) => line(d.values) as string)
        .attr("stroke-dasharray", function (this: SVGPathElement) {
          const totalLength = this.getTotalLength();
          return `${totalLength} ${totalLength}`;
        })
        .attr("stroke-dashoffset", function (this: SVGPathElement) {
          return this.getTotalLength();
        })
        .transition()
        .duration(2000)
        .ease(d3.easeCubic)
        .attr("stroke-dashoffset", 0);
    } else {
      // Update axes with transitions
      chart
        .select<SVGGElement>(".x-axis")
        .transition()
        .duration(1000)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

      chart
        .select<SVGGElement>(".y-axis")
        .transition()
        .duration(1000)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px");

      // Bind Daten
      const lines = chart
        .selectAll<SVGPathElement, AggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender);

      // Enter + Update + Exit mit Transitionen
      lines.join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", (d) => colorScale(d.sender))
            .attr("stroke-width", 3)
            .attr("d", (d) => line(d.values) as string)
            .attr("stroke-dasharray", function (this: SVGPathElement) {
              const totalLength = this.getTotalLength();
              return `${totalLength} ${totalLength}`;
            })
            .attr("stroke-dashoffset", function (this: SVGPathElement) {
              return this.getTotalLength();
            })
            .transition()
            .duration(2000)
            .ease(d3.easeCubic)
            .attr("stroke-dashoffset", 0),
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
    }
  }, [aggregatedData, dimensions, colorScale, mode, showPercentage]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[800px] md:basis-[800px] flex-grow p-4 h-96 flex flex-col`}
    >
      {/* Buttons and switch in one row */}
      <div className="flex items-center justify-between mb-2">
        {/* Buttons for different modes */}
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded ${
              mode === "weekday"
                ? "bg-blue-500 text-white"
                : darkMode
                ? "bg-gray-700 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setMode("weekday")}
          >
            Weekday
          </button>
          <button
            className={`px-3 py-1 rounded ${
              mode === "hour"
                ? "bg-blue-500 text-white"
                : darkMode
                ? "bg-gray-700 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setMode("hour")}
          >
            Hour
          </button>
          <button
            className={`px-3 py-1 rounded ${
              mode === "month"
                ? "bg-blue-500 text-white"
                : darkMode
                ? "bg-gray-700 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setMode("month")}
          >
            Month
          </button>
        </div>

        {/* Toggle for Absolute Numbers / Percentages */}
        <div className="flex items-center">
          <label className="flex items-center space-x-2">
            <span
              className={`text-sm ${darkMode ? "text-white" : "text-gray-700"}`}
            >
              Absolute Numbers
            </span>
            <input
              type="checkbox"
              checked={showPercentage}
              onChange={() => setShowPercentage(!showPercentage)}
              className="toggle-checkbox"
            />
            <span
              className={`text-sm ${darkMode ? "text-white" : "text-gray-700"}`}
            >
              Percentages
            </span>
          </label>
        </div>
      </div>

      {/* Legend above the chart */}
      <div className="flex flex-wrap items-center mb-2">
        {senders.map((sender) => (
          <div key={sender} className="flex items-center mr-4 mb-2">
            <div
              className="w-4 h-4 mr-1"
              style={{ backgroundColor: colorScale(sender) }}
            ></div>
            <span className="text-sm text-gray-700">{sender}</span>
          </div>
        ))}
      </div>

      {/* SVG for the chart */}
      <svg ref={svgRef} className="w-full flex-grow"></svg>
    </div>
  );
};

export default Plot1;
