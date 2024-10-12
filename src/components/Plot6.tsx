// src/components/Plot6.tsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";

interface DailyMessages {
  date: Date;
  count: number;
}

const Plot6: React.FC = () => {
  const { messages, darkMode } = useChat();
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

  const maxCount = useMemo(() => {
    return d3.max(dailyMessages, (d) => d.count) || 0;
  }, [dailyMessages]);

  useEffect(() => {
    if (!dimensions) {
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
      .scaleSequential(d3.interpolateYlGnBu)
      .domain([0, maxCount]);

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${padding.left}, ${padding.top})`);

    const tooltip = d3
      .select(containerRef.current)
      .append("div")
      .attr(
        "class",
        `absolute p-2 text-sm opacity-0 transition-opacity duration-200 ${
          darkMode
            ? "bg-gray-700 text-white border-white"
            : "bg-white text-black border-black"
        }`
      )
      .style("pointer-events", "none");

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
        tooltip
          .style("opacity", 1)
          .html(
            `
            <strong>${d3.timeFormat("%d.%m.%Y")(d.date)}</strong><br/>
            Nachrichten: ${d.count}
          `
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
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
      .attr("font-size", "10px")
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
      .attr("font-size", "10px")
      .attr("fill", darkMode ? "#ffffff" : "#000000")
      .attr("text-anchor", "end");

    const legendWidth = 100;
    const legendHeight = 10;

    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${padding.left}, ${height - padding.bottom + 10})`
      );

    const defs = svg.append("defs");

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient");

    linearGradient
      .selectAll<SVGStopElement, { offset: string; color: string }>("stop")
      .data([
        { offset: "0%", color: d3.interpolateYlGnBu(0) },
        { offset: "100%", color: d3.interpolateYlGnBu(1) },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format("d"));

    legend
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("fill", darkMode ? "#ffffff" : "#000000");
  }, [dailyMessages, dimensions, maxCount, selectedYear, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } min-w-[800px] basis-[800px] flex-grow p-4 h-96 flex flex-col`}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Nachrichten-Heatmap Kalender
      </h2>
      <div className="mb-4">
        <label
          htmlFor="year-select"
          className={`mr-2 ${darkMode ? "text-white" : "text-black"}`}
        >
          Wähle ein Jahr:
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={`p-1 border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default Plot6;
