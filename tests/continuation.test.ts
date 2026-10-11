import { describe, expect, it } from 'vitest';
import { defaultParams, generators } from '../src/geometry/registry';
import { generateValidated } from '../src/geometry/validate';
import type { Point } from '../src/geometry/types';
const params = (code: string) => defaultParams(generators[code]);
const geometry = (code: string) => generateValidated(code, params(code)).geometry!;
function inside(point: Point, poly: Point[]) {
  let result = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
describe('handled cartons and retail displays', () => {
  it('keeps hand openings and Euro slots entirely inside their carton panels', () => {
    for (const code of ['0217', '0219', '0222', '0240', '0241', '0242']) {
      const g = geometry(code),
        outline = g.paths
          .filter((path) => path.kind === 'cut' && path.closed)
          .sort((a, b) => {
            const area = (points: Point[]) =>
              Math.abs(
                points.reduce(
                  (sum, q, i) =>
                    sum +
                    q[0] * points[(i + 1) % points.length][1] -
                    q[1] * points[(i + 1) % points.length][0],
                  0,
                ),
              );
            return area(b.points) - area(a.points);
          })[0];
      for (const hole of g.paths.filter((p) => p.kind === 'cut' && p.closed && p !== outline))
        expect(
          hole.points.every((point) => inside(point, outline.points)),
          code,
        ).toBe(true);
    }
  });
  it('retains the two matching hanging holes and the separate label-board stem', () => {
    const cuts = (code: string) => geometry(code).paths.filter((p) => p.kind === 'cut' && p.closed);
    expect(cuts('0240')).toHaveLength(3);
    expect(cuts('0241')).toHaveLength(3);
    expect(cuts('0242')).toHaveLength(3);
    const p = params('0242'),
      g = geometry('0242');
    expect(g.boundsMm.height).toBeCloseTo(
      p.H + p.t + (p.W + p.t) + p.lip + 2 * p.v + p.headerDepth,
    );
    expect(
      g.paths.filter(
        (path) =>
          path.kind === 'crease' &&
          Math.abs(path.points[1][0] - path.points[0][0] - p.tabWidth) < 1e-6,
      ),
    ).toHaveLength(3);
  });
  it('does not silently replace full-depth, joined and diagonal-lock bottoms', () => {
    const a = geometry('0207'),
      b = geometry('0225'),
      c = geometry('0232');
    expect(a.paths.filter((p) => p.kind === 'cut' && !p.closed)).toHaveLength(2);
    expect(
      b.paths.filter((p) => p.kind === 'crease' && p.points[0][0] === p.points[1][0]),
    ).toHaveLength(6);
    expect(c.paths.filter((p) => p.kind === 'cut' && !p.closed)).toHaveLength(4);
    expect(a.boundsMm.height).toBeCloseTo(
      params('0207').H + 1.5 * (params('0207').W + params('0207').t) + params('0207').t,
    );
  });
  it('rejects holes and return tabs that cannot fit their panels', () => {
    expect(generateValidated('0242', { ...params('0242'), handleWidth: 35 }).geometry).toBeNull();
    expect(generateValidated('0240', { ...params('0240'), handleWidth: 8 }).geometry).toBeNull();
    expect(
      generateValidated('0881', { ...params('0881'), slotDepth: params('0881').H }).geometry,
    ).toBeNull();
  });
  it('exports the three display-card constructions without invented box fields', () => {
    expect(generators['0880'].fields.some((f) => f.key === 'W')).toBe(false);
    expect(generators['0881'].fields.some((f) => f.key === 'W')).toBe(false);
    expect(geometry('0880').paths.filter((p) => p.kind === 'crease')).toHaveLength(1);
    expect(geometry('0881').paths.filter((p) => p.kind === 'crease')).toHaveLength(0);
    expect(geometry('0882').paths.filter((p) => p.kind === 'crease')).toHaveLength(2);
  });
  it('retains separately packed shelf components and the central divider variant', () => {
    for (const code of ['0830', '0831', '0833']) {
      const g = geometry(code),
        p = params(code);
      expect(g.parts.map((part) => part.id)).toEqual([
        'body',
        ...(code === '0831' ? ['divider'] : []),
        ...Array.from({ length: p.shelfCount }, (_, i) => `shelf-${i + 1}`),
      ]);
      for (let i = 1; i < g.parts.length; i++)
        expect(
          g.parts[i].boundsMm.x - g.parts[i - 1].boundsMm.x - g.parts[i - 1].boundsMm.width,
        ).toBeCloseTo(p.spacing);
      expect(generateValidated(code, { ...p, shelfCount: 2.5 }).geometry).toBeNull();
      expect(generateValidated(code, { ...p, H: 80, shelfCount: 8 }).geometry).toBeNull();
    }
    const a = geometry('0830').parts.find((p) => p.id === 'shelf-1')!;
    const b = geometry('0833').parts.find((p) => p.id === 'shelf-1')!;
    expect(b.boundsMm.height - a.boundsMm.height).toBeCloseTo(
      params('0830').W + params('0830').t - params('0830').v,
    );
  });
  it('keeps the stair display as three treads and three complementary supports', () => {
    const g = geometry('0960');
    expect(g.parts.map((p) => p.id)).toEqual([
      'tread-1',
      'tread-2',
      'tread-3',
      'support-1',
      'support-2',
      'support-3',
    ]);
    const p = params('0960');
    expect(g.parts[1].boundsMm.height - g.parts[0].boundsMm.height).toBeCloseTo(p.H + p.t);
    expect(generateValidated('0960', { ...p, v: p.H / 2 }).geometry).toBeNull();
  });
  it('derives the inclined stand face from height and footprint', () => {
    const p = params('0852'),
      g = geometry('0852');
    expect(g.parts).toHaveLength(1);
    expect(g.boundsMm.width).toBeCloseTo(
      Math.hypot(p.H + p.t, p.W + p.t) + p.W + p.H + 2 * p.t + p.glue,
    );
    expect(g.boundsMm.x).toBe(0);
    expect(g.boundsMm.y).toBe(0);
  });
  it('changes polygon panel count and base topology together and rejects fractions', () => {
    const p = params('0859');
    for (const N of [3, 6, 8, 12]) {
      const g = generateValidated('0859', { ...p, N }).geometry!;
      expect(g.parts).toHaveLength(2);
      expect(g.paths.find((path) => path.partId === 'base')!.points).toHaveLength(N);
      expect(g.parts[0].boundsMm.width).toBeCloseTo(p.glue + N * (p.L + p.t));
    }
    expect(generateValidated('0859', { ...p, N: 6.5 }).geometry).toBeNull();
  });
});
