import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";
import { Maximize2, Minimize2 } from "lucide-react";

const properties = [
  { key: "messageCount", label: "Number of Messages" },
  { key: "averageWordsPerMessage", label: "Avg. Words per Message" },
  { key: "medianWordsPerMessage", label: "Median Words per Message" },
  { key: "totalWordsSent", label: "Total Words Sent" },
  { key: "maxWordsInMessage", label: "Max Words in a Message" },
  { key: "activeDays", label: "Active Days" },
  { key: "uniqueWordsCount", label: "Unique Words Count" },
  { key: "averageCharactersPerMessage", label: "Avg. Characters per Message" },
];

const SenderComparisonBarChart: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const dimensions = useResizeObserver(containerRef);
  const [selectedProperty, setSelectedProperty] = useState(properties[0].key);
  const [expanded, setExpanded] = useState(false);

  const MIN_BAR_WIDTH = 80; // Mindestbreite eines Balkens in Pixeln

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const plotWidth =
      document.getElementById("plot-sender-comparison")?.offsetWidth || 0;
    return Math.max(1, Math.floor(plotWidth / MIN_BAR_WIDTH)); // Mindestens 1 Balken pro Seite
  });

  const aggregatedStats = useMemo(() => {
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const stats: Record<
      string,
      {
        messageCount: number;
        totalWordsSent: number;
        wordCounts: number[];
        maxWordsInMessage: number;
        uniqueWords: Set<string>;
        totalCharacters: number;
        activeDays: Set<string>;
      }
    > = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
      if (!stats[sender]) {
        stats[sender] = {
          messageCount: 0,
          totalWordsSent: 0,
          wordCounts: [],
          maxWordsInMessage: 0,
          uniqueWords: new Set(),
          totalCharacters: 0,
          activeDays: new Set(),
        };
      }
      const words = msg.message.split(/\s+/).filter((w) => w.length > 0);
      stats[sender].messageCount++;
      stats[sender].totalWordsSent += words.length;
      stats[sender].wordCounts.push(words.length);
      stats[sender].maxWordsInMessage = Math.max(
        stats[sender].maxWordsInMessage,
        words.length
      );
      words.forEach((word) => stats[sender].uniqueWords.add(word));
      stats[sender].totalCharacters += msg.message.length;
      stats[sender].activeDays.add(new Date(msg.date).toDateString());
    });

    return Object.keys(stats)
      .map((sender) => {
        const data = stats[sender];
        const medianWords = data.wordCounts.sort((a, b) => a - b);
        const median =
          medianWords.length % 2 === 1
            ? medianWords[Math.floor(medianWords.length / 2)]
            : (medianWords[medianWords.length / 2 - 1] +
                medianWords[medianWords.length / 2]) /
              2;
        return {
          sender,
          messageCount: data.messageCount,
          averageWordsPerMessage: data.totalWordsSent / data.messageCount,
          medianWordsPerMessage: median,
          totalWordsSent: data.totalWordsSent,
          maxWordsInMessage: data.maxWordsInMessage,
          activeDays: data.activeDays.size,
          uniqueWordsCount: data.uniqueWords.size,
          averageCharactersPerMessage: data.totalCharacters / data.messageCount,
        };
      })
      .filter((d) => d.messageCount >= minMessages); // Filtere Sender nach minMessagePercentage
  }, [messages, minMessagePercentage]);

  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3
      .scaleOrdinal<string, string>(colors)
      .domain(aggregatedStats.map((d) => d.sender));
  }, [aggregatedStats, darkMode]);

  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage]
  );

  const currentStats = useMemo(() => {
    const sortedStats = [...aggregatedStats].sort(
      (a, b) =>
        (b[selectedProperty as keyof typeof b] as number) -
        (a[selectedProperty as keyof typeof a] as number) // Sortiert absteigend
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage, selectedProperty]);

  const currentSenders = useMemo(() => {
    return currentStats.map((d) => d.sender);
  }, [currentStats]);

  useEffect(() => {
    const handleResize = () => {
      setCurrentPage(1); // Zurück zur ersten Seite
      const plotWidth =
        document.getElementById("plot-sender-comparison")?.offsetWidth || 0;
      setItemsPerPage(Math.max(1, Math.floor(plotWidth / MIN_BAR_WIDTH)));
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial setzen

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!dimensions || aggregatedStats.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 250, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();
    const chart = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain([...Array(itemsPerPage).keys()].map((i) => i.toString())) // Nutzt feste Anzahl
      .range([0, innerWidth])
      .padding(0.3);

    const yMax =
      d3.max(
        currentStats, // ← Hier muss currentStats stehen!
        (d) => d[selectedProperty as keyof typeof d] as number
      ) || 10;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    chart
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d, i) => currentSenders[i] || "")) // ← Sender korrekt setzen!
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px");

    chart.append("g").call(d3.axisLeft(yScale)).style("font-size", "12px");

    chart
      .selectAll(".bar")
      .data(currentStats) // Nur Balken der aktuellen Seite
      .enter()
      .append("rect")
      .attr("x", (_, i) => xScale(i.toString()) ?? 0) // Nutzt Index als Schlüssel
      .attr("y", (d) => yScale(d[selectedProperty as keyof typeof d] as number))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) =>
        Math.max(
          0,
          innerHeight - yScale(d[selectedProperty as keyof typeof d] as number)
        )
      )

      .attr("fill", (d) => colorScale(d.sender));
  }, [aggregatedStats, selectedProperty, dimensions, darkMode, currentPage]);

  return (
    <div
      id="plot-sender-comparison"
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold mb-4">Sender Comparison</h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? "text-white" : "text-black"
          }`}
          onClick={() => {
            setExpanded(!expanded);
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 1000); // Kleine Verzögerung für reflow
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
      <div id="property-select" className="mb-4">
        <div>
          <select
            id="property-dropdown"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className={`mt-1.5 w-fit border border-[1px] text-sm font-medium outline-none focus:ring-0 appearance-none
        ${
          darkMode
            ? "border-gray-300 bg-black text-white"
            : "border-black bg-white text-black"
        } 
        p-2`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {properties.map((prop) => (
              <option
                key={prop.key}
                value={prop.key}
                className={
                  darkMode ? "bg-black text-white" : "bg-white text-black"
                }
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {prop.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isUploading ? (
        <ClipLoader color={darkMode ? "#ffffff" : "#000000"} size={50} />
      ) : (
        <svg ref={svgRef} className="w-full"></svg>
      )}

      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`px-2 py-1 border ${
            darkMode ? "border-gray-300 text-white" : "border-black text-black"
          } ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed border-gray-400"
              : ""
          }`}
        >
          Previous
        </button>
        <span className={darkMode ? "text-white" : "text-black"}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className={`px-2 py-1 border ${
            darkMode ? "border-gray-300 text-white" : "border-black text-black"
          } ${
            currentPage === totalPages
              ? "text-gray-400 cursor-not-allowed border-gray-400"
              : ""
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SenderComparisonBarChart;
