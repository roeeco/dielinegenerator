import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { parseSVG as parseSvgPath } from 'svg-path-parser';
import { defaultParams, effectiveCode, generators } from '../src/geometry/registry';
import {
  generateValidated,
  segmentKey,
  validateGeometry,
  validateParams,
} from '../src/geometry/validate';
import { exportSvg, svgFilename } from '../src/export/svg';
import type { DielineGeometry, Params, Point } from '../src/geometry/types';

function cross(a: Point, b: Point, c: Point) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function properIntersection(a: Point, b: Point, c: Point, d: Point) {
  return cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8;
}
function checkContours(g: DielineGeometry) {
  const cuts = new Set<string>();
  for (const p of g.paths) {
    expect(p.d).not.toMatch(/NaN|Infinity/);
    if (p.kind === 'cut') {
      const points = p.closed ? [...p.points, p.points[0]] : p.points;
      for (let i = 0; i < points.length - 1; i++) {
        const key = segmentKey(points[i], points[i + 1]);
        expect(cuts.has(key), key).toBe(false);
        cuts.add(key);
        for (let j = i + 2; j < points.length - 1; j++)
          expect(
            properIntersection(points[i], points[i + 1], points[j], points[j + 1]),
            `self crossing in ${p.partId}`,
          ).toBe(false);
      }
      if (p.closed) {
        let area = 0;
        for (let i = 0; i < points.length - 1; i++)
          area += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
        expect(Math.abs(area)).toBeGreaterThan(1);
      }
    }
    for (const [x, y] of p.points) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(x).toBeLessThanOrEqual(g.boundsMm.width + 1e-6);
      expect(y).toBeLessThanOrEqual(g.boundsMm.height + 1e-6);
    }
  }
}
for (const [id, def] of Object.entries(generators))
  describe(`generator ${id}`, () => {
    for (const scale of [0.5, 1, 3])
      it(`generates valid noncrossing contours and independent XML at scale ${scale}`, () => {
        const p = defaultParams(def);
        for (const field of def.fields)
          if (field.unit === 'מ״מ' && field.group !== 'material') p[field.key] *= scale;
        const result = generateValidated(id, p);
        expect(result.issues).toEqual([]);
        expect(result.geometry).not.toBeNull();
        const g = result.geometry!;
        checkContours(g);
        expect(validateGeometry(g)).toEqual([]);
        const svg = exportSvg(id, p, g);
        const parseErrors: string[] = [];
        const document = new DOMParser({
          errorHandler: {
            warning: (msg) => parseErrors.push(msg),
            error: (msg) => parseErrors.push(msg),
            fatalError: (msg) => parseErrors.push(msg),
          },
        }).parseFromString(svg, 'image/svg+xml');
        expect(parseErrors).toEqual([]);
        const root = document.documentElement;
        expect(root.getAttribute('width')).toBe(`${Number(g.boundsMm.width.toFixed(6))}mm`);
        expect(root.getAttribute('height')).toBe(`${Number(g.boundsMm.height.toFixed(6))}mm`);
        expect(root.getAttribute('viewBox')).toBe(
          `0 0 ${Number(g.boundsMm.width.toFixed(6))} ${Number(g.boundsMm.height.toFixed(6))}`,
        );
        expect(document.getElementsByTagName('path').length).toBe(g.paths.length);
        for (const path of Array.from(document.getElementsByTagName('path'))) {
          const commands = parseSvgPath(path.getAttribute('d')!);
          expect(commands[0].code).toBe('M');
          expect(commands.every((command) => ['M', 'L', 'Z'].includes(command.code))).toBe(true);
        }
        const groups = Array.from(document.getElementsByTagName('g'));
        expect(groups.some((group) => group.getAttribute('id') === 'CUT')).toBe(true);
        expect(groups.some((group) => group.getAttribute('id') === 'CREASE')).toBe(
          g.paths.some((p) => p.kind === 'crease'),
        );
        for (const tag of ['image', 'text', 'style', 'script', 'foreignObject'])
          expect(document.getElementsByTagName(tag).length).toBe(0);
        expect(svg).not.toMatch(/transform=|stroke-dasharray|<rect|<circle/);
        const metadata = JSON.parse(document.getElementsByTagName('metadata')[0].textContent!);
        expect(metadata.params).toEqual(p);
        expect(metadata.status).toBe('beta');
        expect(metadata.code).toBe(effectiveCode(id, p));
      });
    if (
      ['0201', '0204', '0300', '0401', '0453', '0501', '0901', '0902', '0910', '0982'].includes(id)
    )
      it('matches the reviewed default geometry snapshot', () => {
        expect(generateValidated(id, defaultParams(def)).geometry).toMatchSnapshot();
      });
    it('updates its real geometry when a dimension changes', () => {
      const p = defaultParams(def),
        dimension = def.fields.find((f) => f.group === 'dimension')!.key;
      const g = generateValidated(id, p).geometry!,
        changed = generateValidated(id, { ...p, [dimension]: p[dimension] + 40 }).geometry!;
      expect(g.paths.map((p) => p.d)).not.toEqual(changed.paths.map((p) => p.d));
      expect(g.boundsMm).not.toEqual(changed.boundsMm);
      expect(g.paths.map((p) => p.kind)).toEqual(changed.paths.map((p) => p.kind));
    });
    it('rejects non-finite and out-of-range input before geometry generation', () => {
      for (const value of [NaN, Infinity, 0, -3, 100000]) {
        const key = def.fields[0].key,
          result = generateValidated(id, { ...defaultParams(def), [key]: value });
        expect(result.geometry).toBeNull();
        expect(result.issues[0].severity).toBe('error');
        expect(() => exportSvg(id, { ...defaultParams(def), [key]: value })).toThrow();
      }
    });
  });
describe('construction and manufacturing constraints', () => {
  it('does not impose a global L >= W rule', () => {
    for (const id of ['0201', '0204', '0300', '0401', '0453', '0501', '0910']) {
      const p = { ...defaultParams(generators[id]), L: 120, W: 200, H: 40 };
      expect(generateValidated(id, p).issues, id).toEqual([]);
    }
  });
  it('models 0204 asymmetric flap depths instead of relabeling 0201', () => {
    const p = defaultParams(generators['0201']);
    const a = generateValidated('0201', p).geometry!,
      b = generateValidated('0204', p).geometry!;
    expect(a.boundsMm.height).toBe(p.H + p.W + 2 * p.t);
    expect(b.boundsMm.height).toBe(p.H + p.L + 2 * p.t);
    expect(a.paths[0].d).not.toBe(b.paths[0].d);
  });
  it('models 0300 vertical slots and 0453 horizontal slots, with lid nesting and spacing', () => {
    const p = defaultParams(generators['0300']),
      g = generateValidated('0300', p).geometry!;
    expect(g.parts.map((p) => p.id)).toEqual(['body', 'lid']);
    expect(g.parts[1].boundsMm.x - g.parts[0].boundsMm.width).toBeCloseTo(p.spacing);
    expect(g.parts[1].boundsMm.width).toBeCloseTo(p.L + 3 * p.t + p.fit + 2 * (p.lidDepth + p.t));
    expect(g.parts[1].boundsMm.height).toBeCloseTo(p.W + 3 * p.t + p.fit + 2 * (p.lidDepth + p.t));
    const tray = generateValidated('0453', {
      ...defaultParams(generators['0453']),
      H: p.H,
    }).geometry!;
    expect(g.paths[0].d).not.toBe(tray.paths[0].d);
    expect(
      validateParams('0300', { ...p, lidDepth: p.H + 1 }).some((i) => i.field === 'lidDepth'),
    ).toBe(true);
    expect(
      validateParams('0453', { ...defaultParams(generators['0453']), H: 100 }).some(
        (i) => i.field === 'H',
      ),
    ).toBe(true);
  });
  it('keeps material allowances separate from slot clearance and rejects thick material', () => {
    const p = defaultParams(generators['0201']),
      a = generateValidated('0201', p).geometry!;
    const b = generateValidated('0201', { ...p, clearance: 1 }).geometry!;
    expect(a.boundsMm).toEqual(b.boundsMm);
    expect(a.paths[0].d).not.toBe(b.paths[0].d);
    expect(generateValidated('0201', { ...p, L: 10, W: 10, H: 5, t: 5 }).geometry).toBeNull();
  });
  it('uses only relevant fields for flat inserts and a literal 100 mm square', () => {
    const p = { L: 100, W: 100 },
      g = generateValidated('0901', p).geometry!;
    expect(g.boundsMm).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(g.paths).toHaveLength(1);
    expect(exportSvg('0901', p)).toContain('width="100mm" height="100mm"');
    expect(generators['0901'].fields.map((f) => f.key)).toEqual(['L', 'W']);
    expect(generators['0902'].fields.map((f) => f.key)).toEqual(['W', 'H']);
  });
  it('creates the requested partition panel count and complementary open half-height slots', () => {
    for (let N = 2; N <= 19; N++) {
      const p = {
        ...defaultParams(generators['0982']),
        N,
        rows: Math.floor(N / 2),
        L: 400,
        W: 300,
      };
      const g = generateValidated('0982', p).geometry!;
      expect(g.parts).toHaveLength(N);
      expect(g.paths.every((path) => path.kind === 'cut')).toBe(true);
      checkContours(g);
      expect(effectiveCode('0982', p)).toBe(String(980 + N).padStart(4, '0'));
    }
    expect(
      validateParams('0982', { ...defaultParams(generators['0982']), N: 3.5 }).length,
    ).toBeGreaterThan(0);
    expect(
      validateParams('0982', { ...defaultParams(generators['0982']), rows: 2 }).some(
        (i) => i.field === 'rows',
      ),
    ).toBe(true);
    expect(
      validateParams('0982', {
        ...defaultParams(generators['0982']),
        L: 20,
        W: 20,
        N: 19,
        rows: 9,
      }).some((i) => i.field === 'N'),
    ).toBe(true);
  });
  it('blocks reference-only export and stale preview geometry', () => {
    expect(() => exportSvg('0436.1', { L: 200, W: 120, H: 80 })).toThrow();
    const p = defaultParams(generators['0201']),
      g = generateValidated('0201', p).geometry!;
    expect(() => exportSvg('0201', { ...p, L: 300 }, g)).toThrow();
    expect(svgFilename('0201', p)).toBe('FEFCO_0201_200x120x80_t1.0.svg');
  });
});

describe('edge dimensions', () => {
  for (const id of ['0201', '0204', '0300', '0401', '0453', '0501', '0910']) {
    for (const dimensions of [
      { L: 2000, W: 30, H: 10, t: 0.5 },
      { L: 30, W: 2000, H: 10, t: 0.5 },
      { L: 400, W: 300, H: 100, t: 5 },
    ]) {
      it(`${id}: extreme ratio/thickness ${JSON.stringify(dimensions)}`, () => {
        const p: Params = { ...defaultParams(generators[id]), ...dimensions };
        if (p.glue !== undefined) p.glue = 4;
        if (p.lidDepth !== undefined) p.lidDepth = dimensions.H;
        const result = generateValidated(id, p);
        expect(result.issues).toEqual([]);
        checkContours(result.geometry!);
        expect(() => exportSvg(id, p)).not.toThrow();
      });
    }
  }
});
