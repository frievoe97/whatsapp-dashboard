import { useState, useEffect } from "react";
import FileUpload from "./components/FileUpload";
import Plot1 from "./components/Plot1";
import Plot2 from "./components/Plot2";
import Plot3 from "./components/Plot3";
import Plot4 from "./components/Plot4";
import Plot5 from "./components/Plot5";
import Plot6 from "./components/Plot6";
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
      <h1 className="text-2xl font-bold mb-4 text-center">
        WhatsApp Dashboard
      </h1>
      <FileUpload onFileUpload={(uploadedFile) => setFile(uploadedFile)} />

      <div className="mt-4 flex-1 overflow-y-auto flex flex-wrap gap-4 justify-start items-stretch">
        <Plot1 />
        <Plot2 />
        <Plot3 />
        <Plot6 />
        <Plot4 />
        <Plot5 />
      </div>
    </div>
  );
}

export default App;
