import { useMemo, useState, useEffect, useRef, FC, ReactElement } from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import { removeStopwords, deu, eng, fra } from "stopword";
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
 */
interface SenderWordChartProps {
  sender: string;
  topWords: WordCount[];
  color: string;
  darkMode: boolean;
}

/**
 * Props for the Pagination component.
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
 * Component to render the word count chart for a single sender.
 */
const SenderWordChart: FC<SenderWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
}) => {
  // Calculate the maximum word count to scale the bar widths
  const maxCount = Math.max(...topWords.map((w) => w.count), 1);

  return (
    <div
      className={`border p-4 rounded-none ${
        darkMode ? "border-gray-300" : "border-black"
      }`}
      // Use flex basis so that multiple charts can share the row equally.
      style={{
        flex: "1 1 auto",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h3 className="text-md font-medium mb-2">{sender}</h3>
      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          // Calculate the width percentage for the bar representation.
          const barWidth = (wordData.count / maxCount) * 100;

          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
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
                    backgroundColor: color,
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
};

/**
 * Component to render pagination controls.
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
        onClick={onNext}
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
  );
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * Plot4 Component
 *
 * This component displays the top 10 words per sender, aggregated from chat messages.
 * It adapts to different screen sizes by showing a variable number of sender charts per page,
 * and provides pagination for navigation. It also supports dark mode and shows a loading
 * spinner when data is being uploaded.
 */
const Plot4: FC = (): ReactElement => {
  // Retrieve necessary data and configuration from the Chat context.
  const { messages, darkMode, isUploading, minMessagePercentage, language } =
    useChat();

  // Current page for pagination.
  const [currentPage, setCurrentPage] = useState(1);

  // Number of sender charts to display per page.
  const [itemsPerPage, setItemsPerPage] = useState(1);

  // Create a ref to the container so we can measure its width for responsiveness.
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Determines and updates the number of items per page based on the current screen
   * width and container width.
   */
  const updateItemsPerPage = (): void => {
    let newItemsPerPage = 1;
    if (window.innerWidth >= 768) {
      const plotWidth = containerRef.current?.offsetWidth || 0;
      if (plotWidth <= 670) newItemsPerPage = 1;
      else if (plotWidth <= 1340) newItemsPerPage = 2;
      else if (plotWidth <= 2010) newItemsPerPage = 3;
      else if (plotWidth <= 2680) newItemsPerPage = 4;
      else newItemsPerPage = 5;
    }

    // Aktualisiere nur, wenn sich itemsPerPage ändert.
    setItemsPerPage((prev) => {
      if (prev !== newItemsPerPage) {
        setCurrentPage(1);
        return newItemsPerPage;
      }
      return prev;
    });
  };

  // Update items per page when the component mounts and whenever the window resizes.
  useEffect(() => {
    window.addEventListener("resize", updateItemsPerPage);
    updateItemsPerPage(); // Initial calculation

    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  /**
   * Aggregates the top 10 words per sender from the messages.
   *
   * It filters out messages that are not marked as used and senders that do not
   * meet the minimum message threshold based on minMessagePercentage.
   * The text is normalized (lowercased, non-letter characters removed),
   * stopwords are removed, and only words with more than 2 characters are counted.
   */
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    // Count the total used messages to determine the minimum threshold per sender.
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    const senderMessageCount: { [sender: string]: number } = {};
    const dataMap: { [sender: string]: { [word: string]: number } } = {};

    // Count how many messages each sender has.
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Process each message to count words per sender.
    messages.forEach((msg) => {
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessages) return;

      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      // Normalize the message: lowercase, remove non-letter characters, and split by whitespace.
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, "")
        .split(/\s+/);

      let filteredWords = [];

      if (language === "de") {
        // Remove stopwords and filter out short words.
        filteredWords = removeStopwords(words, deu).filter(
          (word) => word.length > 2
        );
      } else if (language === "en") {
        // Remove stopwords and filter out short words.
        filteredWords = removeStopwords(words, eng).filter(
          (word) => word.length > 2
        );
      } else if (language === "fr") {
        // Remove stopwords and filter out short words.
        filteredWords = removeStopwords(words, fra).filter(
          (word) => word.length > 2
        );
      } else {
        // Remove stopwords and filter out short words.
        filteredWords = removeStopwords(words, eng).filter(
          (word) => word.length > 2
        );
      }

      filteredWords.forEach((word) => {
        dataMap[sender][word] = (dataMap[sender][word] || 0) + 1;
      });
    });

    // For each sender, sort the words by frequency and take the top 10.
    return Object.keys(dataMap).map((sender) => {
      const wordCounts = Object.entries(dataMap[sender])
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { sender, topWords: wordCounts };
    });
  }, [messages, minMessagePercentage, language]);

  /**
   * Creates a color mapping for each sender using D3 color schemes.
   *
   * Depending on whether darkMode is enabled, a different palette is chosen.
   */
  const colorScale: Map<string, string> = useMemo(() => {
    const senders = aggregatedWordData.map((d) => d.sender);
    const lightColors = d3.schemePaired; // Light mode palette
    const darkColors = d3.schemeSet2; // Dark mode palette

    const colors = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedWordData, darkMode]);

  // Calculate the total number of pages based on the items per page.
  const totalPages = useMemo(
    () => Math.ceil(aggregatedWordData.length / itemsPerPage),
    [aggregatedWordData, itemsPerPage]
  );

  // Get the aggregated data for the current page.
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedWordData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedWordData, currentPage, itemsPerPage]);

  // Handlers for pagination.
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
          // Display loading spinner while data is uploading.
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedWordData.length === 0 ? (
          // Display message if there is no data.
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const senderColor = colorScale.get(senderData.sender) || "#000";
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
