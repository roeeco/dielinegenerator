import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';

/** Crease-to-crease allowances are explicit beta engineering assumptions, not FEFCO manufacturing tolerances. */
export function slotted(params: Params, variant: '0201' | '0204') {
  const { L, W, H, t, glue, clearance } = params;
  const widths = [L + t, W + t, L + t, W + t];
  const flaps = widths.map((_, i) => (variant === '0204' && i % 2 ? (L + t) / 2 : (W + t) / 2));
  const f = Math.max(...flaps),
    h = H + t,
    gap = t + clearance;
  const edges = [glue];
  widths.forEach((w) => edges.push(edges.at(-1)! + w));
  const points: Point[] = [[glue, f]];
  for (let i = 0; i < 4; i++) {
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < 3 ? gap / 2 : 0);
    points.push([a, f], [a, f - flaps[i]], [b, f - flaps[i]], [b, f]);
  }
  points.push([edges[4], f + h]);
  for (let i = 3; i >= 0; i--) {
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < 3 ? gap / 2 : 0);
    points.push([b, f + h], [b, f + h + flaps[i]], [a, f + h + flaps[i]], [a, f + h]);
  }
  const inset = Math.min(h / 5, glue / 3);
  points.push([0, f + h - inset], [0, f + inset]);
  const builder = new GeometryBuilder();
  builder.part(
    'body',
    'גוף הקופסה',
    points.filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]),
  );
  for (let i = 0; i < 4; i++) {
    builder.line('crease', 'body', [edges[i], f], [edges[i], f + h]);
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < 3 ? gap / 2 : 0);
    builder.line('crease', 'body', [a, f], [b, f]);
    builder.line('crease', 'body', [a, f + h], [b, f + h]);
  }
  return builder.finish();
}
