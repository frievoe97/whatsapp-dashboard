import React, { ChangeEvent, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Info, ChevronDown, ChevronUp, Moon, Sun, Trash2 } from "lucide-react";
import InfoModal from "./InfoModal";
import { useChat } from "../context/ChatContext";
import { DEFAULT_WEEKDAYS, SenderStatus } from "../config/constants";
import {
  handleDateChange,
  handleMinPercentageChange,
  handleWeekdayChange,
  handleSenderChange,
  selectAllWeekdays,
  deselectAllWeekdays,
  handleFileUpload,
  handleDeleteFile,
} from "../utils/chatUtils";

const FileUploadMobile: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderDropdownRef = useRef<HTMLDivElement>(null);
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
  } = useChat();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        senderDropdownRef.current &&
        !senderDropdownRef.current.contains(event.target as Node)
      ) {
        setSenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSenderDropdownOpen]);

  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? "hidden" : "";
  }, [isInfoOpen]);

  const toggleExpanded = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  };

  const senders = metadata ? Object.keys(metadata.senders) : [];

  const truncateString = (str: string, n: number): string => {
    return str.length > n ? str.substring(0, n - 3) + "..." : str;
  };

  return (
    <div
      className={`p-4 min-h-fit flex flex-col space-y-4 rounded-none ${
        darkMode
          ? "bg-[#1f2937] text-white border border-white"
          : "bg-white text-black border border-black"
      }`}
    >
      {/* Header */}
      <div className="flex items-center h-8 rounded-none">
        <button
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className={`px-1 py-1 border  rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white hover:bg-gray-800"
              : "bg-white text-black border-black hover:bg-gray-200"
          }`}
        >
          <Info size={16} />
        </button>
        <div className="flex-grow text-center text-lg font-semibold">
          Whatsapp Dashboard
        </div>

        <button
          onClick={toggleDarkMode}
          className={`px-1 py-1 border mr-2 rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white hover:bg-gray-800"
              : "bg-white text-black border-black hover:bg-gray-200"
          }`}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={toggleExpanded}
          className={`px-1 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? "bg-gray-700 text-white border-white hover:bg-gray-800"
              : "bg-white text-black border-black hover:bg-gray-200"
          }`}
        >
          {isPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        darkMode={darkMode}
      />

      {isPanelOpen && (
        <>
          {/* File Upload Section */}
          <div className="w-full flex items-center justify-between rounded-none">
            <label
              htmlFor="file-upload-mobile"
              className={`whitespace-nowrap cursor-pointer px-4 py-2 border rounded-none ${
                metadata?.fileName ? "" : "w-full text-center"
              } ${
                darkMode
                  ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                  : "bg-white text-black border-black hover:bg-gray-200"
              } dark:hover:bg-gray-600 transition-all`}
            >
              Select File
            </label>
            <input
              id="file-upload-mobile"
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
              <>
                <span className="w-full text-sm ml-2 rounded-none">
                  {truncateString(metadata.fileName, 18)}
                </span>

                <button
                  onClick={() =>
                    handleDeleteFile(
                      setOriginalMessages,
                      setMetadata,
                      setTempFilters,
                      fileInputRef
                    )
                  }
                  className={`px-2 py-2 border rounded-none hover:border-current ${
                    darkMode
                      ? "bg-gray-700 text-white border-white"
                      : "bg-white text-black border-black"
                  } ml-2`}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>

          {/* Filter Section */}
          {metadata?.fileName && (
            <div className="space-y-4 rounded-none">
              {/* Sender Filter */}
              <div className="relative rounded-none" ref={senderDropdownRef}>
                <button
                  onClick={() => setSenderDropdownOpen((prev) => !prev)}
                  className={`w-full px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                      : "bg-white text-black border-black hover:bg-gray-200"
                  }`}
                >
                  <span>Select Senders</span>
                  <ChevronDown size={16} />
                </button>
                {senderDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full border rounded-none ${
                      darkMode
                        ? "text-white border-white bg-gray-700 "
                        : "text-black border-black bg-gray-200 "
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

              {/* Minimum Message Share Input */}
              <div className="flex flex-col rounded-none">
                <label className="text-sm rounded-none">
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
                  className={`p-2 border rounded-none ${
                    darkMode
                      ? "border-white bg-gray-700 hover:bg-gray-800"
                      : "border-black bg-gray-200 hover:bg-gray-100"
                  }`}
                />
              </div>

              {/* Date Selection */}
              <div className="flex flex-row rounded-none gap-2">
                <div className="flex flex-col flex-1">
                  <label className="text-sm rounded-none">Start Date:</label>
                  <DatePicker
                    selected={tempFilters.startDate}
                    onChange={(date: Date | null) =>
                      handleDateChange(date, "startDate", setTempFilters)
                    }
                    selectsStart
                    startDate={tempFilters.startDate}
                    endDate={tempFilters.endDate}
                    className={`w-full p-2 border rounded-none ${
                      darkMode
                        ? "border-white bg-gray-700 hover:bg-gray-800"
                        : "border-black bg-gray-200 hover:bg-gray-100"
                    }`}
                    minDate={metadata?.firstMessageDate}
                    maxDate={
                      tempFilters.endDate
                        ? tempFilters.endDate
                        : metadata?.lastMessageDate
                    }
                  />
                </div>

                <div className="flex flex-col flex-1">
                  <label className="text-sm rounded-none">End Date:</label>
                  <DatePicker
                    selected={tempFilters.endDate}
                    onChange={(date: Date | null) =>
                      handleDateChange(date, "endDate", setTempFilters)
                    }
                    selectsEnd
                    startDate={tempFilters.startDate}
                    endDate={tempFilters.endDate}
                    className={`w-full p-2 border rounded-none ${
                      darkMode
                        ? "border-white bg-gray-700 hover:bg-gray-800"
                        : "border-black bg-gray-200 hover:bg-gray-100"
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
              <div className="flex flex-col rounded-none">
                <label className="text-sm rounded-none">Select Weekdays:</label>
                <div className="flex flex-wrap gap-2 rounded-none">
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
                <div className="flex space-x-2 mt-2 rounded-none"></div>
              </div>

              {/* Reset & Apply Buttons */}
              <div className="flex gap-2 rounded-none ">
                <button
                  onClick={resetFilters}
                  className={`text-sm py-2 flex-1 border rounded-none hover:border-current ${
                    darkMode
                      ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                      : "bg-white text-black border-black hover:bg-gray-100"
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
                  className={`text-sm py-2 flex-1 border rounded-none hover:border-current ${
                    darkMode
                      ? "bg-gray-700 text-white border-white hover:bg-gray-800"
                      : "bg-white text-black border-black hover:bg-gray-100"
                  }`}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileUploadMobile;
