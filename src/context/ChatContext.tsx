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
import { filterMessages, computeSenderStatuses } from '../logic/filterChatMessages';
import { DEFAULT_WEEKDAYS } from '../config/constants';

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

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);

  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);

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

  const [senderDropdownOpen, setSenderDropdownOpen] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const [useShortNames, setUseShortNames] = useState<boolean>(false);
  const toggleUseShortNames = useCallback(() => setUseShortNames((prev) => !prev), []);

  const [tempUseShortNames, tempSetUseShortNames] = useState<boolean>(false);
  const tempToggleUseShortNames = useCallback(() => tempSetUseShortNames((prev) => !prev), []);

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

  const applyFilters = useCallback(
    (filters?: FilterOptions) => {
      const usedFilters = filters?.startDate ? filters : tempFilters;
      let resetManual = false;
      if (usedFilters.minPercentagePerSender !== lastAppliedMinPercentage) {
        resetManual = true;
        setLastAppliedMinPercentage(usedFilters.minPercentagePerSender);
      }
      const messagesByTime = originalMessages.filter((msg) => {
        if (usedFilters.startDate && msg.date < usedFilters.startDate) return false;
        if (usedFilters.endDate && msg.date > usedFilters.endDate) return false;
        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][msg.date.getDay()];
        return usedFilters.selectedWeekdays.includes(weekday);
      });
      const newSenderStatuses = computeSenderStatuses(
        messagesByTime,
        usedFilters.minPercentagePerSender,
        resetManual ? undefined : usedFilters.senderStatuses,
        resetManual,
      );
      const newFilters: FilterOptions = {
        ...usedFilters,
        senderStatuses: newSenderStatuses,
      };
      setAppliedFilters(newFilters);
      const result = filterMessages(originalMessages, newFilters);
      setFilteredMessages(result);
      setTempFilters(newFilters);
    },
    [originalMessages, tempFilters, lastAppliedMinPercentage],
  );

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

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
