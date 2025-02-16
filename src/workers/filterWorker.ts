// src/workers/filterWorker.ts
/// <reference lib="webworker" />

import { filterMessages, computeSenderStatuses } from '../logic/filterChatMessages';
import { ChatMessage } from '../types/chatTypes';

self.addEventListener('message', (event) => {
  const { originalMessages, tempFilters, lastAppliedMinPercentage } = event.data;

  // Bestimme, ob ein manueller Reset nötig ist
  const resetManual = tempFilters.minPercentagePerSender !== lastAppliedMinPercentage;

  // Filtere Nachrichten nach Datum und Wochentagen
  const messagesByTime = originalMessages.filter((msg: ChatMessage) => {
    if (tempFilters.startDate && new Date(msg.date) < new Date(tempFilters.startDate)) return false;
    if (tempFilters.endDate && new Date(msg.date) > new Date(tempFilters.endDate)) return false;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(msg.date).getDay()];
    return tempFilters.selectedWeekdays.includes(weekday);
  });

  // Berechne neue Sender-Status
  const newSenderStatuses = computeSenderStatuses(
    messagesByTime,
    tempFilters.minPercentagePerSender,
    tempFilters.senderStatuses,
    resetManual,
  );

  // Erstelle das neue Filter-Objekt
  const newFilters = { ...tempFilters, senderStatuses: newSenderStatuses };

  // Filtere alle Nachrichten anhand der neuen Filter
  const filteredMessages = filterMessages(originalMessages, newFilters);

  // Sende das Ergebnis zurück
  self.postMessage({ filteredMessages, newFilters });
});
