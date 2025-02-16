/// <reference lib="webworker" />

/////////////////////// Imports ///////////////////////
import { filterMessages, computeSenderStatuses } from '../logic/filterChatMessages';
import { ChatMessage } from '../types/chatTypes';

/////////////////////// Worker Message Handler ///////////////////////

/**
 * This web worker listens for messages from the main thread to filter chat messages.
 * It applies date and weekday filters, computes sender statuses, and returns the filtered
 * messages along with the updated filter options.
 */
self.addEventListener('message', (event) => {
  const { originalMessages, tempFilters, lastAppliedMinPercentage } = event.data;

  // Determine whether a manual reset is required based on the minPercentage change.
  const resetManual = tempFilters.minPercentagePerSender !== lastAppliedMinPercentage;

  // Filter messages by date range and selected weekdays.
  const messagesByTime = originalMessages.filter((msg: ChatMessage) => {
    if (tempFilters.startDate && new Date(msg.date) < new Date(tempFilters.startDate)) return false;
    if (tempFilters.endDate && new Date(msg.date) > new Date(tempFilters.endDate)) return false;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(msg.date).getDay()];
    return tempFilters.selectedWeekdays.includes(weekday);
  });

  // Compute new sender statuses using the filtered messages.
  const newSenderStatuses = computeSenderStatuses(
    messagesByTime,
    tempFilters.minPercentagePerSender,
    tempFilters.senderStatuses,
    resetManual,
  );

  // Create an updated filters object with the new sender statuses.
  const newFilters = { ...tempFilters, senderStatuses: newSenderStatuses };

  // Filter all original messages using the updated filter options.
  const filteredMessages = filterMessages(originalMessages, newFilters);

  // Post the result back to the main thread.
  self.postMessage({ filteredMessages, newFilters });
});
