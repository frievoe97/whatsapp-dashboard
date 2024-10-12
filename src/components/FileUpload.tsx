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
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([
    "So",
    "Mo",
    "Di",
    "Mi",
    "Do",
    "Fr",
    "Sa",
  ]);

  const [applyFilters, setApplyFilters] = useState(false);

  const senders = useMemo(() => {
    const uniqueSenders = Array.from(
      new Set(messages.map((msg) => msg.sender))
    );
    return uniqueSenders;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
    }
  }, [messages, senders]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      onFileUpload(file);

      // Setze alle Einstellungen zurück
      setSelectedSender([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays(["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]);
      setApplyFilters(false);

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
            setMessages([]);
            const parsedMessages = event.data;
            setMessages(parsedMessages);
            worker.terminate();
            setIsUploading(false); // Upload fertig
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
    setSelectedWeekdays(["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]);

  const handleDeselectAllWeekdays = () => setSelectedWeekdays([]);

  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays(["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]);
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
    setIsUploading(false); // Reset Upload-Status
  };

  useEffect(() => {
    if (applyFilters) {
      const filteredMessages = messages.map((msg) => {
        const messageDate = new Date(msg.date);
        const messageDay = messageDate.toLocaleString("de-DE", {
          weekday: "short",
        });

        const isWithinDateRange =
          (!startDate || messageDate >= startDate) &&
          (!endDate || messageDate <= endDate);
        const isSenderSelected =
          selectedSender.length === 0 || selectedSender.includes(msg.sender);
        const isWeekdaySelected = selectedWeekdays.includes(messageDay);

        const isUsed =
          isWithinDateRange && isSenderSelected && isWeekdaySelected;
        return { ...msg, isUsed };
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
    setMessages,
  ]);

  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  return (
    <div
      className={`border-[1px] p-2 file-upload flex flex-col md:flex-row space-y-2 sm:flex-wrap sm:space-y-0 sm:space-x-4 ${
        darkMode
          ? "border-white bg-gray-800 text-white"
          : "border-black bg-white text-black"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <input
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className={`text-sm px-2 py-1 w-full sm:w-auto border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        />
        <button
          onClick={handleDeleteFile}
          className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          Delete File
        </button>
      </div>

      <div className="flex flex-col md:flex-row sm:flex-wrap items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <label className="text-sm">Sender:</label>
        <div className="flex flex-wrap gap-1">
          {senders.map((sender) => (
            <button
              key={sender}
              onClick={() => handleSenderChange(sender)}
              className={`px-2 py-1 text-sm border-[1px] ${
                selectedSender.includes(sender)
                  ? darkMode
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : darkMode
                  ? "border-white text-white"
                  : "border-black text-black"
              }`}
            >
              {sender}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <label className="text-sm">Start Date:</label>
        <DatePicker
          selected={startDate}
          onChange={(date: Date | null) => setStartDate(date || undefined)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          className={`p-1 w-full sm:w-auto border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        />
        <DatePicker
          selected={endDate}
          onChange={(date: Date | null) => setEndDate(date || undefined)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          className={`p-1 w-full sm:w-auto border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <label className="text-sm">Weekdays:</label>
        <div className="flex flex-wrap space-x-1">
          {weekdays.map((day) => (
            <label key={day} className="flex items-center space-x-1">
              <input
                type="checkbox"
                value={day}
                checked={selectedWeekdays.includes(day)}
                onChange={handleWeekdayChange}
                className={`form-checkbox h-4 w-4 ${
                  darkMode
                    ? "text-white border-white"
                    : "text-black border-black"
                }`}
              />
              <span
                className={`text-sm ${darkMode ? "text-white" : "text-black"}`}
              >
                {day}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          onClick={handleSelectAllWeekdays}
          className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          Select All
        </button>
        <button
          onClick={handleDeselectAllWeekdays}
          className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          Deselect All
        </button>
        <button
          onClick={handleResetFilters}
          className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          Reset
        </button>
        <button
          onClick={handleApplyFilters}
          className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
            darkMode
              ? "border-white bg-gray-700 text-white"
              : "border-black bg-white text-black"
          }`}
        >
          Apply
        </button>
      </div>

      {/* Dark Mode Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className={`px-4 py-1 text-sm w-full sm:w-auto rounded-none border-[1px] ${
          darkMode
            ? "border-white bg-gray-700 text-white"
            : "border-black bg-white text-black"
        }`}
      >
        Toggle {darkMode ? "Light" : "Dark"} Mode
      </button>
    </div>
  );
};

export default FileUpload;
