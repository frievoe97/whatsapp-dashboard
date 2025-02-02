/**
 * Web Worker for filtering chat messages based on selected criteria.
 *
 * This worker listens for incoming messages containing chat data and filtering options,
 * processes them asynchronously, and returns the filtered results.
 */

// Define the structure of a chat message
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
  isUsed: boolean;
}

// Define the filtering criteria
interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  selectedSenders: string[];
  selectedWeekdays: string[];
}

/**
 * Event listener for messages received by the worker.
 * Filters chat messages based on the provided criteria and sends the results back.
 */
self.addEventListener(
  "message",
  (
    event: MessageEvent<{ messages: ChatMessage[]; filters: FilterCriteria }>
  ) => {
    const { messages, filters } = event.data;

    try {
      // Process each message and determine if it matches the filtering criteria
      const filteredMessages = messages.map((msg) => {
        const messageDate = new Date(msg.date);
        const messageDay = messageDate.toLocaleString("en-US", {
          weekday: "short",
        });

        const isWithinDateRange =
          (!filters.startDate || messageDate >= new Date(filters.startDate)) &&
          (!filters.endDate || messageDate <= new Date(filters.endDate));

        const isSenderSelected = filters.selectedSenders.includes(msg.sender);
        const isWeekdaySelected = filters.selectedWeekdays.includes(messageDay);

        return {
          ...msg,
          isUsed: isWithinDateRange && isSenderSelected && isWeekdaySelected,
        };
      });

      // Send the filtered messages back to the main thread
      self.postMessage(filteredMessages);
    } catch (error) {
      console.error("FilterWorker: Error while filtering messages", error);
      self.postMessage([]);
    }
  }
);
