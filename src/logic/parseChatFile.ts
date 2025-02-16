// src/logic/parseChatFile.ts
import { ChatMessage, ChatMetadata } from '../types/chatTypes';
import { franc } from 'franc-min';
import { extractMessageData, OPERATING_SYSTEMS } from '../config/constants';
import { abbreviateContacts } from '../utils/abbreviateContacts';

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
 * This function loads the ignore lines from the server.
 * @param lang Language of the chat
 * @param os Operating system of the chat
 * @returns Array of ignore lines
 */
const loadIgnoreLines = async (lang: string): Promise<string[]> => {
  const fileName = `ignore_lines_${lang}.txt`;
  const fileNamePath = `/files/${fileName}`;

  const fileNamePathResponse = await fetch(fileNamePath);

  if (!fileNamePathResponse.ok) throw new Error(`Fallback-Datei nicht gefunden: ${fileNamePath}`);

  const lines = (await fileNamePathResponse.text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines;
};

export const parseChatFile = async (
  content: string,
  fileName: string,
): Promise<{ messages: ChatMessage[]; metadata: ChatMetadata }> => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Datei ist leer oder ungültig.');
  }

  const messages: ChatMessage[] = [];

  const osName = detectOS(lines);
  const osConfig = OPERATING_SYSTEMS.find((os) => os.name === osName);

  if (!osConfig) {
    throw new Error(`Unbekanntes Betriebssystem: ${osName}`);
  }

  for (const line of lines) {
    const match = line.match(osConfig.regex);

    if (match) {
      const result = extractMessageData(match, osName);

      if (!result) continue;

      console.log(result);

      const { date, time, sender, message } = result;

      // const formattedDateStr = osConfig.parseDate(match[1]);
      const formattedDateStr = osConfig.parseDate(date);

      // const time2 = osConfig.parseTime(match[2],  match[3],match[4]);

      messages.push({
        date: new Date(formattedDateStr),
        time: time,
        sender: sender,
        message: message,
      });
    }
  }

  const language = detectLanguage(messages);
  const ignoreLines = await loadIgnoreLines(language);
  const filteredMessages = messages.filter(
    (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore)),
  );
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
    language: language,
    os: osName,
    firstMessageDate: firstMessageDate,
    lastMessageDate: lastMessageDate,
    senders: senders,
    fileName: fileName,
    sendersShort: sendersShort,
  };

  return { messages: filteredMessages, metadata };
};
