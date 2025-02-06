/**
 * ChatContext.tsx
 *
 * This module provides a React Context for managing chat-related state.
 * It includes support for handling:
 * - Chat messages
 * - File upload status
 * - Date filters (start and end dates)
 * - Dark mode preference (with toggle support)
 * - File name and language settings
 * - Sender filtering and minimum message percentage settings
 *
 * Components wrapped with ChatProvider have access to the centralized chat state
 * via the custom hook `useChat`.
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";

import { DEFAULT_WEEKDAYS } from "../hooks/useFileUploadLogic";

/**
 * Represents a single chat message.
 */
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

/**
 * Defines the shape of the Chat Context state and actions.
 */
export interface ChatContextType {
  // Chat messages state
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;

  // File upload state
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;

  // Dark mode preference and toggle function
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Date filter state
  endDate: Date | undefined;
  setEndDate: (endDate: Date | undefined) => void;
  startDate: Date | undefined;
  setStartDate: (startDate: Date | undefined) => void;

  // File name and language settings
  fileName: string;
  setFileName: (fileName: string) => void;
  language: string;
  setLanguage: (language: string) => void;

  // Sender filter and message percentage settings
  selectedSender: string[];
  setSelectedSender: React.Dispatch<React.SetStateAction<string[]>>;
  minMessagePercentage: number;
  setMinMessagePercentage: React.Dispatch<React.SetStateAction<number>>;

  selectedWeekdays: string[];
  setSelectedWeekdays: React.Dispatch<React.SetStateAction<string[]>>;

  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

  originalMessages: ChatMessage[];
  setOriginalMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  manualSenderSelection: Record<string, boolean>;
  setManualSenderSelection: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

/**
 * Creates a React context for chat state management.
 * The default value is `undefined` and must be provided by a ChatProvider.
 */
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Props for the ChatProvider component.
 */
interface ChatProviderProps {
  children: ReactNode;
}

/**
 * ChatProvider component that wraps parts of the application
 * needing access to chat-related state.
 *
 * @param {ChatProviderProps} props - The props including child components.
 * @returns {JSX.Element} The provider wrapping its children.
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Chat messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // File upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Date filter state
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

  // File name and language settings
  const [fileName, setFileName] = useState<string>("");
  const [language, setLanguage] = useState<string>("");

  // Sender filtering and message percentage
  const [selectedSender, setSelectedSender] = useState<string[]>([]);
  const [minMessagePercentage, setMinMessagePercentage] = useState<number>(3);

  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>(DEFAULT_WEEKDAYS);

  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

  /**
   * Toggles the dark mode state.
   * Uses useCallback to avoid re-creating the function on each render.
   */
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prevMode) => !prevMode);
  }, []);

  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);

  const [manualSenderSelection, setManualSenderSelection] = useState<
    Record<string, boolean>
  >({});

  /**
   * Memoizes the context value to prevent unnecessary re-renders of
   * context consumers.
   */
  const contextValue = useMemo<ChatContextType>(
    () => ({
      messages,
      setMessages,
      isUploading,
      setIsUploading,
      darkMode,
      toggleDarkMode,
      endDate,
      setEndDate,
      startDate,
      setStartDate,
      fileName,
      setFileName,
      language,
      setLanguage,
      selectedSender,
      setSelectedSender,
      minMessagePercentage,
      setMinMessagePercentage,
      selectedWeekdays,
      setSelectedWeekdays,
      isPanelOpen,
      setIsPanelOpen,
      originalMessages,
      setOriginalMessages,
      manualSenderSelection,
      setManualSenderSelection,
    }),
    [
      messages,
      isUploading,
      darkMode,
      toggleDarkMode,
      endDate,
      startDate,
      fileName,
      language,
      selectedSender,
      minMessagePercentage,
      selectedWeekdays,
      isPanelOpen,
      originalMessages,
      manualSenderSelection,
    ]
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

/**
 * Custom hook for accessing the Chat Context.
 *
 * @throws {Error} If used outside a ChatProvider.
 * @returns {ChatContextType} The chat state and updater functions.
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
