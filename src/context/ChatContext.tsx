// src/context/ChatContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";

// Falls nicht bereits vorhanden, hier der Default für die Wochentage:
const DEFAULT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

export interface ChatContextType {
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  originalMessages: ChatMessage[];
  setOriginalMessages: (msgs: ChatMessage[]) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  startDate?: Date;
  setStartDate: (date?: Date) => void;
  endDate?: Date;
  setEndDate: (date?: Date) => void;
  fileName: string;
  setFileName: (name: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  selectedSender: string[];
  setSelectedSender: React.Dispatch<React.SetStateAction<string[]>>;
  minMessagePercentage: number;
  setMinMessagePercentage: React.Dispatch<React.SetStateAction<number>>;
  selectedWeekdays: string[];
  setSelectedWeekdays: React.Dispatch<React.SetStateAction<string[]>>;
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  manualSenderSelection: Record<string, boolean>;
  setManualSenderSelection: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  isWorking: boolean;
  setIsWorking: (working: boolean) => void;
  format: string;
  setFormat: (fmt: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [selectedSender, setSelectedSender] = useState<string[]>([]);
  const [minMessagePercentage, setMinMessagePercentage] = useState<number>(3);
  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>(DEFAULT_WEEKDAYS);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [manualSenderSelection, setManualSenderSelection] = useState<
    Record<string, boolean>
  >({});
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [format, setFormat] = useState<string>("");

  const contextValue = useMemo(
    () => ({
      messages,
      setMessages,
      originalMessages,
      setOriginalMessages,
      isUploading,
      setIsUploading,
      darkMode,
      toggleDarkMode,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
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
      manualSenderSelection,
      setManualSenderSelection,
      isWorking,
      setIsWorking,
      format,
      setFormat,
    }),
    [
      messages,
      originalMessages,
      isUploading,
      darkMode,
      startDate,
      endDate,
      fileName,
      language,
      selectedSender,
      minMessagePercentage,
      selectedWeekdays,
      isPanelOpen,
      manualSenderSelection,
      isWorking,
      format,
      toggleDarkMode,
    ]
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
