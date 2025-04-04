////////////// Imports ////////////////
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { ChatMessage } from '../../types/chatTypes';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../../i18n';
import { getCustomSelectStyles, LOCALES } from '../../config/constants';
import i18n from '../../../i18n';

////////////// Types ////////////////

// Define a type alias for valid category keys
type CategoryKey = 'Year' | 'Month' | 'Weekday' | 'Hour';

////////////// Constants & Types ////////////////

/** Valid categories for filtering the heatmap data using canonical keys. */
const CATEGORIES: Record<CategoryKey, string[]> = {
  Year: [], // Dynamically filled with message years
  Month: LOCALES[i18n.language].monthShort,
  Weekday: LOCALES[i18n.language].weekdaysShort,
  Hour: Array.from({ length: 24 }, (_, i) => i.toString()),
  // Day: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
};

/**
 * Converts a Date object to a corresponding string value based on a given canonical category.
 * @param date The date to convert.
 * @param category The canonical category (e.g., "Year", "Month", "Weekday", "Hour", "Day").
 * @param validValues Array of valid values for the category.
 * @param time The time string (used for "Hour" category).
 * @returns The corresponding string value or undefined.
 */
function getDateValue(
  date: Date,
  category: CategoryKey,
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
    // case 'Day':
    //   return validValues[date.getDate() - 1];
    default:
      return undefined;
  }
}

////////////// Main Component: Heatmap ////////////////
/**
 * Displays a D3-based heatmap visualizing message frequency along two categorical axes.
 * The user can switch categories via dropdowns and swap the axes using the refresh icon.
 */
const Heatmap: FC = () => {
  // Context and hooks
  const { filteredMessages, darkMode } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const { t } = useTranslation();

  // Mapping of canonical keys to localized labels based on current locale.
  const categoryLabels: Record<CategoryKey, string> = {
    Hour: LOCALES[i18n.language].interval[0],
    // Day: LOCALES[i18n.language].interval[1],
    Month: LOCALES[i18n.language].interval[2],
    Year: LOCALES[i18n.language].interval[3],
    Weekday: LOCALES[i18n.language].interval[4],
  };

  // State for category selection and rotation using canonical keys.
  const [xCategory, setXCategory] = useState<CategoryKey>('Hour');
  const [yCategory, setYCategory] = useState<CategoryKey>('Weekday');
  const [, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);
  const [rotation, setRotation] = useState(0);

  // Handler to swap the x and y categories and update rotation for animation.
  const handleClick = () => {
    swapXAndYCategories();
    setRotation((prev) => prev + 180);
  };

  /**
   * Swaps the x and y category selections.
   */
  function swapXAndYCategories() {
    const temp = xCategory;
    setXCategory(yCategory);
    setYCategory(temp);
  }

  // Derived data: extract years from filteredMessages and update the "Year" category dynamically.
  const years = useMemo(() => {
    return Array.from(
      new Set(filteredMessages.map((msg: ChatMessage) => new Date(msg.date).getFullYear())),
    )
      .sort((a, b) => a - b)
      .map(String);
  }, [filteredMessages]);

  // Update the CATEGORIES object for "Year" dynamically.
  const dynamicCategories = useMemo<Record<CategoryKey, string[]>>(
    () => ({
      ...CATEGORIES,
      Year: years.length > 0 ? years : ['2024'],
    }),
    [years],
  );

  // Aggregate message data into objects { x, y, count } for the heatmap.
  const aggregatedData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};

    // Initialize all combinations for x and y categories.
    dynamicCategories[xCategory].forEach((xVal) => {
      dataMap[xVal] = {};
      dynamicCategories[yCategory].forEach((yVal) => {
        dataMap[xVal][yVal] = 0;
      });
    });

    // Count messages for each combination.
    filteredMessages.forEach((msg: ChatMessage) => {
      const date = new Date(msg.date);
      const time = (msg as ChatMessage).time || '00:00';
      const xValue = getDateValue(date, xCategory, dynamicCategories[xCategory], time);
      const yValue = getDateValue(date, yCategory, dynamicCategories[yCategory], time);
      if (xValue && yValue) {
        dataMap[xValue][yValue] += 1;
      }
    });

    // Flatten the data into an array.
    return dynamicCategories[xCategory].flatMap((xVal) =>
      dynamicCategories[yCategory].map((yVal) => ({
        x: xVal,
        y: yVal,
        count: dataMap[xVal][yVal],
      })),
    );
  }, [filteredMessages, xCategory, yCategory, dynamicCategories]);

  // -------------
  // Effects
  // -------------
  // Create a tooltip element in the container if it doesn't exist.
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
        .style('max-width', '200px');
    }
  }, []);

  // Update tooltip styling based on dark mode.
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current)
      .select<HTMLDivElement>('.tooltip')
      .style('background', darkMode ? '#333' : '#fff')
      .style('color', darkMode ? '#fff' : '#000');
  }, [darkMode]);

  // Update desktop state on dimensions change.
  useEffect(() => {
    if (!dimensions) return;
    setIsDesktop(window.innerWidth >= 768);
  }, [dimensions]);

  // Draw the heatmap using D3 whenever relevant data or dimensions change.
  useEffect(() => {
    if (!dimensions) return;
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
      .domain(dynamicCategories[xCategory])
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(dynamicCategories[yCategory])
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
  }, [aggregatedData, dimensions, darkMode, xCategory, yCategory, dynamicCategories]);

  // -------------
  // Rendering
  // -------------
  return (
    <div
      ref={containerRef}
      className={`relative border-[1px] ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } w-full p-4 pl-0 md:pl-4 pt-2 md:pt-4 flex min-h-[400px] md:min-h-[400px] flex-col`}
    >
      {/* Title and Category Selectors */}
      <div className="flex flex-row justify-between items-center w-full pl-4 md:pl-0 mb-2 md:mb-4 ">
        <h2 className="text-sm md:text-lg font-semibold flex items-center space-x-0">
          <span>{t('Heatmap.title')}</span>
          <Select
            value={{ value: xCategory, label: categoryLabels[xCategory] }}
            onChange={(selected) => setXCategory((selected?.value as CategoryKey) || 'Hour')}
            options={(Object.keys(dynamicCategories) as CategoryKey[])
              .filter((cat) => cat !== yCategory)
              .map((cat) => ({ value: cat, label: categoryLabels[cat] }))}
            isSearchable={false}
            styles={getCustomSelectStyles(darkMode)}
          />
          <span>&</span>
          <Select
            value={{ value: yCategory, label: categoryLabels[yCategory] }}
            onChange={(selected) => setYCategory((selected?.value as CategoryKey) || 'Weekday')}
            isSearchable={false}
            options={(Object.keys(dynamicCategories) as CategoryKey[])
              .filter((cat) => cat !== xCategory)
              .map((cat) => ({ value: cat, label: categoryLabels[cat] }))}
            styles={getCustomSelectStyles(darkMode)}
          />
        </h2>
        <RefreshCw
          onClick={handleClick}
          className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-700"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>

      {/* Heatmap Visualization */}
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
