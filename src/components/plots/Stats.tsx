import React, { useMemo, useState, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import ClipLoader from "react-spinners/ClipLoader";

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

const MIN_WIDTH_PER_ITEM = 600;

/**
 * Calculates the number of items per page based on the container's width and window size.
 * Returns 1 for small devices (width < 768) and computes the number based on the container's width.
 * @param containerId - The ID of the container element.
 * @returns The number of items per page.
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
 * Plot5 component displays aggregated message statistics per sender.
 * It includes pagination, responsive design adjustments, and dark mode support.
 */
const Plot5: React.FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();
  const containerId = "plot-message-stats";

  // State for current page and items per page
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() =>
    calculateItemsPerPage(containerId)
  );

  // Handle window resize events to update itemsPerPage responsively.
  // Note: We do not reset currentPage on every resize – only update if the value changes.
  useEffect(() => {
    const handleResize = () => {
      const newItemsPerPage = calculateItemsPerPage(containerId);
      setItemsPerPage((prev) =>
        prev !== newItemsPerPage ? newItemsPerPage : prev
      );
    };

    window.addEventListener("resize", handleResize);
    // Initial calculation
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [containerId]);

  // Aggregate statistics per sender using useMemo for performance.
  const aggregatedStats: SenderStats[] = useMemo(() => {
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Count messages per sender.
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

    // Build data map with detailed statistics for each sender.
    messages.forEach((msg) => {
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessages) return;
      const sender = msg.sender;
      const date = new Date(msg.date);
      // Normalize the message text and split into words.
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

    // Convert aggregated data into an array of SenderStats objects.
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

  // Calculate total pages based on the aggregated data.
  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage]
  );

  // Ensure currentPage is within valid range if totalPages changes.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  // Get the current page's data.
  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  // Create a color scale for each sender based on dark mode and predefined D3 color schemes.
  const colorScale = useMemo(() => {
    const senders = aggregatedStats.map((d) => d.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedStats, darkMode]);

  // Pagination handlers.
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
      style={{ minHeight: "550px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Message Statistics per Person
      </h2>

      <div className="flex-grow flex justify-center items-center flex-col">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedStats.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 w-full justify-center">
              {currentStats.map((stat) => (
                <div
                  key={stat.sender}
                  className={`border p-4 rounded-none ${
                    darkMode ? "border-gray-300" : "border-black"
                  }`}
                  style={{
                    flex: `1 1 calc(${100 / itemsPerPage}% - 16px)`,
                    minWidth: "250px",
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

/**
 * StatRow component renders a single row of statistics with a label and a value.
 * It supports dark mode styling.
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

export default Plot5;
