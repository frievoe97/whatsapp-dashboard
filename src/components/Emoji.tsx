import React, { useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import emojiRegex from "emoji-regex";
import ClipLoader from "react-spinners/ClipLoader";

interface EmojiCount {
  emoji: string;
  count: number;
}

interface AggregatedEmojiData {
  sender: string;
  topEmojis: EmojiCount[];
}

const MIN_WIDTH_PER_ITEM = 600;

const Plot7: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (window.innerWidth < 768) return 1;
    const plotWidth =
      document.getElementById("plot-emoji-count")?.offsetWidth || 0;
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
        document.getElementById("plot-emoji-count")?.offsetWidth || 0;
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

  // Verwende emoji-regex für eine umfassendere Emoji-Erkennung
  const regex = emojiRegex();

  // Aggregiere die Top 10 Emojis pro Sender
  const aggregatedEmojiData: AggregatedEmojiData[] = useMemo(() => {
    // Berechne die Gesamtanzahl der Nachrichten pro Sender
    const senderMessageCount: { [sender: string]: number } = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Datenstruktur für die Emojis
    const dataMap: { [sender: string]: { [emoji: string]: number } } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;

      // Falls der Sender die Mindestanzahl an Nachrichten nicht erreicht, überspringen
      if ((senderMessageCount[sender] || 0) < minMessages) return;

      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      // Extrahiere Emojis aus der Nachricht
      const emojis = msg.message.match(regex) || [];
      emojis.forEach((emoji) => {
        dataMap[sender][emoji] = (dataMap[sender][emoji] || 0) + 1;
      });
    });

    // Finde die Top 10 Emojis pro Sender
    return Object.keys(dataMap).map((sender) => {
      const emojiCounts = Object.entries(dataMap[sender])
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { sender, topEmojis: emojiCounts };
    });
  }, [messages, regex, minMessagePercentage]);

  // Farbschema basierend auf den Sendern

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedEmojiData.map((d) => d.sender);

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
  }, [aggregatedEmojiData, darkMode]); // Dark Mode als Dependency hinzufügen

  const totalPages = useMemo(
    () => Math.ceil(aggregatedEmojiData.length / itemsPerPage),
    [aggregatedEmojiData, itemsPerPage]
  );

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedEmojiData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedEmojiData, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id="plot-emoji-count"
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "550px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">Top 10 Emojis for Person</h2>

      {/* Bedingtes Rendering für Ladeanimation und Datenanzeige */}
      <div className="flex-grow flex justify-center items-center flex-col">
        {isUploading ? (
          // Ladeanimation anzeigen, wenn Daten hochgeladen werden
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedEmojiData.length === 0 ? (
          // "No Data" anzeigen, wenn keine Daten vorhanden sind
          <span className="text-lg">No Data Available</span>
        ) : (
          // Emojidaten und Paginierung anzeigen
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const maxCount = Math.max(
                  ...senderData.topEmojis.map((e) => e.count),
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
                      {senderData.topEmojis.map((emojiData, index) => (
                        <EmojiRow
                          key={emojiData.emoji}
                          rank={index + 1}
                          emoji={emojiData.emoji}
                          count={emojiData.count}
                          maxCount={maxCount}
                          color={colorScale.get(senderData.sender) || "#000"}
                        />
                      ))}
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

interface EmojiRowProps {
  rank: number;
  emoji: string;
  count: number;
  maxCount: number;
  color: string;
}

const EmojiRow: React.FC<EmojiRowProps> = ({
  rank,
  emoji,
  count,
  maxCount,
  color,
}) => {
  const { darkMode } = useChat(); // Dark Mode aus dem Context holen
  const barWidth = (count / maxCount) * 100;

  return (
    <div className="flex items-center">
      {/* Rang */}
      <div className={`w-6 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {rank}.
      </div>
      {/* Emoji */}
      <div
        className={`w-12 text-lg ${darkMode ? "text-white" : "text-black"}`}
        style={{
          fontFamily:
            '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        {emoji}
      </div>
      {/* Balken */}
      <div className="flex-1 bg-gray-300 h-4 mx-2">
        <div
          className="h-4"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
          }}
        ></div>
      </div>
      {/* Anzahl */}
      <div className={`w-8 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {count}
      </div>
    </div>
  );
};

export default Plot7;
