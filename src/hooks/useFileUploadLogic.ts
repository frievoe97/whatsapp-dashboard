import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { useChat } from "../context/ChatContext";
import { franc } from "franc-min";
import FilterWorker from "../workers/filterMessages.worker?worker";

/** Default weekdays used for filtering. */
export const DEFAULT_WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/**
 * Interface representing a single chat message.
 */
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

/**
 * Applies local filters to the provided messages based on date range,
 * sender selection and weekday selection.
 *
 * @param messages - Array of chat messages.
 * @param filters - Filter criteria.
 * @returns Filtered array with updated `isUsed` flags.
 */
export const applyLocalFilters = (
  messages: ChatMessage[],
  filters: {
    startDate?: Date;
    endDate?: Date;
    selectedSenders: string[];
    selectedWeekdays: string[];
  }
): ChatMessage[] => {
  return messages.map((msg) => {
    const messageDate = new Date(msg.date);
    const messageDay = messageDate.toLocaleString("en-US", {
      weekday: "short",
    });
    const isWithinDateRange =
      (!filters.startDate || messageDate >= filters.startDate) &&
      (!filters.endDate || messageDate <= filters.endDate);
    const isSenderSelected = filters.selectedSenders.includes(msg.sender);
    const isWeekdaySelected = filters.selectedWeekdays.includes(messageDay);
    return {
      ...msg,
      isUsed: isWithinDateRange && isSenderSelected && isWeekdaySelected,
    };
  });
};

/**
 * Custom hook that encapsulates the common logic for:
 * - File upload and parsing (using a Web Worker)
 * - Filtering (delegated to a Web Worker oder lokal)
 * - Initial filter setup (Datum, Sender, etc.)
 * - Spracheerkennung (mit franc-min)
 *
 * @param onFileUpload Callback invoked when a file is uploaded.
 * @returns An object with handlers and states used von den UI-Komponenten.
 */
export const useFileUploadLogic = (onFileUpload: (file: File) => void) => {
  const {
    setFileName,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    messages,
    setMessages,
    setIsUploading,
    selectedSender,
    setSelectedSender,
    minMessagePercentage,
    setMinMessagePercentage,
    setLanguage,
    selectedWeekdays,
    setSelectedWeekdays,
    setIsPanelOpen,
  } = useChat();

  // Lokale Zustände, die in beiden Varianten gebraucht werden.
  const [tempMinMessagePercentage, setTempMinMessagePercentage] =
    useState<number>(minMessagePercentage);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(false);
  const [applyFilters, setApplyFilters] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  // Berechne aus den Nachrichten die Liste der Sender.
  const senders = useMemo(
    () => Array.from(new Set(messages.map((msg) => msg.sender))),
    [messages]
  );

  // Spracheerkennung: sobald Nachrichten vorhanden sind, wird die Sprache erkannt.
  useEffect(() => {
    if (messages.length > 0) {
      const allText = messages.map((msg) => msg.message).join(" ");
      const detectedLanguage = franc(allText, { minLength: 3 });
      if (detectedLanguage === "deu") {
        setLanguage("de");
      } else if (detectedLanguage === "fra") {
        setLanguage("fr");
      } else if (detectedLanguage === "spa") {
        setLanguage("es");
      } else {
        setLanguage("en");
      }
    }
  }, [messages, setLanguage]);

  // Bei der initialen Datei‑Ladung: Datum und Sender filtern initial setzen.
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
      setIsInitialLoad(false);
    }
  }, [
    messages,
    isInitialLoad,
    senders,
    setStartDate,
    setEndDate,
    setSelectedSender,
  ]);

  // Filterlogik: Wenn die Filter angewendet werden sollen, wird – wenn möglich – ein Web Worker
  // zur Verarbeitung genutzt.
  useEffect(() => {
    if (applyFilters) {
      if (window.Worker) {
        const worker = new FilterWorker();
        worker.postMessage({
          messages,
          filters: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            selectedSenders: selectedSender,
            selectedWeekdays,
          },
        });
        worker.onmessage = (event: MessageEvent<ChatMessage[]>) => {
          setMessages(event.data);
          setApplyFilters(false);
          worker.terminate();
        };
      } else {
        // Fallback: lokale Filterung
        const filteredMessages = applyLocalFilters(messages, {
          startDate,
          endDate,
          selectedSenders: selectedSender,
          selectedWeekdays: selectedWeekdays,
        });
        setMessages(filteredMessages);
        setApplyFilters(false);
      }
    }
  }, [
    applyFilters,
    messages,
    startDate,
    endDate,
    selectedSender,
    selectedWeekdays,
    setMessages,
  ]);

  /**
   * Handler für Änderungen des File‑Inputs.
   * Liest die Datei aus, startet den Parsing-Worker und setzt alle relevanten Zustände zurück.
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file);
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays([...DEFAULT_WEEKDAYS]);
      setApplyFilters(false);
      setIsInitialLoad(true);
      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const fileContent = e.target.result.toString();
          const worker = new Worker(
            new URL("../workers/fileParser.worker.ts", import.meta.url)
          );
          worker.postMessage(fileContent);
          worker.onmessage = (event) => {
            setMessages(event.data);
            worker.terminate();
            setIsUploading(false);
            setIsPanelOpen(false);
          };
        }
      };
      reader.readAsText(file, "UTF-8");
      event.target.value = "";
    }
  };

  /**
   * Toggle‑Funktion zum Ändern der Senderauswahl.
   *
   * @param sender Der Sender, dessen Auswahl umgeschaltet wird.
   */
  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev) =>
      prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender]
    );
  };

  /**
   * Toggle‑Funktion für die Auswahl eines Wochentags.
   *
   * @param event ChangeEvent eines Checkbox-Inputs.
   */
  const handleWeekdayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  /**
   * Löst das Anwenden der aktuellen Filtereinstellungen aus.
   */
  const handleApplyFilters = () => {
    setMinMessagePercentage(tempMinMessagePercentage);
    setApplyFilters(true);
    setIsPanelOpen(false);
  };

  /**
   * Setzt alle Filter auf die Standardwerte zurück.
   */
  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays([...DEFAULT_WEEKDAYS]);
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  /**
   * Löscht die aktuell geladene Datei und setzt alle zugehörigen Zustände zurück.
   */
  const handleDeleteFile = () => {
    setFileName("");
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false);
  };

  return {
    tempMinMessagePercentage,
    setTempMinMessagePercentage,
    selectedWeekdays,
    setSelectedWeekdays,
    isInfoOpen,
    setIsInfoOpen,
    senders,
    handleFileChange,
    handleDeleteFile,
    handleSenderChange,
    handleWeekdayChange,
    handleApplyFilters,
    handleResetFilters,
  };
};
