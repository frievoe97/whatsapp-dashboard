import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Info, ChevronDown, ChevronUp, Moon, Sun, Trash2 } from "lucide-react";
import InfoModal from "./InfoModal";
import "./FileUpload.css";
import { useChat } from "../context/ChatContext";
import {
  useFileUploadLogic,
  DEFAULT_WEEKDAYS,
} from "../hooks/useFileUploadLogic";

/**
 * Props for the FileUploadMobile component.
 */
interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

/**
 * FileUploadMobile
 *
 * Mobile-Variante des File-Upload-Components. Bietet ein
 * ausklappbares Panel für Datei‑Auswahl, Löschen und Filterung.
 *
 * @param onFileUpload Callback, der beim Upload einer Datei aufgerufen wird.
 */
const FileUploadMobile: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const {
    darkMode,
    fileName,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    manualSenderSelection,
    toggleDarkMode,
    selectedWeekdays,
    isPanelOpen,
    setIsPanelOpen,
  } = useChat();

  const [hasFileBeenSet, setHasFileBeenSet] = useState<boolean>(false);

  const {
    tempMinMessagePercentage,
    setTempMinMessagePercentage,
    senders,
    handleFileChange,
    handleDeleteFile,
    handleSenderChange,
    handleWeekdayChange,
    handleApplyFilters,
    handleResetFilters,
    isInfoOpen,
    setIsInfoOpen,
  } = useFileUploadLogic(onFileUpload);

  // Innerhalb der FileUploadMobile-Komponente (oberhalb der Rückgabe):
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);

  // Automatisch das Panel einklappen, wenn eine Datei gesetzt wurde.
  useEffect(() => {
    if (fileName !== "" && !hasFileBeenSet) {
      setHasFileBeenSet(true);
    }
    if (fileName === "") {
      setHasFileBeenSet(false);
    }
  }, [fileName, hasFileBeenSet]);

  // Deaktiviere das Scrollen, wenn das Info-Modal geöffnet ist.
  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? "hidden" : "";
  }, [isInfoOpen]);

  const toggleExpanded = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  };

  const borderColor = darkMode ? "border-white" : "border-black";
  const textColor = darkMode ? "text-white" : "text-black";
  const bgColor = darkMode ? "bg-[#1f2937]" : "bg-white";
  const activeColor = darkMode ? "active:bg-gray-600" : "active:bg-gray-300";
  const senderSelected = darkMode ? "bg-gray-500" : "bg-gray-200";

  /** Header section with info, title, dark mode and expand/collapse toggle. */
  const HeaderSection: React.FC = () => (
    <div className="flex items-center h-8">
      <button
        onClick={() => setIsInfoOpen(true)}
        className={`px-2 py-1 border rounded-none flex items-center ${borderColor} ${bgColor} ${textColor}`}
      >
        <Info size={16} />
      </button>
      <div className="flex-grow text-center text-lg font-semibold">
        Whatsapp Dashboard
      </div>
      <button
        onClick={toggleDarkMode}
        className={`px-2 py-1 mr-4 border rounded-none flex items-center ${borderColor} ${bgColor} ${textColor}`}
      >
        {darkMode ? (
          <Sun size={16} className="text-white" />
        ) : (
          <Moon size={16} className="text-black" />
        )}
      </button>
      <button
        onClick={toggleExpanded}
        className={`px-2 py-1 border rounded-none flex items-center ${borderColor} ${bgColor} ${textColor}`}
      >
        {isPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );

  /** File upload section with file input and delete button. */
  const FileUploadSection: React.FC = () => (
    <div className="w-full flex flex-row items-center justify-between">
      <div className={`flex flex-row items-center ${fileName ? "" : "w-full"}`}>
        <label
          htmlFor="file-upload"
          className={`cursor-pointer px-4 py-1 md:py-2 border ${
            fileName ? "" : "w-full text-center"
          } ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block ${bgColor} ${textColor} ${borderColor}`}
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
            <span className={textColor}>{fileName}</span>
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
              className={darkMode ? "text-white" : "text-black"}
            />
          </button>
        )}
      </div>
    </div>
  );

  console.log("manualSenderSelection", manualSenderSelection);

  /** Filter section with sender selection, date pickers, numeric input and weekday checkboxes. */
  const FilterSection: React.FC = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
          Select Sender
        </h3>
        <div className="relative">
          <button
            onClick={() => setSenderDropdownOpen((prev) => !prev)}
            className={`w-full px-4 py-2 border rounded-none flex justify-between items-center ${borderColor} ${bgColor} ${textColor} hover:${borderColor} focus:outline-none`}
          >
            <span>Select Sender</span>
            <ChevronDown size={16} />
          </button>
          {senderDropdownOpen && (
            <div
              className={`absolute z-10 mt-1 w-full rounded-none  ${
                darkMode
                  ? "bg-gray-800 border border-white"
                  : "bg-white border border-black"
              }`}
            >
              <div
                className={`max-h-60 overflow-auto ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {senders.map((sender) => {
                  const isChecked =
                    typeof manualSenderSelection[sender] !== "undefined"
                      ? manualSenderSelection[sender]
                      : true;
                  return (
                    <label
                      key={sender}
                      className={`flex items-center px-4 py-2 cursor-pointer hover:${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={isChecked}
                        onChange={() => handleSenderChange(sender)}
                      />
                      <span>{sender}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
          } w-full ${bgColor} ${textColor}`}
        />
      </div>
      <div>
        <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
          Select Weekdays
        </h3>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_WEEKDAYS.map((day) => (
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
      <div className="flex gap-2">
        <button
          onClick={handleResetFilters}
          className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} ${activeColor} border focus:outline-none`}
        >
          Reset
        </button>
        <button
          onClick={() => {
            handleApplyFilters();
            setSenderDropdownOpen(false);
          }}
          className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} ${activeColor} border focus:outline-none`}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`p-4 min-h-fit flex flex-col space-y-4 ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border`}
    >
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        darkMode={darkMode}
      />
      <HeaderSection />
      {isPanelOpen && (
        <>
          <FileUploadSection />
          {fileName && <FilterSection />}
        </>
      )}
    </div>
  );
};

export default FileUploadMobile;
