// tests/logic/filterChatMessages.test.ts
import { computeSenderStatuses, filterMessages } from '../../src/logic/filterChatMessages';
import { SenderStatus } from '../../src/config/constants';
import { describe, expect, test } from 'vitest';
import { dummyMessage, dummyMetadata } from '../test-data/messages';

describe('filterChatMessages with dummy data', () => {
  describe('computeSenderStatuses', () => {
    test('marks senders as ACTIVE or LOCKED based on minPercentage', () => {
      // For minPercentage 35:
      // - Alice: 7/20 = 35% (exactly at the threshold → ACTIVE)
      // - Bob: 6/20 = 30% (< 35 → LOCKED)
      // - Charlie: 7/20 = 35% (ACTIVE)
      const statuses = computeSenderStatuses(dummyMessage, 35);
      expect(statuses).toEqual({
        Alice: SenderStatus.ACTIVE,
        Bob: SenderStatus.LOCKED,
        Charlie: SenderStatus.ACTIVE,
      });
    });

    test('keeps MANUAL_INACTIVE if present and resetManual false', () => {
      const previousStatuses = {
        Alice: SenderStatus.MANUAL_INACTIVE,
        Bob: SenderStatus.ACTIVE,
        Charlie: SenderStatus.ACTIVE,
      };
      // Mit minPercentage 30 würden alle normalerweise ACTIVE sein,
      // aber Alice behält ihren MANUAL_INACTIVE-Status.
      const statuses = computeSenderStatuses(dummyMessage, 30, previousStatuses, false);
      expect(statuses).toEqual({
        Alice: SenderStatus.MANUAL_INACTIVE,
        Bob: SenderStatus.ACTIVE,
        Charlie: SenderStatus.ACTIVE,
      });
    });
  });

  describe('filterMessages', () => {
    test('filters messages based on date, weekday, and sender status', () => {
      // All dummy messages are from Sunday, 2025-02-16.
      // 2025-02-16 is a Sunday (getDay() === 0 → "Sun").
      const filters = {
        startDate: dummyMetadata.firstMessageDate,
        endDate: dummyMetadata.lastMessageDate,
        selectedWeekdays: ['Sun'],
        minPercentagePerSender: 35,
        senderStatuses: {
          Alice: SenderStatus.ACTIVE,
          Bob: SenderStatus.LOCKED,
          Charlie: SenderStatus.ACTIVE,
        },
      };

      const filtered = filterMessages(dummyMessage, filters);
      // There should be only messages from Alice (7) and Charlie (7) left → total 14
      expect(filtered).toHaveLength(14);
      filtered.forEach((msg) => {
        expect(['Alice', 'Charlie']).toContain(msg.sender);
      });
    });

    test('Returns an empty array if the selected weekday does not match', () => {
      const filters = {
        startDate: dummyMetadata.firstMessageDate,
        endDate: dummyMetadata.lastMessageDate,
        selectedWeekdays: ['Mon'], // Monday - does not match as dummy date is a Sunday
        minPercentagePerSender: 30,
        senderStatuses: {
          Alice: SenderStatus.ACTIVE,
          Bob: SenderStatus.ACTIVE,
          Charlie: SenderStatus.ACTIVE,
        },
      };

      const filtered = filterMessages(dummyMessage, filters);
      expect(filtered).toHaveLength(0);
    });
  });
});
