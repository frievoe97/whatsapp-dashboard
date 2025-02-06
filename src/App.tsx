import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import FileUpload from "./components/FileUpload";
import FileUploadMobile from "./components/FileUploadMobile";
import AggregatePerTime from "./components/plots/AggregatePerTime";
import Timeline from "./components/plots/Timeline";
import WordCount from "./components/plots/WordCount";
import Stats from "./components/plots/Stats";
import Sentiment from "./components/plots/Sentiment";
import HeatmapDayHour from "./components/plots/HeatmapDayHour";
import Emoji from "./components/plots/Emoji";
import BarChartComp from "./components/plots/BarChartComp";
import SentimentWord from "./components/plots/SentimentWord";
import ChordDiagram from "./components/plots/ChordDiagram";
import { useChat } from "./context/ChatContext";
import "./index.css";
import HeatmapMonthWeekday from "./components/plots/HeatmapMonthWeekday";

/**
 * Custom hook to update the document's dark mode class and theme-color meta tag.
 *
 * This hook toggles the "dark" class on the document root and ensures the
 * theme-color meta tag reflects the current mode (dark/light). If the meta tag
 * is missing, it creates one.
 *
 * @param darkMode - A boolean indicating whether dark mode is enabled.
 */
function useDarkModeThemeEffect(darkMode: boolean) {
  // Toggle dark mode class on the document root element.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Update the theme-color meta tag.
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
 * Custom hook that ensures all child elements within a container have equal heights
 * per row. This is especially useful when using flexbox layouts to maintain UI consistency.
 *
 * @param containerRef - A React ref object that points to the container element.
 * @param dependencies - An optional dependency array that re-runs the effect when changed.
 */
function useEqualRowHeights(
  containerRef: React.RefObject<HTMLDivElement>,
  dependencies: any[] = []
) {
  useEffect(() => {
    /**
     * Iterates over the container’s children, groups them by rows based on their
     * top offset, and then sets each element’s height in a row to the maximum height found.
     */
    function setEqualRowHeights() {
      const container = containerRef.current;
      if (!container) return;

      // Get all children elements.
      const items = Array.from(container.children) as HTMLDivElement[];

      // Reset heights to auto to calculate natural heights.
      items.forEach((item) => (item.style.height = "auto"));

      // Group items into rows based on their top offset.
      const rows: HTMLDivElement[][] = [];
      let currentRow: HTMLDivElement[] = [];
      let lastTop: number | null = null;

      items.forEach((item) => {
        const top = item.offsetTop;
        if (lastTop === null || top === lastTop) {
          currentRow.push(item);
        } else {
          rows.push(currentRow);
          currentRow = [item];
        }
        lastTop = top;
      });
      if (currentRow.length) rows.push(currentRow);

      // For each row, calculate the maximum height and assign it to all items.
      rows.forEach((row) => {
        const maxHeight = Math.max(...row.map((item) => item.offsetHeight));
        row.forEach((item) => (item.style.height = `${maxHeight}px`));
      });
    }

    // Execute the height equalization on mount and whenever dependencies change.
    setEqualRowHeights();

    // Re-calculate heights on window resize.
    window.addEventListener("resize", setEqualRowHeights);
    return () => window.removeEventListener("resize", setEqualRowHeights);
  }, dependencies);
}

/**
 * Main Application Component.
 *
 * This component serves as the entry point for the WhatsApp Dashboard application.
 * It handles SEO meta tags, theme settings (dark/light), responsive file upload components,
 * and renders various chat analysis visualizations based on the uploaded messages.
 *
 * All existing functionalities (dark mode, SEO, equal row heights, file uploads, and chat analysis)
 * have been preserved while cleaning up the code structure.
 *
 * @returns A JSX element representing the complete application UI.
 */
const App: React.FC = () => {
  const { darkMode, messages } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Apply dark mode and update the theme-color meta tag.
  useDarkModeThemeEffect(darkMode);

  // Ensure all analysis components in the container have equal heights per row.
  useEqualRowHeights(containerRef, [messages.length]);

  return (
    <>
      {/* SEO Meta-Tags */}
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

      {/* Main Container */}
      <div className="p-4 flex flex-col min-h-screen md:h-screen">
        {/* File Upload Components (Desktop & Mobile) */}
        <div className="hidden md:block">
          <FileUpload onFileUpload={(file: File) => console.log(file)} />
        </div>
        <div className="md:hidden">
          <FileUploadMobile onFileUpload={(file: File) => console.log(file)} />
        </div>

        {/* Chat Analysis Components */}
        <div
          ref={containerRef}
          className="mt-4  md:h-full flex-1 md:overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch"
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
              <HeatmapDayHour />
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
