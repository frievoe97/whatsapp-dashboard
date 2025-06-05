//////////////// Imports //////////////////
import { FC, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

//////////////// Types //////////////////
interface BoxPlotStats {
  sender: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

//////////////// Helper //////////////////
function computeBoxPlotStats(messages: { sender: string; message: string }[]): BoxPlotStats[] {
  const map: Record<string, number[]> = {};
  messages.forEach((msg) => {
    const length = msg.message.split(/\s+/).filter((w) => w.length > 0).length;
    if (!map[msg.sender]) map[msg.sender] = [];
    map[msg.sender].push(length);
  });
  return Object.entries(map).map(([sender, arr]) => {
    const values = arr.sort((a, b) => a - b);
    const q1 = d3.quantile(values, 0.25) ?? 0;
    const median = d3.quantile(values, 0.5) ?? 0;
    const q3 = d3.quantile(values, 0.75) ?? 0;
    const min = d3.min(values) ?? 0;
    const max = d3.max(values) ?? 0;
    return { sender, min, q1, median, q3, max };
  });
}

//////////////// Component //////////////////
const BoxPlot: FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dimensions = useResizeObserver(containerRef);
  const { t } = useTranslation();

  const stats = useMemo(() => computeBoxPlotStats(filteredMessages), [filteredMessages]);

  // Draw plot
  useMemo(() => {
    if (!dimensions) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 70, left: 40 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand<string>()
      .domain(stats.map((d) => d.sender))
      .range([0, width])
      .padding(0.3);
    const yMax = d3.max(stats, (d) => d.max) ?? 10;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    const color = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const colorScale = d3.scaleOrdinal<string, string>(color).domain(stats.map((d) => d.sender));

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((sender) =>
        useShortNames && metadata?.sendersShort[sender] ? metadata.sendersShort[sender] : sender,
      );
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis as unknown as d3.Axis<any>)
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');

    const yTicks = Math.max(5, Math.floor(height / 40));
    g.append('g').call(d3.axisLeft(yScale).ticks(yTicks));

    const boxWidth = Math.min(40, xScale.bandwidth());

    const groups = g.selectAll('g.box').data(stats).enter().append('g').attr('class', 'box');

    groups
      .append('line')
      .attr('x1', (d) => (xScale(d.sender) || 0) + xScale.bandwidth() / 2)
      .attr('x2', (d) => (xScale(d.sender) || 0) + xScale.bandwidth() / 2)
      .attr('y1', (d) => yScale(d.min))
      .attr('y2', (d) => yScale(d.max))
      .attr('stroke', (d) => colorScale(d.sender));

    groups
      .append('rect')
      .attr('x', (d) => (xScale(d.sender) || 0) + xScale.bandwidth() / 2 - boxWidth / 2)
      .attr('y', (d) => yScale(d.q3))
      .attr('width', boxWidth)
      .attr('height', (d) => yScale(d.q1) - yScale(d.q3))
      .attr('fill', (d) => colorScale(d.sender))
      .attr('opacity', 0.6);

    groups
      .append('line')
      .attr('x1', (d) => (xScale(d.sender) || 0) + xScale.bandwidth() / 2 - boxWidth / 2)
      .attr('x2', (d) => (xScale(d.sender) || 0) + xScale.bandwidth() / 2 + boxWidth / 2)
      .attr('y1', (d) => yScale(d.median))
      .attr('y2', (d) => yScale(d.median))
      .attr('stroke', 'black');
  }, [stats, dimensions, darkMode, metadata, useShortNames]);

  return (
    <div
      id="boxplot-container"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">{t('BoxPlot.title')}</h2>
      {filteredMessages.length === 0 || stats.length === 0 ? (
        <div className="flex justify-center items-center flex-grow">
          <span className="text-base md:text-lg">{t('General.noDataAvailable')}</span>
        </div>
      ) : (
        <svg id="boxplot-chart" ref={svgRef} className="w-full"></svg>
      )}
    </div>
  );
};

export default BoxPlot;
