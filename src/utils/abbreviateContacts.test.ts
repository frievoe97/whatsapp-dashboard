import { describe, expect, test } from 'vitest';
import {
  sanitizeInput,
  isPhoneNumber,
  abbreviatePhone,
  abbreviateName,
  abbreviateContact,
  abbreviateContacts,
} from './abbreviateContacts';

//////////////////////////////
// Utility Functions - Abbreviate Contacts Tests
//////////////////////////////

describe('Utility Functions - Abbreviate Contacts', () => {
  //////////////////////////////
  // Test: sanitizeInput
  //////////////////////////////
  test('sanitizeInput removes unwanted characters', () => {
    expect(sanitizeInput('Hello~World"Test')).toBe('HelloWorldTest');
  });

  //////////////////////////////
  // Test: isPhoneNumber
  //////////////////////////////
  test('isPhoneNumber correctly identifies valid phone numbers', () => {
    expect(isPhoneNumber('12345')).toBe(true);
    expect(isPhoneNumber('+12345')).toBe(true);
    expect(isPhoneNumber('12 34')).toBe(false);
    expect(isPhoneNumber('abcde')).toBe(false);
  });

  //////////////////////////////
  // Test: abbreviatePhone (short numbers remain unchanged)
  //////////////////////////////
  test('abbreviatePhone returns short phone numbers unchanged', () => {
    // 8 digits (4+4) should not be abbreviated.
    expect(abbreviatePhone('12345678')).toBe('12345678');
  });

  //////////////////////////////
  // Test: abbreviatePhone (long numbers are abbreviated)
  //////////////////////////////
  test('abbreviatePhone correctly abbreviates long phone numbers', () => {
    expect(abbreviatePhone('12345678901')).toBe('1234....8901');
    expect(abbreviatePhone('+12345678901')).toBe('+1234....8901');
  });

  //////////////////////////////
  // Test: abbreviateName
  //////////////////////////////
  test('abbreviateName works correctly', () => {
    expect(abbreviateName('John')).toBe('John');
    expect(abbreviateName('John Doe')).toBe('John D.');
    expect(abbreviateName('John Michael Doe')).toBe('John M. D.');
  });

  //////////////////////////////
  // Test: abbreviateContact (distinguish phone number vs name)
  //////////////////////////////
  test('abbreviateContact distinguishes between phone number and name', () => {
    // Phone number test.
    expect(abbreviateContact('12345678901')).toBe('1234....8901');
    // Name test.
    expect(abbreviateContact('John Doe')).toBe('John D.');
  });

  //////////////////////////////
  // Test: abbreviateContacts (handles duplicates and sanitizes input)
  //////////////////////////////
  test('abbreviateContacts handles duplicates and sanitizes input', () => {
    const inputs = ['John Doe', 'John Doe', 'Jane Doe', 'John "Doe"', 'John Doe'];
    const result = abbreviateContacts(inputs);
    // "John Doe" becomes "John D." – duplicates are counted and appended (e.g., "John D. (2)")
    expect(result).toEqual(['John D.', 'John D. (2)', 'Jane D.', 'John D. (3)', 'John D. (4)']);
  });
});
