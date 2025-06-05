////////////// Imports ////////////////
import { FC, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

////////////// Component: MessageSharePieChart ////////////////
/**
 * Displays a pie chart showing the share of messages per participant.
 */
const MessageSharePieChart: FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const { t } = useTranslation();

  // Aggregate message counts per sender
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMessages.forEach((msg) => {
      counts[msg.sender] = (counts[msg.sender] || 0) + 1;
    });
    return Object.entries(counts).map(([sender, count]) => ({ sender, count }));
  }, [filteredMessages]);

  // Color scale for senders
  const color = useMemo(() => {
    const scheme = darkMode ? d3.schemeSet2 : d3.schemeCategory10;
    return d3.scaleOrdinal<string, string>(scheme).domain(data.map((d) => d.sender));
  }, [data, darkMode]);

  // D3 Pie rendering
  useEffect(() => {
    if (!dimensions) return;
    const width = dimensions.width || 0;
    const height = dimensions.height || 0;
    const radius = Math.min(width, height) / 2 - 10;
    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<{ sender: string; count: number }>().value((d) => d.count);
    const arc = d3.arc<d3.PieArcDatum<{ sender: string; count: number }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = g.selectAll('path').data(pie(data)).enter().append('path');
    arcs
      .attr('d', arc as any)
      .attr('fill', (d) => color(d.data.sender))
      .attr('stroke', darkMode ? '#111' : '#fff')
      .attr('stroke-width', 1);

    // Labels
    const labelArc = d3.arc<d3.PieArcDatum<{ sender: string; count: number }>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    g.selectAll('text')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', darkMode ? 'white' : 'black')
      .text((d) => {
        const sender = d.data.sender;
        const label = useShortNames && metadata?.sendersShort[sender]
          ? metadata.sendersShort[sender]
          : sender;
        const percentage = ((d.data.count / d3.sum(data, (dd) => dd.count)) * 100).toFixed(0);
        return `${label} (${percentage}%)`;
      });
  }, [data, dimensions, darkMode, color, metadata, useShortNames]);

  return (
    <div
      id="plot-message-share-pie"
      ref={containerRef}
      className={`border w-full md:min-w-[300px] md:basis-[300px] p-4 flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">
        {t('MessageSharePieChart.title')}
      </h2>
      <div className="flex-grow flex justify-center items-center w-full h-full">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default MessageSharePieChart;

