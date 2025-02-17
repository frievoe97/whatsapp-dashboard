////////////////////// Constants ////////////////////////

export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

////////////////////// Enum: SenderStatus ////////////////////////

/**
 * Enum representing the possible status values for a message sender.
 */
export enum SenderStatus {
  ACTIVE = 'active', // Eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // Eligible but manually deactivated (Status 2)
  LOCKED = 'locked', // Ineligible due to insufficient message percentage (Status 3)
}
