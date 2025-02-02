// src/workers/filterMessages.worker.ts

// Nachrichtentyp
interface Message {
  date: string;
  time: string; // Füge das fehlende Feld hinzu
  sender: string;
  message: string;
  isUsed: boolean;
}

interface FilterCriteria {
  startDate?: string;
  endDate?: string;
  selectedSenders: string[];
  selectedWeekdays: string[];
}

self.addEventListener(
  "message",
  (event: MessageEvent<{ messages: Message[]; filters: FilterCriteria }>) => {
    const { messages, filters } = event.data;

    try {
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

      self.postMessage(filteredMessages);
    } catch (error) {
      console.error("FilterWorker: Fehler beim Filtern", error);
      self.postMessage([]);
    }
  }
);
