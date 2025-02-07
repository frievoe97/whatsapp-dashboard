import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import ClipLoader from "react-spinners/ClipLoader";

/**
 * Minimum number of unique senders required to show the chord diagram.
 */
const MIN_SENDERS = 3;

/**
 * Maximum number of unique senders allowed to show the chord diagram.
 */
const MAX_SENDERS = 12;

/**
 * Represents a single link in the chord data:
 * - `source` is the sender of the previous message
 * - `target` is the sender of the current message
 * - `value` is the frequency of transitions from `source` to `target`
 */
interface ChordDatum {
  source: string;
  target: string;
  value: number;
}

/**
 * Props shape for the ChordDiagram component (if needed).
 * Currently, this component uses only context from `useChat` and doesn't take external props.
 */
interface ChordDiagramProps {}

/**
 * ChordDiagram component visualizes interactions between chat participants using a chord diagram.
 * It dynamically updates based on chat messages and filters participants with a minimum percentage of messages.
 * The diagram correctly handles theme changes and window resizes to ensure proper rendering.
 *
 * Features:
 * 1. Renders a chord diagram of who replies to whom, based on consecutive used messages.
 * 2. Click on a segment (arc) to highlight only the connections relevant to that sender.
 * 3. Double-click on the SVG to reset the visualization.
 * 4. Shows a spinner if uploading is in progress.
 * 5. Hides the chord diagram if the number of unique senders is below MIN_SENDERS or above MAX_SENDERS.
 * 6. Applies dark or light styling automatically based on `darkMode`.
 */
const ChordDiagram: React.FC<ChordDiagramProps> = () => {
  // Access data and theme info from context
  const { messages, darkMode, isUploading, isWorking, minMessagePercentage } =
    useChat();

  // Refs for container (for measuring dimensions) and the <svg> element
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Observe changes to the container size
  const dimensions = useResizeObserver(containerRef);

  // Flag used to ensure a one-time forced re-render if needed
  const [isRendered, setIsRendered] = useState(false);

  // State controlling whether the diagram should render based on unique senders
  const [shouldRender, setShouldRender] = useState(false);

  /**
   * Precompute chord data from the list of messages.
   * We only consider consecutive messages where `isUsed` is true.
   * This returns:
   * - `chordData`: an array of source-target-value triples
   * - `uniqueSenders`: total unique participants in used messages
   */
  const { chordData, uniqueSenders } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const participants = new Map<string, number>(); // Map für Nachrichtenzählung

    // Gesamtanzahl der Nachrichten berechnen
    const totalMessages = messages.length;

    // Zähle Nachrichten für jeden Sender
    messages.forEach((msg) => {
      if (msg.isUsed) {
        participants.set(msg.sender, (participants.get(msg.sender) || 0) + 1);
      }
    });

    // Bestimme gültige Sender basierend auf `minMessagePercentage`
    const validSenders = new Set(
      Array.from(participants.entries())
        .filter(
          ([_, count]) => (count / totalMessages) * 100 >= minMessagePercentage
        )
        .map(([sender]) => sender)
    );

    // Falls zu wenige Sender übrig bleiben, Diagramm nicht rendern
    if (validSenders.size < MIN_SENDERS) {
      return { chordData: [], uniqueSenders: 0 };
    }

    // Zähle Übergänge zwischen Nachrichten für gültige Sender
    messages.forEach((msg, index) => {
      if (!msg.isUsed || index === 0) return;

      const previousMessage = messages[index - 1];
      if (!previousMessage.isUsed) return;

      const sender = msg.sender;
      const previousSender = previousMessage.sender;

      if (!validSenders.has(sender) || !validSenders.has(previousSender)) {
        return; // Ignoriere Übergänge mit ungültigen Sendern
      }

      if (!counts[previousSender]) {
        counts[previousSender] = {};
      }
      if (!counts[previousSender][sender]) {
        counts[previousSender][sender] = 0;
      }
      counts[previousSender][sender] += 1;
    });

    // Konvertiere die Zählung in ein Array von Chord-Daten
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
  }, [messages, isWorking, minMessagePercentage]);

  /**
   * Decide whether to render the chord diagram based on the number of unique senders.
   */
  useEffect(() => {
    if (uniqueSenders >= MIN_SENDERS && uniqueSenders <= MAX_SENDERS) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, [uniqueSenders]);

  /**
   * Main effect that draws and updates the chord diagram whenever
   * the chord data, dimensions, or theme change.
   */
  useEffect(() => {
    // If container has no dimensions or there's no chord data, skip rendering
    if (!dimensions || chordData.length === 0 || !svgRef.current) return;

    // Basic setup: select the SVG and compute width/height
    const svg = d3.select(svgRef.current);
    const width = dimensions.width;

    // Some layouts have a header that takes up some vertical space
    const header = document.getElementById("chord-diagram-header");
    const headerHeight = header
      ? header.getBoundingClientRect().height +
        parseFloat(getComputedStyle(header).marginTop) +
        parseFloat(getComputedStyle(header).marginBottom)
      : 0;
    const height = dimensions.height - headerHeight;

    // Calculate radius, ensuring it's not negative
    const radius = Math.min(width, height) / 2 - 40;
    if (radius <= 0) return;

    // Clear any previous drawing
    svg.selectAll("*").remove();

    // Create a group in the center of the SVG
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Identify all participants (unique source & target values)
    const participants = Array.from(
      new Set(chordData.flatMap((d) => [d.source, d.target]))
    );

    // For color, we use different d3 color schemes based on dark mode
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(participants)
      .range(colors);

    // Build a matrix that feeds into d3.chord
    // Matrix size: participants.length x participants.length
    const matrix = Array.from({ length: participants.length }, () =>
      new Array(participants.length).fill(0)
    );

    // Fill the matrix
    chordData.forEach(({ source, target, value }) => {
      const sourceIndex = participants.indexOf(source);
      const targetIndex = participants.indexOf(target);
      matrix[sourceIndex][targetIndex] = value;
      matrix[targetIndex][sourceIndex] = value;
    });

    // Construct the chord layout
    const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(
      matrix
    );

    // Arc generator for the outer arcs
    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(radius)
      .outerRadius(radius + 10);

    // Ribbon generator for the connecting paths
    const ribbon = d3.ribbon().radius(radius);

    // Create group elements for each arc
    const group = g
      .append("g")
      .selectAll("g")
      .data(chords.groups)
      .enter()
      .append("g");

    // Draw the arcs
    group
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d) => colorScale(participants[d.index]))
      .attr("stroke", "#000")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        handleGroupClick(d, chords);
      });

    // Draw the ribbons
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

    // Create <defs> for arcs used to place text along an invisible path
    const defs = svg.append("defs");

    // For each arc, define an invisible path and place the participant name along it
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

    // Attach text to the defined paths
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

    /**
     * When a user clicks on one of the arcs:
     * - Reduce opacity of all other arcs and ribbons
     * - Highlight only the selected arc and its connected ribbons
     */
    function handleGroupClick(
      selectedGroup: d3.ChordGroup,
      chords: d3.Chord[]
    ) {
      const selectedIndex = selectedGroup.index;
      const connectedIndices = new Set<number>();

      // Identify all indices (participants) that connect to the selected index
      chords.forEach((link: d3.Chord) => {
        if (link.source.index === selectedIndex) {
          connectedIndices.add(link.target.index);
        }
        if (link.target.index === selectedIndex) {
          connectedIndices.add(link.source.index);
        }
      });

      // Update arcs
      group
        .selectAll("path")
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        // Dont reduce the opacity of the non selected arcs
        .style("opacity", "1");

      // Update ribbons
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

    /**
     * Reset the chord diagram to full opacity on double-click.
     */
    svg.on("dblclick", () => {
      group.selectAll("path").transition().duration(500).style("opacity", 1);
      ribbons.transition().duration(500).style("opacity", 1);
    });
  }, [chordData, dimensions, darkMode, messages]);

  /**
   * If the chord diagram is rendered, force a resize event if needed.
   * This can help ensure the diagram is sized/re-rendered correctly.
   */
  useEffect(() => {
    if (isRendered) {
      window.dispatchEvent(new Event("resize"));
      setIsRendered(false);
    }
  }, [isRendered]);

  // If we don't meet the unique sender criteria, don't render the diagram
  if (!shouldRender) {
    return <div ref={containerRef} />;
  }

  // Render the final layout:
  // - Container with border and theme-based classes
  // - Header
  // - If isUploading, show spinner
  // - Otherwise, show chord diagram or "No Data Available"
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
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default ChordDiagram;
