export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateBOEId(id: string): void {
  if (!/^BOE-[A-Z]-\d{4}-\d+$/.test(id)) {
    throw new ValidationError(
      `Invalid BOE document ID "${id}". Expected format: BOE-A-YYYY-NNNNN (e.g., "BOE-A-2000-544").`,
    );
  }
}

export function validateDateBOE(date: string): void {
  if (!/^\d{8}$/.test(date)) {
    throw new ValidationError(
      `Invalid date "${date}". Expected YYYYMMDD format (e.g., "20260328").`,
    );
  }
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(4, 6), 10);
  const d = parseInt(date.slice(6, 8), 10);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    throw new ValidationError(
      `Invalid date "${date}". Month/day values are out of range.`,
    );
  }
}

export function validateNumericId(id: number, label: string): void {
  if (!Number.isInteger(id) || id < 1 || id > 999_999_999) {
    throw new ValidationError(
      `Invalid ${label} "${id}". Must be a positive integer.`,
    );
  }
}

export function validateSeriesCode(code: string): void {
  if (!/^[A-Za-z0-9]+$/.test(code)) {
    throw new ValidationError(
      `Invalid series code "${code}". Must be alphanumeric (e.g., "IPC290751").`,
    );
  }
}

export function validateBlockId(id: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError(
      `Invalid block ID "${id}". Must contain only letters, numbers, hyphens, and underscores.`,
    );
  }
}
