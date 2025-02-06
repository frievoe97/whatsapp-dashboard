/**
 * Web Worker for parsing WhatsApp chat files.
 *
 * This worker processes incoming chat data, extracts structured messages,
 * filters out unwanted entries, and sends the parsed messages back to the main thread.
 */

interface ParsedMessage {
  date: Date;
  sender: string;
  message: string;
  isUsed: boolean;
}

interface ErrorMessage {
  error: string;
}

// Regular expression for parsing chat messages.
const MESSAGE_REGEX =
  /^\[(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/u;

// Regular expression for removing unwanted Unicode characters.
const UNWANTED_UNICODE_REGEX = /[\u200E\u200F\u202A-\u202E]/gu;

// List of substrings indicating messages to ignore.
const IGNORE_STRINGS: string[] = [
  "weggelassen",
  "hast den Gruppennamen",
  "hat dich hinzugefügt",
  "sicherheitsnummer",
  "Ende-zu-Ende-verschlüssel",
  "erheitsnummer für alle Mitglieder hat sich geänd",
];

/**
 * Checks whether a given message should be ignored based on the configured ignore strings.
 *
 * @param message - The message content to check.
 * @returns True if the message contains any ignore string, false otherwise.
 */
function shouldIgnoreMessage(message: string): boolean {
  return IGNORE_STRINGS.some((ignoreStr) =>
    message.toLowerCase().includes(ignoreStr.toLowerCase())
  );
}

/**
 * If a current message exists and should not be ignored, push it into the messages array.
 *
 * @param currentMessage - The current parsed message object.
 * @param messages - The array of parsed messages to update.
 */
function processCurrentMessage(
  currentMessage: ParsedMessage | null,
  messages: ParsedMessage[]
): void {
  if (currentMessage && !shouldIgnoreMessage(currentMessage.message)) {
    messages.push(currentMessage);
  }
}

/**
 * Parses a single line from the chat file.
 *
 * Cleans the line from unwanted Unicode characters and tries to extract a valid message using a regex.
 *
 * @param line - A line from the chat file.
 * @returns An object with parsed date, sender, and message if matching; otherwise, null.
 */
function parseMessageLine(
  line: string
): { date: Date; sender: string; message: string } | null {
  const cleanedLine = line.replace(UNWANTED_UNICODE_REGEX, "").trim();
  const match = cleanedLine.match(MESSAGE_REGEX);

  if (match) {
    const [, day, month, year, time, sender, message] = match;
    const dateTimeStr = `20${year}-${month}-${day}T${time}`;
    const parsedDate = new Date(dateTimeStr);

    if (isNaN(parsedDate.getTime())) {
      console.warn(`Worker: Invalid date parsed from "${dateTimeStr}"`);
      return null;
    }

    return { date: parsedDate, sender, message };
  }

  return null;
}

// Main event listener for processing the chat file.
self.addEventListener("message", (event: MessageEvent<string>) => {
  try {
    const fileContent: string = event.data;

    const lines = fileContent.split("\n");
    const messages: ParsedMessage[] = [];
    let currentMessage: ParsedMessage | null = null;

    lines.forEach((line: string, index: number) => {
      const parsedLine = parseMessageLine(line);

      if (parsedLine) {
        // When a new message is detected, process the previous one.
        processCurrentMessage(currentMessage, messages);

        // Start a new message.
        currentMessage = {
          date: parsedLine.date,
          sender: parsedLine.sender,
          message: parsedLine.message,
          isUsed: true,
        };
      } else {
        // Continuation of the previous multi-line message.
        if (currentMessage) {
          const cleanedLine = line.replace(UNWANTED_UNICODE_REGEX, "").trim();
          currentMessage.message += `\n${cleanedLine}`;
        } else {
          console.warn(
            `Worker: Unmatched line ${index + 1}: "${line
              .replace(UNWANTED_UNICODE_REGEX, "")
              .trim()}"`
          );
        }
      }
    });

    // Process any remaining message after the loop.
    processCurrentMessage(currentMessage, messages);

    // Debug logging: Identify messages that contain "weggelassen".
    const weggelassenMessages = messages.filter((msg) =>
      msg.message.toLowerCase().includes("weggelassen")
    );
    if (weggelassenMessages.length > 0) {
      console.log(
        `Worker: Found ${weggelassenMessages.length} messages containing "weggelassen":`,
        weggelassenMessages
      );
    }

    // Post the parsed messages back to the main thread.
    self.postMessage(messages);
  } catch (error) {
    const errorMessage: ErrorMessage = { error: (error as Error).message };
    console.error("Worker: Error processing file", error);
    self.postMessage(errorMessage);
  }
});
