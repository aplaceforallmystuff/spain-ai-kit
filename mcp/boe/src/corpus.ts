import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface CorpusEntry {
  boeId: string;
  filename: string;
  path: string;
  jurisdiction: string;
}

interface SearchResult {
  boeId: string;
  jurisdiction: string;
  matchingLines: string[];
}

interface SearchOptions {
  jurisdiction?: string;
  limit?: number;
}

/**
 * In-memory index of the legalize-es corpus.
 * Built lazily on first search. Searches via string matching on file contents.
 */
export class CorpusIndex {
  private entries: CorpusEntry[] = [];
  private indexed = false;
  private indexPromise: Promise<void> | null = null;
  private corpusPath: string;

  constructor() {
    // Resolve corpus path relative to the project root.
    // When running from dist/, go up to mcp/boe/, then to project root.
    const thisDir = typeof __dirname !== 'undefined'
      ? __dirname
      : fileURLToPath(new URL('.', import.meta.url));
    this.corpusPath = resolve(thisDir, '..', '..', '..', 'corpus', 'legalize-es');
  }

  isAvailable(): boolean {
    return existsSync(this.corpusPath) && existsSync(join(this.corpusPath, 'es'));
  }

  private async buildIndex(): Promise<void> {
    if (this.indexed) return;
    if (!this.indexPromise) {
      this.indexPromise = this.doBuildIndex();
    }
    return this.indexPromise;
  }

  private async doBuildIndex(): Promise<void> {
    if (!this.isAvailable()) {
      this.indexed = true;
      return;
    }

    const jurisdictions = await readdir(this.corpusPath);
    for (const dir of jurisdictions) {
      // Only index jurisdiction directories (es, es-vc, es-ct, etc.)
      if (!dir.startsWith('es')) continue;

      const dirPath = join(this.corpusPath, dir);
      try {
        const files = await readdir(dirPath);
        for (const file of files) {
          if (!file.endsWith('.md')) continue;
          const boeId = file.replace('.md', '');
          this.entries.push({
            boeId,
            filename: file,
            path: join(dirPath, file),
            jurisdiction: dir,
          });
        }
      } catch {
        // Skip non-directories or permission errors
      }
    }

    this.indexed = true;
    console.error(`Corpus indexed: ${this.entries.length} laws across ${new Set(this.entries.map(e => e.jurisdiction)).size} jurisdictions`);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    await this.buildIndex();

    if (this.entries.length === 0) return [];

    const q = query.toLowerCase();
    const limit = options.limit ?? 10;
    const results: SearchResult[] = [];

    const candidates = options.jurisdiction
      ? this.entries.filter((e) => e.jurisdiction === options.jurisdiction)
      : this.entries;

    for (const entry of candidates) {
      if (results.length >= limit) break;

      try {
        const content = await readFile(entry.path, 'utf-8');
        if (!content.toLowerCase().includes(q)) continue;

        // Extract matching lines with context
        const lines = content.split('\n');
        const matchingLines: string[] = [];
        for (let i = 0; i < lines.length && matchingLines.length < 3; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            matchingLines.push(lines[i].trim());
          }
        }

        results.push({
          boeId: entry.boeId,
          jurisdiction: entry.jurisdiction,
          matchingLines,
        });
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  }

  async readLaw(identifier: string): Promise<string | null> {
    await this.buildIndex();

    const cleanId = identifier.replace('.md', '');
    const entry = this.entries.find((e) => e.boeId === cleanId);

    if (!entry) return null;

    try {
      return await readFile(entry.path, 'utf-8');
    } catch {
      return null;
    }
  }
}
