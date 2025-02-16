//////////////////////////////
// FileUploadMobile Component (Mobile Version)
// This component provides the mobile UI for uploading chat files and applying filters.
//////////////////////////////

import React, { ChangeEvent, useRef, useEffect, useState } from 'react';
import { Info, ChevronDown, ChevronUp, Moon, Sun, Trash2 } from 'lucide-react';
import InfoModal from './InfoModal';
import { useChat } from '../context/ChatContext';
import { DEFAULT_WEEKDAYS, SenderStatus } from '../config/constants';
import {
  handleDateChange,
  handleMinPercentageChange,
  handleWeekdayChange,
  handleSenderChange,
  handleFileUpload,
  handleDeleteFile,
} from '../utils/chatUtils';
import { useTranslation } from 'react-i18next';
import '../../i18n';

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import './DatePicker.css';

//////////////////////////////
// Constants
//////////////////////////////

// Determines the number of pixels per character used when truncating the filename.
const PIXEL_PER_CHAR = 7;

//////////////////////////////
// FileUploadMobile Component
//////////////////////////////

const FileUploadMobile: React.FC = () => {
  //////////////////////////////
  // Refs
  //////////////////////////////
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderDropdownRef = useRef<HTMLDivElement>(null);
  const weekdaysDropdownRef = useRef<HTMLDivElement>(null);
  const filenameRef = useRef<HTMLSpanElement | null>(null);

  //////////////////////////////
  // Local State
  //////////////////////////////
  const [weekdaysDropdownOpen, setWeekdaysDropdownOpen] = useState(false);
  const [sendersDropdownOpen, setSendersDropdownOpen] = useState(false);
  const [filenameWidth, setFilenameWidth] = useState(0);

  //////////////////////////////
  // Chat Context & Translation
  //////////////////////////////
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
    setSenderDropdownOpen,
    isPanelOpen,
    setIsPanelOpen,
    isInfoOpen,
    setFilteredMessages,
    setIsInfoOpen,
    tempUseShortNames,
    tempToggleUseShortNames,
    setUseShortNames,
    tempSetUseShortNames,
  } = useChat();
  const { t } = useTranslation();

  //////////////////////////////
  // Effects: Close Dropdowns on Outside Click
  //////////////////////////////
  useEffect(() => {
    const handleSendersClickOutside = (event: MouseEvent) => {
      if (senderDropdownRef.current && !senderDropdownRef.current.contains(event.target as Node)) {
        setSendersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleSendersClickOutside);
    return () => document.removeEventListener('mousedown', handleSendersClickOutside);
  }, []);

  useEffect(() => {
    const handleWeekdaysClickOutside = (event: MouseEvent) => {
      if (
        weekdaysDropdownRef.current &&
        !weekdaysDropdownRef.current.contains(event.target as Node)
      ) {
        setWeekdaysDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleWeekdaysClickOutside);
    return () => document.removeEventListener('mousedown', handleWeekdaysClickOutside);
  }, []);

  //////////////////////////////
  // Effect: Control Body Overflow When Info Modal Is Open
  //////////////////////////////
  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? 'hidden' : '';
  }, [isInfoOpen]);

  //////////////////////////////
  // Effect: Observe Filename Element for Dynamic Truncation
  //////////////////////////////
  useEffect(() => {
    const filenameElement = filenameRef.current;
    if (!filenameElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setFilenameWidth(
          (entry.contentRect.width - (entry.contentRect.width % PIXEL_PER_CHAR)) / PIXEL_PER_CHAR,
        );
      }
    });

    // Observe the filename element.
    resizeObserver.observe(filenameElement);
    // Set initial width.
    setFilenameWidth(filenameElement.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, [metadata?.fileName, isPanelOpen]);

  //////////////////////////////
  // Helper Functions
  //////////////////////////////

  /**
   * Toggles the expansion of the filter panel and dispatches a resize event.
   */
  const toggleExpanded = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  };

  /**
   * Truncates a string to a maximum length, appending "..." if needed.
   *
   * @param str - The string to truncate.
   * @param n - The maximum number of characters.
   * @returns The truncated string.
   */
  const truncateString = (str: string, n: number): string => {
    return str.length > n - 3 ? str.substring(0, n - 3) + '...' : str;
  };

  // Get the list of sender names from metadata.
  const senders = metadata ? Object.keys(metadata.senders) : [];

  //////////////////////////////
  // Render
  //////////////////////////////
  return (
    <div
      className={`p-4 min-h-fit flex flex-col space-y-4 rounded-none ${
        darkMode
          ? 'bg-[#1f2937] text-white border border-white dark-mode'
          : 'bg-white text-black border border-black'
      }`}
    >
      {/* Header */}
      <div className="flex items-center h-8 rounded-none">
        <button
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className={`px-1 py-1 border  rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          <Info size={16} />
        </button>
        <div className="flex-grow text-center text-lg font-semibold">WhatsApp Dashboard</div>

        <button
          onClick={toggleDarkMode}
          className={`px-1 py-1 border mr-2 rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={toggleExpanded}
          className={`px-1 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          {isPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} darkMode={darkMode} />

      {isPanelOpen && (
        <>
          {/* File Upload Section */}
          <div className="text-sm w-full flex items-center justify-between rounded-none">
            <label
              htmlFor="file-upload-mobile"
              className={`whitespace-nowrap cursor-pointer px-4 py-2 border rounded-none ${
                metadata?.fileName ? '' : 'w-full text-center'
              } ${
                darkMode
                  ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                  : 'bg-white text-black border-black hover:bg-gray-200'
              } dark:hover:bg-gray-600 transition-all`}
            >
              {t('FileUpload.selectFile')}
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
                  setIsPanelOpen,
                  setUseShortNames,
                  tempSetUseShortNames,
                )
              }
            />
            {metadata?.fileName && (
              <>
                <span
                  ref={filenameRef}
                  id="fileupload-mobile-filename-text"
                  className="w-full text-sm ml-2 rounded-none"
                >
                  {truncateString(metadata.fileName, filenameWidth)}
                </span>

                <button
                  onClick={() =>
                    handleDeleteFile(
                      setOriginalMessages,
                      setMetadata,
                      setTempFilters,
                      setFilteredMessages,
                      setUseShortNames,
                      tempSetUseShortNames,
                      fileInputRef,
                    )
                  }
                  className={`px-2 py-2 border rounded-none hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white'
                      : 'bg-white text-black border-black'
                  } ml-2`}
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}
          </div>

          {/* Filter Section */}
          {metadata?.fileName && (
            <div className="space-y-2 rounded-none">
              {/* Sender Filter */}
              <div className="relative rounded-none" ref={senderDropdownRef}>
                <button
                  onClick={() => setSendersDropdownOpen((prev) => !prev)}
                  className={`text-sm w-full px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-700 active:bg-gray-700'
                      : 'bg-white text-black border-black hover:bg-white active:bg-white'
                  }`}
                >
                  <span>{t('FileUpload.selectSenders')}</span>
                  <ChevronDown size={16} />
                </button>
                {sendersDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full border rounded-none ${
                      darkMode
                        ? 'text-white border-white bg-gray-700'
                        : 'text-black border-black bg-white'
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
                                ? 'opacity-50 cursor-not-allowed'
                                : darkMode
                                ? 'hover:bg-gray-800'
                                : 'hover:bg-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleSenderChange(e, sender, setTempFilters)
                              }
                              className="hidden" // Input verstecken
                            />
                            <span
                              className={`flex items-center justify-center w-4 h-4 border ${
                                darkMode ? 'border-white' : 'border-black'
                              } rounded-none relative mr-2`}
                            >
                              {checked && (
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
                            {sender}{' '}
                            {metadata?.sendersShort[sender]
                              ? `(${metadata.sendersShort[sender]})`
                              : ''}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => tempToggleUseShortNames()}
                className={`text-sm w-full px-2 py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                {tempUseShortNames ? (
                  <div>{t('FileUpload.useFullNames')}</div>
                ) : (
                  <div>{t('FileUpload.useAbbreviations')}</div>
                )}
              </button>

              {/* Minimum Message Share Input */}
              <div className="flex flex-col rounded-none">
                <label className="text-base rounded-none mb-2">
                  {t('FileUpload.minimumMessageShare')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempFilters.minPercentagePerSender}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleMinPercentageChange(e, setTempFilters)
                  }
                  className={`text-sm p-2 border rounded-none ${
                    darkMode
                      ? 'border-white bg-gray-700 hover:bg-gray-800'
                      : 'border-black bg-white hover:bg-gray-100'
                  }`}
                />
              </div>

              {/* Date Selection */}
              <div className="flex flex-row rounded-none gap-2">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  {/* Start Date */}
                  <div className="rounded-none flex flex-1 flex-col">
                    <label className="text-base  rounded-none mb-2">
                      {t('FileUpload.startDate')}:
                    </label>
                    <DatePicker
                      // label="Start Date"
                      value={tempFilters.startDate ? dayjs(tempFilters.startDate) : null}
                      onChange={(newValue) =>
                        handleDateChange(
                          newValue ? newValue.toDate() : null,
                          'startDate',
                          setTempFilters,
                        )
                      }
                      minDate={
                        metadata?.firstMessageDate ? dayjs(metadata.firstMessageDate) : undefined
                      }
                      maxDate={
                        tempFilters.endDate
                          ? dayjs(tempFilters.endDate)
                          : metadata?.lastMessageDate
                          ? dayjs(metadata.lastMessageDate)
                          : undefined
                      }
                      slotProps={{
                        textField: {
                          variant: 'outlined',
                          fullWidth: true,
                          sx: {
                            borderRadius: 0,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#374151' : '#fff',
                              height: '100%',
                              // Überschreibe die Standard-NotchedOutline:
                              '& fieldset': {
                                borderColor: darkMode ? 'white' : 'black', // Nur der schwarze (bzw. weiße im Dark Mode) Rahmen bleibt
                                borderWidth: '1px',
                                borderRadius: 0,
                              },
                              '&:hover fieldset': {
                                borderColor: darkMode ? 'white' : 'black',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: darkMode ? 'white' : 'black',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? 'white' : 'black',
                            },
                            '& .MuiInputBase-input': {
                              padding: '0.6rem', // Dein gewünschtes Padding
                              fontSize: '1rem', // Tailwind base entspricht meist 1rem
                              color: darkMode ? 'white' : 'black',
                            },
                          },
                        },
                      }}
                    />
                  </div>

                  {/* End Date */}
                  <div className="rounded-none flex flex-1 flex-col">
                    <label className="text-base rounded-none mb-2">
                      {t('FileUpload.endDate')}:
                    </label>
                    <DatePicker
                      value={tempFilters.endDate ? dayjs(tempFilters.endDate) : null}
                      onChange={(newValue) =>
                        handleDateChange(
                          newValue ? newValue.toDate() : null,
                          'endDate',
                          setTempFilters,
                        )
                      }
                      minDate={
                        tempFilters.startDate
                          ? dayjs(tempFilters.startDate)
                          : metadata?.firstMessageDate
                          ? dayjs(metadata.firstMessageDate)
                          : undefined
                      }
                      maxDate={
                        metadata?.lastMessageDate ? dayjs(metadata.lastMessageDate) : undefined
                      }
                      slotProps={{
                        textField: {
                          variant: 'outlined',
                          fullWidth: true,
                          sx: {
                            borderRadius: 0,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: darkMode ? '#374151' : '#fff',
                              height: '100%',
                              // Überschreibe die Standard-NotchedOutline:
                              '& fieldset': {
                                borderColor: darkMode ? 'white' : 'black', // Nur der schwarze (bzw. weiße im Dark Mode) Rahmen bleibt
                                borderWidth: '1px',
                                borderRadius: 0,
                              },
                              '&:hover fieldset': {
                                borderColor: darkMode ? 'white' : 'black',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: darkMode ? 'white' : 'black',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: darkMode ? 'white' : 'black',
                            },
                            '& .MuiInputBase-input': {
                              padding: '0.6rem', // Dein gewünschtes Padding
                              fontSize: '1rem', // Tailwind base entspricht meist 1rem
                              color: darkMode ? 'white' : 'black',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </LocalizationProvider>
              </div>

              {/* Weekday Selection Dropdown */}
              <div className="flex flex-col rounded-none relative" ref={weekdaysDropdownRef}>
                <button
                  onClick={() => setWeekdaysDropdownOpen((prev) => !prev)}
                  className={`text-sm w-full px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                      : 'bg-white text-black border-black hover:bg-white'
                  }`}
                >
                  <span>{t('FileUpload.selectWeekdays')}</span>
                  <ChevronDown size={16} />
                </button>
                {weekdaysDropdownOpen && (
                  <div
                    className={`absolute top-full z-10 mt-1 w-full border rounded-none ${
                      darkMode
                        ? 'bg-gray-700 text-white border-white'
                        : 'bg-white text-black border-black'
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-70 overflow-auto">
                      {DEFAULT_WEEKDAYS.map((day) => (
                        <label
                          key={day}
                          className={`flex items-center px-4 py-2 cursor-pointer rounded-none ${
                            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={tempFilters.selectedWeekdays.includes(day)}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleWeekdayChange(e, day, setTempFilters)
                            }
                            className="hidden"
                          />
                          <span
                            className={`flex items-center justify-center w-4 h-4 border ${
                              darkMode ? 'border-white' : 'border-black'
                            } rounded-none relative`}
                          >
                            {tempFilters.selectedWeekdays.includes(day) && (
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
                          <span className="text-sm ml-1">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset & Apply Buttons */}
              <div className="flex gap-2 rounded-none ">
                <button
                  onClick={resetFilters}
                  className={`text-sm py-2 flex-1 border rounded-none hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                      : 'bg-white text-black border-black hover:bg-gray-100'
                  }`}
                >
                  {t('FileUpload.reset')}
                </button>
                <button
                  onClick={() => {
                    applyFilters();
                    setSenderDropdownOpen(false);
                    setIsPanelOpen(false);
                    setUseShortNames(tempUseShortNames);
                  }}
                  className={`text-sm py-2 flex-1 border rounded-none hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                      : 'bg-white text-black border-black hover:bg-gray-100'
                  }`}
                >
                  {t('FileUpload.apply')}
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
