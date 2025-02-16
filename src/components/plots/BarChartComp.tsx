////////////// Imports ////////////////
import { FC, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Maximize2, Minimize2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

////////////// Constants & Types ////////////////
/** Properties to display on the sender comparison bar chart. */
const properties = [
  { key: 'messageCount', label: 'Number of Messages' },
  { key: 'averageWordsPerMessage', label: 'Avg. Words per Message' },
  { key: 'medianWordsPerMessage', label: 'Median Words per Message' },
  { key: 'totalWordsSent', label: 'Total Words Sent' },
  { key: 'maxWordsInMessage', label: 'Max Words in a Message' },
  { key: 'activeDays', label: 'Active Days' },
  { key: 'uniqueWordsCount', label: 'Unique Words Count' },
  { key: 'averageCharactersPerMessage', label: 'Avg. Characters per Message' },
] as const;

/** Aggregated statistics per sender. */
interface AggregatedStat {
  sender: string;
  messageCount: number;
  averageWordsPerMessage: number;
  medianWordsPerMessage: number;
  totalWordsSent: number;
  maxWordsInMessage: number;
  activeDays: number;
  uniqueWordsCount: number;
  averageCharactersPerMessage: number;
}

/** Minimum bar width (in pixels) for each sender card. */
const MIN_BAR_WIDTH = 80;

////////////// Helper Functions ////////////////
/**
 * Calculates the median value from an array of numbers.
 * @param values - The array of numbers.
 * @returns The median value.
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Aggregates statistics for each sender from the provided messages.
 * Assumes that messages are pre-filtered by the backend.
 * @param messages - Array of chat messages.
 * @returns Array of aggregated statistics per sender.
 */
function aggregateSenderStats(
  messages: { sender: string; message: string; date: Date }[],
): AggregatedStat[] {
  const validMessages = messages;
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

  validMessages.forEach((msg) => {
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
    stats[sender].maxWordsInMessage = Math.max(stats[sender].maxWordsInMessage, words.length);
    words.forEach((word) => stats[sender].uniqueWords.add(word));
    stats[sender].totalCharacters += msg.message.length;
    stats[sender].activeDays.add(new Date(msg.date).toDateString());
  });

  return Object.keys(stats).map((sender) => {
    const data = stats[sender];
    return {
      sender,
      messageCount: data.messageCount,
      averageWordsPerMessage: data.totalWordsSent / data.messageCount,
      medianWordsPerMessage: calculateMedian(data.wordCounts),
      totalWordsSent: data.totalWordsSent,
      maxWordsInMessage: data.maxWordsInMessage,
      activeDays: data.activeDays.size,
      uniqueWordsCount: data.uniqueWords.size,
      averageCharactersPerMessage: data.totalCharacters / data.messageCount,
    };
  });
}

/**
 * Calculates the total height of an element (including vertical margins).
 * @param elementId - The element's id.
 * @returns Total height in pixels.
 */
function getTotalHeightIncludingMargin(elementId: string): number {
  const element = document.getElementById(elementId);
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const marginTop = parseFloat(computedStyle.marginTop) || 0;
  const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
  return rect.height + marginTop + marginBottom;
}

////////////// Component: SenderComparisonBarChart ////////////////
/**
 * SenderComparisonBarChart displays aggregated statistics for each sender as a bar chart.
 * It includes responsive pagination and supports theme changes.
 */
const SenderComparisonBarChart: FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dimensions = useResizeObserver(containerRef);

  // Component State
  const [selectedProperty, setSelectedProperty] = useState<string>(properties[0].key);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  // Compute aggregated statistics per sender.
  const aggregatedStats = useMemo<AggregatedStat[]>(() => {
    return aggregateSenderStats(filteredMessages);
  }, [filteredMessages]);

  // Create a color scale based on sender names.
  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(aggregatedStats.map((d) => d.sender));
  }, [aggregatedStats, darkMode]);

  // Calculate total pages for pagination.
  const totalPages = useMemo(() => {
    if (aggregatedStats.length === 0) return 1;
    return Math.ceil(aggregatedStats.length / itemsPerPage);
  }, [aggregatedStats, itemsPerPage]);

  // Get the current page's data.
  const currentStats = useMemo(() => {
    const sorted = [...aggregatedStats].sort((a, b) => {
      const aValue = a[selectedProperty as keyof AggregatedStat] as number;
      const bValue = b[selectedProperty as keyof AggregatedStat] as number;
      return bValue - aValue;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageStats = sorted.slice(startIndex, startIndex + itemsPerPage);
    if (totalPages > 1 && pageStats.length < itemsPerPage) {
      while (pageStats.length < itemsPerPage) {
        pageStats.push({
          sender: ' ',
          messageCount: 0,
          averageWordsPerMessage: 0,
          medianWordsPerMessage: 0,
          totalWordsSent: 0,
          maxWordsInMessage: 0,
          activeDays: 0,
          uniqueWordsCount: 0,
          averageCharactersPerMessage: 0,
        });
      }
    }
    return pageStats;
  }, [aggregatedStats, currentPage, itemsPerPage, selectedProperty, totalPages]);

  const currentSenders = useMemo(() => currentStats.map((stat) => stat.sender), [currentStats]);

  // Update itemsPerPage when container dimensions or expanded state change.
  useEffect(() => {
    if (containerRef.current && dimensions) {
      const width = dimensions.width || containerRef.current.offsetWidth;
      const newItemsPerPage = Math.max(1, Math.floor(width / MIN_BAR_WIDTH));
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    }
  }, [dimensions, expanded]);

  // D3 Chart Rendering Effect
  useEffect(() => {
    if (!dimensions || currentStats.length === 0) return;
    const svg = d3.select(svgRef.current);
    const width = dimensions.width;
    let height = dimensions.height;

    // Account for header and UI elements.
    const headerHeight = getTotalHeightIncludingMargin('bar-chart-header');
    const propertySelectHeight = getTotalHeightIncludingMargin('property-select');
    const paginationHeight = getTotalHeightIncludingMargin('bar-chart-pagination');
    height = height - headerHeight - propertySelectHeight - paginationHeight;

    const margin = { top: 20, right: 20, bottom: 70, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    const chart = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X scale: band scale based on current statistics.
    const xScale = d3
      .scaleBand<string>()
      .domain(currentStats.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    // Y scale: linear scale based on the selected property.
    const yMax =
      d3.max(currentStats, (d) => d[selectedProperty as keyof AggregatedStat] as number) || 10;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Draw X axis.
    chart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat((_, i) => {
          const sender = currentSenders[i] || '';
          return useShortNames && metadata?.sendersShort[sender]
            ? metadata.sendersShort[sender]
            : sender;
        }),
      )
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    // Draw Y axis.
    const yTicks = Math.max(5, Math.floor(innerHeight / 40));
    chart
      .append('g')
      .call(d3.axisLeft(yScale).ticks(yTicks).tickFormat(d3.format('.2s')))
      .style('font-size', '14px');

    // Draw bars.
    chart
      .selectAll('.bar')
      .data(currentStats)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => xScale(i.toString()) || 0)
      .attr('y', (d) => yScale(d[selectedProperty as keyof AggregatedStat] as number))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) =>
        Math.max(0, innerHeight - yScale(d[selectedProperty as keyof AggregatedStat] as number)),
      )
      .attr('fill', (d) => colorScale(d.sender));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dimensions,
    currentStats,
    selectedProperty,
    darkMode,
    colorScale,
    currentSenders,
    useShortNames,
  ]);

  // Event Handlers
  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  // React-Select custom styles.
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
      marginRight: '4px',
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

  const { t } = useTranslation();

  return (
    <div
      id="plot-sender-comparison"
      ref={containerRef}
      className={`border w-full flex-grow p-4 flex-col ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } ${expanded ? 'md:basis-[3000px]' : 'md:basis-[550px]'}`}
      style={{ minHeight: '500px', maxHeight: '550px', overflow: 'hidden' }}
    >
      {/* Header with property selector and expand/minimize button */}
      <div id="bar-chart-header" className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold flex items-center space-x-0">
          <Select
            value={properties.find((option) => option.key === selectedProperty)}
            onChange={(selected) => setSelectedProperty(selected?.key || properties[0].key)}
            options={properties}
            isSearchable={false}
            styles={customSelectStyles}
          />
        </h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? 'text-white' : 'text-black'
          }`}
          onClick={handleToggleExpand}
          style={{
            background: 'transparent',
            outline: 'none',
            boxShadow: 'none',
            border: 'none',
          }}
        >
          {expanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Chart Rendering */}
      {filteredMessages.length === 0 ? (
        <div className="flex justify-center items-center flex-grow">
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        </div>
      ) : (
        <svg id="bar-chart-plot" ref={svgRef} className="w-full"></svg>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div id="bar-chart-pagination" className="flex justify-center items-center space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`px-2 py-1 border ${
              darkMode ? 'bg-gray-800 text-white' : 'text-black bg-white'
            } ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : ''} focus:outline-none`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className={darkMode ? 'text-white' : 'text-black'}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`px-2 py-1 border ${
              darkMode ? 'bg-gray-800 text-white' : 'text-black bg-white'
            } ${
              currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : ''
            } focus:outline-none`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SenderComparisonBarChart;
