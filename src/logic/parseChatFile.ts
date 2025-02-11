// src/logic/parseChatFile.ts
import { ChatMessage, ChatMetadata } from "../types/chatTypes";
import { franc } from "franc-min";
import { IOS_REGEX, ANDROID_REGEX } from "../config/constants";

const detectOS = (lines: string[]): "ios" | "android" => {
  let iosCount = 0;
  let androidCount = 0;
  for (const line of lines.slice(0, 100)) {
    if (IOS_REGEX.test(line)) iosCount++;
    if (ANDROID_REGEX.test(line)) androidCount++;
  }
  return iosCount >= androidCount ? "ios" : "android";
};

const detectLanguage = (messages: ChatMessage[]): "de" | "en" | "fr" | "es" => {
  const sampleText = messages
    .slice(0, 100)
    .map((m) => m.message)
    .join(" ");
  const langCode = franc(sampleText, { minLength: 3 });
  const langMap: Record<string, "de" | "en" | "fr" | "es"> = {
    deu: "de",
    eng: "en",
    fra: "fr",
    spa: "es",
  };
  return langMap[langCode] || "en";
};

const loadIgnoreLines = async (lang: string, os: string): Promise<string[]> => {
  const fileName = `ignore_lines_${lang}_${os}.txt`;
  const primaryPath = `src/assets/${fileName}`;
  const fallbackPath = `/files/${fileName}`;

  try {
    const response = await fetch(primaryPath);
    if (!response.ok) throw new Error(`Datei nicht gefunden: ${primaryPath}`);

    return (await response.text())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    console.warn(`⚠️ Fehler beim Laden, versuche Fallback: ${fallbackPath}`);
    const fallbackResponse = await fetch(fallbackPath);
    if (!fallbackResponse.ok)
      throw new Error(`Fallback-Datei nicht gefunden: ${fallbackPath}`);

    return (await fallbackResponse.text())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
};

export const parseChatFile = async (
  content: string,
  fileName: string
): Promise<{ messages: ChatMessage[]; metadata: ChatMetadata }> => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("Datei ist leer oder ungültig.");
  }
  const os = detectOS(lines);
  const messages: ChatMessage[] = [];
  for (const line of lines) {
    let match;
    if (os === "ios") {
      match = line.match(IOS_REGEX);
    } else {
      match = line.match(ANDROID_REGEX);
    }
    if (match) {
      const dateParts = match[1].split(".");
      let formattedDateStr: string;
      if (os === "ios") {
        formattedDateStr = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      } else {
        formattedDateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
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
    (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore))
  );
  const firstMessageDate = filteredMessages[0]?.date || new Date();
  const lastMessageDate =
    filteredMessages[filteredMessages.length - 1]?.date || new Date();
  const senders: Record<string, number> = {};
  filteredMessages.forEach((msg) => {
    senders[msg.sender] = (senders[msg.sender] || 0) + 1;
  });
  const metadata: ChatMetadata = {
    language,
    os,
    firstMessageDate,
    lastMessageDate,
    senders,
    fileName, // Dateiname wird in den Metadaten gespeichert
  };
  return { messages: filteredMessages, metadata };
};
