import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import Select from 'react-select';

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
 * Props shape for the ChordDiagram component.
 * Currently, this component uses only context from `useChat` and doesn't take external props.
 */
// interface ChordDiagramProps {}

/**
 * ChordDiagram component visualizes interactions between chat participants using a chord diagram.
 * It dynamically updates based on chat messages and filters participants based on their usage.
 * The diagram handles theme changes and window resizes, and supports interactions:
 * - Klick auf einen Bogen hebt die relevanten Verbindungen hervor.
 * - Doppelklick setzt die Darstellung zurück.
 * - Wird ein Spinner angezeigt, falls keine Daten vorhanden sind.
 * - Das Diagramm wird nur gerendert, wenn die Anzahl der Teilnehmer zwischen MIN_SENDERS und MAX_SENDERS liegt.
 */
const ChordDiagram: React.FC = () => {
  // Verwende nun ausschließlich filteredMessages und darkMode aus dem Context.
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();

  // Refs für Container (zum Messen der Dimensionen) und für das <svg>-Element.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Beobachte Änderungen an der Containergröße.
  const dimensions = useResizeObserver(containerRef);

  // Flag für einen einmaligen erzwungenen Re-Render (falls benötigt).
  const [isRendered, setIsRendered] = useState(false);

  // State, ob das Diagramm gerendert werden soll (abhängig von der Anzahl eindeutiger Sender).
  const [shouldRender, setShouldRender] = useState(false);

  const [topCount, setTopCount] = useState<number>(10);

  /**
   * Berechne die Chord-Daten aus den Nachrichten.
   * Es werden nur aufeinanderfolgende Nachrichten berücksichtigt.
   * Es werden:
   * - `chordData`: Ein Array von { source, target, value } erzeugt.
   * - `uniqueSenders`: Die Anzahl der eindeutigen Teilnehmer (nur aus gefilterten Nachrichten).
   */
  const { chordData, uniqueSenders, sortedSenders } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const senderCounts = new Map<string, number>();

    // Zähle Nachrichten pro Sender
    filteredMessages.forEach((msg) => {
      senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
    });

    // Sortiere die Sender absteigend nach Anzahl der Nachrichten
    const sortedSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sender]) => sender);

    const validSenders = new Set(sortedSenders);
    if (validSenders.size < MIN_SENDERS) {
      return { chordData: [], uniqueSenders: 0, sortedSenders: [] };
    }

    // Zähle Übergänge zwischen aufeinanderfolgenden Nachrichten für gültige Sender
    filteredMessages.forEach((msg, index) => {
      if (index === 0) return;
      const previousMessage = filteredMessages[index - 1];
      const sender = msg.sender;
      const previousSender = previousMessage.sender;

      if (!validSenders.has(sender) || !validSenders.has(previousSender)) return;

      if (!counts[previousSender]) {
        counts[previousSender] = {};
      }
      if (!counts[previousSender][sender]) {
        counts[previousSender][sender] = 0;
      }
      counts[previousSender][sender] += 1;
    });

    // Erzeuge ein Array von Chord-Daten
    const flatChordData: ChordDatum[] = Object.entries(counts).flatMap(([source, targets]) =>
      Object.entries(targets).map(([target, value]) => ({
        source,
        target,
        value,
      })),
    );

    return {
      chordData: flatChordData,
      uniqueSenders: validSenders.size,
      sortedSenders,
    };
  }, [filteredMessages]);

  const topSenders = sortedSenders.slice(0, topCount);
  const filteredChordData = chordData.filter(
    (d) => topSenders.includes(d.source) && topSenders.includes(d.target),
  );

  // console.log("Top Senders: ", topSenders);

  useEffect(() => {
    if (sortedSenders.length > 0) {
      // Falls mehr als 12 Sender vorhanden sind, verwende 12 als Default,
      // ansonsten: Wenn weniger als 10 Sender vorhanden sind, nimm alle, sonst 10.
      const defaultTop =
        sortedSenders.length > MAX_SENDERS
          ? MAX_SENDERS
          : sortedSenders.length < 10
            ? sortedSenders.length
            : 10;
      setTopCount(defaultTop);
    }
  }, [sortedSenders]);

  /**
   * Entscheidet, ob das Diagramm gerendert werden soll, basierend auf der Anzahl der eindeutigen Sender.
   */
  useEffect(() => {
    if (uniqueSenders >= MIN_SENDERS) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, [uniqueSenders]);

  /**
   * Haupteffekt, der das Chord-Diagramm zeichnet bzw. aktualisiert, wenn sich die Chord-Daten,
   * Dimensionen oder das Theme ändern.
   */
  useEffect(() => {
    if (!dimensions || filteredChordData.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;

    // Ermittele die Höhe des Headers (falls vorhanden)
    const header = document.getElementById('chord-diagram-header');
    const headerHeight = header
      ? header.getBoundingClientRect().height +
        parseFloat(getComputedStyle(header).marginTop) +
        parseFloat(getComputedStyle(header).marginBottom)
      : 0;
    const height = dimensions.height - headerHeight;

    const radius = Math.min(width, height) / 2 - 40;
    if (radius <= 0) return;

    // Lösche vorherige Zeichnungen.
    svg.selectAll('*').remove();

    // Erstelle eine Gruppe in der Mitte des SVG.
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Ermittle alle Teilnehmer (aus den Quell- und Zielwerten).
    const participants = Array.from(
      new Set(filteredChordData.flatMap((d) => [d.source, d.target])),
    );

    // Wähle die Farbschemata abhängig vom Theme.
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const colorScale = d3.scaleOrdinal<string>().domain(participants).range(colors);

    // Erstelle eine Matrix für d3.chord.
    const matrix = Array.from({ length: participants.length }, () =>
      new Array(participants.length).fill(0),
    );

    filteredChordData.forEach(({ source, target, value }) => {
      const sourceIndex = participants.indexOf(source);
      const targetIndex = participants.indexOf(target);
      // Nur fortfahren, wenn beide Indizes gültig sind:
      if (sourceIndex >= 0 && targetIndex >= 0) {
        matrix[sourceIndex][targetIndex] = value;
        matrix[targetIndex][sourceIndex] = value;
      }
    });

    const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(matrix);

    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(radius)
      .outerRadius(radius + 10);

    const ribbon = d3.ribbon().radius(radius);

    const group = g.append('g').selectAll('g').data(chords.groups).enter().append('g');

    group
      .append('path')
      .attr('d', arc as never)
      .attr('fill', (d) => colorScale(participants[d.index]))
      .attr('stroke', '#000')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        handleGroupClick(d, chords);
      });

    const ribbons = g
      .append('g')
      .selectAll('path')
      .data(chords)
      .enter()
      .append('path')
      .attr('d', ribbon as never)
      .attr('fill', (d) => colorScale(participants[d.source.index]))
      .attr('stroke', '#000')
      .style('opacity', 1);

    const defs = svg.append('defs');

    group.each(function (d, i) {
      const angleStart = d.startAngle - Math.PI / 2;
      const angleEnd = d.endAngle - Math.PI / 2;
      const largeArcFlag = angleEnd - angleStart > Math.PI ? 1 : 0;
      const xStart = (radius + 15) * Math.cos(angleStart);
      const yStart = (radius + 15) * Math.sin(angleStart);
      const xEnd = (radius + 15) * Math.cos(angleEnd);
      const yEnd = (radius + 15) * Math.sin(angleEnd);
      defs
        .append('path')
        .attr('id', `arc-path-${i}`)
        .attr(
          'd',
          `M ${xStart},${yStart} A ${radius + 15},${
            radius + 15
          } 0 ${largeArcFlag},1 ${xEnd},${yEnd}`,
        )
        .style('fill', 'none')
        .style('stroke', 'none');
    });

    group
      .append('text')
      .attr('class', 'chord-name')
      .style('user-select', 'none')
      .append('textPath')
      .attr('xlink:href', (_, i) => `#arc-path-${i}`)
      .attr('startOffset', '50%')
      .style('text-anchor', 'middle')
      .style('fill', darkMode ? 'white' : 'black')
      .style('font-size', '12px')
      .text((d) => {
        const sender = participants[d.index];
        return useShortNames && metadata?.sendersShort[sender]
          ? metadata.sendersShort[sender]
          : sender;
      });

    function handleGroupClick(selectedGroup: d3.ChordGroup, chords: d3.Chord[]) {
      const selectedIndex = selectedGroup.index;
      const connectedIndices = new Set<number>();

      chords.forEach((link: d3.Chord) => {
        if (link.source.index === selectedIndex) {
          connectedIndices.add(link.target.index);
        }
        if (link.target.index === selectedIndex) {
          connectedIndices.add(link.source.index);
        }
      });

      group
        .selectAll('path')
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', '1');

      ribbons
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', (d) =>
          d.source.index === selectedIndex || d.target.index === selectedIndex ? 1 : 0.2,
        );
    }

    svg.on('dblclick', () => {
      group.selectAll('path').transition().duration(500).style('opacity', 1);
      ribbons.transition().duration(500).style('opacity', 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredChordData, dimensions, darkMode, topCount, useShortNames]);

  useEffect(() => {
    if (isRendered) {
      window.dispatchEvent(new Event('resize'));
      setIsRendered(false);
    }
  }, [isRendered]);

  if (!shouldRender) {
    return <div ref={containerRef} />;
  }

  // -------------
  // React-Select Styles
  // -------------
  const customSelectStyles = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      display: 'flex',
      justifyContent: 'space-between',
      marginLeft: '4px',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0px',
      flex: '1 1 auto',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '6px',
      marginLeft: '-5px',
      color: darkMode ? 'white' : 'black',
      display: 'none',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: darkMode ? '#333' : 'white',
      color: darkMode ? 'white' : 'black',
      boxShadow: 'none',
      width: 'auto',
      minWidth: 'fit-content',
      border: darkMode ? '1px solid white' : '1px solid black',
      borderRadius: '0',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? darkMode
          ? '#777'
          : '#ddd'
        : window.innerWidth >= 768 && state.isFocused && state.selectProps.menuIsOpen
          ? darkMode
            ? '#555'
            : 'grey'
          : darkMode
            ? '#333'
            : 'white',
      color: darkMode ? 'white' : 'black',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    singleValue: (provided: any) => ({
      ...provided,
      color: darkMode ? 'white' : 'black',
    }),
  };

  return (
    <div
      ref={containerRef}
      className={`border w-full md:min-w-[400px] md:basis-[500px] p-4 px-0 md:px-4 pb-0 md:pb-4 flex-grow flex flex-col ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '400px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2
        id="chord-diagram-header"
        className="text-base md:text-lg font-semibold mb-0 md:mb-4 flex items-center px-4 md:px-0"
      >
        <span>Who Replies to Whom (Top </span>
        <Select
          value={{ value: topCount, label: topCount.toString() }}
          onChange={(selected) => setTopCount(Number(selected?.value))}
          options={Array.from(
            { length: Math.min(sortedSenders.length, MAX_SENDERS) - 2 },
            (_, i) => {
              const num = i + 3;
              return { value: num, label: num.toString() };
            },
          ).reverse()}
          isSearchable={false}
          styles={customSelectStyles}
        />
        <span>)</span>
      </h2>

      {/* <h2 className="text-lg font-semibold mb-4">10 )</h2> */}
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg id="chord-diagram-plot" ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default ChordDiagram;
