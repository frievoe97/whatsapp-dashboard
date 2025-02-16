// src/logic/filterChatMessages.ts

/////////////////////// Imports ///////////////////////
import { ChatMessage, FilterOptions } from '../types/chatTypes';
import { SenderStatus } from '../config/constants';

/////////////////////// Function: computeSenderStatuses ///////////////////////

/**
 * Computes the status for each sender based on their message share.
 *
 * A sender is marked as LOCKED if their percentage of messages is below the given threshold.
 * Otherwise, if the sender was previously manually deactivated (and resetManual is false),
 * their status remains MANUAL_INACTIVE; otherwise, the sender is marked as ACTIVE.
 *
 * @param messages - Array of chat messages.
 * @param minPercentage - The minimum percentage required for a sender to be considered active.
 * @param previousStatuses - Optional previous statuses for senders.
 * @param resetManual - Flag to indicate if manually disabled statuses should be reset.
 * @returns An object mapping each sender to their computed status.
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

/////////////////////// Function: filterMessages ///////////////////////

/**
 * Filters chat messages based on date, weekday, and sender status.
 *
 * The function first filters messages by the provided date range and selected weekdays.
 * It then returns only those messages where the sender's status is ACTIVE.
 *
 * @param messages - Array of chat messages.
 * @param filters - Filter options including date range, selected weekdays, and sender statuses.
 * @returns The filtered array of chat messages.
 */
export const filterMessages = (messages: ChatMessage[], filters: FilterOptions): ChatMessage[] => {
  // First filter messages by date and weekday
  const filteredByTime = messages.filter((msg) => {
    if (filters.startDate && msg.date < filters.startDate) return false;
    if (filters.endDate && msg.date > filters.endDate) return false;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][msg.date.getDay()];
    return filters.selectedWeekdays.includes(weekday);
  });

  // Then, return only messages from senders with ACTIVE status
  return filteredByTime.filter((msg) => filters.senderStatuses[msg.sender] === SenderStatus.ACTIVE);
};
