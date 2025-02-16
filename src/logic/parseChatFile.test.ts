//////////////////////////////
// tests/logic/parseChatFile.test.ts
//
// This file tests the parseChatFile function from the chat parsing logic.
// It verifies that the function correctly handles empty input, parses a valid iOS chat file,
// and filters out ignored messages based on fetched ignore-lines.
//////////////////////////////

////////////////////// Imports ////////////////////////
import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseChatFile } from '../../src/logic/parseChatFile';

////////////////////// Test Suite: parseChatFile ////////////////////////
describe('parseChatFile', () => {
  // Store the original global fetch to restore after tests.
  const originalFetch = global.fetch;

  // Restore the original fetch after each test.
  afterEach(() => {
    global.fetch = originalFetch;
  });

  ////////////////////// Test Case: Empty File //////////////////////

  test('throws an error for empty file content', async () => {
    await expect(parseChatFile('', 'empty.txt')).rejects.toThrow('The file is empty or invalid.');
  });

  ////////////////////// Test Case: Valid iOS Chat File with Ignored Message //////////////////////

  test('parses a valid iOS chat file and filters out ignored messages', async () => {
    // Mock fetch to return an ignore-line that contains "Hello"
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('Hello'),
      } as Response),
    );

    const content = `[12.05.21, 12:34:56] John Doe: Hello`;
    const result = await parseChatFile(content, 'chat.txt');

    // Since the message contains "Hello", it should be filtered out.
    expect(result.messages).toEqual([]);
    expect(result.metadata.fileName).toBe('chat.txt');
    expect(result.metadata.os).toBe('ios_1');
    // No senders should remain as all messages have been filtered out.
    expect(result.metadata.senders).toEqual({});
  });

  ////////////////////// Test Case: Valid iOS Chat File with Retained Message //////////////////////

  test('parses a valid iOS chat file and retains messages when ignore-line does not match', async () => {
    // Mock fetch to return an ignore-line that does NOT match the message content.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('IGNORED_TEXT'),
      } as Response),
    );

    const content = `[12.05.21, 12:34:56] John Doe: Hello`;
    const result = await parseChatFile(content, 'chat.txt');

    // The message "Hello" does not contain "IGNORED_TEXT" so it should be retained.
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      sender: 'John Doe',
      message: 'Hello',
      time: '12:34:56',
    });
    expect(result.metadata.senders).toEqual({ 'John Doe': 1 });
    expect(result.metadata.sendersShort['John Doe']).toBeDefined();
  });
});
