import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';
type Flap = 'half' | 'none' | 'full' | 'tuck' | 'notch' | 'tongue' | 'left-lock' | 'right-lock';
/** Each flap carries its own developed outline; locks do not reuse rectangular RSC flaps. */
export function carton(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance;
  const widths = [l, w, l, w],
    edges = [p.glue];
  widths.forEach((width) => edges.push(edges[edges.length - 1] + width));
  const half: Flap[] = ['half', 'half', 'half', 'half'];
  const tuck: Flap[] = ['tuck', 'half', 'none', 'half'];
  const locks: Flap[] = ['notch', 'left-lock', 'tongue', 'right-lock'];
  const tops: Flap[] =
    code === '0221'
      ? ['none', 'none', 'none', 'none']
      : code === '0220'
        ? locks
        : code === '0216' || code.startsWith('0233')
          ? half
          : tuck;
  const bottoms: Flap[] =
    code === '0210'
      ? tuck
      : code === '0211'
        ? ['none', 'half', 'tuck', 'half']
        : code === '0212'
          ? half
          : code.startsWith('0233')
            ? ['tongue', 'half', code === '0233.1' ? 'notch' : 'tongue', 'half']
            : locks;
  const depth = (type: Flap) =>
    type === 'none' ? 0 : type === 'tuck' ? w + p.lip : type === 'full' ? w : w / 2;
  const topDepth = Math.max(...tops.map(depth)),
    b = new GeometryBuilder();
  const outline: Point[] = [];
  function flap(i: number, kind: Flap, y: number, sign: number) {
    const a = edges[i] + (i ? gap / 2 : 0),
      c = edges[i + 1] - (i < 3 ? gap / 2 : 0),
      mid = (a + c) / 2,
      d = depth(kind);
    const at = (x: number, z: number): Point => [x, y + sign * z];
    let points: Point[];
    if (kind === 'none') points = [at(a, 0), at(c, 0)];
    else if (kind === 'notch')
      points = [
        at(a, 0),
        at(a, d),
        at(mid - p.tabWidth / 2, d),
        at(mid - p.tabWidth / 2, d - p.lockDepth),
        at(mid + p.tabWidth / 2, d - p.lockDepth),
        at(mid + p.tabWidth / 2, d),
        at(c, d),
        at(c, 0),
      ];
    else if (kind === 'tongue') {
      const tongue = p.tabWidth - gap;
      points = [
        at(a, 0),
        at(mid - tongue / 2, d - p.lockDepth),
        at(mid - tongue / 2, d),
        at(mid + tongue / 2, d),
        at(mid + tongue / 2, d - p.lockDepth),
        at(c, 0),
      ];
    } else if (kind === 'left-lock')
      points = [at(a, 0), at(mid, d - p.lockDepth), at(mid, d), at(c, d), at(c, 0)];
    else if (kind === 'right-lock')
      points = [at(a, 0), at(a, d), at(mid, d), at(mid, d - p.lockDepth), at(c, 0)];
    else if (kind === 'tuck') {
      const bevel = Math.min(p.lip / 3, (c - a) / 8);
      points = [at(a, 0), at(a, w), at(a + bevel, d), at(c - bevel, d), at(c, w), at(c, 0)];
      b.line('crease', 'body', at(a, w), at(c, w));
    } else points = [at(a, 0), at(a, d), at(c, d), at(c, 0)];
    if (d) b.line('crease', 'body', at(a, 0), at(c, 0));
    if (code.startsWith('0233') && sign === 1 && i % 2 === 0) {
      b.line('crease', 'body', at(a, 0), at(mid - p.tabWidth / 2, d - p.lockDepth));
      b.line('crease', 'body', at(c, 0), at(mid + p.tabWidth / 2, d - p.lockDepth));
    }
    return points;
  }
  for (let i = 0; i < 4; i++) outline.push(...flap(i, tops[i], topDepth, -1));
  outline.push([edges[4], topDepth + h]);
  for (let i = 3; i >= 0; i--) outline.push(...flap(i, bottoms[i], topDepth + h, 1).reverse());
  const inset = Math.min(h / 5, p.glue / 3);
  outline.push([0, topDepth + h - inset], [0, topDepth + inset]);
  b.part(
    'body',
    'קופסה עם סגירה ייעודית',
    outline.filter(
      (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
    ),
  );
  for (const x of edges.slice(0, 4)) b.line('crease', 'body', [x, topDepth], [x, topDepth + h]);
  return b.finish();
}
