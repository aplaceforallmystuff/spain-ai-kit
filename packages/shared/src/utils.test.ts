import { describe, it, expect } from 'vitest';
import { formatDateBOE, formatDateISO, ineTimestampToISO, validateNIF } from './utils.js';

describe('formatDateBOE', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(formatDateBOE(new Date(2026, 0, 15))).toBe('20260115');
  });

  it('zero-pads month and day', () => {
    expect(formatDateBOE(new Date(2026, 2, 1))).toBe('20260301');
  });
});

describe('formatDateISO', () => {
  it('returns YYYY-MM-DD', () => {
    const result = formatDateISO(new Date('2026-03-28T10:00:00Z'));
    expect(result).toBe('2026-03-28');
  });
});

describe('ineTimestampToISO', () => {
  it('converts Unix ms to ISO 8601', () => {
    const result = ineTimestampToISO(1609459200000); // 2021-01-01T00:00:00.000Z
    expect(result).toBe('2021-01-01T00:00:00.000Z');
  });

  it('handles INE-style timestamps', () => {
    const result = ineTimestampToISO(1577836800000); // 2020-01-01
    expect(result).toMatch(/^2020-01-01/);
  });

  it('auto-detects Unix seconds (< 1e11)', () => {
    const result = ineTimestampToISO(1609459200); // 2021-01-01 as seconds
    expect(result).toBe('2021-01-01T00:00:00.000Z');
  });
});

describe('validateNIF', () => {
  it('validates a correct DNI', () => {
    // 12345678Z is a well-known test NIF
    expect(validateNIF('12345678Z')).toBe(true);
  });

  it('rejects an incorrect check letter', () => {
    expect(validateNIF('12345678A')).toBe(false);
  });

  it('validates NIE starting with X', () => {
    // X0000000T — X→0, 0000000 % 23 = 0 → T
    expect(validateNIF('X0000000T')).toBe(true);
  });

  it('validates NIE starting with Y', () => {
    // Y0000000Z — Y→1, 10000000 % 23 = 11 → Z
    expect(validateNIF('Y0000000Z')).toBe(true);
  });

  it('validates NIE starting with Z', () => {
    // Z0000000M — Z→2, 20000000 % 23 = 4 → M
    expect(validateNIF('Z0000000M')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(validateNIF('12345678z')).toBe(true);
  });

  it('rejects garbage input', () => {
    expect(validateNIF('ABCDEFGH')).toBe(false);
    expect(validateNIF('')).toBe(false);
  });
});
