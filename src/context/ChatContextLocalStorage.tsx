/**
 * Chat Context Provider for managing chat-related state globally in a React application.
 *
 * This context stores chat messages, file upload status, date filters,
 * dark mode preferences, and allows state updates through provided setter functions.
 * Only small data is persisted in localStorage to avoid quota errors.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

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
  selectedSender: string[];
  setSelectedSender: React.Dispatch<React.SetStateAction<string[]>>;
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
  const MAX_STORAGE_SIZE = 5000000; // Approx. 5MB limit to avoid quota issues

  const [selectedSender, setSelectedSender] = useState<string[]>(() => {
    const storedSelectedSender = localStorage.getItem("selectedSender");
    return storedSelectedSender ? JSON.parse(storedSelectedSender) : [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storedMessages = localStorage.getItem("messages");
    return storedMessages ? JSON.parse(storedMessages) : [];
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    return undefined;
  });
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return undefined;
  });
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(() => {
    return localStorage.getItem("isUploading") === "true";
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  /**
   * Effect to store messages and other related data in localStorage if they do not exceed the storage limit.
   */
  useEffect(() => {
    try {
      const jsonData = JSON.stringify(messages);
      if (jsonData.length < MAX_STORAGE_SIZE) {
        localStorage.setItem("messages", jsonData);
        localStorage.setItem("fileName", fileName);
        if (endDate) localStorage.setItem("endDate", endDate.toISOString());
        if (startDate)
          localStorage.setItem("startDate", startDate.toISOString());
        localStorage.setItem("selectedSender", JSON.stringify(selectedSender)); // NEU
      } else {
        console.warn(
          "Message data is too large to store in localStorage. Skipping storage of messages, fileName, and date filters."
        );
      }
    } catch (e) {
      console.error("Failed to store messages in localStorage", e);
    }
  }, [messages, fileName, endDate, startDate, selectedSender]);

  useEffect(() => {
    localStorage.setItem("isUploading", isUploading.toString());
  }, [isUploading]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  /**
   * Toggles dark mode and stores preference in localStorage.
   */
  const toggleDarkMode = () => {
    setDarkMode((prevMode) => {
      localStorage.setItem("darkMode", (!prevMode).toString());
      return !prevMode;
    });
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
        selectedSender, // NEU
        setSelectedSender, // NEU
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
