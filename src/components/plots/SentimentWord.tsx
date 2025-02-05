import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  FC,
  ReactElement,
} from "react";
import * as d3 from "d3";
import { useChat } from "../../context/ChatContext";
// import useResizeObserver from "../../hooks/useResizeObserver";
import Sentiment from "sentiment";
import { removeStopwords, deu } from "stopword";
import ClipLoader from "react-spinners/ClipLoader";

// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

// List of valid languages supported for sentiment analysis
const VALID_LANGUAGES = ["de", "en", "fr"] as const;

// For pagination responsiveness
const MIN_WIDTH_PER_ITEM = 600;

// Type for a word with aggregated sentiment data.
interface WordSentimentCount {
  word: string;
  count: number;
  totalSentiment: number; // = count * (lexicon score)
}

// Aggregated data per sender.
interface AggregatedSentimentWordData {
  sender: string;
  topWords: WordSentimentCount[];
}

// Chat message type.
interface ChatMessage {
  date: Date;
  message: string;
  isUsed: boolean;
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

/**
 * SenderSentimentWordChart renders the bar chart for a single sender’s top sentiment words.
 * The bar length is scaled relative to the maximum absolute total sentiment within the list.
 */
interface SenderSentimentWordChartProps {
  sender: string;
  topWords: WordSentimentCount[];
  color: string;
  darkMode: boolean;
}

const SenderSentimentWordChart: FC<SenderSentimentWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
}) => {
  // Calculate the maximum absolute total sentiment among the words.
  const maxSentiment = Math.max(
    ...topWords.map((w) => Math.abs(w.totalSentiment)),
    1
  );

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
          // Scale bar width relative to maximum absolute sentiment value.
          const barWidth =
            (Math.abs(wordData.totalSentiment) / maxSentiment) * 100;
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
              {/* Total Sentiment (formatted) */}
              <div
                className={`w-12 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {wordData.totalSentiment.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Pagination component renders simple pagination controls.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

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
// MAIN COMPONENT: SentimentWordsPlot
// -----------------------------------------------------------------------------

/**
 * SentimentWordsPlot analyzes chat messages per sender and displays, for each sender,
 * the top 10 words with either the highest positive (best) or lowest negative (worst)
 * aggregated sentiment impact. The component loads and registers the appropriate AFINN lexicon,
 * aggregates words (after normalization and stopword removal), computes each word’s total sentiment,
 * and provides a toggle to switch between best and worst words.
 */
const SentimentWordsPlot: FC = (): ReactElement => {
  // Extract context values.
  const { messages, darkMode, language, isUploading, minMessagePercentage } =
    useChat();

  // Refs for container (for responsiveness).
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Toggle to show best (positive) words or worst (negative) words.
  const [showBest, setShowBest] = useState<boolean>(true);

  // Resize observer to update items per page.
  useEffect(() => {
    const updateItemsPerPage = (): void => {
      let newItemsPerPage = 1;
      if (window.innerWidth >= 768) {
        const plotWidth = containerRef.current?.offsetWidth || 0;
        if (plotWidth <= MIN_WIDTH_PER_ITEM * 1) newItemsPerPage = 1;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) newItemsPerPage = 2;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) newItemsPerPage = 3;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) newItemsPerPage = 4;
        else newItemsPerPage = 5;
      }
      setItemsPerPage((prev) => {
        if (prev !== newItemsPerPage) {
          setCurrentPage(1);
          return newItemsPerPage;
        }
        return prev;
      });
    };

    window.addEventListener("resize", updateItemsPerPage);
    updateItemsPerPage();
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // ---------------------------------------------------------------------------
  // Lexicon loading & registration (similar to SentimentAnalysis)
  // ---------------------------------------------------------------------------
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] =
    useState<boolean>(false);

  useEffect(() => {
    if (!language) return;
    const langToLoad = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";
    console.log(`Loading AFINN-${langToLoad}.json for word analysis`);
    import(`../../assets/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
        console.log(`AFINN-${langToLoad} loaded successfully.`);
      })
      .catch((error) =>
        console.error(`Error loading AFINN-${langToLoad}:`, error)
      );
  }, [language]);

  useEffect(() => {
    if (!language || Object.keys(afinn).length === 0) return;
    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";
    console.log("Registering language for word analysis:", langToUse);
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });
    try {
      sentimentAnalyzer.analyze("Test", { language: langToUse });
      console.log(`Language ${langToUse} successfully registered.`);
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [language, afinn, sentimentAnalyzer]);

  // ---------------------------------------------------------------------------
  // Compute aggregated sentiment words per sender.
  // For each message: normalize text, remove stopwords, and for each word (if in lexicon)
  // aggregate count. Then, per sender, compute totalSentiment = count * lexiconScore.
  // Finally, filter & sort depending on whether we show best or worst words.
  // ---------------------------------------------------------------------------
  const aggregatedSentimentData: AggregatedSentimentWordData[] = useMemo(() => {
    if (!language || !isLanguageRegistered) return [];

    // Determine minimum messages required per sender.
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    const minMessages = (minMessagePercentage / 100) * totalMessages;

    // First, count messages per sender.
    const senderMessageCount: { [sender: string]: number } = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Aggregate word data per sender.
    const dataMap: {
      [sender: string]: {
        [word: string]: { count: number; sentiment: number };
      };
    } = {};

    messages.forEach((msg) => {
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessages) return;
      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }
      // Normalize text: lowercase and remove non-letter characters.
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, " ")
        .split(/\s+/);
      // Remove stopwords (using German stopwords as in Plot4; adapt if needed).
      const filteredWords = removeStopwords(words, deu).filter(
        (word) => word.length > 2
      );
      filteredWords.forEach((word) => {
        // Only consider the word if it exists in the lexicon.
        if (afinn[word] === undefined) return;
        if (!dataMap[sender][word]) {
          dataMap[sender][word] = { count: 0, sentiment: afinn[word] };
        }
        dataMap[sender][word].count += 1;
      });
    });

    // Build the aggregated data per sender.
    return Object.keys(dataMap).map((sender) => {
      const wordEntries = Object.entries(dataMap[sender]).map(
        ([word, { count, sentiment }]) => ({
          word,
          count,
          totalSentiment: count * sentiment,
        })
      );

      // Depending on the toggle, filter for positive (best) or negative (worst) words.
      let filteredWords: WordSentimentCount[];
      if (showBest) {
        filteredWords = wordEntries.filter((w) => w.totalSentiment > 0);
        filteredWords.sort((a, b) => b.totalSentiment - a.totalSentiment);
      } else {
        filteredWords = wordEntries.filter((w) => w.totalSentiment < 0);
        filteredWords.sort((a, b) => a.totalSentiment - b.totalSentiment); // most negative first
      }
      // Take top 10.
      const topWords = filteredWords.slice(0, 10);
      return { sender, topWords };
    });
  }, [
    messages,
    language,
    isLanguageRegistered,
    afinn,
    minMessagePercentage,
    showBest,
  ]);

  // ---------------------------------------------------------------------------
  // Pagination: determine total pages and current page’s data.
  // ---------------------------------------------------------------------------
  const totalPages = useMemo(
    () => Math.ceil(aggregatedSentimentData.length / itemsPerPage),
    [aggregatedSentimentData, itemsPerPage]
  );

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedSentimentData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedSentimentData, currentPage, itemsPerPage]);

  // Create a color mapping per sender.
  const colorScale: Map<string, string> = useMemo(() => {
    const senders = aggregatedSentimentData.map((d) => d.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedSentimentData, darkMode]);

  // Handlers for pagination.
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // ---------------------------------------------------------------------------
  // RENDERING
  // ---------------------------------------------------------------------------
  return (
    <div
      id="plot-sentiment-words"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
      style={{ minHeight: "550px", maxHeight: "550px", overflow: "hidden" }}
    >
      <h2 className="text-lg font-semibold mb-4">
        Top 10 {showBest ? "Best" : "Worst"} Words per Person
      </h2>
      {/* Toggle for Best / Worst words */}
      <div className="flex justify-center items-center mb-4 space-x-4">
        <button
          onClick={() => setShowBest(true)}
          className={`px-3 py-1 rounded-none border ${
            showBest
              ? "bg-gray-700 text-white"
              : darkMode
              ? "border-gray-300 text-white hover:border-gray-400"
              : "border-black text-black hover:border-black"
          }`}
        >
          Best Words
        </button>
        <button
          onClick={() => setShowBest(false)}
          className={`px-3 py-1 rounded-none border ${
            !showBest
              ? "bg-gray-700 text-white"
              : darkMode
              ? "border-gray-300 text-white hover:border-gray-400"
              : "border-black text-black hover:border-black"
          }`}
        >
          Worst Words
        </button>
      </div>
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {isUploading ? (
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedSentimentData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const senderColor = colorScale.get(senderData.sender) || "#000";
                return (
                  <SenderSentimentWordChart
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

export default SentimentWordsPlot;
