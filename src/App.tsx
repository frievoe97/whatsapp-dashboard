import { useState, useEffect, useRef } from "react";
import FileUpload from "./components/FileUpload";
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

  useEffect(() => {
    function setEqualRowHeights() {
      if (!containerRef.current) return;

      const items = Array.from(
        containerRef.current.children
      ) as HTMLDivElement[];
      let rows: HTMLDivElement[][] = [];
      let currentRow: HTMLDivElement[] = [];
      let lastTop: number | null = null;

      // Höhe zurücksetzen, damit die richtige Höhe gemessen wird
      items.forEach((item) => {
        item.style.height = "auto";
      });

      // Elemente nach Zeilen gruppieren
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

      // Höchste Höhe pro Zeile bestimmen und setzen
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
    <div className="p-4 h-screen flex flex-col">
      <FileUpload onFileUpload={(uploadedFile) => setFile(uploadedFile)} />

      <div
        ref={containerRef}
        className="mt-4 flex-1 overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch"
      >
        <AggregatePerTime />
        <Timeline />
        <MessageRatio />
        <Heatmap />
        <Emoji />
        <WordCount />
        <Stats />
      </div>
    </div>
  );
}

export default App;
