import React, { useMemo, useState } from "react";
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

const ITEMS_PER_PAGE = 2;

const Plot4: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const [currentPage, setCurrentPage] = useState(1);

  // Aggregiere die Top 10 Wörter pro Sender
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    const dataMap: { [sender: string]: { [word: string]: number } } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      // Tokenize und bereinige den Text
      const words = msg.message
        .toLowerCase()
        // Angepasste Regex zum Beibehalten von Umlauten
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/);

      // Entferne Stopwörter und kurze Wörter
      const filteredWords = removeStopwords(words, deu).filter(
        (word) => word.length > 2
      );

      filteredWords.forEach((word) => {
        dataMap[sender][word] = (dataMap[sender][word] || 0) + 1;
      });
    });

    // Finde die Top 10 Wörter pro Sender
    return Object.keys(dataMap).map((sender) => {
      const wordCounts = Object.entries(dataMap[sender])
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { sender, topWords: wordCounts };
    });
  }, [messages]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedWordData.map((d) => d.sender);
    const colors = d3.schemePaired;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedWordData]);

  const totalPages = Math.ceil(aggregatedWordData.length / ITEMS_PER_PAGE);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return aggregatedWordData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [aggregatedWordData, currentPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      className={`border border-black bg-white text-black w-full md:min-w-[500px] md:basis-[500px] p-4 min-h-96 overflow-auto flex-grow ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
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
                    className="w-full md:w-1/2  border border-black p-4 rounded-none"
                    style={{
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
                            <div className="w-6 text-sm text-black">
                              {index + 1}.
                            </div>
                            {/* Word */}
                            <div className="w-24 text-sm text-black">
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
                            <div className="w-8 text-sm text-black">
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
                  className={`px-2 py-1 rounded-none border border-black hover:border-black ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-black"
                  }`}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-none border border-black hover:border-black ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-black"
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
