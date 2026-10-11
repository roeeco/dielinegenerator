import { GeometryBuilder, rectangle } from '../primitives';
import type { Point } from '../types';

/** Strip panels with independent end flanges. All dimensions are developed crease pitches. */
export function flangedStrip(
  widths: number[],
  length: number,
  flaps: number[],
  gap: number,
  id = 'body',
  joint = 0,
  bevel = 0,
) {
  if (
    widths.length !== flaps.length ||
    widths.some((width) => width <= gap) ||
    flaps.some((depth) => depth < 0)
  )
    throw new Error('Invalid developed strip');
  const top = Math.max(...flaps),
    edges = [joint],
    b = new GeometryBuilder(),
    outline: Point[] = [];
  for (const width of widths) edges.push(edges[edges.length - 1] + width);
  function flap(i: number, y: number, sign: number) {
    const a = edges[i] + (i ? gap / 2 : 0),
      c = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0),
      d = flaps[i];
    if (!d)
      return [
        [a, y],
        [c, y],
      ] as Point[];
    const clip = Math.min(bevel, d / 2, (c - a) / 4);
    b.line('crease', id, [a, y], [c, y]);
    return (
      clip
        ? [
            [a, y],
            [a, y + sign * (d - clip)],
            [a + clip, y + sign * d],
            [c - clip, y + sign * d],
            [c, y + sign * (d - clip)],
            [c, y],
          ]
        : [
            [a, y],
            [a, y + sign * d],
            [c, y + sign * d],
            [c, y],
          ]
    ) as Point[];
  }
  for (let i = 0; i < widths.length; i++) outline.push(...flap(i, top, -1));
  outline.push([edges[widths.length], top + length]);
  for (let i = widths.length - 1; i >= 0; i--) outline.push(...flap(i, top + length, 1).reverse());
  if (joint) {
    const inset = Math.min(joint / 3, length / 5);
    outline.push([0, top + length - inset], [0, top + inset]);
  }
  b.part(
    id,
    'רצועה עם כנפי קצה',
    outline.filter(
      (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
    ),
  );
  for (let i = 0; i < widths.length; i++)
    if (i || joint) b.line('crease', id, [edges[i], top], [edges[i], top + length]);
  return b.finish();
}
export function endPanel(width: number, height: number, lip: number, id: string, allSides = false) {
  const b = new GeometryBuilder();
  if (!lip) {
    b.part(id, 'לוח קצה', rectangle(0, 0, width, height));
    return b.finish();
  }
  if (!allSides) {
    const clip = Math.min(lip / 2, width / 8);
    b.part(id, 'לוח קצה עם שפה', [
      [clip, 0],
      [width - clip, 0],
      [width, clip],
      [width, lip + height],
      [0, lip + height],
      [0, clip],
    ]);
    b.line('crease', id, [0, lip], [width, lip]);
  } else {
    b.part(id, 'לוח קצה עם שפות היקפיות', [
      [lip, 0],
      [lip + width, 0],
      [width + 2 * lip, lip],
      [width + 2 * lip, height + lip],
      [width + lip, height + 2 * lip],
      [lip, height + 2 * lip],
      [0, height + lip],
      [0, lip],
    ]);
    for (const x of [lip, lip + width]) b.line('crease', id, [x, 0], [x, height + 2 * lip]);
    for (const y of [lip, lip + height]) b.line('crease', id, [0, y], [width + 2 * lip, y]);
    for (const [a, c] of [
      [
        [lip, lip],
        [lip / 2, lip / 2],
      ],
      [
        [lip + width, lip],
        [width + (3 * lip) / 2, lip / 2],
      ],
      [
        [lip + width, lip + height],
        [width + (3 * lip) / 2, height + (3 * lip) / 2],
      ],
      [
        [lip, lip + height],
        [lip / 2, height + (3 * lip) / 2],
      ],
    ] as const)
      b.line('crease', id, a, c);
  }
  return b.finish();
}
