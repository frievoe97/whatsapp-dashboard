// src/workers/fileParser.worker.ts

interface ParsedMessage {
  date: Date;
  sender: string;
  message: string;
  isUsed: boolean;
}

interface ErrorMessage {
  error: string;
}

const IOS_MESSAGE_REGEX =
  /^\[(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/u;
const ANDROID_MESSAGE_REGEX =
  /^(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}(?::\d{2})?) - (.*?): (.*)$/u;
const UNWANTED_UNICODE_REGEX = /[\u200E\u200F\u202A-\u202E]/gu;

/**
 * Prüft, ob eine Nachricht anhand einer Ignore‑Liste übersprungen werden soll.
 */
function shouldIgnoreMessage(message: string): boolean {
  // Hier können ggf. statische Strings ergänzt werden, falls nötig.
  const ignoreList: string[] = [];
  return ignoreList.some((ignore) =>
    message.toLowerCase().includes(ignore.toLowerCase())
  );
}

/**
 * Fügt die aktuell zusammengebaute Nachricht in das Nachrichten-Array ein.
 */
function processCurrentMessage(
  current: ParsedMessage | null,
  messages: ParsedMessage[]
): void {
  if (current && !shouldIgnoreMessage(current.message)) {
    messages.push(current);
  }
}

/**
 * Parst eine Zeile im iOS-Format.
 */
function parseIosLine(
  line: string
): { date: Date; sender: string; message: string } | null {
  const match = line.match(IOS_MESSAGE_REGEX);
  if (!match) return null;
  const [, day, month, year, time, sender, message] = match;
  const dateTimeStr = `20${year}-${month}-${day}T${time}`;
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return null;
  return { date, sender, message };
}

/**
 * Parst eine Zeile im Android-Format.
 */
function parseAndroidLine(
  line: string
): { date: Date; sender: string; message: string } | null {
  const match = line.match(ANDROID_MESSAGE_REGEX);
  if (!match) return null;
  let [, day, month, year, time, sender, message] = match;
  if (/^\d{2}:\d{2}$/.test(time)) {
    time += ":00";
  }
  const dateTimeStr = `20${year}-${month}-${day}T${time}`;
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return null;
  return { date, sender, message };
}

/**
 * Parst eine Zeile abhängig vom angegebenen Format.
 */
function parseLine(
  line: string,
  format: "ios" | "android"
): { date: Date; sender: string; message: string } | null {
  const cleaned = line.replace(UNWANTED_UNICODE_REGEX, "").trim();
  if (!cleaned.includes(":")) return null;
  return format === "ios" ? parseIosLine(cleaned) : parseAndroidLine(cleaned);
}

/**
 * Ermittelt anhand der ersten 100 Zeilen das wahrscheinliche Format (iOS vs. Android).
 */
function detectFormat(lines: string[]): "ios" | "android" {
  let iosCount = 0;
  let androidCount = 0;
  const sampleSize = Math.min(lines.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i].replace(UNWANTED_UNICODE_REGEX, "").trim();
    if (IOS_MESSAGE_REGEX.test(line)) iosCount++;
    else if (ANDROID_MESSAGE_REGEX.test(line)) androidCount++;
  }
  return iosCount >= androidCount ? "ios" : "android";
}

self.addEventListener(
  "message",
  (event: MessageEvent<{ fileContent: string; format: string }>) => {
    try {
      const { fileContent } = event.data;
      const lines = fileContent.split("\n");
      const chosenFormat = detectFormat(lines);
      const messages: ParsedMessage[] = [];
      let current: ParsedMessage | null = null;

      lines.forEach((line) => {
        const parsed = parseLine(line, chosenFormat);
        if (parsed) {
          processCurrentMessage(current, messages);
          current = {
            date: parsed.date,
            sender: parsed.sender,
            message: parsed.message,
            isUsed: true,
          };
        } else if (current) {
          const cleaned = line.replace(UNWANTED_UNICODE_REGEX, "").trim();
          current.message += `\n${cleaned}`;
        }
      });
      processCurrentMessage(current, messages);
      self.postMessage({ messages, chosenFormat });
    } catch (error) {
      const errMsg: ErrorMessage = { error: (error as Error).message };
      console.error("ParserWorker error:", error);
      self.postMessage(errMsg);
    }
  }
);
