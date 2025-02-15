// src/types/chatTypes.ts
import { SenderStatus } from '../config/constants';

export interface ChatMessage {
  date: Date;
  time: string;
  sender: string;
  message: string;
}

export interface ChatMetadata {
  language: 'de' | 'en' | 'fr' | 'es';
  os: 'ios' | 'android';
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
