import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';
/** FEFCO 0982–0999 defines panel count, not a unique shape. This is an explicitly described interlocking grid variant. */
export function partitions(p: Params) {
  const { L, W, H, t, clearance, spacing, N, rows } = p;
  const columns = N - rows,
    slot = t + clearance;
  const b = new GeometryBuilder();
  let offset = 0;
  function panel(length: number, count: number, down: boolean, id: string, name: string) {
    const top: Point[] = [[offset, 0]];
    if (down)
      for (let j = 1; j <= count; j++) {
        const x = offset + (length * j) / (count + 1);
        top.push(
          [x - slot / 2, 0],
          [x - slot / 2, H / 2],
          [x + slot / 2, H / 2],
          [x + slot / 2, 0],
        );
      }
    top.push([offset + length, 0], [offset + length, H]);
    if (!down)
      for (let j = count; j >= 1; j--) {
        const x = offset + (length * j) / (count + 1);
        top.push(
          [x + slot / 2, H],
          [x + slot / 2, H / 2],
          [x - slot / 2, H / 2],
          [x - slot / 2, H],
        );
      }
    top.push([offset, H]);
    b.part(id, name, top);
    offset += length + spacing;
  }
  for (let i = 0; i < rows; i++) panel(L, columns, true, `row-${i + 1}`, `לוח אורך ${i + 1}`);
  for (let i = 0; i < columns; i++) panel(W, rows, false, `column-${i + 1}`, `לוח רוחב ${i + 1}`);
  return b.finish();
}
