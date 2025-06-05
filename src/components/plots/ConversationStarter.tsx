import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

interface StarterCount {
  sender: string;
  display: string;
  count: number;
}

const LONG_PAUSE_MS = 6 * 60 * 60 * 1000; // 6 hours

const ConversationStarter: React.FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const starterData: StarterCount[] = useMemo(() => {
    if (!filteredMessages.length) return [];
    const sorted = [...filteredMessages].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const counts: Record<string, number> = {};
    sorted.forEach((msg, i) => {
      if (
        i === 0 ||
        new Date(msg.date).getTime() - new Date(sorted[i - 1].date).getTime() > LONG_PAUSE_MS
      ) {
        counts[msg.sender] = (counts[msg.sender] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([sender, count]) => ({
        sender,
        display:
          useShortNames && metadata?.sendersShort[sender] ? metadata.sendersShort[sender] : sender,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredMessages, useShortNames, metadata]);

  const colorScale = useMemo(() => {
    const senders = starterData.map((d) => d.sender);
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const scale = new Map<string, string>();
    senders.forEach((s, i) => scale.set(s, colors[i % colors.length]));
    return scale;
  }, [starterData, darkMode]);

  useEffect(() => {
    if (!dimensions || !svgRef.current) return;
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleBand<string>()
      .domain(starterData.map((d) => d.display))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(starterData, (d) => d.count) || 0])
      .nice()
      .range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g').call(d3.axisLeft(yScale).ticks(5));
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');

    g.selectAll('rect')
      .data(starterData)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.display) || 0)
      .attr('y', (d) => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.count))
      .attr('fill', (d) => colorScale.get(d.sender) || '#000');
  }, [starterData, dimensions, colorScale]);

  const { t } = useTranslation();

  return (
    <div
      id="plot-conversation-starters"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">
        {t('ConversationStarter.title')}
      </h2>
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg id="conversation-starter-plot" ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default ConversationStarter;
