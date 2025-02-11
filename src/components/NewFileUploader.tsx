import React, { ChangeEvent, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ChevronDown, ChevronUp, Info, Moon, Sun, Trash2 } from "lucide-react";
import InfoModal from "./InfoModal";
import { useChat } from "../context/ChatContext";
import { DEFAULT_WEEKDAYS, SenderStatus } from "../config/constants";
import {
  handleDateChange,
  handleWeekdayChange,
  handleFileUpload,
  handleDeleteFile,
  handleSenderChange,
  selectAllWeekdays,
  deselectAllWeekdays,
  handleMinPercentageChange,
} from "../utils/chatUtils";

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    darkMode,
    toggleDarkMode,
    metadata,
    setOriginalMessages,
    setMetadata,
    tempFilters,
    setTempFilters,
    resetFilters,
    applyFilters,
    senderDropdownOpen,
    setSenderDropdownOpen,
    isPanelOpen,
    setIsPanelOpen,
    isInfoOpen,
    setIsInfoOpen,
    filteredMessages,
  } = useChat();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSenderDropdownOpen]);

  const toggleCollapse = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  };

  const senders = metadata ? Object.keys(metadata.senders) : [];

  return (
    <div className="w-full mx-auto space-y-4 rounded-none">
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        darkMode={darkMode}
      />
      {/* Header */}
      <div className="flex items-center h-8 rounded-none">
        <button
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className={`px-2 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white"
              : "bg-white text-black border-black"
          }`}
        >
          <Info size={20} />
        </button>
        <div className="flex-grow text-center text-2xl font-semibold">
          Whatsapp Dashboard
        </div>
        <button
          onClick={toggleDarkMode}
          className={`px-2 py-1 mr-4 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white"
              : "bg-white text-black border-black"
          }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={toggleCollapse}
          className={`px-2 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white"
              : "bg-white text-black border-black"
          }`}
        >
          {isPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Main Area */}
      <div
        className={`mt-0 border rounded-none p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 ${
          darkMode
            ? "bg-gray-800 text-white border-white"
            : "bg-white text-black border-black"
        }`}
      >
        {/* File Upload */}
        <div className="flex pr-2 items-center rounded-none justify-between">
          <label
            htmlFor="file-upload"
            className={`cursor-pointer px-4 py-2 border rounded-none ${
              metadata?.fileName ? "" : "w-full text-center"
            } ${
              darkMode
                ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                : "bg-white text-black border-black hover:bg-gray-200"
            }  dark:hover:bg-gray-600 transition-all`}
          >
            Select File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            className="hidden"
            ref={fileInputRef}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFileUpload(
                e,
                setOriginalMessages,
                setMetadata,
                setIsPanelOpen
              )
            }
          />

          {metadata?.fileName && (
            <span className="text-sm ml-4 rounded-none">
              {metadata.fileName}
            </span>
          )}

          {metadata?.fileName && (
            <button
              onClick={() =>
                handleDeleteFile(
                  setOriginalMessages,
                  setMetadata,
                  setTempFilters,
                  fileInputRef
                )
              }
              className={`px-3 py-2 h-full border rounded-none hover:border-current ${
                darkMode
                  ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                  : "bg-white text-black border-black hover:bg-gray-200"
              } ml-2`}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* File Delete */}

        {metadata?.fileName && (
          <div className="flex pl-2 gap-4 rounded-none">
            <button
              onClick={resetFilters}
              className={`flex-1 py-2 border rounded-none hover:border-current  ${
                darkMode
                  ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                  : "bg-white text-black border-black hover:bg-gray-200"
              }`}
            >
              Reset
            </button>
            <button
              onClick={() => {
                applyFilters();
                setSenderDropdownOpen(false);
                setIsPanelOpen(false);
              }}
              className={`flex-1 py-2 border rounded-none hover:border-current ${
                darkMode
                  ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                  : "bg-white text-black border-black hover:bg-gray-200"
              }`}
            >
              Apply
            </button>
          </div>
        )}

        {isPanelOpen && metadata?.fileName && (
          <>
            {/* Sender Filter */}
            <div className="flex flex-col pr-2 space-y-2 rounded-none">
              <label className="text-md font-semibold rounded-none">
                Select Senders:
              </label>
              <div className="relative rounded-none" ref={dropdownRef}>
                <button
                  onClick={() => setSenderDropdownOpen((prev) => !prev)}
                  className={`w-full px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? "bg-gray-700 text-white border-white"
                      : "bg-white text-black border-black"
                  }`}
                >
                  <span>Select Senders</span>
                  <ChevronDown size={16} />
                </button>
                {senderDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full border rounded-none ${
                      darkMode
                        ? "bg-gray-700 text-white border-white"
                        : "bg-white text-black border-black"
                    }`}
                  >
                    <div
                      className="max-h-60 overflow-auto rounded-none"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {senders.map((sender) => {
                        const status = tempFilters.senderStatuses[sender];
                        const disabled = status === SenderStatus.LOCKED;
                        const checked = status === SenderStatus.ACTIVE;
                        return (
                          <label
                            key={sender}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`flex items-center px-4 py-2 cursor-pointer rounded-none ${
                              disabled
                                ? "opacity-50 cursor-not-allowed"
                                : darkMode
                                ? "hover:bg-gray-800"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleSenderChange(e, sender, setTempFilters)
                              }
                              className="mr-2 rounded-none"
                            />
                            {sender}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Minimum Message Share Input */}
            <div className="flex pl-2 flex-col rounded-none">
              <label className="text-md font-semibold rounded-none">
                Minimum Message Share (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempFilters.minPercentagePerSender}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleMinPercentageChange(e, setTempFilters)
                }
                className={`mt-2 p-2 border rounded-none ${
                  darkMode ? "border-white bg-gray-700" : "border-black"
                }`}
              />
            </div>

            {/* Date Selection */}
            <div className="flex flex-col rounded-none pr-2">
              <style>
                {`
                  .react-datepicker-wrapper {
                    width: 100%;
                  }
                `}
              </style>
              <label className="text-md font-semibold rounded-none">
                Select Date:
              </label>
              <div className="mt-2 flex flex-col md:flex-row gap-4 rounded-none">
                <DatePicker
                  selected={tempFilters.startDate}
                  onChange={(date: Date | null) =>
                    handleDateChange(date, "startDate", setTempFilters)
                  }
                  selectsStart
                  startDate={tempFilters.startDate}
                  endDate={tempFilters.endDate}
                  className={`p-2 border rounded-none flex-1 w-full ${
                    darkMode ? "border-white bg-gray-700" : "border-black"
                  }`}
                  minDate={metadata?.firstMessageDate}
                  maxDate={
                    tempFilters.endDate
                      ? tempFilters.endDate
                      : metadata?.lastMessageDate
                  }
                />
                <DatePicker
                  selected={tempFilters.endDate}
                  onChange={(date: Date | null) =>
                    handleDateChange(date, "endDate", setTempFilters)
                  }
                  selectsEnd
                  startDate={tempFilters.startDate}
                  endDate={tempFilters.endDate}
                  className={`p-2 border rounded-none flex-1 w-full ${
                    darkMode ? "border-white bg-gray-700" : "border-black"
                  }`}
                  minDate={
                    tempFilters.startDate
                      ? tempFilters.startDate
                      : metadata?.firstMessageDate
                  }
                  maxDate={metadata?.lastMessageDate}
                />
              </div>
            </div>

            {/* Weekday Selection */}
            <div className="flex pl-2 flex-col rounded-none">
              <label className="text-md font-semibold rounded-none">
                Select Weekdays:
              </label>
              <div className="flex mt-2 flex-wrap gap-4 rounded-none">
                {DEFAULT_WEEKDAYS.map((day) => (
                  <label key={day} className="flex items-center rounded-none">
                    <input
                      type="checkbox"
                      checked={tempFilters.selectedWeekdays.includes(day)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleWeekdayChange(e, day, setTempFilters)
                      }
                      className="h-5 w-5 text-blue-600 rounded-none"
                    />
                    <span className="text-sm ml-1 rounded-none">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
