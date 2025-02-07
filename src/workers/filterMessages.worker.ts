// src/workers/filterMessages.worker.ts

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
 * Filtert die Nachrichten anhand des Datums, der Sender und der Wochentage.
 */
function filterChatMessages(
  messages: ChatMessage[],
  filters: FilterCriteria
): ChatMessage[] {
  return messages.map((msg) => {
    const messageDate = new Date(msg.date);
    const weekday = messageDate.toLocaleString("en-US", {
      weekday: "short",
    });
    const withinDate =
      (!filters.startDate || messageDate >= new Date(filters.startDate)) &&
      (!filters.endDate || messageDate <= new Date(filters.endDate));
    const senderOk = filters.selectedSenders.includes(msg.sender);
    const weekdayOk = filters.selectedWeekdays.includes(weekday);
    return { ...msg, isUsed: withinDate && senderOk && weekdayOk };
  });
}

self.addEventListener(
  "message",
  (
    event: MessageEvent<{
      messages: ChatMessage[];
      filters: FilterCriteria;
    }>
  ) => {
    const { messages, filters } = event.data;
    try {
      const filtered = filterChatMessages(messages, filters);
      self.postMessage(filtered);
    } catch (error) {
      console.error("FilterWorker error:", error);
      self.postMessage([]);
    }
  }
);
