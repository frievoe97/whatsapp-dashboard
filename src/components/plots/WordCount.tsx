// ------------------------------
// Imports
// ------------------------------
import { FC, ReactElement, useMemo, useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import * as d3 from 'd3';
import { removeStopwords, deu, eng, fra, spa } from 'stopword';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMetadata } from '../../types/chatTypes';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

// ------------------------------
// Type Definitions
// ------------------------------
interface WordCount {
  word: string;
  count: number;
}

interface AggregatedWordData {
  sender: string;
  topWords: WordCount[];
}

interface SenderWordChartProps {
  sender: string;
  topWords: WordCount[];
  color: string;
  darkMode: boolean;
  useShortNames: boolean;
  metadata: ChatMetadata | null;
  senderData: { sender: string; topWords: WordCount[] };
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPrev: () => void;
  onNext: () => void;
}

// ------------------------------
// Helper Components
// ------------------------------
const SenderWordChart: FC<SenderWordChartProps> = ({
  topWords,
  color,
  darkMode,
  useShortNames,
  metadata,
  senderData,
}) => {
  // Calculate maximum word count for scaling
  const maxCount = Math.max(...topWords.map((w) => w.count), 1);
  return (
    <div
      id="word-count-chart"
      className={`border p-4 rounded-none ${darkMode ? 'border-gray-300' : 'border-black'}`}
      style={{ flex: '1 1 auto', borderLeft: `4px solid ${color}` }}
    >
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[senderData.sender]
          ? metadata.sendersShort[senderData.sender]
          : senderData.sender}
      </h3>
      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          const barWidth = (wordData.count / maxCount) * 100;
          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              <div className={`w-6 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {index + 1}.
              </div>
              <div className={`w-28 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {wordData.word}
              </div>
              <div className="flex-1 bg-gray-300 h-4 mr-2">
                <div className="h-4" style={{ width: `${barWidth}%`, backgroundColor: color }} />
              </div>
              <div className={`w-8 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {wordData.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Pagination: FC<PaginationProps> = ({ currentPage, totalPages, darkMode, onPrev, onNext }) => {
  return (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className={`px-2 py-1 border ${
          darkMode ? 'bg-gray-800 text-white' : 'text-black bg-white'
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
          darkMode ? 'bg-gray-800 text-white' : 'text-black bg-white'
        } ${
          currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : ''
        } focus:outline-none`}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

// ------------------------------
// Main Component: WordCount
// ------------------------------
const WordCount: FC = (): ReactElement => {
  // Extract chat data and settings from context
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const { t } = useTranslation();

  // ------------------------------
  // Pagination State
  // ------------------------------
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  // ------------------------------
  // Container Ref for Responsive Layout
  // ------------------------------
  const containerRef = useRef<HTMLDivElement>(null);

  // ------------------------------
  // Constants
  // ------------------------------
  const MIN_WIDTH_PER_ITEM = 670;

  // ------------------------------
  // useEffect: Update Items Per Page on Window Resize
  // ------------------------------
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
    window.addEventListener('resize', updateItemsPerPage);
    updateItemsPerPage();
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // ------------------------------
  // useMemo: Aggregate Word Data per Sender
  // ------------------------------
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    const senderWordCountMap: Record<string, Record<string, number>> = {};

    filteredMessages.forEach((msg) => {
      const { sender, message } = msg;
      senderWordCountMap[sender] = senderWordCountMap[sender] || {};

      // Normalize text: lowercase and remove non-letter characters
      const words = message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, '')
        .split(/\s+/);

      let filteredWords: string[] = [];
      switch (metadata?.language) {
        case 'de':
          filteredWords = removeStopwords(words, deu).filter((word) => word.length > 4);
          break;
        case 'en':
          filteredWords = removeStopwords(words, eng).filter((word) => word.length > 4);
          break;
        case 'es':
          filteredWords = removeStopwords(words, spa).filter((word) => word.length > 4);
          break;
        case 'fr':
          filteredWords = removeStopwords(words, fra).filter((word) => word.length > 4);
          break;
        default:
          filteredWords = removeStopwords(words, eng).filter((word) => word.length > 4);
          break;
      }

      filteredWords.forEach((word) => {
        senderWordCountMap[sender][word] = (senderWordCountMap[sender][word] || 0) + 1;
      });
    });

    return Object.keys(senderWordCountMap).map((sender) => {
      const wordCounts = Object.entries(senderWordCountMap[sender])
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { sender, topWords: wordCounts };
    });
  }, [filteredMessages, metadata?.language]);

  // ------------------------------
  // useMemo: Color Scale for Senders
  // ------------------------------
  const colorScale: Map<string, string> = useMemo(() => {
    const senders = aggregatedWordData.map((d) => d.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;
    const scaleMap = new Map<string, string>();
    senders.forEach((sender, index) => {
      scaleMap.set(sender, colors[index % colors.length]);
    });
    return scaleMap;
  }, [aggregatedWordData, darkMode]);

  // ------------------------------
  // useMemo: Total Pages Calculation
  // ------------------------------
  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedWordData.length / itemsPerPage);
  }, [aggregatedWordData, itemsPerPage]);

  // ------------------------------
  // useMemo: Current Page Data
  // ------------------------------
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedWordData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedWordData, currentPage, itemsPerPage]);

  // ------------------------------
  // Pagination Handlers
  // ------------------------------
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div
      id="plot-word-count"
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">{t('WordCount.title')}</h2>
      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <>
            {/* Sender Charts */}
            <div className="flex flex-col md:flex-row gap-4 w-full">
              {currentData.map((senderData) => {
                const senderColor = colorScale.get(senderData.sender) || '#000000';
                return (
                  <SenderWordChart
                    key={senderData.sender}
                    sender={senderData.sender}
                    topWords={senderData.topWords}
                    color={senderColor}
                    darkMode={darkMode}
                    useShortNames={useShortNames}
                    metadata={metadata}
                    senderData={senderData}
                  />
                );
              })}
            </div>
            {/* Pagination Controls */}
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

export default WordCount;
