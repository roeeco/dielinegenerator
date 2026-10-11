import { tray } from './families/tray';
import { automaticBase } from './families/automatic';
import type { GeneratorDefinition, ParameterField, Params, ValidationIssue } from './types';
import { GeometryBuilder, transformGeometry } from './primitives';
import { crossBlank, pack, strip } from './families/panels';
import { endPanel, flangedStrip } from './families/flanged';
const f = (
  key: string,
  label: string,
  value: number,
  group: ParameterField['group'] = 'dimension',
  min = 1,
  max = 2000,
  step = 1,
): ParameterField => ({ key, label, default: value, group, min, max, step, unit: 'מ״מ' });
const L = f('L', 'אורך', 200),
  W = f('W', 'רוחב', 120),
  H = f('H', 'גובה', 40),
  v = f('v', 'רוחב שפה', 12, 'special', 1, 200);
const t = f('t', 'עובי חומר', 1, 'material', 0.1, 5, 0.1),
  clearance = f('clearance', 'מרווח חריץ', 0.3, 'material', 0.1, 2, 0.1),
  glue = f('glue', 'לשונית חיבור', 12, 'special', 4, 100),
  fit = f('fit', 'מרווח קינון כולל', 1, 'material', 0.1, 5, 0.1),
  spacing = f('spacing', 'רווח בין חלקים', 10, 'material', 2, 100);
export const nextGenerators: Record<string, GeneratorDefinition> = {};
export const nextSources: Record<string, number> = {};
const error = (field: string, message: string): ValidationIssue => ({
  field,
  message,
  severity: 'error',
});
function add(
  id: string,
  page: number,
  fields: ParameterField[],
  generate: GeneratorDefinition['generate'],
  notes: string[],
  validate?: GeneratorDefinition['validate'],
) {
  nextGenerators[id] = {
    id,
    fields,
    generate,
    validate,
    notes: [
      'בטא: יש לבצע חיתוך ניסיון ובדיקת הרכבה בחומר שנבחר.',
      ...(fields.some((field) => field.key === 't')
        ? ['קיזוזי עובי וקינון הם הנחות התחלה, ולא סבולות ייצור מאומתות.']
        : []),
      ...notes,
    ],
  };
  nextSources[id] = page;
}
function capIssues(p: Params) {
  return p.v >= Math.min(p.W, p.H) / 2
    ? [error('v', 'שפת החיבור חייבת להיות קטנה מחצי מידת לוח הקצה.')]
    : [];
}
for (const [id, page] of [
  ['0601', 82],
  ['0602', 82],
  ['0605', 82],
  ['0606', 83],
  ['0607', 83],
  ['0608', 83],
  ['0610', 84],
  ['0615', 84],
  ['0616', 84],
  ['0620', 85],
] as const) {
  const flanged = ['0601', '0602', '0606'].includes(id),
    cross = ['0610', '0615', '0616', '0620'].includes(id);
  const needsFit = !['0601', '0602', '0606'].includes(id),
    needsGlue = ['0601', '0602', '0607', '0608', '0610', '0615', '0616'].includes(id);
  const needsLip = true;
  add(
    id,
    page,
    [
      L,
      W,
      H,
      ...(needsLip ? [id === '0615' ? { ...v, default: 8 } : v] : []),
      ...(needsGlue ? [glue] : []),
      t,
      ...(flanged ? [clearance] : []),
      ...(needsFit ? [fit] : []),
      spacing,
    ],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t,
        nest = 2 * p.t + (p.fit ?? 0),
        lip = p.v ?? p.glue;
      let body;
      if (id === '0601' || id === '0602') {
        body = flangedStrip(
          [h + nest, w + nest, h + nest, w],
          l,
          [lip, lip, lip, 0],
          p.t + p.clearance,
          'body',
          p.glue,
          lip / 2,
        );
        if (id === '0602') {
          const x = body.boundsMm.width;
          // Closing lip continues from the final W panel across the extrusion length.
          const points = body.paths.find((path) => path.kind === 'cut')!.points;
          const index = points.findIndex((point) => point[0] === x && point[1] === lip);
          points.splice(index + 1, 0, [x + lip, lip], [x + lip, lip + l]);
          const builder = new GeometryBuilder();
          builder.part('body', 'מעטפת עם שפת תחיבה', points);
          builder.paths.push(...body.paths.filter((path) => path.kind !== 'cut'));
          builder.line('crease', 'body', [x, lip], [x, lip + l]);
          body = builder.finish();
        }
      } else if (id === '0605') body = strip([lip, h + nest, w, h + nest, lip], l, 'body');
      else if (id === '0606')
        body = flangedStrip(
          [(w + nest) / 2, h + nest, w + nest, h + nest, (w + nest) / 2],
          l,
          [lip, lip, lip, lip, lip],
          p.t + p.clearance,
          'body',
          0,
          lip / 2,
        );
      else if (id === '0620') body = strip([w / 2, h + nest, w + nest, h + nest, w / 2], l);
      else
        body = strip(
          ['0608', '0615', '0616'].includes(id)
            ? [w, h + nest, w + nest, h + nest]
            : [h + nest, w + nest, h + nest, w + nest],
          l,
          'body',
          p.glue,
        );
      let capWidth = w,
        capHeight = h;
      if (id === '0605') capWidth += nest;
      const caps = ['end-a', 'end-b'].map((part) => {
        if (cross) {
          if (id === '0620') return crossBlank(h, w, [lip], [lip], part);
          return crossBlank(
            capWidth,
            capHeight,
            id === '0615' ? [lip, p.t, lip] : [lip],
            id === '0615' ? [lip, p.t, lip] : [lip],
            part,
          );
        }
        return endPanel(
          capWidth,
          capHeight,
          id === '0606' ? 0 : lip,
          part,
          ['0605', '0607', '0608'].includes(id),
        );
      });
      return pack([body, ...caps], p.spacing);
    },
    [
      'מעטפת ושני לוחות קצה נפרדים. כיוון המעטפת, שפות הקצה וחתך הקינון נשמרים לפי דגם המקור.',
      ...(id === '0606' ? ['שפות ההדבקה במעטפת ברוחב v; לוחות הקצה שטוחים.'] : []),
    ],
    (p) => [
      ...(needsLip ? capIssues(p) : []),
      ...(id === '0615' && 2 * p.v + p.t >= Math.min(p.W, p.H) / 2
        ? [error('v', 'שפת ההחזרה הכפולה גדולה מדי ללוח הקצה.')]
        : []),
    ],
  );
}

add(
  '0621',
  85,
  [L, W, H, v, t, clearance, spacing],
  (p) => {
    const w = p.W + p.t,
      l = p.L + p.t,
      h = p.H + p.t;
    return pack(
      ['half-a', 'half-b'].map((id) =>
        flangedStrip(
          [w, p.v, w, l],
          h,
          [p.v / 2, p.v, p.v / 2, w / 2],
          p.t + p.clearance,
          id,
          p.v / 2,
        ),
      ),
      p.spacing,
    );
  },
  ['שתי פריסות זהות המתחברות למבנה: W–v–W–L, עם כנפי W/2 בדפנות האורך ושפות נפרדות בלוחות הקצה.'],
  (p) =>
    p.v >= Math.min(p.L, p.W, p.H) / 2
      ? [error('v', 'המחבר חייב להיות קטן מחצי המידה הקטנה.')]
      : [],
);

for (const [id, page] of [
  ['0410', 48],
  ['0411', 48],
  ['0412', 48],
  ['0413', 49],
  ['0415', 49],
  ['0416', 50],
] as const) {
  const hasLip = ['0410', '0412', '0413', '0415'].includes(id);
  add(
    id,
    page,
    [L, W, H, ...(hasLip ? [v] : []), t, clearance],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t,
        lip = p.v ?? 0,
        gap = p.t + p.clearance;
      let widths: number[], flaps: number[];
      if (id === '0410') {
        widths = [h, w, h, w, lip];
        flaps = [h, h, h, lip, 0];
      } else if (id === '0411') {
        widths = [w / 2, h, w, h, w / 2];
        flaps = [h, h, h, h, h];
      } else if (id === '0412') {
        widths = [w / 2, h, w, h, w / 2];
        flaps = [0, h, h + lip, h, 0];
      } else if (id === '0413') {
        widths = [h, w, h, w, lip];
        flaps = [h, h + lip, h, 0, 0];
      } else if (id === '0415') {
        widths = [w / 2, h, w, h];
        flaps = [0, h, h + lip, h];
      } else {
        widths = [w / 2, h, w, h, w / 2];
        flaps = [h, 0, h, 0, h];
      }
      const g = flangedStrip(
        widths,
        l,
        flaps,
        gap,
        'body',
        0,
        id === '0416' ? Math.min(h / 5, 8) : 0,
      );
      if (['0412', '0413', '0415'].includes(id)) {
        const i = id === '0413' ? 1 : 2,
          x = widths.slice(0, i).reduce((a, c) => a + c, 0),
          top = Math.max(...flaps),
          b = new GeometryBuilder();
        b.paths = g.paths;
        b.parts = g.parts;
        for (const y of [top - h, top + l + h])
          b.line('crease', 'body', [x + gap / 2, y], [x + widths[i] - gap / 2, y]);
        return b.finish();
      }
      return g;
    },
    ['עטיפה מלוח יחיד עם כנפי קצה לפי רצף המקור. לוחות הצד, כנפי H ושפות v נפרדים; לא מגש כללי.'],
    (p) =>
      hasLip && p.v >= Math.min(p.H, p.W) / 2
        ? [error('v', 'השפה חייבת להיות קטנה מחצי המידה הקטנה.')]
        : [],
  );
}
const overlap = f('overlap', 'חפיפה בחיבור', 20, 'special', 1, 500);
add(
  '0228',
  26,
  [L, W, H, overlap, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t;
    return flangedStrip(
      [w, (l + p.overlap) / 2, w, l, w, (l + p.overlap) / 2],
      h,
      [0, w / 2, w / 2, w / 2, w / 2, w / 2],
      p.t + p.clearance,
    );
  },
  [
    'חיבור במרכז דופן האורך; הרצף W–(L+overlap)/2–W–L–W–(L+overlap)/2. לוח W הראשון משמש לחיבור ללא כנפי קצה.',
  ],
  (p) => (p.overlap >= p.L ? [error('overlap', 'החפיפה חייבת להיות קטנה מאורך הדופן.')] : []),
);
const returnDepth = f('returnDepth', 'עומק כנף חוזרת', 20, 'special', 1, 1000);
for (const id of ['0229', '0229.1'])
  add(
    id,
    id === '0229' ? 26 : 27,
    [L, W, H, v, returnDepth, glue, t, clearance],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t,
        widths = [l, w, l, w],
        depths = widths.map((_, i) =>
          id === '0229'
            ? i % 2
              ? l / 2
              : p.v + p.returnDepth
            : i % 2
              ? p.v + p.returnDepth
              : w / 2,
        );
      const g = flangedStrip(widths, h, depths, p.t + p.clearance, 'body', p.glue),
        b = new GeometryBuilder(),
        top = Math.max(...depths),
        gap = p.t + p.clearance;
      b.paths = g.paths;
      b.parts = g.parts;
      let x = p.glue;
      for (let i = 0; i < 4; i++) {
        if ((id === '0229' && i % 2 === 0) || (id === '0229.1' && i % 2 === 1))
          for (const y of [top - p.v, top + h + p.v])
            b.line(
              'crease',
              'body',
              [x + (i ? gap / 2 : 0), y],
              [x + widths[i] - (i < 3 ? gap / 2 : 0), y],
            );
        x += widths[i];
      }
      return b.finish();
    },
    [
      'כנף חוזרת עם פס v ליד דופן הגוף. עומק הכנף החוזרת מוגבל ל־H בהתאם לציון MAX H במקור; הוא אינו מוחלף ב־W/2.',
    ],
    (p) =>
      p.returnDepth > p.H
        ? [error('returnDepth', 'עומק הכנף החוזרת חייב להיות עד גובה הגוף.')]
        : [],
  );
add(
  '0208',
  20,
  [L, W, H, v, glue, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      depth = w / 2 + p.v,
      edges = [p.glue],
      b = new GeometryBuilder(),
      points: import('./types').Point[] = [];
    for (const width of [l, w, l, w]) edges.push(edges[edges.length - 1] + width);
    function flap(i: number, y: number, sign: number) {
      const a = edges[i] + (i ? gap / 2 : 0),
        c = edges[i + 1] - (i < 3 ? gap / 2 : 0),
        mid = (a + c) / 2;
      const at = (x: number, d: number): import('./types').Point => [x, y + sign * d];
      const outline = [at(a, 0), at(a, depth)];
      if (i % 2)
        outline.push(
          at(mid - gap / 2, depth),
          at(mid - gap / 2, 0),
          at(mid + gap / 2, 0),
          at(mid + gap / 2, depth),
        );
      outline.push(at(c, depth), at(c, 0));
      const spans =
        i % 2
          ? [
              [a, mid - gap / 2],
              [mid + gap / 2, c],
            ]
          : [[a, c]];
      for (const [left, right] of spans)
        for (const d of [0, w / 2]) b.line('crease', 'body', at(left, d), at(right, d));
      return outline;
    }
    for (let i = 0; i < 4; i++) points.push(...flap(i, depth, -1));
    points.push([edges[4], depth + h]);
    for (let i = 3; i >= 0; i--) points.push(...flap(i, depth + h, 1).reverse());
    const inset = Math.min(p.glue / 3, h / 5);
    points.push([0, depth + h - inset], [0, depth + inset]);
    b.part(
      'body',
      'קופסה עם שפות חוזרות וכנפיים מפוצלות',
      points.filter(
        (point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1],
      ),
    );
    for (const x of edges.slice(0, 4)) b.line('crease', 'body', [x, depth], [x, depth + h]);
    return b.finish();
  },
  [
    'כנפיים בעומק W/2+v ושפות v בקצותיהן. כנפי דופן W מחולקות בשני חריצי מרכז פתוחים עד קיפול הגוף.',
  ],
  (p) => (p.v >= p.H ? [error('v', 'שפת ההחזרה חייבת להיות קטנה מגובה הגוף.')] : []),
);
const bottomBevel = f('bottomBevel', 'שיפוע קצה תחתית', 6, 'special', 0.1, 200, 0.1),
  tabWidth = f('tabWidth', 'רוחב מגרעת / חריץ יישור', 12, 'special', 2, 500),
  notchDepth = f('notchDepth', 'עומק מגרעת תחתית', 5, 'special', 0.1, 100, 0.1),
  lip = f('lip', 'שפת תחיבה', 12, 'special', 1, 200);
const automaticIssues = (p: Params) =>
  p.bottomBevel >= Math.min(p.L, p.W) / 4 ||
  p.tabWidth >= Math.min(p.L, p.W) / 2 ||
  p.glue >= p.W / 2 ||
  p.notchDepth >= p.W / 4
    ? [error('bottomBevel', 'מגרעות ושיפועי התחתית גדולים מדי ביחס לכנפיים.')]
    : [];
for (const [id, page, family, top] of [
  ['0700', 89, 'A', 'open'],
  ['0701', 89, 'B', 'half'],
  ['0702', 89, 'B', 'open'],
  ['0703', 90, 'B', 'full'],
  ['0704', 90, 'B', 'alternate'],
  ['0705', 90, 'B', 'tuck'],
  ['0706', 91, 'C', 'open'],
  ['0707', 91, 'C', 'full'],
  ['0708', 91, 'C', 'half'],
  ['0709', 92, 'C', 'alternate'],
  ['0710', 92, 'A', 'full'],
  ['0711', 92, 'A', 'half'],
  ['0712', 93, 'A', 'alternate'],
  ['0713', 93, 'A', 'tuck'],
] as const)
  add(
    id,
    page,
    [
      L,
      W,
      H,
      glue,
      bottomBevel,
      tabWidth,
      ...(family === 'A' ? [notchDepth] : []),
      ...(top === 'tuck' ? [lip] : []),
      t,
      clearance,
    ],
    (p) => automaticBase(p, family, top),
    [
      'תחתית מודבקת מראש עם קיפולים אלכסוניים; יש להדביק את לוחות החיבור לפני פתיחת הקופסה.',
      family === 'A'
        ? 'שתי כנפי אורך עם מגרעת וקפל אלכסוני; כנפי רוחב עם קצה אלכסוני.'
        : family === 'B'
          ? 'כנף אורך אחת מלאה W ואחת W/2; קיפולי חיבור אלכסוניים גם בכנפי הרוחב.'
          : 'כנפי אורך W/2 עם שני קיפולי חיבור שונים; חריצי יישור בכנפי הרוחב.',
      `סגירה עליונה: ${top === 'open' ? 'פתוחה' : top === 'full' ? 'כנפיים מלאות W' : top === 'half' ? 'כנפיים W/2' : top === 'alternate' ? 'W/2 בכנפי האורך ו־L/2 בכנפי הרוחב' : 'מכסה תחיבה עם שפה נפרדת'}.`,
    ],
    automaticIssues,
  );
add(
  '0714',
  93,
  [L, W, H, glue, bottomBevel, tabWidth, notchDepth, t, clearance, fit, spacing],
  (p) => {
    const lower = automaticBase(p, 'A', 'open', 'body'),
      upper = automaticBase(
        { ...p, L: p.L + 2 * p.t + p.fit, W: p.W + 2 * p.t + p.fit, H: p.H + 2 * p.t + p.fit },
        'A',
        'open',
        'lid',
      );
    return pack(
      [lower, transformGeometry(upper, ([x, y]) => [x, upper.boundsMm.height - y])],
      p.spacing,
    );
  },
  [
    'שתי קופסאות עם תחתית אוטומטית: אחת היא הגוף ואחת מורכבת כמכסה הפוך. מידות המכסה כוללות שני עוביי דופן ומרווח קינון.',
  ],
  automaticIssues,
);
add(
  '0719',
  95,
  [L, W, H, glue, bottomBevel, tabWidth, lip, t, clearance],
  (p) => automaticBase(p, 'C', 'tuck'),
  ['תחתית אוטומטית ממשפחת 0706–0709, עם מכסה תחיבה. קיפולי החיבור האלכסוניים והחריצים נשמרים.'],
  automaticIssues,
);
add(
  '0718',
  95,
  [L, W, H, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      g = tray(l, w, h, p.t + p.clearance),
      oldHeight = g.boundsMm.height;
    const extended = transformGeometry(g, ([x, y]) => [
        x,
        y === 0 ? 0 : y === oldHeight ? oldHeight + 2 * h : y + h,
      ]),
      b = new GeometryBuilder();
    b.paths = extended.paths;
    b.parts = extended.parts;
    for (const y of [h, w + 3 * h]) b.line('crease', 'body', [0, y], [l + 2 * h, y]);
    for (const [a, c] of [
      [
        [h, 2 * h],
        [0, 3 * h],
      ],
      [
        [h + l, 2 * h],
        [l + 2 * h, 3 * h],
      ],
      [
        [h, 2 * h + w],
        [0, h + w],
      ],
      [
        [h + l, 2 * h + w],
        [l + 2 * h, h + w],
      ],
    ] as const)
      b.line('crease', 'body', a, c);
    return b.finish();
  },
  [
    'מגש מודבק עם דפנות קצה כפולות וקיפולי פינה אלכסוניים בדפנות הצד. חריצי הפינה וההחזרות הם חלק מהפריסה.',
  ],
  (p) =>
    p.H > p.W / 2 ? [error('H', 'הגובה חייב להיות עד חצי W כדי שקיפולי הפינה יישארו נפרדים.')] : [],
);
for (const [id, page, base] of [
  ['0747', 99, '0413'],
  ['0748', 99, '0413'],
  ['0761', 101, '0410'],
] as const)
  add(
    id,
    page,
    [...nextGenerators[base].fields],
    (p) => {
      const g = nextGenerators[base].generate(p),
        b = new GeometryBuilder(),
        h = p.H + p.t,
        w = p.W + p.t,
        l = p.L + p.t,
        top = h + p.v * (base === '0413' ? 1 : 0);
      b.paths = g.paths;
      b.parts = g.parts;
      for (const sign of [-1, 1]) {
        const y = sign === -1 ? top : top + l;
        if (id === '0747') {
          b.line('crease', 'body', [h, y], [0, y - sign * h]);
          b.line('crease', 'body', [h + w, y], [w, y + sign * h]);
        } else if (id === '0748') {
          const apex: import('./types').Point = [h + w / 2, y + sign * h];
          b.line('crease', 'body', [h, y], apex);
          b.line('crease', 'body', [h + w, y], apex);
        } else {
          b.line('crease', 'body', [h, y], [2 * h, y + sign * h]);
          b.line('crease', 'body', [h + w, y], [w, y + sign * h]);
          const end = 2 * h + 2 * w;
          b.line('crease', 'body', [end, y], [end - p.v, y + sign * p.v]);
        }
      }
      return b.finish();
    },
    [
      'עטיפה עם פינות מודבקות וקיפולים אלכסוניים לפתיחה מהירה. יש להדביק את הפינות לפני הרכבה; כיוון האלכסונים ייחודי לקוד.',
    ],
    (p) => [
      ...(nextGenerators[base].validate?.(p) ?? []),
      ...(p.H > p.W / 2 ? [error('H', 'קיפולי הפינה דורשים H עד חצי W.')] : []),
    ],
  );
function rolledTray(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    base = tray(l, w, h, p.t + p.clearance),
    xOld = base.boundsMm.width,
    yOld = base.boundsMm.height;
  const both = code === '0456';
  const widened = transformGeometry(base, ([x, y]) => [
      x === 0 ? 0 : x === xOld ? xOld + 2 * (h + p.t) : x + h + p.t,
      both ? (y === 0 ? 0 : y === yOld ? yOld + 2 * (h + p.t) : y + h + p.t) : y,
    ]),
    b = new GeometryBuilder();
  b.paths = widened.paths;
  b.parts = widened.parts;
  const outer = widened.boundsMm.width,
    top = both ? 2 * h + p.t : h;
  for (const x of [h, h + p.t, outer - h - p.t, outer - h])
    b.line(
      'crease',
      'body',
      [x, top + p.t / 2 + p.clearance / 2],
      [x, top + w - p.t / 2 - p.clearance / 2],
    );
  if (both) {
    const bottom = widened.boundsMm.height;
    for (const y of [h, h + p.t, bottom - h - p.t, bottom - h])
      b.line('crease', 'body', [2 * h + p.t, y], [2 * h + p.t + l, y]);
  }
  return b.finish();
}
for (const [id, page] of [
  ['0454', 64],
  ['0455', 64],
  ['0456', 65],
] as const)
  add(
    id,
    page,
    [L, W, id === '0454' ? H : { ...H, default: 20 }, t, clearance],
    (p) =>
      id === '0455'
        ? transformGeometry(rolledTray({ ...p, L: p.W, W: p.L }, '0454'), ([x, y]) => [y, x])
        : rolledTray(p, id),
    [
      'מגש עם דפנות חוזרות כפולות וקיפולי החזרה מפוצלים בעובי חומר. חריצי הפינה והאוזניים נשמרים; יש להדביק את הפינות.',
    ],
    (p) =>
      4 * (p.H + p.t) > (id === '0454' ? p.L : id === '0455' ? p.W : Math.min(p.L, p.W)) + p.t
        ? [error('H', 'אוזני הפינה הכפולות דורשות לפחות ארבעה גבהים במידת החיבור.')]
        : [],
  );
add('0458', 65, [L, W, H, t], (p) => crossBlank(p.L + p.t, p.W + p.t, [p.H + p.t], [p.H + p.t]), [
  'מגש צולב ללא אוזני פינה; יש לחבר את ארבע הפינות בסרט / תפירה לפי שיטת הייצור.',
]);
