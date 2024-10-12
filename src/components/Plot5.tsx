// src/components/Plot5.tsx
import React, { useMemo } from "react";
import { useChat } from "../context/ChatContext";
import * as d3 from "d3";

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
}

const Plot5: React.FC = () => {
  const { messages, darkMode } = useChat();

  // Aggregiere Statistiken pro Sender
  const aggregatedStats: SenderStats[] = useMemo(() => {
    const dataMap: {
      [sender: string]: {
        messages: string[];
        wordCounts: number[];
        totalWords: number;
        dates: Date[];
      };
    } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
      const date = new Date(msg.date);
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-Z\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0);

      if (!dataMap[sender]) {
        dataMap[sender] = {
          messages: [],
          wordCounts: [],
          totalWords: 0,
          dates: [],
        };
      }

      dataMap[sender].messages.push(msg.message);
      dataMap[sender].wordCounts.push(words.length);
      dataMap[sender].totalWords += words.length;
      dataMap[sender].dates.push(date);
    });

    return Object.keys(dataMap).map((sender) => {
      const senderData = dataMap[sender];
      const messageCount = senderData.messages.length;
      const averageWordsPerMessage =
        messageCount > 0 ? senderData.totalWords / messageCount : 0;

      // Median Wörter pro Nachricht
      const sortedWordCounts = [...senderData.wordCounts].sort((a, b) => a - b);
      const mid = Math.floor(sortedWordCounts.length / 2);
      const medianWordsPerMessage =
        sortedWordCounts.length % 2 !== 0
          ? sortedWordCounts[mid]
          : (sortedWordCounts[mid - 1] + sortedWordCounts[mid]) / 2;

      // Maximale Wörter in einer Nachricht
      const maxWordsInMessage = d3.max(senderData.wordCounts) || 0;

      // Aktive Tage
      const uniqueDays = new Set(
        senderData.dates.map((date) => d3.timeDay(date))
      );
      const activeDays = uniqueDays.size;

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
      };
    });
  }, [messages]);

  // Farbschema basierend auf den Sendern
  const colorScale = useMemo(() => {
    const senders = aggregatedStats.map((d) => d.sender);
    const colors = d3.schemeCategory10;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedStats]);

  return (
    <div
      className={`border-[1px] ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      } min-w-[800px] p-4 min-h-96 overflow-auto flex-grow`}
    >
      <h2
        className={`text-lg font-semibold mb-4 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        Message Statistics per Person
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aggregatedStats.map((stat) => (
          <div
            key={stat.sender}
            className={`border-[1px] p-4 ${
              darkMode ? "border-white" : "border-black"
            }`}
            style={{ borderLeft: `4px solid ${colorScale.get(stat.sender)}` }}
          >
            <h3
              className={`text-md font-medium mb-2 ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {stat.sender}
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Number of Messages:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.messageCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Avg. Words per Message:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.averageWordsPerMessage}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Median Words per Message:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.medianWordsPerMessage}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Total Words Sent:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.totalWordsSent}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Max Words in a Message:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.maxWordsInMessage}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Active Days:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {stat.activeDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  First Message:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {d3.timeFormat("%d.%m.%Y %H:%M")(stat.firstMessageDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Last Message:
                </span>
                <span
                  className={`text-sm ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {d3.timeFormat("%d.%m.%Y %H:%M")(stat.lastMessageDate)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Plot5;
