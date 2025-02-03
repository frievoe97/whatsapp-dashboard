import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import FileUpload from "./components/FileUpload";
import FileUploadMobile from "./components/FileUploadMobile";
import AggregatePerTime from "./components/AggregatePerTime";
import Timeline from "./components/Timeline";
// import MessageRatio from "./components/MessageRatio";
import WordCount from "./components/WordCount";
import Stats from "./components/Stats";
// import Heatmap from "./components/Heatmap";
import Sentiment from "./components/Sentiment";
import HeatmapDayHour from "./components/HeatmapDayHour";
import Emoji from "./components/Emoji";
import BarChartComp from "./components/BarChartComp";
import { useChat } from "./context/ChatContext";
import "./index.css";

function App() {
  const { darkMode, messages } = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Updates the dark mode class on the document root.
   */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  /**
   * Updates the theme color meta tag based on the dark mode state.
   */
  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", darkMode ? "#1f2937" : "#ffffff");
  }, [darkMode]);

  /**
   * Ensures all elements in the same row have equal height for better UI consistency.
   */
  useEffect(() => {
    function setEqualRowHeights() {
      if (!containerRef.current) return;
      const items = Array.from(
        containerRef.current.children
      ) as HTMLDivElement[];
      let rows: HTMLDivElement[][] = [];
      let currentRow: HTMLDivElement[] = [];
      let lastTop: number | null = null;

      items.forEach((item) => (item.style.height = "auto"));

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

      rows.forEach((row) => {
        const maxHeight = Math.max(...row.map((item) => item.offsetHeight));
        row.forEach((item) => (item.style.height = `${maxHeight}px`));
      });
    }

    setEqualRowHeights();
    window.addEventListener("resize", setEqualRowHeights);
    return () => window.removeEventListener("resize", setEqualRowHeights);
  }, [messages.length]);

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
      <div className="p-4 flex flex-col h-full md:h-screen">
        {/* File Upload Components (Desktop & Mobile) */}
        <div className="hidden md:block">
          <FileUpload onFileUpload={(file) => console.log(file)} />
        </div>
        <div className="block md:hidden">
          <FileUploadMobile onFileUpload={(file) => console.log(file)} />
        </div>

        {/* Chat Analysis Components */}
        <div
          ref={containerRef}
          className="mt-4 h-full flex-1 overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch"
        >
          {messages.length === 0 ? (
            <div
              className={`w-full flex items-center justify-center h-full border rounded-none ${
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
              {/*<MessageRatio />*/}
              <Emoji />
              <WordCount />
              <Stats />
              <HeatmapDayHour />
              {/*<Heatmap />*/}
              <Sentiment />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
