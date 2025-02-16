import React, { useEffect, useRef, useMemo, useState, RefObject } from 'react';
import * as d3 from 'd3';
import { Hash, Percent, Maximize2, Minimize2, Split, Merge } from 'lucide-react';
import Switch from 'react-switch';
import { useChat } from '../../context/ChatContext';
import { ChatMessage, ChatMetadata } from '../../types/chatTypes';
import useResizeObserver from '../../hooks/useResizeObserver';

interface TimeDataPoint {
  date: Date;
  count: number;
  percentage?: number;
}

interface TimeAggregatedData {
  sender: string;
  values: TimeDataPoint[];
}

type Mode = 'year' | 'month';

function getTimeCategories(mode: Mode, messages: ChatMessage[]): string[] {
  if (messages.length === 0) return [];
  const dates = messages.map((msg) => new Date(msg.date));
  const minDate = d3.min(dates)!;
  const maxDate = d3.max(dates)!;

  if (mode === 'year') {
    // Definiere den Start des ersten Jahres und den Beginn des Jahres nach dem letzten Datum
    const startYear = new Date(minDate.getFullYear(), 0, 1);
    const endYear = new Date(maxDate.getFullYear() + 1, 0, 1);
    // Generiere eine durchgehende Liste aller Jahre zwischen startYear (inkl.) und endYear (exkl.)
    return d3.timeYear.range(startYear, endYear).map((date) => date.getFullYear().toString());
  } else {
    // Für den "month"-Modus: Definiere den ersten Tag des Startmonats und einen Monat nach dem letzten Monat
    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = d3.timeMonth.offset(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1), 1);
    // Erzeuge eine Liste aller Monate im Format "YYYY-MM"
    return d3.timeMonth.range(startMonth, endMonth).map((date) => d3.timeFormat('%Y-%m')(date));
  }
}

function getCategoryFromMessage(msg: ChatMessage, mode: Mode): string {
  const date = new Date(msg.date);
  if (mode === 'year') {
    return date.getFullYear().toString();
  } else {
    return d3.timeFormat('%Y-%m')(date);
  }
}

function aggregateTimeMessages(
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  showPercentage: boolean,
): TimeAggregatedData[] {
  if (messages.length === 0) return [];
  const dataMap: { [sender: string]: { [category: string]: number } } = {};
  messages.forEach((msg) => {
    const sender = msg.sender;
    const category = getCategoryFromMessage(msg, mode);
    if (!dataMap[sender]) {
      dataMap[sender] = {};
      categories.forEach((cat) => {
        dataMap[sender][cat] = 0;
      });
    }
    dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
  });
  const result: TimeAggregatedData[] = Object.keys(dataMap).map((sender) => {
    const values = categories.map((cat) => {
      let date: Date;
      if (mode === 'year') {
        date = new Date(parseInt(cat), 0, 1);
      } else {
        const [year, month] = cat.split('-').map(Number);
        date = new Date(year, (month || 1) - 1, 1);
      }
      return { date, count: dataMap[sender][cat] || 0 };
    });
    // console.log({ sender, values });
    return { sender, values };
  });
  if (showPercentage) {
    return result.map(({ sender, values }) => {
      const total = d3.sum(values, (v) => v.count);
      return {
        sender,
        values: values.map((v) => ({
          ...v,
          percentage: total > 0 ? (v.count / total) * 100 : 0,
        })),
      };
    });
  } else {
    // console.log(result);
    return result;
  }
}

function getTotalHeightIncludingMargin(elementId: string): number {
  const element = document.getElementById(elementId);
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const marginTop = parseFloat(computedStyle.marginTop) || 0;
  const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
  return rect.height + marginTop + marginBottom;
}

function useTimelineChart(
  svgRef: RefObject<SVGSVGElement>,
  containerRef: RefObject<HTMLDivElement>,
  dimensions: { width: number; height: number } | undefined,
  aggregatedData: TimeAggregatedData[],
  mergedData: TimeAggregatedData[],
  mode: Mode,
  showPercentage: boolean,
  darkMode: boolean,
  startDate: Date | undefined,
  endDate: Date | undefined,
  setMode: React.Dispatch<React.SetStateAction<Mode>>,
  setUniqueYearsLessThanThree: React.Dispatch<React.SetStateAction<boolean>>,
  showMerged: boolean,
  useShortNames: boolean,
  metadata: ChatMetadata | null,
): void {
  // Ref zum Speichern des vorherigen Modes, um einen Modewechsel zu erkennen
  const prevModeRef = useRef<Mode>(mode);

  useEffect(() => {
    if (!dimensions || aggregatedData.length === 0) return;
    const fallbackDate = new Date(2000, 0, 1);
    const filteredData = (showMerged ? mergedData : aggregatedData).map((d) => ({
      sender: d.sender,
      values: d.values.filter((v) => {
        if (mode === 'year') {
          const startYear = startDate ? startDate.getFullYear() : -Infinity;
          const endYear = endDate ? endDate.getFullYear() : Infinity;
          return v.date.getFullYear() >= startYear && v.date.getFullYear() <= endYear;
        } else {
          const startMonth = startDate
            ? new Date(startDate.getFullYear(), startDate.getMonth(), 1)
            : null;
          const endMonth = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), 1) : null;
          if (startMonth && v.date < startMonth) return false;
          if (endMonth && v.date > endMonth) return false;
          return true;
        }
      }),
    }));
    const filteredDates = filteredData.flatMap((d) => d.values.map((v) => v.date));
    const minDate = d3.min(filteredDates) || fallbackDate;
    const maxDate = d3.max(filteredDates) || new Date();
    let computedStartDate: Date;
    let computedEndDate: Date;
    if (mode === 'year') {
      computedStartDate = new Date(minDate.getFullYear(), 0, 1);
      computedEndDate = new Date(maxDate.getFullYear(), 0, 1);
    } else {
      computedStartDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      computedEndDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    }
    const uniqueYears = new Set(filteredDates.map((date) => date.getFullYear()));
    const hasLessThanThreeYears = uniqueYears.size < 3;
    setUniqueYearsLessThanThree(hasLessThanThreeYears);
    if (hasLessThanThreeYears) {
      setMode('month');
    }
    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    if (window.innerWidth <= 768) {
      margin.right = 20;
      margin.left = 40;
    }
    const headerHeight = getTotalHeightIncludingMargin('timeline-plot-header');
    const legendHeight = getTotalHeightIncludingMargin('timeline-plot-legend');
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom - headerHeight - legendHeight;
    if (filteredData.every((d) => d.values.length === 0)) return;

    // X-Skala
    const xScale = d3
      .scaleTime()
      .domain([computedStartDate, computedEndDate])
      .range([0, innerWidth]);

    const yMax = showPercentage
      ? d3.max(showMerged ? mergedData : aggregatedData, (d) =>
          d3.max(d.values, (v) => v.percentage),
        ) || 100
      : d3.max(showMerged ? mergedData : aggregatedData, (d) => d3.max(d.values, (v) => v.count)) ||
        10;
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    // y-Achse ohne Tick "0"
    const yTicks = yScale.ticks(5).filter((t) => t > 0);
    const yAxis = d3.axisLeft<number>(yScale).tickValues(yTicks).tickFormat(d3.format('.2s'));

    const maxTicks = Math.floor(innerWidth / 100);
    const xAxis = d3.axisBottom<Date>(xScale).ticks(maxTicks);
    const lineGenerator = d3
      .line<TimeDataPoint>()
      .defined((d) => d.date >= computedStartDate && d.date <= computedEndDate)
      .x((d) => xScale(d.date))
      .y((d) => yScale(showPercentage ? d.percentage ?? 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Annahme: Du hast bereits definiert:
    // const xAxis = d3.axisBottom(xScale).ticks(maxTicks);
    const xTickValues = xScale.ticks(maxTicks);
    // Bestimme den rechten Endpunkt anhand des letzten Ticks:
    const topBorderX2 = xScale(xTickValues[xTickValues.length - 1]);

    // Baseline-Line: alle y-Werte auf innerHeight („aus dem Boden wachsend“)
    const baselineLineGenerator = d3
      .line<TimeDataPoint>()
      .x((d) => xScale(d.date))
      .y(() => innerHeight)
      .curve(d3.curveMonotoneX);

    // Hilfsfunktion für die Linienfarbe (und auch für das Tooltip)
    const getLineColor = (d: TimeAggregatedData) => {
      if (showMerged) return darkMode ? '#fff' : '#000';
      const colorRange = darkMode ? d3.schemeSet2 : d3.schemePaired;
      return d3
        .scaleOrdinal<string, string>(colorRange)
        .domain(aggregatedData.map((d) => d.sender))(d.sender) as string;
    };

    let chartGroup = svg.select<SVGGElement>('.chart-group');
    if (chartGroup.empty()) {
      chartGroup = svg
        .append('g')
        .attr('class', 'chart-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // X-Grid
      chartGroup
        .append('g')
        .attr('class', 'x-grid')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', darkMode ? '#606060' : '#e0e0e0');
      // Y-Grid
      chartGroup
        .append('g')
        .attr('class', 'y-grid')
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => ''),
        )
        .selectAll('line')
        .attr('stroke', darkMode ? '#606060' : '#e0e0e0');

      // **Neue Zeilen: Rahmen oben und rechts (mit derselben Farbe wie das Grid)**
      // Zuerst alte Rahmen entfernen:
      chartGroup.selectAll('.plot-border').remove();

      // Obere Rahmenlinie – dynamisch mit topBorderX2
      chartGroup
        .append('line')
        .attr('class', 'plot-border top-border')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', topBorderX2)
        .attr('y2', 0)
        .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
        .attr('stroke-width', 1);

      // Rechte Rahmenlinie
      // chartGroup
      //   .append("line")
      //   .attr("class", "plot-border right-border")
      //   .attr("x1", innerWidth)
      //   .attr("y1", 0)
      //   .attr("x2", innerWidth)
      //   .attr("y2", innerHeight)
      //   .attr("stroke", darkMode ? "#606060" : "#e0e0e0")
      //   .attr("stroke-width", 1);

      // Achsen erstellen
      chartGroup
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'translate(0,5)')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', darkMode ? 'white' : 'black');

      // Für die y-Achse: Hier wird zunächst ohne zusätzliche Text-Stile gerendert
      chartGroup.append('g').attr('class', 'y-axis').call(yAxis);
      // Direkt im Anschluss werden die Tick-Texte auf den gewünschten Stil gesetzt:
      chartGroup
        .select('.y-axis')
        .selectAll('text')
        .style('font-size', '14px')
        .style('fill', darkMode ? 'white' : 'black');
    }

    // --- BEGIN Update der Rahmenlinien (immer bei Dimensionsänderung) ---

    // Aktualisiere die obere Rahmenlinie
    chartGroup
      .select('.plot-border.top-border')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', topBorderX2)
      .attr('y2', 0)
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
      .attr('stroke-width', 1);

    // Falls du eine untere Rahmenlinie wünschst, erstelle sie falls nötig und update sie:

    // --- ENDE Update der Rahmenlinien ---

    // Achsengitter (Update) – nach Transition die Domain-Pfade entfernen:
    chartGroup
      .select<SVGGElement>('.x-grid')
      .transition()
      .duration(1000)
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0');
    chartGroup
      .select<SVGGElement>('.y-grid')
      .transition()
      .duration(1000)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickValues(yTicks)
          .tickFormat(() => ''),
      )
      .selectAll('line')
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0');

    // Entferne die Domain-Pfade aus den Gittergruppen (dadurch gibt es keinen Rahmen oben/rechts)
    chartGroup.select('.x-grid').select('.domain').remove();
    chartGroup.select('.y-grid').select('.domain').remove();

    // Update der Achsen (ohne Duplikate bei der y-Achse):
    chartGroup
      .select<SVGGElement>('.x-axis')
      .transition()
      .duration(1000)
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', darkMode ? 'white' : 'black')
      .style('font-size', '14px');

    // Für die y-Achse leeren wir zunächst den Inhalt, bevor wir die Achse neu zeichnen:
    const yAxisG = chartGroup.select<SVGGElement>('.y-axis');
    yAxisG.selectAll('*').remove();
    yAxisG.transition().duration(1000).call(yAxis);
    yAxisG
      .selectAll('text')
      .style('fill', darkMode ? 'white' : 'black')
      .style('font-size', '14px');

    // Erkennen, ob ein Modewechsel stattgefunden hat
    const isModeChange = prevModeRef.current !== mode;
    prevModeRef.current = mode;

    // Linien aktualisieren – Animation beim Wechsel zwischen Total/Sendern sowie Modewechsel
    const lines = chartGroup
      .selectAll<SVGPathElement, TimeAggregatedData>('.line')
      .data(showMerged ? mergedData : aggregatedData, (d) => d.sender);

    lines.join(
      (enter) =>
        enter
          .append('path')
          .attr('class', 'line')
          .attr('fill', 'none')
          .attr('stroke', getLineColor)
          .attr('stroke-width', 2)
          .attr('d', (d) => baselineLineGenerator(d.values))
          .transition()
          .duration(1000)
          .attr('d', (d) => lineGenerator(d.values) as string),
      (update) => {
        if (isModeChange) {
          return update
            .attr('d', (d) => baselineLineGenerator(d.values))
            .transition()
            .duration(1000)
            .attr('d', (d) => lineGenerator(d.values) as string)
            .attr('stroke', getLineColor)
            .attr('stroke-width', 2);
        } else {
          return update
            .transition()
            .duration(1000)
            .attr('stroke', getLineColor)
            .attr('stroke-width', 2)
            .attr('d', (d) => lineGenerator(d.values) as string);
        }
      },
      (exit) => {
        if (isModeChange) {
          return exit.attr('d', (d) => baselineLineGenerator(d.values)).remove();
        } else {
          return exit
            .transition()
            .duration(1000)
            .attr('d', (d) => baselineLineGenerator(d.values))
            .remove();
        }
      },
    );

    // Tooltip-Handling
    const tooltip = d3.select(containerRef.current).select<HTMLDivElement>('.tooltip');
    chartGroup
      .selectAll<SVGRectElement, null>('rect.overlay')
      .data([null])
      .join((enter) => enter.append('rect').attr('class', 'overlay'))
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', () => {
        chartGroup.select('line.hover-line').style('opacity', 1);
        tooltip.style('display', 'block');
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, this);
        chartGroup
          .select('line.hover-line')
          .attr('x1', mx)
          .attr('x2', mx)
          .attr('y1', 0)
          .attr('y2', innerHeight);
        const bisectDate = d3.bisector<Date, Date>((d) => d).left;
        const dates = filteredData[0]?.values.map((v) => v.date) || [];
        const x0 = xScale.invert(mx);
        const i = bisectDate(dates, x0);
        const d0 = dates[i - 1];
        const d1 = dates[i];
        const nearestDate =
          !d0 || (d1 && x0.getTime() - d0.getTime() > d1.getTime() - x0.getTime()) ? d1 : d0;
        const dateFormatter = mode === 'year' ? d3.timeFormat('%Y') : d3.timeFormat('%Y-%m');
        const formattedDate = nearestDate ? dateFormatter(nearestDate) : '';
        const tooltipData = filteredData.map((fd) => {
          const point = fd.values.find((v) => dateFormatter(v.date) === formattedDate);
          const value =
            showPercentage && point?.percentage !== undefined
              ? `${point.percentage.toFixed(2)} %`
              : point?.count ?? 0;
          return { sender: fd.sender, value };
        });

        tooltip
          .html(
            `<strong>${formattedDate}</strong><br>` +
              tooltipData
                .map((td) => {
                  // Hier prüfen wir, ob useShortNames aktiv ist und ob ein Kurzname existiert.
                  const displayName =
                    useShortNames && metadata?.sendersShort[td.sender]
                      ? metadata.sendersShort[td.sender]
                      : td.sender;
                  const senderData = filteredData.find((fd) => fd.sender === td.sender) || {
                    sender: td.sender,
                    values: [],
                  };
                  const lineColor = getLineColor(senderData);
                  return `<span style="color:${lineColor}">${displayName}: ${td.value}</span>`;
                })
                .join('<br>'),
          )
          .style('left', `${mx + margin.left + 10}px`)
          .style('top', `${my + margin.top + 10}px`);
      });
    // Statt eines "mouseleave"-Handlers am Overlay wird das Tooltip ausgeblendet,
    // sobald die Maus das SVG verlässt.
    svg.on('mouseleave', () => {
      chartGroup.select('line.hover-line').style('opacity', 0);
      tooltip.style('display', 'none');
    });

    if (chartGroup.select('line.hover-line').empty()) {
      chartGroup
        .append('line')
        .attr('class', 'hover-line')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .style('opacity', 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    svgRef,
    containerRef,
    dimensions,
    aggregatedData,
    mode,
    showPercentage,
    darkMode,
    setUniqueYearsLessThanThree,
    setMode,
    mergedData,
    showMerged,
    startDate,
    endDate,
  ]);
}

const Timeline: React.FC = () => {
  const { filteredMessages, darkMode, appliedFilters, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const [expanded, setExpanded] = useState(false);
  const [uniqueYearsLessThanThree, setUniqueYearsLessThanThree] = useState(false);
  const [mode, setMode] = useState<Mode>('year');
  const [showPercentage, setShowPercentage] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const tooltip = d3.select(containerRef.current).select('.tooltip');
    if (tooltip.empty()) {
      d3.select(containerRef.current)
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('padding', '6px')
        .style('border', '1px solid #999')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('display', 'none');
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
    if (filteredMessages.length === 0) {
      setMode('month');
      setShowPercentage(false);
    }
  }, [filteredMessages]);

  const categories = useMemo(
    () => getTimeCategories(mode, filteredMessages),
    [mode, filteredMessages],
  );
  const aggregatedData = useMemo(
    () => aggregateTimeMessages(filteredMessages, mode, categories, showPercentage),
    [filteredMessages, mode, categories, showPercentage],
  );

  const mergedData = useMemo(() => {
    if (!showMerged) return aggregatedData;
    const allDates = Array.from(
      new Set(aggregatedData.flatMap((d) => d.values.map((v) => v.date.getTime()))),
    ).sort((a, b) => a - b);
    const mergedValues = allDates.map((timestamp) => {
      const date = new Date(timestamp);
      const totalCount = aggregatedData.reduce((sum, senderData) => {
        const value = senderData.values.find((v) => v.date.getTime() === timestamp);
        return sum + (value ? value.count : 0);
      }, 0);
      return { date, count: totalCount };
    });
    return [{ sender: 'Total', values: mergedValues }];
  }, [aggregatedData, showMerged]);

  // Farbskala: Bei showMerged nur Total (schwarz), sonst einzelne Sender
  const getColorScale = () => {
    if (showMerged) return () => (darkMode ? '#fff' : '#000');
    const colorRange = darkMode ? d3.schemeSet2 : d3.schemePaired;
    const domain = aggregatedData.map((d) => d.sender);
    return d3.scaleOrdinal<string, string>(colorRange).domain(domain);
  };

  const colorScale = getColorScale();

  useTimelineChart(
    svgRef,
    containerRef,
    dimensions,
    showMerged ? mergedData : aggregatedData,
    mergedData,
    mode,
    showPercentage,
    darkMode,
    appliedFilters.startDate,
    appliedFilters.endDate,
    setMode,
    setUniqueYearsLessThanThree,
    showMerged,
    useShortNames,
    metadata,
  );

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } w-full py-2 pt-4 px-0 md:p-4 md:min-w-[730px] ${
        expanded ? 'md:basis-[3000px]' : 'md:basis-[800px]'
      } flex-grow flex flex-col`}
      style={{
        position: 'relative',
        minHeight: '400px',
        maxHeight: '550px',
        overflow: 'hidden',
      }}
    >
      <div
        id="timeline-plot-header"
        className="flex items-center justify-between mb-2 px-4 md:px-0"
      >
        {!uniqueYearsLessThanThree ? (
          <div className="flex space-x-2 mt-0">
            <button
              className={`px-3 py-1 md:text-base text-sm rounded-none ${
                mode === 'year'
                  ? darkMode
                    ? 'bg-white text-black border border-gray-300 hover:border-gray-300'
                    : 'bg-black text-white border-none'
                  : darkMode
                  ? 'bg-gray-700 text-white border border-gray-300 hover:border-gray-300 hover:bg-gray-800'
                  : 'bg-white text-gray-700 border border-black hover:border-black hover:bg-gray-200'
              }`}
              onClick={() => setMode('year')}
            >
              Year
            </button>
            <button
              className={`px-3 py-1 md:text-base text-sm rounded-none ${
                mode === 'month'
                  ? darkMode
                    ? 'bg-white text-black border border-gray-300 hover:border-gray-300'
                    : 'bg-black text-white border-none'
                  : darkMode
                  ? 'bg-gray-700 text-white border border-gray-300 hover:border-gray-300 hover:bg-gray-800'
                  : 'bg-white text-gray-700 border border-black hover:border-black hover:bg-gray-200'
              }`}
              onClick={() => setMode('month')}
            >
              Month
            </button>
          </div>
        ) : (
          <div></div>
        )}
        <div className="flex items-center w-fit md:w-auto justify-center md:justify-end space-x-2">
          <Split
            className={`hidden md:inline-block ${
              darkMode ? 'text-white' : 'text-gray-700'
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                if (showPercentage) setShowPercentage(false);
                setShowMerged(!showMerged);
              }}
              checked={showMerged}
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
              if (showPercentage) setShowPercentage(false);
              setShowMerged(!showMerged);
            }}
            className={`md:hidden p-2 rounded-none border ${
              darkMode ? 'border-white bg-gray-700' : 'border-black bg-white'
            }`}
          >
            {showMerged ? (
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
          <Hash
            className={`ml-4 hidden md:inline-block ${
              darkMode ? 'text-white' : 'text-gray-700'
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <div className="mx-1 md:mx-2 hidden md:inline-block h-[20px]">
            <Switch
              onChange={() => {
                if (showMerged) setShowMerged(false);
                setShowPercentage(!showPercentage);
              }}
              checked={showPercentage}
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
              if (showMerged) setShowMerged(false);
              setShowPercentage(!showPercentage);
            }}
            className={`ml-1 md:hidden p-2 rounded-none border ${
              darkMode ? 'border-white bg-gray-700' : 'border-black bg-white'
            }`}
          >
            {showPercentage ? (
              <Hash className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-gray-700'}`} />
            ) : (
              <Percent className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-gray-700'}`} />
            )}
          </button>
          <Percent
            className={`hidden md:inline-block ${
              darkMode ? 'text-white' : 'text-gray-700'
            } w-4 h-4 md:w-5 md:h-5`}
          />
          <button
            className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
              darkMode ? 'text-white' : 'text-black'
            }`}
            onClick={() => {
              setExpanded(!expanded);
              setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
            }}
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
      </div>
      <div
        id="timeline-plot-legend"
        className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2 px-4 md:px-0"
      >
        {showMerged ? (
          <div key="Total" className="flex items-center mr-0 mb-2">
            <div
              className="w-4 h-4 mr-1"
              style={{ backgroundColor: darkMode ? '#fff' : '#000' }}
            ></div>
            <span
              className="text-sm whitespace-nowrap"
              style={{ color: darkMode ? '#fff' : '#000' }}
            >
              Total
            </span>
          </div>
        ) : (
          aggregatedData.map((data) => {
            const displayName =
              useShortNames && metadata?.sendersShort[data.sender]
                ? metadata.sendersShort[data.sender]
                : data.sender;
            return (
              <div key={data.sender} className="flex items-center mr-0 mb-2">
                <div
                  className="w-4 h-4 mr-1"
                  style={{ backgroundColor: colorScale(data.sender) }}
                ></div>
                <span
                  className="text-sm whitespace-nowrap"
                  style={{ color: darkMode ? '#fff' : '#000' }}
                >
                  {displayName}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg id="timeline_plot" ref={svgRef} className="h-full w-full flex-grow" />
        )}
      </div>
    </div>
  );
};

export default Timeline;
