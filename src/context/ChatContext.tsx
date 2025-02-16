// src/context/ChatContext.tsx

///////////////////////// Imports ///////////////////////////
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import { ChatMessage, ChatMetadata, FilterOptions } from '../types/chatTypes';
import { computeSenderStatuses } from '../logic/filterChatMessages';
import { DEFAULT_WEEKDAYS } from '../config/constants';

///////////////////////// Context Type Definition ///////////////////////////

/**
 * ChatContextType defines the structure for the Chat context.
 * It includes state values, setter functions, and helper methods
 * to manage chat data, filtering, and UI controls.
 */
interface ChatContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  originalMessages: ChatMessage[];
  setOriginalMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  filteredMessages: ChatMessage[];
  setFilteredMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  metadata: ChatMetadata | null;
  setMetadata: Dispatch<SetStateAction<ChatMetadata | null>>;
  appliedFilters: FilterOptions;
  setAppliedFilters: Dispatch<SetStateAction<FilterOptions>>;
  tempFilters: FilterOptions;
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>;
  applyFilters: (filters?: FilterOptions) => void;
  resetFilters: () => void;
  senderDropdownOpen: boolean;
  setSenderDropdownOpen: Dispatch<SetStateAction<boolean>>;
  isPanelOpen: boolean;
  setIsPanelOpen: Dispatch<SetStateAction<boolean>>;
  isInfoOpen: boolean;
  setIsInfoOpen: Dispatch<SetStateAction<boolean>>;
  useShortNames: boolean;
  toggleUseShortNames: () => void;
  tempUseShortNames: boolean;
  tempToggleUseShortNames: () => void;
  setUseShortNames: Dispatch<SetStateAction<boolean>>;
  tempSetUseShortNames: Dispatch<SetStateAction<boolean>>;
}

///////////////////////// Context Creation ///////////////////////////
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

///////////////////////// ChatProvider Component ///////////////////////////

/**
 * ChatProvider wraps the application and provides chat-related state and functions
 * through context. It manages dark mode, messages, filtering options, and UI controls.
 *
 * @param children - The child components that require access to the Chat context.
 * @returns The Chat context provider wrapping the children.
 */
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  //////////// State: Dark Mode ////////////
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);

  //////////// State: Chat Messages and Metadata ////////////
  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);

  //////////// State: Filter Options ////////////
  const initialFilters: FilterOptions = {
    startDate: undefined,
    endDate: undefined,
    selectedWeekdays: DEFAULT_WEEKDAYS,
    minPercentagePerSender: 3,
    senderStatuses: {},
  };
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>(initialFilters);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(initialFilters);
  const [lastAppliedMinPercentage, setLastAppliedMinPercentage] = useState<number>(3);

  //////////// State: UI Controls //////////////////
  const [senderDropdownOpen, setSenderDropdownOpen] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  //////////// State: Short Names Option //////////////////
  const [useShortNames, setUseShortNames] = useState<boolean>(false);
  const toggleUseShortNames = useCallback(() => setUseShortNames((prev) => !prev), []);
  const [tempUseShortNames, tempSetUseShortNames] = useState<boolean>(false);
  const tempToggleUseShortNames = useCallback(() => tempSetUseShortNames((prev) => !prev), []);

  //////////// Effect: Initialize Filters when Metadata or Messages Change ////////////
  useEffect(() => {
    if (metadata && originalMessages.length > 0) {
      const newFilters: FilterOptions = {
        startDate: metadata.firstMessageDate,
        endDate: metadata.lastMessageDate,
        selectedWeekdays: DEFAULT_WEEKDAYS,
        minPercentagePerSender: tempFilters.minPercentagePerSender,
        senderStatuses: computeSenderStatuses(
          originalMessages,
          tempFilters.minPercentagePerSender,
          undefined,
          true,
        ),
      };
      setTempFilters(newFilters);
      setAppliedFilters(newFilters);
      setLastAppliedMinPercentage(newFilters.minPercentagePerSender);
      setTimeout(() => {
        applyFilters(newFilters);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, originalMessages]);

  //////////// Callback: Apply Filters //////////////////
  const applyFilters = useCallback(
    (filters?: FilterOptions) => {
      const usedFilters = filters?.startDate ? filters : tempFilters;
      // Create a worker to process filtering asynchronously.
      const worker = new Worker(new URL('../workers/filterWorker.ts', import.meta.url), {
        type: 'module',
      });
      worker.postMessage({
        originalMessages,
        tempFilters: usedFilters,
        lastAppliedMinPercentage,
      });
      worker.onmessage = (e) => {
        const { filteredMessages, newFilters } = e.data;
        setAppliedFilters(newFilters);
        setFilteredMessages(filteredMessages);
        setTempFilters(newFilters);
        worker.terminate();
      };
    },
    [originalMessages, tempFilters, lastAppliedMinPercentage],
  );

  //////////// Callback: Reset Filters //////////////////
  const resetFilters = useCallback(() => {
    if (metadata) {
      const newFilters: FilterOptions = {
        startDate: metadata.firstMessageDate,
        endDate: metadata.lastMessageDate,
        selectedWeekdays: DEFAULT_WEEKDAYS,
        minPercentagePerSender: 3,
        senderStatuses: computeSenderStatuses(
          originalMessages,
          tempFilters.minPercentagePerSender,
          undefined,
          true,
        ),
      };
      setTempFilters(newFilters);
      setLastAppliedMinPercentage(tempFilters.minPercentagePerSender);
      tempSetUseShortNames(false);
    }
  }, [metadata, originalMessages, tempFilters.minPercentagePerSender]);

  //////////// Memoized Context Value //////////////////
  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
      originalMessages,
      setOriginalMessages,
      filteredMessages,
      setFilteredMessages,
      metadata,
      setMetadata,
      appliedFilters,
      setAppliedFilters,
      tempFilters,
      setTempFilters,
      applyFilters,
      resetFilters,
      senderDropdownOpen,
      setSenderDropdownOpen,
      isPanelOpen,
      setIsPanelOpen,
      isInfoOpen,
      setIsInfoOpen,
      useShortNames,
      toggleUseShortNames,
      tempUseShortNames,
      tempToggleUseShortNames,
      setUseShortNames,
      tempSetUseShortNames,
    }),
    [
      darkMode,
      originalMessages,
      filteredMessages,
      metadata,
      appliedFilters,
      tempFilters,
      applyFilters,
      resetFilters,
      senderDropdownOpen,
      isPanelOpen,
      isInfoOpen,
      useShortNames,
      toggleDarkMode,
      toggleUseShortNames,
      tempUseShortNames,
      tempToggleUseShortNames,
      setUseShortNames,
      tempSetUseShortNames,
    ],
  );

  //////////// Render Chat Context Provider //////////////////
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

///////////////////////// Custom Hook: useChat ///////////////////////////

/**
 * Custom hook to access the ChatContext.
 *
 * @returns The Chat context value.
 * @throws An error if used outside of a ChatProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
