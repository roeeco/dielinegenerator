import { expandedGenerators } from './expanded';
import { slotted } from './families/slotted';
import { gluedTray, telescopic } from './families/tray';
import { horizontalInsert, sleeve, verticalInsert, wrap0401, wrapInsert } from './families/wrap';
import { partitions } from './families/partitions';
import type { GeneratorDefinition, ParameterField, Params } from './types';
const field = (
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  group: ParameterField['group'] = 'dimension',
  step = 1,
  help?: string,
): ParameterField => ({
  key,
  label,
  default: value,
  min,
  max,
  group,
  step,
  help,
  unit: ['N', 'rows'].includes(key) ? 'לוחות' : 'מ״מ',
});
const L = field('L', 'אורך', 200, 10, 2000),
  W = field('W', 'רוחב', 120, 10, 2000),
  H = field('H', 'גובה', 80, 5, 1000);
const t = field(
  't',
  'עובי חומר',
  1,
  0.1,
  5,
  'material',
  0.1,
  'קיזוז התחלתי של עובי אחד בין קווי קיפול. יש לאמת לפי החומר.',
);
const clearance = field(
  'clearance',
  'מרווח חריץ',
  0.3,
  0.1,
  2,
  'material',
  0.1,
  'רוחב החריץ הוא עובי החומר ועוד המרווח. לא פיצוי kerf.',
);
const glue = field('glue', 'לשונית חיבור', 18, 4, 100, 'special');
const spacing = field('spacing', 'רווח בין חלקים', 10, 2, 100, 'material');
const beta = 'יש לבצע חיתוך ניסיון ובדיקת הרכבה בחומר שנבחר. הדגם טרם אומת לייצור.';
const material = 'L/W/H הן מידות פנימיות. קיזוזי הקיפול כאן הם הנחת התחלה, לא סבולות ייצור תקניות.';
export const generators: Record<string, GeneratorDefinition> = {
  ...expandedGenerators,
  '0201': {
    id: '0201',
    fields: [L, W, H, glue, t, clearance],
    notes: [beta, material, 'כנפיים בעומק W/2; חיבור בהדבקה או בסרט.'],
    generate: (p) => slotted(p, '0201'),
  },
  '0204': {
    id: '0204',
    fields: [L, W, H, glue, t, clearance],
    notes: [beta, material, 'כנפי לוחות האורך בעומק W/2; כנפי לוחות הרוחב בעומק L/2.'],
    generate: (p) => slotted(p, '0204'),
  },
  '0300': {
    id: '0300',
    fields: [
      L,
      W,
      { ...H, default: 40 },
      field('lidDepth', 'עומק מכסה', 40, 5, 1000, 'special'),
      t,
      clearance,
      field(
        'fit',
        'מרווח קינון כולל',
        1,
        0.1,
        5,
        'material',
        0.1,
        'תוספת כוללת לאורך ולרוחב המכסה, מעבר לשני עוביי הדופן.',
      ),
      spacing,
    ],
    notes: [
      beta,
      material,
      'שני חלקים עם אוזני פינה וחיבור בהדבקה. L+/W+ מותאמות לעובי הדפנות ולמרווח הקינון.',
    ],
    generate: telescopic,
  },
  '0401': {
    id: '0401',
    fields: [L, W, H, glue, t],
    notes: [
      beta,
      material,
      'כנפי סגירה בעומק W/2 ולשוניות לחיבור דפנות הצד. נדרש חיבור בהדבקה או בסרט.',
    ],
    generate: wrap0401,
  },
  '0453': {
    id: '0453',
    fields: [L, W, { ...H, default: 40 }, t, clearance],
    notes: [beta, material, 'מגש עם אוזני פינה מרובעות להדבקה; ללא מנגנון נעילה.'],
    generate: gluedTray,
  },
  '0501': {
    id: '0501',
    fields: [L, W, H, glue, t],
    notes: [beta, material, 'שרוול פתוח למעלה ולמטה. לשונית החיבור דורשת הדבקה.'],
    generate: sleeve,
  },
  '0901': {
    id: '0901',
    fields: [L, W],
    notes: [beta, 'לוח שטוח במידות L × W, ללא קווי קיפול.'],
    generate: horizontalInsert,
  },
  '0902': {
    id: '0902',
    fields: [W, H],
    notes: [beta, 'לוח שטוח במידות W × H, ללא קווי קיפול.'],
    generate: verticalInsert,
  },
  '0910': {
    id: '0910',
    fields: [L, W, H, t],
    notes: [beta, material, 'מחיצה עוטפת: W/2 – H – W – H – W/2. ללא לשונית דבק.'],
    generate: wrapInsert,
  },
  '0982': {
    id: '0982',
    fields: [
      L,
      W,
      H,
      field('N', 'מספר לוחות כולל', 2, 2, 19, 'special', 1),
      field('rows', 'לוחות לאורך', 1, 1, 18, 'special', 1),
      t,
      clearance,
      spacing,
    ],
    notes: [
      beta,
      'הקודים 0982–0999 מציינים מספר לוחות בלבד, ולא צורה ייחודית. זהו וריאנט רשת מחיצות מצטלבת עם חריצי חצי גובה.',
      'מידות L/W/H הן מידות המחיצה המורכבת. יש להתאים לחלל הקופסה בפועל.',
    ],
    generate: partitions,
  },
};
export const defaultParams = (definition: GeneratorDefinition): Params =>
  Object.fromEntries(definition.fields.map((f) => [f.key, f.default]));
export const effectiveCode = (id: string, p: Params) =>
  id === '0982' ? String(980 + p.N).padStart(4, '0') : id;
