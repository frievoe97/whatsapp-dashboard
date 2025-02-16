//////////////////////////////
// FileUpload Component (Desktop Version)
// This component provides the UI for uploading a chat file and applying filters.
// It includes file selection, deletion, and a filter panel with sender selection,
// minimum message share, date range, and weekday selection.
//////////////////////////////

//////////// Imports ////////////
import React, { ChangeEvent, useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Moon, Sun, Trash2 } from 'lucide-react';
import InfoModal from './InfoModal';
import { useChat } from '../context/ChatContext';
import { DEFAULT_WEEKDAYS, SenderStatus } from '../config/constants';
import {
  handleDateChange,
  handleWeekdayChange,
  handleFileUpload,
  handleDeleteFile,
  handleSenderChange,
  handleMinPercentageChange,
} from '../utils/chatUtils';
import { useTranslation } from 'react-i18next';
import '../../i18n';

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

//////////////////////////////
// FileUpload Component
//////////////////////////////

const FileUpload: React.FC = () => {
  //////////// Refs ////////////
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const weekdaysDropdownRef = useRef<HTMLDivElement>(null);

  //////////// Context & Translation ////////////
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
    setIsInfoOpen,
    tempUseShortNames,
    tempToggleUseShortNames,
    setUseShortNames,
    setFilteredMessages,
    tempSetUseShortNames,
  } = useChat();
  const { t } = useTranslation();

  //////////// Local State ////////////
  const [weekdaysDropdownOpen, setWeekdaysDropdownOpen] = useState(false);
  const [sendersDropdownOpen, setSendersDropdownOpen] = useState(false);

  //////////// useEffects ////////////

  // Close sender dropdown when clicking outside.
  useEffect(() => {
    const handleSendersClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSendersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleSendersClickOutside);
    return () => document.removeEventListener('mousedown', handleSendersClickOutside);
  }, []);

  // Close weekdays dropdown when clicking outside.
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

  // Control body overflow when Info Modal is open.
  useEffect(() => {
    document.body.style.overflow = isInfoOpen ? 'hidden' : '';
  }, [isInfoOpen]);

  //////////// Helper Functions ////////////

  /**
   * Toggles the filter panel's visibility and triggers a resize event.
   */
  const toggleCollapse = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  };

  // Get sender names from metadata.
  const senders = metadata ? Object.keys(metadata.senders) : [];

  //////////// Render ////////////
  return (
    <div className="w-full mx-auto rounded-none">
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} darkMode={darkMode} />

      {/* Header */}
      <div className="flex items-center h-8 rounded-none mb-4">
        <button
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className={`px-2 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          <Info size={20} />
        </button>
        <div className="flex-grow text-center text-2xl font-semibold">WhatsApp Dashboard</div>
        <button
          onClick={toggleDarkMode}
          className={`px-2 py-1 mr-4 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={toggleCollapse}
          className={`px-2 py-1 border rounded-none flex items-center hover:border-current ${
            darkMode
              ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
              : 'bg-white text-black border-black hover:bg-gray-200'
          }`}
        >
          {isPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <div className={`border rounded-none ${darkMode ? 'border-white' : 'border-black'}`}>
        {/* File Upload Row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <label
              htmlFor="file-upload"
              className={`cursor-pointer px-4 py-2 border rounded-none ${
                metadata?.fileName ? '' : 'w-full text-center'
              } ${
                darkMode
                  ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                  : 'bg-white text-black border-black hover:bg-gray-200'
              } transition-all`}
            >
              {t('FileUpload.selectFile')}
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
                  setIsPanelOpen,
                  setUseShortNames,
                  tempSetUseShortNames,
                )
              }
            />
            {metadata?.fileName && (
              <span className="text-sm ml-4 rounded-none">{metadata.fileName}</span>
            )}
          </div>
          {metadata?.fileName && (
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
              className={`px-3 py-2 border rounded-none hover:border-current ${
                darkMode
                  ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                  : 'bg-white text-black border-black hover:bg-gray-200'
              }`}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* Filter Panel – Visible Only if Panel Is Open and a File Is Uploaded */}
        {isPanelOpen && metadata?.fileName && (
          <div
            className={`p-4 pt-0 grid grid-cols-4 gap-4 rounded-none ${
              darkMode ? 'bg-gray-800 text-white border-white' : 'bg-white text-black border-black'
            }`}
          >
            {/* Row 1: Sender Filter */}
            <div className="rounded-none flex flex-col">
              <label className="text-md font-semibold rounded-none">
                {t('FileUpload.selectSenders')}
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setSendersDropdownOpen((prev) => !prev)}
                  className={`text-sm w-full mt-2 px-2 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                      : 'bg-white text-black border-black hover:bg-gray-200'
                  }`}
                >
                  <span>{t('FileUpload.selectSenders')}</span>
                  <ChevronDown size={16} />
                </button>
                {sendersDropdownOpen && (
                  <div
                    className={`absolute z-10 mt-1 w-full border rounded-none ${
                      darkMode
                        ? 'bg-gray-700 text-white border-white'
                        : 'bg-white text-black border-black'
                    }`}
                  >
                    <div
                      className="max-h-60 overflow-auto"
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
                            className={`flex items-center px-2 py-2 cursor-pointer rounded-none ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : darkMode
                                ? 'hover:bg-gray-800'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleSenderChange(e, sender, setTempFilters)
                              }
                              className="hidden"
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
            </div>

            {/* Row 1: Minimum Message Share Input */}
            <div className="rounded-none flex flex-col">
              <label className="font-semibold rounded-none">
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
                className={`text-sm mt-2 p-2 border rounded-none ${
                  darkMode ? 'border-white bg-gray-700' : 'border-black'
                }`}
              />
            </div>

            {/* Row 1: Date Selection */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              {/* Start Date Picker */}
              <div className="rounded-none flex flex-1 flex-col">
                <label className="text font-semibold rounded-none mb-2">
                  {t('FileUpload.startDate')}
                </label>
                <DatePicker
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
                          '& fieldset': {
                            borderColor: darkMode ? 'white' : 'black',
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
                          padding: '0.55rem',
                          fontSize: '0.9rem',
                          color: darkMode ? 'white' : 'black',
                        },
                      },
                    },
                  }}
                />
              </div>

              {/* End Date Picker */}
              <div className="rounded-none flex flex-1 flex-col">
                <label className="text-md font-semibold rounded-none mb-2">
                  {t('FileUpload.endDate')}
                </label>
                <DatePicker
                  value={tempFilters.endDate ? dayjs(tempFilters.endDate) : null}
                  onChange={(newValue) =>
                    handleDateChange(newValue ? newValue.toDate() : null, 'endDate', setTempFilters)
                  }
                  minDate={
                    tempFilters.startDate
                      ? dayjs(tempFilters.startDate)
                      : metadata?.firstMessageDate
                      ? dayjs(metadata.firstMessageDate)
                      : undefined
                  }
                  maxDate={metadata?.lastMessageDate ? dayjs(metadata.lastMessageDate) : undefined}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      fullWidth: true,
                      sx: {
                        borderRadius: 0,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: darkMode ? '#374151' : '#fff',
                          height: '100%',
                          '& fieldset': {
                            borderColor: darkMode ? 'white' : 'black',
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
                          padding: '0.55rem',
                          fontSize: '0.9rem',
                          color: darkMode ? 'white' : 'black',
                        },
                      },
                    },
                  }}
                />
              </div>
            </LocalizationProvider>

            {/* Row 2: Weekday Selection Dropdown */}
            <div className="flex flex-col rounded-none relative" ref={weekdaysDropdownRef}>
              <button
                onClick={() => setWeekdaysDropdownOpen((prev) => !prev)}
                className={`text-sm w-full p-2 border rounded-none flex justify-between items-center hover:border-current ${
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

            {/* Row 2: Use Short Names Toggle */}
            <div className="rounded-none">
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
            </div>

            {/* Row 2: Reset and Apply Buttons */}
            <div className="rounded-none">
              <button
                onClick={resetFilters}
                className={`text-sm w-full py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                {t('FileUpload.reset')}
              </button>
            </div>
            <div className="rounded-none">
              <button
                onClick={() => {
                  applyFilters();
                  setSenderDropdownOpen(false);
                  setIsPanelOpen(false);
                  setUseShortNames(tempUseShortNames);
                }}
                className={`text-sm w-full py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                {t('FileUpload.apply')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
