import React, { ChangeEvent, useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ChevronDown, ChevronUp, Info, Moon, Sun } from "lucide-react";
import FilterWorker from "../workers/filterMessages.worker?worker";
import { franc } from "franc-min";
import InfoModal from "./InfoModal";
import "./FileUpload.css";

// -----------------------------------------------------------------------------
// Constants & Types
// -----------------------------------------------------------------------------

/** Default list of weekdays used for filtering. */
const DEFAULT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
 * Props for the FileUpload component.
 */
interface FileUploadProps {
  /** Callback function invoked when a file is uploaded. */
  onFileUpload: (uploadedFile: File) => void;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Applies local filtering to the provided messages based on the given criteria.
 *
 * @param messages - Array of chat messages.
 * @param filters - Object containing filtering options.
 * @returns The updated array of messages with the `isUsed` flag set.
 */
const applyLocalFilters = (
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

// -----------------------------------------------------------------------------
// FileUpload Component
// -----------------------------------------------------------------------------

/**
 * FileUpload component provides a complete file upload interface along with
 * several filtering options for chat messages. The component supports:
 *
 * - File selection (and deletion)
 * - Automatic file parsing via a Web Worker
 * - Filtering by sender, date range, weekdays, and minimum message share
 * - Dark mode support
 * - Language detection (using franc-min) on loaded messages
 *
 * All existing functionality is preserved in this refactored version.
 */
const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  // ---------------------------------------------------------------------------
  // Context State & Local State
  // ---------------------------------------------------------------------------
  const {
    fileName,
    setFileName,
    endDate,
    setEndDate,
    startDate,
    setStartDate,
    messages,
    setMessages,
    setIsUploading,
    darkMode,
    toggleDarkMode,
    selectedSender,
    setSelectedSender,
    minMessagePercentage,
    setMinMessagePercentage,
    setLanguage,
  } = useChat();

  // Local state for temporary percentage value and UI flags.
  const [tempMinMessagePercentage, setTempMinMessagePercentage] =
    useState(minMessagePercentage);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFileSet, setIsFileSet] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] =
    useState<string[]>(DEFAULT_WEEKDAYS);
  const [applyFilters, setApplyFilters] = useState(false);

  // Memoized list of unique senders from the messages.
  const senders = useMemo(() => {
    return Array.from(new Set(messages.map((msg) => msg.sender)));
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Detect language from the loaded messages using `franc-min` and update
   * the app language accordingly.
   */
  useEffect(() => {
    if (messages.length > 0) {
      const allText = messages.map((msg) => msg.message).join(" ");
      const detectedLanguage = franc(allText, { minLength: 3 });
      console.log("Detected language:", detectedLanguage);

      if (detectedLanguage === "deu") {
        setLanguage("de");
      } else {
        setLanguage("en");
      }
    }
  }, [messages, setLanguage]);

  /**
   * On the initial load (when a file is uploaded), initialize filter settings
   * based on the first and last messages and select all senders.
   */
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
      setIsInitialLoad(false); // Mark initialization as complete.
    }
  }, [
    messages,
    senders,
    isInitialLoad,
    setStartDate,
    setEndDate,
    setSelectedSender,
  ]);

  /**
   * When filters are applied, update the messages by either delegating the
   * filtering to a Web Worker (if supported) or applying the filter locally.
   */
  useEffect(() => {
    if (applyFilters) {
      if (window.Worker) {
        // Delegate filtering to the worker.
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
        // Fallback: apply filtering locally.
        const filteredMessages = applyLocalFilters(messages, {
          startDate,
          endDate,
          selectedSenders: selectedSender,
          selectedWeekdays,
        });
        setMessages(filteredMessages);
        setApplyFilters(false);
      }
    }
  }, [
    applyFilters,
    startDate,
    endDate,
    selectedSender,
    selectedWeekdays,
    messages,
    setMessages,
  ]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Toggles the collapse state of the filter panel.
   */
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    // Trigger a window resize event to ensure dependent components update.
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  };

  /**
   * Handler for file input changes. Reads the file, resets related state,
   * and delegates parsing to a Web Worker.
   *
   * @param event - The file input change event.
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    const file = event.target.files?.[0];
    if (file) {
      // Update file-related state.
      setFileName(file.name);
      setIsFileSet(true);
      setIsCollapsed(true);

      // Invoke the parent callback.
      onFileUpload(file);

      // Reset filters and prepare for new file data.
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays(DEFAULT_WEEKDAYS);
      setApplyFilters(false);
      setIsInitialLoad(true);
      setIsUploading(true);

      // Read file contents.
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const fileContent = e.target.result.toString();
          // Spawn a worker to parse the file.
          const worker = new Worker(
            new URL("../workers/fileParser.worker.ts", import.meta.url)
          );
          worker.postMessage(fileContent);
          worker.onmessage = (event) => {
            setMessages(event.data);
            worker.terminate();
            setIsUploading(false);
          };
        }
      };
      reader.readAsText(file, "UTF-8");

      // Reset the file input so that the same file can be re-uploaded.
      event.target.value = "";
    }
  };

  /**
   * Toggles a sender’s selection state.
   *
   * @param sender - The sender to toggle.
   */
  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev: string[]) =>
      prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender]
    );
  };

  /**
   * Toggles the selection state of a weekday.
   *
   * @param event - The change event from the weekday checkbox.
   */
  const handleWeekdayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  /**
   * Applies the current filter settings.
   */
  const handleApplyFilters = () => {
    setMinMessagePercentage(tempMinMessagePercentage); // Save current percentage value.
    setApplyFilters(true);
    setIsCollapsed(true);
  };

  /**
   * Selects all weekdays.
   */
  const handleSelectAllWeekdays = () => setSelectedWeekdays(DEFAULT_WEEKDAYS);

  /**
   * Deselects all weekdays.
   */
  const handleDeselectAllWeekdays = () => setSelectedWeekdays([]);

  /**
   * Resets all filters to their default values.
   */
  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays(DEFAULT_WEEKDAYS);
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  /**
   * Deletes the current file and resets all related states.
   */
  const handleDeleteFile = () => {
    setFileName("");
    setIsFileSet(false);
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false);
  };

  // ---------------------------------------------------------------------------
  // Dynamic Styles (based on dark mode)
  // ---------------------------------------------------------------------------
  const borderColor = darkMode ? "border-white" : "border-black";
  const textColor = darkMode ? "text-white" : "text-black";
  const bgColor = darkMode ? "bg-gray-700" : "bg-[#ffffff]";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="file-upload-wrapper">
      {/* Information Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        darkMode={darkMode}
      />

      {/* Header Bar: Info, Title, Dark Mode Toggle, Collapse Toggle */}
      <div className="flex items-center h-8">
        {/* Info Button */}
        <button
          onClick={() => setIsInfoOpen(true)}
          className={`px-2 py-1 border rounded-none flex items-center ${
            darkMode
              ? "border-white hover:border-white active:bg-gray-600"
              : "border-black hover:border-black active:bg-gray-300"
          } ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
        >
          <Info size={20} />
        </button>

        {/* Title */}
        <div className="flex-grow text-center text-2xl font-semibold">
          Whatsapp Dashboard
        </div>

        {/* Dark Mode Toggle */}
        <div>
          <button
            onClick={toggleDarkMode}
            className={`px-2 py-1 mr-4 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
          >
            {darkMode ? (
              <Sun size={20} className="text-white" />
            ) : (
              <Moon size={20} className="text-black" />
            )}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className={`px-2 py-1 border rounded-none flex items-center ${
            darkMode
              ? "border-white hover:border-white active:bg-gray-600"
              : "border-black hover:border-black active:bg-gray-300"
          } ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* Main Content: File Upload & Filter Controls */}
      {!isCollapsed && (
        <div
          className={`mt-4 border ${
            darkMode ? "border-white" : "border-black"
          } p-4 file-upload grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
          }`}
        >
          {/* File Upload & Delete Section */}
          <div className="flex flex-col space-y-2">
            <div className="flex flex-row space-x-2">
              <div className="w-full flex flex-row">
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer text-sm px-4 py-2 border ${
                    darkMode
                      ? "border-white bg-gray-700 text-white"
                      : "border-black bg-white text-black"
                  } hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block`}
                >
                  Select File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName && (
                  <p className="mt-2 text-sm ml-4">
                    <span className={darkMode ? "text-white" : "text-black"}>
                      {fileName}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Deletion Section */}
          <div className="flex flex-col space-y-2 md:justify-end">
            {isFileSet && (
              <button
                onClick={handleDeleteFile}
                className={`px-4 py-2 text-sm rounded-none border ${
                  darkMode
                    ? "border-white hover:border-white active:bg-gray-600"
                    : "border-black hover:border-black active:bg-gray-300"
                } w-full ${
                  darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                }`}
              >
                Delete File
              </button>
            )}
          </div>

          {/* Filter Controls (only shown when messages are loaded) */}
          {messages.length > 0 && (
            <>
              {/* Sender Selection */}
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Senders:</h3>
                <div className="flex flex-wrap gap-2">
                  {senders.map((sender) => (
                    <button
                      key={sender}
                      onClick={() => handleSenderChange(sender)}
                      className={`px-3 py-1 text-sm border rounded-none w-auto ${
                        darkMode
                          ? "border-white hover:border-white"
                          : "border-black hover:border-black"
                      } ${
                        selectedSender.includes(sender)
                          ? darkMode
                            ? "bg-white text-black"
                            : "bg-black text-white"
                          : darkMode
                          ? "text-white"
                          : "text-black"
                      }`}
                    >
                      {sender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range & Minimum Message Share */}
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Date:</h3>
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Start Date:</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) =>
                        setStartDate(date || undefined)
                      }
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      className={`p-2 border ${
                        darkMode
                          ? "border-white hover:border-white"
                          : "border-black hover:border-black"
                      } w-full ${
                        darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-white text-black"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">End Date:</label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) =>
                        setEndDate(date || undefined)
                      }
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      className={`p-2 border ${
                        darkMode ? "border-white" : "border-black"
                      } w-full ${
                        darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-white text-black"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex flex-col w-fit">
                  <label className="text-sm mb-1">
                    Minimum Message Share (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempMinMessagePercentage}
                    onChange={(e) =>
                      setTempMinMessagePercentage(Number(e.target.value))
                    }
                    className={`p-2 border ${
                      darkMode ? "border-white" : "border-black"
                    } w-full ${
                      darkMode
                        ? "bg-gray-700 text-white"
                        : "bg-white text-black"
                    }`}
                  />
                </div>
              </div>

              {/* Weekday Selection */}
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Weekdays:</h3>
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                  <div className="flex flex-wrap gap-0">
                    {DEFAULT_WEEKDAYS.map((day) => (
                      <label
                        key={day}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={day}
                          checked={selectedWeekdays.includes(day)}
                          onChange={handleWeekdayChange}
                          className="hidden"
                        />
                        <span
                          className={`flex items-center justify-center w-4 h-4 border ${
                            darkMode ? "border-white" : "border-black"
                          } rounded-none relative`}
                        >
                          {selectedWeekdays.includes(day) && (
                            <svg
                              className={`w-3 h-3 ${
                                darkMode ? "text-white" : "text-black"
                              }`}
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2 8L6 12L14 4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`text-sm ${
                            darkMode ? "text-white" : "text-black"
                          }`}
                        >
                          {day}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSelectAllWeekdays}
                      className={`px-3 py-1 text-sm rounded-none border ${
                        darkMode
                          ? "border-white hover:border-white active:bg-gray-600"
                          : "border-black hover:border-black active:bg-gray-300"
                      } w-auto ${
                        darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllWeekdays}
                      className={`px-3 py-1 text-sm border ${
                        darkMode
                          ? "border-white hover:border-white active:bg-gray-600"
                          : "border-black hover:border-black active:bg-gray-600"
                      } rounded-none w-auto ${
                        darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset and Apply Buttons */}
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 mt-auto">
                <button
                  onClick={handleResetFilters}
                  className={`px-4 py-2 text-sm border ${
                    darkMode
                      ? "border-white hover:border-white active:bg-gray-600"
                      : "border-black hover:border-black active:bg-gray-300"
                  } rounded-none w-full ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className={`px-4 py-2 text-sm border ${
                    darkMode
                      ? "border-white hover:border-white active:bg-gray-200"
                      : "border-black hover:border-black active:bg-gray-700"
                  } rounded-none w-full ${
                    darkMode ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
