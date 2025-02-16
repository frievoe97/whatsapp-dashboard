import React, { useMemo, useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import * as d3 from 'd3';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMessage, ChatMetadata } from '../../types/chatTypes';

/**
 * Represents statistics for a single sender.
 */
export interface SenderStats {
  sender: string;
  messageCount: number;
  averageWordsPerMessage: number;
  medianWordsPerMessage: number;
  totalWordsSent: number;
  maxWordsInMessage: number;
  activeDays: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  uniqueWordsCount: number;
  averageCharactersPerMessage: number;
}

/**
 * Minimum container width per sender card. Used to calculate the number of items per page.
 */
const MIN_WIDTH_PER_ITEM = 400;

/**
 * Calculates the number of items (sender cards) per page based on the current
 * container width and window size.
 */
const calculateItemsPerPage = (containerId: string): number => {
  if (window.innerWidth < 768) return 1;
  // const container = document.getElementById(containerId);
  // console.log("Container: ", container);
  // const plotWidth = container ? container.offsetWidth : 0;
  // console.log("Plot Width: ", plotWidth);

  const plotWidth = getTotalWidthIncludingMargin(containerId);

  // return plotWidth % MIN_WIDTH_PER_ITEM;

  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 5) return 4;
  return 5;
};

function getTotalWidthIncludingMargin(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;
  return rect.width + marginLeft + marginRight;
}

/**
 * Custom hook to dynamically determine the number of items per page based on
 * window resize events and a container's width.
 */
const useItemsPerPage = (containerId: string): number => {
  const [itemsPerPage, setItemsPerPage] = useState<number>(() =>
    calculateItemsPerPage(containerId),
  );

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerPage = calculateItemsPerPage(containerId);

      setItemsPerPage((prev) => (prev !== newItemsPerPage ? newItemsPerPage : prev));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [containerId]);

  return itemsPerPage;
};

/**
 * Custom hook to aggregate message statistics for all senders.
 * Da die Nachrichten bereits vom Backend gefiltert sind, werden alle Nachrichten
 * berücksichtigt.
 */
const useAggregatedStats = (messages: ChatMessage[]): SenderStats[] => {
  return useMemo(() => {
    // Zähle die Nachrichten pro Sender.
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      senderMessageCount[msg.sender] = (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Erstelle ein Daten-Objekt für Zwischenergebnisse.
    type SenderDataMap = {
      messages: string[];
      wordCounts: number[];
      totalWords: number;
      dates: Date[];
      uniqueWords: Set<string>;
      totalCharacters: number;
    };

    const dataMap: Record<string, SenderDataMap> = {};

    messages.forEach((msg) => {
      const sender = msg.sender;
      const date = new Date(msg.date);
      // Text normalisieren: in Kleinbuchstaben, nur Buchstaben (inkl. deutscher Umlaute)
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, '')
        .split(/\s+/)
        .filter((word: string) => word.length > 0);
      const characters = msg.message.length;
      if (!dataMap[sender]) {
        dataMap[sender] = {
          messages: [],
          wordCounts: [],
          totalWords: 0,
          dates: [],
          uniqueWords: new Set<string>(),
          totalCharacters: 0,
        };
      }
      dataMap[sender].messages.push(msg.message);
      dataMap[sender].wordCounts.push(words.length);
      dataMap[sender].totalWords += words.length;
      dataMap[sender].dates.push(date);
      dataMap[sender].totalCharacters += characters;
      words.forEach((word: string) => dataMap[sender].uniqueWords.add(word));
    });

    return Object.keys(dataMap).map((sender) => {
      const senderData = dataMap[sender];
      const messageCount = senderData.messages.length;
      const averageWords = messageCount > 0 ? senderData.totalWords / messageCount : 0;
      const sortedWordCounts = [...senderData.wordCounts].sort((a, b) => a - b);
      const mid = Math.floor(sortedWordCounts.length / 2);
      const median =
        sortedWordCounts.length % 2 !== 0
          ? sortedWordCounts[mid]
          : (sortedWordCounts[mid - 1] + sortedWordCounts[mid]) / 2;
      const maxWordsInMessage = d3.max(senderData.wordCounts) || 0;
      const uniqueDays = new Set(senderData.dates.map((date) => d3.timeDay(date).getTime()));
      const firstMessageDate = d3.min(senderData.dates) as Date;
      const lastMessageDate = d3.max(senderData.dates) as Date;
      const averageCharacters = messageCount > 0 ? senderData.totalCharacters / messageCount : 0;

      return {
        sender,
        messageCount,
        averageWordsPerMessage: parseFloat(averageWords.toFixed(2)),
        medianWordsPerMessage: parseFloat(median.toFixed(2)),
        totalWordsSent: senderData.totalWords,
        maxWordsInMessage,
        activeDays: uniqueDays.size,
        firstMessageDate,
        lastMessageDate,
        uniqueWordsCount: senderData.uniqueWords.size,
        averageCharactersPerMessage: parseFloat(averageCharacters.toFixed(2)),
      };
    });
  }, [messages]);
};

/**
 * Renders a single statistics row with a label and value.
 */
interface StatRowProps {
  label: string;
  value: string | number;
}

const StatRow: React.FC<StatRowProps> = ({ label, value }) => {
  const { darkMode } = useChat();
  return (
    <div className={`flex justify-between h-[28px] ${darkMode ? 'text-white' : 'text-black'}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
};

/**
 * Renders a card with all statistics for a single sender.
 */
interface SenderStatsCardProps {
  stat: SenderStats;
  darkMode: boolean;
  color: string;
  useShortNames: boolean;
  metadata: ChatMetadata | null;
}

const SenderStatsCard: React.FC<SenderStatsCardProps> = ({
  stat,
  darkMode,
  color,
  useShortNames,
  metadata,
}) => {
  return (
    <div
      id="stats-card"
      className={`border p-4 rounded-none ${darkMode ? 'border-gray-300' : 'border-black'}`}
      style={{
        minWidth: '250px',
        borderLeft: `4px solid ${color}`,
        flex: '1 1 calc(50% - 16px)',
      }}
    >
      {/* <h3 className="text-md font-medium mb-2">{stat.sender}</h3> */}
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[stat.sender]
          ? metadata.sendersShort[stat.sender]
          : stat.sender}
      </h3>

      <div className="space-y-1">
        <StatRow label="Number of Messages:" value={stat.messageCount} />
        <StatRow label="Avg. Words per Message:" value={stat.averageWordsPerMessage} />
        <StatRow label="Median Words per Message:" value={stat.medianWordsPerMessage} />
        <StatRow label="Total Words Sent:" value={stat.totalWordsSent} />
        <StatRow label="Max Words in a Message:" value={stat.maxWordsInMessage} />
        <StatRow label="Active Days:" value={stat.activeDays} />
        <StatRow label="Unique Words Count:" value={stat.uniqueWordsCount} />
        <StatRow label="Avg. Characters per Message:" value={stat.averageCharactersPerMessage} />
        <StatRow
          label="First Message:"
          value={d3.timeFormat('%d.%m.%Y %H:%M')(stat.firstMessageDate)}
        />
        <StatRow
          label="Last Message:"
          value={d3.timeFormat('%d.%m.%Y %H:%M')(stat.lastMessageDate)}
        />
      </div>
    </div>
  );
};

/**
 * Pagination controls.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPrev, onNext }) => {
  const { darkMode } = useChat();
  return (
    <div className="flex justify-center items-center mt-4 space-x-2">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className={`px-2 py-1 border ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
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
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
        } ${
          currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : ''
        } focus:outline-none`}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

/**
 * Stats Component
 *
 * Displays aggregated message statistics per sender in a responsive grid with pagination.
 */
const Stats: React.FC = () => {
  // Nun werden ausschließlich filteredMessages genutzt – isUploading und minMessagePercentage entfallen
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();

  const containerId = 'plot-message-stats';

  // 1) Bestimme Items pro Seite via custom Hook.
  const itemsPerPage = useItemsPerPage(containerId);

  // 2) Pagination-State.
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 3) Aggregiere Statistiken basierend auf filteredMessages.
  const aggregatedStats = useAggregatedStats(filteredMessages);

  // 4) Erzeuge eine Farbtabelle für jeden Sender.
  const colorScale = useMemo(() => {
    const senders = aggregatedStats.map((stat) => stat.sender);
    const lightColors = d3.schemePaired;
    const darkColors = d3.schemeSet2;
    const colors = darkMode ? darkColors : lightColors;
    const scale = new Map<string, string>();
    senders.forEach((sender, index) => {
      scale.set(sender, colors[index % colors.length]);
    });
    return scale;
  }, [aggregatedStats, darkMode]);

  // 5) Gesamtzahl der Seiten.
  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage],
  );

  // Stelle sicher, dass currentPage im gültigen Bereich liegt.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  // 6) Daten für die aktuelle Seite.
  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  // 7) Pagination-Handler.
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div
      id={containerId}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-base md:text-lg font-semibold mb-4">Message Statistics per Person</h2>
      <div className="flex-grow flex justify-center items-center flex-col">
        {filteredMessages.length === 0 || aggregatedStats.length === 0 ? (
          <span className="text-base md:text-lg">No Data Available</span>
        ) : (
          <>
            <div className="flex flex-row gap-4 w-full justify-center">
              {currentStats.map((stat) => (
                <SenderStatsCard
                  key={stat.sender}
                  stat={stat}
                  darkMode={darkMode}
                  color={colorScale.get(stat.sender) || '#000'}
                  useShortNames={useShortNames}
                  metadata={metadata}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
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

export default Stats;
