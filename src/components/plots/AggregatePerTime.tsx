import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import * as d3 from 'd3';
import { ChatMessage } from '../../types/chatTypes';
import useResizeObserver from '../../hooks/useResizeObserver';
import Switch from 'react-switch';
import { Hash, Percent, Maximize2, Minimize2, Split, Merge } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import '../../../i18n';

/** DataPoint und AggregatedData Interfaces bleiben unverändert */
interface DataPoint {
  category: string;
  count: number;
  percentage?: number;
}

interface AggregatedData {
  sender: string;
  values: DataPoint[];
}

type Mode = 'weekday' | 'hour' | 'month';

const getCategories = (mode: Mode): string[] => {
  switch (mode) {
    case 'weekday':
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    case 'hour':
      return Array.from({ length: 24 }, (_, i) => i.toString());
    case 'month':
      return [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
    default:
      return [];
  }
};

const getCategoryFromMessage = (msg: ChatMessage, mode: Mode): string => {
  const date = new Date(msg.date);
  if (mode === 'weekday') {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
      (date.getDay() + 6) % 7
    ];
  } else if (mode === 'hour') {
    return parseInt(msg.time.split(':')[0], 10).toString();
  } else if (mode === 'month') {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][date.getMonth()];
  }
  return '';
};

const aggregateMessages = (
  messages: ChatMessage[],
  mode: Mode,
  categories: string[],
  showPercentage: boolean,
): AggregatedData[] => {
  if (messages.length === 0) return [];
  const dataMap: Record<string, Record<string, number>> = {};
  messages.forEach((msg) => {
    const sender = msg.sender;
    const category = getCategoryFromMessage(msg, mode);
    if (!dataMap[sender]) {
      dataMap[sender] = {};
      categories.forEach((cat) => (dataMap[sender][cat] = 0));
    }
    dataMap[sender][category] = (dataMap[sender][category] || 0) + 1;
  });
  let result: AggregatedData[] = Object.keys(dataMap).map((sender) => {
    const values = categories.map((category) => ({
      category,
      count: dataMap[sender][category],
    }));
    return { sender, values };
  });
  if (showPercentage) {
    result = result.map((senderData) => {
      const total = d3.sum(senderData.values, (d) => d.count);
      return {
        ...senderData,
        values: senderData.values.map((d) => ({
          ...d,
          percentage: total > 0 ? (d.count / total) * 100 : 0,
        })),
      };
    });
  }
  return result;
};

const AggregatePerTimePlot: React.FC = () => {
  // const { filteredMessages, darkMode } = useChat();
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);

  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('hour');
  const [showPercentage, setShowPercentage] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState<boolean>(false);

  const categories = useMemo(() => getCategories(mode), [mode]);

  const aggregatedData = useMemo(
    () => aggregateMessages(filteredMessages, mode, categories, showPercentage),
    [filteredMessages, mode, categories, showPercentage],
  );

  const senders = useMemo(() => aggregatedData.map((d) => d.sender), [aggregatedData]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setMode('hour');
      setShowPercentage(false);
    }
  }, [filteredMessages]);

  const colorScale = useMemo(() => {
    const colors = darkMode ? d3.schemeSet2 : d3.schemePaired;
    return d3.scaleOrdinal<string, string>(colors).domain(senders);
  }, [senders, darkMode]);

  const getLineColor = (sender: string) => {
    if (showMerged) {
      return darkMode ? '#fff' : '#000';
    }
    return colorScale(sender);
  };

  const mergedData = useMemo(() => {
    if (!showMerged) return aggregatedData;
    const mergedValues = categories.map((category) => {
      const sum = aggregatedData.reduce((acc, senderData) => {
        const value = senderData.values.find((v) => v.category === category);
        return acc + (value ? value.count : 0);
      }, 0);
      return { category, count: sum };
    });
    return [{ sender: 'Total', values: mergedValues }];
  }, [aggregatedData, showMerged, categories]);

  // Tooltip initial erstellen (einmalig)
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

  /**
   * Hier wird der gesamte D3-Plot aktualisiert.
   * Beachte: Wir nutzen Refs, um den vorherigen Zustand (u.a. der Achsen und Linien) zu speichern.
   */
  // Refs für vorherige Zustände, damit wir differenzieren können, ob nur showMerged/showPercentage oder Mode/Dims geändert wurden
  const prevDataRef = useRef<AggregatedData[]>(mergedData);
  const prevModeRef = useRef(mode);
  const prevShowPercentageRef = useRef(showPercentage);
  const prevDarkMode = useRef(darkMode);
  const prevShowMergedRef = useRef(showMerged);
  const prevDimensionsRef = useRef(dimensions);
  const prevYScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);

  useEffect(() => {
    if (!dimensions || mergedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    if (window.innerWidth <= 768) {
      margin.right = 20;
      margin.left = 40;
    }
    const headerHeight = getTotalHeightIncludingMargin('aggregate-per-time-plot-header');
    const legendHeight = getTotalHeightIncludingMargin('aggregate-per-time-plot-legend');
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom - headerHeight - legendHeight;

    // Skalen
    const xScale = d3.scalePoint<string>().domain(categories).range([0, innerWidth]).padding(0);

    const yMax = showPercentage
      ? (d3.max(mergedData, (d) =>
          // @ts-expect-error I dont know why there is an error here
          d3.max(d.values, (v) => v.percentage),
        ) as number) || 100
      : d3.max(mergedData, (d) => d3.max(d.values, (v) => v.count)) || 10;

    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

    // Direkt nach der Definition von yScale:
    const yTickValues = yScale.ticks(5);

    // X-Achsen-Ticks
    const tickSpacing = mode === 'hour' ? 20 : 70;
    const maxTicks = Math.max(2, Math.floor(innerWidth / tickSpacing));
    const xTickValues = categories.filter(
      (_, i) => i % Math.ceil(categories.length / maxTicks) === 0,
    );
    const xAxis = d3.axisBottom(xScale).tickValues(xTickValues);
    // Modified yAxis tick format: entferne den Label-Wert bei 0
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTickValues)
      .tickFormat((d) => (d === 0 ? '' : d3.format('.2s')(d)));

    // Linien-Generator (normale Linie)
    const lineGenerator = d3
      .line<DataPoint>()
      .defined((d) => d.count != null)
      .x((d) => xScale(d.category) as number)
      .y((d) => yScale(showPercentage ? d.percentage || 0 : d.count))
      .curve(d3.curveMonotoneX);

    // Baseline-Linie (alle y-Werte = innerHeight)
    const baselineLineGenerator = d3
      .line<DataPoint>()
      .x((d) => xScale(d.category) as number)
      .y(() => innerHeight)
      .curve(d3.curveMonotoneX);

    // Für die custom Transition (vertikale Bewegung) benötigen wir einen Generator, der direkt mit y-Pixelwerten arbeitet.
    const lineGeneratorCustom = d3
      .line<{ category: string; y: number }>()
      .x((d) => xScale(d.category) as number)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    // Bestimmen, ob Mode oder Dimensionen sich geändert haben
    const modeChanged = prevModeRef.current !== mode;
    const darkModeChanged = prevDarkMode.current !== darkMode;
    const dimensionsChanged =
      !prevDimensionsRef.current ||
      prevDimensionsRef.current.width !== width ||
      prevDimensionsRef.current.height !== height;
    // X-Achse nur aktualisieren, wenn Mode oder Dimensionen sich ändern
    const shouldUpdateXAxis = modeChanged || dimensionsChanged || darkModeChanged;

    // --- Lokale Kopien der vorherigen Zustände für Transition (wichtig, da die Refs am Ende aktualisiert werden) ---
    const _prevShowPercentage = prevShowPercentageRef.current;
    const _prevData = prevDataRef.current;
    const _prevYScale = prevYScaleRef.current;

    // Chart-Gruppe abrufen oder erstellen
    let chartGroup = svg.select<SVGGElement>('.chart-group');
    if (chartGroup.empty()) {
      chartGroup = svg
        .append('g')
        .attr('class', 'chart-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    }

    // Erstelle eine feste y-Achsen-Domain-Gruppe (nur einmal), die dauerhaft die Achsenlinie anzeigt
    let yAxisDomain = chartGroup.select<SVGGElement>('.y-axis-domain');
    if (yAxisDomain.empty()) {
      yAxisDomain = chartGroup.append('g').attr('class', 'y-axis-domain');
    }
    yAxisDomain.call(
      d3.axisLeft(yScale).tickValues([]), // Keine Ticks, nur Domain-Linie
    );
    yAxisDomain
      .select('.domain')
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
      .attr('stroke-width', 1)
      .style('opacity', 1);

    // --- X-Achse und X-Grid nur neu zeichnen, wenn nötig ---
    if (shouldUpdateXAxis) {
      chartGroup.selectAll('.x-grid, .x-axis').remove();
      // X-Grid
      const xGrid = chartGroup
        .append('g')
        .attr('class', 'x-grid')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => ''),
        );
      xGrid
        .selectAll('line')
        .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
        .attr('stroke-width', 1);
      xGrid.style('opacity', 0).transition().duration(500).style('opacity', 1);
      // X-Achse
      const xAxisGroup = chartGroup
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);
      xAxisGroup
        .selectAll('text')
        .attr('transform', 'translate(0,5)')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', darkMode ? 'white' : 'black');
      // Hier wird die Domain-Linie der x-Achse (und die Tick-Linien) gestylt:
      xAxisGroup
        .select('.domain')
        .attr('stroke', darkMode ? '#fff' : '#000')
        .attr('stroke-width', 1);
      xAxisGroup
        .selectAll('line')
        .attr('stroke', darkMode ? '#fff' : '#000')
        .attr('stroke-width', 1);
      xAxisGroup.style('opacity', 0).transition().duration(500).style('opacity', 1);
    }
    // --- Y-Grid immer neu zeichnen ---
    // --- Y-Grid synchron zur y-Achse aktualisieren ---
    // --- y-Grid synchron zur y-Achse aktualisieren ---
    let yGrid = chartGroup.select<SVGGElement>('.y-grid');
    if (yGrid.empty()) {
      yGrid = chartGroup.append('g').attr('class', 'y-grid');
    }
    yGrid
      .transition()
      .duration(1000)
      .call(
        d3
          .axisLeft(yScale)
          .tickValues(yTickValues) // <-- Synchronisieren!
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      );
    yGrid.selectAll('line').attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0');

    // Füge eine separate Gruppe für die feste y-Achsen-Domain hinzu
    // let yAxisDomain = chartGroup.select<SVGGElement>(".y-axis-domain");
    // if (yAxisDomain.empty()) {
    //   yAxisDomain = chartGroup.append("g").attr("class", "y-axis-domain");
    // }
    // // Aktualisiere die Domain-Gruppe (nur die Achsenlinie, ohne Ticks) – keine Transition!
    // yAxisDomain.call(
    //   d3.axisLeft(yScale).tickValues([]) // keine Ticks, nur Domain-Linie
    // );
    // yAxisDomain
    //   .select(".domain")
    //   .attr("stroke", darkMode ? "#a0a0a0" : "#e0e0e0")
    //   .attr("stroke-width", 1)
    //   .style("opacity", 1);

    // **Neue Zeilen: Rahmen oben und rechts (mit derselben Farbe wie das Grid)**
    chartGroup.selectAll('.plot-border').remove(); // Alte Border entfernen

    // Obere Rahmenlinie
    chartGroup
      .append('line')
      .attr('class', 'plot-border top-border')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', innerWidth)
      .attr('y2', 0)
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
      .attr('stroke-width', 1);

    // Rechte Rahmenlinie
    chartGroup
      .append('line')
      .attr('class', 'plot-border right-border')
      .attr('x1', innerWidth)
      .attr('y1', 0)
      .attr('x2', innerWidth)
      .attr('y2', innerHeight)
      .attr('stroke', darkMode ? '#a0a0a0' : '#e0e0e0')
      .attr('stroke-width', 1);

    // --- Y-Achse per Transition aktualisieren ---
    // --- Y-Achse per Transition aktualisieren (nur Ticks und Texte, Domain bleibt fest) ---
    // --- Y-Achse per Transition aktualisieren (nur Ticks und Texte, Domain bleibt in der separaten Gruppe) ---
    let yAxisGroup = chartGroup.select<SVGGElement>('.y-axis');
    if (yAxisGroup.empty()) {
      yAxisGroup = chartGroup.append('g').attr('class', 'y-axis');
    }
    // Aktualisiere die Ticks und Texte mit Transition – die Domain wird NICHT entfernt, da sie in yAxisDomain liegt
    yAxisGroup
      .transition()
      .duration(1000)
      .call(yAxis)
      .on('end', () => {
        yAxisGroup.raise();
      });
    yAxisGroup
      .selectAll('text')
      .style('font-size', '14px')
      .style('fill', darkMode ? 'white' : 'black');

    // --- Linien zeichnen mit Übergängen (vertikale Tweening-Transition) ---
    const lines = chartGroup
      .selectAll<SVGPathElement, AggregatedData>('.line')
      .data(mergedData, (d) => d.sender);

    lines.join(
      (enter) =>
        enter
          .append('path')
          .attr('class', 'line')
          .attr('fill', 'none')
          .attr('stroke', (d) => getLineColor(d.sender))
          .attr('stroke-width', 2)
          // Starte von der Basislinie
          .attr('d', (d) => baselineLineGenerator(d.values))
          .transition()
          .duration(1000)
          .attr('d', (d) => lineGenerator(d.values) as string),
      (update) =>
        update
          .transition()
          .duration(1000)
          .attr('stroke', (d) => getLineColor(d.sender))
          .attr('stroke-width', 2)
          .attrTween('d', function (d) {
            // Für jede Linie interpolieren wir die y-Pixelwerte von den alten zu den neuen Werten.
            const prevSeries = _prevData.find((s) => s.sender === d.sender);
            const prevValues = prevSeries
              ? prevSeries.values
              : d.values.map((v) => ({ ...v, count: 0, percentage: 0 }));
            const prevMetric = _prevShowPercentage ? 'percentage' : 'count';
            const newMetric = showPercentage ? 'percentage' : 'count';
            const interpolators = d.values.map((newPoint) => {
              const prevPoint = prevValues.find((p) => p.category === newPoint.category);
              const prevVal = prevPoint ? (prevPoint as DataPoint)[prevMetric] ?? 0 : 0;
              const newVal = (newPoint as DataPoint)[newMetric] ?? 0;
              const startPixel = _prevYScale ? _prevYScale(prevVal) : innerHeight;
              const endPixel = yScale(newVal);
              return d3.interpolateNumber(startPixel, endPixel);
            });
            return function (t) {
              const intermediatePoints = d.values.map((newPoint, i) => ({
                category: newPoint.category,
                y: interpolators[i](t),
              }));
              return lineGeneratorCustom(intermediatePoints) || '';
            };
          }),
      (exit) =>
        exit
          .transition()
          .duration(1000)
          .attr('d', (d) => baselineLineGenerator(d.values))
          .remove(),
    );
    // --- Linien über das Grid legen ---
    chartGroup.selectAll('.line').raise();

    // --- Tooltip und Interaktionen ---
    const tooltip = d3.select(containerRef.current).select<HTMLDivElement>('.tooltip');
    // Alte Overlay-Rechtecke entfernen
    chartGroup.selectAll('.overlay').remove();
    const overlay = chartGroup
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .style('fill', 'none')
      .style('pointer-events', 'all');

    // Hover-Line: nur einmal anlegen, falls noch nicht vorhanden
    const hoverLine = chartGroup.selectAll('.hover-line');
    if (hoverLine.empty()) {
      chartGroup
        .append('line')
        .attr('class', 'hover-line')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .style('opacity', 0);
    }
    const updatedHoverLine = chartGroup.select('.hover-line');

    overlay
      .on('mouseover', () => {
        updatedHoverLine.style('opacity', 1);
        tooltip.style('display', 'block');
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, this);
        updatedHoverLine.attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', innerHeight);
        const xPositions = categories.map((cat) => xScale(cat) as number);
        const distances = xPositions.map((xPos) => Math.abs(xPos - mx));
        const minIndex = distances.indexOf(Math.min(...distances));
        const nearestCategory = categories[minIndex];
        const tooltipData = mergedData.map((d) => {
          const point = d.values.find((v) => v.category === nearestCategory);
          const value =
            // @ts-expect-error I dont know why there is an error here
            showPercentage && point?.percentage !== undefined
              ? // @ts-expect-error I dont know why there is an error here
                point.percentage.toFixed(2) + ' %'
              : point?.count;
          return { sender: d.sender, value };
        });
        tooltip
          .html(
            `<strong>${nearestCategory}</strong><br>` +
              tooltipData
                .map((d) => {
                  const displaySender =
                    d.sender !== 'Total' &&
                    useShortNames &&
                    metadata &&
                    metadata.sendersShort[d.sender]
                      ? metadata.sendersShort[d.sender]
                      : d.sender;
                  return `<span style="color:${
                    d.sender === 'Total' ? (darkMode ? '#fff' : '#000') : colorScale(d.sender)
                  }">${displaySender}: ${d.value}</span>`;
                })
                .join('<br>'),
          )

          .style('left', `${mx + margin.left + 10}px`)
          .style('top', `${my + margin.top + 10}px`);
      })
      .on('mouseleave', () => {
        updatedHoverLine.style('opacity', 0);
        tooltip.style('display', 'none');
      });

    // ** x-Achse vor dem Overlay in den Vordergrund holen (mit pointer-events none), damit sie sichtbar bleibt **
    chartGroup.select('.x-axis').raise().attr('pointer-events', 'none');

    // --- Update der vorherigen Zustände ---
    prevDataRef.current = mergedData;
    prevYScaleRef.current = yScale;
    prevModeRef.current = mode;
    prevDimensionsRef.current = dimensions;
    prevShowPercentageRef.current = showPercentage;
    prevShowMergedRef.current = showMerged;
    prevDarkMode.current = darkMode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dimensions,
    mergedData,
    categories,
    colorScale,
    mode,
    showPercentage,
    darkMode,
    showMerged,
    useShortNames,
  ]);

  function getTotalHeightIncludingMargin(elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const marginTop = parseFloat(computedStyle.marginTop) || 0;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    return rect.height + marginTop + marginBottom;
  }

  const { t } = useTranslation();

  return (
    <div
      ref={containerRef}
      className={`border-[1px] ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      } w-full md:min-w-[730px] ${
        expanded ? 'md:basis-[3000px]' : 'md:basis-[800px]'
      } flex-grow py-2 pt-4 px-0 md:p-4 flex flex-col`}
      style={{
        position: 'relative',
        minHeight: '400px',
        maxHeight: '550px',
        overflow: 'hidden',
      }}
    >
      {/* Control Panel */}
      <div
        id="aggregate-per-time-plot-header"
        className="flex items-center justify-between mb-2 px-4 md:px-0"
      >
        <div className="flex space-x-2">
          {(['hour', 'weekday', 'month'] as Mode[]).map((item) => {
            const isActive = mode === item;
            const buttonClass = isActive
              ? darkMode
                ? 'bg-white text-black border border-gray-300 hover:border-gray-300 '
                : 'bg-black text-white border-none '
              : darkMode
              ? 'bg-gray-700 text-white border border-gray-300 hover:border-gray-300 hover:bg-gray-800'
              : 'bg-white text-gray-700 border border-black hover:border-black hover:bg-gray-200';
            return (
              <button
                key={item}
                className={`px-3 py-1 md:text-base text-sm rounded-none ${buttonClass}`}
                onClick={() => setMode(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            );
          })}
        </div>
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
                setShowPercentage(!showPercentage);
                if (!showPercentage) setShowMerged(false);
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
              setShowPercentage(!showPercentage);
              if (!showPercentage) setShowMerged(false);
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
      {/* Legende: Bei showMerged wird ein einzelnes Total-Element angezeigt */}
      {showMerged ? (
        <div
          id="aggregate-per-time-plot-legend"
          className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2 px-4 md:px-0"
        >
          <div className="flex items-center mr-0 mb-2">
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
        </div>
      ) : (
        <div
          id="aggregate-per-time-plot-legend"
          className="flex flex-nowrap overflow-x-auto items-center mb-2 space-x-2 px-4 md:px-0"
        >
          {senders.map((sender) => {
            const displayName =
              useShortNames && metadata && metadata.sendersShort[sender]
                ? metadata.sendersShort[sender]
                : sender;
            return (
              <div key={sender} className="flex items-center mr-0 mb-2">
                <div className="w-4 h-4 mr-1" style={{ backgroundColor: colorScale(sender) }}></div>
                <span
                  className="text-sm whitespace-nowrap"
                  style={{ color: darkMode ? '#fff' : '#000' }}
                >
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex-grow flex justify-center items-center">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg id="aggregate_plot" ref={svgRef} className="h-full w-full flex-grow"></svg>
        )}
      </div>
    </div>
  );
};

export default AggregatePerTimePlot;
