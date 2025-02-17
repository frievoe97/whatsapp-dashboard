////////////////////// Imports ////////////////////////
import { SenderStatus } from '../config/constants';

////////////////////// Chat Message Types ////////////////////////

/**
 * ChatMessage defines the structure for a single chat message.
 */
export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
}

/**
 * ChatMetadata contains metadata about a chat file, including language,
 * operating system, message dates, sender statistics, and the file name.
 */
export interface ChatMetadata {
  language: 'de' | 'en' | 'fr' | 'es';
  firstMessageDate: Date;
  lastMessageDate: Date;
  senders: Record<string, number>;
  sendersShort: Record<string, string>;
  fileName: string;
}

/**
 * ChatFileData groups the parsed messages together with the metadata.
 */
export interface ChatFileData {
  messages: ChatMessage[];
  metadata: ChatMetadata;
}

////////////////////// Filter Options ////////////////////////

/**
 * FilterOptions defines the criteria for filtering chat messages,
 * including date range, selected weekdays, and sender status information.
 */
export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  selectedWeekdays: string[];
  minPercentagePerSender: number;
  senderStatuses: Record<string, SenderStatus>;
}

////////////////////// Operating System Configuration ////////////////////////

/**
 * OperatingSystem defines the configuration required to parse chat messages
 * for a specific operating system, including regex for matching lines and
 * functions to parse dates and times.
 */
export interface OperatingSystem {
  name: string;
  regex: RegExp;
  parseLine: (line: string) => { date: Date; time: string; sender: string; message: string } | null;
}
