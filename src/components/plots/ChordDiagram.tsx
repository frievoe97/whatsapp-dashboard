import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

const MIN_SENDERS = 3;
const MAX_SENDERS = 12;

/**
 * ChordDiagram component visualizes interactions between chat participants using a chord diagram.
 * It dynamically updates based on chat messages and filters participants with a minimum percentage of messages.
 * The diagram correctly handles theme changes and window resizes to ensure proper rendering.
 */
const ChordDiagram: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const [isRendered, setIsRendered] = useState(false);

  // Process messages to generate chord data and unique senders count
  const { chordData, uniqueSenders } = useMemo(() => {
    const counts: { [key: string]: { [key: string]: number } } = {};
    const participants = new Set<string>();

    // Zähle Nachrichten pro Sender (nur für Nachrichten, die verwendet werden)
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      participants.add(msg.sender);
    });

    // Optional: Falls Du die Chord-Daten basierend auf Interaktionen zwischen aufeinanderfolgenden, verwendeten Nachrichten berechnen möchtest:
    messages.forEach((msg, index) => {
      // Nur wenn beide Nachrichten verwendet werden:
      if (!msg.isUsed || index === 0) return;
      const previousMessage = messages[index - 1];
      if (!previousMessage.isUsed) return;
      const sender = msg.sender;
      const previousSender = previousMessage.sender;
      if (!counts[previousSender]) counts[previousSender] = {};
      if (!counts[previousSender][sender]) counts[previousSender][sender] = 0;
      counts[previousSender][sender] += 1;
    });

    return {
      chordData: Object.entries(counts).flatMap(([source, targets]) =>
        Object.entries(targets).map(([target, value]) => ({
          source,
          target,
          value,
        }))
      ),
      uniqueSenders: participants.size,
    };
  }, [messages]);

  // Render the chord diagram
  useEffect(() => {
    if (!dimensions || chordData.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;

    const header = document.getElementById("chord-diagram-header");

    const headerHeight = header
      ? header.getBoundingClientRect().height +
        parseFloat(getComputedStyle(header).marginTop) +
        parseFloat(getComputedStyle(header).marginBottom)
      : 0;

    const height = dimensions.height - headerHeight;
    const radius = Math.min(width, height) / 2 - 40;

    if (radius <= 0) return;

    svg.selectAll("*").remove();
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const participants = Array.from(
      new Set(chordData.flatMap((d) => [d.source, d.target]))
    );
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const colorScale = d3.scaleOrdinal(colors).domain(participants);

    const matrix = Array.from({ length: participants.length }, () =>
      new Array(participants.length).fill(0)
    );

    chordData.forEach(({ source, target, value }) => {
      const sourceIndex = participants.indexOf(source);
      const targetIndex = participants.indexOf(target);
      matrix[sourceIndex][targetIndex] = value;
      matrix[targetIndex][sourceIndex] = value;
    });

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(
      matrix
    );
    const arc = d3
      .arc()
      .innerRadius(radius)
      .outerRadius(radius + 10);
    const ribbon = d3.ribbon().radius(radius);

    const group = g
      .append("g")
      .selectAll("g")
      .data(chord.groups)
      .enter()
      .append("g");

    group
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d) => colorScale(participants[d.index]))
      .attr("stroke", "#000")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        handleClick(d, chord);
      });

    const ribbons = g
      .append("g")
      .selectAll("path")
      .data(chord)
      .enter()
      .append("path")
      .attr("d", ribbon as any)
      .attr("fill", (d) => colorScale(participants[d.source.index]))
      .attr("stroke", "#000")
      .style("opacity", 1);

    // Definiere Pfade für jeden Teilnehmer
    const defs = svg.append("defs");

    group.each(function (d, i) {
      const angleStart = d.startAngle - Math.PI / 2;
      const angleEnd = d.endAngle - Math.PI / 2;
      const largeArcFlag = angleEnd - angleStart > Math.PI ? 1 : 0;

      const xStart = (radius + 15) * Math.cos(angleStart);
      const yStart = (radius + 15) * Math.sin(angleStart);
      const xEnd = (radius + 15) * Math.cos(angleEnd);
      const yEnd = (radius + 15) * Math.sin(angleEnd);

      // Pfad für jeden Namen im SVG `<defs>` erstellen
      defs
        .append("path")
        .attr("id", `arc-path-${i}`)
        .attr(
          "d",
          `M ${xStart},${yStart} A ${radius + 15},${
            radius + 15
          } 0 ${largeArcFlag},1 ${xEnd},${yEnd}`
        )
        .style("fill", "none")
        .style("stroke", "none");
    });

    // Text entlang der Pfade platzieren
    group
      .append("text")
      .attr("class", "chord-name")
      .style("user-select", "none")
      .style("-webkit-user-select", "none")
      .style("-moz-user-select", "none")
      .style("-ms-user-select", "none")
      .append("textPath")
      .attr("xlink:href", (_, i) => `#arc-path-${i}`)
      .attr("startOffset", "50%") // Zentriert den Text
      .style("text-anchor", "middle")
      .style("fill", darkMode ? "white" : "black")
      .style("font-size", "12px")
      .text((d) => participants[d.index]);

    function handleClick(selectedGroup: any, chord: any) {
      const selectedIndex = selectedGroup.index;
      const connectedIndices = new Set();

      chord.forEach((link: any) => {
        if (link.source.index === selectedIndex)
          connectedIndices.add(link.target.index);
        if (link.target.index === selectedIndex)
          connectedIndices.add(link.source.index);
      });

      group
        .selectAll("path")
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style("opacity", (d: any) =>
          d.index === selectedIndex || connectedIndices.has(d.index) ? 1 : 0.2
        );

      ribbons
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style("opacity", (d) =>
          d.source.index === selectedIndex || d.target.index === selectedIndex
            ? 1
            : 0.2
        );
    }

    // Doppelklick: Setzt alles zurück
    svg.on("dblclick", () => {
      group.selectAll("path").transition().duration(500).style("opacity", 1);
      ribbons.transition().duration(500).style("opacity", 1);
    });
  }, [chordData, dimensions, darkMode]);

  useEffect(() => {
    if (isRendered) {
      window.dispatchEvent(new Event("resize"));
      setIsRendered(false);
    }
  }, [isRendered]);

  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (uniqueSenders >= MIN_SENDERS && uniqueSenders <= MAX_SENDERS) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, [uniqueSenders]);

  if (!shouldRender) return <div ref={containerRef}></div>;

  return (
    <div
      ref={containerRef}
      className={`border w-full md:min-w-[400px] md:basis-[500px] p-4 flex-grow flex flex-col ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "400px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 id="chord-diagram-header" className="text-lg font-semibold mb-4">
        Who Replies to Whom
      </h2>
      <div className="flex-grow flex justify-center items-center">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : chordData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default ChordDiagram;
