////////////////////// Imports ////////////////////////
import { OperatingSystem } from '../types/chatTypes';

////////////////////// Constants ////////////////////////

/**
 * An array representing the default weekdays.
 */
export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * An array of operating system configurations used to parse chat files.
 * Each configuration includes a regex for matching message lines and a function to parse dates.
 */
export const OPERATING_SYSTEMS = [
  {
    name: 'ios_1',
    regex: /^\[(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.+)$/,
    parseDate: (dateString: string) => {
      const dateParts = dateString.split('.');
      return `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    },
  },
  {
    name: 'android_1',
    regex: /^(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}) - (.*?): (.+)$/,
    parseDate: (dateString: string) => {
      const dateParts = dateString.split('.');
      return `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    },
  },
  {
    name: 'android_2',
    regex: /^(\d{2}\/\d{2}\/\d{4}), (\d{1,2}):(\d{2}) (am|pm) - (.*?): (.+)$/,
    parseDate: (dateString: string) => {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    },
  },
] as OperatingSystem[];

////////////////////// Helper Functions ////////////////////////

/**
 * Formats a date string into the specified format.
 *
 * @param dateString - The raw date string.
 * @param format - The target format: 'dd.mm.yy' or 'dd/mm/yyyy'.
 * @returns The formatted date string.
 */
const formatDate = (dateString: string, format: 'dd.mm.yy' | 'dd/mm/yyyy') => {
  if (format === 'dd.mm.yy') {
    const [day, month, year] = dateString.split('.');
    return `${day}.${month}.${year}`;
  }
  if (format === 'dd/mm/yyyy') {
    const [day, month, year] = dateString.split('/');
    return `${day}.${month}.${year.slice(-2)}`;
  }
  return dateString;
};

/**
 * Formats a time string into a standardized format (HH:MM:SS).
 *
 * If the input contains 'am' or 'pm', it converts it to 24-hour format.
 *
 * @param timeString - The raw time string.
 * @returns The formatted time string.
 */
const formatTime = (timeString: string) => {
  if (timeString.includes('am') || timeString.includes('pm')) {
    const [time, modifier] = timeString.split(' ');
    let [hours] = time.split(':').map(Number);
    const [, minutes] = time.split(':').map(Number);

    if (modifier === 'pm' && hours !== 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }
  return `${timeString}:00`;
};

////////////////////// Message Extraction ////////////////////////

/**
 * Extracts message data from a regex match based on the operating system format.
 *
 * @param match - The RegExpMatchArray obtained from matching a chat line.
 * @param osName - The operating system identifier to determine the parsing strategy.
 * @returns An object with the parsed date, time, sender, and message; or null if parsing fails.
 */
export const extractMessageData = (match: RegExpMatchArray, osName: string) => {
  if (!match) return null;

  let date, time, sender, message;

  switch (osName) {
    case 'ios_1': {
      const [, dateString, timeString, senderString, messageString] = match;
      date = formatDate(dateString, 'dd.mm.yy'); // Expected format: 06.02.25
      time = timeString; // Expected format: 20:52:00
      sender = senderString;
      message = messageString;
      break;
    }
    case 'android_1': {
      const [, dateString, timeString, senderString, messageString] = match;
      date = formatDate(dateString, 'dd.mm.yy'); // Expected format: 06.02.25
      time = formatTime(timeString); // Expected format: 20:52:00
      sender = senderString;
      message = messageString;
      break;
    }
    case 'android_2': {
      const [, dateString, hour, minute, ampm, senderString, messageString] = match;
      date = formatDate(dateString, 'dd/mm/yyyy'); // Expected format: 06.02.25 (with two-digit year)
      time = formatTime(`${hour}:${minute} ${ampm}`); // Expected format: 20:52:00
      sender = senderString;
      message = messageString;
      break;
    }
    default:
      return null;
  }

  return { date, time, sender, message };
};

////////////////////// Enum: SenderStatus ////////////////////////

/**
 * Enum representing the possible status values for a message sender.
 */
export enum SenderStatus {
  ACTIVE = 'active', // Eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // Eligible but manually deactivated (Status 2)
  LOCKED = 'locked', // Ineligible due to insufficient message percentage (Status 3)
}
