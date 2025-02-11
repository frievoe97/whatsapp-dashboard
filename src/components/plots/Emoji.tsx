import { FC, useEffect, useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
import emojiRegex from "emoji-regex";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import useResizeObserver from "../../hooks/useResizeObserver";

/* -------------------------------------------------------------------------- */
/*                               Types & Constants                          */
/* -------------------------------------------------------------------------- */

const MIN_WIDTH_PER_ITEM = 600;

interface EmojiCount {
  emoji: string;
  count: number;
}

interface AggregatedEmojiData {
  sender: string;
  topEmojis: EmojiCount[];
}

/* -------------------------------------------------------------------------- */
/*                          Helper Functions                                */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the number of items per page based on container width.
 */
function calculateItemsPerPage(containerId: string): number {
  if (window.innerWidth < 768) return 1;
  const container = document.getElementById(containerId);
  const plotWidth = container?.offsetWidth ?? 0;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 4;
  return 5;
}

/**
 * Custom hook to calculate items per page responsively.
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

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [containerId]);

  return itemsPerPage;
}

/**
 * Aggregates emoji data from messages.
 * Jetzt werden alle Nachrichten aus filteredMessages genutzt.
 */
function useAggregatedEmojiData(
  messages: { sender: string; message: string }[]
): AggregatedEmojiData[] {
  return useMemo(() => {
    // Zähle Nachrichten pro Sender
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Emoji-Zählung pro Sender
    const dataMap: Record<string, Record<string, number>> = {};
    const regex = emojiRegex();

    messages.forEach((msg) => {
      const sender = msg.sender;
      // Keine zusätzliche Filterung anhand eines Mindestprozentsatzes – alle Nachrichten werden genutzt.
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }
      const foundEmojis = msg.message.match(regex) || [];
      foundEmojis.forEach((emoji) => {
        dataMap[sender][emoji] = (dataMap[sender][emoji] || 0) + 1;
      });
    });

    return Object.keys(dataMap).map((sender) => {
      const sortedEmojiCounts = Object.entries(dataMap[sender])
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return { sender, topEmojis: sortedEmojiCounts };
    });
  }, [messages]);
}

/* -------------------------------------------------------------------------- */
/*                          EmojiRow & SenderEmojiCard                      */
/* -------------------------------------------------------------------------- */

interface EmojiRowProps {
  rank: number;
  emoji: string;
  count: number;
  maxCount: number;
  color: string;
}

const EmojiRow: FC<EmojiRowProps> = ({
  rank,
  emoji,
  count,
  maxCount,
  color,
}) => {
  const { darkMode } = useChat();
  const barWidth = (count / maxCount) * 100;

  return (
    <div className="flex items-center">
      <div className={`w-6 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {rank}.
      </div>
      <div
        className={`w-12 text-lg ${darkMode ? "text-white" : "text-black"}`}
        style={{
          fontFamily:
            '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
        }}
      >
        {emoji}
      </div>
      <div className="flex-1 bg-gray-300 h-4 mx-2">
        <div
          className="h-4"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className={`w-8 text-sm ${darkMode ? "text-white" : "text-black"}`}>
        {count}
      </div>
    </div>
  );
};

interface SenderEmojiCardProps {
  senderData: AggregatedEmojiData;
  colorScale: Map<string, string>;
}

const SenderEmojiCard: FC<SenderEmojiCardProps> = ({
  senderData,
  colorScale,
}) => {
  const { darkMode } = useChat();

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
      style={{ borderLeft: `4px solid ${borderLeftColor}` }}
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

/* -------------------------------------------------------------------------- */
/*                             EmojiPlot Component                          */
/* -------------------------------------------------------------------------- */

const EmojiPlot: FC = () => {
  // Nun ausschließlich filteredMessages nutzen
  const { filteredMessages, darkMode } = useChat();

  const containerId = "plot-emoji-count";
  const itemsPerPage = useResponsiveItemsPerPage(containerId);
  const [currentPage, setCurrentPage] = useState(1);

  const aggregatedEmojiData = useAggregatedEmojiData(filteredMessages);

  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedEmojiData.length / itemsPerPage);
  }, [aggregatedEmojiData, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return aggregatedEmojiData.slice(startIndex, endIndex);
  }, [aggregatedEmojiData, currentPage, itemsPerPage]);

  const colorScale = useMemo(() => {
    const senders = aggregatedEmojiData.map((d) => d.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const palette = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, palette[index % palette.length]);
    });
    return scale;
  }, [aggregatedEmojiData, darkMode]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  return (
    <div
      id={containerId}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">Top 10 Emojis for Person</h2>

      <div className="flex-grow flex justify-center items-center flex-col">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => (
                <div
                  key={senderData.sender}
                  style={{
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
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 border ${
                    darkMode
                      ? "bg-gray-800 text-white "
                      : "text-black bg-white "
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
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 border ${
                    darkMode
                      ? "bg-gray-800 text-white "
                      : "text-black bg-white "
                  } ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : ""
                  } focus:outline-none`}
                >
                  <ChevronRight className="w-6 h-6" />
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
