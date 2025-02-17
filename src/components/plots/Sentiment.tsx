////////////// Imports ////////////////
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import Sentiment from 'sentiment';
import { Maximize2, Merge, Minimize2, Split } from 'lucide-react';
import Switch from 'react-switch';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

////////////// Constants & Types ////////////////
/** Valid language codes supported for sentiment analysis. */
const VALID_LANGUAGES = ['de', 'en', 'fr', 'es'] as const;

/** Set to true to test linear interpolation for missing days. */
const INTERPOLATE_MISSING = false;

/** A single data point representing the sentiment score on a specific date. */
interface SentimentDataPoint {
  date: Date;
  score: number;
}

/** Minimal ChatMessage interface (backend already filters messages). */
interface ChatMessage {
  date: Date;
  message: string;
}

////////////// Helper Functions ////////////////
/**
 * Generates a continuous series of dates (day by day) between start and end.
 */
function getDateRange(start: Date, end: Date): Date[] {
  return d3.timeDay.range(start, d3.timeDay.offset(end, 1));
}

/**
 * Fills in missing days in the sorted sentiment data.
 * For days with no data, a neutral score (0) is used.
 * Optionally, linear interpolation can be applied.
 */
function fillMissingDays(
  sortedData: SentimentDataPoint[],
  interpolateMissing: boolean = false,
): SentimentDataPoint[] {
  if (!sortedData.length) return [];
  const filledData: SentimentDataPoint[] = [];
  const firstDate = sortedData[0].date;
  const lastDate = sortedData[sortedData.length - 1].date;
  const allDates = getDateRange(firstDate, lastDate);

  // Create a quick-access Map using date string (YYYY-MM-DD)
  const dataMap = new Map<string, SentimentDataPoint>();
  sortedData.forEach((d) => {
    const key = d.date.toISOString().split('T')[0];
    dataMap.set(key, d);
  });

  allDates.forEach((currentDate) => {
    const key = currentDate.toISOString().split('T')[0];
    if (dataMap.has(key)) {
      filledData.push(dataMap.get(key)!);
    } else {
      if (interpolateMissing) {
        let prev: SentimentDataPoint | null = null;
        let next: SentimentDataPoint | null = null;
        for (let i = sortedData.length - 1; i >= 0; i--) {
          if (sortedData[i].date < currentDate) {
            prev = sortedData[i];
            break;
          }
        }
        for (let i = 0; i < sortedData.length; i++) {
          if (sortedData[i].date > currentDate) {
            next = sortedData[i];
            break;
          }
        }
        if (prev && next) {
          const t =
            (currentDate.getTime() - prev.date.getTime()) /
            (next.date.getTime() - prev.date.getTime());
          const interpolatedScore = prev.score + t * (next.score - prev.score);
          filledData.push({ date: currentDate, score: interpolatedScore });
        } else if (prev) {
          filledData.push({ date: currentDate, score: prev.score });
        } else if (next) {
          filledData.push({ date: currentDate, score: next.score });
        } else {
          filledData.push({ date: currentDate, score: 0 });
        }
      } else {
        filledData.push({ date: currentDate, score: 0 });
      }
    }
  });

  return filledData;
}

/**
 * Applies a moving average smoothing over the sentiment data.
 * For each day, the average score over the window days before and after is calculated.
 */
function smoothData(data: SentimentDataPoint[], window: number): SentimentDataPoint[] {
  if (!data.length) return [];
  return data.map((point, i, arr) => {
    const startIndex = Math.max(0, i - window);
    const endIndex = Math.min(arr.length - 1, i + window);
    const windowSlice = arr.slice(startIndex, endIndex + 1);
    return {
      date: point.date,
      score: d3.mean(windowSlice, (d) => d.score) ?? point.score,
    };
  });
}

/**
 * Splits the sentiment data into segments where the sign of the score remains constant.
 * If a sign change occurs, it calculates an intersection point at score zero.
 */
function splitDataBySign(data: SentimentDataPoint[]): SentimentDataPoint[][] {
  const segments: SentimentDataPoint[][] = [];
  let currentSegment: SentimentDataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    if (currentSegment.length === 0) {
      currentSegment.push(data[i]);
    } else {
      const prev = data[i - 1];
      const curr = data[i];
      if ((prev.score >= 0 && curr.score < 0) || (prev.score < 0 && curr.score >= 0)) {
        const t = (0 - prev.score) / (curr.score - prev.score);
        const intersectDate = new Date(
          prev.date.getTime() + t * (curr.date.getTime() - prev.date.getTime()),
        );
        const intersectPoint: SentimentDataPoint = {
          date: intersectDate,
          score: 0,
        };
        currentSegment.push(intersectPoint);
        segments.push(currentSegment);
        currentSegment = [intersectPoint, curr];
      } else {
        currentSegment.push(curr);
      }
    }
  }
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  return segments;
}

/**
 * Draws the combined sentiment chart into the SVG element.
 * The line is drawn in segments with color changes (green/red) based on the sign.
 */
function drawChart(
  svgRef: React.RefObject<SVGSVGElement>,
  sentimentData: SentimentDataPoint[],
  dimensions: { width: number; height: number },
  darkMode: boolean,
) {
  const { width, height } = dimensions;
  const margin = { top: 20, right: 10, bottom: 70, left: 40 };
  if (window.innerWidth <= 768) {
    margin.right = 20;
    margin.left = 40;
  }
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove();

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
    .range([0, innerWidth]);
  const yExtent = d3.extent(sentimentData, (d) => d.score);
  let yMin = yExtent[0] ?? 0;
  let yMax = yExtent[1] ?? 0;
  if (yMin === yMax) {
    yMin = -1;
    yMax = 1;
  }
  const yAbsMax = Math.max(Math.abs(yMin), Math.abs(yMax)) * 1.1;
  const yScale = d3.scaleLinear().domain([-yAbsMax, yAbsMax]).range([innerHeight, 0]);
  const lineGenerator = d3
    .line<SentimentDataPoint>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.score))
    .curve(d3.curveBasis);
  const g = svg.append('g').attr('transforma', `translate(${margin.left},${margin.top})`);
  const gridColor = darkMode ? '#a0a0a0' : '#e0e0e0';
  const yGrid = g
    .append('g')
    .attr('class', 'y-grid')
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => ''),
    );
  yGrid.selectAll('line').attr('stroke', gridColor);
  const xGrid = g
    .append('g')
    .attr('class', 'x-grid')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(
      d3
        .axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => ''),
    );
  xGrid.selectAll('line').attr('stroke', gridColor);
  g.append('line')
    .attr('class', 'top-border')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', innerWidth)
    .attr('y2', 0)
    .attr('stroke', gridColor)
    .attr('stroke-width', 1);
  g.append('line')
    .attr('class', 'right-border')
    .attr('x1', innerWidth)
    .attr('y1', 0)
    .attr('x2', innerWidth)
    .attr('y2', innerHeight)
    .attr('stroke', gridColor)
    .attr('stroke-width', 1);
  const maxXTicks = Math.floor(innerWidth / 80);
  g.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .transition()
    .duration(500)
    .call(d3.axisBottom(xScale).ticks(maxXTicks))
    .selectAll('text')
    .style('font-size', '14px')
    .attr('dy', '1em')
    .style('text-anchor', 'middle');
  g.append('g')
    .transition()
    .duration(500)
    .call(d3.axisLeft(yScale).ticks(5))
    .style('font-size', '14px');
  g.append('line')
    .attr('x1', 0)
    .attr('y1', yScale(0))
    .attr('x2', innerWidth)
    .attr('y2', yScale(0))
    .attr('stroke', darkMode ? 'white' : 'black')
    .attr('stroke-width', 1);
  // Split the data into segments based on sign changes and draw each segment with color.
  const segments = splitDataBySign(sentimentData);
  segments.forEach((segment) => {
    if (segment.length === 1) {
      return;
    }
    const segmentColor = segment[1].score >= 0 ? 'green' : 'red';
    g.append('path')
      .datum(segment)
      .attr('fill', 'none')
      .attr('stroke', segmentColor)
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);
  });
}

/**
 * Draws two separate sentiment lines: one for positive scores (green) and one for negative scores (red).
 */
function drawChartSplit(
  svgRef: React.RefObject<SVGSVGElement>,
  positiveData: SentimentDataPoint[],
  negativeData: SentimentDataPoint[],
  dimensions: { width: number; height: number },
  darkMode: boolean,
) {
  const { width, height } = dimensions;
  const margin = { top: 20, right: 10, bottom: 70, left: 40 };
  if (window.innerWidth <= 768) {
    margin.right = 20;
    margin.left = 40;
  }
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove();
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(positiveData, (d) => d.date) as [Date, Date])
    .range([0, innerWidth]);
  const allScores = [...positiveData.map((d) => d.score), ...negativeData.map((d) => d.score)];
  let yMin = d3.min(allScores) ?? 0;
  let yMax = d3.max(allScores) ?? 0;
  if (yMin === yMax) {
    yMin = -1;
    yMax = 1;
  }
  const yAbsMax = Math.max(Math.abs(yMin), Math.abs(yMax)) * 1.1;
  const yScale = d3.scaleLinear().domain([-yAbsMax, yAbsMax]).range([innerHeight, 0]);
  const lineGenerator = d3
    .line<SentimentDataPoint>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.score))
    .curve(d3.curveBasis);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const gridColor = darkMode ? '#a0a0a0' : '#e0e0e0';
  const yGrid = g
    .append('g')
    .attr('class', 'y-grid')
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => ''),
    );
  yGrid.selectAll('line').attr('stroke', gridColor);
  const xGrid = g
    .append('g')
    .attr('class', 'x-grid')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(
      d3
        .axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => ''),
    );
  xGrid.selectAll('line').attr('stroke', gridColor);
  g.append('line')
    .attr('class', 'top-border')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', innerWidth)
    .attr('y2', 0)
    .attr('stroke', gridColor)
    .attr('stroke-width', 1);
  g.append('line')
    .attr('class', 'right-border')
    .attr('x1', innerWidth)
    .attr('y1', 0)
    .attr('x2', innerWidth)
    .attr('y2', innerHeight)
    .attr('stroke', gridColor)
    .attr('stroke-width', 1);
  const maxXTicks = Math.floor(innerWidth / 80);
  g.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .transition()
    .duration(500)
    .call(d3.axisBottom(xScale).ticks(maxXTicks))
    .selectAll('text')
    .style('font-size', '14px')
    .attr('dy', '1em')
    .style('text-anchor', 'middle');
  g.append('g')
    .transition()
    .duration(500)
    .call(d3.axisLeft(yScale).ticks(5))
    .style('font-size', '14px');
  g.append('line')
    .attr('x1', 0)
    .attr('y1', yScale(0))
    .attr('x2', innerWidth)
    .attr('y2', yScale(0))
    .attr('stroke', darkMode ? 'white' : 'black')
    .attr('stroke-width', 1);
  // Draw positive sentiment line (green)
  g.append('path')
    .datum(positiveData)
    .attr('fill', 'none')
    .attr('stroke', 'green')
    .attr('stroke-width', 3)
    .attr('d', lineGenerator);
  // Draw negative sentiment line (red)
  g.append('path')
    .datum(negativeData)
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 3)
    .attr('d', lineGenerator);
}

////////////// Main Component: SentimentAnalysis ////////////////
/**
 * Renders a chart showing daily sentiment over time.
 * It computes three datasets on load:
 * - combinedData: Total sentiment per day (sum of all word scores) with one line that varies in color based on sign.
 * - positiveData: Daily sum of only positive word scores.
 * - negativeData: Daily sum of only negative word scores.
 *
 * Depending on the boolean `splitMode`, either the combined chart or the separated chart is displayed.
 */
const SentimentAnalysis: React.FC = () => {
  const { filteredMessages, darkMode, metadata } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dimensions = useResizeObserver(containerRef);
  // splitMode controls whether the combined chart (false) or the split chart (true) is displayed.
  const [splitMode, setSplitMode] = useState(false);
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);

  // Load the appropriate AFINN lexicon based on metadata language.
  useEffect(() => {
    if (!metadata || !metadata.language) return;
    const langToLoad = VALID_LANGUAGES.includes(metadata.language as 'de' | 'en' | 'fr' | 'es')
      ? metadata.language
      : 'en';
    import(`../../assets/afinn/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
      })
      .catch((error) => {
        console.error(`Error loading AFINN-${langToLoad}.json:`, error);
      });
  }, [metadata]);

  // Register the language with the sentiment analyzer.
  useEffect(() => {
    if (!metadata || !metadata.language) return;
    if (Object.keys(afinn).length === 0) return;
    const langToUse = VALID_LANGUAGES.includes(metadata.language as 'de' | 'en' | 'fr' | 'es')
      ? metadata.language
      : 'en';
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });
    try {
      sentimentAnalyzer.analyze('Test', { language: langToUse });
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [metadata, afinn, sentimentAnalyzer]);

  /**
   * Computes three datasets:
   * - combinedData: Total sentiment per day (sum of all word scores).
   * - positiveData: Sum of positive word scores per day.
   * - negativeData: Sum of negative word scores per day.
   *
   * Missing days are filled (with optional interpolation) and a moving average is applied.
   */
  const { combinedData, positiveData, negativeData } = useMemo<{
    combinedData: SentimentDataPoint[];
    positiveData: SentimentDataPoint[];
    negativeData: SentimentDataPoint[];
  }>(() => {
    if (!metadata?.language || !isLanguageRegistered)
      return { combinedData: [], positiveData: [], negativeData: [] };
    const langToUse = VALID_LANGUAGES.includes(metadata.language as 'de' | 'en' | 'fr' | 'es')
      ? metadata.language
      : 'en';
    const dailyCombined: Record<string, { totalScore: number }> = {};
    const dailyPositive: Record<string, { totalScore: number }> = {};
    const dailyNegative: Record<string, { totalScore: number }> = {};
    (filteredMessages as ChatMessage[]).forEach((msg) => {
      const dateKey = new Date(msg.date).toISOString().split('T')[0];
      if (!dailyCombined[dateKey]) {
        dailyCombined[dateKey] = { totalScore: 0 };
        dailyPositive[dateKey] = { totalScore: 0 };
        dailyNegative[dateKey] = { totalScore: 0 };
      }
      try {
        const result = sentimentAnalyzer.analyze(msg.message, {
          language: langToUse,
        });
        dailyCombined[dateKey].totalScore += result.score;
        // Directly calculate positive and negative scores using the AFINN lexicon.
        const words = msg.message.split(/\s+/);
        let posScore = 0;
        let negScore = 0;
        words.forEach((word) => {
          const cleaned = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
          const score = afinn[cleaned] || 0;
          if (score > 0) {
            posScore += score;
          } else if (score < 0) {
            negScore += score;
          }
        });
        dailyPositive[dateKey].totalScore += posScore;
        dailyNegative[dateKey].totalScore += negScore;
      } catch (error) {
        console.error(`Error analyzing message with language ${langToUse}:`, error);
      }
    });
    const combinedRawData: SentimentDataPoint[] = Object.entries(dailyCombined)
      .map(([date, { totalScore }]) => ({
        date: new Date(date),
        score: totalScore,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const positiveRawData: SentimentDataPoint[] = Object.entries(dailyPositive)
      .map(([date, { totalScore }]) => ({
        date: new Date(date),
        score: totalScore,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const negativeRawData: SentimentDataPoint[] = Object.entries(dailyNegative)
      .map(([date, { totalScore }]) => ({
        date: new Date(date),
        score: totalScore,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!combinedRawData.length) return { combinedData: [], positiveData: [], negativeData: [] };
    const filledCombined = fillMissingDays(combinedRawData, INTERPOLATE_MISSING);
    const filledPositive = fillMissingDays(positiveRawData, INTERPOLATE_MISSING);
    const filledNegative = fillMissingDays(negativeRawData, INTERPOLATE_MISSING);
    const windowSize = filledCombined.length / 50;
    const smoothedCombined = smoothData(filledCombined, windowSize);
    const smoothedPositive = smoothData(filledPositive, windowSize);
    const smoothedNegative = smoothData(filledNegative, windowSize);
    return {
      combinedData: smoothedCombined,
      positiveData: smoothedPositive,
      negativeData: smoothedNegative,
    };
  }, [filteredMessages, metadata, isLanguageRegistered, sentimentAnalyzer, afinn]);

  // Draw chart based on splitMode (combined vs. separate lines).
  useEffect(() => {
    if (!dimensions) return;
    if (!combinedData.length) return;
    if (splitMode) {
      drawChartSplit(svgRef, positiveData, negativeData, dimensions, darkMode);
    } else {
      drawChart(svgRef, combinedData, dimensions, darkMode);
    }
  }, [dimensions, combinedData, positiveData, negativeData, darkMode, splitMode]);

  const { t } = useTranslation();

  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } w-full md:min-w-[500px] ${
        expanded ? 'md:basis-[3000px]' : 'md:basis-[500px]'
      } p-4 px-0 md:p-4 flex-grow flex flex-col`}
      style={{
        position: 'relative',
        minHeight: '400px',
        maxHeight: '550px',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center justify-between px-4 md:px-0 mb-4">
        <h2
          className={`text-base md:text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}
        >
          {t('Sentiment.title')}
        </h2>
        <div className="flex flex-row">
          <Split
            className={`hidden md:inline-block ${
              darkMode ? 'text-white' : 'text-gray-700'
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                setSplitMode(!splitMode);
              }}
              checked={!splitMode}
              offColor={darkMode ? '#444' : '#ccc'}
              onColor="#000"
              uncheckedIcon={false}
              checkedIcon={false}
              height={20}
              width={48}
              handleDiameter={16}
              borderRadius={20}
              boxShadow="none"
              activeBoxShadow="none"
              className="custom-switch"
            />
          </div>
          <button
            onClick={() => {
              setSplitMode(!splitMode);
            }}
            className={`md:hidden p-2 rounded-none border ${
              darkMode ? 'border-white bg-gray-700' : 'border-black bg-white'
            }`}
          >
            {!splitMode ? (
              <Split className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-gray-700'}`} />
            ) : (
              <Merge className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-gray-700'}`} />
            )}
          </button>
          <Merge
            className={`hidden md:inline-block ${
              darkMode ? 'text-white' : 'text-gray-700'
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <button
            className={`ml-0 md:ml-4 md:flex items-center justify-center p-0 border-none focus:outline-none ${
              darkMode ? 'text-white' : 'text-black'
            }`}
            onClick={() => {
              setExpanded(!expanded);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 200);
            }}
            style={{
              background: 'transparent',
              outline: 'none',
              boxShadow: 'none',
              border: 'none',
            }}
          >
            {expanded ? (
              <Minimize2 className="hidden md:block w-5 h-5" />
            ) : (
              <Maximize2 className="hidden md:block w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      <div className="flex-grow flex justify-center items-center max-h-full">
        {combinedData.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg id="sentiment-plot" ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis;
