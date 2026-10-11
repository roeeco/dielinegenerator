import type { Bounds, DielineGeometry, GeometryPath, Part, PathKind, Point } from './types';
export const precision = (n: number) => Number(n.toFixed(6));
export const pathData = (points: Point[], closed = false): string =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${precision(x)} ${precision(y)}`).join(' ') +
  (closed ? ' Z' : '');
export function boundsOf(points: Point[]): Bounds {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function rectangle(x: number, y: number, width: number, height: number): Point[] {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}
export class GeometryBuilder {
  paths: GeometryPath[] = [];
  parts: Part[] = [];
  path(kind: PathKind, partId: string, points: Point[], closed = false) {
    this.paths.push({ kind, partId, points, closed, d: pathData(points, closed) });
  }
  line(kind: PathKind, partId: string, a: Point, b: Point) {
    this.path(kind, partId, [a, b]);
  }
  part(id: string, nameHe: string, outline: Point[]) {
    this.parts.push({ id, nameHe, boundsMm: boundsOf(outline) });
    this.path('cut', id, outline, true);
  }
  finish(): DielineGeometry {
    return {
      parts: this.parts,
      paths: this.paths,
      boundsMm: boundsOf(this.paths.flatMap((p) => p.points)),
      warnings: [],
    };
  }
}
export function transformGeometry(
  geometry: DielineGeometry,
  map: (point: Point) => Point,
): DielineGeometry {
  const paths = geometry.paths.map((p) => {
    const points = p.points.map(map);
    return { ...p, points, d: pathData(points, p.closed) };
  });
  const parts = geometry.parts.map((p) => ({
    ...p,
    boundsMm: boundsOf(paths.filter((path) => path.partId === p.id).flatMap((path) => path.points)),
  }));
  return { ...geometry, paths, parts, boundsMm: boundsOf(paths.flatMap((p) => p.points)) };
}
export function mergeGeometries(...geometries: DielineGeometry[]): DielineGeometry {
  const paths = geometries.flatMap((g) => g.paths);
  return {
    paths,
    parts: geometries.flatMap((g) => g.parts),
    boundsMm: boundsOf(paths.flatMap((p) => p.points)),
    warnings: geometries.flatMap((g) => g.warnings),
  };
}
