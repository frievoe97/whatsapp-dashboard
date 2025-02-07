/**
 * WhatsApp Chat Parsing Web Worker
 *
 * This worker is responsible for parsing WhatsApp chat files originating from either
 * iOS or Android. It processes incoming raw chat data (as a string), detects the
 * format used, extracts structured messages, filters out unwanted entries, and
 * communicates the final structured messages array back to the main thread.
 *
 * The worker expects the entire chat file content as a single string via
 * a "message" event. It will then:
 *   1) Detect whether the chat format is iOS or Android based on the first
 *      100 lines (or fewer, if the file has less than 100 lines).
 *   2) Parse each line according to the detected format.
 *   3) Accumulate multiline messages.
 *   4) Filter out unwanted or irrelevant lines (e.g., system messages).
 *   5) Return the final array of `ParsedMessage` objects to the main thread.
 */

// -------------------------- INTERFACES ------------------------------

/**
 * Represents a single parsed WhatsApp message.
 */
interface ParsedMessage {
  /** Date object representing the date/time the message was sent */
  date: Date;
  /** Name or identifier of the sender */
  sender: string;
  /** The message text itself (may include multiple lines) */
  message: string;
  /** Flag indicating whether this message is considered "used" in further processing */
  isUsed: boolean;
}

/**
 * Represents an error message sent from the worker back to the main thread.
 */
interface ErrorMessage {
  /** Text describing what went wrong */
  error: string;
}

// --------------------- REGEX DEFINITIONS ----------------------------

/**
 * iOS format example:
 * [DD.MM.YY, HH:MM:SS] Name: Message
 *
 * Example:
 * [05.01.21, 14:55:32] Alice: Hello Bob!
 */
const IOS_MESSAGE_REGEX =
  /^\[(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/u;

/**
 * Android format example:
 * DD.MM.YY, HH:MM - Name: Message
 * or DD.MM.YY, HH:MM:SS - Name: Message
 *
 * Example:
 * 05.01.21, 14:55 - Alice: Hello Bob!
 * 05.01.21, 14:55:32 - Alice: Another line
 */
const ANDROID_MESSAGE_REGEX =
  /^(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}(?::\d{2})?) - (.*?): (.*)$/u;

/**
 * A list of unwanted Unicode control characters that we strip out of messages.
 */
const UNWANTED_UNICODE_REGEX = /[\u200E\u200F\u202A-\u202E]/gu;

/**
 * Substrings indicating that a message should be ignored entirely.
 * Typically these are system messages or lines we do not need to parse.
 */
const IGNORE_STRINGS: string[] = [
  "weggelassen",
  "hast den Gruppennamen",
  "hat dich hinzugefügt",
  "sicherheitsnummer",
  "Ende-zu-Ende-verschlüssel",
  "erheitsnummer für alle Mitglieder hat sich geänd",
];

// ------------------ HELPER / UTILITY FUNCTIONS ----------------------

/**
 * Checks whether a given message should be ignored based on the
 * `IGNORE_STRINGS` list. A message is ignored if it contains
 * any of the configured substrings (case-insensitive).
 *
 * @param message - The message text to examine
 * @returns `true` if the message should be ignored, otherwise `false`
 */
function shouldIgnoreMessage(message?: string): boolean {
  if (!message) return false; // If it's an empty or undefined message, do not ignore by default
  return IGNORE_STRINGS.some((ignoreStr) =>
    message.toLowerCase().includes(ignoreStr.toLowerCase())
  );
}

/**
 * Pushes the current message into the `messages` array if it is defined
 * and not set to be ignored.
 *
 * @param currentMessage - The ParsedMessage object currently being built
 * @param messages - The array of parsed messages to which we add valid messages
 */
function processCurrentMessage(
  currentMessage: ParsedMessage | null,
  messages: ParsedMessage[]
): void {
  if (currentMessage && !shouldIgnoreMessage(currentMessage.message)) {
    messages.push(currentMessage);
  }
}

// ------------------- LINE-BY-LINE PARSING ---------------------------

/**
 * Attempts to parse a single line in iOS format.
 *
 * Example line: `[05.01.21, 14:55:32] Alice: Hello Bob!`
 *
 * @param line - A single line (already stripped of unwanted unicode)
 * @returns An object with `date`, `sender`, `message` if parsed successfully, otherwise `null`
 */
function parseIosLine(
  line: string
): { date: Date; sender: string; message: string } | null {
  const match = line.match(IOS_MESSAGE_REGEX);
  if (!match) return null;

  // match array: [full, day, month, year, time, sender, message]
  const [, day, month, year, time, sender, message] = match;
  const dateTimeStr = `20${year}-${month}-${day}T${time}`;
  const parsedDate = new Date(dateTimeStr);

  // If the date is invalid, return null
  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return { date: parsedDate, sender, message };
}

/**
 * Attempts to parse a single line in Android format.
 *
 * Example line: `05.01.21, 14:55 - Alice: Hello Bob!`
 *
 * @param line - A single line (already stripped of unwanted unicode)
 * @returns An object with `date`, `sender`, `message` if parsed successfully, otherwise `null`
 */
function parseAndroidLine(
  line: string
): { date: Date; sender: string; message: string } | null {
  const match = line.match(ANDROID_MESSAGE_REGEX);
  if (!match) return null;

  // match array: [full, day, month, year, time, sender, message]
  let [, day, month, year, time, sender, message] = match;

  if (!sender || !message) {
    return null;
  }

  // If the time is missing seconds (e.g., HH:MM), append ":00"
  if (/^\d{2}:\d{2}$/.test(time)) {
    time += ":00";
  }

  const dateTimeStr = `20${year}-${month}-${day}T${time}`;
  const parsedDate = new Date(dateTimeStr);

  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return { date: parsedDate, sender, message };
}

/**
 * Parses a line either as iOS or Android format, depending on the `format` parameter.
 * It also removes unwanted unicode characters and trims whitespace before attempting the parse.
 *
 * @param line - A single raw line from the chat file
 * @param format - Either "ios" or "android"
 * @returns An object with `date`, `sender`, `message` if parsed successfully, otherwise `null`
 */
function parseLineWithFormat(
  line: string,
  format: "ios" | "android"
): { date: Date; sender: string; message: string } | null {
  const cleanedLine = line.replace(UNWANTED_UNICODE_REGEX, "").trim();

  // We only consider lines that contain a colon; system lines often don't
  // This should be deprecated...
  if (!cleanedLine.includes(":")) {
    return null;
  }

  if (format === "ios") {
    return parseIosLine(cleanedLine);
  } else {
    return parseAndroidLine(cleanedLine);
  }
}

// ----------------- FORMAT DETECTION LOGIC ---------------------------

/**
 * Detects whether the chat file is more likely to be in iOS or Android format.
 * It does so by testing up to the first 100 lines, counting how many match
 * the iOS regex vs. the Android regex.
 *
 * If iOS matches are >= Android matches, we assume iOS; otherwise Android.
 *
 * @param lines - Array of all lines in the chat file
 * @returns "ios" or "android"
 */
function detectFormat(lines: string[]): "ios" | "android" {
  let iosCount = 0;
  let androidCount = 0;
  const sampleSize = Math.min(lines.length, 100);

  for (let i = 0; i < sampleSize; i++) {
    const rawLine = lines[i];
    const cleanedLine = rawLine.replace(UNWANTED_UNICODE_REGEX, "").trim();

    // Increment counters if there's a match
    if (IOS_MESSAGE_REGEX.test(cleanedLine)) {
      iosCount++;
    } else if (ANDROID_MESSAGE_REGEX.test(cleanedLine)) {
      androidCount++;
    }
  }

  // If iOS matches >= Android matches, choose iOS; otherwise Android
  return iosCount >= androidCount ? "ios" : "android";
}

// -------------------- MAIN WORKER LOGIC -----------------------------

/**
 * Listens for incoming messages, which should contain the raw chat file content.
 * Once received, it:
 *   1. Splits the content by newline.
 *   2. Detects the format (iOS or Android).
 *   3. Parses each line, either creating a new message or appending to the current one.
 *   4. Filters out ignored messages.
 *   5. Sends the array of parsed messages (or an error) back to the main thread.
 */

self.addEventListener(
  "message",
  (event: MessageEvent<{ fileContent: string; format: string }>) => {
    try {
      // 1) Extract raw file content
      const { fileContent } = event.data;
      // 2) Split content into lines
      const lines = fileContent.split("\n");
      // This will hold the final list of parsed messages
      const messages: ParsedMessage[] = [];
      // This will track the current multi-line message we are building
      let currentMessage: ParsedMessage | null = null;

      // 3) Detect whether this is iOS or Android format
      const chosenFormat = detectFormat(lines);

      console.log(`Worker: Detected format "${chosenFormat}". Parsing...`);

      // 4) Go through each line and parse
      lines.forEach((line: string) => {
        const parsedLine = parseLineWithFormat(line, chosenFormat);

        if (parsedLine) {
          // We encountered a "new" message, so close off the old one
          processCurrentMessage(currentMessage, messages);

          // Start a new message object
          currentMessage = {
            date: parsedLine.date,
            sender: parsedLine.sender,
            message: parsedLine.message,
            isUsed: true,
          };
        } else {
          // This line doesn't match a new message format
          // -> could be a continuation of the current multi-line message
          if (currentMessage) {
            const cleanedLine = line.replace(UNWANTED_UNICODE_REGEX, "").trim();
            currentMessage.message += `\n${cleanedLine}`;
          } else {
            // If there's no currentMessage, it's likely a system or irrelevant line -> ignore
          }
        }
      });

      // 5) Make sure the last message is accounted for
      processCurrentMessage(currentMessage, messages);

      // 6) Post the resulting parsed messages array back
      self.postMessage({ messages, chosenFormat });
    } catch (error) {
      const errorMessage: ErrorMessage = { error: (error as Error).message };
      console.error("Worker: Error processing file:", error);
      self.postMessage(errorMessage);
    }
  }
);
