import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';

/** Crease-to-crease allowances are explicit beta engineering assumptions, not FEFCO manufacturing tolerances. */
export function slotted(params: Params, variant: string) {
  const { L, W, H, t, clearance } = params;
  const glue = params.glue ?? 0;
  const l = L + t,
    w = W + t;
  const widths =
    variant === '0230'
      ? [params.v + params.overlap, w, l, w, l - params.v]
      : variant === '0231'
        ? [params.v + params.overlap, l, w, l, w - params.v]
        : [l, w, l, w];
  const flaps = widths.map((_, i) => {
    if (variant === '0202') return (w + params.overlap) / 2;
    if (variant === '0203') return w;
    if (variant === '0205') return l / 2;
    if (variant === '0206') return i % 2 ? l / 2 : w;
    if (variant === '0208') return w / 2 + params.v;
    return variant === '0204' && i % 2 ? l / 2 : w / 2;
  });
  const top = flaps.map((v) =>
    ['0200', 'bottom-only'].includes(variant)
      ? 0
      : variant === 'top-only'
        ? v
        : ['0209', '0214'].includes(variant)
          ? params.v + (variant === '0214' ? t : 0)
          : v,
  );
  if (variant === 'top-only') flaps.fill(0);
  const f = Math.max(...top),
    h = H + t,
    gap = t + clearance;
  const edges = [glue];
  widths.forEach((w) => edges.push(edges.at(-1)! + w));
  const points: Point[] = [[glue, f]];
  for (let i = 0; i < widths.length; i++) {
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0);
    points.push([a, f], [a, f - top[i]], [b, f - top[i]], [b, f]);
  }
  points.push([edges[widths.length], f + h]);
  for (let i = widths.length - 1; i >= 0; i--) {
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0);
    points.push([b, f + h], [b, f + h + flaps[i]], [a, f + h + flaps[i]], [a, f + h]);
  }
  const inset = Math.min(h / 5, glue / 3);
  if (glue) points.push([0, f + h - inset], [0, f + inset]);
  const builder = new GeometryBuilder();
  builder.part(
    'body',
    'גוף הקופסה',
    points.filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]),
  );
  for (let i = 0; i < widths.length; i++) {
    if (i || glue) builder.line('crease', 'body', [edges[i], f], [edges[i], f + h]);
    const a = edges[i] + (i ? gap / 2 : 0),
      b = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0);
    if (top[i]) builder.line('crease', 'body', [a, f], [b, f]);
    if (variant === '0208') {
      builder.line('crease', 'body', [a, f - w / 2], [b, f - w / 2]);
      builder.line('crease', 'body', [a, f + h + w / 2], [b, f + h + w / 2]);
    }
    if (variant === '0214') builder.line('crease', 'body', [a, f - t], [b, f - t]);
    if (flaps[i]) builder.line('crease', 'body', [a, f + h], [b, f + h]);
  }
  return builder.finish();
}
