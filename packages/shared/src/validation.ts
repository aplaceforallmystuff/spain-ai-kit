export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateBOEId(id: string): void {
  if (!/^BOE-[A-Z]-\d{4}-\d+$/.test(id)) {
    throw new ValidationError(
      `Invalid BOE document ID "${id}". Expected format: BOE-A-YYYY-NNNNN (e.g., "BOE-A-2000-544").`
    );
  }
}

export function validateDateBOE(date: string): void {
  if (!/^\d{8}$/.test(date)) {
    throw new ValidationError(
      `Invalid date "${date}". Expected YYYYMMDD format (e.g., "20260328").`
    );
  }
  const y = parseInt(date.slice(0, 4), 10);
  const m = parseInt(date.slice(4, 6), 10);
  const d = parseInt(date.slice(6, 8), 10);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    throw new ValidationError(`Invalid date "${date}". Month/day values are out of range.`);
  }
}

export function validateNumericId(id: number, label: string): void {
  if (!Number.isInteger(id) || id < 1 || id > 999_999_999) {
    throw new ValidationError(`Invalid ${label} "${id}". Must be a positive integer.`);
  }
}

export function validateSeriesCode(code: string): void {
  if (!/^[A-Za-z0-9]+$/.test(code)) {
    throw new ValidationError(
      `Invalid series code "${code}". Must be alphanumeric (e.g., "IPC290751").`
    );
  }
}

export function validateBlockId(id: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError(
      `Invalid block ID "${id}". Must contain only letters, numbers, hyphens, and underscores.`
    );
  }
}

export function validateProvinceCode(code: string): void {
  if (!/^\d{1,2}$/.test(code)) {
    throw new ValidationError(
      `Invalid province code "${code}". Must be 1-2 digits (e.g., "28" for Madrid).`
    );
  }
  const num = parseInt(code, 10);
  if (num < 1 || num > 52) {
    throw new ValidationError(`Invalid province code "${code}". Must be between 1 and 52.`);
  }
}

export function validateMunicipalityCode(code: string): void {
  if (!/^\d{1,3}$/.test(code)) {
    throw new ValidationError(`Invalid municipality code "${code}". Must be 1-3 digits.`);
  }
}

export function validateCadastralRef(rc: string): void {
  if (!/^[A-Za-z0-9]{14,20}$/.test(rc)) {
    throw new ValidationError(
      `Invalid cadastral reference "${rc}". Must be 14-20 alphanumeric characters.`
    );
  }
}

export function validateCoordinate(coord: number, label: string): void {
  if (!Number.isFinite(coord)) {
    throw new ValidationError(`Invalid ${label} coordinate "${coord}". Must be a finite number.`);
  }
}

export function validateMunicipioCode(code: string): void {
  if (!/^(id)?\d{5}$/.test(code)) {
    throw new ValidationError(
      `Invalid municipio code "${code}". Must be 5 digits, optionally prefixed with "id" (e.g., "28079" or "id28079" for Madrid).`
    );
  }
}

export function validateStationId(id: string): void {
  if (!/^[A-Za-z0-9]+$/.test(id)) {
    throw new ValidationError(`Invalid station ID "${id}". Must be alphanumeric.`);
  }
}

export function validateAEMETArea(area: string): void {
  const validAreas = [
    'esp',
    '61',
    '62',
    '63',
    '64',
    '65',
    '66',
    '67',
    '68',
    '69',
    '70',
    '71',
    '72',
    '73',
    '74',
    '75',
    '76',
    '77',
    '78',
    '79',
    'p',
    'c',
  ];
  if (!validAreas.includes(area)) {
    throw new ValidationError(
      `Invalid AEMET area code "${area}". Use "esp" for all Spain, region codes 61-79, or "p"/"c" for fire risk.`
    );
  }
}
