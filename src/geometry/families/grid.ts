import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';
export function variableGrid(p: Params, edgeSlots: boolean, mixedHeight = false) {
  const b = new GeometryBuilder(),
    slot = p.t + p.clearance;
  let offset = 0;
  for (const down of [true, false]) {
    const count = down ? p.rows : p.columns,
      other = down ? p.columns : p.rows,
      length = down ? p.L : p.W;
    const centers = Array.from({ length: other }, (_, i) =>
      edgeSlots ? p.v + ((length - 2 * p.v) * i) / (other - 1) : (length * (i + 1)) / (other + 1),
    );
    for (let i = 0; i < count; i++) {
      const height = mixedHeight ? (down || i >= p.fullHeightColumns ? p.v : p.H) : p.H;
      const slotBottom = mixedHeight ? p.v / 2 : p.H / 2,
        id = `${down ? 'row' : 'column'}-${i + 1}`;
      const points: Point[] = [[offset, 0]];
      if (down)
        for (const x of centers)
          points.push(
            [offset + x - slot / 2, 0],
            [offset + x - slot / 2, height - slotBottom],
            [offset + x + slot / 2, height - slotBottom],
            [offset + x + slot / 2, 0],
          );
      points.push([offset + length, 0], [offset + length, height]);
      if (!down)
        for (const x of [...centers].reverse())
          points.push(
            [offset + x + slot / 2, height],
            [offset + x + slot / 2, height - slotBottom],
            [offset + x - slot / 2, height - slotBottom],
            [offset + x - slot / 2, height],
          );
      points.push([offset, height]);
      b.part(id, 'לוח מחיצה', points);
      offset += length + p.spacing;
    }
  }
  return b.finish();
}
