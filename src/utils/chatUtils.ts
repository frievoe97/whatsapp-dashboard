import { Dispatch, SetStateAction, ChangeEvent, RefObject } from 'react';
import { SenderStatus, DEFAULT_WEEKDAYS } from '../config/constants';
import { ChatMessage, FilterOptions } from '../types/chatTypes';

export const handleDateChange = (
  date: Date | null,
  field: 'startDate' | 'endDate',
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  setTempFilters((prev) => ({ ...prev, [field]: date || undefined }));
};

export const handleMinPercentageChange = (
  e: ChangeEvent<HTMLInputElement>,
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  setTempFilters((prev) => ({
    ...prev,
    minPercentagePerSender: Number(e.target.value),
  }));
};

export const handleWeekdayChange = (
  e: ChangeEvent<HTMLInputElement>,
  day: string,
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  const checked = e.target.checked;
  setTempFilters((prev) => ({
    ...prev,
    selectedWeekdays: checked
      ? [...prev.selectedWeekdays, day]
      : prev.selectedWeekdays.filter((d) => d !== day),
  }));
};

export const handleSenderChange = (
  e: ChangeEvent<HTMLInputElement>,
  sender: string,
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  const checked = e.target.checked;
  setTempFilters((prev) => ({
    ...prev,
    senderStatuses: {
      ...prev.senderStatuses,
      [sender]: checked ? SenderStatus.ACTIVE : SenderStatus.MANUAL_INACTIVE,
    },
  }));
};

export const selectAllWeekdays = (setTempFilters: Dispatch<SetStateAction<FilterOptions>>) => {
  setTempFilters((prev) => ({ ...prev, selectedWeekdays: DEFAULT_WEEKDAYS }));
};

export const deselectAllWeekdays = (setTempFilters: Dispatch<SetStateAction<FilterOptions>>) => {
  setTempFilters((prev) => ({ ...prev, selectedWeekdays: [] }));
};

export const handleFileUpload = (
  event: ChangeEvent<HTMLInputElement>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOriginalMessages: Dispatch<SetStateAction<any[]>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMetadata: Dispatch<SetStateAction<any | null>>,
  setIsPanelOpen: Dispatch<SetStateAction<boolean>>,
  setUseShortNames: Dispatch<SetStateAction<boolean>>,
  tempSetUseShortNames: Dispatch<SetStateAction<boolean>>,
) => {
  setUseShortNames(false);
  tempSetUseShortNames(false);
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      try {
        const { parseChatFile } = await import('../logic/parseChatFile');
        const result = await parseChatFile(content, file.name);
        setOriginalMessages(result.messages);
        // console.log(result.metadata);
        setMetadata(result.metadata);
        setIsPanelOpen(false);
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    }
  };
  reader.readAsText(file);
};

export const handleDeleteFile = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOriginalMessages: Dispatch<SetStateAction<any[]>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMetadata: Dispatch<SetStateAction<any | null>>,
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
  setFilteredMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setUseShortNames: Dispatch<SetStateAction<boolean>>,
  tempSetUseShortNames: Dispatch<SetStateAction<boolean>>,
  fileInputRef: RefObject<HTMLInputElement>,
) => {
  setOriginalMessages([]);
  setMetadata(null);
  setFilteredMessages([]);
  setTempFilters({
    startDate: undefined,
    endDate: undefined,
    selectedWeekdays: DEFAULT_WEEKDAYS,
    minPercentagePerSender: 3,
    senderStatuses: {},
  });
  setUseShortNames(false);
  tempSetUseShortNames(false);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};
