import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import AggregatePerTime from "./components/AggregatePerTime";
import Timeline from "./components/Timeline";
import MessageRatio from "./components/MessageRatio";
import WordCount from "./components/WordCount";
import Stats from "./components/Stats";
import Heatmap from "./components/Heatmap";
import Emoji from "./components/Emoji";
import { useChat } from "./context/ChatContext"; // Verwende den ChatContext
import "./index.css";

function App() {
  const { darkMode } = useChat(); // Hole DarkMode aus dem Kontext
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    // Füge die "dark" Klasse je nach Zustand hinzu oder entferne sie
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="p-4 h-screen flex flex-col">
      {/* <h1 className="text-2xl font-bold mb-4 text-center">
        WhatsApp Dashboard
      </h1> */}
      <FileUpload onFileUpload={(uploadedFile) => setFile(uploadedFile)} />

      <div className="mt-4 flex-1 overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch">
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
