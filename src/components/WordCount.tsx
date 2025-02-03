import React, { useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { removeStopwords, deu } from "stopword";
import ClipLoader from "react-spinners/ClipLoader";

interface WordCount {
  word: string;
  count: number;
}

interface AggregatedWordData {
  sender: string;
  topWords: WordCount[];
}

const Plot4: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (window.innerWidth < 768) return 1;
    const plotWidth =
      document.getElementById("plot-word-count")?.offsetWidth || 0;
    if (plotWidth <= 670) return 1;
    if (plotWidth <= 1340) return 2;
    if (plotWidth <= 2010) return 3;
    if (plotWidth <= 2680) return 4;
    return 5;
  });

  useEffect(() => {
    const handleResize = () => {
      setCurrentPage(1); // Zur ersten Seite zurückkehren
      if (window.innerWidth < 768) {
        setItemsPerPage(1);
        return;
      }

      const plotWidth =
        document.getElementById("plot-word-count")?.offsetWidth || 0;
      if (plotWidth <= 670) setItemsPerPage(1);
      else if (plotWidth <= 1340) setItemsPerPage(2);
      else if (plotWidth <= 2010) setItemsPerPage(3);
      else if (plotWidth <= 2680) setItemsPerPage(4);
      else setItemsPerPage(5);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial setzen
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Aggregiere die Top 10 Wörter pro Sender
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const senderMessageCount: { [sender: string]: number } = {};
    const dataMap: { [sender: string]: { [word: string]: number } } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    messages.forEach((msg) => {
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessages) return;
      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/);

      const filteredWords = removeStopwords(words, deu).filter(
        (word) => word.length > 2
      );

      filteredWords.forEach((word) => {
        dataMap[sender][word] = (dataMap[sender][word] || 0) + 1;
      });
    });

    return Object.keys(dataMap).map((sender) => {
      const wordCounts = Object.entries(dataMap[sender])
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { sender, topWords: wordCounts };
    });
  }, [messages, minMessagePercentage]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedWordData.map((d) => d.sender);

    // Definiere unterschiedliche Farbpaletten für Light- und Dark-Mode
    const lightColors = d3.schemePaired; // Bestehende Farbschema für Light Mode
    const darkColors = d3.schemeSet2;

    // Wähle die Farbpalette basierend auf dem Dark Mode Zustand
    const colors = darkMode ? darkColors : lightColors;

    // Erstelle eine Farbzuteilung für jeden Sender
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });

    return scale;
  }, [aggregatedWordData, darkMode]); // Dark Mode als Dependency hinzufügen

  const totalPages = useMemo(
    () => Math.ceil(aggregatedWordData.length / itemsPerPage),
    [aggregatedWordData, itemsPerPage]
  );

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedWordData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedWordData, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id="plot-word-count"
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "550px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">Top 10 Words per Person</h2>

      {/* Bedingtes Rendering für Ladeanimation und Datenanzeige */}
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {isUploading ? (
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedWordData.length === 0 ? (
          // "No Data" anzeigen, wenn keine Daten vorhanden sind
          <span className="text-lg">No Data Available</span>
        ) : (
          // Wörterdaten und Paginierung anzeigen
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const maxCount = Math.max(
                  ...senderData.topWords.map((w) => w.count),
                  1
                );

                return (
                  <div
                    key={senderData.sender}
                    className={`border p-4 rounded-none ${
                      darkMode ? "border-gray-300" : "border-black"
                    }`}
                    style={{
                      flex: `1 1 calc(${100 / itemsPerPage}% - 16px)`,

                      borderLeft: `4px solid ${colorScale.get(
                        senderData.sender
                      )}`,
                    }}
                  >
                    <h3 className="text-md font-medium mb-2">
                      {senderData.sender}
                    </h3>
                    <div className="space-y-1">
                      {senderData.topWords.map((wordData, index) => {
                        const barWidth = (wordData.count / maxCount) * 100;

                        return (
                          <div
                            key={wordData.word}
                            className="flex items-center h-[28px]"
                          >
                            {/* Rank */}
                            <div
                              className={`w-6 text-sm ${
                                darkMode ? "text-white" : "text-black"
                              }`}
                            >
                              {index + 1}.
                            </div>
                            {/* Word */}
                            <div
                              className={`w-24 text-sm ${
                                darkMode ? "text-white" : "text-black"
                              }`}
                            >
                              {wordData.word}
                            </div>
                            {/* Bar */}
                            <div className="flex-1 bg-gray-300 h-4 mx-2">
                              <div
                                className="h-4"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: colorScale.get(
                                    senderData.sender
                                  ),
                                }}
                              ></div>
                            </div>
                            {/* Count */}
                            <div
                              className={`w-8 text-sm ${
                                darkMode ? "text-white" : "text-black"
                              }`}
                            >
                              {wordData.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded-none border ${
                    darkMode
                      ? "border-gray-300 text-white hover:border-gray-400"
                      : "border-black text-black hover:border-black"
                  } ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed border-gray-400"
                      : ""
                  }`}
                >
                  Previous
                </button>
                <span className={darkMode ? "text-white" : "text-black"}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-none border ${
                    darkMode
                      ? "border-gray-300 text-white hover:border-gray-400"
                      : "border-black text-black hover:border-black"
                  } ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed border-gray-400"
                      : ""
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Plot4;
