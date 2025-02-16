import { FC, ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import Select from 'react-select';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import Sentiment from 'sentiment';
import { removeStopwords, deu } from 'stopword';
import { useChat } from '../../context/ChatContext';
import { ChatMetadata } from '../../types/chatTypes';

//
// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

/**
 * List of valid language codes supported for sentiment analysis.
 */
const VALID_LANGUAGES = ['de', 'en', 'fr', 'es'] as const;

/**
 * Minimum width per item (in px) to decide how many items we can display per page.
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
  useShortNames: boolean;
  metadata: ChatMetadata | null;
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
 */
const SenderSentimentWordChart: FC<SenderSentimentWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
  useShortNames,
  metadata,
}) => {
  // Compute the maximum absolute total sentiment (to scale bar widths).
  const maxSentiment = useMemo(
    () => Math.max(...topWords.map((w) => Math.abs(w.totalSentiment)), 1),
    [topWords],
  );

  return (
    <div
      id="sender-sentiment-word-chart"
      className={`border p-4 rounded-none ${darkMode ? 'border-gray-300' : 'border-black'}`}
      style={{
        flex: '1 1 auto',
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* <h3 className="text-md font-medium mb-2">{sender}</h3> */}
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[sender] ? metadata.sendersShort[sender] : sender}
      </h3>

      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          const barWidthPercent = (Math.abs(wordData.totalSentiment) / maxSentiment) * 100;

          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              {/* Rank (1-based index) */}
              <div className={`w-6 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {index + 1}.
              </div>

              {/* Word text */}
              <div className={`w-24 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
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
              <div className={`w-12 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
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
const Pagination: FC<PaginationProps> = ({ currentPage, totalPages, darkMode, onPrev, onNext }) => {
  return (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className={`px-2 py-1 border ${
          darkMode ? 'bg-gray-800 text-white ' : 'text-black bg-white '
        } ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : ''} focus:outline-none`}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <span className={darkMode ? 'text-white' : 'text-black'}>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={`px-2 py-1 border ${
          darkMode ? 'bg-gray-800 text-white ' : 'text-black bg-white '
        } ${
          currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : ''
        } focus:outline-none`}
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
 * Analysiert Chat-Nachrichten aus dem Context (useChat) und zeigt für jeden Sender
 * die Top 10 Wörter mit dem höchsten (best) bzw. niedrigsten (worst) Gesamtsentiment.
 * Enthält:
 *   - Sprache-basierte Sentiment-Analyse (AFINN-Lexikon).
 *   - Ein Toggle (über react‑select) zur Auswahl zwischen "Best" und "Worst" Wörtern.
 *   - Responsive Pagination, die sich an der verfügbaren Breite orientiert.
 */
const SentimentWordsPlot: FC = (): ReactElement => {
  // Verwende nun ausschließlich filteredMessages; isUploading und minMessagePercentage entfallen.
  // const { filteredMessages, darkMode, metadata } = useChat();
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();

  // Reference zum Container (für responsive Breitenmessung).
  const containerRef = useRef<HTMLDivElement>(null);

  // Pagination-States.
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Toggle: true = "Best" (positive), false = "Worst" (negative).
  const [showBest, setShowBest] = useState<boolean>(true);

  //
  // ---------------------------------------------------------------------------
  // RESIZE HANDLING (RESPONSIVE ITEMS PER PAGE)
  // ---------------------------------------------------------------------------
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
      setItemsPerPage((prev) => {
        if (prev !== newItemsPerPage) {
          setCurrentPage(1);
          return newItemsPerPage;
        }
        return prev;
      });
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0);
    };

    window.addEventListener('resize', updateItemsPerPage);
    updateItemsPerPage();
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  //
  // ---------------------------------------------------------------------------
  // SENTIMENT ANALYZER & LEXIKON LOADING
  // ---------------------------------------------------------------------------
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] = useState<boolean>(false);

  useEffect(() => {
    if (!metadata) return;

    if (!metadata.language) return;
    const langToLoad = VALID_LANGUAGES.includes(metadata.language as 'de' | 'en' | 'fr' | 'es')
      ? metadata.language
      : 'en';

    import(`../../assets/afinn/AFINN-${langToLoad}.json`)
      .then((data) => {
        setAfinn(data.default);
      })
      .catch((error) => {
        console.error(`Error loading AFINN-${langToLoad}.json:`, error);
      });
  }, [metadata]);

  useEffect(() => {
    if (!metadata) return;

    if (metadata.language) {
      setIsLanguageRegistered(true);
      return;
    }

    if (!metadata.language || Object.keys(afinn).length === 0) return;
    const langToUse = VALID_LANGUAGES.includes(metadata.language as 'de' | 'en' | 'fr' | 'es')
      ? metadata.language
      : 'en';
    sentimentAnalyzer.registerLanguage(langToUse, { labels: afinn });
    try {
      sentimentAnalyzer.analyze('Test', { language: langToUse });
      setIsLanguageRegistered(true);
    } catch (error) {
      console.error(`Error registering language ${langToUse}:`, error);
      setIsLanguageRegistered(false);
    }
  }, [metadata, afinn, sentimentAnalyzer]);

  //
  // ---------------------------------------------------------------------------
  // AGGREGATE SENTIMENT CALCULATION
  // ---------------------------------------------------------------------------
  const aggregatedSentimentData: AggregatedSentimentWordData[] = useMemo(() => {
    if (!metadata?.language || !isLanguageRegistered) {
      return [];
    }

    // In diesem Fall werden alle Nachrichten in filteredMessages berücksichtigt.
    // Es entfällt eine Filterung nach Mindestnachrichten.
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
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, ' ')
        .split(/\s+/);
      const filteredWords = removeStopwords(words, deu).filter((word) => word.length > 2);
      filteredWords.forEach((word) => {
        if (afinn[word] === undefined) return;
        if (!dataMap[sender][word]) {
          dataMap[sender][word] = { count: 0, sentiment: afinn[word] };
        }
        dataMap[sender][word].count += 1;
      });
    });

    return Object.keys(dataMap).map((sender) => {
      const wordEntries = Object.entries(dataMap[sender]).map(([word, { count, sentiment }]) => ({
        word,
        count,
        totalSentiment: count * sentiment,
      }));
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
  }, [filteredMessages, metadata, isLanguageRegistered, afinn, showBest]);

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
  // COLOR SCALE (d3)
  // ---------------------------------------------------------------------------
  const colorScale: Map<string, string> = useMemo(() => {
    const senders = aggregatedSentimentData.map((d) => d.sender);
    const lightPalette = d3.schemePaired;
    const darkPalette = d3.schemeSet2;
    const selectedPalette = darkMode ? darkPalette : lightPalette;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, selectedPalette[index % selectedPalette.length]);
    });
    return scale;
  }, [aggregatedSentimentData, darkMode]);

  // React-Select Optionen
  const options = [
    { value: 'Best', label: 'Best' },
    { value: 'Worst', label: 'Worst' },
  ];

  // React-Select Styles (angepasst an Dark/Light Mode)
  const customSelectStyles = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      display: 'flex',
      justifyContent: 'space-between',
      marginLeft: '4px',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
      marginRight: '4px',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '0px',
      flex: '1 1 auto',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '6px',
      marginLeft: '-5px',
      color: darkMode ? 'white' : 'black',
      display: 'none',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: darkMode ? '#333' : 'white',
      color: darkMode ? 'white' : 'black',
      boxShadow: 'none',
      width: 'auto',
      minWidth: 'fit-content',
      border: darkMode ? '1px solid white' : '1px solid black',
      borderRadius: '0',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? darkMode
          ? '#777'
          : '#ddd'
        : window.innerWidth >= 768 && state.isFocused && state.selectProps.menuIsOpen
        ? darkMode
          ? '#555'
          : 'grey'
        : darkMode
        ? '#333'
        : 'white',
      color: darkMode ? 'white' : 'black',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    singleValue: (provided: any) => ({
      ...provided,
      color: darkMode ? 'white' : 'black',
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
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      {/* Header with Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base md:text-lg font-semibold flex items-center space-x-0">
          <span>Top 10</span>
          <Select
            value={options.find((option) => option.value === (showBest ? 'Best' : 'Worst'))}
            onChange={(selected) => setShowBest(selected?.value === 'Best')}
            options={options}
            isSearchable={false}
            styles={customSelectStyles}
          />
          <span>Words per Person</span>
        </h2>
      </div>
      {/* Main Content */}
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {aggregatedSentimentData.length === 0 ? (
          <span className="text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                if (senderData.topWords.length === 0) return null;
                const senderColor = colorScale.get(senderData.sender) || '#000';
                return (
                  <SenderSentimentWordChart
                    key={senderData.sender}
                    sender={senderData.sender}
                    topWords={senderData.topWords}
                    color={senderColor}
                    darkMode={darkMode}
                    useShortNames={useShortNames}
                    metadata={metadata}
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
