import { describe, it, expect } from 'vitest';
import { BaseAPIClient, ineTimestampToISO } from '@spain-ai-kit/shared';

const API_BASE = 'https://servicios.ine.es/wstempus/js/ES/';
const client = new BaseAPIClient({ baseURL: API_BASE, cacheTTL: 0 });

describe('INE API integration', () => {
  it('lists available operations', async () => {
    const ops = await client.get<Array<{ Id: number; Nombre: string; Codigo: string }>>(
      'OPERACIONES_DISPONIBLES',
    );
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBeGreaterThan(50);
    expect(ops[0]).toHaveProperty('Id');
    expect(ops[0]).toHaveProperty('Nombre');
  }, 15_000);

  it('fetches tables for a known operation', async () => {
    // Operation 22 = Cifras Oficiales de Población
    const tables = await client.get<Array<{ Id: number; Nombre: string }>>(
      'TABLAS_OPERACION/22',
    );
    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0]).toHaveProperty('Id');
  }, 15_000);

  it('retrieves data from a table', async () => {
    // Table 2852 = Población por provincias y sexo
    const series = await client.get<Array<{ COD: string; Nombre: string; Data: Array<{ Fecha: number; Valor: number }> }>>(
      'DATOS_TABLA/2852?nult=2',
    );
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBeGreaterThan(0);
    expect(series[0].Data.length).toBeLessThanOrEqual(2);
    expect(series[0].Data[0]).toHaveProperty('Valor');
  }, 15_000);

  it('converts INE timestamps correctly', () => {
    // Verify our timestamp utility works with INE data format
    const iso = ineTimestampToISO(1609459200000);
    expect(iso).toBe('2021-01-01T00:00:00.000Z');
  });
});
