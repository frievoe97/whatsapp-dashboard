import { FC, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Select from "react-select";
import { ChevronRight, ChevronLeft } from "lucide-react";
import ClipLoader from "react-spinners/ClipLoader";
import Sentiment from "sentiment";
import { removeStopwords, deu } from "stopword";
import { useChat } from "../../context/ChatContext";
// import useResizeObserver from "../../hooks/useResizeObserver"; // If you want to use a custom hook for resizing.

//
// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

/**
 * List of valid language codes supported for sentiment analysis.
 */
const VALID_LANGUAGES = ["de", "en", "fr", "es"] as const;

/**
 * Minimum width per item (in px) to decide how many items we can display per page.
 * This helps with a simple responsive pagination calculation.
 */
const MIN_WIDTH_PER_ITEM = 600;

/**
 * Represents a single word and its aggregated sentiment data.
 */
interface WordSentimentCount {
  word: string;
  count: number;
  totalSentiment: number;
}

/**
 * Represents the aggregated top words (by sentiment) for a particular sender.
 */
interface AggregatedSentimentWordData {
  sender: string;
  topWords: WordSentimentCount[];
}

/**
 * Props for the subcomponent that displays each sender’s top words in bar chart style.
 */
interface SenderSentimentWordChartProps {
  sender: string;
  topWords: WordSentimentCount[];
  color: string;
  darkMode: boolean;
}

/**
 * Props for the pagination subcomponent.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

//
// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

/**
 * SenderSentimentWordChart
 *
 * Renders a simple bar-chart-like view for a single sender's top words.
 * - Bars are scaled relative to the maximum absolute sentiment among all displayed words.
 * - Displays word rank, word text, bar, and the numeric sentiment value.
 */
const SenderSentimentWordChart: FC<SenderSentimentWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
}) => {
  // Compute the maximum absolute total sentiment (to scale bar widths).
  const maxSentiment = useMemo(
    () => Math.max(...topWords.map((w) => Math.abs(w.totalSentiment)), 1),
    [topWords]
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
          const barWidthPercent =
            (Math.abs(wordData.totalSentiment) / maxSentiment) * 100;

          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              {/* Rank (1-based index) */}
              <div
                className={`w-6 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {index + 1}.
              </div>

              {/* Word text */}
              <div
                className={`w-24 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {wordData.word}
              </div>

              {/* Bar container */}
              <div className="flex-1 bg-gray-300 h-4 mx-2">
                <div
                  className="h-4"
                  style={{
                    width: `${barWidthPercent}%`,
                    backgroundColor: color,
                  }}
                />
              </div>

              {/* Total sentiment value (formatted) */}
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
 * Pagination
 *
 * Renders simple pagination controls: "Previous" / "Next" buttons and current page info.
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

//
// -----------------------------------------------------------------------------
// MAIN COMPONENT: SentimentWordsPlot
// -----------------------------------------------------------------------------

/**
 * SentimentWordsPlot
 *
 * Analyzes chat messages from a context (useChat) and displays, for each sender,
 * the top 10 words with the highest total positive sentiment (best) OR lowest total
 * negative sentiment (worst). Provides:
 *   - Language-based sentiment analysis (AFINN lexicon).
 *   - Filtering by minMessagePercentage (sender must have at least X% of total messages).
 *   - Simple bar visualizations for each sender's top words.
 *   - Pagination that adapts to available horizontal space (responsive).
 *   - A toggle switch to show best (positive) or worst (negative) words.
 */
const SentimentWordsPlot: FC = (): ReactElement => {
  //
  // ---------------------------------------------------------------------------
  // CONTEXT & STATE
  // ---------------------------------------------------------------------------
  const { messages, darkMode, language, isUploading, minMessagePercentage } =
    useChat();

  // Reference to the container (to measure width for responsiveness).
  const containerRef = useRef<HTMLDivElement>(null);

  // Pagination states.
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Toggle: true = show best words; false = show worst words.
  const [showBest, setShowBest] = useState<boolean>(true);

  //
  // ---------------------------------------------------------------------------
  // RESIZE HANDLING (RESPONSIVE ITEMS PER PAGE)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    /**
     * Determines how many items (charts) can fit per page based on container width
     * and a predefined minimum width per item (MIN_WIDTH_PER_ITEM).
     */
    const updateItemsPerPage = (): void => {
      let newItemsPerPage = 1;

      // Only do more advanced calculation if viewport is wide enough.
      if (window.innerWidth >= 768) {
        const plotWidth = containerRef.current?.offsetWidth || 0;

        if (plotWidth <= MIN_WIDTH_PER_ITEM) {
          newItemsPerPage = 1;
        } else if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) {
          newItemsPerPage = 2;
        } else if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) {
          newItemsPerPage = 3;
        } else if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) {
          newItemsPerPage = 4;
        } else {
          // If we have enough space for 5 or more items, we cap at 5 in this example.
          newItemsPerPage = 5;
        }
      }

      // If the new items-per-page differs, reset the currentPage to 1 to avoid out-of-range pages.
      setItemsPerPage((prev) => {
        if (prev !== newItemsPerPage) {
          setCurrentPage(1);
          return newItemsPerPage;
        }
        return prev;
      });

      // Hack/trick to force a re-render in certain scenarios.
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 0);
    };

    window.addEventListener("resize", updateItemsPerPage);
    updateItemsPerPage(); // Run once on mount.
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  //
  // ---------------------------------------------------------------------------
  // SENTIMENT ANALYZER & LEXICON LOADING
  // ---------------------------------------------------------------------------
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] =
    useState<boolean>(false);

  /**
   * Dynamically imports the correct AFINN lexicon JSON based on `language`.
   */
  useEffect(() => {
    if (!language) return;

    // If language is not in VALID_LANGUAGES, fallback to "en".
    const langToLoad = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    import(`../../assets/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
      })
      .catch((error) => {
        console.error(`Error loading AFINN-${langToLoad}.json:`, error);
      });
  }, [language]);

  /**
   * Registers the loaded AFINN lexicon with the Sentiment instance.
   */
  useEffect(() => {
    if (!language || Object.keys(afinn).length === 0) return;

    const langToUse = VALID_LANGUAGES.includes(language as any)
      ? language
      : "en";

    // Register the language with the Sentiment instance.
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });

    try {
      // Attempt a test analyze to confirm registration works.
      sentimentAnalyzer.analyze("Test", { language: langToUse });
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [language, afinn, sentimentAnalyzer]);

  //
  // ---------------------------------------------------------------------------
  // AGGREGATE SENTIMENT CALCULATION
  // ---------------------------------------------------------------------------
  const aggregatedSentimentData: AggregatedSentimentWordData[] = useMemo(() => {
    if (!language || !isLanguageRegistered) {
      return [];
    }

    // Calculate the total number of messages that are "isUsed".
    const totalMessages = messages.filter((msg) => msg.isUsed).length;
    // Convert minMessagePercentage to an absolute count of messages.
    const minMessagesCount = (minMessagePercentage / 100) * totalMessages;

    // Count how many messages each sender has (only considering `isUsed`).
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      if (!msg.isUsed) return;
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });

    // This data structure will hold intermediate values:
    // dataMap[sender][word] = { count, sentiment }
    const dataMap: {
      [sender: string]: {
        [word: string]: { count: number; sentiment: number };
      };
    } = {};

    // Process each message, filter out short words/stopwords, and accumulate counts.
    messages.forEach((msg) => {
      // Skip if message is not used or if the sender has fewer than minMessagesCount.
      if (!msg.isUsed || senderMessageCount[msg.sender] < minMessagesCount)
        return;

      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }

      // Normalize text: toLowerCase, remove non-letter chars, split by whitespace.
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, " ")
        .split(/\s+/);

      // Remove German stopwords (using `deu`). If you need dynamic stopwords for other languages,
      // you'd have to adapt this logic or the stopword library usage.
      const filteredWords = removeStopwords(words, deu).filter(
        (word) => word.length > 2
      );

      // Only count words that appear in the AFINN dictionary (afinn[word] !== undefined).
      filteredWords.forEach((word) => {
        if (afinn[word] === undefined) return;

        if (!dataMap[sender][word]) {
          dataMap[sender][word] = {
            count: 0,
            sentiment: afinn[word],
          };
        }
        dataMap[sender][word].count += 1;
      });
    });

    // Convert the dataMap into an array of AggregatedSentimentWordData.
    return Object.keys(dataMap).map((sender) => {
      const wordEntries = Object.entries(dataMap[sender]).map(
        ([word, { count, sentiment }]) => ({
          word,
          count,
          totalSentiment: count * sentiment,
        })
      );

      // Depending on the toggle, we either filter to positive or negative sentiments.
      let filteredWords: WordSentimentCount[];
      if (showBest) {
        filteredWords = wordEntries.filter((w) => w.totalSentiment > 0);
        filteredWords.sort((a, b) => b.totalSentiment - a.totalSentiment);
      } else {
        filteredWords = wordEntries.filter((w) => w.totalSentiment < 0);
        filteredWords.sort((a, b) => a.totalSentiment - b.totalSentiment);
      }

      // Take the top 10 words by absolute value.
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

  //
  // ---------------------------------------------------------------------------
  // PAGINATION LOGIC
  // ---------------------------------------------------------------------------
  const totalPages = useMemo(() => {
    if (aggregatedSentimentData.length === 0) return 1;
    return Math.ceil(aggregatedSentimentData.length / itemsPerPage);
  }, [aggregatedSentimentData, itemsPerPage]);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedSentimentData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedSentimentData, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  //
  // ---------------------------------------------------------------------------
  // COLOR SCALES (d3)
  // ---------------------------------------------------------------------------
  const colorScale: Map<string, string> = useMemo(() => {
    // Collect unique senders from the aggregated data.
    const senders = aggregatedSentimentData.map((d) => d.sender);

    // Choose a color palette; can be different for dark/light mode if desired.
    const lightPalette = d3.schemePaired;
    const darkPalette = d3.schemeSet2;

    const selectedPalette = darkMode ? darkPalette : lightPalette;
    const scale = new Map<string, string>();

    senders.forEach((sender, index) => {
      // Use modulo to wrap around the palette if there are more senders than palette colors.
      scale.set(sender, selectedPalette[index % selectedPalette.length]);
    });

    return scale;
  }, [aggregatedSentimentData, darkMode]);

  const options = [
    { value: "Best", label: "Best" },
    { value: "Worst", label: "Worst" },
  ];

  // -------------
  // React-Select Styles
  // -------------
  /**
   * Shared React-Select styles for both X and Y dropdowns.
   * Adjusts colors, sizing, and layout for better integration with Tailwind & dark mode.
   */
  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
      display: "flex",
      justifyContent: "space-between",
      marginLeft: "4px",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "0px",
      flex: "1 1 auto",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: "6px",
      marginLeft: "-5px",
      color: darkMode ? "white" : "black",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: darkMode ? "#333" : "white",
      color: darkMode ? "white" : "black",
      boxShadow: "none",
      width: "auto",
      minWidth: "fit-content",
      border: darkMode ? "1px solid white" : "1px solid black",
      borderRadius: "0",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? darkMode
          ? "#777"
          : "#ddd"
        : window.innerWidth >= 768 &&
          state.isFocused &&
          state.selectProps.menuIsOpen
        ? darkMode
          ? "#555"
          : "grey"
        : darkMode
        ? "#333"
        : "white",
      color: darkMode ? "white" : "black",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: darkMode ? "white" : "black",
    }),
  };

  //
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
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
    >
      {/* Header with Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center space-x-0">
          <span>Top 10</span>

          <Select
            value={options.find(
              (option) => option.value === (showBest ? "Best" : "Worst")
            )}
            onChange={(selected) => setShowBest(selected?.value === "Best")}
            options={options}
            isSearchable={false}
            styles={customSelectStyles}
          />

          <span>Words per Person</span>
        </h2>
        ;
      </div>
      ;{/* Main Content */}
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {isUploading ? (
          // If uploading, show loader spinner.
          <ClipLoader
            color={darkMode ? "#ffffff" : "#000000"}
            loading={true}
            size={50}
          />
        ) : aggregatedSentimentData.length === 0 ? (
          // If no data is available.
          <span className="text-lg">No Data Available</span>
        ) : (
          // Show the bar charts for the current page’s data.
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

            {/* Pagination Controls (only if more than one page of data) */}
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
