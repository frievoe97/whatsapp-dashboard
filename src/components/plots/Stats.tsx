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
 * Minimum container width per sender card. Used to calculate the number of items per page.
 */
const MIN_WIDTH_PER_ITEM = 600;

/**
 * Calculates the number of items (sender cards) per page based on the current
 * container width and window size. This function enforces:
 * - 1 item if `window.innerWidth < 768` (mobile handling),
 * - from 1 up to a maximum of 5 items in increments, based on the container width.
 *
 * @param containerId - The ID of the container element.
 * @returns Number of items per page.
 */
const calculateItemsPerPage = (containerId: string): number => {
  // If on a smaller screen (mobile), display only 1 item per page.
  if (window.innerWidth < 768) return 1;

  // Get the container's width.
  const container = document.getElementById(containerId);
  const plotWidth = container ? container.offsetWidth : 0;

  // Calculate breakpoints in steps of MIN_WIDTH_PER_ITEM.
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 4;
  return 5; // Cap at 5.
};

/**
 * Custom hook to dynamically determine the number of items per page based on
 * window resize events and a container's width. Updates only if the value changes.
 *
 * @param containerId - The ID of the container element.
 * @returns Number of items (sender cards) to display per page.
 */
const useItemsPerPage = (containerId: string): number => {
  const [itemsPerPage, setItemsPerPage] = useState<number>(() =>
    calculateItemsPerPage(containerId)
  );

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerPage = calculateItemsPerPage(containerId);
      setItemsPerPage((prev) =>
        prev !== newItemsPerPage ? newItemsPerPage : prev
      );
    };

    // Listen for window resize events to recalculate itemsPerPage.
    window.addEventListener("resize", handleResize);

    // Do an initial calculation on mount.
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [containerId]);

  return itemsPerPage;
};

/**
 * Custom hook to aggregate message statistics (e.g., average words, medians, unique words, etc.)
 * for all senders in the chat. It filters out senders who don't meet the minimum message percentage requirement.
 *
 * @param messages - All messages from the chat context.
 * @param minMessagePercentage - The minimum percentage threshold for including a sender.
 * @returns An array of sender statistics that match the threshold.
 */
const useAggregatedStats = (
  messages: any[],
  minMessagePercentage: number
): SenderStats[] => {
  return useMemo(() => {
    // Calculate total usable messages.
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Count messages per sender.
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Build a data map to hold intermediate calculations.
    type SenderDataMap = {
      messages: string[];
      wordCounts: number[];
      totalWords: number;
      dates: Date[];
      uniqueWords: Set<string>;
      totalCharacters: number;
    };

    const dataMap: Record<string, SenderDataMap> = {};

    // Populate dataMap for senders who meet the message threshold.
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;
      if (senderMessageCount[sender] < minMessages) return;

      const date = new Date(msg.date);
      // Split message text into words.
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

    // Convert the aggregated data into an array of SenderStats objects.
    return Object.keys(dataMap).map((sender) => {
      const senderData = dataMap[sender];
      const messageCount = senderData.messages.length;
      const averageWords =
        messageCount > 0 ? senderData.totalWords / messageCount : 0;

      // Sort the word counts for median calculation.
      const sortedWordCounts = [...senderData.wordCounts].sort((a, b) => a - b);
      const mid = Math.floor(sortedWordCounts.length / 2);
      const median =
        sortedWordCounts.length % 2 !== 0
          ? sortedWordCounts[mid]
          : (sortedWordCounts[mid - 1] + sortedWordCounts[mid]) / 2;

      // Compute other stats.
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
  }, [messages, minMessagePercentage]);
};

/**
 * Renders a single statistics row with a label and value.
 * Adjusts text color based on the current dark mode setting.
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
 * Renders a card (box) with all statistics for a single sender.
 * It leverages the StatRow component for visual consistency.
 */
interface SenderStatsCardProps {
  stat: SenderStats;
  darkMode: boolean;
  color: string; // color determined by colorScale
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
 * Renders pagination controls ("Previous"/"Next" and current page display).
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
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
          darkMode ? "bg-gray-800 text-white " : "text-black bg-white "
        } ${
          currentPage === 1 ? "text-gray-400 cursor-not-allowed" : ""
        } focus:outline-none focus:ring-0 focus:border-none active:border-none hover:border-none`}
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
          darkMode ? "bg-gray-800 text-white " : "text-black bg-white "
        } ${
          currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : ""
        } focus:outline-none focus:ring-0 focus:border-none active:border-none hover:border-none`}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

/**
 * Plot5 component displays aggregated message statistics per sender in a
 * responsive grid layout with optional pagination. It also supports dark mode.
 *
 * Features:
 * - Pagination with configurable number of items per page (responsive).
 * - Dark mode styling for all elements.
 * - Statistics for each sender: message count, word counts, unique words, etc.
 * - Loading indicator (ClipLoader) when new data is uploading.
 * - Hides senders that don't meet a minimum percentage threshold of messages.
 */
const Plot5: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const containerId = "plot-message-stats";

  // 1) Determine items per page using our custom hook.
  const itemsPerPage = useItemsPerPage(containerId);

  // 2) Current page state for pagination.
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 3) Aggregate all relevant statistics using our custom hook.
  const aggregatedStats = useAggregatedStats(messages, minMessagePercentage);

  // 4) Create a color scale for each sender, updated if darkMode or the set of senders changes.
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

  // 5) Calculate the total number of pages based on itemsPerPage and aggregated data.
  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage]
  );

  // Keep currentPage within valid range if totalPages changes (e.g., due to resize).
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  // 6) Slice the aggregated data to get the stats for the current page.
  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  // 7) Handlers for pagination controls.
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id={containerId}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{
        minHeight: "350px",
        maxHeight: "550px",
        overflow: "hidden",
      }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Message Statistics per Person
      </h2>

      <div className="flex-grow flex justify-center items-center flex-col">
        {/* Loading indicator if data is uploading */}
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedStats.length === 0 ? (
          // No data available text if stats array is empty
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            {/* Render the current page of sender statistics */}
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

            {/* Pagination controls (only show if more than 1 page) */}
            {totalPages > 1 && (
              <Pagination
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
