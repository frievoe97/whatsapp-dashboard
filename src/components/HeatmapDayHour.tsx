import React, { useEffect, useRef, useMemo } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

const Heatmap: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const aggregatedData = useMemo(() => {
    const dataMap: { [day: string]: { [hour: string]: number } } = {};
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const hours = Array.from({ length: 24 }, (_, i) => i.toString());

    days.forEach((day) => {
      dataMap[day] = {};
      hours.forEach((hour) => {
        dataMap[day][hour] = 0;
      });
    });

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const date = new Date(msg.date);
      const day = days[(date.getDay() + 6) % 7];
      const hour = date.getHours().toString();
      dataMap[day][hour] += 1;
    });

    return days.flatMap((day) =>
      hours.map((hour) => ({
        day,
        hour: parseInt(hour, 10),
        count: dataMap[day][hour],
      }))
    );
  }, [messages]);

  useEffect(() => {
    console.log("Dimensions", dimensions);
  }, [dimensions]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 0, right: 20, bottom: 80, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(d3.range(24).map(String))
      .range([0, innerWidth])
      .padding(0.05);
    const yScale = d3
      .scaleBand()
      .domain(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])

      .range([0, innerHeight])
      .padding(0.05);

    const customInterpolateOrRd = (t: number) =>
      d3.interpolateOrRd(t * 0.8 + 0.08);

    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : customInterpolateOrRd)
      .domain([0, d3.max(aggregatedData, (d) => d.count) || 1]);

    g.selectAll(".cell")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.hour.toString()) || 0)
      .attr("y", (d) => yScale(d.day) || 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.count));

    g.append("g")
      .call(d3.axisBottom(xScale).tickSize(0))
      .attr("transform", `translate(0, ${innerHeight})`)
      .selectAll("text")
      .style("display", (_, i) =>
        width < 768 && i % 2 !== 0 ? "none" : "block"
      )
      .style("font-size", "14px"); // Erhöhe Schriftgröße auf 14px

    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .selectAll("text")
      .style("font-size", "14px");
  }, [aggregatedData, dimensions, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[500px] md:max-w-[3000px] p-4 flex min-h-96 flex-col`}
    >
      <h2 className="text-lg font-semibold mb-4">Messages By Hour & Day</h2>
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

export default Heatmap;
