////////////// Imports ////////////////
import { FC, ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import Select from 'react-select';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import Sentiment from 'sentiment';
import { removeStopwords, deu } from 'stopword';
import { useChat } from '../../context/ChatContext';
import { ChatMetadata } from '../../types/chatTypes';
import { useTranslation } from 'react-i18next';
import '../../../i18n';
import { getCustomSelectStyles, LOCALES } from '../../config/constants';
import i18n from '../../../i18n';

////////////// Types & Constants ////////////////
/**
 * List of valid language codes for sentiment analysis.
 */
const VALID_LANGUAGES = ['de', 'en', 'fr', 'es'] as const;

/**
 * Minimum width (in px) per item to determine the number of items per page.
 */
const MIN_WIDTH_PER_ITEM = 600;

/**
 * Represents a word with its count and aggregated sentiment value.
 */
interface WordSentimentCount {
  word: string;
  count: number;
  totalSentiment: number;
}

/**
 * Aggregated sentiment data for a sender.
 */
interface AggregatedSentimentWordData {
  sender: string;
  topWords: WordSentimentCount[];
}

/**
 * Props for the sender sentiment word chart component.
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
 * Props for the pagination controls component.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

////////////// Helper Components ////////////////
/**
 * Renders a bar-chart style view of a sender's top words with sentiment values.
 */
const SenderSentimentWordChart: FC<SenderSentimentWordChartProps> = ({
  sender,
  topWords,
  color,
  darkMode,
  useShortNames,
  metadata,
}) => {
  // Calculate the maximum absolute sentiment value for scaling.
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
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[sender] ? metadata.sendersShort[sender] : sender}
      </h3>
      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          const barWidthPercent = (Math.abs(wordData.totalSentiment) / maxSentiment) * 100;
          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              <div className={`w-6 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {index + 1}.
              </div>
              <div className={`w-24 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
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
 * Renders pagination controls with Previous/Next buttons and current page info.
 */
const Pagination: FC<PaginationProps> = ({ currentPage, totalPages, darkMode, onPrev, onNext }) => {
  const { t } = useTranslation();

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
        {t('General.page')} {currentPage} {t('General.of')} {totalPages}
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

////////////// Main Component: SentimentWordsPlot ////////////////
/**
 * Analyzes chat messages and displays each sender's top 10 words based on aggregated sentiment.
 * Features include:
 * - Language-based sentiment analysis using an AFINN lexicon.
 * - A toggle (via react‑select) to switch between "Best" and "Worst" words.
 * - Responsive pagination based on available container width.
 */
const SentimentWordsPlot: FC = (): ReactElement => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pagination state.
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Toggle state: true for "Best" (positive), false for "Worst" (negative).
  const [showBest, setShowBest] = useState<boolean>(true);

  // Responsive: Calculate items per page based on container width.
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

  // Sentiment analyzer initialization and lexicon loading.
  const sentimentAnalyzer = useMemo(() => new Sentiment(), []);
  const [afinn, setAfinn] = useState<Record<string, number>>({});
  const [isLanguageRegistered, setIsLanguageRegistered] = useState<boolean>(false);

  useEffect(() => {
    if (!metadata || !metadata.language) return;
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

  // Calculate aggregated sentiment data per sender.
  const aggregatedSentimentData: AggregatedSentimentWordData[] = useMemo(() => {
    if (!metadata?.language || !isLanguageRegistered) {
      return [];
    }

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

  // Pagination calculations.
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

  // Create a color scale for sender charts.
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

  // Options for the react-select toggle.
  const options = [
    { value: LOCALES[i18n.language].sentiment[0], label: LOCALES[i18n.language].sentiment[0] },
    { value: LOCALES[i18n.language].sentiment[1], label: LOCALES[i18n.language].sentiment[1] },
  ];

  const { t } = useTranslation();
  const titleParts = t('SentimentWord.title', {
    wordCategory: showBest
      ? LOCALES[i18n.language].sentiment[0]
      : LOCALES[i18n.language].sentiment[1],
    returnObjects: true,
  }) as string[];

  return (
    <div
      id="plot-sentiment-words"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <div className="flex justify-between items-center mb-3 md:mb-4">
        <h2 className="text-sm md:text-lg font-semibold flex items-center space-x-0">
          <span>{titleParts[0]}</span>
          <Select
            value={options.find(
              (option) =>
                option.value ===
                (showBest
                  ? LOCALES[i18n.language].sentiment[0]
                  : LOCALES[i18n.language].sentiment[1]),
            )}
            onChange={(selected) =>
              setShowBest(selected?.value === LOCALES[i18n.language].sentiment[0])
            }
            options={options}
            isSearchable={false}
            styles={getCustomSelectStyles(darkMode)}
          />
          <span>{titleParts[2]}</span>
        </h2>
      </div>
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {aggregatedSentimentData.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
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
