////////////// Imports ////////////////
import React, { useMemo, useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import * as d3 from 'd3';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMessage, ChatMetadata } from '../../types/chatTypes';
import { useTranslation } from 'react-i18next';
import '../../../i18n';
import { LOCALES } from '../../config/constants';
import i18n from '../../../i18n';

////////////// Type Definitions ////////////////
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

////////////// Constants ////////////////
const MIN_WIDTH_PER_ITEM = 400;

////////////// Helper Functions ////////////////
/**
 * Calculates the total width of an element including its left and right margins.
 */
function getTotalWidthIncludingMargin(elementId: string): number {
  const element = document.getElementById(elementId);
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
  const marginRight = parseFloat(computedStyle.marginRight) || 0;
  return rect.width + marginLeft + marginRight;
}

/**
 * Calculates the number of sender cards to show per page based on the container's width and the current window size.
 */
const calculateItemsPerPage = (containerId: string): number => {
  if (window.innerWidth < 768) return 1;
  const plotWidth = getTotalWidthIncludingMargin(containerId);
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 2) return 1;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 3) return 2;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 4) return 3;
  if (plotWidth <= MIN_WIDTH_PER_ITEM * 5) return 4;
  return 5;
};

////////////// Custom Hooks ////////////////
/**
 * Custom hook to determine the number of items per page based on the container's width.
 * It listens to window resize events and updates the items count accordingly.
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
 * Custom hook to aggregate message statistics per sender from an array of chat messages.
 * All messages are processed (as they are already pre-filtered on the backend).
 */
const useAggregatedStats = (messages: ChatMessage[]): SenderStats[] => {
  return useMemo(() => {
    // Count messages per sender
    const senderMessageCount: Record<string, number> = {};
    messages.forEach((msg) => {
      senderMessageCount[msg.sender] = (senderMessageCount[msg.sender] || 0) + 1;
    });

    // Intermediate data for each sender
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
      // Normalize text: lower-case and remove non-letter characters (including German umlauts)
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

////////////// Presentational Components ////////////////
/**
 * Renders a single row displaying a label and its corresponding value.
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
 * Renders a card that shows all statistics for a single sender.
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
      <h3 className="text-md font-medium mb-2">
        {useShortNames && metadata?.sendersShort[stat.sender]
          ? metadata.sendersShort[stat.sender]
          : stat.sender}
      </h3>
      <div className="space-y-1">
        <StatRow
          label={LOCALES[i18n.language].stats.numberOfMessages + ':'}
          value={stat.messageCount}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.averageWordsPerMessage + ':'}
          value={stat.averageWordsPerMessage}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.medianWordsPerMessage + ':'}
          value={stat.medianWordsPerMessage}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.totalWordsSent + ':'}
          value={stat.totalWordsSent}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.maxWordsInMessage + ':'}
          value={stat.maxWordsInMessage}
        />
        <StatRow label={LOCALES[i18n.language].stats.activeDays + ':'} value={stat.activeDays} />
        <StatRow
          label={LOCALES[i18n.language].stats.uniqueWordsCount + ':'}
          value={stat.uniqueWordsCount}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.avgCharactersPerMessage + ':'}
          value={stat.averageCharactersPerMessage}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.firstMessage + ':'}
          value={d3.timeFormat('%d.%m.%Y %H:%M')(stat.firstMessageDate)}
        />
        <StatRow
          label={LOCALES[i18n.language].stats.lastMessage + ':'}
          value={d3.timeFormat('%d.%m.%Y %H:%M')(stat.lastMessageDate)}
        />
      </div>
    </div>
  );
};

/**
 * Renders pagination controls with previous and next buttons.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPrev, onNext }) => {
  const { darkMode } = useChat();
  const { t } = useTranslation();
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
        {t('General.page')} {currentPage} {t('General.of')} {totalPages}
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

////////////// Main Component: Stats ////////////////
/**
 * The Stats component displays aggregated message statistics per sender in a responsive grid with pagination.
 * It uses custom hooks to calculate items per page and aggregate data, and supports dark mode and localization.
 */
const Stats: React.FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const containerId = 'plot-message-stats';

  // Determine how many sender cards should be displayed per page.
  const itemsPerPage = useItemsPerPage(containerId);

  // Pagination state for current page.
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Aggregate statistics for each sender.
  const aggregatedStats = useAggregatedStats(filteredMessages);

  // Create a color map for senders based on dark mode.
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

  // Calculate total number of pages.
  const totalPages = useMemo(
    () => Math.ceil(aggregatedStats.length / itemsPerPage),
    [aggregatedStats, itemsPerPage],
  );

  // Ensure the current page is within valid range.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  // Reset to first page when the filtered messages change.
  useEffect(() => {
    setCurrentPage(1);
  }, [aggregatedStats]);

  // Determine the statistics to display on the current page.
  const currentStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedStats.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedStats, currentPage, itemsPerPage]);

  // Handlers for pagination navigation.
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const { t } = useTranslation();

  return (
    <div
      id={containerId}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 overflow-auto flex-grow ${
        darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'
      }`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">{t('Stats.title')}</h2>
      <div className="flex-grow flex justify-center items-center flex-col">
        {filteredMessages.length === 0 || aggregatedStats.length === 0 ? (
          <span className="text-base md:text-lg">{t('General.noDataAvailable')}</span>
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
