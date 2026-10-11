import { GeometryBuilder, rectangle } from '../primitives';
import type { Params, Point } from '../types';
export function sleeve(p: Params) {
  const lengths = [p.L + p.t, p.W + p.t, p.L + p.t, p.W + p.t];
  const width = lengths.reduce((a, b) => a + b, 0) + p.glue,
    height = p.H + p.t;
  const b = new GeometryBuilder();
  b.part('body', 'שרוול', rectangle(0, 0, width, height));
  let x = p.glue;
  for (let i = 0; i < 4; i++) {
    b.line('crease', 'body', [x, 0], [x, height]);
    x += lengths[i];
  }
  return b.finish();
}
export function wrap0401(p: Params) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    flap = w / 2,
    side = h + p.glue;
  const x = side,
    y = h + flap;
  const outline: Point[] = [
    [x, 0],
    [x + l, 0],
    [x + l, y],
    [2 * side + l, y],
    [2 * side + l, y + w],
    [x + l, y + w],
    [x + l, 2 * y + w],
    [x, 2 * y + w],
    [x, y + w],
    [0, y + w],
    [0, y],
    [x, y],
  ];
  const b = new GeometryBuilder();
  b.part('body', 'אריזה מתקפלת', outline);
  for (const cy of [flap, y, y + w, y + w + h]) b.line('crease', 'body', [x, cy], [x + l, cy]);
  for (const cx of [p.glue, x, x + l, x + l + h]) b.line('crease', 'body', [cx, y], [cx, y + w]);
  return b.finish();
}
export function horizontalInsert(p: Params) {
  const b = new GeometryBuilder();
  b.part('insert', 'לוח הפרדה', rectangle(0, 0, p.L, p.W));
  return b.finish();
}
export function verticalInsert(p: Params) {
  const b = new GeometryBuilder();
  b.part('insert', 'לוח הפרדה', rectangle(0, 0, p.W, p.H));
  return b.finish();
}
export function wrapInsert(p: Params) {
  const sections = [(p.W + p.t) / 2, p.H + p.t, p.W + p.t, p.H + p.t, (p.W + p.t) / 2];
  const b = new GeometryBuilder();
  b.part(
    'insert',
    'מחיצה עוטפת',
    rectangle(
      0,
      0,
      sections.reduce((a, c) => a + c, 0),
      p.L,
    ),
  );
  let x = 0;
  for (let i = 0; i < 4; i++) {
    x += sections[i];
    b.line('crease', 'insert', [x, 0], [x, p.L]);
  }
  return b.finish();
}
