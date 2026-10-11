import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';
type Top = 'open' | 'half' | 'full' | 'alternate' | 'tuck';
/** Developed automatic-base families. Diagonal scores identify the panels to pre-glue. */
export function automaticBase(p: Params, family: 'A' | 'B' | 'C', top: Top, id = 'body') {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance,
    edges = [p.glue],
    widths = [l, w, l, w],
    b = new GeometryBuilder();
  widths.forEach((width) => edges.push(edges[edges.length - 1] + width));
  const depths = widths.map((_, i) =>
    top === 'open'
      ? 0
      : top === 'full'
        ? w
        : top === 'alternate'
          ? i % 2
            ? l / 2
            : w / 2
          : top === 'tuck'
            ? i === 0
              ? w + p.lip
              : i % 2
                ? w / 2
                : 0
            : w / 2,
  );
  const y = Math.max(...depths),
    outline: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const a = edges[i] + (i ? gap / 2 : 0),
      c = edges[i + 1] - (i < 3 ? gap / 2 : 0),
      d = depths[i];
    outline.push([a, y]);
    if (d) {
      if (top === 'tuck' && i === 0) {
        const clip = Math.min(p.lip / 3, (c - a) / 8);
        outline.push([a, y - w], [a + clip, y - d], [c - clip, y - d], [c, y - w]);
        b.line('crease', id, [a, y - w], [c, y - w]);
      } else outline.push([a, y - d], [c, y - d]);
      b.line('crease', id, [a, y], [c, y]);
    }
    outline.push([c, y]);
  }
  const base = y + h;
  outline.push([edges[4], base]);
  for (let i = 3; i >= 0; i--) {
    const a = edges[i] + (i ? gap / 2 : 0),
      c = edges[i + 1] - (i < 3 ? gap / 2 : 0),
      mid = (a + c) / 2,
      d = family === 'B' && i === 2 ? w : w / 2,
      clip = p.bottomBevel;
    const at = (x: number, z: number): Point => [x, base + z];
    let points: Point[];
    if (i % 2) {
      if (family === 'B') {
        points = [at(a, 0), at(a + clip, d), at(c - clip, d), at(c, 0)];
        b.line('crease', id, at(a, 0), at(mid, d));
      } else {
        points = [at(a, 0), at(a + clip, d), at(mid, d), at(c, 0)];
        if (family === 'C' && i === 1) b.line('crease', id, at(a, 0), at(mid, d));
      }
    } else if (family === 'A') {
      const half = p.tabWidth / 2;
      points = [
        at(a, 0),
        at(a + clip, d),
        at(mid - half, d),
        at(mid - half, d - p.notchDepth),
        at(mid + half, d - p.notchDepth),
        at(mid + half, d),
        at(c - clip / 3, d),
        at(c, 0),
      ];
      b.line('crease', id, at(c, 0), at(mid + half, d - p.notchDepth));
    } else {
      points = [at(a, 0), at(a + clip, d), at(c - clip, d), at(c, 0)];
      b.line('crease', id, at(c, 0), at(family === 'C' && i === 2 ? mid : c - p.glue, d));
    }
    outline.push(...points.reverse());
    // Source alignment slots are real cut openings, kept separate from fold spans.
    if ((family === 'B' && i === 0) || (family === 'C' && i % 2 === 1)) {
      const left = mid - p.tabWidth / 2,
        right = mid + p.tabWidth / 2,
        depth = p.t + p.clearance;
      b.path(
        'cut',
        id,
        [
          [left, base - depth],
          [right, base - depth],
          [right, base],
          [left, base],
        ],
        true,
      );
      b.line('crease', id, [a, base], [left, base]);
      b.line('crease', id, [right, base], [c, base]);
    } else b.line('crease', id, [a, base], [c, base]);
  }
  const inset = Math.min(p.glue / 3, h / 5);
  outline.push([0, base - inset], [0, y + inset]);
  b.part(
    id,
    'גוף עם תחתית מודבקת מראש',
    outline.filter(
      (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
    ),
  );
  for (const x of edges.slice(0, 4)) b.line('crease', id, [x, y], [x, base]);
  return b.finish();
}
