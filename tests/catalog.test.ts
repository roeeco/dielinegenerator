import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog, findEntry, sourceCatalog, categories, availableCount } from '../src/catalog';
import { generators } from '../src/geometry/registry';
describe('source catalog', () => {
  it('preserves all 324 unique entries and exact category counts', () => {
    expect(sourceCatalog).toHaveLength(324);
    expect(new Set(sourceCatalog.map((c) => c.code)).size).toBe(324);
    const expected = [11, 36, 25, 86, 10, 11, 41, 49, 55];
    categories.forEach(([category], i) =>
      expect(sourceCatalog.filter((c) => c.category === category)).toHaveLength(expected[i]),
    );
  });
  it('has readable WebP artwork and all generator reference images', () => {
    for (const e of catalog) {
      const path = resolve('public', e.thumbnail);
      expect(existsSync(path), e.code).toBe(true);
      if (e.thumbnail.endsWith('.webp')) {
        const bytes = readFileSync(path);
        expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
        expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
        expect(bytes.length).toBeGreaterThan(200);
      }
      if (e.referenceImage) expect(existsSync(resolve('public', e.referenceImage))).toBe(true);
      if (e.generatorId)
        expect(e.requiredParams).toEqual(generators[e.generatorId].fields.map((f) => f.key));
      else expect(e.status).toBe('reference');
      expect(e.status).not.toBe('verified');
    }
  });
  it('represents 0982–0999 once, with all codes resolving to the same generator', () => {
    expect(catalog).toHaveLength(325);
    expect(availableCount).toBe(10);
    for (let code = 982; code <= 999; code++)
      expect(findEntry(String(code).padStart(4, '0'))?.generatorId).toBe('0982');
    expect(findEntry('0436.1')?.generatorId).toBe(null);
  });
});
