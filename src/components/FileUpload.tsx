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

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  darkMode: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  darkMode,
  disabled = false,
  label,
}) => {
  return (
    <label
      className={`flex items-center gap-1 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />
      <span
        className={`flex items-center justify-center w-4 h-4 border ${
          darkMode ? 'border-white' : 'border-black'
        } rounded-none relative`}
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
      {label && <span className="text-sm rounded-none">{label}</span>}
    </label>
  );
};

const FileUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const weekdaysDropdownRef = useRef<HTMLDivElement>(null);

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
    tempUseShortNames,
    tempToggleUseShortNames,
    setUseShortNames,
    setFilteredMessages,
    tempSetUseShortNames,
  } = useChat();

  const [weekdaysDropdownOpen, setWeekdaysDropdownOpen] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSenderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSenderDropdownOpen]);

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

  const toggleCollapse = () => {
    setIsPanelOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  };

  const senders = metadata ? Object.keys(metadata.senders) : [];

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
        <div className="flex-grow text-center text-2xl font-semibold">Whatsapp Dashboard</div>
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
        <div
          className={`flex items-center justify-between p-4
            `}
        >
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

        {/* Filter Panel – nur sichtbar, wenn aufgeklappt */}
        {isPanelOpen && metadata?.fileName && (
          <div
            className={`p-4 pt-0 grid grid-cols-4 gap-4 rounded-none ${
              darkMode ? 'bg-gray-800 text-white border-white' : 'bg-white text-black border-black'
            }`}
          >
            {/* Zeile 1 */}
            {/* 1. Zelle: Sender Filter */}
            <div className="rounded-none flex flex-col">
              <label className="text-md font-semibold rounded-none">Select Senders:</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setSenderDropdownOpen((prev) => !prev)}
                  className={`w-full mt-2 px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                      : 'bg-white text-black border-black hover:bg-gray-200'
                  }`}
                >
                  <span>Select Senders</span>
                  <ChevronDown size={16} />
                </button>
                {senderDropdownOpen && (
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
                          <div
                            key={sender}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`px-4 py-2 ${
                              disabled ? 'opacity-50 cursor-not-allowed' : ''
                            } ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                          >
                            <CustomCheckbox
                              checked={checked}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleSenderChange(e, sender, setTempFilters)
                              }
                              darkMode={darkMode}
                              disabled={disabled}
                              label={
                                <>
                                  {sender}{' '}
                                  {metadata?.sendersShort[sender]
                                    ? `(${metadata.sendersShort[sender]})`
                                    : ''}
                                </>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Zelle: Minimum Message Share */}
            <div className="rounded-none flex flex-col">
              <label className="text-md font-semibold rounded-none">Min. Share:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempFilters.minPercentagePerSender}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleMinPercentageChange(e, setTempFilters)
                }
                className={`mt-2 p-2 border rounded-none ${
                  darkMode ? 'border-white bg-gray-700' : 'border-black'
                }`}
              />
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              {/* Start Date */}
              <div className="rounded-none flex flex-col">
                <label className="text-md font-semibold rounded-none mb-2">Start Date:</label>
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
              <div className="rounded-none flex flex-col">
                <label className="text-md font-semibold rounded-none mb-2">End Date:</label>
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

            {/* Zeile 2 */}
            {/* 1. Zelle: Weekdays-Auswahl */}
            <div className="rounded-none flex flex-col relative" ref={weekdaysDropdownRef}>
              {/* <label className="text-md font-semibold rounded-none">Select Weekdays:</label> */}
              <button
                onClick={() => setWeekdaysDropdownOpen((prev) => !prev)}
                className={`w-full px-4 py-2 border rounded-none flex justify-between items-center hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                <span>Select Weekdays</span>
                <ChevronDown size={16} />
              </button>
              {weekdaysDropdownOpen && (
                <div
                  className={`absolute top-full z-10 mt-1 w-full border rounded-none ${
                    darkMode
                      ? 'bg-gray-700 text-white border-white'
                      : 'bg-white text-black border-black'
                  }`}
                >
                  <div className="max-h-70 overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
                    {DEFAULT_WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className={`px-4 py-2 ${
                          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                        }`}
                      >
                        <CustomCheckbox
                          checked={tempFilters.selectedWeekdays.includes(day)}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleWeekdayChange(e, day, setTempFilters)
                          }
                          darkMode={darkMode}
                          label={day}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Zelle: Use Short Names */}
            <div className="rounded-none ">
              <button
                onClick={() => tempToggleUseShortNames()}
                className={`w-full px-2 py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                {tempUseShortNames ? <div>Use Full Names</div> : <div>Use abbreviations</div>}
              </button>
            </div>

            {/* 3. und 4. Zelle: Leer */}
            <div className="rounded-none">
              <button
                onClick={resetFilters}
                className={`w-full py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                Reset
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
                className={`w-full py-2 border rounded-none hover:border-current ${
                  darkMode
                    ? 'bg-gray-700 text-white border-white hover:bg-gray-800'
                    : 'bg-white text-black border-black hover:bg-gray-200'
                }`}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
