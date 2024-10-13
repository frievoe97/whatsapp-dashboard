// src/components/Plot7.tsx
import React, { useMemo } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";
import emojiRegex from "emoji-regex";

interface EmojiCount {
  emoji: string;
  count: number;
}

interface AggregatedEmojiData {
  sender: string;
  topEmojis: EmojiCount[];
}

const Plot7: React.FC = () => {
  const { messages, darkMode } = useChat();

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

  return (
    <div
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } min-w-[500px] basis-[500px] flex-grow p-4 min-h-96 overflow-auto`}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Top 10 Emojis pro Person
      </h2>
      <div className="flex flex-col md:flex-row gap-8">
        {aggregatedEmojiData.map((senderData) => {
          const maxCount = Math.max(
            ...senderData.topEmojis.map((e) => e.count),
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
                {senderData.topEmojis.map((emojiData, index) => {
                  const barWidth = (emojiData.count / maxCount) * 100;

                  return (
                    <div key={emojiData.emoji} className="flex items-center">
                      {/* Rang */}
                      <div
                        className={`w-6 text-sm ${
                          darkMode ? "text-white" : "text-black"
                        }`}
                      >
                        {index + 1}.
                      </div>
                      {/* Emoji */}
                      <div
                        className={`w-12 text-xl ${
                          darkMode ? "text-white" : "text-black"
                        }`}
                        style={{
                          fontFamily:
                            '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                        }}
                      >
                        {emojiData.emoji}
                      </div>

                      {/* Balken */}
                      <div className="flex-1 bg-gray-300 h-6 mx-2 rounded">
                        <div
                          className="h-6 rounded"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: colorScale.get(senderData.sender),
                          }}
                        ></div>
                      </div>
                      {/* Anzahl */}
                      <div
                        className={`w-8 text-sm ${
                          darkMode ? "text-white" : "text-black"
                        }`}
                      >
                        {emojiData.count}
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

export default Plot7;
