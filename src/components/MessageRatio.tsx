// src/components/Plot3.tsx
import React, { useEffect, useRef, useMemo } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

interface PieData {
  sender: string;
  count: number;
}

const Plot3: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // Aggregiere die Anzahl der Nachrichten pro Sender
  const pieData: PieData[] = useMemo(() => {
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const dataMap: { [sender: string]: number } = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      dataMap[msg.sender] = (dataMap[msg.sender] || 0) + 1;
    });

    return Object.keys(dataMap)
      .map((sender) => ({
        sender,
        count: dataMap[sender],
      }))
      .filter((d) => d.count >= minMessages);
  }, [messages, minMessagePercentage]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = pieData.map((d) => d.sender);
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;

    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [pieData, darkMode]); // `darkMode` & `pieData` als Dependencies

  useEffect(() => {
    if (!dimensions || pieData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2 - 100; // Padding für Labels

    svg.selectAll("*").remove(); // Clear previous contents

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<PieData>()
      .sort(null)
      .value((d) => d.count);

    const arc = d3
      .arc<d3.PieArcDatum<PieData>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = g
      .selectAll(".arc")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw the pie slices
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.sender) as string)
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t)) as string;
        };
      });

    // Add labels
    // Add external labels with lines
    const outerArc = d3
      .arc<d3.PieArcDatum<PieData>>()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 1.5); // Position der Labels außerhalb des Pie-Charts

    const labelPositions = pieData.map((d, i) => {
      const centroid = outerArc.centroid(pie(pieData)[i]);
      return { x: centroid[0], y: centroid[1] };
    });

    // Verwende eine Simulation zur automatischen Positionierung
    const simulation = d3
      .forceSimulation(labelPositions)
      .force("y", d3.forceY((d) => (d.y !== undefined ? d.y : 0)).strength(0.5))
      .force("collide", d3.forceCollide(18)) // Abstand zwischen Labels erhöhen
      .stop();

    // Starte Simulation
    for (let i = 0; i < 100; i++) simulation.tick();

    // Labels korrekt positionieren
    arcs
      .append("text")
      .attr(
        "transform",
        (d, i) =>
          `translate(${simulation.nodes()[i].x}, ${simulation.nodes()[i].y})`
      )
      .attr("text-anchor", (d) =>
        (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start"
      )
      .attr("font-size", "12px")
      .style("fill", darkMode ? "white" : "black")
      .text((d) => d.data.sender);

    // Linien zu den Labels hinzufügen
    arcs
      .append("polyline")
      .attr("points", (d, i) => {
        const posA = arc.centroid(d); // Punkt in der Mitte des Segments
        const posB = outerArc.centroid(d); // Punkt außerhalb des Segments
        const posC = [simulation.nodes()[i].x, simulation.nodes()[i].y]; // Automatische Position des Labels
        return [posA, posB, posC].map((p) => p.join(",")).join(" ");
      })
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("stroke-width", 1);

    // Verwende eine Simulation zur automatischen Positionierung

    // Add a legend
  }, [pieData, dimensions, colorScale, darkMode]); // darkMode hinzugefügt

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[400px] md:basis-[400px] flex-grow p-4 h-96 flex flex-col`}
      style={{ minHeight: "300px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Message Ratio
      </h2>

      {/* Bedingtes Rendering des Inhalts */}
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : pieData.length === 0 ? (
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

export default Plot3;
