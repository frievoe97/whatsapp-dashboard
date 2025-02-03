/**
 * Chat Context Provider for managing chat-related state globally in a React application.
 *
 * This context stores chat messages, file upload status, date filters,
 * dark mode preferences, and allows state updates through provided setter functions.
 */

import React, { createContext, useContext, useState } from "react";

/**
 * Interface defining the structure of a chat message.
 */
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

/**
 * Interface defining the shape of the chat context state and actions.
 */
interface ChatContextType {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  endDate: Date | undefined;
  setEndDate: (endDate: Date | undefined) => void;
  startDate: Date | undefined;
  setStartDate: (startDate: Date | undefined) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  language: string;
  setLanguage: (fileName: string) => void;
  selectedSender: string[];
  setSelectedSender: React.Dispatch<React.SetStateAction<string[]>>;
  minMessagePercentage: number;
  setMinMessagePercentage: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Create a React context with an undefined initial value.
 * The context will be provided by `ChatProvider`.
 */
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * ChatProvider component that wraps around components needing access to chat state.
 *
 * @param {React.ReactNode} children - Components that will consume the chat context.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [selectedSender, setSelectedSender] = useState<string[]>([]);
  const [minMessagePercentage, setMinMessagePercentage] = useState<number>(3);

  /**
   * Toggles dark mode.
   */
  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  return (
    <ChatContext.Provider
      value={{
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
        selectedSender,
        setSelectedSender,
        minMessagePercentage,
        setMinMessagePercentage,
        language,
        setLanguage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Custom hook for consuming the chat context.
 *
 * @throws {Error} If used outside of `ChatProvider`.
 * @returns {ChatContextType} - The chat context state and actions.
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
