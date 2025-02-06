import React, { useEffect, useRef, useMemo, useState } from "react";
import Select from "react-select";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

const Heatmap: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const [xCategory, setXCategory] = useState("Month");
  const [yCategory, setYCategory] = useState("Weekday");

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  const years = Array.from(
    new Set(messages.map((msg) => new Date(msg.date).getFullYear()))
  )
    .sort((a, b) => a - b)
    .map(String);

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
    Hour: Array.from({ length: 24 }, (_, i) => i.toString()),
    Day: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
  };

  const aggregatedData = useMemo(() => {
    const dataMap: { [x: string]: { [y: string]: number } } = {};
    CATEGORIES[xCategory].forEach((x) => {
      dataMap[x] = {};
      CATEGORIES[yCategory].forEach((y) => {
        dataMap[x][y] = 0;
      });
    });

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const date = new Date(msg.date);
      const xValue =
        xCategory === "Year"
          ? String(date.getFullYear())
          : CATEGORIES[xCategory][
              xCategory === "Month"
                ? date.getMonth()
                : xCategory === "Weekday"
                ? (date.getDay() + 6) % 7
                : xCategory === "Hour"
                ? date.getHours()
                : date.getDate() - 1
            ];

      const yValue =
        yCategory === "Year"
          ? String(date.getFullYear())
          : CATEGORIES[yCategory][
              yCategory === "Month"
                ? date.getMonth()
                : yCategory === "Weekday"
                ? (date.getDay() + 6) % 7
                : yCategory === "Hour"
                ? date.getHours()
                : date.getDate() - 1
            ];

      if (xValue && yValue) dataMap[xValue][yValue] += 1;
    });

    return CATEGORIES[xCategory].flatMap((x) =>
      CATEGORIES[yCategory].map((y) => ({ x, y, count: dataMap[x][y] }))
    );
  }, [messages, xCategory, yCategory]);

  useEffect(() => {
    if (dimensions) {
      setIsDesktop(window.innerWidth >= 768);
    }
  }, [dimensions]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    let margin = {
      top: 0,
      right: 0,
      bottom: 70,
      left: 40,
    };

    if (window.innerWidth >= 768) {
      margin.left = 30;
    }

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .style("font-size", "14px")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
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
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1;
    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : d3.interpolateOrRd)
      .domain([0, maxCount]);

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
              .filter((_, i) => i % Math.ceil(xScale.domain().length / 5) === 0)
          )
      );

    g.append("g")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(0)
          .tickValues(
            yScale
              .domain()
              .filter((_, i) => i % Math.ceil(yScale.domain().length / 5) === 0)
          )
      )
      .style("font-size", "14px");
  }, [aggregatedData, dimensions, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full p-4 pl-0 md:pl-4 flex min-h-[600px] md:min-h-[600px] flex-col`}
    >
      <h2 className="text-lg font-semibold mb-4 flex items-center space-x-0 pl-4 md:pl-0">
        <span>Messages By</span>
        <Select
          value={{ value: xCategory, label: xCategory }}
          onChange={(selected) => setXCategory(selected?.value || "Weekday")}
          options={Object.keys(CATEGORIES)
            .filter((cat) => cat !== yCategory)
            .map((cat) => ({ value: cat, label: cat }))}
          styles={{
            control: (provided) => ({
              ...provided,
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
              display: "flex",
              justifyContent: "space-between",
              marginLeft: "4px",
            }),
            valueContainer: (provided) => ({
              ...provided,
              padding: "0px",
              flex: "1 1 auto",
            }),
            indicatorSeparator: () => ({
              display: "none",
            }),
            dropdownIndicator: (provided) => ({
              ...provided,
              padding: "6px",
              marginLeft: "-5px",
              color: darkMode ? "white" : "black",
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: darkMode ? "#333" : "white",
              color: darkMode ? "white" : "black",
              boxShadow: "none",
              width: "auto",
              minWidth: "fit-content",
              border: darkMode ? "1px solid white" : "1px solid black",
              borderRadius: "0",
            }),
            option: (provided, state) => ({
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

            singleValue: (provided) => ({
              ...provided,
              color: darkMode ? "white" : "black",
            }),
          }}
        />

        <span>&</span>
        <Select
          value={{ value: yCategory, label: yCategory }}
          onChange={(selected) => setYCategory(selected?.value || "Weekday")}
          options={Object.keys(CATEGORIES)
            .filter((cat) => cat !== xCategory)
            .map((cat) => ({ value: cat, label: cat }))}
          styles={{
            control: (provided) => ({
              ...provided,
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
              display: "flex",
              justifyContent: "space-between",
              marginLeft: "4px",
            }),
            valueContainer: (provided) => ({
              ...provided,
              padding: "0px",
              flex: "1 1 auto",
            }),
            indicatorSeparator: () => ({
              display: "none",
            }),
            dropdownIndicator: (provided) => ({
              ...provided,
              padding: "6px",
              marginLeft: "-5px",
              color: darkMode ? "white" : "black",
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: darkMode ? "#333" : "white",
              color: darkMode ? "white" : "black",
              boxShadow: "none",
              width: "auto",
              minWidth: "fit-content",
              border: darkMode ? "1px solid white" : "1px solid black",
              borderRadius: "0",
            }),
            option: (provided, state) => ({
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

            singleValue: (provided) => ({
              ...provided,
              color: darkMode ? "white" : "black",
            }),
          }}
        />
      </h2>

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
