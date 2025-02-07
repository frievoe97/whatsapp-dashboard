// src/App.tsx
import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import FileUpload from "./components/FileUpload";
import FileUploadMobile from "./components/FileUploadMobile";
import AggregatePerTime from "./components/plots/AggregatePerTime";
import Timeline from "./components/plots/Timeline";
import WordCount from "./components/plots/WordCount";
import Stats from "./components/plots/Stats";
import Sentiment from "./components/plots/Sentiment";
import Emoji from "./components/plots/Emoji";
import BarChartComp from "./components/plots/BarChartComp";
import SentimentWord from "./components/plots/SentimentWord";
import ChordDiagram from "./components/plots/ChordDiagram";
import HeatmapMonthWeekday from "./components/plots/Heatmap";
import { useChat } from "./context/ChatContext";
import "./index.css";

/**
 * Hook, der den Dark‑Mode in HTML (und Meta‑Tags) setzt.
 */
function useDarkModeThemeEffect(darkMode: boolean) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", darkMode ? "#1f2937" : "#ffffff");
  }, [darkMode]);
}

/**
 * Hook zur Angleichung der Höhen aller Kinder in einem Container (z. B. für die Analyse‑Komponenten).
 */
function useEqualRowHeights(
  containerRef: React.RefObject<HTMLDivElement>,
  dependencies: any[] = []
) {
  useEffect(() => {
    function setEqualHeights() {
      const container = containerRef.current;
      if (!container) return;
      const children = Array.from(container.children) as HTMLElement[];
      children.forEach((child) => (child.style.height = "auto"));
      let rows: HTMLElement[][] = [];
      let currentRow: HTMLElement[] = [];
      let lastTop: number | null = null;
      children.forEach((child) => {
        const top = child.offsetTop;
        if (lastTop === null || top === lastTop) {
          currentRow.push(child);
        } else {
          rows.push(currentRow);
          currentRow = [child];
        }
        lastTop = top;
      });
      if (currentRow.length) rows.push(currentRow);
      rows.forEach((row) => {
        const maxHeight = Math.max(...row.map((child) => child.offsetHeight));
        row.forEach((child) => (child.style.height = `${maxHeight}px`));
      });
    }
    setEqualHeights();
    window.addEventListener("resize", setEqualHeights);
    return () => window.removeEventListener("resize", setEqualHeights);
  }, dependencies);
}

const App: React.FC = () => {
  const { darkMode, messages } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useDarkModeThemeEffect(darkMode);
  useEqualRowHeights(containerRef, [messages.length]);

  return (
    <>
      <Helmet>
        <title>WhatsApp Dashboard – Visualize your Chats</title>
        <meta
          name="description"
          content="Analyze your WhatsApp chats with detailed charts and statistics."
        />
        <meta property="og:title" content="WhatsApp Dashboard" />
        <meta
          property="og:description"
          content="Visualize your WhatsApp chats with interactive graphics."
        />
        <meta
          property="og:image"
          content="https://whatsapp-dashboard.friedrichvoelkers.de/preview.png"
        />
        <meta
          property="og:url"
          content="https://whatsapp-dashboard.friedrichvoelkers.de"
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="p-4 flex flex-col min-h-screen md:h-screen">
        {/* Desktop & Mobile FileUpload-Komponenten */}
        <div className="hidden md:block">
          <FileUpload
            onFileUpload={(file) => {
              /* z. B. logging oder leere Funktion */
            }}
          />
        </div>

        <div className="md:hidden">
          <FileUploadMobile />
        </div>

        {/* Chat Analyse-Komponenten */}
        <div
          ref={containerRef}
          className="mt-4 md:h-full flex-1 md:overflow-y-auto flex flex-wrap gap-4 justify-between items-stretch"
        >
          {messages.length === 0 ? (
            <div
              className={`w-full flex text-lg items-center justify-center h-full border rounded-none text-center ${
                darkMode ? "border-white" : "border-black"
              }`}
            >
              Please upload a WhatsApp chat using "Select File".
            </div>
          ) : (
            <>
              <AggregatePerTime />
              <Timeline />
              <BarChartComp />
              <Emoji />
              <ChordDiagram />
              <WordCount />
              <Stats />
              <Sentiment />
              <SentimentWord />
              <HeatmapMonthWeekday />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
