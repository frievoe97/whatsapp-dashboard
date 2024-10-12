// fileParser.worker.ts

// Definiere die Struktur der verarbeiteten Nachrichten
interface ParsedMessage {
  date: Date;
  sender: string;
  message: string;
  isUsed: boolean;
}

// Definiere die Struktur der Fehlermeldung
interface ErrorMessage {
  error: string;
}

// Regex zum Parsen der Nachrichten
const messageRegex =
  /^\[(\d{2})\.(\d{2})\.(\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/;

// Regex zum Entfernen unerwünschter Unicode-Zeichen (z.B. U+200E, U+200F, etc.)
const unwantedUnicodeRegex = /[\u200E\u200F\u202A-\u202E]/g;

// Liste der Strings, deren Nachrichten ignoriert werden sollen
const ignoreStrings: string[] = [
  "weggelassen",
  "hast den Gruppennamen",
  "hat dich hinzugefügt",
  "Ende-zu-Ende-verschlüssel",
  "erheitsnummer für alle Mitglieder hat sich geänd",
  // Weitere Strings können hier hinzugefügt werden
];

// Füge einen Event-Listener für eingehende Nachrichten hinzu
self.addEventListener("message", (event: MessageEvent<string>) => {
  console.log("Worker: Nachricht empfangen");

  try {
    const fileContent: string = event.data;
    console.log(
      `Worker: Empfangene Dateigröße - ${fileContent.length} Zeichen`
    );

    // **Zusätzliches Logging zur Überprüfung der ersten paar Zeilen**
    const previewLines = fileContent.split("\n").slice(0, 5).join("\n");
    console.log("Worker: Vorschau der ersten 5 Zeilen:\n", previewLines);

    const lines: string[] = fileContent.split("\n");
    // console.log(`Worker: Anzahl der Zeilen - ${lines.length}`);

    const messages: ParsedMessage[] = [];
    let currentMessage: ParsedMessage | null = null;

    lines.forEach((line: string, index: number) => {
      // Entferne unerwünschte Unicode-Zeichen und trimme die Zeile
      const cleanedLine = line.replace(unwantedUnicodeRegex, "").trim();

      // Optional: Logge die Original- und bereinigte Zeile, wenn Bereinigung stattgefunden hat
      if (line !== cleanedLine) {
        // console.warn(
        //   `Worker: Unerwünschte Unicode-Zeichen in Zeile ${index + 1} entfernt.`
        // );
        console.debug(`Original: "${line}"`);
        console.debug(`Bereinigt: "${cleanedLine}"`);
      }

      const match = cleanedLine.match(messageRegex);

      if (match) {
        const [, day, month, year, time, sender, message] = match;

        // Kombiniere Datum und Uhrzeit zu einem vollständigen Datum-Zeit-String
        const dateTimeStr = `20${year}-${month}-${day}T${time}`;

        // Erstelle das Date-Objekt mit Datum und Uhrzeit
        const parsedDate = new Date(dateTimeStr);

        // Überprüfe, ob das Datum gültig ist
        if (isNaN(parsedDate.getTime())) {
          console.warn(
            `Worker: Ungültiges Datum in Zeile ${index + 1}: ${dateTimeStr}`
          );
          return;
        }

        // **Überprüfe die vorherige Nachricht auf Ignorier-Strings und füge sie hinzu, falls nicht ignoriert**
        if (currentMessage) {
          const shouldIgnore = ignoreStrings.some((str) =>
            currentMessage?.message.toLowerCase().includes(str.toLowerCase())
          );

          if (shouldIgnore) {
            // console.info(
            //   `Worker: Nachricht in Zeile ${
            //     index // Hinweis: Dies bezieht sich auf die vorherige Nachricht
            //   } ignoriert aufgrund von Übereinstimmung mit Ignorier-Strings.`
            // );
            // Nachricht ignorieren, daher nicht hinzufügen
          } else {
            messages.push(currentMessage);
          }
        }

        // Starte eine neue Nachricht
        currentMessage = {
          date: parsedDate,
          sender,
          message,
          isUsed: true,
        };
      } else {
        // Wenn die Zeile nicht zum Regex passt, könnte es eine Fortsetzung der vorherigen Nachricht sein
        if (currentMessage) {
          currentMessage.message += `\n${cleanedLine}`;
        } else {
          console.warn(
            `Worker: Zeile ${
              index + 1
            } passt nicht zum Regex und es gibt keine vorherige Nachricht: "${cleanedLine}"`
          );
          // Optional: Logge die Zeile für weitere Analyse
          console.debug(`Nicht geparste Zeile: "${cleanedLine}"`);
        }
      }
    });

    // Füge die letzte Nachricht hinzu, falls vorhanden und nicht ignoriert
    if (currentMessage) {
      const shouldIgnore = ignoreStrings.some((str) =>
        currentMessage?.message.toLowerCase().includes(str.toLowerCase())
      );

      if (!shouldIgnore) {
        messages.push(currentMessage);
      } else {
        console.info(
          `Worker: Letzte Nachricht ignoriert aufgrund von Übereinstimmung mit Ignorier-Strings.`
        );
      }
    }

    console.log("Worker: Alle Nachrichten wurden geparst.");

    // Logge alle Nachrichten, die das Wort "weggelassen" enthalten
    const weggelassenMessages = messages.filter((msg) =>
      msg.message.toLowerCase().includes("weggelassen")
    );

    if (weggelassenMessages.length > 0) {
      console.log(
        `Worker: Nachrichten mit dem Wort "weggelassen" gefunden (${weggelassenMessages.length}):`,
        weggelassenMessages
      );
    } else {
      console.log(
        'Worker: Keine Nachrichten mit dem Wort "weggelassen" gefunden.'
      );
    }

    self.postMessage(messages);
  } catch (error) {
    const errorMessage: ErrorMessage = { error: (error as Error).message };
    console.error("Worker: Fehler beim Verarbeiten der Datei", error);
    self.postMessage(errorMessage);
  }
});
