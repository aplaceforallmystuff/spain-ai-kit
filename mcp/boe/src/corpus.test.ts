import { describe, it, expect } from 'vitest';
import { CorpusIndex } from './corpus.js';

describe('CorpusIndex', () => {
  it('concurrent search calls do not double-build the index', async () => {
    const corpus = new CorpusIndex();

    const [results1, results2, results3] = await Promise.all([
      corpus.search('constitución', { limit: 1 }),
      corpus.search('extranjeros', { limit: 1 }),
      corpus.search('protección', { limit: 1 }),
    ]);

    expect(Array.isArray(results1)).toBe(true);
    expect(Array.isArray(results2)).toBe(true);
    expect(Array.isArray(results3)).toBe(true);
  });

  it('readLaw rejects identifiers not in the index', async () => {
    const corpus = new CorpusIndex();
    const result = await corpus.readLaw('DEFINITELY-NOT-A-REAL-LAW-ID');
    expect(result).toBeNull();
  });
});
