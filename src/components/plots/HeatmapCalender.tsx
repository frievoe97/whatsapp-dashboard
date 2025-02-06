/*

import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

const HeatmapCalendar: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(messages.map((msg) => new Date(msg.date).getFullYear()))
    );
    return years.sort((a, b) => a - b);
  }, [messages]);

  const aggregatedData = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const dateMap = new Map();

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dateMap.set(d.toISOString().split("T")[0], 0);
    }

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const dateObj = new Date(msg.date);
      if (dateObj.getFullYear() !== selectedYear) return;
      const date = dateObj.toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap, ([date, count]) => ({ date, count }));
  }, [messages, selectedYear]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const timeScale = d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([0, innerWidth]);

    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateBlues : d3.interpolateReds)
      .domain([0, d3.max(aggregatedData, (d) => d.count) || 1]);

    const cellSize = innerHeight / 7;
    const firstDayOffset = startDate.getDay();

    g.selectAll(".day-cell")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("x", (d) => timeScale(new Date(d.date)))
      .attr(
        "y",
        (d) => ((new Date(d.date).getDay() - firstDayOffset + 7) % 7) * cellSize
      )
      .attr("width", cellSize - 2)
      .attr("height", cellSize - 2)
      .attr("fill", (d) => colorScale(d.count));

    const xAxis = d3
      .axisBottom(timeScale)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat("%b"));
    g.append("g").attr("transform", `translate(0, ${innerHeight})`).call(xAxis);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const yScale = d3.scaleBand().domain(weekDays).range([0, innerHeight]);
    const yAxis = d3.axisLeft(yScale);
    g.append("g").call(yAxis);
  }, [aggregatedData, dimensions, darkMode, selectedYear]);

  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full p-4 flex min-h-96 flex-col`}
    >
      <h2 className="text-lg font-semibold mb-4">Messages Calendar Heatmap</h2>
      <div>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={`mt-1.5 w-fit border text-sm font-medium outline-none focus:ring-0 appearance-none p-2 ${
            darkMode
              ? "border-gray-300 bg-black text-white"
              : "border-black bg-white text-black"
          }`}
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
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default HeatmapCalendar;

*/
