import React, { useMemo, useState } from "react";
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

const ITEMS_PER_PAGE = 2;

const Plot7: React.FC = () => {
  const { messages, darkMode, isUploading } = useChat();
  const [currentPage, setCurrentPage] = useState(1);

  // Verwende emoji-regex für eine umfassendere Emoji-Erkennung
  const regex = emojiRegex();

  // Aggregiere die Top 10 Emojis pro Sender
  const aggregatedEmojiData: AggregatedEmojiData[] = useMemo(() => {
    const dataMap: { [sender: string]: { [emoji: string]: number } } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
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
  }, [messages, regex]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedEmojiData.map((d) => d.sender);
    const colors = d3.schemePaired;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedEmojiData]);

  const totalPages = Math.ceil(aggregatedEmojiData.length / ITEMS_PER_PAGE);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return aggregatedEmojiData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [aggregatedEmojiData, currentPage]);

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
      <h2 className="text-lg font-semibold mb-4">Top 10 Emojis pro Person</h2>

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
                    className="w-full md:w-1/2 border border-black p-4 rounded-none min-w-0"
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
  const barWidth = (count / maxCount) * 100;

  return (
    <div className="flex items-center">
      {/* Rang */}
      <div className="w-6 text-sm text-black">{rank}.</div>
      {/* Emoji */}
      <div
        className="w-12 text-lg text-black"
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
      <div className="w-8 text-sm text-black">{count}</div>
    </div>
  );
};

export default Plot7;
