// src/components/Plot2.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { ChatMessage } from "../context/ChatContext";
import useResizeObserver from "../hooks/useResizeObserver";
import Switch from "react-switch";
import "./Plot1.css"; // Importiere die CSS-Datei
import ClipLoader from "react-spinners/ClipLoader";
import { Hash, Percent, Maximize2, Minimize2 } from "lucide-react";

interface TimeAggregatedData {
  sender: string;
  values: Array<{
    date: Date;
    count: number;
    percentage?: number;
  }>;
}

type Mode = "year" | "month"; // "day" wurde entfernt

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

  const [expanded, setExpanded] = useState(false);

  // Tooltip einmalig erstellen
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
        .style("padding", "6px")
        .style("border", "1px solid #999")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("display", "none");
    }
  }, []);

  // Tooltip-Style aktualisieren bei Dark Mode-Wechsel
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  // State für Aggregationsmodus und Darstellung
  const [mode, setMode] = useState<Mode>("year"); // Initial auf "month" setzen
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

    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Funktion zur Extraktion der Kategorie basierend auf dem Modus
    const getCategory = (msg: ChatMessage): string => {
      const date = new Date(msg.date);
      return mode === "year"
        ? date.getFullYear().toString()
        : d3.timeFormat("%Y-%m")(date);
    };

    // Aggregiere Nachrichten nach Sender und Kategorie
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

    let result: TimeAggregatedData[] = Object.keys(dataMap)
      .map((sender) => ({
        sender,
        total: Object.values(dataMap[sender]).reduce(
          (sum, count) => sum + count,
          0
        ),
        values: categories.map((category) => ({
          date:
            mode === "year"
              ? new Date(parseInt(category), 0, 1)
              : new Date(`${category}-01`),
          count: dataMap[sender][category],
        })),
      }))
      .filter((d) => d.total >= minMessages) // Filtere Sender nach minMessagePercentage
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

  // Extrahiere die Sender für die Legende
  const senders = useMemo(
    () => aggregatedData.map((d) => d.sender),
    [aggregatedData]
  );

  // Definiere das Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  useEffect(() => {
    if (messages.length === 0) {
      setMode("month"); // Standardmodus
      setShowPercentage(false); // Prozente zurücksetzen
    }
  }, [messages]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    if (mode === "year") {
      // Alle einzigartigen Jahre ermitteln
      const uniqueYears = Array.from(
        new Set(
          aggregatedData.flatMap((d) =>
            d.values.map((v) => v.date.getFullYear())
          )
        )
      );

      // Falls weniger als 3 Jahre vorhanden sind, auf "month" umstellen
      if (uniqueYears.length < 3) {
        setMode("month");
        return; // Verhindert unnötige Berechnungen mit dem falschen Mode
      }
    }

    // D3 Diagramm erstellen
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 10, right: 20, bottom: 110, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Sammle alle Datenpunkte für die X-Achse
    const allDates = aggregatedData.flatMap((d) => d.values.map((v) => v.date));

    const fallbackDate = new Date(2000, 0, 1); // Ein sinnvolles Standard-Datum

    let computedStartDate = startDate
      ? mode === "year"
        ? new Date(new Date(startDate).getFullYear(), 0, 1) // Immer 1. Januar setzen
        : new Date(startDate) // Falls "month", bleibt das Datum erhalten
      : d3.min(allDates) || fallbackDate;

    let computedEndDate = endDate
      ? new Date(endDate)
      : d3.max(allDates) || new Date();

    // Filtere Datenpunkte, um sicherzustellen, dass sie nur innerhalb des Zeitraums liegen
    const filteredData = aggregatedData.map((d) => ({
      sender: d.sender,
      values: d.values.filter(
        (v) => v.date >= computedStartDate && v.date <= computedEndDate
      ),
    }));

    // Falls der Modus "month" ist, setze computedStartDate und computedEndDate auf den ersten/letzten existierenden Datenpunkt
    if (mode === "month") {
      const filteredDates = allDates.filter(
        (date) => date >= computedStartDate && date <= computedEndDate
      );

      if (filteredDates.length > 0) {
        computedStartDate = d3.min(filteredDates) || computedStartDate;
        computedEndDate = d3.max(filteredDates) || computedEndDate;
      }
    }

    // Falls keine Daten nach dem Filtern vorhanden sind, nichts rendern
    if (filteredData.every((d) => d.values.length === 0)) return;

    // Aktualisiere die X-Skala
    const xScale = d3
      .scaleTime()
      .domain([
        computedStartDate, // 🟢 Jetzt startet es beim richtigen Jahr/Monat
        computedEndDate,
      ])
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
    const maxTicks = Math.floor(innerWidth / 80);
    const xAxis = d3.axisBottom(xScale).ticks(maxTicks);
    // const yAxis = d3.axisLeft(yScale).ticks(5);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => (showPercentage ? `${d}%` : `${d}`));

    // Linien-Generator
    const line = d3
      .line<{ date: Date; count: number; percentage?: number }>()
      .defined((d) => d.date >= computedStartDate && d.date <= computedEndDate)
      .x((d) => xScale(d.date))
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Hole bzw. erstelle die Chart-Gruppe
    let chart = svg.select<SVGGElement>(".chart-group");

    // Tooltip-Element aus dem Container holen
    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    // Erstelle die horizontale Hilfslinie per join (statt enter/merge)
    const hoverLine = chart
      .selectAll<SVGLineElement, null>("line.hover-line")
      .data([null])
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "hover-line")
          .attr("stroke", "gray")
          .attr("stroke-width", 1)
          .style("opacity", 0)
      );

    // Falls noch keine Chart-Gruppe existiert, erstelle sie und zeichne Achsen, Grids und die Linien
    if (chart.empty()) {
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

      // X-Achse
      chart
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(${margin.left},${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "translate(0,5)")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Y-Achse
      chart
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", darkMode ? "white" : "black");

      // Linien für jeden Sender (mit initialer Animation)
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
          const initialValues = d.values.map((v) => ({
            ...v,
            y: innerHeight,
          }));
          const initialLine = d3
            .line<{ date: Date; count: number; percentage?: number }>()
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
      // Wenn die Chart-Gruppe bereits existiert, aktualisiere Grids und Achsen
      chart
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

      chart
        .selectAll(".x-grid line")
        .filter((_, i, nodes) => i === nodes.length - 1)
        .attr("stroke", "none");

      chart
        .select<SVGGElement>(".x-axis")
        .transition()
        .duration(1000)
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(maxTicks))
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

      // Linien aktualisieren
      const lines = chart
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
                .line<{ date: Date; count: number; percentage?: number }>()
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

    // Erstelle bzw. update das Overlay-Rechteck per join (statt enter/merge)
    chart
      .selectAll<SVGRectElement, null>("rect.overlay")
      .data([null])
      .join((enter) => enter.append("rect").attr("class", "overlay"))
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
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

        // Ermittle anhand des Mauszeigers die nächste Datumskategorie
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

        // Erstelle Tooltip-Daten für jeden Sender
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
        hoverLine.style("opacity", 0);
        tooltip.style("display", "none");
      });
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
      {/* Buttons und Switch in einer Zeile */}
      <div className="flex items-center justify-between mb-2">
        {/* Buttons für verschiedene Modi */}
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
        {/* Toggle für Absolute Numbers / Percentages */}
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
      {/* Bedingtes Rendering des Inhalts */}
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
