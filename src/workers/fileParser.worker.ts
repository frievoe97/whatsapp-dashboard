/**
 * Web Worker for parsing WhatsApp chat files.
 *
 * This worker processes incoming chat data, extracts structured messages,
 * filters out unwanted entries, and sends the parsed messages back to the main thread.
 */

// Define the structure of a parsed chat message
interface ParsedMessage {
  date: Date;
  sender: string;
  message: string;
  isUsed: boolean;
}

// Define the structure of an error message
interface ErrorMessage {
  error: string;
}

// Regular expression for parsing chat messages
const messageRegex =
  /^\[(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/u;

// Regular expression for removing unwanted Unicode characters
const unwantedUnicodeRegex = /[\u200E\u200F\u202A-\u202E]/gu;

// List of substrings indicating messages to ignore
const ignoreStrings: string[] = [
  "weggelassen",
  "hast den Gruppennamen",
  "hat dich hinzugefügt",
  "sicherheitsnummer",
  "Ende-zu-Ende-verschlüssel",
  "erheitsnummer für alle Mitglieder hat sich geänd",
];

/**
 * Event listener for handling incoming messages containing chat data.
 */
self.addEventListener("message", (event: MessageEvent<string>) => {
  console.log("Worker: Message received");

  try {
    const fileContent: string = event.data;
    console.log(
      `Worker: Received file size - ${fileContent.length} characters`
    );

    const lines: string[] = fileContent.split("\n");
    const messages: ParsedMessage[] = [];
    let currentMessage: ParsedMessage | null = null;

    lines.forEach((line: string, index: number) => {
      const cleanedLine = line.replace(unwantedUnicodeRegex, "").trim();
      const match = cleanedLine.match(messageRegex);

      if (match) {
        const [, day, month, year, time, sender, message] = match;
        const dateTimeStr = `20${year}-${month}-${day}T${time}`;
        const parsedDate = new Date(dateTimeStr);

        if (isNaN(parsedDate.getTime())) {
          console.warn(
            `Worker: Invalid date in line ${index + 1}: ${dateTimeStr}`
          );
          return;
        }

        if (currentMessage) {
          const shouldIgnore = ignoreStrings.some((str) =>
            currentMessage?.message.toLowerCase().includes(str.toLowerCase())
          );
          if (!shouldIgnore) {
            messages.push(currentMessage);
          }
        }

        currentMessage = { date: parsedDate, sender, message, isUsed: true };
      } else {
        if (currentMessage) {
          currentMessage.message += `\n${cleanedLine}`;
        } else {
          console.warn(`Worker: Unmatched line ${index + 1}: "${cleanedLine}"`);
        }
      }
    });

    if (currentMessage) {
      const shouldIgnore = ignoreStrings.some((str) =>
        currentMessage?.message.toLowerCase().includes(str.toLowerCase())
      );
      if (!shouldIgnore) {
        messages.push(currentMessage);
      }
    }

    console.log("Worker: Parsing complete.");

    const weggelassenMessages = messages.filter((msg) =>
      msg.message.toLowerCase().includes("weggelassen")
    );

    if (weggelassenMessages.length > 0) {
      console.log(
        `Worker: Found messages containing "weggelassen" (${weggelassenMessages.length}):`,
        weggelassenMessages
      );
    } else {
      console.log('Worker: No messages containing "weggelassen" found.');
    }

    self.postMessage(messages);
  } catch (error) {
    const errorMessage: ErrorMessage = { error: (error as Error).message };
    console.error("Worker: Error processing file", error);
    self.postMessage(errorMessage);
  }
});
