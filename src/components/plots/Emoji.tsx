import {
  useState,
  useEffect,
  useMemo,
  FC,
  ReactElement,
  useCallback,
} from "react";
import { useChat } from "../../context/ChatContext";
import * as d3 from "d3";
import emojiRegex from "emoji-regex";
import ClipLoader from "react-spinners/ClipLoader";

/**
 * Represents a single emoji and its count.
 */
interface EmojiCount {
  emoji: string;
  count: number;
}

/**
 * Represents the aggregated top emojis for a single sender.
 */
interface AggregatedEmojiData {
  sender: string;
  topEmojis: EmojiCount[];
}

/**
 * Minimum width (in px) required for each item (sender card) in the display.
 */
const MIN_WIDTH_PER_ITEM = 600;

/**
 * Calculates how many items (sender cards) we can display per page based on
 * the container width and the viewport size. This logic ensures responsiveness
 * on both mobile and desktop.
 *
 * @param containerId - The ID of the container element.
 * @returns The calculated number of items per page.
 */
function calculateItemsPerPage(containerId: string): number {
  // If the screen width is below 768px, show only 1 item per page.
  if (window.innerWidth < 768) return 1;

  // Otherwise, look at the container's actual width.
  const container = document.getElementById(containerId);
  const plotWidth = container?.offsetWidth ?? 0;

  // For every 600px (MIN_WIDTH_PER_ITEM), we can fit an additional item.
  // This stepwise logic ensures a controlled layout.
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 4;
  return 5;
}

/**
 * A custom hook that calculates the aggregated top 10 emojis per sender.
 * It filters out senders with fewer than `minMessagePercentage` of the total messages.
 *
 * @param messages - The array of message objects from the chat.
 * @param minMessagePercentage - The minimum percentage of total messages a sender must have to be included.
 * @returns An array of AggregatedEmojiData for each sender that meets the criteria.
 */
function useAggregatedEmojiData(
  messages: { sender: string; message: string; isUsed: boolean }[],
  minMessagePercentage: number
): AggregatedEmojiData[] {
  return useMemo(() => {
    // Count how many messages each sender has (only counting isUsed messages).
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Calculate the minimum messages needed per sender to be considered.
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // Prepare a data map to store the emoji counts per sender.
    const dataMap: Record<string, Record<string, number>> = {};
    const regex = emojiRegex();

    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      const sender = msg.sender;

      // Ignore this sender if they don't meet the min. messages threshold.
      if ((senderMessageCount[sender] || 0) < minMessages) return;

      // Initialize the sender's map if it doesn't exist yet.
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      // Extract all emojis in the message string.
      const foundEmojis = msg.message.match(regex) || [];
      foundEmojis.forEach((emoji) => {
        dataMap[sender][emoji] = (dataMap[sender][emoji] || 0) + 1;
      });
    });

    // Build an array of AggregatedEmojiData: top 10 emojis for each sender.
    return Object.keys(dataMap).map((sender) => {
      const sortedEmojiCounts = Object.entries(dataMap[sender])
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { sender, topEmojis: sortedEmojiCounts };
    });
  }, [messages, minMessagePercentage]);
}

/**
 * A custom hook that calculates the number of items (sender cards) to display per page,
 * updating automatically on window resize.
 *
 * @param containerId - The ID of the container element.
 * @returns The current number of items to display per page.
 */
function useResponsiveItemsPerPage(containerId: string): number {
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

    // Listen for window resize to recalculate item count.
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [containerId]);

  return itemsPerPage;
}

/**
 * Represents the props for a single row displaying an emoji count.
 */
interface EmojiRowProps {
  rank: number;
  emoji: string;
  count: number;
  maxCount: number;
  color: string;
}

/**
 * A row component that shows:
 * - The rank of the emoji (1st, 2nd, 3rd, ...)
 * - The emoji character itself
 * - A progress bar scaled by `count`
 * - The numerical count of occurrences
 */
const EmojiRow: FC<EmojiRowProps> = ({
  rank,
  emoji,
  count,
  maxCount,
  color,
}): ReactElement => {
  const { darkMode } = useChat();
  const barWidth = (count / maxCount) * 100;

  return (
    <div className="flex items-center">
      {/* Rank number */}
      <div className={`w-6 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {rank}.
      </div>

      {/* Emoji character */}
      <div
        className={`w-12 text-lg ${darkMode ? "text-white" : "text-black"}`}
        style={{
          fontFamily:
            '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        {emoji}
      </div>

      {/* Progress bar */}
      <div className="flex-1 bg-gray-300 h-4 mx-2">
        <div
          className="h-4"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Count number */}
      <div className={`w-8 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {count}
      </div>
    </div>
  );
};

/**
 * Props for rendering the sender card that contains top emojis for a single sender.
 */
interface SenderEmojiCardProps {
  senderData: AggregatedEmojiData;
  colorScale: Map<string, string>;
}

/**
 * SenderEmojiCard component displays a single sender’s name and
 * a list of their top emojis in ranked order.
 */
const SenderEmojiCard: FC<SenderEmojiCardProps> = ({
  senderData,
  colorScale,
}) => {
  const { darkMode } = useChat();

  // Compute the maximum count among top emojis to scale the progress bars.
  const maxCount = useMemo(
    () =>
      Math.max(
        ...senderData.topEmojis.map((emojiCount) => emojiCount.count),
        1
      ),
    [senderData.topEmojis]
  );

  const borderLeftColor = colorScale.get(senderData.sender) ?? "#000";

  return (
    <div
      className={`border p-4 rounded-none ${
        darkMode ? "border-gray-300" : "border-black"
      }`}
      style={{
        borderLeft: `4px solid ${borderLeftColor}`,
      }}
    >
      <h3 className="text-md font-medium mb-2">{senderData.sender}</h3>
      <div className="space-y-1">
        {senderData.topEmojis.map((emojiData, index) => (
          <EmojiRow
            key={emojiData.emoji}
            rank={index + 1}
            emoji={emojiData.emoji}
            count={emojiData.count}
            maxCount={maxCount}
            color={borderLeftColor}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * EmojiPlot component:
 * - Displays the top 10 emojis per sender, filtered by a minimum message percentage threshold.
 * - Supports pagination (previous/next) based on responsive items-per-page logic.
 * - Shows a loading spinner when data is being uploaded.
 * - Adapts to dark mode (changes colors and text).
 */
const EmojiPlot: FC = () => {
  const { messages, darkMode, isUploading, minMessagePercentage } = useChat();

  // The container ID for the plot. This is used to calculate its width for responsiveness.
  const containerId = "plot-emoji-count";

  // Calculate the items to display per page based on container width / viewport size.
  const itemsPerPage = useResponsiveItemsPerPage(containerId);

  // Keep track of the current page in the pagination.
  const [currentPage, setCurrentPage] = useState(1);

  // Recompute aggregated emoji data whenever messages or minMessagePercentage changes.
  const aggregatedEmojiData = useAggregatedEmojiData(
    messages,
    minMessagePercentage
  );

  // Compute how many pages we need in total.
  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedEmojiData.length / itemsPerPage);
  }, [aggregatedEmojiData, itemsPerPage]);

  // Ensure currentPage is valid if totalPages changes (e.g., we shrink from 3 to 2 pages).
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  // Extract the data slice for the current page.
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return aggregatedEmojiData.slice(startIndex, endIndex);
  }, [aggregatedEmojiData, currentPage, itemsPerPage]);

  /**
   * Create a color scale to assign each sender a distinct color.
   * d3 provides color palettes like schemePaired (light) and schemeSet2 (dark).
   */
  const colorScale = useMemo(() => {
    const senders = aggregatedEmojiData.map((d) => d.sender);
    // We'll switch color palettes based on darkMode.
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const palette = darkMode ? darkColors : lightColors;

    // Create a map from sender -> color.
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, palette[index % palette.length]);
    });
    return scale;
  }, [aggregatedEmojiData, darkMode]);

  // Pagination handlers.
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  return (
    <div
      id={containerId}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">Top 10 Emojis for Person</h2>

      <div className="flex-grow flex justify-center items-center flex-col">
        {isUploading ? (
          // Loading state while data is being uploaded
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedEmojiData.length === 0 ? (
          // If no data is available to display
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            {/* Sender Cards (the main content) */}
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => (
                <div
                  key={senderData.sender}
                  style={{
                    // Make sure each card shares available space in a row
                    flex: `1 1 calc(${100 / itemsPerPage}% - 16px)`,
                  }}
                >
                  <SenderEmojiCard
                    senderData={senderData}
                    colorScale={colorScale}
                  />
                </div>
              ))}
            </div>

            {/* Pagination Controls (if multiple pages exist) */}
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

export default EmojiPlot;
