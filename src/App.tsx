// App.tsx
import { useState, useEffect, useRef } from "react";
import FileUpload from "./components/FileUpload";
import FileUploadMobile from "./components/FileUploadMobile";
import AggregatePerTime from "./components/AggregatePerTime";
import Timeline from "./components/Timeline";
import MessageRatio from "./components/MessageRatio";
import WordCount from "./components/WordCount";
import Stats from "./components/Stats";
import Heatmap from "./components/Heatmap";
import Emoji from "./components/Emoji";
import { useChat } from "./context/ChatContext";
import "./index.css";

function App() {
  const { darkMode, messages } = useChat();
  const [file, setFile] = useState<File | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", darkMode ? "#1f2937" : "#ffffff");
  }, [darkMode]);

  // Falls du noch die Zeilenhöhe angleichen möchtest:
  useEffect(() => {
    function setEqualRowHeights() {
      if (!containerRef.current) return;
      const items = Array.from(
        containerRef.current.children
      ) as HTMLDivElement[];
      let rows: HTMLDivElement[][] = [];
      let currentRow: HTMLDivElement[] = [];
      let lastTop: number | null = null;

      items.forEach((item) => {
        item.style.height = "auto";
      });

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

      if (currentRow.length) {
        rows.push(currentRow);
      }

      rows.forEach((row) => {
        let maxHeight = Math.max(...row.map((item) => item.offsetHeight));
        row.forEach((item) => {
          item.style.height = `${maxHeight}px`;
        });
      });
    }
    setEqualRowHeights();
    window.addEventListener("resize", setEqualRowHeights);
    return () => window.removeEventListener("resize", setEqualRowHeights);
  }, [messages.length]);

  return (
    // Der Container hat auf mobilen Geräten (default) eine automatische Höhe,
    // auf Desktops (md und höher) wird die volle Bildschirmhöhe genutzt.
    <div className="p-4 flex flex-col h-auto md:h-screen">
      {/* Auf größeren Bildschirmen FileUpload anzeigen */}
      <div className="hidden md:block">
        <FileUpload onFileUpload={(file) => console.log(file)} />
      </div>
      {/* Auf mobilen Geräten FileUploadMobile anzeigen */}
      <div className="block md:hidden">
        <FileUploadMobile onFileUpload={(file) => console.log(file)} />
      </div>

      {/* Überprüfen, ob messages leer ist */}
      <div
        ref={containerRef}
        className="mt-4 flex-1 overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch"
      >
        {messages.length === 0 ? (
          <div
            className={`w-full p-4 flex items-center justify-center h-full border border-[1px] rounded-none  ${
              darkMode ? "border-white" : "border-black"
            } `}
          >
            No Data
          </div>
        ) : (
          <>
            <AggregatePerTime />
            <Timeline />
            <MessageRatio />
            <Heatmap />
            <Emoji />
            <WordCount />
            <Stats />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
