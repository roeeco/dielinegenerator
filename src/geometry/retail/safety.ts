import type { DielineGeometry, Point } from '../types';
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function inside(point: Point, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j],
      b = polygon[i];
    if (
      Math.abs(cross(a, b, point)) < 1e-6 &&
      point[0] >= Math.min(a[0], b[0]) - 1e-6 &&
      point[0] <= Math.max(a[0], b[0]) + 1e-6 &&
      point[1] >= Math.min(a[1], b[1]) - 1e-6 &&
      point[1] <= Math.max(a[1], b[1]) + 1e-6
    )
      return true;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
const area = (pts: Point[]) =>
  Math.abs(
    pts.reduce((sum, p, i) => {
      const z = pts[(i + 1) % pts.length];
      return sum + p[0] * z[1] - z[0] * p[1];
    }, 0),
  );
/** Reject unsupported proportions before a preview or SVG can contain detached cuts. */
export function assertRetailGeometry(g: DielineGeometry): DielineGeometry {
  for (const part of g.parts) {
    const paths = g.paths.filter((p) => p.partId === part.id),
      closed = paths.filter((p) => p.kind === 'cut' && p.closed);
    const outer = closed.reduce((a, b) => (area(a.points) > area(b.points) ? a : b));
    for (const path of closed)
      for (let i = 0; i < path.points.length; i++) {
        const a = path.points[i],
          b = path.points[(i + 1) % path.points.length];
        for (let j = i + 2; j < path.points.length; j++) {
          if (i === 0 && j === path.points.length - 1) continue;
          const c = path.points[j],
            d = path.points[(j + 1) % path.points.length];
          if (cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8)
            throw new Error('Crossing retail contour');
        }
      }
    for (const path of paths.filter((p) => p.kind === 'cut' && p !== outer)) {
      const pairs = path.closed ? path.points.length : path.points.length - 1;
      for (let i = 0; i < pairs; i++) {
        const a = path.points[i],
          b = path.points[(i + 1) % path.points.length];
        if (
          !inside(a, outer.points) ||
          !inside(b, outer.points) ||
          !inside([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], outer.points)
        )
          throw new Error('Retail cut outside its panel');
      }
    }
  }
  return g;
}
