// src/logic/parseChatFile.ts

/////////////////////// Imports ///////////////////////
import { ChatMessage, ChatMetadata } from '../types/chatTypes';
import { franc } from 'franc-min';
import { OPERATING_SYSTEMS } from '../config/constants';
import { abbreviateContacts } from '../utils/abbreviateContacts';

/////////////////////// Utility Functions ///////////////////////

/**
 * Determines the operating system of the chat file by testing the first 1000 lines.
 *
 * @param lines - Array of lines from the chat file.
 * @returns The name of the detected operating system.
 */
const detectOS = (lines: string[]): string => {
  const counts = new Map<string, number>();

  for (const os of OPERATING_SYSTEMS) {
    counts.set(os.name, 0);
  }

  for (const line of lines.slice(0, 1000)) {
    for (const os of OPERATING_SYSTEMS) {
      if (os.regex.test(line)) {
        counts.set(os.name, (counts.get(os.name) || 0) + 1);
      }
    }
  }

  return [...counts.entries()].reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
};

/**
 * Detects the language of the chat based on a sample of the messages.
 *
 * @param messages - Array of chat messages.
 * @returns A language code: 'de', 'en', 'fr', or 'es'.
 */
const detectLanguage = (messages: ChatMessage[]): 'de' | 'en' | 'fr' | 'es' => {
  const sampleText = messages
    .slice(0, 100)
    .map((m) => m.message)
    .join(' ');
  const langCode = franc(sampleText, { minLength: 3 });
  const langMap: Record<string, 'de' | 'en' | 'fr' | 'es'> = {
    deu: 'de',
    eng: 'en',
    fra: 'fr',
    spa: 'es',
  };
  return langMap[langCode] || 'en';
};

/**
 * Loads ignore lines from the server to filter out unwanted messages.
 *
 * @param lang - Language code used to fetch the corresponding ignore file.
 * @returns A promise that resolves to an array of ignore line strings.
 */
const loadIgnoreLines = async (lang: string): Promise<string[]> => {
  const fileName = `ignore_lines_${lang}.txt`;
  const fileNamePath = `/files/${fileName}`;

  const fileNamePathResponse = await fetch(fileNamePath);
  if (!fileNamePathResponse.ok) throw new Error(`Fallback file not found: ${fileNamePath}`);

  const lines = (await fileNamePathResponse.text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines;
};

/////////////////////// Chat File Parsing ///////////////////////

/**
 * Parses a WhatsApp chat file and returns the extracted messages along with metadata.
 *
 * @param content - The raw text content of the chat file.
 * @param fileName - The name of the chat file.
 * @returns A promise that resolves to an object containing parsed messages and metadata.
 */
export const parseChatFile = async (
  content: string,
  fileName: string,
): Promise<{ messages: ChatMessage[]; metadata: ChatMetadata }> => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    // Dont change this error message! Its used in the test. (./parseChatFile.test.ts)
    throw new Error('The file is empty or invalid.');
  }

  const messages: ChatMessage[] = [];
  const osName = detectOS(lines);
  const osConfig = OPERATING_SYSTEMS.find((os) => os.name === osName);
  if (!osConfig) {
    throw new Error(`Unknown operating system: ${osName}`);
  }

  // Verwende die neue parseLine-Methode zum Extrahieren der Nachrichtendaten.
  for (const line of lines) {
    const result = osConfig.parseLine(line);
    if (!result) continue;

    messages.push({
      date: result.date,
      time: result.time,
      sender: result.sender,
      message: result.message,
    });
  }

  // Filter messages based on language-specific ignore lines.
  const language = detectLanguage(messages);
  const ignoreLines = await loadIgnoreLines(language);
  const filteredMessages = messages.filter(
    (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore)),
  );

  // Determine metadata from the filtered messages.
  const firstMessageDate = filteredMessages[0]?.date || new Date();
  const lastMessageDate = filteredMessages[filteredMessages.length - 1]?.date || new Date();
  const senders: Record<string, number> = {};
  filteredMessages.forEach((msg) => {
    senders[msg.sender] = (senders[msg.sender] || 0) + 1;
  });
  const senderNames = Object.keys(senders);
  const abbreviatedList = abbreviateContacts(senderNames);
  const sendersShort: Record<string, string> = {};
  senderNames.forEach((sender, index) => {
    sendersShort[sender] = abbreviatedList[index];
  });

  const metadata: ChatMetadata = {
    language,
    os: osName,
    firstMessageDate,
    lastMessageDate,
    senders,
    fileName,
    sendersShort,
  };

  return { messages: filteredMessages, metadata };
};
