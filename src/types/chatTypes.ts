// src/types/chatTypes.ts
import { SenderStatus } from '../config/constants';
import { OPERATING_SYSTEMS } from '../config/constants';

export type OperatingSystemName = (typeof OPERATING_SYSTEMS)[number]['name'];

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
}

export interface ChatMetadata {
  language: 'de' | 'en' | 'fr' | 'es';
  os: OperatingSystemName;
  firstMessageDate: Date;
  lastMessageDate: Date;
  senders: Record<string, number>;
  sendersShort: Record<string, string>;
  fileName: string;
}

export interface ChatFileData {
  messages: ChatMessage[];
  metadata: ChatMetadata;
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  selectedWeekdays: string[];
  minPercentagePerSender: number;
  senderStatuses: Record<string, SenderStatus>;
}

export interface OperatingSystem {
  name: string;
  regex: RegExp;
  parseDate: (dateString: string) => string;
  parseTime: (timeString: string, period?: string) => string;
}
