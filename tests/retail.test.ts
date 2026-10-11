import type { Params } from '../src/geometry/types';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog';
import { defaultParams, generators } from '../src/geometry/registry';
import { retailGenerators } from '../src/geometry/retail';
import { generateValidated } from '../src/geometry/validate';
import { assertRetailGeometry } from '../src/geometry/retail/safety';
import { GeometryBuilder, rectangle } from '../src/geometry/primitives';
import { exportSvg } from '../src/export/svg';
const geometry = (id: string, change: Record<string, number> = {}) => {
  const result = generateValidated(id, { ...defaultParams(generators[id]), ...change });
  expect(result.issues, id).toEqual([]);
  expect(result.geometry, id).not.toBeNull();
  return result.geometry!;
};
describe('complete retail source coverage', () => {
  it('implements all 49 category 08 source entries without duplicating catalog codes', () => {
    const entries = catalog.filter((e) => e.category === '08');
    expect(entries).toHaveLength(49);
    expect(new Set(entries.map((e) => e.code)).size).toBe(49);
    expect(entries.every((e) => e.status === 'beta' && e.generatorId === e.code)).toBe(true);
    expect(Object.keys(retailGenerators)).toHaveLength(38);
    for (const e of entries) expect(generators[e.code]).toBeDefined();
  });
  it('rejects a detached cut and a self-crossing exterior before preview or export', () => {
    const b = new GeometryBuilder();
    b.part('body', 'panel', rectangle(0, 0, 100, 80));
    b.line('cut', 'body', [110, 10], [120, 10]);
    expect(() => assertRetailGeometry(b.finish())).toThrow(/outside/);
    const c = new GeometryBuilder();
    c.part('body', 'crossing', [
      [0, 0],
      [100, 80],
      [0, 80],
      [100, 0],
    ]);
    expect(() => assertRetailGeometry(c.finish())).toThrow(/Crossing/);
  });
  it('retains distinct tray return and receiver constructions', () => {
    const profiles = ['0802', '0803', '0804', '0808', '0809', '0815', '0816', '0817'].map((id) =>
      JSON.stringify(geometry(id).paths.map((path) => path.d)),
    );
    expect(new Set(profiles).size).toBe(profiles.length);
    const twoWalls = geometry('0802'),
      fourWalls = geometry('0803');
    expect(twoWalls.paths.filter((p) => p.kind === 'cut' && p.closed).length).toBeLessThan(
      fourWalls.paths.filter((p) => p.kind === 'cut' && p.closed).length,
    );
  });
  for (const id of ['0832', '0834', '0840', '0845', '0846', '0847', '0849'])
    it(`${id} exports every separately constructed shelf and support`, () => {
      const p = defaultParams(generators[id]),
        g = geometry(id);
      const shelves = g.parts.filter(
        (part) => part.id.startsWith('shelf-') || part.id.startsWith('tray-'),
      );
      expect(shelves).toHaveLength(p.shelfCount);
      const increased = geometry(id, { shelfCount: p.shelfCount + 1 });
      expect(increased.parts.length).toBeGreaterThan(g.parts.length);
      const svg = exportSvg(id, p);
      for (const part of g.parts) expect(svg).toContain(`data-part="${part.id}"`);
      expect(
        g.parts.every(
          (part, i) =>
            i === 0 ||
            part.boundsMm.x >=
              g.parts[i - 1].boundsMm.x + g.parts[i - 1].boundsMm.width + p.spacing - 1e-6,
        ),
      ).toBe(true);
    });
  it('keeps integral shelf hinges attached instead of adding separate shelf rectangles', () => {
    for (const id of ['0842', '0843']) {
      const g = geometry(id);
      expect(g.parts).toHaveLength(1);
      expect(g.paths.some((p) => p.kind === 'cut' && !p.closed && p.points.length >= 3)).toBe(true);
      expect(g.paths.some((p) => p.kind === 'crease' && p.points[0][1] === p.points[1][1])).toBe(
        true,
      );
      expect(
        generateValidated(id, { ...defaultParams(generators[id]), shelfCount: 6 }).geometry,
      ).toBeNull();
    }
  });
  it('develops a circular 0845 sleeve to its circumference, independent of raster artwork', () => {
    const p: Params = { ...defaultParams(generators['0845']), L: 160, W: 160 },
      g = geometry('0845', p);
    expect(g.parts.find((part) => part.id === 'body')!.boundsMm.width).toBeCloseTo(
      p.glue + Math.PI * (p.L + p.t),
      5,
    );
    expect(g.parts.filter((part) => part.id.startsWith('support-'))).toHaveLength(2);
  });
  it('matches round product apertures between the 0847 sleeve and its two internal supports', () => {
    const p = defaultParams(generators['0847']),
      g = geometry('0847');
    const round = g.paths.filter(
      (path) =>
        path.kind === 'cut' &&
        path.closed &&
        path.points.length > 20 &&
        Math.max(...path.points.map((pt) => pt[1])) - Math.min(...path.points.map((pt) => pt[1])) <
          p.holeDiameter + 0.01,
    );
    expect(round.filter((path) => path.partId === 'body')).toHaveLength(
      2 * p.columns * p.shelfCount,
    );
    for (const id of ['support-1', 'support-2'])
      expect(round.filter((path) => path.partId === id)).toHaveLength(p.columns * p.shelfCount);
    expect(generateValidated('0847', { ...p, holeDiameter: 100 }).geometry).toBeNull();
  });
  it('uses complementary grid parts and leaves the perforated platform specific to 0853', () => {
    for (const id of ['0848', '0853', '0854']) {
      const p = defaultParams(generators[id]),
        g = geometry(id);
      expect(g.parts.filter((part) => part.id.startsWith('partition-'))).toHaveLength(
        p.columns + p.rows - 2,
      );
      expect(geometry(id, { columns: p.columns + 1 }).parts).toHaveLength(g.parts.length + 1);
      expect(generateValidated(id, { ...p, columns: 2.5 }).geometry).toBeNull();
    }
    const platform = geometry('0853').paths.filter(
      (path) =>
        path.partId === 'platform' && path.kind === 'cut' && path.closed && path.points.length > 20,
    );
    const p = defaultParams(generators['0853']);
    expect(platform).toHaveLength(p.columns * p.rows);
  });
  it('keeps the 0860 separate folded base distinct from the one-piece twisted 0861 net', () => {
    expect(geometry('0860').parts.map((part) => part.id)).toEqual(['body', 'base']);
    const twisted = geometry('0861');
    expect(twisted.parts).toHaveLength(1);
    expect(
      twisted.paths.filter(
        (path) =>
          path.kind === 'crease' &&
          path.points[0][0] !== path.points[1][0] &&
          path.points[0][1] !== path.points[1][1],
      ),
    ).toHaveLength(4);
  });
  it('keeps transport tear perforations distinct from the open display shell', () => {
    expect(geometry('0865').paths.some((path) => path.kind === 'perforation')).toBe(false);
    expect(geometry('0866').paths.filter((path) => path.kind === 'perforation')).toHaveLength(2);
  });
  it('develops every requested stair tread and riser as one connected 0870 blank', () => {
    for (const steps of [1, 2, 3, 4]) {
      const g = geometry('0870', { steps });
      expect(g.parts).toHaveLength(1);
      expect(g.paths.filter((path) => path.kind === 'cut' && path.closed)).toHaveLength(
        1 + 2 * steps,
      );
    }
    expect(
      generateValidated('0870', { ...defaultParams(generators['0870']), steps: 2.5 }).geometry,
    ).toBeNull();
  });
  it('retains the four source components of the 0872 two-column, three-row shelving unit', () => {
    expect(geometry('0872').parts.map((part) => part.id)).toEqual([
      'body',
      'divider',
      'shelf-1',
      'shelf-2',
    ]);
  });
  it('exports opening strips separately from cuts and keeps tape out of the cut layer', () => {
    for (const id of ['0885', '0886', '0887']) {
      const p = defaultParams(generators[id]),
        g = geometry(id);
      expect(g.paths.filter((path) => path.kind === 'tear')).toHaveLength(2);
      expect(exportSvg(id, p)).toContain('id="TEAR"');
      expect(geometry(id, { sealWidth: p.sealWidth + 2 }).boundsMm).not.toEqual(g.boundsMm);
      expect(generateValidated(id, { ...p, sealWidth: 50, tearWidth: 40 }).geometry).toBeNull();
    }
  });
});

it('clears 0853/0854 platform corners so its four flanges can fold independently', () => {
  for (const code of ['0853', '0854']) {
    const g = geometry(code),
      part = g.parts.find((part) => part.id === 'platform')!;
    const outer = g.paths.find(
      (path) => path.partId === 'platform' && path.closed && path.points.length > 8,
    )!;
    expect(outer.points.some(([x, y]) => x === part.boundsMm.x && y === part.boundsMm.y)).toBe(
      false,
    );
    expect(
      g.paths.filter((path) => path.partId === 'platform' && path.kind === 'crease'),
    ).toHaveLength(4);
  }
});

it('matches 0885 locking tongue widths to the end-return receiver slots', () => {
  const p = defaultParams(generators['0885']),
    g = geometry('0885');
  const outline = g.paths.find(
    (path) => path.kind === 'cut' && path.closed && path.points.length > 12,
  )!;
  const tips = outline.points.filter(
    (point, i) => point[1] === 0 && outline.points[(i + 1) % outline.points.length][1] === 0,
  );
  expect(tips).toHaveLength(2);
  for (const tip of tips) {
    const i = outline.points.indexOf(tip);
    expect(outline.points[(i + 1) % outline.points.length][0] - tip[0]).toBeCloseTo(p.tabWidth);
  }
});
