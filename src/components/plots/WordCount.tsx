import { FC, ReactElement, useMemo, useState, useEffect, useRef } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import { removeStopwords, deu, eng, fra, spa } from "stopword";
import { ChevronRight, ChevronLeft } from "lucide-react";
import ClipLoader from "react-spinners/ClipLoader";

// -----------------------------------------------------------------------------
// TypeScript Interfaces
// -----------------------------------------------------------------------------

/**
 * Represents the count for a given word.
 */
interface WordCount {
  word: string;
  count: number;
}

/**
 * Aggregated data per sender.
 */
interface AggregatedWordData {
  sender: string;
  topWords: WordCount[];
}

/**
 * Props for the SenderWordChart component.
 * Displays the top word counts for a single sender in a simple bar chart style.
 */
interface SenderWordChartProps {
  sender: string;
  topWords: WordCount[];
  color: string;
  darkMode: boolean;
}

/**
 * Props for the Pagination component.
 * Provides pagination controls and displays the current page of senders.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

/**
 * SenderWordChart
 *
 * Renders a bar chart for a single sender, displaying the top words and their counts.
 * Each bar's width is determined by its relative frequency compared to the
 * most-used word from that sender.
 */
const SenderWordChart: FC<SenderWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
}) => {
  // Determine the largest word count for scaling the bar widths.
  const maxCount = Math.max(...topWords.map((w) => w.count), 1);

  return (
    <div
      className={`border p-4 rounded-none ${
        darkMode ? "border-gray-300" : "border-black"
      }`}
      style={{
        flex: "1 1 auto",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h3 className="text-md font-medium mb-2">{sender}</h3>
      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          // Calculate relative width (percentage) of the bar.
          const barWidth = (wordData.count / maxCount) * 100;

          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              {/* Rank of the word in the top list */}
              <div
                className={`w-6 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {index + 1}.
              </div>
              {/* Word itself */}
              <div
                className={`w-28 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {wordData.word}
              </div>
              {/* Bar showing frequency */}
              <div className="flex-1 bg-gray-300 h-4 mr-2">
                <div
                  className="h-4"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {/* Count of occurrences */}
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
};

/**
 * Pagination
 *
 * Displays pagination controls for navigating between different pages
 * of sender charts.
 */
const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  darkMode,
  onPrev,
  onNext,
}) => {
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

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * Plot4 Component
 *
 * Displays the top 10 words per sender, aggregated from the available chat messages.
 * Automatically adjusts layout (number of charts per row) based on the container's width.
 * Provides pagination if there are more senders than can fit on a single row.
 *
 * Features:
 * - Dark mode styling support.
 * - Loading spinner (ClipLoader) when data is being uploaded.
 * - Minimum message percentage filter for senders (those below the threshold are excluded).
 * - Language-based stopword removal (supported languages: "de", "en", "es", "fr").
 * - Pagination controls for navigating through multiple senders.
 */
const Plot4: FC = (): ReactElement => {
  // Bring in relevant data and configuration from the Chat context.
  const { messages, darkMode, isUploading, minMessagePercentage, language } =
    useChat();

  /**
   * Track pagination state.
   * currentPage: The current page of sender charts.
   * itemsPerPage: How many senders to show side-by-side on one page.
   */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  /**
   * Use a ref for the container element in order to measure its width.
   * This helps us decide how many items can be displayed in a row.
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Adjust the number of items per page based on container width and screen size.
   * This function is called both on mount and whenever the window is resized.
   */
  const updateItemsPerPage = (): void => {
    let newItemsPerPage = 1;

    // On smaller screens, we default to showing just 1 chart per row.
    if (window.innerWidth >= 768) {
      const plotWidth = containerRef.current?.offsetWidth || 0;
      if (plotWidth <= 670) newItemsPerPage = 1;
      else if (plotWidth <= 1340) newItemsPerPage = 2;
      else if (plotWidth <= 2010) newItemsPerPage = 3;
      else if (plotWidth <= 2680) newItemsPerPage = 4;
      else newItemsPerPage = 5;
    }

    setItemsPerPage((prevItemsPerPage) => {
      // Only update if the number actually changed.
      if (prevItemsPerPage !== newItemsPerPage) {
        // Whenever we change itemsPerPage, reset to page 1 to avoid out-of-bound pages.
        setCurrentPage(1);
        return newItemsPerPage;
      }
      return prevItemsPerPage;
    });
  };

  // Set up a listener for window resizing to re-check itemsPerPage.
  useEffect(() => {
    window.addEventListener("resize", updateItemsPerPage);
    updateItemsPerPage(); // Initial calculation on mount
    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  /**
   * Memoized computation to aggregate the word data per sender.
   *
   * 1) Filter out messages that are not marked "isUsed".
   * 2) Calculate the minimum number of messages per sender, based on minMessagePercentage.
   * 3) Count occurrences of words per sender, removing stopwords and ignoring short words.
   * 4) Collect the top 10 words for each sender.
   */
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    // Determine how many messages in total are used.
    const totalUsedMessages = messages.filter((msg) => msg.isUsed).length;
    const minRequiredMessages =
      (minMessagePercentage / 100) * totalUsedMessages;

    const senderMessageCount: Record<string, number> = {};
    const senderWordCountMap: Record<string, Record<string, number>> = {};

    // First pass: count how many messages each sender has (only for used messages).
    messages.forEach((msg) => {
      if (msg.isUsed) {
        senderMessageCount[msg.sender] =
          (senderMessageCount[msg.sender] || 0) + 1;
      }
    });

    // Second pass: build a map of word counts per sender.
    messages.forEach((msg) => {
      if (!msg.isUsed) return;

      // Skip senders who do not meet the min message threshold.
      if (senderMessageCount[msg.sender] < minRequiredMessages) return;

      const { sender, message } = msg;
      senderWordCountMap[sender] = senderWordCountMap[sender] || {};

      // Normalize the text: make lowercase, remove non-letter characters.
      // Then split by whitespace.
      const words = message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/);

      // Based on the selected language, remove stopwords and short words.
      let filteredWords: string[] = [];
      switch (language) {
        case "de":
          filteredWords = removeStopwords(words, deu).filter(
            (word) => word.length > 2
          );
          break;
        case "en":
          filteredWords = removeStopwords(words, eng).filter(
            (word) => word.length > 2
          );
          break;
        case "es":
          filteredWords = removeStopwords(words, spa).filter(
            (word) => word.length > 2
          );
          break;
        case "fr":
          filteredWords = removeStopwords(words, fra).filter(
            (word) => word.length > 2
          );
          break;
        default:
          // Fallback to English stopwords
          filteredWords = removeStopwords(words, eng).filter(
            (word) => word.length > 2
          );
          break;
      }

      // Count each word occurrence for this sender.
      filteredWords.forEach((word) => {
        senderWordCountMap[sender][word] =
          (senderWordCountMap[sender][word] || 0) + 1;
      });
    });

    // Build the final structure: for each sender, pick the top 10 words.
    return Object.keys(senderWordCountMap).map((sender) => {
      const wordCounts = Object.entries(senderWordCountMap[sender])
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { sender, topWords: wordCounts };
    });
  }, [messages, minMessagePercentage, language]);

  /**
   * Memoized color scale assignment for each sender.
   * Uses different D3 color schemes for light vs. dark mode.
   */
  const colorScale: Map<string, string> = useMemo(() => {
    // Gather all senders we will display.
    const senders = aggregatedWordData.map((d) => d.sender);

    // Select color palettes:
    // - Light mode: d3.schemePaired (12 colors)
    // - Dark mode: d3.schemeSet2 (8 colors)
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;

    // Assign a color to each sender, looping through the palette if necessary.
    const scaleMap = new Map<string, string>();
    senders.forEach((sender, index) => {
      scaleMap.set(sender, colors[index % colors.length]);
    });

    return scaleMap;
  }, [aggregatedWordData, darkMode]);

  /**
   * Determine the total number of pages for pagination, based on itemsPerPage.
   */
  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedWordData.length / itemsPerPage);
  }, [aggregatedWordData, itemsPerPage]);

  /**
   * Slice the aggregated data to only show the relevant sender charts
   * for the current page.
   */
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedWordData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedWordData, currentPage, itemsPerPage]);

  /**
   * Handlers to navigate to the previous or next page of charts.
   */
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id="plot-word-count"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">Top 10 Words per Person</h2>

      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {isUploading ? (
          // Show a loading spinner while data is being uploaded
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedWordData.length === 0 ? (
          // If there's no data, show a message to the user
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            {/* Charts for the current page (each sender) */}
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const senderColor =
                  colorScale.get(senderData.sender) || "#000000";
                return (
                  <SenderWordChart
                    key={senderData.sender}
                    sender={senderData.sender}
                    topWords={senderData.topWords}
                    color={senderColor}
                    darkMode={darkMode}
                  />
                );
              })}
            </div>

            {/* Pagination controls if we have more than one page */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                darkMode={darkMode}
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

export default Plot4;
