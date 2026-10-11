import { GeometryBuilder, mergeGeometries, transformGeometry } from '../primitives';
import type { Params, Point } from '../types';

/** 0453: horizontal corner slits; 0300: vertical corner slits. They are distinct source constructions. */
export function tray(L: number, W: number, H: number, gap: number, id = 'body', name = 'מגש') {
  const x = H + L,
    y = H + W,
    width = L + 2 * H,
    height = W + 2 * H,
    half = gap / 2;
  const points: Point[] = [
    [0, 0],
    [width, 0],
    [width, H - half],
    [x, H - half],
    [x, H + half],
    [width, H + half],
    [width, y - half],
    [x, y - half],
    [x, y + half],
    [width, y + half],
    [width, height],
    [0, height],
    [0, y + half],
    [H, y + half],
    [H, y - half],
    [0, y - half],
    [0, H + half],
    [H, H + half],
    [H, H - half],
    [0, H - half],
  ];
  const b = new GeometryBuilder();
  b.part(id, name, points);
  for (const cx of [H, x]) {
    b.line('crease', id, [cx, H + half], [cx, y - half]);
    b.line('crease', id, [cx, 0], [cx, H - half]);
    b.line('crease', id, [cx, y + half], [cx, height]);
  }
  for (const cy of [H, y]) b.line('crease', id, [H, cy], [x, cy]);
  return b.finish();
}
export function gluedTray(p: Params) {
  return tray(p.L + p.t, p.W + p.t, p.H + p.t, p.t + p.clearance);
}
export function telescopic(p: Params) {
  const gap = p.t + p.clearance;
  const body = transformGeometry(
    tray(p.W + p.t, p.L + p.t, p.H + p.t, gap, 'body', 'גוף'),
    ([x, y]) => [y, x],
  );
  // Lid internal dimensions clear the body's two outside walls + user nesting allowance.
  const lid = transformGeometry(
    tray(p.W + 3 * p.t + p.fit, p.L + 3 * p.t + p.fit, p.lidDepth + p.t, gap, 'lid', 'מכסה'),
    ([x, y]) => [y, x],
  );
  const packed = transformGeometry(lid, ([x, y]) => [x + body.boundsMm.width + p.spacing, y]);
  return mergeGeometries(body, packed);
}
