import React, { ChangeEvent, useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// import jsPDF from "jspdf";
import "./FileUpload.css";
import { ChevronDown, ChevronUp, Info, Moon, Sun } from "lucide-react";
import FilterWorker from "../workers/filterMessages.worker?worker";
import { franc } from "franc-min";

interface FileUploadProps {
  onFileUpload: (uploadedFile: File) => void;
}

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
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
  } = useChat();

  const [tempMinMessagePercentage, setTempMinMessagePercentage] =
    useState(minMessagePercentage);

  // const [selectedSender, setSelectedSender] = useState<string[]>([]);
  // const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  // const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  // const [fileName, setFileName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFileSet, setIsFileSet] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  };

  const [applyFilters, setApplyFilters] = useState(false);

  const senders = useMemo(() => {
    const uniqueSenders = Array.from(
      new Set(messages.map((msg) => msg.sender))
    );
    return uniqueSenders;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const allText = messages.map((msg) => msg.message).join(" ");
      const detectedLanguage = franc(allText, { minLength: 3 });
      console.log(`Erkannte Sprache für alle Nachrichten: ${detectedLanguage}`);
    }
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
        setIsFileSet(true);
        setIsCollapsed(true);
      } else {
        setFileName("");
        setIsFileSet(false);
        setIsCollapsed(false);
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

      // WICHTIG: Input zurücksetzen, damit bei erneutem Upload der onChange-Event ausgelöst wird
      event.target.value = "";
    }
  };

  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev: string[]) => {
      return prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender];
    });
  };

  const handleWeekdayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  const handleApplyFilters = () => {
    setMinMessagePercentage(tempMinMessagePercentage); // Speichern des Werts beim Anwenden
    setApplyFilters(true);
    setIsCollapsed(true);
  };

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
    setFileName("");
    setIsFileSet(false);
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false); // Reset upload status
  };

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
          if (event.data.length > 0) {
            const allText = event.data.map((msg) => msg.message).join(" ");
            const detectedLanguage = franc(allText, { minLength: 3 });
            console.log(
              `Erkannte Sprache für alle Nachrichten: ${detectedLanguage}`
            );
          }

          setMessages(event.data);
          setApplyFilters(false);
          worker.terminate();
        };
      } else {
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
    startDate,
    endDate,
    selectedSender,
    selectedWeekdays,
    messages,
    setMessages,
  ]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const borderColor = darkMode ? "border-white" : "border-black";
  const textColor = darkMode ? "text-white" : "text-black";
  const bgColor = darkMode ? "bg-gray-700" : "bg-[#ffffff]";

  return (
    <div className="file-upload-wrapper">
      {isInfoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div
            className={`p-6 rounded-none shadow-lg max-w-md w-full ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            }`}
          >
            <h2 className="text-lg font-semibold mb-8">Info & Disclaimer</h2>

            <p className=" mb-3">
              This tool <strong>does not store any data on a server</strong>.
              All information remains only in your browser. No messages or
              statistics are uploaded.
            </p>

            <p className=" mb-3">
              This project is <strong>Open Source</strong>, and the entire
              source code is publicly available on{" "}
              <a
                href="https://github.com/frievoe97/whatsapp-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className={`no-underline ${
                  darkMode ? "text-white" : "text-black"
                } hover:text-inherit`}
              >
                GitHub
              </a>
              .
            </p>

            <p className="">
              This project is licensed under the <strong>MIT License</strong>,
              one of the most open and permissive licenses available. This means
              you are <strong>free to use, modify, and distribute</strong> the
              code, as long as the license is included.
            </p>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsInfoOpen(false)} // Close modal
                className={`px-4 py-2 border rounded-none 
            ${
              darkMode
                ? "border-white hover:border-gray-300 active:bg-gray-600"
                : "border-black hover:border-gray-700 active:bg-gray-300"
            } 
            ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button oben */}

      <div className="flex items-center h-8">
        {/* Info-Button (links) */}
        <button
          onClick={() => setIsInfoOpen(true)} // Modal öffnen
          className={`px-2 py-1 border rounded-none flex items-center 
    ${
      darkMode
        ? "border-white hover:border-white active:bg-gray-600"
        : "border-black hover:border-black active:bg-gray-300"
    } 
    ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
        >
          <Info size={20} />
        </button>

        {/* Titel in der Mitte */}
        <div className="flex-grow text-center text-2xl font-semibold">
          Whatsapp Dashboard
        </div>

        <div>
          <button
            onClick={toggleDarkMode}
            className={`px-2 py-1 mr-4 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
          >
            {darkMode ? (
              <Sun size={20} className="text-white " />
            ) : (
              <Moon size={20} className="text-black " />
            )}
          </button>
        </div>
        {/* Collapse-Button (rechts) */}
        <button
          onClick={toggleCollapse}
          className={`px-2 py-1 border rounded-none flex items-center 
      ${
        darkMode
          ? "border-white hover:border-white active:bg-gray-600"
          : "border-black hover:border-black active:bg-gray-300"
      } 
      ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* Der bisherige Parent-Div, bedingt gerendert */}
      {!isCollapsed && (
        <div
          className={`mt-4 border ${
            darkMode ? "border-white" : "border-black"
          } p-4 file-upload grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
          }`}
        >
          {/* ... Hier bleibt dein bisheriger Inhalt unverändert ... */}

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
            </div>
          </div>

          {/* f) Dark Mode Toggle */}
          <div className="flex flex-col space-y-2 md:justify-end">
            {isFileSet && (
              <button
                onClick={handleDeleteFile}
                className={`px-4 py-2 text-sm rounded-none border ${
                  darkMode
                    ? "border-white hover:border-white active:bg-gray-600"
                    : "border-black hover:border-black active:bg-gray-300"
                } w-full ${
                  darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
                }`}
              >
                Delete File
              </button>
            )}
          </div>

          {/* Restliche Filter etc. (b, c, d, e) */}
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

              {/* e) Reset and Apply */}
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

              {/* g) Export to PDF (auskommentiert) */}
              {/* <button
                onClick={exportToPDF}
                className={`px-4 py-1 h-full text-sm rounded-none border ${
                  darkMode
                    ? "border-white hover:border-white"
                    : "border-black hover:border-black"
                } w-full ${
                  darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
                }`}
              >
                Export Plot as PNG
              </button> */}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
