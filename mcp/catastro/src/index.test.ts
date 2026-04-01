import { describe, it, expect } from 'vitest';
import { BaseAPIClient, parseXML } from '@spain-ai-kit/shared';

const CALLEJERO_BASE =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/';
const COORDENADAS_BASE =
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/';

const callejero = new BaseAPIClient({ baseURL: CALLEJERO_BASE, cacheTTL: 0 });
const coordenadas = new BaseAPIClient({ baseURL: COORDENADAS_BASE, cacheTTL: 0 });

describe('Catastro API integration', () => {
  it('lists provinces', async () => {
    const xml = await callejero.get<string>('ConsultaProvincia', {
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    const text = JSON.stringify(parsed);
    expect(text).toContain('MADRID');
  }, 15_000);

  it('lists municipalities for Madrid province (28)', async () => {
    const xml = await callejero.get<string>('ConsultaMunicipioCodigos', {
      params: { CodigoProvincia: '28', CodigoMunicipio: '', CodigoMunicipioINE: '' },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    const text = JSON.stringify(parsed);
    expect(text).toContain('MADRID');
  }, 15_000);

  it('reverse geocodes Madrid coordinates', async () => {
    // Bernabeu stadium (Av. Concha Espina 1, Madrid) — a registered parcel
    const xml = await coordenadas.get<string>('Consulta_RCCOOR', {
      params: { SRS: 'EPSG:4326', Coordenada_X: -3.6883, Coordenada_Y: 40.4531 },
      responseType: 'text' as never,
    });
    const parsed = parseXML(xml);
    expect(parsed).toBeDefined();
    const text = JSON.stringify(parsed);
    expect(text).toContain('MADRID');
  }, 15_000);
});
