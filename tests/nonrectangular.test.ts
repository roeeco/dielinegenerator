import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { readFileSync } from 'node:fs';
import { defaultParams, generators } from '../src/geometry/registry';
import { generateValidated } from '../src/geometry/validate';
import { bookSources } from '../src/geometry/nonrectangular';
import type { Params } from '../src/geometry/types';
import { exportSvg, svgFilename } from '../src/export/svg';

describe('non-rectangular source constructions', () => {
  it('preserves both pillow closures as one family with different fold and cut topology', () => {
    const base = defaultParams(generators['SPD-pillow-pack']);
    for (const scale of [0.5, 1, 3]) {
      const p = Object.fromEntries(
        Object.entries(base).map(([key, value]) => [
          key,
          key === 't' || key === 'closureVariant' ? value : value * scale,
        ]),
      );
      for (const closureVariant of [0, 1]) {
        const result = generateValidated('SPD-pillow-pack', { ...p, closureVariant });
        expect(result.issues).toEqual([]);
        const g = result.geometry!;
        expect(g.boundsMm.x).toBe(0);
        expect(g.boundsMm.y).toBe(0);
        const curved = g.paths.filter((path) => path.kind === 'crease' && path.points.length > 2);
        expect(curved).toHaveLength(closureVariant ? 2 : 4);
        const receiver = g.paths.filter((path) => path.kind === 'cut' && !path.closed);
        expect(receiver).toHaveLength(closureVariant ? 1 : 0);
        for (const path of receiver)
          for (const [x, y] of path.points) {
            expect(x).toBeGreaterThan(0);
            expect(x).toBeLessThan(g.boundsMm.width);
            expect(y).toBeGreaterThan(0);
            expect(y).toBeLessThan(g.boundsMm.height);
          }
      }
    }
    const p: Params = { ...base, closureVariant: 1 };
    for (const key of ['L', 'W', 'curveDepth', 'tuckDepth', 'tabWidth', 'glue', 't']) {
      const field = generators['SPD-pillow-pack'].fields.find((f) => f.key === key)!;
      const g = generateValidated('SPD-pillow-pack', { ...p, [key]: p[key] + field.step });
      expect(g.issues).toEqual([]);
      expect(g.geometry?.paths).not.toEqual(
        generateValidated('SPD-pillow-pack', p).geometry?.paths,
      );
    }
    const invalid: Params[] = [
      { closureVariant: 0.5 },
      { curveDepth: base.W / 2 },
      { closureVariant: 1, tabWidth: base.L },
    ];
    for (const bad of invalid) {
      expect(generateValidated('SPD-pillow-pack', { ...base, ...bad }).geometry).toBeNull();
    }
  });
  it('keeps book source provenance and identifiers separate from FEFCO', () => {
    const coverage = JSON.parse(readFileSync('docs/book-generator-coverage.json', 'utf8'));
    expect(coverage.map((e: { code: string }) => e.code).sort()).toEqual(
      Object.keys(bookSources).sort(),
    );
    for (const id of Object.keys(bookSources)) {
      const p = defaultParams(generators[id]);
      const xml = new DOMParser().parseFromString(exportSvg(id, p), 'image/svg+xml');
      const metadata = JSON.parse(xml.getElementsByTagName('metadata')[0].textContent!);
      expect(metadata.source).toBe('Structural Package Designs');
      expect(svgFilename(id, p)).toMatch(/^SPD-/);
      expect(coverage.find((e: { code: string }) => e.code === id).fields).toEqual(
        generators[id].fields.map((f) => f.key),
      );
    }
    expect(svgFilename('0459', defaultParams(generators['0459']))).toMatch(/^FEFCO_0459/);
  });
  it('makes complementary hexagonal caps and belt as two independently packed parts', () => {
    const id = 'SPD-hexagonal-ring-box',
      p = defaultParams(generators[id]),
      g = generateValidated(id, p).geometry!;
    expect(svgFilename(id, p)).toContain('_60x30_');
    expect(g.parts.map((part) => part.id)).toEqual(['body', 'belt']);
    const topCapFolds = g.paths.filter((path) => path.kind === 'crease' && path.partId === 'body');
    expect(topCapFolds).toHaveLength(10);
    for (const field of generators[id].fields) {
      expect(
        generateValidated(id, { ...p, [field.key]: p[field.key] + field.step }).geometry?.paths,
      ).not.toEqual(g.paths);
    }
  });
  it('keeps the 0858 bottom tongues and octagonal base distinct from 0859', () => {
    const id = '0858',
      p = defaultParams(generators[id]),
      g = generateValidated(id, p).geometry!;
    const base = g.paths.find((path) => path.partId === 'base' && path.closed)!;
    expect(base.points).toHaveLength(8);
    const cuts = g.paths.filter((path) => path.kind === 'cut' && !path.closed);
    const supports = cuts.filter(
      (path) => path.points[0][1] === p.H + p.t && path.points[1][1] === p.H + p.t,
    );
    expect(supports).toHaveLength(4);
    for (const support of supports)
      expect(support.points[1][0] - support.points[0][0]).toBeCloseTo(
        (p.L + p.t) / (2 * (1 + Math.sqrt(2))),
      );
    expect(cuts).toHaveLength(11);
    const bad = generateValidated(id, { ...p, v: p.L });
    expect(bad.geometry).toBeNull();
    expect(
      generateValidated('0459', { ...defaultParams(generators['0459']), corner: 10 }).geometry,
    ).toBeNull();
  });
});
