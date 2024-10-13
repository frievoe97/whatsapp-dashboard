// src/components/Plot2.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../context/ChatContext";
import useResizeObserver from "../hooks/useResizeObserver";
import Switch from "react-switch";
import "./Plot1.css"; // Importiere die CSS-Datei
import ClipLoader from "react-spinners/ClipLoader";

interface TimeAggregatedData {
  sender: string;
  values: Array<{
    date: Date;
    count: number;
    percentage?: number;
  }>;
}

type Mode = "year" | "month"; // Entfernt "day"

const Plot2: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // State für Aggregationsmodus und Darstellung
  const [mode, setMode] = useState<Mode>("month"); // Initial auf "month" setzen
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  // Definiere die Kategorien basierend auf dem Modus
  const categories: string[] = useMemo(() => {
    switch (mode) {
      case "year":
        return Array.from(
          new Set(
            messages.map((msg) => new Date(msg.date).getFullYear().toString())
          )
        ).sort();
      case "month":
        return Array.from(
          new Set(
            messages.map((msg) => d3.timeFormat("%Y-%m")(new Date(msg.date)))
          )
        ).sort();
      default:
        return [];
    }
  }, [mode, messages]);

  // Aggregiere Daten basierend auf dem aktuellen Modus und der Darstellung
  const aggregatedData: TimeAggregatedData[] = useMemo(() => {
    if (messages.length === 0) return [];

    // Funktion zur Extraktion der Kategorie basierend auf dem Modus
    const getCategory = (msg: ChatMessage): string => {
      const date = new Date(msg.date);
      switch (mode) {
        case "year":
          return date.getFullYear().toString();
        case "month":
          return d3.timeFormat("%Y-%m")(date);
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
    let result: TimeAggregatedData[] = Object.keys(dataMap).map((sender) => ({
      sender,
      values: categories.map((category) => ({
        date:
          mode === "year"
            ? new Date(`${category}-01-01`)
            : new Date(`${category}-01`), // Da "day" entfernt wurde
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
  }, [messages, mode, showPercentage, categories]);

  // Extrahiere die Sender für die Legende
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  // Definiere das Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string, string>(d3.schemePaired).domain(senders);
  }, [senders]);

  useEffect(() => {
    if (messages.length === 0) {
      setMode("month"); // Standardmodus
      setShowPercentage(false); // Prozente zurücksetzen
    }
  }, [messages]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    // D3 Diagramm erstellen
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 10, right: 20, bottom: 110, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Sammle alle Datenpunkte für die X-Achse
    const allDates = aggregatedData.flatMap((d) => d.values.map((v) => v.date));
    const xExtent = d3.extent(allDates);

    if (!xExtent[0] || !xExtent[1]) return; // Sicherstellen, dass xExtent definiert ist

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(xExtent as [Date, Date])
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

    // Dynamische Berechnung der maximalen Anzahl der Ticks basierend auf der Breite
    const maxTicks = Math.floor(innerWidth / 80); // 80px pro Tick als Beispiel
    const xAxis = d3.axisBottom(xScale).ticks(maxTicks);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    // Linien-Generator mit Glättung und defined-Funktion
    const line = d3
      .line<{ date: Date; count: number; percentage?: number }>()
      .defined((d) => d.count !== null && d.count !== undefined)
      .x((d) => xScale(d.date))
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

      // X-Grid
      chart
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

      // Y-Grid
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

      // Append X-Achse
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

      // Append Y-Achse
      chart
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Linien hinzufügen
      chart
        .selectAll<SVGPathElement, TimeAggregatedData>(".line")
        .data(aggregatedData, (d) => d.sender)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", (d) => colorScale(d.sender))
        .attr("stroke-width", 3)
        .attr("d", (d) => {
          // Initialer Pfad mit y auf innerHeight (vom Boden kommend)
          const initialValues = d.values.map((v) => ({
            ...v,
            y: innerHeight,
          }));
          const initialLine = d3
            .line<{
              date: Date;
              count: number;
              percentage?: number;
            }>()
            .x((d) => xScale(d.date))
            .y(() => innerHeight)
            .curve(d3.curveMonotoneX);
          return initialLine(initialValues) as string;
        })
        .transition()
        .duration(2000)
        .ease(d3.easeCubic)
        .attr("d", (d) => line(d.values) as string);
    } else {
      // Update Grid
      chart
        .select<SVGGElement>(".x-grid")
        .transition()
        .duration(1000)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => "")
        )
        .selectAll("line")
        .attr("stroke", darkMode ? "#a0a0a0" : "#e0e0e0");

      chart
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

      // Entferne die letzte Grid-Linie (rechte Kante) durch Filterung
      chart
        .selectAll(".x-grid line")
        .filter((d, i, nodes) => {
          return i === nodes.length - 1;
        })
        .attr("stroke", "none"); // oder setze auf grau, wenn du sie behalten möchtest

      // Update Achsen mit Transitionen
      chart
        .select<SVGGElement>(".x-axis")
        .transition()
        .duration(1000)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      chart
        .select<SVGGElement>(".y-axis")
        .transition()
        .duration(1000)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Bind Daten
      const lines = chart
        .selectAll<SVGPathElement, TimeAggregatedData>(".line")
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
            .attr("d", (d) => {
              // Initialer Pfad mit y auf innerHeight (vom Boden kommend)
              const initialValues = d.values.map((v) => ({
                ...v,
                y: innerHeight,
              }));
              const initialLine = d3
                .line<{
                  date: Date;
                  count: number;
                  percentage?: number;
                }>()
                .x((d) => xScale(d.date))
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

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[800px] md:basis-[800px] flex-grow p-4 h-96 flex flex-col`}
    >
      {/* Buttons und Switch in einer Zeile */}
      <div className="flex items-center justify-between mb-2">
        {/* Buttons für verschiedene Modi */}
        <div className="flex space-x-2 mt-0">
          {/* <button
            className={`px-3 py-1 rounded-none ${
              mode === "year"
                ? "bg-black text-white"
                : darkMode
                ? "bg-gray-700 text-white border-[1px] border-white"
                : "bg-white text-gray-700 border-[1px] border-black"
            }`}
            onClick={() => setMode("year")}
          >
            Year
          </button> */}
          {/* <button
            className={`px-3 py-1 rounded-none ${
              mode === "month"
                ? "bg-black text-white"
                : darkMode
                ? "bg-gray-700 text-white border-[1px] border-white"
                : "bg-white text-gray-700 border-[1px] border-black"
            }`}
            onClick={() => setMode("month")}
          >
            Month
          </button> */}

          <button
            className={`px-3 py-1 rounded-none ${
              mode === "year"
                ? darkMode
                  ? "bg-white text-black border border-white hover:border-white"
                  : "bg-black text-white border-none"
                : darkMode
                ? "bg-gray-700 text-white border border-white hover:border-white"
                : "bg-white text-gray-700 border border-black hover:border-black"
            }`}
            onClick={() => setMode("year")}
          >
            Year
          </button>

          <button
            className={`px-3 py-1 rounded-none ${
              mode === "month"
                ? darkMode
                  ? "bg-white text-black border border-white hover:border-white"
                  : "bg-black text-white border-none"
                : darkMode
                ? "bg-gray-700 text-white border border-white hover:border-white"
                : "bg-white text-gray-700 border border-black hover:border-black"
            }`}
            onClick={() => setMode("month")}
          >
            Month
          </button>
        </div>

        {/* Toggle für Absolute Numbers / Percentages */}
        <div className="flex items-center">
          <span
            className={`text-sm ${
              darkMode ? "text-white" : "text-gray-700"
            } mr-2`}
          >
            Absolute Numbers
          </span>
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
            boxShadow="none" // Schatten entfernen
            activeBoxShadow="none" // Aktive Schatten entfernen
            className="custom-switch" // Benutzerdefinierte Klasse hinzufügen
          />
          <span
            className={`text-sm ${
              darkMode ? "text-white" : "text-gray-700"
            } ml-2`}
          >
            Percentages
          </span>
        </div>
      </div>

      {/* Legende über dem Diagramm */}
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

      {/* Bedingtes Rendering des Inhalts */}
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : messages.length === 0 ? (
          // "No Data" anzeigen, wenn keine Daten vorhanden sind
          <span className="text-lg">No Data Available</span>
        ) : (
          // Diagramm anzeigen, wenn Daten vorhanden sind
          <svg ref={svgRef} className="h-full w-full flex-grow"></svg>
        )}
      </div>
    </div>
  );
};

export default Plot2;
