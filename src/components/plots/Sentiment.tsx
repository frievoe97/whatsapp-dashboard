import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";
import { Maximize2, Minimize2 } from "lucide-react";
import Sentiment from "sentiment";

// Hier ausschließlich filteredMessages nutzen – da das Backend bereits filtert.
interface SentimentDataPoint {
  date: Date;
  positive: number;
  negative: number;
}

const WINDOW_SIZE = 100;
const SENTIMENT_COLORS: Record<"positive" | "negative", string> = {
  positive: "#2BA02B",
  negative: "#D62727",
};

const VALID_LANGUAGES = ["de", "en", "fr", "es"] as const;

const SentimentAnalysis: React.FC = () => {
  const { filteredMessages, darkMode, language } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const [expanded, setExpanded] = useState(false);

  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);

  // AFINN lexikon laden (verwende language aus Context, Default: "en")
  useEffect(() => {
    if (!language) return;
    const langToLoad = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";
    import(`../../assets/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
      })
      .catch((error) => {
        console.error(`Error loading AFINN-${langToLoad}.json:`, error);
      });
  }, [language]);

  // Registrierung des Lexikons
  useEffect(() => {
    if (!language || Object.keys(afinn).length === 0) return;
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });
    try {
      sentimentAnalyzer.analyze("Test", { language: langToUse });
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [language, afinn, sentimentAnalyzer]);

  // Aggregiere Sentiment-Daten (verwende filteredMessages; isUsed entfällt)
  const sentimentData = useMemo<SentimentDataPoint[]>(() => {
    if (!language || !isLanguageRegistered) return [];
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";
    const dailyTotals: Record<
      string,
      { positive: number; negative: number; count: number }
    > = {};
    filteredMessages.forEach((msg) => {
      const dateKey = new Date(msg.date).toISOString().split("T")[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { positive: 0, negative: 0, count: 0 };
      }
      try {
        const result = sentimentAnalyzer.analyze(msg.message, {
          language: langToUse,
        });
        const score = result.score;
        dailyTotals[dateKey].count += 1;
        if (score > 0) {
          dailyTotals[dateKey].positive += score;
        } else if (score < 0) {
          dailyTotals[dateKey].negative += Math.abs(score);
        }
      } catch (error) {
        console.error(
          `Error analyzing message with language ${langToUse}:`,
          error
        );
      }
    });
    const rawData = Object.entries(dailyTotals)
      .map(([date, { positive, negative, count }]) => ({
        date: new Date(date),
        positive: positive / count,
        negative: negative / count,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!rawData.length) return [];
    const filledData = fillMissingDays(rawData);
    return smoothData(filledData, WINDOW_SIZE);
  }, [filteredMessages, language, isLanguageRegistered, sentimentAnalyzer]);

  useEffect(() => {
    if (!dimensions || sentimentData.length === 0) return;
    drawChart(svgRef, sentimentData, dimensions, darkMode);
  }, [dimensions, sentimentData, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full md:min-w-[500px] ${
        expanded ? "md:basis-[3000px]" : "md:basis-[500px]"
      } p-4 flex-grow flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between px-4 md:px-0">
        <h2
          className={`text-lg font-semibold mb-4 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Sentiment Analysis over Time
        </h2>
        <button
          className={`ml-4 hidden md:flex items-center justify-center p-1 border-none focus:outline-none ${
            darkMode ? "text-white" : "text-black"
          }`}
          onClick={() => {
            setExpanded(!expanded);
            setTimeout(() => window.dispatchEvent(new Event("resize")), 200);
          }}
          style={{
            background: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          {expanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>
      <div className="flex-grow flex justify-center items-center max-h-full">
        {sentimentData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis;

// --- Hilfsfunktionen ---
function fillMissingDays(sortedData: any[]): any[] {
  if (!sortedData.length) return [];
  const filledData: any[] = [];
  const firstDate = sortedData[0].date;
  const lastDate = sortedData[sortedData.length - 1].date;
  const allDates = d3.timeDay.range(firstDate, d3.timeDay.offset(lastDate, 1));
  const dataMap = new Map<string, any>();
  sortedData.forEach((d) => {
    const key = d.date.toISOString().split("T")[0];
    dataMap.set(key, { ...d });
  });
  let lastValid: any = null;
  allDates.forEach((currentDate) => {
    const key = currentDate.toISOString().split("T")[0];
    if (dataMap.has(key)) {
      const dataPoint = dataMap.get(key);
      filledData.push({ ...dataPoint });
      lastValid = { ...dataPoint };
    } else if (lastValid) {
      filledData.push({
        date: currentDate,
        positive: lastValid.positive,
        negative: lastValid.negative,
      });
    } else {
      filledData.push({ date: currentDate, positive: 0, negative: 0 });
    }
  });
  return filledData;
}

function smoothData(data: any[], windowSize: number): any[] {
  if (!data.length) return [];
  const effectiveWindowSize = Math.min(data.length, windowSize);
  const halfWindow = Math.floor(effectiveWindowSize / 2);
  return data.map((point, i, arr) => {
    const startIndex = Math.max(0, i - halfWindow);
    const endIndex = Math.min(arr.length - 1, i + halfWindow);
    const windowSlice = arr.slice(startIndex, endIndex + 1);
    return {
      date: point.date,
      positive: d3.mean(windowSlice, (d) => d.positive) ?? point.positive,
      negative: d3.mean(windowSlice, (d) => d.negative) ?? point.negative,
    };
  });
}

function drawChart(
  svgRef: React.RefObject<SVGSVGElement>,
  sentimentData: any[],
  dimensions: { width: number; height: number },
  darkMode: boolean
) {
  const { width, height } = dimensions;
  let margin = { top: 20, right: 10, bottom: 70, left: 30 };
  if (window.innerWidth <= 768) {
    margin.right = 20;
    margin.left = 40;
  }
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(svgRef.current);
  svg.selectAll("*").remove();
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
    .range([0, innerWidth]);
  const yMax =
    d3.max(sentimentData, (d) => Math.max(d.positive, d.negative)) || 1;
  const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);
  function createLineGenerator(key: keyof Omit<any, "date">) {
    return d3
      .line<any>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d[key]))
      .curve(d3.curveBasis);
  }
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  const maxXTicks = Math.floor(innerWidth / 80);
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(maxXTicks))
    .selectAll("text")
    .style("font-size", "14px")
    .attr("dy", "1em")
    .style("text-anchor", "middle");
  g.append("g").call(d3.axisLeft(yScale).ticks(5)).style("font-size", "14px");
  Object.entries(SENTIMENT_COLORS).forEach(([sentimentKey, color]) => {
    g.append("path")
      .datum(sentimentData)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", createLineGenerator(sentimentKey as any));
  });
  const legendGroup = g
    .append("g")
    .attr("transform", `translate(${innerWidth - 180}, -20)`);
  let legendX = 0;
  Object.entries(SENTIMENT_COLORS).forEach(([key, color]) => {
    const legendItem = legendGroup
      .append("g")
      .attr("transform", `translate(${legendX}, 0)`);
    legendItem
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color);
    legendItem
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("fill", darkMode ? "white" : "black")
      .attr("font-size", "14px")
      .text(key);
    legendX += 80;
  });
}

// export default SentimentAnalysis;
