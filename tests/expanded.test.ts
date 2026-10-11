import { describe, expect, it } from 'vitest';
import { defaultParams, generators } from '../src/geometry/registry';
import { expandedGenerators } from '../src/geometry/expanded';
import { generateValidated } from '../src/geometry/validate';
import { exportSvg, svgFilename } from '../src/export/svg';

for (const [code, definition] of Object.entries(expandedGenerators)) {
  it(`${code}: every exposed parameter controls the construction`, () => {
    const params = defaultParams(definition),
      before = generateValidated(code, params).geometry!;
    for (const field of definition.fields) {
      const changed = generateValidated(code, {
        ...params,
        [field.key]: params[field.key] + field.step,
      });
      expect(changed.issues, `${code} ${field.key}`).toEqual([]);
      expect(
        changed.geometry!.paths.map((path) => path.d),
        `${code} ${field.key}`,
      ).not.toEqual(before.paths.map((path) => path.d));
    }
  });
}
describe('new construction evidence', () => {
  it('uses physical sheet totals and blocks crossing fold locations', () => {
    const p = defaultParams(generators['0112']);
    const g = generateValidated('0112', p).geometry!;
    expect(g.boundsMm.width).toBe(p.L);
    expect(g.boundsMm.height).toBe(p.W);
    expect(
      g.paths.filter((path) => path.kind === 'crease').map((path) => path.points[0][1]),
    ).toEqual([p.v1, p.v1 + p.v2]);
    expect(generateValidated('0112', { ...p, v1: p.W }).geometry).toBeNull();
    expect(
      generateValidated('0130', { ...defaultParams(generators['0130']), panels: 3.5 }).geometry,
    ).toBeNull();
  });
  it('distinguishes inward ear folds from outward ear folds', () => {
    const inward = generateValidated('0304', defaultParams(generators['0304'])).geometry!;
    const outward = generateValidated('0308', defaultParams(generators['0308'])).geometry!;
    expect(inward.paths.slice(-4).map((path) => path.d)).not.toEqual(
      outward.paths.slice(-4).map((path) => path.d),
    );
    expect(
      inward.paths
        .filter((path) => path.partId === 'body' && path.kind === 'crease')
        .map((path) => path.d),
    ).not.toEqual(
      outward.paths
        .filter((path) => path.partId === 'body' && path.kind === 'crease')
        .map((path) => path.d),
    );
  });
  it('retains separate nested sleeves and tabbed straps', () => {
    for (const code of ['0504', '0505', '0507', '0509', '0510', '0511', '0512']) {
      const p = defaultParams(generators[code]),
        g = generateValidated(code, p).geometry!;
      expect(g.parts).toHaveLength(2);
      expect(g.parts[1].boundsMm.x - g.parts[0].boundsMm.width).toBeCloseTo(p.spacing);
    }
    expect(
      generateValidated('0511', defaultParams(generators['0511'])).geometry!.paths.map(
        (path) => path.d,
      ),
    ).not.toEqual(
      generateValidated('0512', defaultParams(generators['0512'])).geometry!.paths.map(
        (path) => path.d,
      ),
    );
  });
  it('calculates diagonal support lengths instead of scaling all legs equally', () => {
    const p = defaultParams(generators['0945']),
      g = generateValidated('0945', p).geometry!;
    expect(g.boundsMm.width).toBeCloseTo(p.W + 2 * p.H + 2 * Math.hypot(p.H, p.H));
    const changed = generateValidated('0945', { ...p, H: 60 }).geometry!;
    expect(changed.boundsMm.width).toBeCloseTo(p.W + 120 + 2 * Math.hypot(60, 60));
  });
  it('exports layer cuts separately and identifies them in the metadata', () => {
    const p = defaultParams(generators['0965']),
      svg = exportSvg('0965', p);
    expect(svg).toContain('id="PARTIAL_CUT" stroke="#008000"');
    expect(svg).not.toContain('id="CREASE"');
  });
  it('packs mixed-height complementary grid parts and validates counts', () => {
    const p = defaultParams(generators['0935']),
      g = generateValidated('0935', p).geometry!;
    expect(g.parts).toHaveLength(p.rows + p.columns);
    expect(g.parts.filter((part) => part.boundsMm.height === p.H)).toHaveLength(
      p.fullHeightColumns,
    );
    expect(
      generateValidated('0935', { ...p, fullHeightColumns: p.columns + 1 }).geometry,
    ).toBeNull();
    expect(
      generateValidated('0934', { ...defaultParams(generators['0934']), v: 1 }).geometry,
    ).toBeNull();
  });
  it('bounds and separates hole contours and records special dimensions in filenames', () => {
    const p = defaultParams(generators['0952']),
      g = generateValidated('0952', p).geometry!;
    expect(g.paths.filter((path) => path.kind === 'cut' && path.closed)).toHaveLength(3);
    expect(svgFilename('0952', p)).toContain('_holeDiameter12_holeSpacing50');
    expect(generateValidated('0952', { ...p, holeSpacing: p.W }).geometry).toBeNull();
  });
});
