// src/components/Plot6.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

interface DailyMessages {
  date: Date;
  count: number;
}

const Plot6: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

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

  const maxCount = useMemo(() => {
    return d3.max(dailyMessages, (d) => d.count) || 0;
  }, [dailyMessages]);

  useEffect(() => {
    if (!dimensions || !hasData) {
      // Wenn keine Daten vorhanden sind, entferne alle Elemente außer dem Container
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const padding = { top: 50, right: 20, bottom: 80, left: 40 };

    const startOfYear = d3.timeYear(new Date(selectedYear, 0, 1));
    const endOfYear = d3.timeYear.offset(startOfYear, 1);
    const weeks = d3.timeWeeks(startOfYear, endOfYear);
    const numberOfWeeks = weeks.length;

    const availableWidth = width - padding.left - padding.right;
    const availableHeight = height - padding.top - padding.bottom - 30;
    const cellSizeWidth = availableWidth / numberOfWeeks - 2;
    const cellSizeHeight = availableHeight / 7 - 2;
    const cellSize = Math.min(cellSizeWidth, cellSizeHeight);

    const colorScale = d3
      .scaleSequential(d3.interpolateGnBu)
      .domain([0, maxCount]);

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${padding.left}, ${padding.top})`);

    // Entferne die Tooltip-Logik, wenn keine Daten vorhanden sind
    const tooltip = d3.select(containerRef.current).select(".tooltip"); // Verwende eine separate Klasse oder ID

    // Entferne vorhandene Tooltips, um Duplikate zu vermeiden
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
      .attr("class", "tooltip"); // Füge eine separate Klasse hinzu

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

    const daysOfWeek = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

    g.selectAll<SVGTextElement, string>(".weekday")
      .data(daysOfWeek)
      .enter()
      .append("text")
      .attr("class", "weekday")
      .attr("x", -10)
      .attr("y", (d, i) => i * (cellSize + 2) + cellSize / 1.5)
      .text((d) => d)
      .attr("font-size", "12px")
      .attr("fill", darkMode ? "#ffffff" : "#000000")
      .attr("text-anchor", "end");

    // Entferne die Legende vollständig
    // Alles, was mit der Legende zu tun hat, wurde entfernt
  }, [dailyMessages, dimensions, maxCount, selectedYear, darkMode, hasData]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[800px] md:basis-[800px] flex-grow p-4 flex flex-col`}
      style={{ minHeight: "200px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Nachrichten-Heatmap Kalender
      </h2>

      {/* Jahr auswählen */}
      <div className="mb-4">
        <div>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={`mt-1.5 w-full border border-[1px] text-sm font-medium outline-none focus:ring-0 appearance-none
      ${
        darkMode
          ? "border-gray-300 bg-black text-white hover:bg-gray-900"
          : "border-black bg-white text-black hover:bg-gray-200"
      } 
      p-2`}
          >
            {availableYears.map((year) => (
              <option
                key={year}
                value={year}
                className={
                  darkMode ? "bg-black text-white" : "bg-white text-black"
                }
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
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : !hasData ? (
          // "No Data" anzeigen, wenn keine Daten vorhanden sind
          <span className="text-lg">No Data Available</span>
        ) : (
          // Diagramm anzeigen, wenn Daten vorhanden sind
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default Plot6;
