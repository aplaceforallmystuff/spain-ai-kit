export { BaseAPIClient } from './api-client.js';
export { parseXML } from './xml.js';
export { formatDateBOE, formatDateISO, ineTimestampToISO, validateNIF } from './utils.js';
export { Jurisdiction } from './types.js';
export type { APIClientOptions, CacheEntry } from './types.js';
export {
  ValidationError,
  validateBOEId,
  validateDateBOE,
  validateNumericId,
  validateSeriesCode,
  validateBlockId,
} from './validation.js';
export {
  validateProvinceCode,
  validateMunicipalityCode,
  validateCadastralRef,
  validateCoordinate,
} from './validation.js';
export { wrapToolHandler } from './error.js';
export type { ToolResult } from './error.js';
export { AEMETClient } from './aemet-client.js';
export type { AEMETClientOptions } from './types.js';
export { validateMunicipioCode, validateStationId, validateAEMETArea } from './validation.js';
