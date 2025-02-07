import { useState, useEffect, useMemo, useRef, ChangeEvent } from "react";
import { useChat } from "../context/ChatContext";
import { franc } from "franc-min";
import FilterWorker from "../workers/filterMessages.worker?worker";

/**
 * Default weekdays used for filtering chat messages.
 */
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
 * Applies local filters to a given array of messages. This function is used as a fallback
 * if the user's browser does not support Web Workers (or if we do not want to rely on them).
 *
 * It filters by:
 * - Date range
 * - Selected senders
 * - Selected weekdays
 *
 * @param messages - The original array of ChatMessage objects.
 * @param filters - Filter criteria including optional start/end dates, a list of selected senders,
 *                  and a list of selected weekdays.
 * @returns A new array of ChatMessage objects in which `isUsed` is updated to reflect
 *          whether the message passed the filters.
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
 * A custom hook that encapsulates file-upload and filtering logic for WhatsApp chat data.
 *
 * The hook is intended to manage:
 * 1) File upload & parsing logic (via a worker for large files).
 * 2) Message filtering (via a worker or local fallback).
 * 3) Initial filter setup upon first file load (dates, senders, etc.).
 * 4) Language detection (using `franc-min`) once messages are available.
 *
 * All relevant state is read from and written to the global ChatContext.
 * The hook exposes handlers and states that can be connected to a UI component.
 *
 * @param onFileUpload - A callback function that is invoked when a file is uploaded.
 * @returns An object containing states and handlers to be used by the UI.
 */
export const useFileUploadLogic = (onFileUpload: (file: File) => void) => {
  // -------------------------- CONTEXT STATE ---------------------------
  // We pull in a range of state and setters from our ChatContext.
  const {
    setFileName,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    messages,
    setMessages,
    setIsUploading,
    setSelectedSender,
    minMessagePercentage,
    setMinMessagePercentage,
    setLanguage,
    selectedWeekdays,
    setSelectedWeekdays,
    setIsPanelOpen,
    setOriginalMessages,
    setManualSenderSelection,
    manualSenderSelection,
    originalMessages,
    setIsWorking,
    language,
    format,
    setFormat,
  } = useChat();

  // ------------------------ LOCAL COMPONENT STATE ---------------------
  /**
   * This local state temporarily holds the user's minimum message percentage
   * before finally applying it (e.g. if the user is typing in a slider or input field).
   */
  const [tempMinMessagePercentage, setTempMinMessagePercentage] =
    useState<number>(minMessagePercentage);

  /**
   * Flag indicating whether this is the very first file load (true) or a subsequent load (false).
   */
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(false);

  /**
   * When true, triggers the filter application process (via Web Worker or fallback).
   * This is set to false once the filter process completes.
   */
  const [applyFilters, setApplyFilters] = useState<boolean>(false);

  /**
   * Controls whether informational UI (e.g., a help popover) is displayed.
   */
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  /**
   * Stores the previous minMessagePercentage so that we can detect changes
   * (e.g., if the new value is lower than the old value).
   */
  const prevMinMessagePercentage = useRef<number>(minMessagePercentage);

  /**
   * A memoized array of unique senders from the currently filtered `messages`.
   */
  const senders = useMemo(
    () => Array.from(new Set(messages.map((msg) => msg.sender))),
    [messages]
  );

  // -------------------------- EFFECTS ---------------------------------

  /**
   * Detect if `minMessagePercentage` has decreased. If so, we may need to
   * include some senders that were previously excluded. We recalculate
   * the default selection and update the manual sender selection accordingly.
   */
  useEffect(() => {
    // Wenn die Grenze sinkt und wir bereits Originaldaten haben ...
    if (
      minMessagePercentage < prevMinMessagePercentage.current &&
      originalMessages.length > 0
    ) {
      const totalMessages = originalMessages.length;
      const allSenders = Array.from(
        new Set(originalMessages.map((msg) => msg.sender))
      );

      // Für alle Sender, die jetzt neu >= minMessagePercentage liegen:
      // Entferne manuelle Overrides, damit sie „auto-aktiv“ werden können.
      setManualSenderSelection((prev) => {
        const newManual = { ...prev };

        allSenders.forEach((sender) => {
          const count = originalMessages.filter(
            (m) => m.sender === sender
          ).length;
          const percentage = (count / totalMessages) * 100;

          if (percentage >= minMessagePercentage) {
            delete newManual[sender];
          }
        });

        return newManual;
      });
    }

    // Referenzwert aktualisieren
    prevMinMessagePercentage.current = minMessagePercentage;
  }, [minMessagePercentage, originalMessages, setManualSenderSelection]);

  /**
   * Once messages are loaded, use the franc library to detect the primary language
   * and update our language state in the ChatContext. This runs on changes to `messages`.
   */
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
        // Default to English if detection is uncertain
        setLanguage("en");
      }
    }
  }, [messages, setLanguage]);

  useEffect(() => {
    if (!language || !format) {
      // Wenn eines der beiden leer ist, wird nichts gemacht
      return;
    }

    // Falls eine ungültige Kombination existiert, Standardwerte setzen
    const validLanguages = ["en", "de", "fr", "es"];
    const validFormats = ["ios", "android"];

    const lang = validLanguages.includes(language) ? language : "en";
    const fmt = validFormats.includes(format) ? format : "ios";

    const fileName = `ignore_lines_${lang}_${fmt}.txt`;

    const primaryPath = `src/assets/${fileName}`;
    const fallbackPath = `/files/${fileName}`;

    console.log(`🔍 Starte den Datei-Load: ${primaryPath}`);

    fetch(primaryPath)
      .then((response) => {
        console.log(`📡 Antwort von ${primaryPath}:`, response);

        if (!response.ok) {
          console.error(
            `❌ Datei nicht gefunden: ${primaryPath} (Status: ${response.status})`
          );
          throw new Error(`Datei nicht gefunden: ${primaryPath}`);
        }

        console.log(`✅ Datei erfolgreich geladen: ${primaryPath}`);
        return response.text();
      })
      .catch((error) => {
        console.warn(
          `⚠️ Fehler beim Laden aus '${primaryPath}', versuche Fallback...`,
          error
        );

        console.log(`🔄 Fallback auf: ${fallbackPath}`);
        return fetch(fallbackPath).then((response) => {
          console.log(`📡 Antwort von ${fallbackPath}:`, response);

          if (!response.ok) {
            console.error(
              `❌ Fallback-Datei nicht gefunden: ${fallbackPath} (Status: ${response.status})`
            );
            throw new Error(`Datei nicht gefunden: ${fallbackPath}`);
          }

          console.log(`✅ Fallback-Datei erfolgreich geladen: ${fallbackPath}`);
          return response.text();
        });
      })
      .then((text) => {
        console.log(`📄 Dateiinhalt empfangen (${text.length} Zeichen)`);

        const ignoreLines = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        console.log(
          `📝 ${ignoreLines.length} Zeilen in der Ignorierliste geladen:`,
          ignoreLines
        );

        const filteredMessages = messages.filter(
          (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore))
        );

        console.log(
          `🔍 ${
            messages.length - filteredMessages.length
          } Nachrichten entfernt.`
        );
        console.log(`📩 Verbleibende Nachrichten: ${filteredMessages.length}`);

        setMessages(filteredMessages);
      })
      .catch((finalError) => {
        console.error(
          `🚨 Fehler beim Laden der Datei aus beiden Pfaden:`,
          finalError
        );
      });
  }, [language, format, setMessages]);

  /**
   * For the very first file load, we auto-set the date range (startDate, endDate)
   * and auto-select the senders whose share of total messages is at least `minMessagePercentage`.
   */
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);

      const totalMessages = messages.length;
      const allSenders = Array.from(new Set(messages.map((msg) => msg.sender)));

      const defaultSelected = allSenders.filter((sender) => {
        const count = messages.filter((msg) => msg.sender === sender).length;
        const percentage = (count / totalMessages) * 100;
        return percentage >= minMessagePercentage;
      });

      const newManualSelection: Record<string, boolean> = {};
      allSenders.forEach((sender) => {
        newManualSelection[sender] = defaultSelected.includes(sender);
      });

      setSelectedSender(defaultSelected);
      setManualSenderSelection(newManualSelection);
      setIsInitialLoad(false);
    }
  }, [
    messages,
    isInitialLoad,
    minMessagePercentage,
    setStartDate,
    setEndDate,
    setSelectedSender,
    setManualSenderSelection,
  ]);

  /**
   * Whenever `applyFilters` is set to true, we recompute the final set of messages
   * (including date range, senders, and weekdays). If `window.Worker` is supported, we
   * use a dedicated worker for performance. Otherwise, we fall back to local filtering.
   */
  useEffect(() => {
    if (!applyFilters) return;

    // 1) Compute total messages and all senders from the original unfiltered set
    const totalMessages = originalMessages.length;
    const allSenders = Array.from(
      new Set(originalMessages.map((msg) => msg.sender))
    );

    // 2) Determine the final set of selected senders:
    //    - If manually set to false, the sender is excluded.
    //    - Otherwise, we apply the minMessagePercentage threshold automatically.
    const finalSelectedSenders = allSenders.filter((sender) => {
      // Manual override exists and is set to false => exclude
      if (
        sender in manualSenderSelection &&
        manualSenderSelection[sender] === false
      ) {
        return false;
      }
      const count = originalMessages.filter(
        (msg) => msg.sender === sender
      ).length;
      const percentage = (count / totalMessages) * 100;
      return percentage >= minMessagePercentage;
    });

    // 3) Build a new object that includes the final statuses
    const newManualSelection: Record<string, boolean> = {};
    allSenders.forEach((sender) => {
      newManualSelection[sender] = finalSelectedSenders.includes(sender);
    });

    console.log("newManualSelection", newManualSelection);

    // 4) If we have Worker support, offload the filtering
    if (window.Worker) {
      const worker = new FilterWorker();
      worker.postMessage({
        messages: originalMessages,
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          selectedSenders: finalSelectedSenders,
          selectedWeekdays,
        },
      });

      worker.onmessage = (event: MessageEvent<ChatMessage[]>) => {
        setMessages(event.data);
        setSelectedSender(finalSelectedSenders);
        setManualSenderSelection(newManualSelection);
        setApplyFilters(false);
        setIsWorking(false);
        worker.terminate();
      };
    } else {
      // 4b) Otherwise do local filtering
      const filteredMessages = applyLocalFilters(originalMessages, {
        startDate,
        endDate,
        selectedSenders: finalSelectedSenders,
        selectedWeekdays,
      });

      setMessages(filteredMessages);
      setSelectedSender(finalSelectedSenders);
      setManualSenderSelection(newManualSelection);
      setApplyFilters(false);
      setIsWorking(false);
    }
  }, [
    applyFilters,
    startDate,
    endDate,
    selectedWeekdays,
    setMessages,
    manualSenderSelection,
    originalMessages,
    minMessagePercentage,
    setSelectedSender,
    setManualSenderSelection,
  ]);

  // ---------------------------- HANDLERS ------------------------------

  /**
   * Handles changes in the file input (e.g., when the user selects a .txt file).
   * 1) Clears existing messages.
   * 2) Reads the file content and spawns a parser worker.
   * 3) Updates application state once parsing is complete.
   *
   * @param event - The change event originating from the file input.
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsWorking(true);
    setMessages([]);
    setOriginalMessages([]);
    const file = event.target.files?.[0];

    if (file) {
      // Set UI states & context for new upload
      setFileName(file.name);
      onFileUpload(file);
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays([...DEFAULT_WEEKDAYS]);
      setApplyFilters(false);
      setIsInitialLoad(true);
      setIsUploading(true);

      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setIsWorking(false);
          const fileContent = e.target.result.toString();

          // Spawn our parsing worker
          const parserWorker = new Worker(
            new URL("../workers/fileParser.worker.ts", import.meta.url)
          );
          parserWorker.postMessage({ fileContent, format: "" });

          parserWorker.onmessage = (event) => {
            console.log("Worker message", event.data);
            if (event.data.chosenFormat) {
              setFormat(event.data.chosenFormat);
            }

            setMessages(event.data.messages);
            setOriginalMessages(event.data.messages);
            parserWorker.terminate();
            setIsUploading(false);
            setIsPanelOpen(false);
          };
        }
      };
      reader.readAsText(file, "UTF-8");
      // Reset the file input value so users can re-select the same file if needed
      event.target.value = "";
    }
  };

  /**
   * Toggles the manual selection state of a given sender. We cycle through
   * three states: (a) no override, (b) manually excluded, (c) manually included.
   *
   * @param sender - The sender to toggle.
   */
  const handleSenderChange = (sender: string) => {
    setManualSenderSelection((prev) => {
      if (sender in prev) {
        // If we already have an override, toggle from false -> true -> remove
        const current = prev[sender];
        if (current === false) {
          // false -> true
          return { ...prev, [sender]: true };
        } else {
          // true -> remove override (so that auto selection logic applies again)
          const { [sender]: _, ...rest } = prev;
          return rest;
        }
      } else {
        // no override -> set to false (explicitly exclude)
        return { ...prev, [sender]: false };
      }
    });
  };

  /**
   * Toggles the inclusion of a weekday in the current weekday filter.
   *
   * @param event - The checkbox change event.
   */
  const handleWeekdayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  /**
   * Applies all filters (date range, sender overrides, weekdays, minMessagePercentage).
   * This triggers the filter logic in a useEffect above.
   */
  const handleApplyFilters = () => {
    setMinMessagePercentage(tempMinMessagePercentage);
    setApplyFilters(true);
    setIsPanelOpen(false);
  };

  /**
   * Resets all filters to default values. This does not remove messages from context,
   * but it resets date range, weekdays, and manual sender overrides so that auto selection
   * can occur again.
   */
  const handleResetFilters = () => {
    // Clear manual overrides => re-apply automatic logic based on minMessagePercentage
    setManualSenderSelection({});
    setSelectedWeekdays([...DEFAULT_WEEKDAYS]);
    setMinMessagePercentage(3);
    setTempMinMessagePercentage(3);

    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  /**
   * Deletes the currently loaded file and resets all associated state, effectively returning
   * the user interface to its pre-upload state.
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

  // -------------------------- RETURN API ------------------------------
  return {
    // Expose local states / setters so that a UI component can bind them
    tempMinMessagePercentage,
    setTempMinMessagePercentage,
    selectedWeekdays,
    setSelectedWeekdays,
    isInfoOpen,
    setIsInfoOpen,
    senders,

    // Handlers that the UI can call
    handleFileChange,
    handleDeleteFile,
    handleSenderChange,
    handleWeekdayChange,
    handleApplyFilters,
    handleResetFilters,
  };
};
