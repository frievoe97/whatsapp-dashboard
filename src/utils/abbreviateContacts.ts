////////////////////// Utility Functions for Contact Abbreviation ////////////////////////

/**
 * Removes unwanted special characters from the input string.
 * For example, it removes "~" and double quotes.
 *
 * @param input - The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[~"]/g, '');
}

/**
 * Checks if the input string is a valid phone number.
 * The function allows an optional "+" at the start and only digits afterward.
 * The input must contain at least 5 digits.
 *
 * @param input - The string to check.
 * @returns True if the string qualifies as a phone number, false otherwise.
 */
export function isPhoneNumber(input: string): boolean {
  // Remove all non-digit characters (except for a leading +)
  const cleaned = input.replace(/[^0-9+]/g, '');
  // Count digits (ignoring non-digits)
  const digitCount = cleaned.replace(/\D/g, '').length;
  return digitCount >= 5;
}

/**
 * Abbreviates a phone number by keeping the first 4 and last 4 digits,
 * inserting "...." in between.
 *
 * @param phone - The phone number string.
 * @returns The abbreviated phone number.
 */
export function abbreviatePhone(phone: string): string {
  let cleanedPhone = phone.trim().replace(/\s+/g, '').replace(/[-()]/g, '');
  let plusSign = '';
  if (cleanedPhone.startsWith('+')) {
    plusSign = '+';
    cleanedPhone = cleanedPhone.slice(1);
  }
  const visibleStart = 4;
  const visibleEnd = 4;
  if (cleanedPhone.length <= visibleStart + visibleEnd) {
    return plusSign + cleanedPhone;
  }
  const startPart = cleanedPhone.slice(0, visibleStart);
  const endPart = cleanedPhone.slice(-visibleEnd);
  return `${plusSign}${startPart}....${endPart}`;
}

/**
 * Abbreviates a name.
 * - If the name contains only one word, it is returned unchanged.
 * - If it contains multiple words, the first word is kept in full and subsequent words
 *   are abbreviated to their initial followed by a period.
 *
 * Example:
 * "Thomas Anderson" -> "Thomas A."
 *
 * @param fullName - The full name to abbreviate.
 * @returns The abbreviated name.
 */
export function abbreviateName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 1) {
    return parts[0];
  } else {
    const firstWord = parts[0];
    const shortenedOthers = parts.slice(1).map((word) => word.charAt(0) + '.');
    return [firstWord, ...shortenedOthers].join(' ');
  }
}

/**
 * Abbreviates a contact (either a name or a phone number) accordingly.
 *
 * @param input - The contact string to abbreviate.
 * @returns The abbreviated contact string.
 */
export function abbreviateContact(input: string): string {
  const trimmed = input.trim();
  if (isPhoneNumber(trimmed)) {
    return abbreviatePhone(trimmed);
  } else {
    return abbreviateName(trimmed);
  }
}

/**
 * Abbreviates an array of contacts (names or phone numbers).
 * If there are duplicates, they are counted (e.g., "Name", "Name (2)", "Name (3)").
 *
 * @param inputs - An array of contact strings.
 * @returns An array of abbreviated contact strings.
 */
export function abbreviateContacts(inputs: string[]): string[] {
  const results: string[] = [];
  const countMap: Record<string, number> = {};

  for (const rawInput of inputs) {
    // 1) Remove unwanted special characters.
    const sanitized = sanitizeInput(rawInput);
    // 2) Abbreviate the contact (name or phone number).
    const baseAbbrev = abbreviateContact(sanitized);
    // 3) Increment duplicate count if necessary.
    if (!countMap[baseAbbrev]) {
      countMap[baseAbbrev] = 1;
      results.push(baseAbbrev);
    } else {
      countMap[baseAbbrev] += 1;
      const newCount = countMap[baseAbbrev];
      results.push(`${baseAbbrev} (${newCount})`);
    }
  }

  return results;
}
