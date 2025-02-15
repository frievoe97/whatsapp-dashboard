// src/logic/parseChatFile.ts
import { ChatMessage, ChatMetadata } from '../types/chatTypes';
import { franc } from 'franc-min';
import { IOS_REGEX, ANDROID_REGEX } from '../config/constants';
import { abbreviateContacts } from '../utils/abbreviateContacts';

const detectOS = (lines: string[]): 'ios' | 'android' => {
  let iosCount = 0;
  let androidCount = 0;
  for (const line of lines.slice(0, 100)) {
    if (IOS_REGEX.test(line)) iosCount++;
    if (ANDROID_REGEX.test(line)) androidCount++;
  }
  return iosCount >= androidCount ? 'ios' : 'android';
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
const loadIgnoreLines = async (lang: string, os: string): Promise<string[]> => {
  const fileName = `ignore_lines_${lang}_${os}.txt`;
  const fileNamePath = `/files/${fileName}`;

  const fileNamePathResponse = await fetch(fileNamePath);

  if (!fileNamePathResponse.ok) throw new Error(`Fallback-Datei nicht gefunden: ${fileNamePath}`);

  const lines = (await fileNamePathResponse.text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // console.log("Load these ignore lines: ", lines, " from ", fileNamePath);

  return lines;
};

export const parseChatFile = async (
  content: string,
  fileName: string,
): Promise<{ messages: ChatMessage[]; metadata: ChatMetadata }> => {
  console.log('Start parsing chat file: ', fileName);

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Datei ist leer oder ungültig.');
  }
  const os = detectOS(lines);
  console.log('Detected OS: ', os);
  const messages: ChatMessage[] = [];
  for (const line of lines) {
    let match;
    if (os === 'ios') {
      match = line.match(IOS_REGEX);
    } else {
      match = line.match(ANDROID_REGEX);
    }
    if (match) {
      const dateParts = match[1].split('.');
      let formattedDateStr: string;
      if (os === 'ios') {
        formattedDateStr = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      } else {
        formattedDateStr = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      }

      messages.push({
        date: new Date(formattedDateStr),
        time: match[2],
        sender: match[3],
        message: match[4],
      });
    }
  }

  const language = detectLanguage(messages);
  const ignoreLines = await loadIgnoreLines(language, os);
  const filteredMessages = messages.filter(
    (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore)),
  );
  const firstMessageDate = filteredMessages[0]?.date || new Date();
  const lastMessageDate = filteredMessages[filteredMessages.length - 1]?.date || new Date();

  console.log('First message: ', filteredMessages[0]);
  console.log('Last message: ', filteredMessages[filteredMessages.length - 1]);

  const senders: Record<string, number> = {};
  filteredMessages.forEach((msg) => {
    senders[msg.sender] = (senders[msg.sender] || 0) + 1;
  });

  console.log('Number of filtered messages: ', filteredMessages.length);

  const senderNames = Object.keys(senders);
  console.log('Number of senders: ', senderNames.length);
  const abbreviatedList = abbreviateContacts(senderNames);
  const sendersShort: Record<string, string> = {};
  senderNames.forEach((sender, index) => {
    sendersShort[sender] = abbreviatedList[index];
  });

  // console.log("Detected language: ", language);
  // console.log("Senders: ", senders);

  const metadata: ChatMetadata = {
    language: language,
    os: os,
    firstMessageDate: firstMessageDate,
    lastMessageDate: lastMessageDate,
    senders: senders,
    fileName: fileName,
    sendersShort: sendersShort,
  };
  console.log('Filtered messages: ', filteredMessages);
  console.log('Metadata: ', metadata);
  console.log('Parsing done.');
  return { messages: filteredMessages, metadata };
};
