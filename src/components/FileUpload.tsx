import React, { ChangeEvent, useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface FileUploadProps {
  onFileUpload: (uploadedFile: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const { messages, setMessages, setIsUploading, darkMode, toggleDarkMode } =
    useChat();

  const [selectedSender, setSelectedSender] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);

  const [applyFilters, setApplyFilters] = useState(false);

  const senders = useMemo(() => {
    const uniqueSenders = Array.from(
      new Set(messages.map((msg) => msg.sender))
    );
    return uniqueSenders;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
      setIsInitialLoad(false); // Initialisierung abgeschlossen
    }
    // Abhängigkeiten: messages und senders
  }, [messages, senders, isInitialLoad]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      if (file) {
        setFileName(file.name);
      } else {
        setFileName("");
      }

      onFileUpload(file);

      // Reset all settings
      setSelectedSender([]); // Temporäres Leeren der Sender
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      setApplyFilters(false);
      setIsInitialLoad(true); // Initialisierungsflag setzen

      setIsUploading(true); // Upload startet

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
            setIsUploading(false); // Upload beendet
          };
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev) =>
      prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender]
    );
  };

  const handleWeekdayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  const handleApplyFilters = () => setApplyFilters(true);

  const handleSelectAllWeekdays = () =>
    setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

  const handleDeselectAllWeekdays = () => setSelectedWeekdays([]);

  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  const handleDeleteFile = () => {
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false); // Reset upload status
  };

  useEffect(() => {
    if (applyFilters) {
      console.log("Applying filters...");
      console.log("Sender:", selectedSender);
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

        const isUsed =
          isWithinDateRange && isSenderSelected && isWeekdaySelected;
        return { ...msg, isUsed };
      });

      setMessages(filteredMessages);
      setApplyFilters(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyFilters,
    startDate,
    endDate,
    selectedSender,
    selectedWeekdays,
    setMessages,
  ]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className={`border ${
        darkMode ? "border-white" : "border-black"
      } p-4 file-upload grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
      }`}
    >
      {/* a) File Upload + Delete File */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row space-x-2">
          <div className="w-full flex flew-row">
            <label
              htmlFor="file-upload"
              className={`cursor-pointer text-sm px-4 py-2 border ${
                darkMode
                  ? "border-white bg-gray-700 text-white"
                  : "border-black bg-white text-black"
              } hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block`}
            >
              Datei auswählen
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {/* Anzeige des Dateinamens */}
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

          <button
            onClick={handleDeleteFile}
            className={`px-4 py-1 text-sm rounded-none border ${
              darkMode
                ? "border-white hover:border-white"
                : "border-black hover:border-black"
            } w-full ${
              darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
            }`}
          >
            Delete File
          </button>
        </div>
      </div>

      {/* f) Dark Mode Toggle */}
      <div className="flex flex-col space-y-2 md:justify-end">
        <button
          onClick={toggleDarkMode}
          className={`px-4 py-1 h-full text-sm rounded-none border ${
            darkMode
              ? "border-white hover:border-white"
              : "border-black hover:border-black"
          } w-full ${
            darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
          }`}
        >
          Switch to {darkMode ? "Light" : "Dark"} Mode
        </button>
      </div>

      {/* Render rest of the filters only if messages.length > 0 */}
      {messages.length > 0 && (
        <>
          {/* b) Select Senders */}
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
                      ? "text-white "
                      : "text-black "
                  }`}
                >
                  {sender}
                </button>
              ))}
            </div>
          </div>

          {/* c) Select Start and End Date */}
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
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
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
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* d) Select Weekdays, Select All, Deselect All */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-md font-semibold">Select Weekdays:</h3>
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex flex-wrap gap-0">
                {weekdays.map((day) => (
                  <label
                    key={day}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    {/* Versteckte native Checkbox */}
                    <input
                      type="checkbox"
                      value={day}
                      checked={selectedWeekdays.includes(day)}
                      onChange={handleWeekdayChange}
                      className="hidden"
                    />

                    {/* Benutzerdefinierte Checkbox */}
                    <span
                      className={`flex items-center justify-center w-4 h-4 border ${
                        darkMode ? "border-white" : "border-black"
                      } rounded-none relative`}
                    >
                      {/* Haken-SVG */}
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

                    {/* Label-Text */}
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
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } w-auto ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllWeekdays}
                  className={`px-3 py-1 text-sm border ${
                    darkMode
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } rounded-none w-auto ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* e) Reset and Apply */}
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 mt-auto">
            <button
              onClick={handleResetFilters}
              className={`px-4 py-2 text-sm border ${
                darkMode
                  ? "border-white hover:border-white"
                  : "border-black hover:border-black"
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
                  ? "border-white hover:border-white"
                  : "border-black hover:border-black"
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
  );
};

export default FileUpload;
