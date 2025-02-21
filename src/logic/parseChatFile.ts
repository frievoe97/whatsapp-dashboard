// src/logic/parseChatFile.ts

/////////////////////// Imports ///////////////////////
import { ChatMessage, ChatMetadata } from '../types/chatTypes';
import { franc } from 'franc-min';
import * as whatsapp from 'whatsapp-chat-parser';
import { abbreviateContacts } from '../utils/abbreviateContacts';

/////////////////////// Utility Functions ///////////////////////

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

  console.log('Lines: ', lines);

  return lines;
};

/**
 * Parses a Date object into a string in the format 'HH:mm:ss'.
 * @param date Date object to be formatted.
 * @returns Formatted time string.
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

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
  if (!content.trim()) {
    throw new Error('The file is empty or invalid.');
  }

  const messages: ChatMessage[] = [];
  const parsedData = whatsapp.parseString(content);

  for (const data of parsedData) {
    if (!data.author) continue;

    messages.push({
      date: data.date,
      time: formatTime(data.date),
      sender: data.author,
      message: data.message,
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
    firstMessageDate,
    lastMessageDate,
    senders,
    fileName,
    sendersShort,
  };

  return { messages: filteredMessages, metadata };
};
