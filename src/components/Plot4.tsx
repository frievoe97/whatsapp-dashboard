// src/components/Plot4.tsx
import React, { useMemo } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import { removeStopwords, deu } from "stopword";

interface WordCount {
  word: string;
  count: number;
}

interface AggregatedWordData {
  sender: string;
  topWords: WordCount[];
}

const Plot4: React.FC = () => {
  const { messages, darkMode } = useChat();

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
        .replace(/[^a-zA-Z\s]/g, "")
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
    const colors = d3.schemeCategory10;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedWordData]);

  return (
    <div
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } min-w-[800px] basis-[800px] flex-grow p-4 h-96 overflow-auto`}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Top 10 Words per Person
      </h2>
      <div className="flex flex-col md:flex-row gap-8">
        {aggregatedWordData.map((senderData) => {
          const maxCount = Math.max(
            ...senderData.topWords.map((w) => w.count),
            1
          );

          return (
            <div key={senderData.sender} className="w-full md:w-1/2">
              <h3
                className={`text-md font-medium mb-2 ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {senderData.sender}
              </h3>
              <div className="space-y-1">
                {senderData.topWords.map((wordData, index) => {
                  const barWidth = (wordData.count / maxCount) * 100;

                  return (
                    <div key={wordData.word} className="flex items-center">
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
                            backgroundColor: colorScale.get(senderData.sender),
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
    </div>
  );
};

export default Plot4;
