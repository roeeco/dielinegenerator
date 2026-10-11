import { describe, it, expect } from 'vitest';
import { defaultParams, generators } from '../src/geometry/registry';
import { generateValidated } from '../src/geometry/validate';
import { exportSvg } from '../src/export/svg';
const geometry = (code: string) =>
  generateValidated(code, defaultParams(generators[code])).geometry!;
describe('rigid wraps and automatic bases', () => {
  it('packs all rigid designs as separate assembled components', () => {
    for (const code of [
      '0601',
      '0602',
      '0605',
      '0606',
      '0607',
      '0608',
      '0610',
      '0615',
      '0616',
      '0620',
    ]) {
      const p = defaultParams(generators[code]),
        g = geometry(code);
      expect(g.parts.map((part) => part.id)).toEqual(['body', 'end-a', 'end-b']);
      expect(g.parts[1].boundsMm.x - g.parts[0].boundsMm.width).toBeCloseTo(p.spacing);
      expect(g.parts[2].boundsMm.x - g.parts[1].boundsMm.x - g.parts[1].boundsMm.width).toBeCloseTo(
        p.spacing,
      );
      expect(exportSvg(code, p)).toContain('data-part="end-b"');
    }
    expect(geometry('0621').parts.map((part) => part.id)).toEqual(['half-a', 'half-b']);
  });
  it('retains the closing lip and four-sided end-panel construction', () => {
    const a = geometry('0601'),
      b = geometry('0602'),
      p = defaultParams(generators['0602']);
    expect(b.parts[0].boundsMm.width - a.parts[0].boundsMm.width).toBeCloseTo(p.v);
    const cap = geometry('0605');
    expect(
      cap.paths.filter((path) => path.partId === 'end-a' && path.kind === 'crease'),
    ).toHaveLength(8);
  });
  it('blocks double-wall cap folds when the returns overlap', () => {
    const p = defaultParams(generators['0615']);
    expect(
      generateValidated('0615', { ...p, v: 12 }).issues.some((issue) => issue.field === 'v'),
    ).toBe(true);
  });
  it('uses the six-panel middle joint for 0228', () => {
    const p = defaultParams(generators['0228']),
      g = geometry('0228');
    expect(g.boundsMm.width).toBeCloseTo(2 * (p.L + p.t) + 3 * (p.W + p.t) + p.overlap);
    expect(g.boundsMm.height).toBeCloseTo(p.H + p.W + 2 * p.t);
  });
  it('bounds return flaps by H instead of inventing a half-width formula', () => {
    for (const code of ['0229', '0229.1']) {
      const p = defaultParams(generators[code]);
      expect(generateValidated(code, { ...p, returnDepth: p.H + 1 }).geometry).toBeNull();
      expect(generateValidated(code, { ...p, returnDepth: p.H }).geometry).not.toBeNull();
    }
  });
  it('splits 0208 short-panel flaps and scores both ends separately', () => {
    const p = defaultParams(generators['0208']),
      g = geometry('0208');
    expect(g.boundsMm.height).toBeCloseTo(p.H + p.W + 2 * p.v + 2 * p.t);
    expect(g.paths.filter((path) => path.kind === 'crease')).toHaveLength(28);
    expect(g.paths.find((path) => path.kind === 'cut')!.points.length).toBeGreaterThan(
      geometry('0201').paths[0].points.length,
    );
  });
  it('includes material pitch in the rolled corner-ear overlap limit', () => {
    for (const code of ['0454', '0455', '0456']) {
      const p = defaultParams(generators[code]);
      const span = code === '0454' ? p.L : code === '0455' ? p.W : Math.min(p.L, p.W);
      expect(generateValidated(code, { ...p, H: span / 4 }).geometry).toBeNull();
      expect(generateValidated(code, { ...p, H: (span - 3 * p.t) / 4 }).geometry).not.toBeNull();
    }
  });
  it('preserves three different pre-glued bottom shapes and inverted telescopic lid', () => {
    const a = geometry('0700'),
      b = geometry('0702'),
      c = geometry('0706');
    expect(a.paths.find((path) => path.closed)!.d).not.toEqual(
      b.paths.find((path) => path.closed)!.d,
    );
    expect(a.paths.find((path) => path.closed)!.d).not.toEqual(
      c.paths.find((path) => path.closed)!.d,
    );
    const p = defaultParams(generators['0702']);
    expect(b.boundsMm.height).toBeCloseTo(p.H + p.W + 2 * p.t);
    expect(a.boundsMm.height).toBeCloseTo(p.H + (p.W + p.t) / 2 + p.t);
    expect(geometry('0714').parts.map((part) => part.id)).toEqual(['body', 'lid']);
  });
  it('keeps pre-glued wrapper diagonal folds inside their respective panels', () => {
    for (const code of ['0718', '0747', '0748', '0761']) {
      const g = geometry(code);
      expect(
        g.paths.filter(
          (path) =>
            path.kind === 'crease' &&
            path.points[0][0] !== path.points[1][0] &&
            path.points[0][1] !== path.points[1][1],
        ).length,
      ).toBeGreaterThanOrEqual(4);
    }
    expect(geometry('0747').paths.map((path) => path.d)).not.toEqual(
      geometry('0748').paths.map((path) => path.d),
    );
  });
});
