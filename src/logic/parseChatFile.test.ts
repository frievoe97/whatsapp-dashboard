// tests/logic/parseChatFile.test.ts
import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseChatFile } from '../../src/logic/parseChatFile';

describe('parseChatFile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('wirft einen Fehler bei leerem Dateiinhalt', async () => {
    await expect(parseChatFile('', 'empty.txt')).rejects.toThrow('Datei ist leer oder ungültig.');
  });

  test('parst eine gültige iOS-Chat-Datei und filtert ignorierte Nachrichten', async () => {
    // Mock: Ignore-Linie enthält "Hello"
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('Hello'),
      } as Response),
    );

    const content = `[12.05.21, 12:34:56] John Doe: Hello`;
    const result = await parseChatFile(content, 'chat.txt');

    // Da die Nachricht "Hello" enthält, wird sie aufgrund der ignore-Linie herausgefiltert
    expect(result.messages).toEqual([]);
    expect(result.metadata.fileName).toBe('chat.txt');
    expect(result.metadata.os).toBe('ios_1');
    // Es sollten keine Sender vorhanden sein, da keine Nachricht übrig blieb.
    expect(result.metadata.senders).toEqual({});
  });

  test('parst eine gültige iOS-Chat-Datei und behält Nachrichten, wenn keine Übereinstimmung mit ignore-Linie besteht', async () => {
    // Mock: Ignore-Linie, die nicht mit der Nachricht übereinstimmt
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('IGNORED_TEXT'),
      } as Response),
    );

    const content = `[12.05.21, 12:34:56] John Doe: Hello`;
    const result = await parseChatFile(content, 'chat.txt');

    // Die Nachricht "Hello" enthält nicht "IGNORED_TEXT" und wird beibehalten.
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
