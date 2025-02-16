// src/config/constants.ts
import { OperatingSystem } from '../types/chatTypes';

export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export const extractMessageData = (match: RegExpMatchArray, osName: string) => {
  if (!match) return null;

  let date, time, sender, message;

  switch (osName) {
    case 'ios_1': {
      const [, dateString, timeString, senderString, messageString] = match;
      date = formatDate(dateString, 'dd.mm.yy');
      time = timeString;
      sender = senderString;
      message = messageString;
      break;
    }
    case 'android_1': {
      const [, dateString, timeString, senderString, messageString] = match;
      date = formatDate(dateString, 'dd.mm.yy');
      time = formatTime(timeString);
      sender = senderString;
      message = messageString;
      break;
    }
    case 'android_2': {
      const [, dateString, hour, minute, ampm, senderString, messageString] = match;
      date = formatDate(dateString, 'dd/mm/yyyy');
      time = formatTime(`${hour}:${minute} ${ampm}`);
      sender = senderString;
      message = messageString;
      break;
    }
    default:
      return null;
  }

  return { date, time, sender, message };
};

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

export enum SenderStatus {
  ACTIVE = 'active', // eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // eligible but manuell deaktiviert (Status 2)
  LOCKED = 'locked', // ineligible – unter Mindestprozentsatz (Status 3)
}
