import { generators } from './registry';
import type { DielineGeometry, Params, Point, ValidationIssue } from './types';
import { precision } from './primitives';
export function validateParams(id: string, p: Params): ValidationIssue[] {
  const def = generators[id];
  if (!def) return [{ severity: 'error', message: 'לדגם זה אין עדיין מחולל פרמטרי.' }];
  const errors: ValidationIssue[] = [];
  for (const f of def.fields) {
    if (!Number.isFinite(p[f.key]) || p[f.key] < f.min || p[f.key] > f.max)
      errors.push({
        severity: 'error',
        field: f.key,
        message: `יש להזין ערך בין ${f.min} ל־${f.max}.`,
      });
    else if (['N', 'rows'].includes(f.key) && !Number.isInteger(p[f.key]))
      errors.push({ severity: 'error', field: f.key, message: 'יש להזין מספר שלם.' });
  }
  if (errors.length) return errors;
  const issue = (field: string, message: string) =>
    errors.push({ severity: 'error', field, message });
  if (
    p.t &&
    Math.min(...['L', 'W', 'H'].filter((k) => Number.isFinite(p[k])).map((k) => p[k])) < p.t * 4
  )
    issue('t', 'עובי החומר גדול מדי ביחס למידות. נדרשים לפחות ארבעה עוביים לכל מידה.');
  if (p.glue && p.glue >= Math.min(p.L, p.W, p.H ?? Infinity) / 2)
    issue('glue', 'לשונית החיבור צריכה להיות קטנה מחצי המידה הקטנה ביותר.');
  if (['0300', '0453'].includes(id) && p.H > Math.min(p.L, p.W) / 2)
    issue('H', 'בדגם זה אוזני הפינה יתחפפו. הגובה לא יכול לעלות על חצי המידה הקטנה.');
  if (id === '0300' && p.lidDepth > p.H)
    issue('lidDepth', 'עומק המכסה לא יכול לעלות על גובה הגוף.');
  if (id === '0982') {
    if (p.rows >= p.N)
      issue('rows', 'נדרש לפחות לוח אחד בכל כיוון. מספר לוחות האורך צריך להיות קטן מהסך הכולל.');
    else if (Math.min(p.L / (p.N - p.rows + 1), p.W / (p.rows + 1)) <= 2 * (p.t + p.clearance))
      issue('N', 'התאים קטנים מדי לרוחב החריצים. הקטינו את מספר הלוחות או הגדילו את המידות.');
  }
  return errors;
}
export const segmentKey = (a: Point, b: Point) =>
  [a.map(precision).join(','), b.map(precision).join(',')].sort().join('|');
export function validateGeometry(g: DielineGeometry): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  if (
    !g.parts.length ||
    !g.paths.length ||
    !Number.isFinite(g.boundsMm.width) ||
    !Number.isFinite(g.boundsMm.height) ||
    g.boundsMm.width <= 0 ||
    g.boundsMm.height <= 0
  )
    errors.push({ severity: 'error', message: 'מידות הפריסה אינן תקינות.' });
  const segments = new Set<string>();
  for (const path of g.paths) {
    if (
      !g.parts.some((p) => p.id === path.partId) ||
      path.points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))
    )
      errors.push({ severity: 'error', message: 'נמצאה גאומטריה לא תקינה.' });
    if (path.kind === 'cut')
      for (let i = 0; i < path.points.length - (path.closed ? 0 : 1); i++) {
        const a = path.points[i],
          b = path.points[(i + 1) % path.points.length];
        const key = segmentKey(a, b);
        if (key.split('|')[0] === key.split('|')[1] || segments.has(key))
          errors.push({ severity: 'error', message: 'נמצא קטע חיתוך כפול או באורך אפס.' });
        segments.add(key);
      }
  }
  for (let i = 0; i < g.parts.length; i++)
    for (let j = i + 1; j < g.parts.length; j++) {
      const a = g.parts[i].boundsMm,
        b = g.parts[j].boundsMm;
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      )
        errors.push({ severity: 'error', message: 'חלקי הפריסה חופפים.' });
    }
  return errors;
}
export function generateValidated(
  id: string,
  p: Params,
): { geometry: DielineGeometry | null; issues: ValidationIssue[] } {
  const issues = validateParams(id, p);
  if (issues.length) return { geometry: null, issues };
  try {
    const geometry = generators[id].generate(p),
      checks = validateGeometry(geometry);
    if (checks.length) return { geometry: null, issues: checks };
    return { geometry, issues: geometry.warnings };
  } catch {
    return {
      geometry: null,
      issues: [{ severity: 'error', message: 'לא ניתן ליצור פריסה במידות האלה.' }],
    };
  }
}
