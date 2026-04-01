/**
 * Autonomous communities of Spain + national level.
 */
export enum Jurisdiction {
  National = 'es',
  Andalucia = 'es-an',
  Aragon = 'es-ar',
  Asturias = 'es-as',
  Baleares = 'es-ib',
  Canarias = 'es-cn',
  Cantabria = 'es-cb',
  CastillaLaMancha = 'es-cm',
  CastillaYLeon = 'es-cl',
  Catalunya = 'es-ct',
  Ceuta = 'es-ce',
  Extremadura = 'es-ex',
  Galicia = 'es-ga',
  LaRioja = 'es-ri',
  Madrid = 'es-md',
  Melilla = 'es-ml',
  Murcia = 'es-mc',
  Navarra = 'es-nc',
  PaisVasco = 'es-pv',
  Valencia = 'es-vc',
}

/**
 * A cached API response with TTL tracking.
 */
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Options for the BaseAPIClient.
 */
export interface APIClientOptions {
  baseURL: string;
  /** Default timeout in ms (default: 30000) */
  timeout?: number;
  /** Max retries on failure (default: 3) */
  maxRetries?: number;
  /** Default cache TTL in ms (default: 300000 = 5 min) */
  cacheTTL?: number;
}
