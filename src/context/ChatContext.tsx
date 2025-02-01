import React, { createContext, useContext, useState } from "react";

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

// const [fileName, setFileName] = useState("");

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem("darkMode") === "true"
  );

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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
