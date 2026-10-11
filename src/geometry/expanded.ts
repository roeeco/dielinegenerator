import { nextGenerators, nextSources } from './next';
import type { GeneratorDefinition, ParameterField, Params, ValidationIssue } from './types';
import { variableGrid } from './families/grid';
import { carton } from './families/carton';
import { slotted } from './families/slotted';
import { pack, strip, crossBlank, gussetTray } from './families/panels';
import { tray } from './families/tray';
import { GeometryBuilder, transformGeometry } from './primitives';
import { partitions } from './families/partitions';

const f = (
  key: string,
  label: string,
  value: number,
  group: ParameterField['group'] = 'dimension',
  min = 1,
  max = 2000,
  step = 1,
  unit = 'מ״מ',
): ParameterField => ({ key, label, default: value, group, min, max, step, unit });
const L = f('L', 'אורך', 200),
  W = f('W', 'רוחב', 120),
  H = f('H', 'גובה', 40);
const t = f('t', 'עובי חומר', 1, 'material', 0.1, 5, 0.1),
  clearance = f('clearance', 'מרווח חריץ', 0.3, 'material', 0.1, 2, 0.1);
const glue = f('glue', 'לשונית חיבור', 12, 'special', 4, 100),
  spacing = f('spacing', 'רווח בין חלקים', 10, 'material', 2, 100);
const fit = f('fit', 'מרווח קינון כולל', 1, 'material', 0.1, 5, 0.1);
const v = f('v', 'הארכה / שפה', 15, 'special', 1, 500),
  overlap = f('overlap', 'חפיפה', 20, 'special', 1, 500);
const lid = f('lidDepth', 'עומק מכסה', 30, 'special', 1, 1000);
const beta = 'יש לבצע חיתוך ניסיון ובדיקת הרכבה. הדגם טרם אומת לייצור.';
const material =
  'קיזוזי עובי הם הנחות התחלה; המידות בין קווי קיפול והסבולות טעונות אימות בחומר שנבחר.';
export const expandedGenerators: Record<string, GeneratorDefinition> = {};
export const expandedSources: Record<string, number> = {};
function add(
  id: string,
  page: number,
  fields: ParameterField[],
  generate: GeneratorDefinition['generate'],
  notes: string[],
  validate?: GeneratorDefinition['validate'],
) {
  expandedGenerators[id] = {
    id,
    fields,
    generate,
    notes: [beta, ...(fields.some((f) => f.key === 't') ? [material] : []), ...notes],
    validate,
  };
  expandedSources[id] = page;
}
const error = (field: string, message: string): ValidationIssue => ({
  severity: 'error',
  field,
  message,
});
const shallow = (p: Params) =>
  p.H > Math.min(p.L, p.W) / 2 ? [error('H', 'אוזני הפינה דורשות גובה עד חצי המידה הקטנה.')] : [];

// The PDF's sheet sizes are total developed sizes; v1... are fold locations, not box heights.
for (const [id, page, count, axis] of [
  ['0110', 11, 1, 'W'],
  ['0111', 11, 2, 'W'],
  ['0112', 12, 3, 'W'],
  ['0113', 12, 4, 'W'],
  ['0121', 13, 2, 'L'],
  ['0122', 13, 3, 'L'],
  ['0123', 13, 4, 'L'],
] as const) {
  const total = axis === 'W' ? 120 : 200;
  const variables = Array.from({ length: count - 1 }, (_, i) =>
    f(`v${i + 1}`, `רוחב לוח ${i + 1}`, total / count, 'special'),
  );
  add(
    id,
    page,
    [L, W, ...variables],
    (p) => {
      const sections = variables.map((v) => p[v.key]);
      sections.push(p[axis] - sections.reduce((a, c) => a + c, 0));
      const g = strip(sections, p[axis === 'W' ? 'L' : 'W']);
      return axis === 'W' ? transformGeometry(g, ([x, y]) => [y, x]) : g;
    },
    ['L/W הן מידות היריעה הכוללות; הלוח האחרון הוא היתרה לאחר הלוחות המוגדרים.'],
    (p) =>
      variables.reduce((a, v) => a + p[v.key], 0) >= p[axis]
        ? [error(axis, 'סכום רוחבי הלוחות חייב להיות קטן ממידת היריעה.')]
        : [],
  );
}
for (const [id, page, axis] of [
  ['0119', 12, 'W'],
  ['0129', 14, 'L'],
] as const) {
  const fields = Array.from({ length: 4 }, (_, i) =>
    f(`v${i + 1}`, `רוחב לוח ${i + 1}`, axis === 'W' ? 20 : 35, 'special'),
  );
  const N = f('panels', 'מספר לוחות', 5, 'special', 5, 20, 1, 'לוחות');
  add(
    id,
    page,
    [L, W, N, ...fields],
    (p) => {
      const values = fields.map((f) => p[f.key]);
      const rest = (p[axis] - values.reduce((a, c) => a + c, 0)) / (p.panels - 4);
      const g = strip(
        [...values, ...Array.from({ length: p.panels - 4 }, () => rest)],
        p[axis === 'W' ? 'L' : 'W'],
      );
      return axis === 'W' ? transformGeometry(g, ([x, y]) => [y, x]) : g;
    },
    ['ארבעת הלוחות הראשונים מוגדרים בנפרד; יתרת היריעה מחולקת בין הלוחות הנוספים.'],
    (p) =>
      !Number.isInteger(p.panels)
        ? [error('panels', 'מספר הלוחות חייב להיות שלם.')]
        : fields.reduce((a, f) => a + p[f.key], 0) >= p[axis]
          ? [error(axis, 'מידת היריעה חייבת להיות גדולה מסכום ארבעת הלוחות.')]
          : [],
  );
}
add('0100', 11, [L, W], (p) => strip([p.L], p.W), [
  'פריסה שטוחה של יריעה מהגליל: L הוא אורך החיתוך ו־W רוחב הגליל. ללא תיאור תלת־ממדי של הגליל.',
]);
add(
  '0130',
  14,
  [L, W, f('panels', 'מספר לוחות רציפים', 5, 'special', 2, 50, 1, 'לוחות')],
  (p) =>
    strip(
      Array.from({ length: p.panels }, () => p.L),
      p.W,
    ),
  ['יריעה רציפה לקיפול אקורדיון. L הוא אורך כל לוח; האורך הכולל הוא מספר הלוחות כפול L.'],
  (p) => (!Number.isInteger(p.panels) ? [error('panels', 'מספר הלוחות חייב להיות שלם.')] : []),
);

for (const [id, page, note] of [
  ['0200', 18, 'כנפי תחתית בלבד בעומק W/2; החלק העליון פתוח.'],
  ['0202', 18, 'כל הכנפיים בעומק (W + חפיפה)/2.'],
  ['0203', 19, 'כל הכנפיים בעומק W.'],
  ['0205', 19, 'כל הכנפיים בעומק L/2.'],
  ['0206', 20, 'כנפי לוחות האורך בעומק W; כנפי לוחות הרוחב בעומק L/2.'],
  ['0209', 21, 'כנפי תחתית בעומק W/2 ושפה עליונה בעומק v.'],
  ['0214', 22, 'כנפי תחתית בעומק W/2; שפה עליונה עם שני קווי קיפול במרחק עובי חומר.'],
] as const)
  add(
    id,
    page,
    [
      L,
      W,
      H,
      glue,
      t,
      clearance,
      ...(id === '0202' ? [overlap] : ['0209', '0214'].includes(id) ? [v] : []),
    ],
    (p) => slotted(p, id),
    [note],
  );
for (const [id, page] of [
  ['0230', 27],
  ['0231', 27],
] as const)
  add(
    id,
    page,
    [L, W, H, v, overlap, t, clearance],
    (p) => slotted(p, id),
    ['חיבור חופף על פני לוח במקום לשונית צד נפרדת; v הוא מיקום החיבור ו־overlap תוספת החפיפה.'],
    (p) =>
      p.v >= (id === '0230' ? p.L : p.W) ? [error('v', 'מיקום החיבור חייב להיות בתוך הלוח.')] : [],
  );

// Corner constructions remain separate: cut orientation, diagonal gussets and unjoined crosses.
function corner(l: number, w: number, h: number, p: Params, id: string, kind: string) {
  if (kind === 'cross') return crossBlank(l, w, [h], [h], id);
  if (kind === 'gusset') return gussetTray(l, w, h, id);
  const g = kind.startsWith('vertical')
    ? transformGeometry(tray(w, l, h, p.t + p.clearance, id), ([x, y]) => [y, x])
    : tray(l, w, h, p.t + p.clearance, id);
  if (kind.endsWith('diagonal') || kind.endsWith('inward')) {
    const b = g.boundsMm;
    for (const [a, c] of [
      [
        [kind.endsWith('inward') ? 2 * h : 0, 0],
        [h, h],
      ],
      [
        [kind.endsWith('inward') ? b.width - 2 * h : b.width, 0],
        [b.width - h, h],
      ],
      [
        [kind.endsWith('inward') ? 2 * h : 0, b.height],
        [h, b.height - h],
      ],
      [
        [kind.endsWith('inward') ? b.width - 2 * h : b.width, b.height],
        [b.width - h, b.height - h],
      ],
    ] as const) {
      g.paths.push({
        kind: 'crease',
        partId: id,
        points: [a, c],
        closed: false,
        d: `M${a[0]} ${a[1]} L${c[0]} ${c[1]}`,
      });
    }
  }
  return g;
}
for (const [id, page, body, lidKind] of [
  ['0301', 32, 'vertical', 'horizontal'],
  ['0302', 32, 'cross', 'cross'],
  ['0303', 33, 'horizontal-inward', 'horizontal-inward'],
  ['0304', 33, 'vertical-inward', 'vertical-inward'],
  ['0306', 33, 'vertical', 'horizontal'],
  ['0308', 34, 'vertical-diagonal', 'vertical-diagonal'],
  ['0309', 34, 'gusset', 'gusset'],
] as const)
  add(
    id,
    page,
    [L, W, H, lid, t, clearance, fit, spacing],
    (p) =>
      pack(
        [
          corner(p.L + p.t, p.W + p.t, p.H + p.t, p, 'body', body),
          corner(p.L + 3 * p.t + p.fit, p.W + 3 * p.t + p.fit, p.lidDepth + p.t, p, 'lid', lidKind),
        ],
        p.spacing,
      ),
    ['גוף ומכסה נפרדים; מידות המכסה כוללות שני עוביי דופן ומרווח קינון.'],
    (p) => [
      ...shallow(p),
      ...(p.lidDepth > p.H ? [error('lidDepth', 'עומק המכסה לא יכול לעלות על גובה הגוף.')] : []),
    ],
  );

add(
  '0402',
  45,
  [L, W, H, t],
  (p) =>
    crossBlank(p.L + p.t, p.W + p.t, [p.H + p.t, (p.L + p.t) / 2], [p.H + p.t, (p.W + p.t) / 2]),
  ['פריסה צולבת עם ארבע כנפי סגירה; כנפי הצד בעומק L/2.'],
);
add(
  '0403',
  46,
  [L, W, H, v, t],
  (p) => crossBlank(p.L + p.t, p.W + p.t, [p.H + p.t, p.v, p.v], [p.H + p.t, (p.W + p.t) / 2]),
  ['כנפי סגירה W/2 ושפות צד עם שתי החזרות ברוחב v.'],
);
for (const [id, page] of [
  ['0404', 46],
  ['0405', 46],
] as const)
  add(
    id,
    page,
    [L, W, H, t, fit, spacing],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t;
      return pack(
        [
          strip(id === '0404' ? [l / 2, h, l, h, l / 2] : [h, w, h], id === '0404' ? w : l, 'body'),
          strip(
            [
              (w + 2 * p.t + p.fit) / 2,
              h + 2 * p.t + p.fit,
              w + 2 * p.t + p.fit,
              h + 2 * p.t + p.fit,
              (w + 2 * p.t + p.fit) / 2,
            ],
            l + 2 * p.t + p.fit,
            'lid',
          ),
        ],
        p.spacing,
      );
    },
    ['שתי פריסות נפרדות במידות קינון מותאמות; ללא לשוניות דבק.'],
  );
add(
  '0407',
  47,
  [L, W, H, v, t],
  (p) => crossBlank(p.W + p.t, p.L + p.t, [p.H + p.t, p.W + p.t], [p.H + p.t, p.v]),
  ['כנפי סגירה מלאות W ושפות קצרות v בקצות האורך.'],
);
add(
  '0409',
  47,
  [L, W, H, v, t],
  (p) => strip([p.v, p.W + p.t, p.H + p.t, p.W + p.t, p.H + p.t], p.L),
  ['אריזה עוטפת עם הארכת v בקצה אחד.'],
);

// 0501/02/03 close on three different axes; compounds retain both nested components.
const sleeve = (p: Params, id: string, kind: string, outer = false) => {
  const allowance = p.t + (outer ? 2 * p.t + p.fit : 0);
  const l = p.L + allowance,
    w = p.W + allowance,
    h = p.H + allowance;
  return kind === '0501'
    ? strip([l, w, l, w], h, id, p.glue)
    : kind === '0502'
      ? strip([l, h, l, h], w, id, p.glue)
      : strip([w, h, w, h], l, id, p.glue);
};
for (const id of ['0502', '0503'])
  add(id, 76, [L, W, H, glue, t], (p) => sleeve(p, 'body', id), [
    `שרוול עם לוחות ${id === '0502' ? 'L–H–L–H ורוחב W' : 'W–H–W–H ואורך L'}.`,
  ]);
for (const [id, page, inner, outer] of [
  ['0504', 77, '0502', '0501'],
  ['0505', 77, '0503', '0502'],
  ['0507', 77, '0503', '0501'],
] as const)
  add(
    id,
    page,
    [L, W, H, glue, t, fit, spacing],
    (p) => pack([sleeve(p, 'body', inner), sleeve(p, 'outer', outer, true)], p.spacing),
    ['שני שרוולים נפרדים בכיוונים שונים, עם קיזוזי קינון.'],
  );
add(
  '0509',
  78,
  [L, W, H, glue, t, fit, spacing],
  (p) =>
    pack(
      [
        strip(
          [(p.L + p.t) / 2, p.H + p.t, p.L + p.t, p.H + p.t, (p.L + p.t) / 2],
          p.W + p.t,
          'body',
        ),
        sleeve(p, 'outer', '0503', true),
      ],
      p.spacing,
    ),
  ['עטיפה ללא דבק W × (L/2–H–L–H–L/2) ושרוול חיצוני נפרד.'],
);
add(
  '0510',
  78,
  [L, W, H, glue, t, fit, spacing],
  (p) => pack([sleeve(p, 'body', '0503'), sleeve(p, 'outer', '0501', true)], p.spacing),
  ['שרוול פנימי עם מכסה מחובר ושרוול חיצוני בנפרד; פתיחה לאורך קיפול קצה.'],
);

for (const [id, page, axis, sequence] of [
  ['0900', 126, 'W', ['v']],
  ['0903', 127, 'H', ['L']],
  ['0904', 127, 'H', ['W', 'L', 'W', 'L']],
  ['0905', 127, 'W', ['H', 'L', 'H', 'L']],
  ['0906', 128, 'L', ['W', 'H', 'W', 'H']],
  ['0907', 128, 'W', ['L/2', 'H', 'L', 'H', 'L/2']],
  ['0908', 128, 'H', ['L/2', 'W', 'L', 'W', 'L/2']],
  ['0909', 129, 'W', ['H/2', 'L', 'H', 'L', 'H/2']],
  ['0920', 131, 'H', ['W', 'L/2', 'W', 'L', 'W', 'L/2', 'W']],
  ['0921', 131, 'H', ['L/2', 'W', 'L/2', 'W', 'L/2', 'W', 'L/2']],
  ['0946', 137, 'L', ['H', 'H', 'H', 'W', 'H', 'H', 'H']],
  ['0947', 137, 'L', ['H', 'H', 'H', 'H', 'v', 'H', 'H', 'H', 'H']],
  ['0949', 138, 'L', ['v', 'W', 'v']],
  ['0951', 139, 'L', ['H', 'W', 'H']],
] as const) {
  const relevant = ['L', 'W', 'H', 'v'].filter(
    (k) => axis === k || sequence.some((s) => s.split('/')[0] === k),
  );
  const fields = relevant.map((k) => ({ L, W, H, v })[k as 'L' | 'W' | 'H' | 'v']);
  add(
    id,
    page,
    fields,
    (p) =>
      strip(
        sequence.map((s) => {
          const [key, factor] = s.split('/');
          return p[key] / Number(factor ?? 1);
        }),
        p[axis],
      ),
    [`רצף לוחות: ${sequence.join(' – ')}; מידת הקיפול הארוכה: ${axis}. ללא תוספת עובי אוטומטית.`],
  );
}
add(
  '0911',
  129,
  [L, W, H, t, clearance],
  (p) => corner(p.L + p.t, p.W + p.t, p.H + p.t, p, 'body', 'vertical'),
  ['מגש עם חריצי פינה בכיוון האורך.'],
  shallow,
);
add(
  '0929',
  131,
  [L, W, H, spacing],
  (p) =>
    pack(
      [strip([p.W, p.H, p.W], p.L, 'horizontal'), strip([p.W, p.L, p.W], p.H, 'vertical')],
      p.spacing,
    ),
  ['שתי עטיפות נפרדות בכיוונים ניצבים.'],
);
for (const [id, page, axis, foldedLength] of [
  ['0936', 134, 'L', 'W'],
  ['0937', 134, 'H', 'L'],
  ['0938', 134, 'W', 'H'],
] as const) {
  const fields = [...new Set([axis, foldedLength])].map((k) => ({ L, W, H })[k]);
  add(
    id,
    page,
    [...fields, v, t],
    (p) => strip([p.v, p[foldedLength], p.t, p[foldedLength], p.v], p[axis]),
    ['מחיצה כפולה עם החזרות קצה v; שני קווי מרכז במרחק עובי החומר.'],
  );
}
add(
  '0912',
  130,
  [L, W, H, t, clearance],
  (p) => tray(p.L + p.t, p.W + p.t, p.H + p.t, p.t + p.clearance),
  ['מגש עם חריצי פינה אופקיים.'],
  shallow,
);
add(
  '0913',
  130,
  [L, W, H, v],
  (p) => {
    const g = strip([p.L / 2, p.W, p.L, p.W, p.L / 2], p.H + 2 * p.v);
    for (const y of [p.v, p.v + p.H])
      g.paths.push({
        kind: 'crease',
        partId: 'body',
        points: [
          [0, y],
          [g.boundsMm.width, y],
        ],
        closed: false,
        d: `M0 ${y} L${g.boundsMm.width} ${y}`,
      });
    return g;
  },
  ['מחיצה עוטפת עם שפות קיפול ברוחב v למעלה ולמטה.'],
);
add('0914', 130, [L, W, H], (p) => strip([p.H, p.W, p.H, p.W, p.H], p.L), [
  'רצף H–W–H–W–H; הלוח האחרון מחזק את הדופן הראשונה.',
]);

for (const [id, page, seq] of [
  ['0942', 136, ['d', 'H', 'H', 'H', 'W', 'H', 'H', 'H', 'd']],
  ['0945', 137, ['d', 'H', 'W', 'H', 'd']],
  ['0948', 138, ['d', 'H', 'H', 'H', 'H', 'v', 'H', 'H', 'H', 'H', 'd']],
] as const)
  add(
    id,
    page,
    [L, H, (seq as readonly string[]).includes('W') ? W : v],
    (p) =>
      strip(
        seq.map((k) => (k === 'd' ? Math.hypot(p.H, p.H) : p[k])),
        p.L,
      ),
    ['החתך משתמש במשולש ישר־זווית עם צלעות H; אורך האלכסון מחושב √2×H ואינו מוקטן כמו צלע ישרה.'],
  );
add(
  '0943',
  136,
  [L, v, f('leg', 'רוחב כנף משוננת', 30, 'special')],
  (p) => strip([p.leg, p.leg, p.leg, p.leg, p.v, p.leg, p.leg, p.leg, p.leg], p.L),
  ['חתך מרכז v ושתי רצועות זיגזג בנות ארבע כנפיים בכל צד; זווית הקיפול נקבעת בהרכבה.'],
);
add(
  '0944',
  136,
  [L, v, f('leg', 'צלע משולש', 40, 'special'), f('foot', 'הארכת רגל', 20, 'special')],
  (p) => strip([p.foot, p.leg, p.leg, p.foot, p.v, p.foot, p.leg, p.leg, p.foot], p.L),
  [
    'שני תומכים משולשים עם רגליים חופשיות. צלע המשולש והרגל מוגדרות בנפרד; זווית הקיפול נקבעת בהרכבה.',
  ],
);
for (const [id, page, count] of [
  ['0940', 135, 3],
  ['0941', 135, 4],
] as const)
  add(
    id,
    page,
    [L, W, H, t],
    (p) =>
      strip(
        [
          ...Array.from({ length: count }, () => [p.H, p.t]).flat(),
          p.W,
          ...Array.from({ length: count }, () => [p.t, p.H]).flat(),
        ],
        p.L,
      ),
    ['קיפולי החזרה נפרדים במרחק עובי חומר סביב תומכים מרובעים.'],
  );

// The source specifies only extrusion length for these profiles. Expose leg size instead of inventing W/H labels.
const leg = f('leg', 'אורך כנף בחתך', 60, 'special');
for (const [id, page, sequence] of [
  ['0970', 142, ['s', 's']],
  ['0971', 142, ['s', 't', 's', 's', 't', 's']],

  ['0973', 143, ['s', 's', 'd', 'd', 's', 's']],
  ['0974', 143, ['s', 's', 'b', 's', 's']],
] as const)
  add(
    id,
    page,
    [L, leg, ...((sequence as readonly string[]).includes('t') ? [t] : [])],
    (p) =>
      strip(
        sequence.map((k) =>
          k === 's'
            ? p.leg
            : k === 'd'
              ? Math.hypot(p.leg, p.leg)
              : k === 'b'
                ? 2 * Math.hypot(p.leg, p.leg)
                : p.t,
        ),
        p.L,
      ),
    [
      'פרופיל זוויתי; אורך הכנף מפורש כמשתנה נוסף. קווי החזרה מפוצלים לפי עובי החומר. זוויות הקיפול טעונות בדיקת הרכבה.',
    ],
  );
for (const [id, page] of [
  ['0965', 141],
  ['0966', 141],
] as const)
  add(id, page, [L, W], (p) => strip([p.W, p.W, p.W, p.W, p.W], p.L, 'body', 0, 'partial'), [
    'חמש שכבות ברוחב W; חיבורי השכבות הם חיתוך חלקי (PARTIAL_CUT), ולא קיפול רגיל. צד החיתוך נקבע לפי תהליך ההרכבה.',
  ]);
add(
  '0967',
  141,
  [L, W, t],
  (p) => {
    const g = strip(
      [p.W, p.W, p.W, p.W, p.W, p.W / 2, p.t, p.W, p.t, p.W / 2, p.W],
      p.L,
      'body',
      0,
      'partial',
    );
    for (const i of [5, 6, 7, 8]) g.paths[i + 1].kind = 'crease';
    return g;
  },
  ['בלוק שכבות עם עטיפה; חיתוך חלקי לשכבות וקיפול נפרד לעטיפה.'],
);

add('0950', 138, [L, W, v, t], (p) => strip([p.v, p.t, p.W, p.t, p.v], p.L), [
  'שתי שפות החזרה v; כל קיפול כפול מופרד בעובי חומר.',
]);
const rows = f('rows', 'לוחות לאורך', 2, 'special', 1, 12, 1, 'לוחות'),
  columns = f('columns', 'לוחות לרוחב', 3, 'special', 1, 12, 1, 'לוחות');
const gridIssues = (p: Params) =>
  !Number.isInteger(p.rows) || !Number.isInteger(p.columns)
    ? [error('rows', 'מספרי הלוחות חייבים להיות שלמים.')]
    : Math.min(p.L / (p.columns + 1), p.W / (p.rows + 1)) <= 2 * (p.t + p.clearance)
      ? [error('columns', 'רוחב התא קטן מדי לחריץ.')]
      : [];
add('0930', 132, [L, W, H, t, clearance, spacing], (p) => partitions({ ...p, N: 2, rows: 1 }), [
  'שני לוחות ניצבים עם חריצי חצי גובה משלימים; חריץ עליון בלוח האורך ותחתון בלוח הרוחב.',
]);
add(
  '0933',
  133,
  [L, W, H, rows, columns, t, clearance, spacing],
  (p) => partitions({ ...p, N: p.rows + p.columns }),
  ['רשת מחיצות; מספרי הלוחות בכל כיוון נפרדים. מספר התאים הוא (rows+1)×(columns+1).'],
  gridIssues,
);

function earGrid(p: Params, fold: boolean) {
  const b = new GeometryBuilder(),
    slot = p.t + p.clearance;
  let offset = 0;
  for (const down of [true, false])
    for (let i = 0; i < 2; i++) {
      const length = down ? p.L : p.W,
        positions = [p.v, length - p.v],
        id = `${down ? 'row' : 'column'}-${i + 1}`;
      const points: import('./types').Point[] = [[offset, 0]];
      if (down)
        for (const x of positions)
          points.push(
            [offset + x - slot / 2, 0],
            [offset + x - slot / 2, p.H / 2],
            [offset + x + slot / 2, p.H / 2],
            [offset + x + slot / 2, 0],
          );
      points.push([offset + length, 0], [offset + length, p.H]);
      if (!down)
        for (const x of [...positions].reverse())
          points.push(
            [offset + x + slot / 2, p.H],
            [offset + x + slot / 2, p.H / 2],
            [offset + x - slot / 2, p.H / 2],
            [offset + x - slot / 2, p.H],
          );
      points.push([offset, p.H]);
      b.part(id, 'לוח מחיצה עם קצות מסגרת', points);
      if (fold)
        for (const x of [p.v / 2, length - p.v / 2])
          b.line('crease', id, [offset + x, 0], [offset + x, p.H]);
      offset += length + p.spacing;
    }
  return b.finish();
}
for (const id of ['0931', '0932'])
  add(
    id,
    132,
    [L, W, H, v, t, clearance, spacing],
    (p) => earGrid(p, id === '0932'),
    [
      id === '0931'
        ? 'ארבעה לוחות עם שני חריצים לכל לוח; v הוא מרחק החריץ מהקצה.'
        : 'ארבעה לוחות עם שני חריצים וקצות מתקפלים; קיפול הקצה נמצא במחצית v.',
    ],
    (p) =>
      2 * p.v + 2 * (p.t + p.clearance) >= Math.min(p.L, p.W)
        ? [error('v', 'חריצי הקצה חייבים להישאר נפרדים ובתוך הלוח.')]
        : [],
  );

function circlePoints(x: number, y: number, r: number) {
  const count = Math.max(32, Math.ceil(Math.PI / Math.acos(1 - Math.min(0.01 / r, 1))));
  return Array.from(
    { length: count },
    (_, i) =>
      [
        x + r * Math.cos((2 * Math.PI * i) / count),
        y + r * Math.sin((2 * Math.PI * i) / count),
      ] as const,
  );
}
const holeDiameter = f('holeDiameter', 'קוטר חור', 12, 'special', 1, 500),
  holeSpacing = f('holeSpacing', 'מרחק בין מרכזי חורים', 50, 'special', 2, 1500);
function holeIssues(p: Params, axis: string) {
  return p.holeDiameter >= Math.min(p.L, p.W) || p.holeSpacing + p.holeDiameter >= p[axis]
    ? [error('holeSpacing', 'החורים חייבים להישאר בתוך הלוח וללא חפיפה עם קצותיו.')]
    : p.holeSpacing <= p.holeDiameter
      ? [error('holeSpacing', 'יש להשאיר חומר בין החורים.')]
      : [];
}
add(
  '0952',
  139,
  [L, W, H, holeDiameter, holeSpacing],
  (p) => {
    const g = strip([p.H, p.L, p.H], p.W);
    const b = new GeometryBuilder();
    b.paths = g.paths;
    b.parts = g.parts;
    for (const y of [p.W / 2 - p.holeSpacing / 2, p.W / 2 + p.holeSpacing / 2])
      b.path('cut', 'body', circlePoints(p.H + p.L / 2, y, p.holeDiameter / 2), true);
    return b.finish();
  },
  ['שני חורים עגולים בלוח L×W בין דפנות H. עיגולים מיוצגים במקטעים עם שגיאת מיתר עד 0.01 מ״מ.'],
  (p) => holeIssues(p, 'W'),
);
add(
  '0953',
  139,
  [L, W, H, holeDiameter, holeSpacing],
  (p) => {
    const b = new GeometryBuilder(),
      l = p.L,
      h = p.H,
      w = p.W;
    b.part('body', 'מחיצה עם דפנות צד', [
      [0, 0],
      [l + h, 0],
      [l + h, h],
      [l, h],
      [l, h + w],
      [l + h, h + w],
      [l + h, 2 * h + w],
      [0, 2 * h + w],
    ]);
    for (const y of [h, h + w]) b.line('crease', 'body', [0, y], [l, y]);
    for (const [a, c] of [
      [0, h],
      [h + w, 2 * h + w],
    ])
      b.line('crease', 'body', [l, a], [l, c]);
    for (const x of [l / 2 - p.holeSpacing / 2, l / 2 + p.holeSpacing / 2])
      b.path('cut', 'body', circlePoints(x, h + w / 2, p.holeDiameter / 2), true);
    return b.finish();
  },
  ['שני חורים בלוח המרכזי; שתי דפנות H עם הארכות צד וקיפולי פינה.'],
  (p) => holeIssues(p, 'L'),
);
add(
  '0955',
  140,
  [L, W, H, f('taper', 'היצרות קצות כנפיים', 5, 'special', 0.1, 100, 0.1)],
  (p) => {
    const b = new GeometryBuilder(),
      { L: l, W: w, H: h, taper: c } = p;
    b.part('body', 'מגש צולב עם כנפיים משופעות', [
      [h + c, 0],
      [h + l - c, 0],
      [h + l, h],
      [h + l + h, h + c],
      [h + l + h, h + w - c],
      [h + l, h + w],
      [h + l - c, 2 * h + w],
      [h + c, 2 * h + w],
      [h, h + w],
      [0, h + w - c],
      [0, h + c],
      [h, h],
    ]);
    for (const x of [h, h + l]) b.line('crease', 'body', [x, h], [x, h + w]);
    for (const y of [h, h + w]) b.line('crease', 'body', [h, y], [h + l, y]);
    return b.finish();
  },
  ['ארבע כנפיים ללא אוזני פינה, עם היצרות מוגדרת בקצות הכנפיים.'],
  (p) =>
    2 * p.taper >= Math.min(p.L, p.W)
      ? [error('taper', 'ההיצרות חייבת להיות קטנה מחצי המידה הקטנה.')]
      : [],
);
for (const [id, page] of [
  ['0310', 35],
  ['0312', 35],
  ['0313', 35],
] as const)
  add(
    id,
    page,
    [L, W, H, lid, glue, t, clearance, fit, spacing],
    (p) => {
      const pieces = [];
      if (id === '0310')
        pieces.push(strip([p.L + p.t, p.W + p.t, p.L + p.t, p.W + p.t], p.H + p.t, 'body', p.glue));
      else pieces.push(slotted(p, id === '0312' ? '0200' : '0201'));
      for (const part of id === '0312' ? ['lid'] : ['lower', 'lid'])
        pieces.push(
          corner(
            p.L + 3 * p.t + p.fit,
            p.W + 3 * p.t + p.fit,
            p.lidDepth + p.t,
            p,
            part,
            id === '0310' ? 'vertical' : 'horizontal',
          ),
        );
      return pack(pieces, p.spacing);
    },
    ['שרוול / גוף עם כנפיים וכיסויי קצה נפרדים; מידות הכיסוי כוללות מרווח קינון.'],
    (p) => [
      ...shallow(p),
      ...(p.lidDepth > p.H ? [error('lidDepth', 'עומק הכיסוי חייב להיות עד גובה הגוף.')] : []),
    ],
  );
for (const id of ['0319', '0320'])
  add(
    id,
    36,
    [L, W, H, glue, t, clearance, fit, spacing],
    (p) => {
      const outer = {
        ...p,
        L: p.L + 2 * p.t + p.fit,
        W: p.W + 2 * p.t + p.fit,
        H: p.H + 2 * p.t + p.fit,
      };
      const lower = slotted(id === '0319' ? outer : p, 'bottom-only');
      const upper = slotted(id === '0319' ? p : outer, 'top-only');
      return pack(
        [
          lower,
          transformGeometry(
            {
              ...upper,
              parts: upper.parts.map((part) => ({ ...part, id: 'upper' })),
              paths: upper.paths.map((path) => ({ ...path, partId: 'upper' })),
            },
            (point) => point,
          ),
        ],
        p.spacing,
      );
    },
    ['שני גופים טלסקופיים עם כנפי קצה בכיוונים הפוכים. תוספת הקינון ניתנת לגוף החיצוני.'],
  );

const lip = f('lip', 'שפת תחיבה', 15, 'special', 1, 200);
const lockDepth = f('lockDepth', 'עומק נעילה', 10, 'special', 1, 200),
  tabWidth = f('tabWidth', 'רוחב לשונית / מגרעת', 40, 'special', 2, 1000);
for (const [id, page] of [
  ['0210', 21],
  ['0211', 21],
  ['0212', 22],
  ['0215', 22],
  ['0216', 23],
  ['0220', 24],
  ['0221', 24],
  ['0233', 28],
  ['0233.1', 28],
] as const) {
  const locking = !['0210', '0211', '0212'].includes(id),
    tucking = ['0210', '0211', '0212', '0215'].includes(id);
  add(
    id,
    page,
    [
      L,
      W,
      H,
      glue,
      t,
      clearance,
      ...(tucking ? [lip] : []),
      ...(locking ? [lockDepth, tabWidth] : []),
    ],
    (p) => carton(p, id),
    [
      tucking
        ? 'מכסה מלא עם שפת תחיבה בקפל נפרד; כנפי הצד בעומק W/2.'
        : 'סגירה לפי רצף הכנפיים של הדגם.',
      ...(locking
        ? ['לשוניות ומגרעות נעילה מוגדרות בנפרד; שפת תחיבה ונעילת התחתית דורשות בדיקת התאמה פיזית.']
        : []),
    ],
    (p) =>
      locking &&
      (p.lockDepth >= (p.W + p.t) / 2 ||
        p.tabWidth >= p.L - 2 * (p.t + p.clearance) ||
        p.tabWidth <= 2 * (p.t + p.clearance))
        ? [error('tabWidth', 'לשונית הנעילה חייבת להתאים לכנף; הקטינו עומק ורוחב או הגדילו מידות.')]
        : [],
  );
}
function tabbedStrap(p: Params, id: string, all: boolean) {
  const l = p.L + 3 * p.t + p.fit,
    w = p.W + 3 * p.t + p.fit,
    h = p.H + p.t,
    tab = p.glue,
    gap = p.t + p.clearance;
  const widths = [w, l, w],
    edges = [tab];
  widths.forEach((value) => edges.push(edges[edges.length - 1] + value));
  const b = new GeometryBuilder(),
    outline: import('./types').Point[] = [];
  const flap = (i: number, y: number, sign: number) => {
    const a = edges[i] + (i ? gap / 2 : 0),
      c = edges[i + 1] - (i < 2 ? gap / 2 : 0);
    if (!all && i === 1)
      return [
        [a, y],
        [c, y],
      ] as import('./types').Point[];
    const bevel = Math.min(tab / 5, (c - a) / 10);
    b.line('crease', id, [a, y], [c, y]);
    return [
      [a, y],
      [a + bevel, y + sign * tab],
      [c - bevel, y + sign * tab],
      [c, y],
    ] as import('./types').Point[];
  };
  outline.push([0, tab]);
  for (let i = 0; i < 3; i++) outline.push(...flap(i, tab, -1));
  outline.push([edges[3] + tab, tab], [edges[3] + tab, tab + h]);
  for (let i = 2; i >= 0; i--) outline.push(...flap(i, tab + h, 1).reverse());
  outline.push([0, tab + h]);
  b.part(
    id,
    'רצועה עם לשוניות צד',
    outline.filter(
      (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
    ),
  );
  for (const x of edges) b.line('crease', id, [x, tab], [x, tab + h]);
  return b.finish();
}
for (const id of ['0511', '0512'])
  add(
    id,
    id === '0511' ? 78 : 79,
    [L, W, H, glue, t, clearance, fit, spacing],
    (p) =>
      pack(
        [
          tabbedStrap(p, 'strap', id === '0512'),
          strip(
            id === '0511'
              ? [p.W + p.t, p.H + 3 * p.t + p.fit, p.W + p.t, p.H + 3 * p.t + p.fit]
              : [p.W + p.t, p.H + 3 * p.t + p.fit, p.W + p.t],
            p.L + p.t,
            'sleeve',
            p.glue,
          ),
        ],
        p.spacing,
      ),
    ['רצועת מכסה W+–L+–W+ עם לשוניות צד ושרוול נפרד; קינון כולל שני עוביי חומר ומרווח.'],
  );
add('0972', 142, [L, leg, t], (p) => strip([p.leg, p.t, p.leg, p.leg, p.t, p.leg], p.L), [
  'הפריסה זהה ל־0971 במקור; ההבדל הוא בכיוון הרכבת החזרות הכנפיים.',
]);
add(
  '0975',
  143,
  [
    L,
    leg,
    f('return', 'רוחב החזרה בחתך', 20, 'special'),
    f('brace', 'רוחב כנף אלכסונית', 85, 'special'),
  ],
  (p) =>
    strip(
      [
        p.return,
        p.leg,
        p.return,
        p.brace,
        p.return,
        p.leg,
        p.leg,
        p.return,
        p.brace,
        p.return,
        p.leg,
        p.return,
      ],
      p.L,
    ),
  [
    'פרופיל זוויתי עם חיזוקים; רוחבי ההחזרות והכנפיים האלכסוניות מוגדרים במפורש לפי החתך הנדרש. יש לאמת זוויות וחיבורי החתך בהרכבה.',
  ],
);
add(
  '0976',
  144,
  [L, leg, t],
  (p) => strip([p.leg, p.t, p.leg, p.t, p.leg, p.leg, p.t, p.leg, p.t, p.leg], p.L),
  ['שני אגפי זווית עם שלוש שכבות בכל אגף; קיפולי ההחזרה מופרדים בעובי חומר.'],
);
// Both source profiles have six panels and five folds; their assembly orientation differs.
expandedGenerators['0974'].generate = (p) =>
  strip([p.leg, p.leg, Math.hypot(p.leg, p.leg), Math.hypot(p.leg, p.leg), p.leg, p.leg], p.L);
expandedGenerators['0974'].notes.push(
  'הפריסה בעלת שישה לוחות כמו 0973; כיוון ההחזרות משתנה בהרכבה.',
);

add(
  '0934',
  133,
  [L, W, H, { ...rows, min: 2 }, { ...columns, min: 2, default: 5 }, v, t, clearance, spacing],
  (p) => variableGrid(p, true),
  ['רשת עם חריצי קצה במרחק v וחריצים נוספים המחולקים בין חריצי הקצה; v אינו שפת קיפול.'],
  (p) => [
    ...gridIssues(p),
    ...(p.v <= p.t + p.clearance || 2 * p.v >= Math.min(p.L, p.W)
      ? [error('v', 'חריצי הקצה חייבים להישאר בתוך הלוח ונפרדים.')]
      : []),
    ...(Math.min((p.L - 2 * p.v) / (p.columns - 1), (p.W - 2 * p.v) / (p.rows - 1)) <=
    2 * (p.t + p.clearance)
      ? [error('columns', 'חריצי המחיצות קרובים מדי.')]
      : []),
  ],
);
add(
  '0935',
  133,
  [
    L,
    W,
    H,
    { ...v, default: 30 },
    rows,
    columns,
    f('fullHeightColumns', 'לוחות רוחב בגובה מלא', 1, 'special', 0, 12, 1, 'לוחות'),
    t,
    clearance,
    spacing,
  ],
  (p) => variableGrid(p, false, true),
  [
    'רשת בשני גבהים; כל לוחות האורך בגובה v, ולוחות הרוחב לפי מספר הלוחות בגובה מלא H. החריצים משלימים חצי גובה v.',
  ],
  (p) => [
    ...gridIssues(p),
    ...(p.v > p.H ? [error('v', 'הגובה הנמוך חייב להיות עד הגובה המלא.')] : []),
    ...(!Number.isInteger(p.fullHeightColumns) || p.fullHeightColumns > p.columns
      ? [error('fullHeightColumns', 'מספר הלוחות בגובה מלא חייב להיות שלם ועד מספר לוחות הרוחב.')]
      : []),
  ],
);
add(
  '0939',
  135,
  [W, H, f('cells', 'תאים לאורך', 5, 'special', 2, 20, 1, 'תאים')],
  (p) => {
    const pitch = p.W / 2,
      count = 2 * p.cells - 1,
      b = new GeometryBuilder(),
      height = 2 * p.H + pitch;
    b.part('body', 'מחיצת תאים מתקפלת', [
      [0, 0],
      [count * pitch, 0],
      [count * pitch, height],
      [0, height],
    ]);
    for (let i = 0; i < count; i++) {
      if (i % 2)
        b.path(
          'cut',
          'body',
          [
            [i * pitch, p.H],
            [(i + 1) * pitch, p.H],
            [(i + 1) * pitch, p.H + pitch],
            [i * pitch, p.H + pitch],
          ],
          true,
        );
      else
        for (const y of [p.H, p.H + pitch])
          b.line('crease', 'body', [i * pitch, y], [(i + 1) * pitch, y]);
      if (i)
        for (const [a, c] of [
          [0, p.H],
          [p.H + pitch, height],
        ])
          b.line('crease', 'body', [i * pitch, a], [i * pitch, c]);
    }
    return b.finish();
  },
  [
    'תאים מתקפלים עם חלונות ריבועיים. אורך המבנה המורכב הוא cells×W/2; הרצועה המפותחת כוללת 2×cells−1 לוחות.',
  ],
  (p) => (!Number.isInteger(p.cells) ? [error('cells', 'מספר התאים חייב להיות שלם.')] : []),
);

for (const code of ['0302', '0309'])
  expandedGenerators[code].fields = expandedGenerators[code].fields.filter(
    (field) => field.key !== 'clearance',
  );
add(
  '0400',
  45,
  [L, W, H, v, t],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      y = h + p.v,
      end = 3 * w + 2 * h,
      b = new GeometryBuilder();
    b.part('body', 'עטיפה עם דפנות קצה', [
      [0, 0],
      [w, 0],
      [w, y],
      [end, y],
      [end, y + l],
      [w, y + l],
      [w, 2 * y + l],
      [0, 2 * y + l],
    ]);
    for (const x of [w, w + h, 2 * w + h, 2 * w + 2 * h])
      b.line('crease', 'body', [x, y], [x, y + l]);
    for (const cy of [p.v, y, y + l, y + l + h]) b.line('crease', 'body', [0, cy], [w, cy]);
    return b.finish();
  },
  ['עטיפה W–H–W–H–W לאורך L; דפנות H ושפות v בקצות לוח W הראשון.'],
);
add(
  '0406',
  47,
  [L, W, H, v, glue, t, clearance],
  (p) => {
    const l = p.W + p.t,
      w = p.H + p.t,
      h = p.L + p.t,
      edges = [p.glue, l + p.glue, l + w + p.glue, 2 * l + w + p.glue, 2 * l + 2 * w + p.glue],
      gap = p.t + p.clearance,
      b = new GeometryBuilder();
    const points: import('./types').Point[] = [[p.glue, p.v]];
    for (let i = 0; i < 4; i++) {
      const a = edges[i] + (i ? gap / 2 : 0),
        c = edges[i + 1] - (i < 3 ? gap / 2 : 0);
      points.push([a, p.v], [a, 0], [c, 0], [c, p.v]);
      b.line('crease', 'body', [a, p.v], [c, p.v]);
    }
    points.push([edges[4], p.v + h]);
    for (let i = 3; i >= 0; i--) {
      const a = edges[i] + (i ? gap / 2 : 0),
        c = edges[i + 1] - (i < 3 ? gap / 2 : 0);
      points.push([c, p.v + h], [c, 2 * p.v + h], [a, 2 * p.v + h], [a, p.v + h]);
      b.line('crease', 'body', [a, p.v + h], [c, p.v + h]);
    }
    points.push([0, p.v + h - p.glue / 4], [0, p.v + p.glue / 4]);
    b.part(
      'body',
      'שרוול עם שפות קצה',
      points.filter(
        (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
      ),
    );
    for (const x of edges.slice(0, 4)) b.line('crease', 'body', [x, p.v], [x, p.v + h]);
    return b.finish();
  },
  ['שרוול W–H–W–H עם שפות v בשני קצות האורך.'],
);
add(
  '0226',
  25,
  [L, W, H, glue, t],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      flap = w / 2,
      edges = [p.glue];
    for (const width of [l, w, l, w]) edges.push(edges[edges.length - 1] + width);
    const b = new GeometryBuilder(),
      height = h + 2 * flap,
      end = edges[4],
      inset = Math.min(p.glue / 3, h / 5);
    b.part('body', 'קופסה עם כנפיים רציפות', [
      [p.glue, 0],
      [end, 0],
      [end, height],
      [p.glue, height],
      [p.glue, flap + h],
      [0, flap + h - inset],
      [0, flap + inset],
      [p.glue, flap],
    ]);
    for (const x of edges.slice(1, 4)) b.line('crease', 'body', [x, 0], [x, height]);
    b.line('crease', 'body', [p.glue, flap], [p.glue, flap + h]);
    for (const y of [flap, flap + h]) b.line('crease', 'body', [p.glue, y], [end, y]);
    for (const i of [1, 3])
      for (const sign of [-1, 1]) {
        const y = sign === -1 ? flap : flap + h,
          tip: import('./types').Point = [(edges[i] + edges[i + 1]) / 2, y + sign * flap];
        b.line('crease', 'body', [edges[i], y], tip);
        b.line('crease', 'body', [edges[i + 1], y], tip);
      }
    return b.finish();
  },
  ['כנפיים רציפות ללא חריצי הפרדה, עם קיפולים אלכסוניים בכנפי הרוחב.'],
);
add(
  '0954',
  140,
  [L, W, H, v, t, clearance, holeDiameter, holeSpacing],
  (p) => {
    const b = new GeometryBuilder(),
      { L: l, W: w, H: h, v } = p,
      gap = p.t + p.clearance,
      half = gap / 2,
      x = v + l,
      bottom = 2 * v + w;
    b.part('body', 'לוח חורים עם שפות ומחיצה', [
      [0, 0],
      [v - half, 0],
      [v - half, v],
      [v + half, v],
      [v + half, 0],
      [x - half, 0],
      [x - half, v],
      [x + half, v],
      [x + half, 0],
      [x + h, 0],
      [x + h, bottom],
      [x + half, bottom],
      [x + half, bottom - v],
      [x - half, bottom - v],
      [x - half, bottom],
      [v + half, bottom],
      [v + half, bottom - v],
      [v - half, bottom - v],
      [v - half, bottom],
      [0, bottom],
    ]);
    for (const cx of [v, x]) b.line('crease', 'body', [cx, v], [cx, v + w]);
    for (const cy of [v, v + w])
      for (const [a, c] of [
        [0, v - half],
        [v + half, x - half],
        [x + half, x + h],
      ])
        b.line('crease', 'body', [a, cy], [c, cy]);
    for (const [a, c] of [
      [
        [v, v],
        [2 * v, 0],
      ],
      [
        [x, v],
        [x - v, 0],
      ],
      [
        [v, v + w],
        [2 * v, bottom],
      ],
      [
        [x, v + w],
        [x - v, bottom],
      ],
    ] as const)
      b.line('crease', 'body', a, c);
    for (const cx of [v + l / 2 - p.holeSpacing / 2, v + l / 2 + p.holeSpacing / 2])
      b.path('cut', 'body', circlePoints(cx, v + w / 2, p.holeDiameter / 2), true);
    return b.finish();
  },
  ['לוח L×W עם שפות v, דופן H, חריצי פינה וקיפולי פינה פנימה; שני חורים במרכז.'],
  (p) => [
    ...holeIssues(p, 'L'),
    ...(2 * p.v >= p.L ? [error('v', 'שפות הפינה חייבות להיות קטנות מחצי L.')] : []),
  ],
);

Object.assign(expandedGenerators, nextGenerators);
Object.assign(expandedSources, nextSources);
