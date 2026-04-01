/**
 * Format a Date as YYYYMMDD string (BOE API format).
 */
export function formatDateBOE(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Convert INE timestamp to ISO 8601 string.
 * INE returns Unix milliseconds for recent data but may return
 * Unix seconds for older series — auto-detect based on magnitude.
 */
export function ineTimestampToISO(ts: number): string {
  const ms = ts < 1e11 ? ts * 1000 : ts;
  return new Date(ms).toISOString();
}

/**
 * Validate a Spanish NIF/NIE number.
 * Returns true if the format and check digit are correct.
 */
export function validateNIF(nif: string): boolean {
  const cleaned = nif.toUpperCase().trim();
  const niePrefix: Record<string, string> = { X: '0', Y: '1', Z: '2' };
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';

  let numeric: string;
  if (/^[XYZ]/.test(cleaned)) {
    numeric = niePrefix[cleaned[0]] + cleaned.slice(1, -1);
  } else if (/^[0-9]/.test(cleaned)) {
    numeric = cleaned.slice(0, -1);
  } else {
    return false;
  }

  const num = parseInt(numeric, 10);
  if (isNaN(num)) return false;

  const expectedLetter = letters[num % 23];
  return cleaned[cleaned.length - 1] === expectedLetter;
}
