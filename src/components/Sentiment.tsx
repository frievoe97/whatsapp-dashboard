import React, { useEffect, useRef, useMemo, useState } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import Sentiment from "sentiment";

const SentimentAnalysis: React.FC = () => {
  const { messages, darkMode } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dimensions = useResizeObserver(containerRef);
  const sentiment = useMemo(() => new Sentiment(), []);
  const [afinnDe, setAfinnDe] = useState<Record<string, number>>({});
  sentiment.registerLanguage("de", { labels: afinnDe });

  useEffect(() => {
    import("../assets/AFINN-de.json")
      .then((data) => setAfinnDe(data.default)) // Zugriff auf .default!
      .catch((error) => console.error("Fehler beim Laden der JSON:", error));
  }, []);

  const sentimentData = useMemo(() => {
    const dataMap: {
      [date: string]: {
        positive: number;
        neutral: number;
        negative: number;
        count: number;
      };
    } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;

      const dateKey = new Date(msg.date).toISOString().split("T")[0]; // Format: YYYY-MM-DD

      const result = sentiment.analyze(msg.message, { language: "de" });

      const score = result.score;

      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { positive: 0, neutral: 0, negative: 0, count: 0 };
      }

      dataMap[dateKey].count += 1; // Nachrichtenanzahl erhöhen

      if (score > 0) {
        dataMap[dateKey].positive += score;
      } else if (score < 0) {
        dataMap[dateKey].negative += Math.abs(score);
      } else {
        // dataMap[dateKey].neutral += 1;
      }
    });

    let rawData = Object.entries(dataMap)
      .map(([date, values]) => ({
        date: new Date(date),
        ...values,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Bestimme `x` für den gleitenden Durchschnitt (z. B. 10% der Datenmenge)
    const x = Math.max(1, Math.floor(rawData.length / 10));

    // Berechne gleitenden Durchschnitt unter Berücksichtigung der Nachrichtenanzahl
    const smoothedData = rawData.map((_, i, arr) => {
      const start = Math.max(0, i - x);
      const end = Math.min(arr.length - 1, i + x);
      const slice = arr.slice(start, end + 1);

      const totalCount = d3.sum(slice, (d) => d.count) || 1; // Verhindert Division durch 0

      return {
        date: arr[i].date,
        positive: (d3.sum(slice, (d) => d.positive) || 0) / totalCount,
        neutral: (d3.sum(slice, (d) => d.neutral) || 0) / totalCount,
        negative: (d3.sum(slice, (d) => d.negative) || 0) / totalCount,
      };
    });

    return smoothedData;
  }, [messages, sentiment]);

  useEffect(() => {
    if (!dimensions || sentimentData.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 70, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sentimentData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yMax =
      d3.max(sentimentData, (d) =>
        Math.max(d.positive, d.negative, d.neutral)
      ) || 1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    const lineGenerator = (key: keyof typeof colors) =>
      d3
        .line<{ date: Date } & Record<keyof typeof colors, number>>() // Korrekte Typisierung
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[key]))
        .curve(d3.curveMonotoneX);

    const colors = {
      positive: "#2BA02B",
      neutral: "#7F7F7F",
      negative: "#D62727",
    };

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxTicks = Math.floor(innerWidth / 80); // Dynamische Anzahl der Ticks basierend auf Breite
    const yTicks = 5;
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).ticks(maxTicks) // Dynamische Ticks basierend auf Breite
      )
      .selectAll("text")
      .style("font-size", "14px")
      .attr("dy", "1em")
      .style("text-anchor", "middle") // Kein Drehen oder Verschieben
      .attr("transform", null); // Entfernt Rotation

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(yTicks))
      .style("font-size", "14px");

    Object.entries(colors).forEach(([key, color]) => {
      g.append("path")
        .datum(sentimentData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator(key as keyof typeof colors)); // Nur 1 Argument übergeben!
    });

    // Legende

    const legend = g
      .append("g")
      .attr("transform", `translate(${innerWidth - 250}, -20)`); // 20px nach links, 20px nach oben

    let legendX = 0; // Abstand zwischen den Elementen
    Object.entries(colors).forEach(([key, color]) => {
      const legendItem = legend
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
        .attr("font-size", "14px") // Schriftgröße anpassen
        .text(key);

      legendX += 80; // Abstand zwischen den Elementen
    });
  }, [dimensions, sentimentData, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } w-full p-4 flex-grow flex flex-col`}
      style={{
        position: "relative",
        minHeight: "400px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Sentiment Analysis over Time
      </h2>
      <div className="flex-grow flex justify-center items-center max-h-full">
        {sentimentData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full"></svg>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis;
