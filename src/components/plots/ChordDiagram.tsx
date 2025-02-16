////////////// Imports ////////////////
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

////////////// Constants & Types ////////////////
/** Minimum number of unique senders required to show the chord diagram. */
const MIN_SENDERS = 3;
/** Maximum number of unique senders allowed to show the chord diagram. */
const MAX_SENDERS = 12;

/**
 * Represents a single link for the chord diagram.
 * - `source`: the sender of the previous message.
 * - `target`: the sender of the current message.
 * - `value`: frequency of transitions from source to target.
 */
interface ChordDatum {
  source: string;
  target: string;
  value: number;
}

////////////// Main Component: ChordDiagram ////////////////
/**
 * ChordDiagram visualizes interactions between chat participants using a chord diagram.
 * It updates dynamically based on chat messages, theme, and window size.
 * It supports interactions such as:
 * - Clicking on a segment to highlight connections.
 * - Double-clicking to reset the diagram.
 * - Displaying a spinner if no data is available.
 * The diagram is rendered only when the number of participants is between MIN_SENDERS and MAX_SENDERS.
 */
const ChordDiagram: React.FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  // Flag to force a re-render if needed.
  const [isRendered, setIsRendered] = useState(false);
  // Flag indicating if the chord diagram should render based on the number of unique senders.
  const [shouldRender, setShouldRender] = useState(false);
  // Number of top senders to include in the diagram.
  const [topCount, setTopCount] = useState<number>(10);

  const { t } = useTranslation();

  /**
   * Aggregates chord data from the filtered messages.
   * It counts transitions between consecutive messages (from previous sender to current sender).
   * Returns:
   * - `chordData`: an array of { source, target, value } objects.
   * - `uniqueSenders`: total count of unique participants.
   * - `sortedSenders`: senders sorted in descending order by message count.
   */
  const { chordData, uniqueSenders, sortedSenders } = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const senderCounts = new Map<string, number>();

    // Count messages per sender.
    filteredMessages.forEach((msg) => {
      senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
    });

    // Sort senders in descending order of message count.
    const sortedSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sender]) => sender);

    const validSenders = new Set(sortedSenders);
    if (validSenders.size < MIN_SENDERS) {
      return { chordData: [], uniqueSenders: 0, sortedSenders: [] };
    }

    // Count transitions between consecutive messages for valid senders.
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

    // Flatten the count matrix into an array of chord data.
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

  // Limit the senders based on the top count.
  const topSenders = sortedSenders.slice(0, topCount);
  // Filter chord data to include only transitions between the top senders.
  const filteredChordData = chordData.filter(
    (d) => topSenders.includes(d.source) && topSenders.includes(d.target),
  );

  // Set the default top count based on the number of senders.
  useEffect(() => {
    if (sortedSenders.length > 0) {
      const defaultTop =
        sortedSenders.length > MAX_SENDERS
          ? MAX_SENDERS
          : sortedSenders.length < 10
            ? sortedSenders.length
            : 10;
      setTopCount(defaultTop);
    }
  }, [sortedSenders]);

  // Decide whether to render the chord diagram based on the number of unique senders.
  useEffect(() => {
    setShouldRender(uniqueSenders >= MIN_SENDERS);
  }, [uniqueSenders]);

  /**
   * Main effect to draw or update the chord diagram when chord data, dimensions, theme, or topCount change.
   */
  useEffect(() => {
    if (!dimensions || filteredChordData.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;

    // Get header height if available.
    const header = document.getElementById('chord-diagram-header');
    const headerHeight = header
      ? header.getBoundingClientRect().height +
        parseFloat(getComputedStyle(header).marginTop) +
        parseFloat(getComputedStyle(header).marginBottom)
      : 0;
    const height = dimensions.height - headerHeight;

    const radius = Math.min(width, height) / 2 - 40;
    if (radius <= 0) return;

    // Clear previous drawings.
    svg.selectAll('*').remove();

    // Create a centered group for the diagram.
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Get the list of participants from the chord data.
    const participants = Array.from(
      new Set(filteredChordData.flatMap((d) => [d.source, d.target])),
    );

    // Choose a color scheme based on the theme.
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const colorScale = d3.scaleOrdinal<string>().domain(participants).range(colors);

    // Create a matrix for the chord layout.
    const matrix = Array.from({ length: participants.length }, () =>
      new Array(participants.length).fill(0),
    );

    filteredChordData.forEach(({ source, target, value }) => {
      const sourceIndex = participants.indexOf(source);
      const targetIndex = participants.indexOf(target);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', arc as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', ribbon as any)
      .attr('fill', (d) => colorScale(participants[d.source.index]))
      .attr('stroke', '#000')
      .style('opacity', 1);

    const defs = svg.append('defs');

    group.each(function (d, i) {
      const angleStart = d.startAngle - Math.PI / 2;
      const angleEnd = d.endAngle - Math.PI / 2;
      const largeArcFlag = angleEnd - angleStart > Math.PI ? 1 : 0;
      const xStart = (radius + 17) * Math.cos(angleStart);
      const yStart = (radius + 17) * Math.sin(angleStart);
      const xEnd = (radius + 17) * Math.cos(angleEnd);
      const yEnd = (radius + 17) * Math.sin(angleEnd);
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
      fontSize: '0.9rem',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isHover
        ? darkMode
          ? '#777'
          : '#ddd'
        : window.innerWidth >= 768 && state.isFocused && state.selectProps.menuIsOpen
          ? darkMode
            ? '#555'
            : '#eee'
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
        <span>{t('ChordDiagram.title')}</span>
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

      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg id="chord-diagram-plot" ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default ChordDiagram;
