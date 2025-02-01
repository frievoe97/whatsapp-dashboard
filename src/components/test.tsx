// src/components/Plot6.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";
import { Maximize2, Minimize2 } from "lucide-react";

interface DailyMessages {
  date: Date;
  count: number;
}

const Plot6: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const [expanded, setExpanded] = useState(false);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear();
    return currentYear;
  });

  const availableYears: number[] = useMemo(() => {
    const yearsSet = new Set<number>();
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const date = new Date(msg.date);
      if (!isNaN(date.getTime())) {
        yearsSet.add(date.getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [messages]);

  const dailyMessages: DailyMessages[] = useMemo(() => {
    const dateMap: { [date: string]: number } = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const date = new Date(msg.date);
      if (date.getFullYear() !== selectedYear) return;
      const key = d3.timeFormat("%Y-%m-%d")(date);
      dateMap[key] = (dateMap[key] || 0) + 1;
    });

    const startDate = d3.timeYear(new Date(selectedYear, 0, 1));
    const endDate = d3.timeYear.offset(startDate, 1);
    const allDates: DailyMessages[] = [];
    let currentDate = startDate;

    while (currentDate < endDate) {
      const key = d3.timeFormat("%Y-%m-%d")(currentDate);
      allDates.push({
        date: new Date(currentDate),
        count: dateMap[key] || 0,
      });
      currentDate = d3.timeDay.offset(currentDate, 1);
    }

    return allDates;
  }, [messages, selectedYear]);

  // Überprüfe, ob mindestens ein Tag Daten hat
  const hasData = useMemo(
    () => dailyMessages.some((d) => d.count > 0),
    [dailyMessages]
  );

  // Debugging: Überprüfe den Wert von hasData
  useEffect(() => {
    console.log(`Selected Year: ${selectedYear}, Has Data: ${hasData}`);
  }, [selectedYear, hasData]);

  // Neuer useEffect: Dispatch eines Resize-Events, nachdem die Daten geladen wurden
  useEffect(() => {
    if (!isUploading && containerRef.current) {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  }, [isUploading, messages]);

  const maxCount = useMemo(() => {
    return d3.max(dailyMessages, (d) => d.count) || 0;
  }, [dailyMessages]);

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
        .style("opacity", 0)
        .style("background", darkMode ? "#333" : "#fff")
        .style("color", darkMode ? "#fff" : "#000")
        .style("display", "block"); // Sicherstellen, dass es da ist
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>(".tooltip")
      .style("background", darkMode ? "#333" : "#fff")
      .style("color", darkMode ? "#fff" : "#000");
  }, [darkMode]);

  useEffect(() => {
    const heatmapElement = document.getElementById("heatmap-plot");
    if (!heatmapElement || !containerRef.current) return;

    const tooltip = d3
      .select(containerRef.current)
      .select<HTMLDivElement>(".tooltip");

    const handleMouseMove = (event: MouseEvent) => {
      const [mx, my] = [event.pageX, event.pageY];

      // Berechne das nächstgelegene Datum & Nachrichtenanzahl
      const bisectDate = d3.bisector((d: DailyMessages) => d.date).left;
      const xScale = d3
        .scaleTime()
        .domain(d3.extent(dailyMessages, (d) => d.date) as [Date, Date])
        .range([0, 100]); // Dummy-Werte für Range
      const x0 = xScale.invert(mx);
      const i = bisectDate(dailyMessages, x0);
      const d0 = dailyMessages[i - 1];
      const d1 = dailyMessages[i];
      const nearestDate =
        !d0 ||
        (d1 &&
          x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime())
          ? d1
          : d0;

      if (nearestDate) {
        tooltip
          .style("left", `${mx + 15}px`)
          .style("top", `${my - 10}px`)
          .style("display", "block")
          .html(
            `<strong>${d3.timeFormat("%d.%m.%Y")(
              nearestDate.date
            )}</strong><br/>Nachrichten: ${nearestDate.count}`
          );
      }
    };

    const handleMouseLeave = () => {
      tooltip.style("display", "none");
    };

    heatmapElement.addEventListener("mousemove", handleMouseMove);
    heatmapElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      heatmapElement.removeEventListener("mousemove", handleMouseMove);
      heatmapElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [dailyMessages]);

  useEffect(() => {
    if (!dimensions || !hasData) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // === NEU: Berechne die Höhe der zusätzlichen Elemente ===
    const titleEl = document.getElementById("heatmap-title");
    const yearSelectEl = document.getElementById("year-select");
    const titleHeight = titleEl ? titleEl.offsetHeight : 0;
    const yearSelectHeight = yearSelectEl ? yearSelectEl.offsetHeight : 0;
    const extraMargin = 10; // optionaler Puffer in Pixeln
    const adjustedHeight =
      height - titleHeight - yearSelectHeight - extraMargin;
    // ============================================================

    const padding = { top: 50, right: 40, bottom: 80, left: 40 };

    // Berechne verfügbare Breite und Höhe anhand der adjustierten Höhe:
    const availableWidth = width - padding.left - padding.right;
    const availableHeight = adjustedHeight - padding.top - padding.bottom - 30;

    // Beispielsweise für den Jahresanfang und Wochenberechnung:
    const startOfYear = d3.timeYear(new Date(selectedYear, 0, 1));
    const endOfYear = d3.timeYear.offset(startOfYear, 1);
    const weeks = d3.timeWeeks(startOfYear, endOfYear);
    const numberOfWeeks = weeks.length;

    // Berechne die Zellengrößen:
    const cellSizeWidth = availableWidth / numberOfWeeks - 2;
    const cellSizeHeight = availableHeight / 7 - 2;
    const cellSize = Math.min(cellSizeWidth, cellSizeHeight);

    // Farbskala
    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : d3.interpolateOrRd)
      .domain([0, maxCount]);

    // Bereite das SVG vor:
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    console.log("Drawing Heatmap...");
    console.log("Dimensions:", dimensions);

    const g = svg
      .append("g")
      .attr("transform", `translate(${padding.left}, ${padding.top})`);

    // Entferne vorhandenes Tooltip-Element (falls vorhanden) und erstelle ein neues
    const tooltip = d3.select(containerRef.current).select(".tooltip");
    tooltip.remove();

    const newTooltip = d3
      .select(containerRef.current)
      .append("div")
      .attr(
        "class",
        `absolute p-2 text-sm opacity-0 transition-opacity duration-200 ${
          darkMode
            ? "bg-gray-700 text-white border-gray-300"
            : "bg-white text-black border-black"
        }`
      )
      .style("pointer-events", "none")
      .attr("class", "tooltip");

    // Zeichne die einzelnen Tage als Rechtecke
    g.selectAll<SVGRectElement, DailyMessages>(".day")
      .data(dailyMessages)
      .enter()
      .append("rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr(
        "x",
        (d) => d3.timeSunday.count(startOfYear, d.date) * (cellSize + 2)
      )
      .attr("y", (d) => d.date.getDay() * (cellSize + 2))
      .attr("fill", (d) =>
        d.count > 0
          ? (colorScale(d.count) as string)
          : darkMode
          ? "#444444"
          : "#ebedf0"
      )
      .on("mouseover", (event, d) => {
        newTooltip
          .style("opacity", 1)
          .html(
            `<strong>${d3.timeFormat("%d.%m.%Y")(
              d.date
            )}</strong><br/>Nachrichten: ${d.count}`
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        newTooltip.style("opacity", 0);
      });

    // Zeichne Monatsnamen
    const months = d3.timeMonths(startOfYear, endOfYear);

    g.selectAll<SVGTextElement, Date>(".month")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "month")
      .attr(
        "x",
        (d: Date) => d3.timeSunday.count(startOfYear, d) * (cellSize + 2)
      )
      .attr("y", -10)
      .text((d) => d3.timeFormat("%b")(d))
      .attr("font-size", "12px")
      .attr("fill", darkMode ? "#ffffff" : "#000000");

    // Zeichne Wochentage
    const daysOfWeek = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

    g.selectAll<SVGTextElement, string>(".weekday")
      .data(daysOfWeek)
      .enter()
      .append("text")
      .attr("class", "weekday")
      .attr("x", -10)
      .attr("y", (_, i) => i * (cellSize + 2) + cellSize / 1.5)
      .text((d) => d)
      .attr("font-size", "12px")
      .attr("fill", darkMode ? "#ffffff" : "#000000")
      .attr("text-anchor", "end");
  }, [
    dailyMessages,
    dimensions,
    maxCount,
    selectedYear,
    darkMode,
    hasData,
    expanded,
  ]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[750px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[1000px]"
      } flex-grow p-4 flex flex-col`}
      style={{
        minHeight: "200px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2
          id="heatmap-title"
          className={`text-lg font-semibold mb-4 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Nachrichten-Heatmap Kalender
        </h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? "text-white" : "text-black"
          }`}
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "transparent", // Kein Hintergrund
            outline: "none", // Kein Fokus-Styling
            boxShadow: "none", // Keine Schatten oder Border beim Klicken/Hovern
            border: "none", // Entfernt jegliche Border
          }}
        >
          {expanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Jahr auswählen */}
      <div id="heatmap-year-select" className="mb-4">
        <div>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`mt-1.5 w-fit border border-[1px] text-sm font-medium outline-none focus:ring-0 appearance-none
    ${
      darkMode
        ? "border-gray-300 bg-black text-white"
        : "border-black bg-white text-black"
    } 
    p-2`}
            style={{
              fontFamily: "Arial, sans-serif",
            }}
          >
            {availableYears.map((year) => (
              <option
                key={year}
                value={year}
                className={
                  darkMode ? "bg-black text-white" : "bg-white text-black"
                }
                style={{
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bedingtes Rendering des Inhalts */}
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : !hasData ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg id="heatmap-plot" ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default Plot6;
