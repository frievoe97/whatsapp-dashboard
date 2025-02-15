// src/logic/filterChatMessages.ts
import { ChatMessage, FilterOptions } from '../types/chatTypes';
import { SenderStatus } from '../config/constants';

/**
 * Berechnet für die gegebene Nachrichtenmenge den Status jedes Senders.
 * - Wenn der prozentuale Anteil eines Senders unter minPercentage liegt, wird er LOCKED.
 * - Ansonsten: Falls zuvor manuell deaktiviert wurde (und resetManual false ist), bleibt MANUAL_INACTIVE, sonst ACTIVE.
 */
export const computeSenderStatuses = (
  messages: ChatMessage[],
  minPercentage: number,
  previousStatuses?: Record<string, SenderStatus>,
  resetManual: boolean = false,
): Record<string, SenderStatus> => {
  const senderCounts: Record<string, number> = {};
  messages.forEach((msg) => {
    senderCounts[msg.sender] = (senderCounts[msg.sender] || 0) + 1;
  });
  const total = messages.length;
  const statuses: Record<string, SenderStatus> = {};
  for (const sender in senderCounts) {
    const percentage = (senderCounts[sender] / total) * 100;
    if (percentage < minPercentage) {
      statuses[sender] = SenderStatus.LOCKED;
    } else {
      if (
        !resetManual &&
        previousStatuses &&
        previousStatuses[sender] === SenderStatus.MANUAL_INACTIVE
      ) {
        statuses[sender] = SenderStatus.MANUAL_INACTIVE;
      } else {
        statuses[sender] = SenderStatus.ACTIVE;
      }
    }
  }
  return statuses;
};

/**
 * Filtert die Nachrichten basierend auf Datum, Wochentagen und Senderstatus.
 * Es werden nur Nachrichten von Sendern übernommen, deren Status ACTIVE ist.
 */
export const filterMessages = (messages: ChatMessage[], filters: FilterOptions): ChatMessage[] => {
  // Zuerst nach Datum und Wochentag filtern
  const filteredByTime = messages.filter((msg) => {
    if (filters.startDate && msg.date < filters.startDate) return false;
    if (filters.endDate && msg.date > filters.endDate) return false;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][msg.date.getDay()];
    return filters.selectedWeekdays.includes(weekday);
  });

  // Anschließend nur Nachrichten von Sendern mit Status ACTIVE übernehmen.
  return filteredByTime.filter((msg) => filters.senderStatuses[msg.sender] === SenderStatus.ACTIVE);
};
