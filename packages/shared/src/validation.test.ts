import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  validateBOEId,
  validateBlockId,
  validateCadastralRef,
  validateCoordinate,
  validateDateBOE,
  validateMunicipalityCode,
  validateNumericId,
  validateProvinceCode,
  validateSeriesCode,
} from './validation.js';

describe('ValidationError', () => {
  it('has the correct name', () => {
    const err = new ValidationError('test');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
  });
});

describe('validateBOEId', () => {
  it('accepts valid BOE IDs', () => {
    expect(() => validateBOEId('BOE-A-2000-544')).not.toThrow();
    expect(() => validateBOEId('BOE-A-2026-12345')).not.toThrow();
    expect(() => validateBOEId('BOE-B-1999-1')).not.toThrow();
    expect(() => validateBOEId('BOE-Z-2020-999999')).not.toThrow();
  });

  it('rejects path traversal attempts', () => {
    expect(() => validateBOEId('../etc/passwd')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544/../secret')).toThrow(ValidationError);
    expect(() => validateBOEId('../../BOE-A-2000-544')).toThrow(ValidationError);
  });

  it('rejects malformed IDs', () => {
    expect(() => validateBOEId('BOE-A-2000')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-AA-2000-544')).toThrow(ValidationError);
    expect(() => validateBOEId('boe-a-2000-544')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-200-544')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-1-2000-544')).toThrow(ValidationError);
  });

  it('rejects whitespace and special characters', () => {
    expect(() => validateBOEId('BOE-A-2000-544 ')).toThrow(ValidationError);
    expect(() => validateBOEId(' BOE-A-2000-544')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544\n')).toThrow(ValidationError);
    expect(() => validateBOEId('BOE-A-2000-544;DROP TABLE')).toThrow(ValidationError);
  });

  it('throws ValidationError with descriptive message', () => {
    expect(() => validateBOEId('bad-id')).toThrow('Invalid BOE document ID "bad-id"');
  });
});

describe('validateDateBOE', () => {
  it('accepts valid YYYYMMDD dates', () => {
    expect(() => validateDateBOE('20260328')).not.toThrow();
    expect(() => validateDateBOE('20000101')).not.toThrow();
    expect(() => validateDateBOE('20261231')).not.toThrow();
    expect(() => validateDateBOE('20240229')).not.toThrow(); // 2024 is a leap year
  });

  it('rejects wrong format', () => {
    expect(() => validateDateBOE('2026-03-28')).toThrow(ValidationError);
    expect(() => validateDateBOE('28/03/2026')).toThrow(ValidationError);
    expect(() => validateDateBOE('2026032')).toThrow(ValidationError);
    expect(() => validateDateBOE('202603288')).toThrow(ValidationError);
    expect(() => validateDateBOE('')).toThrow(ValidationError);
    expect(() => validateDateBOE('abcdefgh')).toThrow(ValidationError);
  });

  it('rejects invalid calendar dates - month 13', () => {
    expect(() => validateDateBOE('20261301')).toThrow(ValidationError);
  });

  it('rejects invalid calendar dates - month 0', () => {
    expect(() => validateDateBOE('20260001')).toThrow(ValidationError);
  });

  it('rejects invalid calendar dates - day 0', () => {
    expect(() => validateDateBOE('20260300')).toThrow(ValidationError);
  });

  it('rejects invalid calendar dates - Feb 30', () => {
    expect(() => validateDateBOE('20260230')).toThrow(ValidationError);
  });

  it('rejects Feb 29 on non-leap year', () => {
    expect(() => validateDateBOE('20260229')).toThrow(ValidationError);
  });

  it('throws ValidationError with descriptive message', () => {
    expect(() => validateDateBOE('2026-03-28')).toThrow('Invalid date "2026-03-28"');
  });
});

describe('validateNumericId', () => {
  it('accepts valid positive integers', () => {
    expect(() => validateNumericId(1, 'operation')).not.toThrow();
    expect(() => validateNumericId(100, 'variable')).not.toThrow();
    expect(() => validateNumericId(999_999_999, 'id')).not.toThrow();
  });

  it('rejects 0', () => {
    expect(() => validateNumericId(0, 'id')).toThrow(ValidationError);
  });

  it('rejects negative integers', () => {
    expect(() => validateNumericId(-1, 'id')).toThrow(ValidationError);
    expect(() => validateNumericId(-100, 'id')).toThrow(ValidationError);
  });

  it('rejects floats', () => {
    expect(() => validateNumericId(1.5, 'id')).toThrow(ValidationError);
    expect(() => validateNumericId(3.14, 'id')).toThrow(ValidationError);
  });

  it('rejects values too large', () => {
    expect(() => validateNumericId(1_000_000_000, 'id')).toThrow(ValidationError);
    expect(() => validateNumericId(Number.MAX_SAFE_INTEGER, 'id')).toThrow(ValidationError);
  });

  it('includes the label in the error message', () => {
    expect(() => validateNumericId(0, 'operation ID')).toThrow('Invalid operation ID "0"');
  });
});

describe('validateSeriesCode', () => {
  it('accepts valid alphanumeric codes', () => {
    expect(() => validateSeriesCode('IPC290751')).not.toThrow();
    expect(() => validateSeriesCode('ABC123')).not.toThrow();
    expect(() => validateSeriesCode('abc123')).not.toThrow();
    expect(() => validateSeriesCode('A')).not.toThrow();
    expect(() => validateSeriesCode('123')).not.toThrow();
  });

  it('rejects special characters', () => {
    expect(() => validateSeriesCode('IPC-290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('IPC.290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('IPC_290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('IPC@290751')).toThrow(ValidationError);
  });

  it('rejects path traversal characters', () => {
    expect(() => validateSeriesCode('../IPC290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('IPC290751/extra')).toThrow(ValidationError);
    expect(() => validateSeriesCode('..\\IPC290751')).toThrow(ValidationError);
  });

  it('rejects spaces', () => {
    expect(() => validateSeriesCode('IPC 290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode(' IPC290751')).toThrow(ValidationError);
    expect(() => validateSeriesCode('IPC290751 ')).toThrow(ValidationError);
  });

  it('rejects empty string', () => {
    expect(() => validateSeriesCode('')).toThrow(ValidationError);
  });

  it('throws ValidationError with descriptive message', () => {
    expect(() => validateSeriesCode('IPC-290751')).toThrow('Invalid series code "IPC-290751"');
  });
});

describe('validateBlockId', () => {
  it('accepts valid IDs with letters and numbers', () => {
    expect(() => validateBlockId('abc123')).not.toThrow();
    expect(() => validateBlockId('ABC')).not.toThrow();
    expect(() => validateBlockId('123')).not.toThrow();
  });

  it('accepts IDs with hyphens and underscores', () => {
    expect(() => validateBlockId('my-block-id')).not.toThrow();
    expect(() => validateBlockId('my_block_id')).not.toThrow();
    expect(() => validateBlockId('block-123_abc')).not.toThrow();
  });

  it('rejects path traversal characters', () => {
    expect(() => validateBlockId('../secret')).toThrow(ValidationError);
    expect(() => validateBlockId('block/extra')).toThrow(ValidationError);
    expect(() => validateBlockId('block\\extra')).toThrow(ValidationError);
    expect(() => validateBlockId('../../etc')).toThrow(ValidationError);
  });

  it('rejects slashes', () => {
    expect(() => validateBlockId('block/id')).toThrow(ValidationError);
    expect(() => validateBlockId('/blockid')).toThrow(ValidationError);
  });

  it('rejects spaces', () => {
    expect(() => validateBlockId('block id')).toThrow(ValidationError);
    expect(() => validateBlockId(' blockid')).toThrow(ValidationError);
    expect(() => validateBlockId('blockid ')).toThrow(ValidationError);
  });

  it('rejects empty string', () => {
    expect(() => validateBlockId('')).toThrow(ValidationError);
  });

  it('rejects special characters', () => {
    expect(() => validateBlockId('block@id')).toThrow(ValidationError);
    expect(() => validateBlockId('block.id')).toThrow(ValidationError);
    expect(() => validateBlockId('block!id')).toThrow(ValidationError);
  });

  it('throws ValidationError with descriptive message', () => {
    expect(() => validateBlockId('block/id')).toThrow('Invalid block ID "block/id"');
  });
});

describe('validateProvinceCode', () => {
  it('accepts valid province codes', () => {
    expect(() => validateProvinceCode('1')).not.toThrow();
    expect(() => validateProvinceCode('28')).not.toThrow();
    expect(() => validateProvinceCode('52')).not.toThrow();
  });

  it('rejects out-of-range codes', () => {
    expect(() => validateProvinceCode('0')).toThrow(ValidationError);
    expect(() => validateProvinceCode('53')).toThrow(ValidationError);
  });

  it('rejects non-numeric values', () => {
    expect(() => validateProvinceCode('abc')).toThrow(ValidationError);
    expect(() => validateProvinceCode('')).toThrow(ValidationError);
  });

  it('rejects 3+ digit strings', () => {
    expect(() => validateProvinceCode('123')).toThrow(ValidationError);
  });
});

describe('validateMunicipalityCode', () => {
  it('accepts valid municipality codes', () => {
    expect(() => validateMunicipalityCode('1')).not.toThrow();
    expect(() => validateMunicipalityCode('50')).not.toThrow();
    expect(() => validateMunicipalityCode('900')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateMunicipalityCode('')).toThrow(ValidationError);
  });

  it('rejects non-numeric values', () => {
    expect(() => validateMunicipalityCode('abcd')).toThrow(ValidationError);
  });

  it('rejects 4+ digit strings', () => {
    expect(() => validateMunicipalityCode('1234')).toThrow(ValidationError);
  });
});

describe('validateCadastralRef', () => {
  it('accepts valid cadastral references', () => {
    expect(() => validateCadastralRef('36050A07700004')).not.toThrow();
    expect(() => validateCadastralRef('13077A01800039')).not.toThrow();
    expect(() => validateCadastralRef('9872023VH5797S0001WX')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateCadastralRef('')).toThrow(ValidationError);
  });

  it('rejects strings shorter than 14 characters', () => {
    expect(() => validateCadastralRef('short')).toThrow(ValidationError);
  });

  it('rejects strings with spaces', () => {
    expect(() => validateCadastralRef('has spaces     ')).toThrow(ValidationError);
  });

  it('rejects path traversal attempts', () => {
    expect(() => validateCadastralRef('../../../')).toThrow(ValidationError);
  });
});

describe('validateCoordinate', () => {
  it('accepts valid finite coordinates', () => {
    expect(() => validateCoordinate(40.4168, 'latitude')).not.toThrow();
    expect(() => validateCoordinate(-3.7038, 'longitude')).not.toThrow();
    expect(() => validateCoordinate(0, 'latitude')).not.toThrow();
  });

  it('rejects NaN', () => {
    expect(() => validateCoordinate(NaN, 'latitude')).toThrow(ValidationError);
  });

  it('rejects Infinity', () => {
    expect(() => validateCoordinate(Infinity, 'longitude')).toThrow(ValidationError);
  });

  it('rejects -Infinity', () => {
    expect(() => validateCoordinate(-Infinity, 'latitude')).toThrow(ValidationError);
  });
});
