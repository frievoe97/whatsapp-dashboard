// tests/utils/abbreviateContacts.test.ts
import { describe, expect, test } from 'vitest';
import {
  sanitizeInput,
  isPhoneNumber,
  abbreviatePhone,
  abbreviateName,
  abbreviateContact,
  abbreviateContacts,
} from './abbreviateContacts';

describe('Utility Functions - Abbreviate Contacts', () => {
  test('sanitizeInput entfernt unerwünschte Zeichen', () => {
    expect(sanitizeInput('Hello~World"Test')).toBe('HelloWorldTest');
  });

  test('isPhoneNumber erkennt gültige Telefonnummern', () => {
    expect(isPhoneNumber('12345')).toBe(true);
    expect(isPhoneNumber('+12345')).toBe(true);
    expect(isPhoneNumber('12 34')).toBe(false);
    expect(isPhoneNumber('abcde')).toBe(false);
  });

  test('abbreviatePhone gibt kurze Nummern unverändert zurück', () => {
    // 8 Ziffern (4+4) sollen nicht abgekürzt werden
    expect(abbreviatePhone('12345678')).toBe('12345678');
  });

  test('abbreviatePhone kürzt lange Nummern korrekt', () => {
    expect(abbreviatePhone('12345678901')).toBe('1234....8901');
    expect(abbreviatePhone('+12345678901')).toBe('+1234....8901');
  });

  test('abbreviateName funktioniert korrekt', () => {
    expect(abbreviateName('John')).toBe('John');
    expect(abbreviateName('John Doe')).toBe('John D.');
    expect(abbreviateName('John Michael Doe')).toBe('John M. D.');
  });

  test('abbreviateContact entscheidet zwischen Nummer und Namen', () => {
    // Telefonnummer
    expect(abbreviateContact('12345678901')).toBe('1234....8901');
    // Name
    expect(abbreviateContact('John Doe')).toBe('John D.');
  });

  test('abbreviateContacts behandelt Duplikate und saniert die Eingabe', () => {
    const inputs = ['John Doe', 'John Doe', 'Jane Doe', 'John "Doe"', 'John Doe'];
    const result = abbreviateContacts(inputs);
    // "John Doe" wird zu "John D." – Duplikate werden hochgezählt
    expect(result).toEqual(['John D.', 'John D. (2)', 'Jane D.', 'John D. (3)', 'John D. (4)']);
  });
});
