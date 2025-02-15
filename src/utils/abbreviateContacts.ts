/**
 * Entfernt bestimmte unerwünschte Sonderzeichen.
 * Beispiel: "~" und doppelte Anführungszeichen.
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[~"]/g, '');
}

/**
 * Prüft, ob der String eine Telefonnummer ist.
 * Erlaubt ein optionales "+" am Anfang und nur Ziffern im Rest.
 */
/**
 * Prüft, ob der String eine Telefonnummer ist.
 * Bedingung: Der String muss mindestens 5 Ziffern enthalten.
 */
export function isPhoneNumber(input: string): boolean {
  // Alle nicht-numerischen Zeichen (außer + am Anfang) entfernen
  const cleaned = input.replace(/[^0-9+]/g, '');

  // Mindestens 5 Ziffern enthalten?
  const digitCount = cleaned.replace(/\D/g, '').length;

  return digitCount >= 5;
}

/**
 * Kürzt eine Telefonnummer:
 * - Behält die ersten 4 und letzten 4 Ziffern, fügt "...." in der Mitte ein.
 */
export function abbreviatePhone(phone: string): string {
  let cleanedPhone = phone.trim().replace(/\s+/g, '').replace(/[-()]/g, ''); // Backslashes entfernt

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
 * Kürzt einen Namen:
 * - Bei nur einem Wort: Unverändert.
 * - Bei mehreren Wörtern: Erstes Wort voll ausschreiben, weitere nur als Initial + Punkt.
 *
 * Beispiel:
 * "Friedrich Völkers" -> "Friedrich V."
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
 * Kürzt einen Kontakt (Name oder Telefonnummer) entsprechend.
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
 * Nimmt ein Array von Eingaben (Namen oder Nummern) entgegen und gibt
 * ein Array mit abgekürzten Strings zurück. Falls es Duplikate gibt,
 * werden diese hochgezählt (z.B. "Name", "Name (2)", "Name (3)").
 */
export function abbreviateContacts(inputs: string[]): string[] {
  const results: string[] = [];
  const countMap: Record<string, number> = {};

  for (const rawInput of inputs) {
    // 1) Sonderzeichen entfernen
    const sanitized = sanitizeInput(rawInput);
    // 2) Kürzen (Name oder Nummer)
    const baseAbbrev = abbreviateContact(sanitized);
    // 3) Duplikate hochzählen
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
