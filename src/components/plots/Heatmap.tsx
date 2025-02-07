import { FC, useEffect, useRef, useMemo, useState } from "react";
import Select from "react-select";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext"; // Context providing messages, darkMode, and isUploading
import useResizeObserver from "../../hooks/useResizeObserver"; // Custom hook for tracking container resize
import ClipLoader from "react-spinners/ClipLoader";
import { ChatMessage } from "../../context/ChatContext";

/**
 * HeatmapProps is an empty interface here but can be extended
 * if you need to pass down props to the Heatmap component.
 */
interface HeatmapProps {}

/**
 * This component displays a D3-based heatmap that visualizes
 * the frequency of messages along two categorical axes (e.g., Hour vs. Weekday).
 * It allows the user to switch the categories via react-select dropdowns.
 */
const Heatmap: FC<HeatmapProps> = () => {
  // -------------
  // Context & Hooks
  // -------------
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // This custom hook gives us width/height of the containerRef.
  const dimensions = useResizeObserver(containerRef);

  // -------------
  // State
  // -------------
  // Dropdown selections for X and Y categories
  const [xCategory, setXCategory] = useState<string>("Hour");
  const [yCategory, setYCategory] = useState<string>("Weekday");

  // Tracks if the viewport is considered "desktop" size
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);

  // -------------
  // Derived Data
  // -------------
  // Extract all possible 'Year' values from messages, sorted ascending.
  // If no years are found, default to ["2024"] to avoid empty arrays.
  const years = Array.from(
    new Set(
      messages.map((msg: ChatMessage) => new Date(msg.date).getFullYear())
    )
  )
    .sort((a, b) => a - b)
    .map(String);

  /**
   * Available categories and their possible values (in the correct order).
   * For example, "Weekday" has Monday -> Sunday, "Hour" has 0..23, etc.
   * These are used both for the axis labels and for aggregating data.
   */
  const CATEGORIES: Record<string, string[]> = {
    Year: years.length > 0 ? years : ["2024"],
    Month: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    Weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    Hour: Array.from({ length: 24 }, (_, i) => i.toString()), // "0" .. "23"
    Day: Array.from({ length: 31 }, (_, i) => (i + 1).toString()), // "1" .. "31"
  };

  // -------------
  // Data Aggregation
  // -------------
  /**
   * Generates a 2D structure that counts how many messages
   * occur at each [xCategory, yCategory] pair.
   * Then flattens it into an array for D3 rendering.
   */
  const aggregatedData = useMemo(() => {
    // Initialize a nested mapping for counts, e.g. dataMap[x][y] = count
    const dataMap: Record<string, Record<string, number>> = {};

    // Ensure every combination of x and y is present, even if 0
    CATEGORIES[xCategory].forEach((xVal) => {
      dataMap[xVal] = {};
      CATEGORIES[yCategory].forEach((yVal) => {
        dataMap[xVal][yVal] = 0;
      });
    });

    // Populate counts based on existing messages
    messages.forEach((msg: ChatMessage) => {
      if (!msg.isUsed) return; // Skip messages that aren't used

      const date = new Date(msg.date);

      // Extract the correct value for the X axis category
      const xValue = getDateValue(date, xCategory, CATEGORIES[xCategory]);

      // Extract the correct value for the Y axis category
      const yValue = getDateValue(date, yCategory, CATEGORIES[yCategory]);

      if (xValue && yValue) {
        dataMap[xValue][yValue] += 1;
      }
    });

    // Flatten the nested map into an array: [{ x, y, count }, ...]
    return CATEGORIES[xCategory].flatMap((xVal) =>
      CATEGORIES[yCategory].map((yVal) => ({
        x: xVal,
        y: yVal,
        count: dataMap[xVal][yVal],
      }))
    );
  }, [messages, xCategory, yCategory, CATEGORIES]);

  /**
   * Helper function to map a Date object to the string label
   * based on the specified category and valid values.
   *
   * For example, if category = "Month", it returns "Jan" for 0, "Feb" for 1, etc.
   */
  function getDateValue(
    date: Date,
    category: string,
    validValues: string[]
  ): string | undefined {
    switch (category) {
      case "Year":
        return String(date.getFullYear());
      case "Month":
        return validValues[date.getMonth()]; // 0..11
      case "Weekday":
        // Note: JS getDay() = 0 (Sun), 1 (Mon), ... 6 (Sat)
        // Provided array is ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        // so we shift Sunday to the end: (date.getDay() + 6) % 7
        return validValues[(date.getDay() + 6) % 7];
      case "Hour":
        return validValues[date.getHours()]; // 0..23
      case "Day":
        return validValues[date.getDate() - 1]; // 1..31 => index 0..30
      default:
        return undefined;
    }
  }

  // -------------
  // Effects
  // -------------
  /**
   * Whenever the dimensions object updates (container resize)
   * we also update whether the viewport is considered desktop size.
   */
  useEffect(() => {
    if (!dimensions) return;
    setIsDesktop(window.innerWidth >= 768);
  }, [dimensions]);

  /**
   * Render the D3 heatmap whenever:
   * - aggregatedData changes
   * - dimensions change
   * - darkMode changes (affects color scale)
   */
  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Define margins; adjust for smaller screens
    const margin = {
      top: 0,
      right: 0,
      bottom: 70,
      left: window.innerWidth >= 768 ? 30 : 40,
    };

    let innerWidth = width - margin.left - margin.right;
    let innerHeight = height - margin.top - margin.bottom;

    // On very small screens, constrain height if necessary
    if (window.innerWidth < 768 && innerHeight > innerWidth) {
      innerHeight = innerWidth;
    }

    // Clear previous render
    svg.selectAll("*").remove();

    // Create main group for drawing
    const g = svg
      .append("g")
      .style("font-size", "14px")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create X and Y band scales
    const xScale = d3
      .scaleBand()
      .domain(CATEGORIES[xCategory])
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(CATEGORIES[yCategory])
      .range([0, innerHeight])
      .padding(0.05);

    // Determine max count for color domain
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1;

    // Use a color scale that differs based on darkMode (for better contrast)
    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : d3.interpolateOrRd)
      .domain([0, maxCount]);

    // Draw the heatmap rectangles
    g.selectAll(".cell")
      .data(aggregatedData)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d) => xScale(d.x) ?? 0)
      .attr("y", (d) => yScale(d.y) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.count));

    // Determine how many ticks to show on each axis (avoid overcrowding)
    const tickCountX = Math.max(2, Math.floor(innerWidth / 30));
    const tickCountY = Math.max(2, Math.floor(innerHeight / 50));

    // X Axis
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .style("font-size", "14px")
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(0)
          .tickValues(
            xScale
              .domain()
              .filter(
                (_, i) =>
                  i % Math.ceil(xScale.domain().length / tickCountX) === 0
              )
          )
      );

    // Y Axis
    g.append("g")
      .style("font-size", "14px")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(0)
          .tickValues(
            yScale
              .domain()
              .filter(
                (_, i) =>
                  i % Math.ceil(yScale.domain().length / tickCountY) === 0
              )
          )
      );
  }, [aggregatedData, dimensions, darkMode, xCategory, yCategory, CATEGORIES]);

  // -------------
  // React-Select Styles
  // -------------
  /**
   * Shared React-Select styles for both X and Y dropdowns.
   * Adjusts colors, sizing, and layout for better integration with Tailwind & dark mode.
   */
  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
      display: "flex",
      justifyContent: "space-between",
      marginLeft: "4px",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "0px",
      flex: "1 1 auto",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: "6px",
      marginLeft: "-5px",
      color: darkMode ? "white" : "black",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: darkMode ? "#333" : "white",
      color: darkMode ? "white" : "black",
      boxShadow: "none",
      width: "auto",
      minWidth: "fit-content",
      border: darkMode ? "1px solid white" : "1px solid black",
      borderRadius: "0",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? darkMode
          ? "#777"
          : "#ddd"
        : isDesktop && state.isFocused && state.selectProps.menuIsOpen
        ? darkMode
          ? "#555"
          : "grey"
        : darkMode
        ? "#333"
        : "white",
      color: darkMode ? "white" : "black",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: darkMode ? "white" : "black",
    }),
  };

  // -------------
  // Render
  // -------------
  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full p-4 pl-0 md:pl-4 flex min-h-[400px] md:min-h-[400px] flex-col`}
    >
      {/* Title and Category Selectors */}
      <h2 className="text-lg font-semibold mb-4 flex items-center space-x-0 pl-4 md:pl-0">
        <span>Messages By</span>

        {/* X-Category Select */}
        <Select
          value={{ value: xCategory, label: xCategory }}
          onChange={(selected) => setXCategory(selected?.value || "Weekday")}
          options={Object.keys(CATEGORIES)
            .filter((cat) => cat !== yCategory)
            .map((cat) => ({ value: cat, label: cat }))}
          isSearchable={false}
          styles={customSelectStyles}
        />

        <span>&</span>

        {/* Y-Category Select */}
        <Select
          value={{ value: yCategory, label: yCategory }}
          onChange={(selected) => setYCategory(selected?.value || "Weekday")}
          isSearchable={false}
          options={Object.keys(CATEGORIES)
            .filter((cat) => cat !== xCategory)
            .map((cat) => ({ value: cat, label: cat }))}
          styles={customSelectStyles}
        />
      </h2>

      {/* Heatmap Body (Spinner or "No Data" or the Heatmap itself) */}
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
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default Heatmap;
