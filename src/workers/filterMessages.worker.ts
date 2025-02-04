/**
 * Web Worker for filtering chat messages based on selected criteria.
 *
 * This worker listens for incoming messages containing chat data and filtering options,
 * processes them asynchronously, and returns the filtered results.
 */

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

export interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  selectedSenders: string[];
  selectedWeekdays: string[];
}

/**
 * Filters the provided chat messages based on the given criteria.
 *
 * For each message, the 'isUsed' flag is set to true only if:
 * - The message date is within the specified date range (if provided).
 * - The sender is included in the list of selected senders.
 * - The weekday (short format) of the message is included in the selected weekdays.
 *
 * @param messages - Array of chat messages to filter.
 * @param filters - Filtering criteria including date range, selected senders, and weekdays.
 * @returns The array of chat messages with updated 'isUsed' flags.
 */
function filterChatMessages(
  messages: ChatMessage[],
  filters: FilterCriteria
): ChatMessage[] {
  return messages.map((msg) => {
    const messageDate = new Date(msg.date);
    const weekdayShort = messageDate.toLocaleString("en-US", {
      weekday: "short",
    });

    const isWithinDateRange =
      (!filters.startDate || messageDate >= new Date(filters.startDate)) &&
      (!filters.endDate || messageDate <= new Date(filters.endDate));

    const isSenderSelected = filters.selectedSenders.includes(msg.sender);
    const isWeekdaySelected = filters.selectedWeekdays.includes(weekdayShort);

    return {
      ...msg,
      isUsed: isWithinDateRange && isSenderSelected && isWeekdaySelected,
    };
  });
}

// Main event listener for filtering messages.
self.addEventListener(
  "message",
  (
    event: MessageEvent<{ messages: ChatMessage[]; filters: FilterCriteria }>
  ) => {
    const { messages, filters } = event.data;

    try {
      const filteredMessages = filterChatMessages(messages, filters);
      self.postMessage(filteredMessages);
    } catch (error) {
      console.error("FilterWorker: Error while filtering messages", error);
      self.postMessage([]);
    }
  }
);
