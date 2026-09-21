import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { CorpusIndex } from './corpus.js';

const originalCorpusPath = process.env.SPAIN_AI_KIT_CORPUS_PATH;

afterEach(() => {
  if (originalCorpusPath === undefined) {
    delete process.env.SPAIN_AI_KIT_CORPUS_PATH;
  } else {
    process.env.SPAIN_AI_KIT_CORPUS_PATH = originalCorpusPath;
  }
});

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

  it('uses SPAIN_AI_KIT_CORPUS_PATH for installed-package deployments', async () => {
    const root = await mkdtemp(join(tmpdir(), 'spain-ai-kit-corpus-'));
    const corpusPath = join(root, 'legalize-es');
    const jurisdictionPath = join(corpusPath, 'es');

    await mkdir(jurisdictionPath, { recursive: true });
    await writeFile(
      join(jurisdictionPath, 'BOE-A-TEST-1.md'),
      '# Test law\n\nProtección de datos y derechos fundamentales.',
    );

    process.env.SPAIN_AI_KIT_CORPUS_PATH = corpusPath;

    try {
      const corpus = new CorpusIndex();
      expect(corpus.isAvailable()).toBe(true);

      const results = await corpus.search('protección');
      expect(results).toHaveLength(1);
      expect(results[0].boeId).toBe('BOE-A-TEST-1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
