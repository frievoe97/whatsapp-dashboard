// File: src/components/FileUploadMobile.tsx

import React, { ChangeEvent, useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./FileUpload.css";
import { Info, ChevronDown, ChevronUp, Moon, Sun, Trash2 } from "lucide-react";
import FilterWorker from "../workers/filterMessages.worker?worker";
import InfoModal from "./InfoModal";
import { useChat } from "../context/ChatContext";

/**
 * FileUploadProps defines the properties for the FileUploadMobile component.
 */
interface FileUploadProps {
  onFileUpload: (uploadedFile: File) => void;
}

/**
 * ChatMessage defines the structure of a single chat message.
 */
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

/**
 * FileUploadMobile
 *
 * A mobile-friendly component that handles file uploads,
 * parsing the file with a worker, and then offering a rich set of
 * filters to work on the parsed chat messages. It supports dark mode,
 * an info modal, and an expandable/collapsible layout.
 *
 * All features from the original code have been preserved.
 */
const FileUploadMobile: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  /* --------------------------- Context and State --------------------------- */

  // Get shared state and setters from ChatContext.
  const {
    messages,
    setMessages,
    setIsUploading,
    darkMode,
    toggleDarkMode,
    fileName,
    setFileName,
    endDate,
    setEndDate,
    startDate,
    setStartDate,
    selectedSender,
    setSelectedSender,
    minMessagePercentage,
    setMinMessagePercentage,
  } = useChat();

  // Local UI state.
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [hasFileBeenSet, setHasFileBeenSet] = useState<boolean>(false);
  const [tempMinMessagePercentage, setTempMinMessagePercentage] =
    useState<number>(minMessagePercentage);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);
  const [applyFilters, setApplyFilters] = useState<boolean>(false);

  // Constant weekdays for checkboxes.
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Compute the unique sender names from the messages.
  const senders = useMemo(() => {
    return Array.from(new Set(messages.map((msg) => msg.sender)));
  }, [messages]);

  /* ------------------------------ Side Effects ----------------------------- */

  // Collapse the panel automatically when a file has been set.
  useEffect(() => {
    if (fileName !== "" && !hasFileBeenSet) {
      setIsExpanded(false);
      setHasFileBeenSet(true);
    }
    if (fileName === "") {
      setHasFileBeenSet(false);
    }
  }, [fileName, hasFileBeenSet]);

  // Disable document scrolling when the info modal is open.
  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? "hidden" : "";
  }, [isInfoOpen]);

  // When messages are loaded initially, set the date range and sender filters.
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
    senders,
    isInitialLoad,
    setStartDate,
    setEndDate,
    setSelectedSender,
  ]);

  // When applyFilters is triggered, run the filtering logic using a web worker if available.
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
        // Fallback for browsers that do not support web workers.
        const filteredMessages = messages.map((msg) => {
          const messageDate = new Date(msg.date);
          const messageDay = messageDate.toLocaleString("en-US", {
            weekday: "short",
          });
          const isWithinDateRange =
            (!startDate || messageDate >= startDate) &&
            (!endDate || messageDate <= endDate);
          const isSenderSelected = selectedSender.includes(msg.sender);
          const isWeekdaySelected = selectedWeekdays.includes(messageDay);
          return {
            ...msg,
            isUsed: isWithinDateRange && isSenderSelected && isWeekdaySelected,
          };
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

  /* --------------------------- Event Handlers ------------------------------ */

  /**
   * Handles the file input change event. Reads the file contents,
   * sends it to the file parsing worker, and resets filter state.
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Clear existing messages.
    setMessages([]);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Update file name in context.
      if (file) {
        setFileName(file.name);
      } else {
        setFileName("");
      }

      // Let the parent know a file has been uploaded.
      onFileUpload(file);

      // Reset filter settings.
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays([...weekdays]);
      setApplyFilters(false);
      setIsInitialLoad(true);

      // Collapse the panel.
      setIsExpanded(false);

      // Set uploading state and read file contents.
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const fileContent = e.target.result.toString();
          // Create a worker for file parsing.
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

      // Reset the file input value to allow re-uploading the same file.
      event.target.value = "";
    }
  };

  /**
   * Toggles the inclusion of a sender in the filter.
   */
  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev) =>
      prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender]
    );
  };

  /**
   * Toggles a weekday in the filter.
   */
  const handleWeekdayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  /**
   * Applies the filters by updating the minimum message percentage
   * and triggering the filtering process.
   */
  const handleApplyFilters = () => {
    setMinMessagePercentage(tempMinMessagePercentage);
    setApplyFilters(true);
    setIsExpanded(false);
  };

  /**
   * Resets all filters to their default values.
   */
  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays([...weekdays]);
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  /**
   * Deletes the current file, resets all filters and messages,
   * and re-expands the upload panel.
   */
  const handleDeleteFile = () => {
    setFileName("");
    setMessages([]);
    setIsExpanded(true);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false);
  };

  /**
   * Toggles the expansion state of the panel and dispatches a
   * resize event to allow child components to update accordingly.
   */
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  };

  /* --------------------------- Styling Variables --------------------------- */

  // Set dynamic CSS class names based on darkMode.
  const borderColor = darkMode ? "border-white" : "border-black";
  const textColor = darkMode ? "text-white" : "text-black";
  const bgColor = darkMode ? "bg-[#1f2937]" : "bg-[#ffffff]";
  const activeColor = darkMode ? "active:bg-gray-600" : "active:bg-gray-300";
  const senderSelected = darkMode ? "bg-gray-500" : "bg-gray-200";

  /* ---------------------- Internal Sub-Components -------------------------- */

  /**
   * HeaderSection renders the top header with the info modal button,
   * dashboard title, dark mode toggle, and collapse/expand control.
   */
  const HeaderSection: React.FC = () => (
    <div className="flex items-center h-8">
      {/* Info Button */}
      <button
        onClick={() => setIsInfoOpen(true)}
        className={`px-2 py-1 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
      >
        <Info size={16} />
      </button>

      {/* Title */}
      <div className="flex-grow text-center text-lg font-semibold">
        Whatsapp Dashboard
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`px-2 py-1 mr-4 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
      >
        {darkMode ? (
          <Sun size={16} className="text-white" />
        ) : (
          <Moon size={16} className="text-black" />
        )}
      </button>

      {/* Collapse/Expand Toggle */}
      <button
        onClick={toggleExpanded}
        className={`px-2 py-1 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
      >
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );

  /**
   * FileUploadSection renders the file upload input along with
   * the current file name display and a delete file button.
   */
  const FileUploadSection: React.FC = () => (
    <div className="w-full flex flex-row items-center justify-between">
      <div className="flex flex-row items-center">
        <label
          htmlFor="file-upload"
          className={`cursor-pointer px-4 py-1 md:py-2 border ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          } hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block ${bgColor} ${textColor} ${borderColor}`}
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
            {darkMode ? (
              <span className="text-white">{fileName}</span>
            ) : (
              <span className="text-black">{fileName}</span>
            )}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {fileName && (
          <button
            onClick={handleDeleteFile}
            className={`w-full py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
          >
            <Trash2
              size={16}
              className={`${darkMode ? "text-white" : "text-black"}`}
            />
          </button>
        )}
      </div>
    </div>
  );

  /**
   * FilterSection renders all filter options including:
   * - Sender selection buttons
   * - Date range pickers for start and end dates
   * - A numeric input for minimum message share
   * - Weekday checkboxes
   * - Reset and Apply buttons for the filters
   */
  const FilterSection: React.FC = () => (
    <div className="space-y-6">
      {/* Sender Selection */}
      <div>
        <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
          Select Sender
        </h3>
        <div className="flex flex-wrap gap-2">
          {senders.map((sender) => (
            <button
              key={sender}
              onClick={() => handleSenderChange(sender)}
              className={`px-3 py-1 text-sm rounded-none ${borderColor} ${bgColor} hover:${borderColor} border ${
                selectedSender.includes(sender)
                  ? `${senderSelected} ${textColor}`
                  : ""
              } focus:outline-none`}
            >
              {sender}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="flex flex-row gap-4">
        <div>
          <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
            Select Date Range
          </h3>
          <div className="flex flex-row gap-2">
            <div>
              <label className={`text-sm block ${textColor}`}>
                Start Date:
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) =>
                  setStartDate(date || undefined)
                }
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className={`mt-1 p-2 w-full rounded-none ${bgColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
              />
            </div>
            <div>
              <label className={`text-sm block ${textColor}`}>End Date:</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date || undefined)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className={`mt-1 p-2 w-full rounded-none ${bgColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Minimum Message Share Input */}
      <div className="flex flex-col w-fit">
        <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
          Minimum Message Share (%):
        </h3>
        <input
          type="number"
          min="0"
          max="100"
          value={tempMinMessagePercentage}
          onChange={(e) => setTempMinMessagePercentage(Number(e.target.value))}
          className={`p-2 border ${
            darkMode ? "border-white" : "border-black"
          } w-full ${
            darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
          }`}
        />
      </div>

      {/* Weekday Selection */}
      <div>
        <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
          Select Weekdays
        </h3>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => (
            <label
              key={day}
              className={`flex items-center space-x-2 ${textColor}`}
            >
              <input
                type="checkbox"
                value={day}
                checked={selectedWeekdays.includes(day)}
                onChange={handleWeekdayChange}
                className={`form-checkbox h-4 w-4 text-blue-600 ${borderColor} hover:${borderColor} border focus:outline-none`}
              />
              <span className="text-sm">{day}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleResetFilters}
          className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} ${activeColor} border focus:outline-none`}
        >
          Reset
        </button>
        <button
          onClick={handleApplyFilters}
          className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} ${activeColor} border focus:outline-none`}
        >
          Apply
        </button>
      </div>
    </div>
  );

  /* ------------------------------ Render JSX ------------------------------- */

  return (
    <div
      className={`p-4 min-h-fit flex flex-col space-y-4 ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border`}
    >
      {/* Info Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        darkMode={darkMode}
      />

      {/* Header Section */}
      <HeaderSection />

      {/* Expandable Content Section */}
      {isExpanded && (
        <>
          <FileUploadSection />
          {messages.length > 0 && <FilterSection />}
        </>
      )}
    </div>
  );
};

export default FileUploadMobile;
