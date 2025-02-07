// src/hooks/useChatProcessing.ts
import { franc } from "franc-min";
import { useChat, ChatMessage } from "../context/ChatContext";

interface ParsedResult {
  messages: ChatMessage[];
  chosenFormat: "ios" | "android";
}

/**
 * Dieser Hook kapselt den kompletten Ablauf vom Datei‑Lesen, Parsen (über den Worker),
 * dem Laden der passenden Ignore‑Datei und dem Setzen der initialen Filter.
 */
export function useChatProcessing() {
  const {
    setMessages,
    setOriginalMessages,
    setLanguage,
    setFormat,
    setStartDate,
    setEndDate,
    setSelectedSender,
    setManualSenderSelection,
    setIsUploading,
    setFileName,
  } = useChat();

  const readFileContent = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) resolve(e.target.result.toString());
        else reject(new Error("File reading error"));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, "UTF-8");
    });

  const parseFileContent = (content: string): Promise<ParsedResult> =>
    new Promise((resolve, reject) => {
      const parserWorker = new Worker(
        new URL("../workers/fileParser.worker.ts", import.meta.url)
      );
      parserWorker.postMessage({ fileContent: content, format: "" });
      parserWorker.onmessage = (event: MessageEvent) => {
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data);
        parserWorker.terminate();
      };
      parserWorker.onerror = (error) => {
        reject(error);
        parserWorker.terminate();
      };
    });

  const detectLanguage = (messages: ChatMessage[]): string => {
    const text = messages.map((m) => m.message).join(" ");
    const detected = franc(text, { minLength: 3 });
    switch (detected) {
      case "deu":
        return "de";
      case "fra":
        return "fr";
      case "spa":
        return "es";
      default:
        return "en";
    }
  };

  const fetchTextFile = async (
    primaryPath: string,
    fallbackPath: string
  ): Promise<string> => {
    try {
      const response = await fetch(primaryPath);
      if (!response.ok) throw new Error("File not found");
      return await response.text();
    } catch {
      const fallbackResponse = await fetch(fallbackPath);
      if (!fallbackResponse.ok)
        throw new Error(`File not found: ${fallbackPath}`);
      return await fallbackResponse.text();
    }
  };

  const applyIgnoreFilter = async (
    messages: ChatMessage[],
    language: string,
    format: "ios" | "android"
  ): Promise<ChatMessage[]> => {
    const fileName = `ignore_lines_${language}_${format}.txt`;
    const primaryPath = `src/assets/${fileName}`;
    const fallbackPath = `/files/${fileName}`;
    try {
      const text = await fetchTextFile(primaryPath, fallbackPath);
      const ignoreLines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return messages.filter(
        (msg) => !ignoreLines.some((ignore) => msg.message.includes(ignore))
      );
    } catch (error) {
      console.error("Error loading ignore file:", error);
      return messages;
    }
  };

  const initializeFilters = (messages: ChatMessage[]) => {
    if (messages.length === 0) return;
    const firstDate = new Date(messages[0].date);
    const lastDate = new Date(messages[messages.length - 1].date);
    setStartDate(firstDate);
    setEndDate(lastDate);
    const total = messages.length;
    const senders = Array.from(new Set(messages.map((m) => m.sender)));
    const defaultSelected = senders.filter((sender) => {
      const count = messages.filter((m) => m.sender === sender).length;
      const percentage = (count / total) * 100;
      return percentage >= 3;
    });
    setSelectedSender(defaultSelected);
    const manualSelection = senders.reduce((acc, sender) => {
      acc[sender] = defaultSelected.includes(sender);
      return acc;
    }, {} as Record<string, boolean>);
    setManualSenderSelection(manualSelection);
  };

  /**
   * Diese Funktion verarbeitet einen Datei‑Upload:
   * 1. Datei einlesen
   * 2. Parsen (über Worker)
   * 3. Sprache ermitteln
   * 4. Ignore‑Filter anwenden
   * 5. Initiale Filter setzen und Ergebnisse in den Context schreiben
   */
  const processFile = async (file: File) => {
    setIsUploading(true);
    setFileName(file.name);
    try {
      const content = await readFileContent(file);
      const { messages, chosenFormat } = await parseFileContent(content);

      setFormat(chosenFormat);
      const lang = detectLanguage(messages);
      setLanguage(lang);

      console.log("Messages:", messages);
      console.log("Chosen format:", chosenFormat);
      console.log("Detected language:", lang);
      const filteredMessages = await applyIgnoreFilter(
        messages,
        lang,
        chosenFormat
      );
      initializeFilters(filteredMessages);
      setOriginalMessages(filteredMessages);
      setMessages(filteredMessages);
    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return { processFile };
}
