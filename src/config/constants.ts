////////////////////// Imports ////////////////////////
import { OperatingSystem } from '../types/chatTypes';

////////////////////// Constants ////////////////////////

export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Eine neue Version der Operating-System-Konfigurationen, die
 * eine Methode `parseLine` beinhalten, um eine Zeile direkt zu parsen.
 */
export const OPERATING_SYSTEMS = [
  {
    name: 'ios_1',
    regex: /^\[(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.+)$/,
    parseLine: (line: string) => {
      const match = line.match(/^\[(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.+)$/);
      if (!match) return null;
      const [, dateString, timeString, sender, message] = match;
      // Datum in Bestandteile zerlegen und in ISO-Format bringen
      const [day, month, year] = dateString.split('.');
      const isoDate = `20${year}-${month}-${day}T${timeString}`;
      return {
        date: new Date(isoDate),
        time: timeString,
        sender,
        message,
      };
    },
  },
  {
    name: 'android_1',
    regex: /^(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}) - (.*?): (.+)$/,
    parseLine: (line: string) => {
      const match = line.match(/^(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}) - (.*?): (.+)$/);
      if (!match) return null;
      const [, dateString, timeString, sender, message] = match;
      const [day, month, year] = dateString.split('.');
      // Zeit anpassen, indem Sekunden angehängt werden
      const fullTime = `${timeString}:00`;
      const isoDate = `20${year}-${month}-${day}T${fullTime}`;
      return {
        date: new Date(isoDate),
        time: fullTime,
        sender,
        message,
      };
    },
  },
  {
    name: 'android_2',
    regex: /^(\d{2}\/\d{2}\/\d{4}), (\d{1,2}):(\d{2}) (am|pm) - (.*?): (.+)$/,
    parseLine: (line: string) => {
      const match = line.match(/^(\d{2}\/\d{2}\/\d{4}), (\d{1,2}):(\d{2}) (am|pm) - (.*?): (.+)$/i);
      if (!match) return null;
      const [, dateString, hourStr, minuteStr, modifier, sender, message] = match;
      const [day, month, year] = dateString.split('/');
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      // Konvertiere in 24-Stunden-Format
      if (modifier.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (modifier.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(
        2,
        '0',
      )}:00`;
      const isoDate = `${year}-${month}-${day}T${formattedTime}`;
      return {
        date: new Date(isoDate),
        time: formattedTime,
        sender,
        message,
      };
    },
  },
] as OperatingSystem[];

////////////////////// Enum: SenderStatus ////////////////////////

/**
 * Enum representing the possible status values for a message sender.
 */
export enum SenderStatus {
  ACTIVE = 'active', // Eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // Eligible but manually deactivated (Status 2)
  LOCKED = 'locked', // Ineligible due to insufficient message percentage (Status 3)
}
