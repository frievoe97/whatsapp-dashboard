// src/components/FileUploadMobile.tsx
import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Info, ChevronDown, ChevronUp, Moon, Sun, Trash2 } from "lucide-react";
import { useChat } from "../context/ChatContext";
import { useChatProcessing } from "../hooks/useChatProcessing";
import InfoModal from "./InfoModal";

const FileUploadMobile: React.FC = () => {
  const {
    darkMode,
    fileName,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isPanelOpen,
    setIsPanelOpen,
  } = useChat();

  const { processFile } = useChatProcessing();
  const [hasFileBeenSet, setHasFileBeenSet] = useState<boolean>(false);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState<boolean>(false);
  const senderDropdownRef = useRef<HTMLDivElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = "";
  };

  const toggleExpanded = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  };

  useEffect(() => {
    if (fileName !== "" && !hasFileBeenSet) {
      setHasFileBeenSet(true);
    }
    if (fileName === "") {
      setHasFileBeenSet(false);
    }
  }, [fileName, hasFileBeenSet]);

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
  }, []);

  return (
    <div
      className={`p-4 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
      } border`}
    >
      <InfoModal
        isOpen={false}
        onClose={function (): void {
          throw new Error("Function not implemented.");
        }}
        darkMode={false}
      />
      {/* Header */}
      <div className="flex items-center justify-between h-8">
        <button
          onClick={() => {}}
          className="px-2 py-1 border rounded flex items-center"
        >
          <Info size={16} />
        </button>
        <div className="flex-grow text-center text-lg font-semibold">
          WhatsApp Dashboard
        </div>
        <button
          onClick={toggleExpanded}
          className="px-2 py-1 border rounded flex items-center"
        >
          {isPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isPanelOpen && (
        <>
          <div className="flex items-center justify-between mt-4">
            <label
              htmlFor="file-upload-mobile"
              className="cursor-pointer px-4 py-2 border rounded"
            >
              Select File
            </label>
            <input
              id="file-upload-mobile"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName && (
              <div className="flex items-center">
                <span className="text-sm ml-2">{fileName}</span>
                <button className="ml-2 p-1 border rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          {/* Beispiel: Datumsfilter */}
          <div className="mt-4">
            <h3 className="text-md font-semibold">Select Date Range</h3>
            <div className="flex space-x-2">
              <div>
                <label className="text-sm">Start:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date || undefined)}
                />
              </div>
              <div>
                <label className="text-sm">End:</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date || undefined)}
                  minDate={startDate}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUploadMobile;
