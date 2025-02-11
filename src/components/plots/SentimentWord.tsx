import { FC, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Sentiment from "sentiment";
import { removeStopwords, deu, eng, fra, spa } from "stopword";
import { useChat } from "../../context/ChatContext";
import Select from "react-select";

const MIN_WIDTH_PER_ITEM = 600;
const VALID_LANGUAGES = ["de", "en", "fr", "es"] as const;

interface WordSentimentCount {
  word: string;
  count: number;
  totalSentiment: number;
}

interface AggregatedSentimentWordData {
  sender: string;
  topWords: WordSentimentCount[];
}

interface SenderSentimentWordChartProps {
  sender: string;
  topWords: WordSentimentCount[];
  color: string;
  darkMode: boolean;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const SenderSentimentWordChart: FC<SenderSentimentWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
}) => {
  const maxSentiment = useMemo(
    () => Math.max(...topWords.map((w) => Math.abs(w.totalSentiment)), 1),
    [topWords]
  );
  return (
    <div
      className={`border p-4 rounded-none ${
        darkMode ? "border-gray-300" : "border-black"
      }`}
      style={{ flex: "1 1 auto", borderLeft: `4px solid ${color}` }}
    >
      <h3 className="text-md font-medium mb-2">{sender}</h3>
      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          const barWidthPercent =
            (Math.abs(wordData.totalSentiment) / maxSentiment) * 100;
          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              <div
                className={`w-6 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {index + 1}.
              </div>
              <div
                className={`w-24 text-sm ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {wordData.word}
              </div>
              <div className="flex-1 bg-gray-300 h-4 mx-2">
                <div
                  className="h-4"
                  style={{
                    width: `${barWidthPercent}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
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

const PaginationSWP: FC<PaginationProps> = ({
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

const SentimentWordsPlot: FC = (): ReactElement => {
  const { filteredMessages, darkMode, language } = useChat();
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showBest, setShowBest] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateItemsPerPage = (): void => {
      let newItemsPerPage = 1;
      if (window.innerWidth >= 768) {
        const plotWidth = containerRef.current?.offsetWidth || 0;
        if (plotWidth <= MIN_WIDTH_PER_ITEM) newItemsPerPage = 1;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) newItemsPerPage = 2;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) newItemsPerPage = 3;
        else if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) newItemsPerPage = 4;
        else newItemsPerPage = 5;
      }
      setItemsPerPage((prev) =>
        prev !== newItemsPerPage ? newItemsPerPage : prev
      );
      setCurrentPage(1);
      setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    };
    window.addEventListener("resize", updateItemsPerPage);
    updateItemsPerPage();
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Ladevorgang des AFINN-Lexikons hinzufügen:
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!language) return;
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

  const aggregatedSentimentData: AggregatedSentimentWordData[] = useMemo(() => {
    if (!language) return [];

    const senderMessageCount: Record<string, number> = {};
    filteredMessages.forEach((msg) => {
      senderMessageCount[msg.sender] =
        (senderMessageCount[msg.sender] || 0) + 1;
    });
    const dataMap: {
      [sender: string]: {
        [word: string]: { count: number; sentiment: number };
      };
    } = {};
    filteredMessages.forEach((msg) => {
      const sender = msg.sender;
      if (!dataMap[sender]) {
        dataMap[sender] = {};
      }
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, " ")
        .split(/\s+/);
      const filteredWords = removeStopwords(words, deu).filter(
        (word) => word.length > 2
      );
      filteredWords.forEach((word) => {
        if (afinn[word] === undefined) return;
        if (!dataMap[sender][word]) {
          dataMap[sender][word] = { count: 0, sentiment: afinn[word] };
        }
        dataMap[sender][word].count += 1;
      });
    });
    return Object.keys(dataMap).map((sender) => {
      const wordEntries = Object.entries(dataMap[sender]).map(
        ([word, { count, sentiment }]) => ({
          word,
          count,
          totalSentiment: count * sentiment,
        })
      );
      let filteredWords: WordSentimentCount[];
      if (showBest) {
        filteredWords = wordEntries.filter((w) => w.totalSentiment > 0);
        filteredWords.sort((a, b) => b.totalSentiment - a.totalSentiment);
      } else {
        filteredWords = wordEntries.filter((w) => w.totalSentiment < 0);
        filteredWords.sort((a, b) => a.totalSentiment - b.totalSentiment);
      }
      const topWords = filteredWords.slice(0, 10);
      return { sender, topWords };
    });
  }, [filteredMessages, language, afinn, showBest]);

  const totalPages = useMemo(() => {
    if (aggregatedSentimentData.length === 0) return 1;
    return Math.ceil(aggregatedSentimentData.length / itemsPerPage);
  }, [aggregatedSentimentData, itemsPerPage]);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedSentimentData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedSentimentData, currentPage, itemsPerPage]);

  const colorScale: Map<string, string> = useMemo(() => {
    const senders = aggregatedSentimentData.map((d) => d.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const palette = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, palette[index % palette.length]);
    });
    return scale;
  }, [aggregatedSentimentData, darkMode]);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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
    indicatorSeparator: () => ({ display: "none" }),
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

  return (
    <div
      id="plot-sentiment-words"
      ref={containerRef}
      style={{ minHeight: "350px", maxHeight: "550px", overflow: "hidden" }}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode
          ? "border-gray-300 bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center space-x-0">
          <span>Top 10</span>
          <Select
            value={{
              value: showBest ? "Best" : "Worst",
              label: showBest ? "Best" : "Worst",
            }}
            onChange={(selected) => setShowBest(selected?.value === "Best")}
            options={[
              { value: "Best", label: "Best" },
              { value: "Worst", label: "Worst" },
            ]}
            isSearchable={false}
            styles={customSelectStyles}
          />
          <span>Words per Person</span>
        </h2>
      </div>
      <div className="flex-grow flex justify-center items-center flex-col">
        {filteredMessages.length === 0 ? (
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
              <PaginationSWP
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
