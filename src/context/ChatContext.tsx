/**
 * ChatContext.tsx
 *
 * This module provides a React Context for managing chat-related state throughout the application.
 * It includes logic for:
 * - Storing and updating chat messages
 * - Tracking file upload status (e.g., showing loading states)
 * - Managing date filters (startDate and endDate)
 * - A dark mode preference and its toggle function
 * - File name and language settings
 * - Sender filtering (manual overrides and minimum message percentage)
 * - Weekday-based filtering
 *
 * Components wrapped by <ChatProvider> gain access to these centralized states via the
 * custom hook `useChat`.
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
 * Represents a single chat message with metadata for date, sender, etc.
 */
export interface ChatMessage {
  /** The exact date and time when the message was sent. */
  date: Date;
  /** A string representation of the time (e.g., "14:55"). */
  time: string;
  /** The sender's name or identifier. */
  sender: string;
  /** The textual content of the message. */
  message: string;
  /**
   * A boolean indicating if this message is currently used
   * (e.g., included in filtered or aggregated data).
   */
  isUsed: boolean;
}

/**
 * The shape of our ChatContext, defining both the state and the functions
 * used to update it.
 */
export interface ChatContextType {
  // --------------- Chat messages state ---------------
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;

  // --------------- File upload state ---------------
  /** Whether the application is currently busy uploading or parsing a file. */
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;

  // --------------- Dark mode preference ---------------
  /** Whether dark mode is enabled. */
  darkMode: boolean;
  /** Toggles dark mode between enabled and disabled. */
  toggleDarkMode: () => void;

  // --------------- Date filter state ---------------
  /** The currently selected end date for filtering messages. */
  endDate: Date | undefined;
  setEndDate: (endDate: Date | undefined) => void;
  /** The currently selected start date for filtering messages. */
  startDate: Date | undefined;
  setStartDate: (startDate: Date | undefined) => void;

  // --------------- File name and language ---------------
  /** The name of the file that was last uploaded or processed. */
  fileName: string;
  setFileName: (fileName: string) => void;
  /** The detected or preferred language of the chat messages. */
  language: string;
  setLanguage: (language: string) => void;

  // --------------- Sender filtering ---------------
  /**
   * The senders selected in the current filter. These are determined by
   * a combination of manual selection and the `minMessagePercentage`.
   */
  selectedSender: string[];
  setSelectedSender: React.Dispatch<React.SetStateAction<string[]>>;

  /**
   * The minimum percentage of overall messages a sender must have to be
   * automatically included in the filter (unless manually overridden).
   */
  minMessagePercentage: number;
  setMinMessagePercentage: React.Dispatch<React.SetStateAction<number>>;

  // --------------- Weekday filtering ---------------
  /**
   * A list of weekday abbreviations (e.g., ["Sun", "Mon", "Tue"]) for messages that
   * should be included in the filtered output.
   */
  selectedWeekdays: string[];
  setSelectedWeekdays: React.Dispatch<React.SetStateAction<string[]>>;

  // --------------- Panel / UI state ---------------
  /** Whether a certain filter or info panel is currently open in the UI. */
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // --------------- Original unfiltered data ---------------
  /**
   * An unmodified copy of the chat messages. This is the source from which filtering
   * logic derives the `messages` array.
   */
  originalMessages: ChatMessage[];
  setOriginalMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  /**
   * A record of manual overrides for sender selection.
   * - If a sender does not appear in this record, then the selection is determined automatically.
   * - If a sender is mapped to `false`, that sender is forcibly excluded.
   * - If a sender is mapped to `true`, that sender is forcibly included.
   */
  manualSenderSelection: Record<string, boolean>;
  setManualSenderSelection: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

/**
 * The React Context that holds all chat-related state. It is initially set to `undefined`
 * so that consumers can detect if they are used outside a ChatProvider.
 */
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * The type definition for the props accepted by our ChatProvider.
 */
interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Provides chat-related state and actions to its children via the ChatContext.
 * Components wrapped in <ChatProvider> can access or update this state using the `useChat` hook.
 *
 * @param props - The component props, including any child components to be rendered.
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // ------------------------- Chat messages state -------------------------
  /**
   * The main array of ChatMessage objects that can be displayed or analyzed.
   * Generally, `messages` is a filtered subset of `originalMessages`.
   */
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ------------------------- File upload state ---------------------------
  /**
   * Indicates if a file is currently being uploaded or parsed. This can be used
   * to show loading spinners or to prevent multiple uploads at once.
   */
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // ------------------------- Dark mode preference ------------------------
  /**
   * Tracks whether the application is in dark mode. Could be used
   * to conditionally apply dark-mode styling or classes.
   */
  const [darkMode, setDarkMode] = useState<boolean>(false);

  /**
   * Toggles `darkMode` between true and false.
   * This function is memoized to avoid re-creation on every render.
   */
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prevMode) => !prevMode);
  }, []);

  // ------------------------- Date filter state ---------------------------
  /**
   * The end date for filtering chat messages (inclusive). Messages that occur
   * after this date/time are excluded.
   */
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  /**
   * The start date for filtering chat messages (inclusive). Messages that occur
   * before this date/time are excluded.
   */
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

  // ------------------------- File name and language ----------------------
  /** Tracks the name of the last file uploaded (for UI display or debugging). */
  const [fileName, setFileName] = useState<string>("");

  /**
   * Tracks the application's preferred or detected language, used for
   * tasks like date localization or translations.
   */
  const [language, setLanguage] = useState<string>("");

  // ------------------------- Sender filtering ----------------------------
  /**
   * The list of senders that are currently selected (based on
   * `minMessagePercentage` and/or manual overrides).
   */
  const [selectedSender, setSelectedSender] = useState<string[]>([]);

  /**
   * The threshold percentage for automatically including a sender in `selectedSender`.
   * If a sender's share of total messages is >= this value, that sender is automatically included.
   */
  const [minMessagePercentage, setMinMessagePercentage] = useState<number>(3);

  /**
   * The unmodified list of messages from the file. `messages` is often a filtered subset of these.
   * Used as the data source for re-applying filters (date range, sender selection, etc.).
   */
  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);

  /**
   * Holds manual overrides for each sender. If a sender is included in this
   * record, the user has explicitly included or excluded them. If not included,
   * the logic defaults to the `minMessagePercentage` check.
   */
  const [manualSenderSelection, setManualSenderSelection] = useState<
    Record<string, boolean>
  >({});

  // ------------------------- Weekday filtering ---------------------------
  /**
   * A list of weekday abbreviations (e.g., ["Sun", "Mon"]) that determines
   * which messages are shown. Messages occurring on days not in this list are excluded.
   */
  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>(DEFAULT_WEEKDAYS);

  // ------------------------- Panel / UI state ----------------------------
  /**
   * Tracks whether a certain UI panel (e.g., a sidebar or filter menu) is open.
   * This can be toggled by the user to show/hide advanced filtering or info panels.
   */
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

  // ---------------------- Memoized context value -------------------------
  /**
   * Gathers all chat-related state and actions into a memoized object to provide
   * the best performance for consumers of this context. This object is updated
   * only when one of its dependencies changes.
   */
  const contextValue = useMemo<ChatContextType>(() => {
    return {
      // Chat messages
      messages,
      setMessages,

      // Uploading
      isUploading,
      setIsUploading,

      // Dark mode
      darkMode,
      toggleDarkMode,

      // Date filters
      endDate,
      setEndDate,
      startDate,
      setStartDate,

      // File name & language
      fileName,
      setFileName,
      language,
      setLanguage,

      // Sender filters
      selectedSender,
      setSelectedSender,
      minMessagePercentage,
      setMinMessagePercentage,

      // Weekday filters
      selectedWeekdays,
      setSelectedWeekdays,

      // Panel UI
      isPanelOpen,
      setIsPanelOpen,

      // Original data and manual overrides
      originalMessages,
      setOriginalMessages,
      manualSenderSelection,
      setManualSenderSelection,
    };
  }, [
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
  ]);

  /**
   * Renders the context provider with the memoized context value.
   * All children will have access to the chat context via `useChat()`.
   */
  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

/**
 * A custom hook for accessing chat-related state and actions.
 * Must be used within a <ChatProvider>.
 *
 * @throws Will throw an error if `useChat` is called outside of a <ChatProvider>.
 * @returns The chat context object containing state variables and updater functions.
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
