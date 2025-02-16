//////////////////////////////
// tests/logic/filterChatMessages.test.ts
//
// This file tests the functions computeSenderStatuses and filterMessages from the chat filtering logic.
// It uses dummy data to validate that filtering and status computations work as expected.
//////////////////////////////

////////////////////// Imports ////////////////////////
import { computeSenderStatuses, filterMessages } from '../../src/logic/filterChatMessages';
import { SenderStatus } from '../../src/config/constants';
import { describe, expect, test } from 'vitest';
import { dummyMessage, dummyMetadata } from '../test-data/messages';

////////////////////// Test Suite: computeSenderStatuses ////////////////////////
describe('computeSenderStatuses', () => {
  test('marks senders as ACTIVE or LOCKED based on minPercentage', () => {
    // For minPercentage 35:
    // - Alice: 7/20 = 35% (exactly at threshold -> ACTIVE)
    // - Bob: 6/20 = 30% (< 35 -> LOCKED)
    // - Charlie: 7/20 = 35% (ACTIVE)
    const statuses = computeSenderStatuses(dummyMessage, 35);
    expect(statuses).toEqual({
      Alice: SenderStatus.ACTIVE,
      Bob: SenderStatus.LOCKED,
      Charlie: SenderStatus.ACTIVE,
    });
  });

  test('preserves MANUAL_INACTIVE status if present when resetManual is false', () => {
    // When minPercentage is 30:
    // Normally, all senders would be ACTIVE, but Alice should remain MANUAL_INACTIVE.
    const previousStatuses = {
      Alice: SenderStatus.MANUAL_INACTIVE,
      Bob: SenderStatus.ACTIVE,
      Charlie: SenderStatus.ACTIVE,
    };
    const statuses = computeSenderStatuses(dummyMessage, 30, previousStatuses, false);
    expect(statuses).toEqual({
      Alice: SenderStatus.MANUAL_INACTIVE,
      Bob: SenderStatus.ACTIVE,
      Charlie: SenderStatus.ACTIVE,
    });
  });
});

////////////////////// Test Suite: filterMessages ////////////////////////
describe('filterMessages', () => {
  test('filters messages based on date, weekday, and sender status', () => {
    // All dummy messages are from Sunday, 2025-02-16.
    // 2025-02-16 is a Sunday (getDay() === 0 -> "Sun").
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
    // Expect only messages from Alice (7) and Charlie (7) → total 14 messages.
    expect(filtered).toHaveLength(14);
    filtered.forEach((msg) => {
      expect(['Alice', 'Charlie']).toContain(msg.sender);
    });
  });

  test('returns an empty array if no messages match the selected weekday', () => {
    const filters = {
      startDate: dummyMetadata.firstMessageDate,
      endDate: dummyMetadata.lastMessageDate,
      selectedWeekdays: ['Mon'], // Monday does not match as dummy messages are on Sunday.
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
