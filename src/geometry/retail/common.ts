import { assertRetailGeometry } from './safety';
import { GeometryBuilder, rectangle } from '../primitives';
import { pack } from '../families/panels';
import type {
  DielineGeometry,
  GeneratorDefinition,
  ParameterField,
  Params,
  Point,
  ValidationIssue,
} from '../types';
export const f = (
  key: string,
  label: string,
  value: number,
  group: ParameterField['group'] = 'dimension',
  min = 5,
  max = 2000,
  step = 1,
): ParameterField => ({
  key,
  label,
  default: value,
  group,
  min,
  max,
  step,
  unit: ['shelfCount', 'columns', 'rows', 'steps'].includes(key) ? 'יחידות' : 'מ״מ',
});
export const L = f('L', 'אורך', 200),
  W = f('W', 'רוחב', 120),
  H = f('H', 'גובה', 240, 'dimension', 5, 5000),
  v = f('v', 'גובה חזית / שפה', 35, 'special');
export const t = f('t', 'עובי חומר', 1, 'material', 0.1, 5, 0.1),
  clearance = f('clearance', 'מרווח חיבור', 0.3, 'material', 0.1, 2, 0.1),
  glue = f('glue', 'לשונית הדבקה', 12, 'special', 2, 100),
  spacing = f('spacing', 'רווח חלקים', 10, 'material', 2, 100),
  lip = f('lip', 'שפת נעילה', 12, 'special', 2, 100),
  tab = f('tabWidth', 'רוחב לשונית', 20, 'special', 4, 100);
export const shelfCount = f('shelfCount', 'מספר מדפים', 3, 'special', 1, 6),
  columns = f('columns', 'מספר עמודות', 3, 'special', 1, 8),
  rows = f('rows', 'מספר שורות', 2, 'special', 1, 8);
export const error = (field: string, message: string): ValidationIssue => ({
  field,
  message,
  severity: 'error',
});
export const beta =
  'בטא: גאומטריה לפי שרטוט מקור. יש לבצע חיתוך ניסיון, בדיקת התאמה והרכבה בחומר; אין דירוג עומס.';
export const definitions: Record<string, GeneratorDefinition> = {};
export const sources: Record<string, number> = {};
export function add(
  id: string,
  page: number,
  fields: ParameterField[],
  generate: GeneratorDefinition['generate'],
  notes: string[],
  validate?: GeneratorDefinition['validate'],
) {
  definitions[id] = {
    id,
    fields,
    generate: (p) => assertRetailGeometry(generate(p)),
    notes: [beta, ...notes],
    validate,
  };
  sources[id] = page;
}
export function clean(points: Point[]): Point[] {
  const equal = (a: Point, b: Point) => a.every((n, i) => Math.abs(n - b[i]) < 0.0000005);
  const result = points.filter((p, i, a) => !i || !equal(p, a[i - 1]));
  if (result.length > 1 && equal(result[0], result.at(-1)!)) result.pop();
  return result;
}
export function finish(b: GeometryBuilder) {
  return pack([b.finish()], 0);
}
export function amend(g: DielineGeometry, edit: (b: GeometryBuilder) => void) {
  const b = new GeometryBuilder();
  b.parts = g.parts;
  b.paths = g.paths;
  edit(b);
  return b.finish();
}
export function slot(
  b: GeometryBuilder,
  id: string,
  x: number,
  y: number,
  width: number,
  depth: number,
) {
  b.path('cut', id, rectangle(x - width / 2, y - depth / 2, width, depth), true);
}
export function receiver(
  b: GeometryBuilder,
  id: string,
  x: number,
  y: number,
  width: number,
  depth: number,
) {
  b.path('cut', id, [
    [x - width / 2, y + depth],
    [x - width / 2, y],
    [x + width / 2, y],
    [x + width / 2, y + depth],
  ]);
}
export function countIssues(p: Params, keys: string[]) {
  return keys.flatMap((key) => (!Number.isInteger(p[key]) ? [error(key, 'נדרש מספר שלם.')] : []));
}
export function shelfIssues(p: Params) {
  return [
    ...countIssues(p, ['shelfCount']),
    ...(p.H / (p.shelfCount + 1) <= 2 * (p.v + p.t)
      ? [error('shelfCount', 'המדפים צפופים מדי ביחס לשפות.')]
      : []),
    ...(p.v >= Math.min(p.L, p.W) / 3
      ? [error('v', 'שפת המדף חייבת להיות קטנה משליש מידות המדף.')]
      : []),
    ...(p.tabWidth && p.tabWidth >= Math.min(p.v, p.L / 4)
      ? [error('tabWidth', 'הלשונית רחבה מדי לשפת החיבור.')]
      : []),
  ];
}
/** Outline of separate top/bottom flaps sharing a four-panel wall strip. */
export function panelShell(
  widths: number[],
  h: number,
  joint: number,
  top: (i: number, width: number) => Point[],
  bottom: (i: number, width: number) => Point[],
  gap: number,
  edit?: (b: GeometryBuilder, edges: number[]) => void,
) {
  const b = new GeometryBuilder(),
    edges = [joint];
  widths.forEach((w) => edges.push(edges.at(-1)! + w));
  const points: Point[] = [
    [0, Math.min(joint, h / 5)],
    [joint, 0],
  ];
  for (let i = 0; i < widths.length; i++) {
    const a = edges[i] + (i ? gap / 2 : 0),
      z = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0),
      w = z - a;
    points.push(...top(i, w).map(([x, y]) => [a + x, -y] as Point));
  }
  points.push([edges.at(-1)!, h]);
  for (let i = widths.length - 1; i >= 0; i--) {
    const a = edges[i] + (i ? gap / 2 : 0),
      z = edges[i + 1] - (i < widths.length - 1 ? gap / 2 : 0),
      w = z - a;
    points.push(
      ...bottom(i, w)
        .map(([x, y]) => [a + x, h + y] as Point)
        .reverse(),
    );
  }
  points.push([joint, h], [0, h - Math.min(joint, h / 5)]);
  b.part('body', 'גוף מפותח', clean(points));
  for (const x of edges.slice(0, -1)) b.line('crease', 'body', [x, 0], [x, h]);
  edit?.(b, edges);
  return finish(b);
}
export const plain = (w: number, d: number): Point[] =>
  d
    ? [
        [0, 0],
        [0, d],
        [w, d],
        [w, 0],
      ]
    : [
        [0, 0],
        [w, 0],
      ];
export const clipped = (w: number, d: number, clip: number): Point[] => [
  [0, 0],
  [clip, d],
  [w - clip, d],
  [w, 0],
];
