import { FC, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import * as d3 from "d3";
import ClipLoader from "react-spinners/ClipLoader";
import { useChat } from "../../context/ChatContext";

interface HeatmapData {
  x: string;
  y: string;
  count: number;
}

const Heatmap: FC = () => {
  // Verwende filteredMessages statt messages
  const { filteredMessages, darkMode } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Zustände für die Dropdowns (Achsen-Auswahl)
  const [xCategory, setXCategory] = useState<string>("Hour");
  const [yCategory, setYCategory] = useState<string>("Weekday");

  // Desktop-Erkennung
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ableiten von Jahr-Werten aus filteredMessages
  const years = Array.from(
    new Set(
      filteredMessages.map((msg) => new Date(msg.date).getFullYear().toString())
    )
  )
    .sort((a, b) => +a - +b)
    .map(String);

  // Verfügbare Kategorien (UI bleibt 1:1 gleich)
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

  // Helper: Mappt Date auf Label
  const getDateValue = (
    date: Date,
    category: string,
    validValues: string[]
  ): string | undefined => {
    console.log(date, category, validValues);
    switch (category) {
      case "Year":
        return String(date.getFullYear());
      case "Month":
        return validValues[date.getMonth()];
      case "Weekday":
        return validValues[(date.getDay() + 6) % 7];
      case "Hour":
        return validValues[date.getHours()];
      case "Day":
        return validValues[date.getDate() - 1];
      default:
        return undefined;
    }
  };

  // Aggregation der Daten basierend auf filteredMessages
  const aggregatedData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    CATEGORIES[xCategory].forEach((xVal) => {
      dataMap[xVal] = {};
      CATEGORIES[yCategory].forEach((yVal) => {
        dataMap[xVal][yVal] = 0;
      });
    });
    filteredMessages.forEach((msg) => {
      const date = new Date(msg.date);
      const xValue = getDateValue(date, xCategory, CATEGORIES[xCategory]);
      const yValue = getDateValue(date, yCategory, CATEGORIES[yCategory]);
      if (xValue && yValue) {
        dataMap[xValue][yValue] += 1;
      }
    });
    return CATEGORIES[xCategory].flatMap((xVal) =>
      CATEGORIES[yCategory].map((yVal) => ({
        x: xVal,
        y: yVal,
        count: dataMap[xVal][yVal],
      }))
    );
  }, [filteredMessages, xCategory, yCategory, CATEGORIES]);

  // React-Select Styles
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
    indicatorSeparator: () => ({ display: "none" }),
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

  // Zeichne die Heatmap mit D3
  useEffect(() => {
    if (!aggregatedData.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const width = 500;
    const height = 400;
    const margin = {
      top: 0,
      right: 0,
      bottom: 70,
      left: window.innerWidth >= 768 ? 30 : 40,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
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
    const tickCountX = Math.max(2, Math.floor(innerWidth / 30));
    const tickCountY = Math.max(2, Math.floor(innerHeight / 50));
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
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
    g.append("g").call(
      d3
        .axisLeft(yScale)
        .tickSize(0)
        .tickValues(
          yScale
            .domain()
            .filter(
              (_, i) => i % Math.ceil(yScale.domain().length / tickCountY) === 0
            )
        )
    );
  }, [aggregatedData, darkMode, CATEGORIES, xCategory, yCategory]);

  return (
    <div
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      {/* Header mit den Dropdowns für X- und Y-Achse */}
      <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 pl-4 md:pl-0">
        <span>Messages By</span>
        <Select
          value={{ value: xCategory, label: xCategory }}
          onChange={(selected) => setXCategory(selected?.value || "Hour")}
          options={Object.keys(CATEGORIES)
            .filter((cat) => cat !== yCategory)
            .map((cat) => ({ value: cat, label: cat }))}
          isSearchable={false}
          styles={customSelectStyles}
        />
        <span>&</span>
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

      <div className="flex-grow flex justify-center items-center">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default Heatmap;
