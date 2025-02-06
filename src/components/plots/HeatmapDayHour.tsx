import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

// Constants for days of the week and hours in a day
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// TypeScript interface for heatmap data entries
interface HeatmapData {
  day: string;
  hour: number;
  count: number;
}

/**
 * Heatmap Component
 *
 * This component visualizes the distribution of chat messages over the days of the week and hours of the day.
 * It uses D3 to render an SVG-based heatmap, with support for dark mode and responsive resizing.
 */
const Heatmap: React.FC = () => {
  // Extract relevant data and settings from the Chat context.
  const { messages, darkMode, isUploading } = useChat();

  // References for the container element (for resize observation) and the SVG element (for D3 rendering)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Obtain container dimensions using a custom resize observer hook
  const dimensions = useResizeObserver(containerRef);

  /**
   * Aggregates the messages into counts per day and hour.
   * It first initializes an empty data structure for all day/hour combinations,
   * then increments counts for each message (if the message is marked as "used").
   */
  const aggregatedData: HeatmapData[] = useMemo(() => {
    // Initialize a mapping for each day and hour with a default count of 0.
    const dataMap: { [day: string]: { [hour: number]: number } } = {};
    DAYS.forEach((day) => {
      dataMap[day] = {};
      HOURS.forEach((hour) => {
        dataMap[day][hour] = 0;
      });
    });

    // Aggregate data from messages
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const date = new Date(msg.date);
      // Adjust getDay() to have Monday as the first day (index 0)
      const dayIndex = (date.getDay() + 6) % 7;
      const day = DAYS[dayIndex];
      const hour = date.getHours();
      dataMap[day][hour] += 1;
    });

    // Flatten the aggregated data into an array format for D3
    const result: HeatmapData[] = [];
    DAYS.forEach((day) => {
      HOURS.forEach((hour) => {
        result.push({
          day,
          hour,
          count: dataMap[day][hour],
        });
      });
    });
    return result;
  }, [messages]);

  /**
   * D3 Rendering Effect
   *
   * This effect is responsible for drawing (or re-drawing) the heatmap whenever the following change:
   * - The aggregated data
   * - The container dimensions (i.e., on resize)
   * - The darkMode flag
   *
   * The SVG is cleared before every render to ensure that previous drawings do not interfere.
   */
  useEffect(() => {
    // Only render if we have dimensions and data
    if (!dimensions || aggregatedData.length === 0) return;

    // Select the SVG element using D3
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Define margins and calculate inner dimensions for the drawing area
    const margin = { top: 0, right: 20, bottom: 80, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear any existing content inside the SVG
    svg.selectAll("*").remove();

    // Append a group element to account for margins
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create scales for the x (hours) and y (days) axes
    const xScale = d3
      .scaleBand<string>()
      .domain(HOURS.map(String))
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand<string>()
      .domain(DAYS)
      .range([0, innerHeight])
      .padding(0.05);

    // Define a custom color interpolation function for light mode.
    // This tweaks the default OrRd interpolator slightly.
    const customInterpolateOrRd = (t: number) =>
      d3.interpolateOrRd(t * 0.8 + 0.08);

    // Define a sequential color scale.
    // Use GnBu for dark mode and the custom OrRd interpolation for light mode.
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1;
    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : customInterpolateOrRd)
      .domain([0, maxCount]);

    // Render each cell (rectangle) of the heatmap
    g.selectAll(".cell")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d) => xScale(d.hour.toString()) ?? 0)
      .attr("y", (d) => yScale(d.day) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.count));

    // Render the x-axis (hours)
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "14px")
      // For smaller screens, hide every other label for clarity
      .style("display", (_, i) =>
        width < 768 && i % 2 !== 0 ? "none" : "block"
      );

    // Render the y-axis (days)
    const yAxis = d3.axisLeft(yScale).tickSize(0);
    g.append("g").call(yAxis).selectAll("text").style("font-size", "14px");
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
          // Display a spinner while data is being uploaded/processed
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedData.length === 0 ? (
          // Inform the user when there is no data to display
          <span className="text-lg">No Data Available</span>
        ) : (
          // Render the SVG container where the heatmap will be drawn
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default Heatmap;
