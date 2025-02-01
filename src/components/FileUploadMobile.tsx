// File: src/components/FileUploadMobile.tsx
import React, { ChangeEvent, useState, useEffect, useMemo } from "react";
import { useChat } from "../context/ChatContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./FileUpload.css"; // Falls du noch weitere CSS-Anpassungen hast
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface FileUploadProps {
  onFileUpload: (uploadedFile: File) => void;
}

const FileUploadMobile: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const { messages, setMessages, setIsUploading, darkMode, toggleDarkMode } =
    useChat();

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
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

  // Berechne eindeutige Sender aus den Nachrichten
  const senders = useMemo(() => {
    return Array.from(new Set(messages.map((msg) => msg.sender)));
  }, [messages]);

  useEffect(() => {
    if (isInfoOpen) {
      document.body.style.overflow = "hidden"; // Scrollen deaktivieren
    } else {
      document.body.style.overflow = ""; // Standard wiederherstellen
    }
  }, [isInfoOpen]);

  // Bei initialem Laden: Filter initialisieren
  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
      setIsInitialLoad(false);
    }
  }, [messages, senders, isInitialLoad]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      setFileName(file.name);
      onFileUpload(file);

      // Filter und Einstellungen zurücksetzen
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
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
          };
        }
      };
      reader.readAsText(file, "UTF-8");

      // Damit der onChange-Event auch beim erneuten Upload ausgelöst wird
      event.target.value = "";
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
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false);
  };

  useEffect(() => {
    if (applyFilters) {
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

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  // Festlegen der Farben basierend auf darkMode
  const borderColor = darkMode ? "border-white" : "border-black";
  const textColor = darkMode ? "text-white" : "text-black";
  const bgColor = darkMode ? "bg-[#1f2937]" : "bg-[#ffffff]";

  return (
    <div
      className={`p-4 min-h-fit flex flex-col space-y-4 ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border`}
    >
      {isInfoOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div
            className={`p-6 rounded-none shadow-lg max-w-md w-full ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            }`}
          >
            <h2 className="text-lg font-semibold mb-8">Info & Disclaimer</h2>
            <p className="mb-3">
              This tool <strong>does not store any data on a server</strong>.
              All information remains only in your browser. No messages or
              statistics are uploaded.
            </p>
            <p className="mb-3">
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
            <p>
              This project is licensed under the <strong>MIT License</strong>,
              one of the most open and permissive licenses available. This means
              you are <strong>free to use, modify, and distribute</strong> the
              code, as long as the license is included.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsInfoOpen(false)}
                className={`px-4 py-2 border rounded-none ${
                  darkMode
                    ? "border-white hover:border-gray-300 bg-gray-700 text-white"
                    : "border-black hover:border-gray-700 bg-white text-black"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header-Bereich */}
      <div className="flex items-center h-8">
        {/* Info-Button (links) */}
        <button
          onClick={() => setIsInfoOpen(true)}
          className={`px-2 py-1 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
        >
          <Info size={20} />
        </button>

        {/* Titel in der Mitte */}
        <div className="flex-grow text-center text-lg font-semibold">
          Whatsapp Dashboard
        </div>

        {/* Collapse-Button (rechts) */}
        <button
          onClick={toggleExpanded}
          className={`px-2 py-1 border rounded-none flex items-center ${borderColor} hover:${borderColor} ${bgColor} ${textColor}`}
        >
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* Restlichen Inhalt nur anzeigen, wenn expanded */}
      {isExpanded && (
        <>
          {/* File Upload Bereich */}
          <div className="space-y-2">
            <label
              htmlFor="mobile-file-upload"
              className={`block text-sm font-medium ${textColor}`}
            >
              {fileName ? `Ausgewählt: ${fileName}` : "Select File"}
            </label>
            <input
              id="mobile-file-upload"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className={`block w-full rounded-none text-sm text-gray-500 ${borderColor} hover:${borderColor} border focus:outline-none`}
            />
            {fileName && (
              <button
                onClick={handleDeleteFile}
                className={`w-full py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
              >
                Datei löschen
              </button>
            )}
          </div>

          {/* Filter-Bereich */}
          {messages.length > 0 && (
            <div className="space-y-6">
              {/* Sender auswählen */}
              <div>
                <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
                  Sender auswählen
                </h3>
                <div className="flex flex-wrap gap-2">
                  {senders.map((sender) => (
                    <button
                      key={sender}
                      onClick={() => handleSenderChange(sender)}
                      className={`px-3 py-1 text-sm rounded-none ${borderColor} hover:${borderColor} border ${
                        selectedSender.includes(sender)
                          ? bgColor + " " + textColor
                          : ""
                      } focus:outline-none`}
                    >
                      {sender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datumsauswahl */}
              <div>
                <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
                  Zeitraum auswählen
                </h3>
                <div>
                  <label className={`text-sm block ${textColor}`}>
                    Startdatum:
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
                  <label className={`text-sm block ${textColor}`}>
                    Enddatum:
                  </label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) =>
                      setEndDate(date || undefined)
                    }
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    className={`mt-1 p-2 w-full rounded-none ${bgColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
                  />
                </div>
              </div>

              {/* Wochentage auswählen */}
              <div>
                <h3 className={`text-md font-semibold mb-2 ${textColor}`}>
                  Wochentage auswählen
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

              {/* Filter-Aktionen */}
              <div className="flex gap-2">
                <button
                  onClick={handleResetFilters}
                  className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
                >
                  Zurücksetzen
                </button>
                <button
                  onClick={handleApplyFilters}
                  className={`flex-1 py-2 rounded-none ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border focus:outline-none`}
                >
                  Anwenden
                </button>
              </div>
            </div>
          )}

          {/* Dark Mode Umschalter */}
          <div className="mt-auto">
            <button
              onClick={toggleDarkMode}
              className={`w-full py-2 ${bgColor} ${textColor} ${borderColor} hover:${borderColor} border rounded-none focus:outline-none`}
            >
              Switch to {darkMode ? "Light" : "Dark"} Mode
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUploadMobile;
