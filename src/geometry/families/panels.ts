import { GeometryBuilder, mergeGeometries, rectangle, transformGeometry } from '../primitives';
import type { DielineGeometry, PathKind, Point } from '../types';

/** A developed strip: section values are physical crease-to-crease distances. */
export function strip(
  sections: number[],
  length: number,
  id = 'body',
  joint = 0,
  kind: PathKind = 'crease',
) {
  if (sections.some((v) => v <= 0) || length <= 0) throw new Error('Nonpositive panel');
  const b = new GeometryBuilder();
  b.part(id, 'לוח מקופל', rectangle(0, 0, joint + sections.reduce((a, c) => a + c, 0), length));
  let x = joint;
  if (joint) b.line(kind, id, [x, 0], [x, length]);
  for (const width of sections.slice(0, -1)) {
    x += width;
    b.line(kind, id, [x, 0], [x, length]);
  }
  return b.finish();
}
export function pack(parts: DielineGeometry[], spacing: number) {
  let x = 0;
  return mergeGeometries(
    ...parts.map((part) => {
      const placed = transformGeometry(part, ([px, py]) => [
        px - part.boundsMm.x + x,
        py - part.boundsMm.y,
      ]);
      x += part.boundsMm.width + spacing;
      return placed;
    }),
  );
}
export function crossBlank(
  l: number,
  w: number,
  horizontal: number[],
  vertical: number[],
  id = 'body',
) {
  const sx = horizontal.reduce((a, c) => a + c, 0),
    sy = vertical.reduce((a, c) => a + c, 0);
  const b = new GeometryBuilder();
  b.part(id, 'פריסה צולבת', [
    [sx, 0],
    [sx + l, 0],
    [sx + l, sy],
    [2 * sx + l, sy],
    [2 * sx + l, sy + w],
    [sx + l, sy + w],
    [sx + l, 2 * sy + w],
    [sx, 2 * sy + w],
    [sx, sy + w],
    [0, sy + w],
    [0, sy],
    [sx, sy],
  ]);
  let distance = 0;
  for (const width of horizontal) {
    b.line('crease', id, [sx - distance, sy], [sx - distance, sy + w]);
    b.line('crease', id, [sx + l + distance, sy], [sx + l + distance, sy + w]);
    distance += width;
  }
  distance = 0;
  for (const width of vertical) {
    b.line('crease', id, [sx, sy - distance], [sx + l, sy - distance]);
    b.line('crease', id, [sx, sy + w + distance], [sx + l, sy + w + distance]);
    distance += width;
  }
  return b.finish();
}
export function gussetTray(l: number, w: number, h: number, id = 'body', clipped = false) {
  const b = new GeometryBuilder(),
    right = h + l,
    bottom = h + w;
  const c = clipped ? Math.min(h / 3, 12) : 0;
  const outline: Point[] = c
    ? [
        [c, 0],
        [right + h - c, 0],
        [right + h, c],
        [right + h, bottom + h - c],
        [right + h - c, bottom + h],
        [c, bottom + h],
        [0, bottom + h - c],
        [0, c],
      ]
    : rectangle(0, 0, l + 2 * h, w + 2 * h);
  b.part(id, 'מגש עם קיפולי פינה', outline);
  for (const x of [h, right]) b.line('crease', id, [x, 0], [x, bottom + h]);
  for (const y of [h, bottom]) b.line('crease', id, [0, y], [right + h, y]);
  for (const [cx, cy, ox, oy] of [
    [h, h, 0, 0],
    [right, h, right + h, 0],
    [right, bottom, right + h, bottom + h],
    [h, bottom, 0, bottom + h],
  ])
    b.line('crease', id, [cx, cy], [ox, oy]);
  return b.finish();
}
