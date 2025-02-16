import { FC, ReactElement, useMemo, useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import * as d3 from 'd3';
import { removeStopwords, deu, eng, fra, spa } from 'stopword';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMetadata } from '../../types/chatTypes';

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
  useShortNames: boolean;
  metadata: ChatMetadata | null;
  senderData: { sender: string; topWords: WordCount[] };
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
 * Each bar's width is determined by its relative frequency compared to the most-used word.
 */
const SenderWordChart: FC<SenderWordChartProps> = ({
  topWords,
  color,
  darkMode,
  useShortNames,
  metadata,
  senderData,
}) => {
  // Determine the largest word count for scaling the bar widths.
  const maxCount = Math.max(...topWords.map((w) => w.count), 1);

  return (
    <div
      id="word-count-chart"
      className={`border p-4 rounded-none ${darkMode ? 'border-gray-300' : 'border-black'}`}
      style={{
        flex: '1 1 auto',
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* <h3 className="text-md font-medium mb-2">{sender}</h3> */}
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[senderData.sender]
          ? metadata.sendersShort[senderData.sender]
          : senderData.sender}
      </h3>

      <div className="space-y-1">
        {topWords.map((wordData, index) => {
          // Calculate relative width (percentage) of the bar.
          const barWidth = (wordData.count / maxCount) * 100;

          return (
            <div key={wordData.word} className="flex items-center h-[28px]">
              {/* Rank */}
              <div className={`w-6 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {index + 1}.
              </div>
              {/* Word */}
              <div className={`w-28 text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                {wordData.word}
              </div>
              {/* Progress bar */}
              <div className="flex-1 bg-gray-300 h-4 mr-2">
                <div
                  className="h-4"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {/* Count */}
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

/**
 * Pagination
 *
 * Displays pagination controls for navigating between different pages
 * of sender charts.
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

// -----------------------------------------------------------------------------
// Main Component: WordCount
// -----------------------------------------------------------------------------

/**
 * WordCount Component
 *
 * Displays the top 10 words per sender, aggregated from the available chat messages.
 * Automatically adjusts layout (number of charts per row) based on the container's width.
 * Provides pagination if there are more senders than can fit on a single row.
 *
 * Features:
 * - Dark mode styling support.
 * - Loading spinner (ClipLoader) when no data is available.
 * - Language-based stopword removal (supported languages: "de", "en", "es", "fr").
 */
const WordCount: FC = (): ReactElement => {
  // Verwende nun filteredMessages; isUploading und minMessagePercentage entfallen.
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();

  /**
   * Track pagination state.
   */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(1);

  /**
   * Ref zum Container, um dessen Breite für die responsive Berechnung zu ermitteln.
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Passe die Anzahl der Items pro Seite anhand der Containerbreite an.
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
    setItemsPerPage((prev) => {
      if (prev !== newItemsPerPage) {
        setCurrentPage(1);
        return newItemsPerPage;
      }
      return prev;
    });
  };

  useEffect(() => {
    window.addEventListener('resize', updateItemsPerPage);
    updateItemsPerPage();
    return () => {
      window.removeEventListener('resize', updateItemsPerPage);
    };
  }, []);

  /**
   * Aggregiere Wortdaten pro Sender.
   *
   * 1) Für alle Nachrichten (filteredMessages) wird die Wortanzahl pro Sender ermittelt.
   * 2) Dabei werden Stopwords entfernt und kurze Wörter ignoriert.
   * 3) Für jeden Sender werden die Top 10 Wörter ausgewählt.
   */
  const aggregatedWordData: AggregatedWordData[] = useMemo(() => {
    const senderWordCountMap: Record<string, Record<string, number>> = {};

    filteredMessages.forEach((msg) => {
      const { sender, message } = msg;
      senderWordCountMap[sender] = senderWordCountMap[sender] || {};

      // Text normalisieren: Kleinbuchstaben, nur Buchstaben (inkl. deutscher Umlaute)
      const words = message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, '')
        .split(/\s+/);

      let filteredWords: string[] = [];
      // console.log(metadata?.language);
      switch (metadata?.language) {
        case 'de':
          filteredWords = removeStopwords(words, deu).filter((word) => word.length > 2);
          break;
        case 'en':
          filteredWords = removeStopwords(words, eng).filter((word) => word.length > 2);
          break;
        case 'es':
          filteredWords = removeStopwords(words, spa).filter((word) => word.length > 2);
          break;
        case 'fr':
          filteredWords = removeStopwords(words, fra).filter((word) => word.length > 2);
          break;
        default:
          filteredWords = removeStopwords(words, eng).filter((word) => word.length > 2);
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

  /**
   * Erzeuge eine Farbtabelle, um jedem Sender eine Farbe zuzuordnen.
   */
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

  /**
   * Berechne die Gesamtzahl der Seiten.
   */
  const totalPages = useMemo(() => {
    return Math.ceil(aggregatedWordData.length / itemsPerPage);
  }, [aggregatedWordData, itemsPerPage]);

  /**
   * Bestimme die Daten für die aktuelle Seite.
   */
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedWordData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedWordData, currentPage, itemsPerPage]);

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
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-base md:text-lg font-semibold mb-4">Top 10 Words per Person</h2>

      <div className="flex-grow flex justify-center items-center flex-col w-full">
        {filteredMessages.length === 0 ? (
          <span className="text-lg">No Data Available</span>
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
