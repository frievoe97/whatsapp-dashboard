import { ChatMessage } from "../context/ChatContext";

export const parseChatFile = (fileContent: string): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  const lines = fileContent.split("\n");

  const messageRegex =
    /^\[(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.*)$/;

  for (const line of lines) {
    const match = line.match(messageRegex);
    if (match) {
      const [_, date, time, sender, message] = match;
      const parsedDate = new Date(
        date.replace(/(\d{2})\.(\d{2})\.(\d{2})/, "20$3-$2-$1")
      );
      messages.push({
        date: parsedDate,
        time,
        sender,
        message,
        isUsed: true,
      });
    }
  }

  return messages;
};
