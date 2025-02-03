import React, { useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import ClipLoader from "react-spinners/ClipLoader";

interface SenderStats {
  sender: string;
  messageCount: number;
  averageWordsPerMessage: number;
  medianWordsPerMessage: number;
  totalWordsSent: number;
  maxWordsInMessage: number;
  activeDays: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  uniqueWordsCount: number; // Neue Statistik
  averageCharactersPerMessage: number; // Neue Statistik
}

const MIN_WIDTH_PER_ITEM = 600;

const Plot5: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (window.innerWidth < 768) return 1;
    const plotWidth =
      document.getElementById("plot-message-stats")?.offsetWidth || 0;
    if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) return 1;
    if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 2;
    if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 3;
    if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 4;
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
        document.getElementById("plot-message-stats")?.offsetWidth || 0;

      console.log("Plot Width", plotWidth);

      if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) setItemsPerPage(1);
      else if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) setItemsPerPage(2);
      else if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) setItemsPerPage(3);
      else if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) setItemsPerPage(4);
      else setItemsPerPage(5);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial setzen
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Aggregiere Statistiken pro Sender
  const aggregatedStats: SenderStats[] = useMemo(() => {
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const senderMessageCount: { [sender: string]: number } = {};
    const dataMap: {
      [sender: string]: {
        messages: string[];
        wordCounts: number[];
        totalWords: number;
        dates: Date[];
        uniqueWords: Set<string>;
        totalCharacters: number;
      };
    } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    messages.forEach((msg) => {
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessages) return;
      const sender = msg.sender;
      const date = new Date(msg.date);
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0);
      const characters = msg.message.length;

      if (!dataMap[sender]) {
        dataMap[sender] = {
          messages: [],
          wordCounts: [],
          totalWords: 0,
          dates: [],
          uniqueWords: new Set<string>(),
          totalCharacters: 0,
        };
      }

      dataMap[sender].messages.push(msg.message);
      dataMap[sender].wordCounts.push(words.length);
      dataMap[sender].totalWords += words.length;
      dataMap[sender].dates.push(date);
      words.forEach((word) => dataMap[sender].uniqueWords.add(word));
      dataMap[sender].totalCharacters += characters;
    });

    return Object.keys(dataMap).map((sender) => {
      const senderData = dataMap[sender];
      const messageCount = senderData.messages.length;
      const averageWordsPerMessage =
        messageCount > 0 ? senderData.totalWords / messageCount : 0;

      const sortedWordCounts = [...senderData.wordCounts].sort((a, b) => a - b);
      const mid = Math.floor(sortedWordCounts.length / 2);
      const medianWordsPerMessage =
        sortedWordCounts.length % 2 !== 0
          ? sortedWordCounts[mid]
          : (sortedWordCounts[mid - 1] + sortedWordCounts[mid]) / 2;

      const maxWordsInMessage = d3.max(senderData.wordCounts) || 0;
      const uniqueDays = new Set(
        senderData.dates.map((date) => d3.timeDay(date).getTime())
      );
      const activeDays = uniqueDays.size;
      const uniqueWordsCount = senderData.uniqueWords.size;
      const averageCharactersPerMessage =
        messageCount > 0 ? senderData.totalCharacters / messageCount : 0;

      return {
        sender,
        messageCount,
        averageWordsPerMessage: parseFloat(averageWordsPerMessage.toFixed(2)),
        medianWordsPerMessage: parseFloat(medianWordsPerMessage.toFixed(2)),
        totalWordsSent: senderData.totalWords,
        maxWordsInMessage,
        activeDays,
        firstMessageDate: d3.min(senderData.dates) as Date,
        lastMessageDate: d3.max(senderData.dates) as Date,
        uniqueWordsCount,
        averageCharactersPerMessage: parseFloat(
          averageCharactersPerMessage.toFixed(2)
        ),
      };
    });
  }, [messages, minMessagePercentage]);

  // Farbschema basierend auf den Sendern

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedStats.map((d) => d.sender);

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
  }, [aggregatedStats, darkMode]); // Dark Mode als Dependency hinzufügen

  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage]
  );

  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id="plot-message-stats"
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "550px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Message Statistics per Person
      </h2>

      {/* Bedingtes Rendering für Ladeanimation und Datenanzeige */}
      <div className="flex-grow flex justify-center items-center flex-col">
        {isUploading ? (
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedStats.length === 0 ? (
          // "No Data" anzeigen, wenn keine Daten vorhanden sind
          <span className="text-lg">No Data Available</span>
        ) : (
          // Statistiken und Paginierung anzeigen
          <>
            <div className="flex flex-wrap gap-4 w-full justify-center">
              {currentStats.map((stat) => (
                <div
                  key={stat.sender}
                  className={`border p-4 rounded-none ${
                    darkMode ? "border-gray-300" : "border-black"
                  }`}
                  style={{
                    flex: `1 1 calc(${100 / itemsPerPage}% - 16px)`, // Flexible Breite mit Abstand berücksichtigt
                    minWidth: "250px", // Mindestbreite für bessere Darstellung

                    borderLeft: `4px solid ${colorScale.get(stat.sender)}`,
                  }}
                >
                  <h3 className="text-md font-medium mb-2">{stat.sender}</h3>
                  <div className="space-y-1">
                    <StatRow
                      label="Number of Messages:"
                      value={stat.messageCount}
                    />
                    <StatRow
                      label="Avg. Words per Message:"
                      value={stat.averageWordsPerMessage}
                    />
                    <StatRow
                      label="Median Words per Message:"
                      value={stat.medianWordsPerMessage}
                    />
                    <StatRow
                      label="Total Words Sent:"
                      value={stat.totalWordsSent}
                    />
                    <StatRow
                      label="Max Words in a Message:"
                      value={stat.maxWordsInMessage}
                    />
                    <StatRow label="Active Days:" value={stat.activeDays} />
                    <StatRow
                      label="Unique Words Count:"
                      value={stat.uniqueWordsCount}
                    />
                    <StatRow
                      label="Avg. Characters per Message:"
                      value={stat.averageCharactersPerMessage}
                    />
                    <StatRow
                      label="First Message:"
                      value={d3.timeFormat("%d.%m.%Y %H:%M")(
                        stat.firstMessageDate
                      )}
                    />
                    <StatRow
                      label="Last Message:"
                      value={d3.timeFormat("%d.%m.%Y %H:%M")(
                        stat.lastMessageDate
                      )}
                    />
                  </div>
                </div>
              ))}
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

interface StatRowProps {
  label: string;
  value: string | number;
}

const StatRow: React.FC<StatRowProps> = ({ label, value }) => {
  const { darkMode } = useChat();

  return (
    <div
      className={`flex justify-between h-[28px] ${
        darkMode ? "text-white" : "text-black"
      }`}
    >
      <span className={`text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {label}
      </span>
      <span className={`text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {value}
      </span>
    </div>
  );
};

export default Plot5;
