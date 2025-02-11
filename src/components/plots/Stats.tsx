import React, { useMemo, useState, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import ClipLoader from "react-spinners/ClipLoader";
import { ChevronRight, ChevronLeft } from "lucide-react";

/**
 * Represents statistics for a single sender.
 */
export interface SenderStats {
  sender: string;
  messageCount: number;
  averageWordsPerMessage: number;
  medianWordsPerMessage: number;
  totalWordsSent: number;
  maxWordsInMessage: number;
  activeDays: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  uniqueWordsCount: number;
  averageCharactersPerMessage: number;
}

/**
 * Minimum container width per sender card.
 */
const MIN_WIDTH_PER_ITEM = 600;

/**
 * Calculates the number of items (sender cards) per page based on the container width.
 */
const calculateItemsPerPage = (containerId: string): number => {
  if (window.innerWidth < 768) return 1;
  const container = document.getElementById(containerId);
  const plotWidth = container ? container.offsetWidth : 0;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 4;
  return 5;
};

/**
 * Custom hook to determine the number of items per page.
 */
const useItemsPerPage = (containerId: string): number => {
  const [itemsPerPage, setItemsPerPage] = useState<number>(() =>
    calculateItemsPerPage(containerId)
  );

  React.useEffect(() => {
    const handleResize = () => {
      const newItemsPerPage = calculateItemsPerPage(containerId);
      setItemsPerPage((prev) =>
        prev !== newItemsPerPage ? newItemsPerPage : prev
      );
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [containerId]);

  return itemsPerPage;
};

/**
 * Custom hook to aggregate statistics per sender.
 * Da das Backend bereits filtert, entfällt hier der minMessagePercentage-Filter
 * und die Prüfung auf msg.isUsed.
 */
const useAggregatedStats = (messages: any[]): SenderStats[] => {
  return useMemo(() => {
    const totalMessages = messages.length;
    const minMessages = 0; // Kein Mindestprozentsatz mehr

    // Zähle Nachrichten pro Sender.
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      // Direkt alle Nachrichten verwenden.
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Sammle weitere Statistiken pro Sender.
    type SenderDataMap = {
      messages: string[];
      wordCounts: number[];
      totalWords: number;
      dates: Date[];
      uniqueWords: Set<string>;
      totalCharacters: number;
    };

    const dataMap: Record<string, SenderDataMap> = {};

    messages.forEach((msg) => {
      const sender = msg.sender;
      // Keine Filterung mehr – alle Nachrichten werden genutzt.
      const date = new Date(msg.date);
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/)
        .filter((word: string) => word.length > 0);

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
      dataMap[sender].totalCharacters += characters;
      words.forEach((word: string) => dataMap[sender].uniqueWords.add(word));
    });

    return Object.keys(dataMap).map((sender) => {
      const senderData = dataMap[sender];
      const messageCount = senderData.messages.length;
      const averageWords =
        messageCount > 0 ? senderData.totalWords / messageCount : 0;

      const sortedWordCounts = [...senderData.wordCounts].sort((a, b) => a - b);
      const mid = Math.floor(sortedWordCounts.length / 2);
      const median =
        sortedWordCounts.length % 2 !== 0
          ? sortedWordCounts[mid]
          : (sortedWordCounts[mid - 1] + sortedWordCounts[mid]) / 2;

      const maxWordsInMessage = d3.max(senderData.wordCounts) || 0;
      const uniqueDays = new Set(
        senderData.dates.map((date) => d3.timeDay(date).getTime())
      );
      const firstMessageDate = d3.min(senderData.dates) as Date;
      const lastMessageDate = d3.max(senderData.dates) as Date;
      const averageCharacters =
        messageCount > 0 ? senderData.totalCharacters / messageCount : 0;

      return {
        sender,
        messageCount,
        averageWordsPerMessage: parseFloat(averageWords.toFixed(2)),
        medianWordsPerMessage: parseFloat(median.toFixed(2)),
        totalWordsSent: senderData.totalWords,
        maxWordsInMessage,
        activeDays: uniqueDays.size,
        firstMessageDate,
        lastMessageDate,
        uniqueWordsCount: senderData.uniqueWords.size,
        averageCharactersPerMessage: parseFloat(averageCharacters.toFixed(2)),
      };
    });
  }, [messages]);
};

/**
 * Renders a row with a label and a value.
 */
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
      <span className="text-sm">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
};

/**
 * Renders a card with statistics for a single sender.
 */
interface SenderStatsCardProps {
  stat: SenderStats;
  darkMode: boolean;
  color: string;
}

const SenderStatsCard: React.FC<SenderStatsCardProps> = ({
  stat,
  darkMode,
  color,
}) => {
  return (
    <div
      className={`border p-4 rounded-none ${
        darkMode ? "border-gray-300" : "border-black"
      }`}
      style={{
        minWidth: "250px",
        borderLeft: `4px solid ${color}`,
        flex: "1 1 calc(50% - 16px)",
      }}
    >
      <h3 className="text-md font-medium mb-2">{stat.sender}</h3>
      <div className="space-y-1">
        <StatRow label="Number of Messages:" value={stat.messageCount} />
        <StatRow
          label="Avg. Words per Message:"
          value={stat.averageWordsPerMessage}
        />
        <StatRow
          label="Median Words per Message:"
          value={stat.medianWordsPerMessage}
        />
        <StatRow label="Total Words Sent:" value={stat.totalWordsSent} />
        <StatRow
          label="Max Words in a Message:"
          value={stat.maxWordsInMessage}
        />
        <StatRow label="Active Days:" value={stat.activeDays} />
        <StatRow label="Unique Words Count:" value={stat.uniqueWordsCount} />
        <StatRow
          label="Avg. Characters per Message:"
          value={stat.averageCharactersPerMessage}
        />
        <StatRow
          label="First Message:"
          value={d3.timeFormat("%d.%m.%Y %H:%M")(stat.firstMessageDate)}
        />
        <StatRow
          label="Last Message:"
          value={d3.timeFormat("%d.%m.%Y %H:%M")(stat.lastMessageDate)}
        />
      </div>
    </div>
  );
};

/**
 * Renders pagination controls.
 */
interface PaginationPropsPlot5 {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const PaginationPlot5: React.FC<PaginationPropsPlot5> = ({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}) => {
  const { darkMode } = useChat();
  return (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className={`px-2 py-1 border ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        } ${
          currentPage === 1 ? "text-gray-400 cursor-not-allowed" : ""
        } focus:outline-none`}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <span className={darkMode ? "text-white" : "text-black"}>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={`px-2 py-1 border ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        } ${
          currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : ""
        } focus:outline-none`}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

/**
 * Main component: Plot5 – Message Statistics per Person.
 * Jetzt werden ausschließlich die Nachrichten aus filteredMessages verwendet.
 */
const Plot5: React.FC = () => {
  const { filteredMessages, darkMode } = useChat();

  // Verwende jetzt filteredMessages statt messages.
  const itemsPerPage = useItemsPerPage("plot-message-stats");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Aggregiere Statistiken – minMessagePercentage entfällt.
  const aggregatedStats = useAggregatedStats(filteredMessages);

  const colorScale = useMemo(() => {
    const senders = aggregatedStats.map((stat) => stat.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedStats, darkMode]);

  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [currentPage, totalPages]);

  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div
      id="plot-message-stats"
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Message Statistics per Person
      </h2>
      <div className="flex-grow flex justify-center items-center flex-col">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 w-full justify-center">
              {currentStats.map((stat) => (
                <SenderStatsCard
                  key={stat.sender}
                  stat={stat}
                  darkMode={darkMode}
                  color={colorScale.get(stat.sender) || "#000"}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <PaginationPlot5
                currentPage={currentPage}
                totalPages={totalPages}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Plot5;
