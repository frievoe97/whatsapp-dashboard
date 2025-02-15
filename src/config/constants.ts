// src/config/constants.ts

export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const IOS_REGEX = /^\[(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}:\d{2})\] (.*?): (.+)$/;
export const ANDROID_REGEX = /^(\d{2}\.\d{2}\.\d{2}), (\d{2}:\d{2}) - (.*?): (.+)$/;

export enum SenderStatus {
  ACTIVE = 'active', // eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // eligible but manuell deaktiviert (Status 2)
  LOCKED = 'locked', // ineligible – unter Mindestprozentsatz (Status 3)
}
