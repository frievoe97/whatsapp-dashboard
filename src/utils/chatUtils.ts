////////////////////// Imports ////////////////////////
import { Dispatch, SetStateAction, ChangeEvent, RefObject } from 'react';
import { SenderStatus, DEFAULT_WEEKDAYS } from '../config/constants';
import { ChatMessage, FilterOptions } from '../types/chatTypes';

import plausible from 'plausible-tracker';

// Initialize Plausible tracking with the correct domain and API host

// Sets the domain for plausible tracking based on the current hostname.
let domain = '';
if (location.hostname.includes('whatsapp-dashboard')) {
  domain = 'whatsapp-dashboard.friedrichvoelkers.de';
} else if (location.hostname.includes('chat-visualizer')) {
  domain = 'chat-visualizer.de';
} else {
  domain = '';
}

let apiHost = '';
if (location.hostname.includes('whatsapp-dashboard')) {
  apiHost = 'https://plausible.friedrichvoelkers.de';
} else if (location.hostname.includes('chat-visualizer')) {
  apiHost = 'https://plausible.kasperlab.de';
} else {
  apiHost = '';
}

const { trackEvent } = plausible({
  domain: domain,
  apiHost: apiHost,
  trackLocalhost: true,
});

////////////////////// Utility Functions for Filter Updates ////////////////////////

/**
 * Updates the temporary filters with a new date value for either startDate or endDate.
 *
 * @param date - The new date value or null.
 * @param field - The filter field to update ('startDate' or 'endDate').
 * @param setTempFilters - State setter for updating the temporary filters.
 */
export const handleDateChange = (
  date: Date | null,
  field: 'startDate' | 'endDate',
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  setTempFilters((prev) => ({ ...prev, [field]: date || undefined }));
};

/**
 * Updates the minimum message percentage filter based on the input event.
 *
 * @param e - The change event from the number input.
 * @param setTempFilters - State setter for updating the temporary filters.
 */
export const handleMinPercentageChange = (
  e: ChangeEvent<HTMLInputElement>,
  setTempFilters: Dispatch<SetStateAction<FilterOptions>>,
) => {
  setTempFilters((prev) => ({
    ...prev,
    minPercentagePerSender: Number(e.target.value),
  }));
};

/**
 * Toggles a weekday in the selectedWeekdays array based on the checkbox input.
 *
 * @param e - The change event from the checkbox.
 * @param day - The weekday to toggle.
 * @param setTempFilters - State setter for updating the temporary filters.
 */
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

/**
 * Updates the status of a sender based on the checkbox input.
 *
 * @param e - The change event from the checkbox.
 * @param sender - The sender whose status should be updated.
 * @param setTempFilters - State setter for updating the temporary filters.
 */
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

////////////////////// Utility Functions for Weekday Selection ////////////////////////

/**
 * Sets the selectedWeekdays filter to include all default weekdays.
 *
 * @param setTempFilters - State setter for updating the temporary filters.
 */
export const selectAllWeekdays = (setTempFilters: Dispatch<SetStateAction<FilterOptions>>) => {
  setTempFilters((prev) => ({ ...prev, selectedWeekdays: DEFAULT_WEEKDAYS }));
};

/**
 * Clears the selectedWeekdays filter.
 *
 * @param setTempFilters - State setter for updating the temporary filters.
 */
export const deselectAllWeekdays = (setTempFilters: Dispatch<SetStateAction<FilterOptions>>) => {
  setTempFilters((prev) => ({ ...prev, selectedWeekdays: [] }));
};

////////////////////// File Upload Handling ////////////////////////

/**
 * Handles file upload events by reading the file, parsing its content with a web worker,
 * and updating the chat messages, metadata, and UI state accordingly.
 *
 * @param event - The file input change event.
 * @param setOriginalMessages - State setter for original chat messages.
 * @param setMetadata - State setter for chat metadata.
 * @param setIsPanelOpen - State setter to control panel visibility.
 * @param setUseShortNames - State setter for enabling/disabling short names.
 * @param tempSetUseShortNames - Temporary state setter for short names option.
 */
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
  // Reset short names options on new file upload.
  setUseShortNames(false);
  tempSetUseShortNames(false);
  const file = event.target.files?.[0];
  if (!file) return;

  if (!location.hash.startsWith('#/testing')) {
    trackEvent('uploadFile');
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      // Create a new worker to parse the file content.
      const worker = new Worker(new URL('../workers/parseWorker.ts', import.meta.url), {
        type: 'module',
      });

      // Send the file content and file name to the worker.
      worker.postMessage({ content, fileName: file.name });
      // Handle the worker's response.
      worker.onmessage = (e) => {
        const { result, error } = e.data;
        const wasError = Boolean(error);

        if (wasError) {
          console.error('Error parsing file:', error);
        } else {
          setOriginalMessages(result.messages);
          setMetadata(result.metadata);
          setIsPanelOpen(false);
        }

        // Terminate the worker when done.
        worker.terminate();
      };
    }
  };

  reader.readAsText(file);
};

////////////////////// File Deletion Handling ////////////////////////

/**
 * Handles file deletion by resetting the chat messages, metadata, filters, and UI states,
 * and clears the file input.
 *
 * @param setOriginalMessages - State setter for original chat messages.
 * @param setMetadata - State setter for chat metadata.
 * @param setTempFilters - State setter for updating temporary filters.
 * @param setFilteredMessages - State setter for filtered chat messages.
 * @param setUseShortNames - State setter for the short names option.
 * @param tempSetUseShortNames - Temporary state setter for the short names option.
 * @param fileInputRef - Reference to the file input element.
 */
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
