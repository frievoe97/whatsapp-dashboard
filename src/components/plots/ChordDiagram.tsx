import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";

/**
 * Minimum and maximum number of unique senders to display the diagram.
 */
const MIN_SENDERS = 3;
const MAX_SENDERS = 12;

interface ChordDatum {
  source: string;
  target: string;
  value: number;
}

interface ChordDiagramProps {}

const ChordDiagram: React.FC<ChordDiagramProps> = () => {
  // Jetzt ausschließlich filteredMessages verwenden
  const { filteredMessages, darkMode } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const [isRendered, setIsRendered] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  /**
   * Precompute chord data:
   * - Hier werden ALLE Nachrichten aus filteredMessages genutzt.
   */
  const { chordData, uniqueSenders } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const participants = new Map<string, number>();

    // Gesamtanzahl der Nachrichten (alle aus filteredMessages)
    const totalMessages = filteredMessages.length;

    // Zähle Nachrichten pro Sender
    filteredMessages.forEach((msg) => {
      participants.set(msg.sender, (participants.get(msg.sender) || 0) + 1);
    });

    // Bestimme gültige Sender – hier kein Mindestprozentsatz mehr, da Backend bereits filtert
    const validSenders = new Set(Array.from(participants.keys()));

    if (validSenders.size < MIN_SENDERS) {
      return { chordData: [], uniqueSenders: 0 };
    }

    // Zähle Übergänge zwischen Nachrichten
    filteredMessages.forEach((msg, index) => {
      if (index === 0) return;
      const previousMessage = filteredMessages[index - 1];
      const sender = msg.sender;
      const previousSender = previousMessage.sender;

      if (!validSenders.has(sender) || !validSenders.has(previousSender)) {
        return;
      }

      if (!counts[previousSender]) {
        counts[previousSender] = {};
      }
      counts[previousSender][sender] =
        (counts[previousSender][sender] || 0) + 1;
    });

    const flatChordData: ChordDatum[] = Object.entries(counts).flatMap(
      ([source, targets]) =>
        Object.entries(targets).map(([target, value]) => ({
          source,
          target,
          value,
        }))
    );

    return {
      chordData: flatChordData,
      uniqueSenders: validSenders.size,
    };
  }, [filteredMessages]);

  useEffect(() => {
    if (uniqueSenders >= MIN_SENDERS && uniqueSenders <= MAX_SENDERS) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, [uniqueSenders]);

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
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(participants)
      .range(colors);

    const matrix = Array.from({ length: participants.length }, () =>
      new Array(participants.length).fill(0)
    );

    chordData.forEach(({ source, target, value }) => {
      const sourceIndex = participants.indexOf(source);
      const targetIndex = participants.indexOf(target);
      matrix[sourceIndex][targetIndex] = value;
      matrix[targetIndex][sourceIndex] = value;
    });

    const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(
      matrix
    );

    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(radius)
      .outerRadius(radius + 10);

    const ribbon = d3.ribbon().radius(radius);

    const group = g
      .append("g")
      .selectAll("g")
      .data(chords.groups)
      .enter()
      .append("g");

    group
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d) => colorScale(participants[d.index]))
      .attr("stroke", "#000")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        handleGroupClick(d, chords);
      });

    const ribbons = g
      .append("g")
      .selectAll("path")
      .data(chords)
      .enter()
      .append("path")
      .attr("d", ribbon as any)
      .attr("fill", (d) => colorScale(participants[d.source.index]))
      .attr("stroke", "#000")
      .style("opacity", 1);

    const defs = svg.append("defs");
    group.each(function (d, i) {
      const angleStart = d.startAngle - Math.PI / 2;
      const angleEnd = d.endAngle - Math.PI / 2;
      const largeArcFlag = angleEnd - angleStart > Math.PI ? 1 : 0;
      const xStart = (radius + 15) * Math.cos(angleStart);
      const yStart = (radius + 15) * Math.sin(angleStart);
      const xEnd = (radius + 15) * Math.cos(angleEnd);
      const yEnd = (radius + 15) * Math.sin(angleEnd);
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

    group
      .append("text")
      .attr("class", "chord-name")
      .style("user-select", "none")
      .append("textPath")
      .attr("xlink:href", (_, i) => `#arc-path-${i}`)
      .attr("startOffset", "50%")
      .style("text-anchor", "middle")
      .style("fill", darkMode ? "white" : "black")
      .style("font-size", "12px")
      .text((d) => participants[d.index]);

    function handleGroupClick(
      selectedGroup: d3.ChordGroup,
      chords: d3.Chord[]
    ) {
      const selectedIndex = selectedGroup.index;
      chords.forEach((link: d3.Chord) => {
        // Hier wird nur die Opazität der Verbindungen angepasst
      });
      group.selectAll("path").transition().duration(500).style("opacity", "1");
      ribbons
        .transition()
        .duration(500)
        .style("opacity", (d) =>
          d.source.index === selectedIndex || d.target.index === selectedIndex
            ? 1
            : 0.2
        );
    }

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

  if (!shouldRender) {
    return <div ref={containerRef} />;
  }

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
        {chordData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default ChordDiagram;
