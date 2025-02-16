import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { ChatMessage } from '../../types/chatTypes';

import { RefreshCw } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import '../../../i18n';

/**
 * HeatmapProps is an empty interface here but can be extended
 * if you need to pass down props to the Heatmap component.
 */
// interface HeatmapProps {}

/**
 * This component displays a D3-based heatmap that visualizes
 * the frequency of messages along two categorical axes (e.g., Hour vs. Weekday).
 * It allows the user to switch the categories via react-select dropdowns.
 */
const Heatmap: FC = () => {
  // -------------
  // Context & Hooks
  // -------------
  // Verwende nun ausschließlich "filteredMessages" und "darkMode".
  const { filteredMessages, darkMode } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Custom Hook für Container-Dimensionen.
  const dimensions = useResizeObserver(containerRef);

  // -------------
  // State
  // -------------
  const [xCategory, setXCategory] = useState<string>('Hour');
  const [yCategory, setYCategory] = useState<string>('Weekday');
  const [, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);
  // Direkt bei den anderen useState-Deklarationen

  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    swapXAndYCategories();
    setRotation((prev) => prev + 180);
  };

  function swapXAndYCategories() {
    const temp = xCategory;
    setXCategory(yCategory);
    setYCategory(temp);
  }

  // -------------
  // Derived Data
  // -------------
  // Berechne die Jahre aus den filteredMessages.
  const years = Array.from(
    new Set(filteredMessages.map((msg: ChatMessage) => new Date(msg.date).getFullYear())),
  )
    .sort((a, b) => a - b)
    .map(String);

  /**
   * Definiert die verfügbaren Kategorien und deren Reihenfolge.
   */
  const CATEGORIES: Record<string, string[]> = useMemo(
    () => ({
      Year: years.length > 0 ? years : ['2024'],
      Month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      Weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      Hour: Array.from({ length: 24 }, (_, i) => i.toString()),
      Day: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    }),
    [years],
  );

  /**
   * Aggregiert die Nachrichten aus filteredMessages zu einem Array
   * von Objekten { x, y, count } für die D3-Visualisierung.
   */
  const aggregatedData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};

    // Initialisiere alle Kombinationen für X- und Y-Kategorien.
    CATEGORIES[xCategory].forEach((xVal) => {
      dataMap[xVal] = {};
      CATEGORIES[yCategory].forEach((yVal) => {
        dataMap[xVal][yVal] = 0;
      });
    });

    // Zähle die Nachrichten in filteredMessages.
    filteredMessages.forEach((msg: ChatMessage) => {
      const date = new Date(msg.date);
      const time = msg.time;
      const xValue = getDateValue(date, xCategory, CATEGORIES[xCategory], time);
      const yValue = getDateValue(date, yCategory, CATEGORIES[yCategory], time);
      if (xValue && yValue) {
        dataMap[xValue][yValue] += 1;
      }
    });

    // Flache den Datenbaum zu einem Array ab.
    return CATEGORIES[xCategory].flatMap((xVal) =>
      CATEGORIES[yCategory].map((yVal) => ({
        x: xVal,
        y: yVal,
        count: dataMap[xVal][yVal],
      })),
    );
  }, [filteredMessages, xCategory, yCategory, CATEGORIES]);

  /**
   * Hilfsfunktion, die ein Date-Objekt anhand einer Kategorie (z.B. "Month", "Hour")
   * in einen entsprechenden String konvertiert.
   */
  function getDateValue(
    date: Date,
    category: string,
    validValues: string[],
    time: string,
  ): string | undefined {
    switch (category) {
      case 'Year':
        return String(date.getFullYear());
      case 'Month':
        return validValues[date.getMonth()];
      case 'Weekday':
        return validValues[(date.getDay() + 6) % 7];
      case 'Hour':
        return validValues[Number(time.split(':')[0])];
      case 'Day':
        return validValues[date.getDate() - 1];
      default:
        return undefined;
    }
  }

  // -------------
  // Effects
  // -------------

  useEffect(() => {
    if (!containerRef.current) return;
    const tooltipSelection = d3.select(containerRef.current).select<HTMLDivElement>('.tooltip');
    if (tooltipSelection.empty()) {
      d3.select(containerRef.current)
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('z-index', '1000')
        .style('padding', '6px')
        .style('border', '1px solid #999')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        // Optional: Damit es auf Smartphones nicht zu groß wird:
        .style('max-width', '200px');
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>('.tooltip')
      .style('background', darkMode ? '#333' : '#fff')
      .style('color', darkMode ? '#fff' : '#000');
  }, [darkMode]);

  useEffect(() => {
    if (!dimensions) return;
    setIsDesktop(window.innerWidth >= 768);
  }, [dimensions]);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    const margin = {
      top: 0,
      right: 0,
      bottom: 70,
      left: window.innerWidth >= 768 ? 30 : 40,
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .style('font-size', '14px')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(CATEGORIES[xCategory])
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(CATEGORIES[yCategory])
      .range([0, innerHeight])
      .padding(0.05);

    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1;

    const colorScale = d3
      .scaleSequential(darkMode ? d3.interpolateGnBu : d3.interpolateOrRd)
      .domain([0, maxCount]);

    g.selectAll('.cell')
      .data(aggregatedData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d) => xScale(d.x) ?? 0)
      .attr('y', (d) => yScale(d.y) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => colorScale(d.count))
      .on('mouseover', function (_, d) {
        d3.select(containerRef.current)
          .select('.tooltip')
          .style('display', 'block')
          .html(`<strong>${d.x} & ${d.y}</strong><br>Count: ${d.count}`);
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event);
        d3.select(containerRef.current)
          .select('.tooltip')
          .style('left', `${x + 10}px`)
          .style('top', `${y + 10}px`);
      })
      .on('mouseout', function () {
        d3.select(containerRef.current).select('.tooltip').style('display', 'none');
      });

    const tickCountX = Math.max(2, Math.floor(innerWidth / 30));
    const tickCountY = Math.max(2, Math.floor(innerHeight / 50));

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .style('font-size', '14px')
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(0)
          .tickValues(
            xScale
              .domain()
              .filter((_, i) => i % Math.ceil(xScale.domain().length / tickCountX) === 0),
          ),
      );

    g.append('g')
      .style('font-size', '14px')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(0)
          .tickValues(
            yScale
              .domain()
              .filter((_, i) => i % Math.ceil(yScale.domain().length / tickCountY) === 0),
          ),
      );
  }, [aggregatedData, dimensions, darkMode, xCategory, yCategory, CATEGORIES]);

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

  const { t } = useTranslation();

  // -------------
  // RENDERING
  // -------------
  return (
    <div
      ref={containerRef}
      className={`relative border-[1px] ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } w-full p-4 pl-0 md:pl-4 flex min-h-[400px] md:min-h-[400px] flex-col`}
    >
      {/* Title and Category Selectors */}
      <div className="flex flex-row justify-between items-center w-full pl-4 md:pl-0 mb-4 ">
        <h2 className="text-base md:text-lg font-semibold flex items-center space-x-0">
          <span>{t('Heatmap.title')}</span>
          <Select
            value={{ value: xCategory, label: xCategory }}
            onChange={(selected) => setXCategory(selected?.value || 'Weekday')}
            options={Object.keys(CATEGORIES)
              .filter((cat) => cat !== yCategory)
              .map((cat) => ({ value: cat, label: cat }))}
            isSearchable={false}
            styles={customSelectStyles}
          />
          <span>&</span>
          <Select
            value={{ value: yCategory, label: yCategory }}
            onChange={(selected) => setYCategory(selected?.value || 'Weekday')}
            isSearchable={false}
            options={Object.keys(CATEGORIES)
              .filter((cat) => cat !== xCategory)
              .map((cat) => ({ value: cat, label: cat }))}
            styles={customSelectStyles}
          />
        </h2>
        <RefreshCw
          onClick={handleClick}
          className="w-5 h-5 transition-transform duration-700"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>

      {/* Heatmap Body */}
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg id="heatmap-plot" ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default Heatmap;
