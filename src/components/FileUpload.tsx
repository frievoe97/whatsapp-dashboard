/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/**
 * @deprecated This file is deprecated and will be removed in the next version.
 */

import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ChevronDown, ChevronUp, Info, Moon, Sun } from 'lucide-react';
import InfoModal from './InfoModal';
import { useChat } from '../context/ChatContext';
import { useFileUploadLogic, DEFAULT_WEEKDAYS } from '../hooks/useFileUploadLogic';

import { useTranslation } from 'react-i18next';
import '../i18n';

/**
 * Props for the FileUpload (Desktop) component.
 */
interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

/**
 * FileUpload
 *
 * Desktop-Variante des File-Upload-Components. Neben der Datei‑Auswahl
 * bietet sie auch Filter (Sender, Datum, Wochentage, Mindestanteil) und
 * einen „Collapse“-Button zur Steuerung des Panels.
 *
 * @param onFileUpload Callback, der beim Upload einer Datei aufgerufen wird.
 */
const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
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
    setSelectedWeekdays,
    isPanelOpen,
    setIsPanelOpen,
    setManualSenderSelection,
    minMessagePercentage,
    originalMessages,
  } = useChat();

  const {
    tempMinMessagePercentage,
    setTempMinMessagePercentage,
    senders,
    handleFileChange,
    handleDeleteFile,
    handleWeekdayChange,
    handleApplyFilters,
    handleResetFilters,
    isInfoOpen,
    setIsInfoOpen,
  } = useFileUploadLogic(onFileUpload);

  const borderColor = darkMode ? 'border-white' : 'border-black';
  const textColor = darkMode ? 'text-white' : 'text-black';
  const bgColor = darkMode ? 'bg-gray-700' : 'bg-white';

  const toggleCollapse = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  };

  // Neuer lokaler State für das Öffnen/Schließen des Sender-Dropdowns:
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Schließt das Dropdown, wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { t } = useTranslation();

  return (
    <div className="file-upload-wrapper">
      {/* Information Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} darkMode={darkMode} />

      {/* Header: Info, Title, Dark Mode Toggle, Collapse Toggle */}
      <div className="flex items-center h-8">
        <button
          onClick={() => setIsInfoOpen(true)}
          className={`px-2 py-1 border rounded-none flex items-center ${
            darkMode
              ? 'border-white hover:border-white active:bg-gray-600'
              : 'border-black hover:border-black active:bg-gray-300'
          } ${bgColor} ${textColor}`}
        >
          <Info size={20} />
        </button>
        <div className="flex-grow text-center text-2xl font-semibold">Whatsapp Dashboard</div>
        <div>
          <button
            onClick={toggleDarkMode}
            className={`px-2 py-1 mr-4 border rounded-none flex items-center ${borderColor} ${bgColor} ${textColor}`}
          >
            {darkMode ? (
              <Sun size={20} className="text-white" />
            ) : (
              <Moon size={20} className="text-black" />
            )}
          </button>
        </div>
        <button
          onClick={toggleCollapse}
          className={`px-2 py-1 border rounded-none flex items-center ${
            darkMode
              ? 'border-white hover:border-white active:bg-gray-600'
              : 'border-black hover:border-black active:bg-gray-300'
          } ${bgColor} ${textColor}`}
        >
          {isPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Main Content: File Upload & Filter Controls */}
      {isPanelOpen && (
        <div
          className={`mt-4 border ${
            darkMode ? 'border-white' : 'border-black'
          } p-4 file-upload grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
          }`}
        >
          {/* File Upload Section */}
          <div className="flex flex-col space-y-2">
            <div className="flex flex-row space-x-2">
              <div className="w-full flex flex-row">
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer text-sm px-4 py-2 border ${
                    darkMode
                      ? 'border-white bg-gray-700 text-white'
                      : 'border-black bg-white text-black'
                  } hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block`}
                >
                  {t('FileUpload.selectFile')}
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
                    <span className={darkMode ? 'text-white' : 'text-black'}>{fileName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Deletion Section */}
          <div className="flex flex-col space-y-2 md:justify-end">
            {fileName && (
              <button
                onClick={handleDeleteFile}
                className={`px-4 py-2 text-sm rounded-none border ${
                  darkMode
                    ? 'border-white hover:border-white active:bg-gray-600'
                    : 'border-black hover:border-black active:bg-gray-300'
                } w-full ${bgColor} ${textColor}`}
              >
                Delete File
              </button>
            )}
          </div>

          {/* Filter Controls (displayed when Nachrichten geladen sind) */}
          <>
            {fileName && (
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Senders:</h3>
                {/* Sender-Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className={`w-full px-4 py-2 border rounded-none flex justify-between items-center focus:outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-white text-white'
                        : 'bg-white border-black text-black'
                    }`}
                  >
                    <span>Select Senders</span>
                    <ChevronDown size={16} />
                  </button>
                  {dropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className={`absolute z-10 mt-1 w-full rounded-none  ${
                        darkMode
                          ? 'bg-gray-800 border border-white'
                          : 'bg-white border border-black'
                      }`}
                    >
                      <div
                        className={`max-h-60 overflow-auto ${
                          darkMode ? 'text-white' : 'text-black'
                        }`}
                      >
                        {senders.map((sender) => {
                          // Prozent berechnen:
                          const total = originalMessages.length;
                          const count = originalMessages.filter((m) => m.sender === sender).length;
                          const percentage = (count / total) * 100;

                          // Status 3, wenn unter minMessagePercentage:
                          const isDisabled = percentage < minMessagePercentage;

                          // Status 2 (manuell deaktiviert) liegt vor, wenn
                          // manualSenderSelection[sender] === false.
                          // Status 1 (aktiv) = nicht disabled und kein manuelles false:
                          const isChecked = !isDisabled && manualSenderSelection[sender] !== false;

                          return (
                            <label
                              key={sender}
                              className={`
                    flex items-center px-4 py-2 cursor-pointer
                    ${
                      isDisabled
                        ? // Falls disabled, grau darstellen:
                          darkMode
                          ? 'text-gray-400'
                          : 'text-gray-400'
                        : // Falls aktivierbar, Hover-Effekt
                        darkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-100'
                    }
                  `}
                            >
                              <input
                                type="checkbox"
                                className="mr-2"
                                disabled={isDisabled} // Kein Aktivieren möglich, wenn unter minMessagePercentage
                                checked={isChecked}
                                onChange={() => {
                                  // Wenn disabled, nichts tun:
                                  if (isDisabled) return;

                                  // Toggle zwischen "manuell deaktiviert" und "kein Override":
                                  setManualSenderSelection((prev) => {
                                    // wenn manuell deaktiviert => override entfernen:
                                    if (prev[sender] === false) {
                                      const newState = { ...prev };
                                      delete newState[sender];
                                      return newState;
                                    }
                                    // sonst => manuell deaktivieren:
                                    return { ...prev, [sender]: false };
                                  });
                                }}
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
            )}

            {fileName && (
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Date:</h3>
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">Start Date:</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => setStartDate(date || undefined)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      className={`p-2 border ${
                        darkMode ? 'border-white' : 'border-black'
                      } w-full ${bgColor} ${textColor}`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm mb-1">End Date:</label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => setEndDate(date || undefined)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      className={`p-2 border ${
                        darkMode ? 'border-white' : 'border-black'
                      } w-full ${bgColor} ${textColor}`}
                    />
                  </div>
                </div>
                <div className="flex flex-col w-fit">
                  <label className="text-sm mb-1">Minimum Message Share (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempMinMessagePercentage}
                    onChange={(e) => setTempMinMessagePercentage(Number(e.target.value))}
                    className={`p-2 border ${
                      darkMode ? 'border-white' : 'border-black'
                    } w-full ${bgColor} ${textColor}`}
                  />
                </div>
              </div>
            )}

            {fileName && (
              <div className="flex flex-col space-y-2">
                <h3 className="text-md font-semibold">Select Weekdays:</h3>
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                  <div className="flex flex-wrap gap-0">
                    {DEFAULT_WEEKDAYS.map((day) => (
                      <label key={day} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={day}
                          checked={selectedWeekdays.includes(day)}
                          onChange={handleWeekdayChange}
                          className="hidden"
                        />
                        <span
                          className={`flex items-center justify-center w-4 h-4 border ${
                            darkMode ? 'border-white' : 'border-black'
                          } rounded-none relative`}
                        >
                          {selectedWeekdays.includes(day) && (
                            <svg
                              className={`w-3 h-3 ${darkMode ? 'text-white' : 'text-black'}`}
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
                        <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                          {day}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedWeekdays([...DEFAULT_WEEKDAYS])}
                      className={`px-3 py-1 text-sm rounded-none border ${
                        darkMode
                          ? 'border-white hover:border-white active:bg-gray-600'
                          : 'border-black hover:border-black active:bg-gray-300'
                      } w-auto ${bgColor} ${textColor}`}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedWeekdays([])}
                      className={`px-3 py-1 text-sm border ${
                        darkMode
                          ? 'border-white hover:border-white active:bg-gray-600'
                          : 'border-black hover:border-black active:bg-gray-600'
                      } rounded-none w-auto ${bgColor} ${textColor}`}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {fileName && (
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 mt-auto">
                <button
                  onClick={handleResetFilters}
                  className={`px-4 py-2 text-sm border ${
                    darkMode
                      ? 'border-white hover:border-white active:bg-gray-600'
                      : 'border-black hover:border-black active:bg-gray-300'
                  } rounded-none w-full ${bgColor} ${textColor}`}
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    handleApplyFilters();
                  }}
                  className={`px-4 py-2 text-sm border ${
                    darkMode
                      ? 'border-white hover:border-white active:bg-gray-200'
                      : 'border-black hover:border-black active:bg-gray-700'
                  } rounded-none w-full ${
                    darkMode ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  Apply
                </button>
              </div>
            )}
          </>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
