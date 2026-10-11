import type { GeneratorDefinition, ParameterField, Params, Point, ValidationIssue } from './types';
import { GeometryBuilder, rectangle } from './primitives';
import { profiledShell, type FlapProfile, ellipse, euroSlot } from './families/profiled-shell';
import { pack, strip } from './families/panels';
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
  H = f('H', 'גובה', 80);
const t = f('t', 'עובי חומר', 1, 'material', 0.1, 5, 0.1),
  clearance = f('clearance', 'מרווח חריץ', 0.3, 'material', 0.1, 2, 0.1),
  glue = f('glue', 'לשונית חיבור', 12, 'special', 4, 100),
  spacing = f('spacing', 'רווח חלקים', 10, 'material', 2, 100);
const lip = f('lip', 'שפת סגירה', 12, 'special', 2, 100),
  tabWidth = f('tabWidth', 'רוחב נעילה', 30, 'special', 4, 200),
  lockDepth = f('lockDepth', 'עומק נעילה', 8, 'special', 2, 100),
  v = f('v', 'גובה כותרת', 30, 'special', 4, 200);
const handleWidth = f('handleWidth', 'רוחב פתח', 32, 'special', 4, 200),
  handleHeight = f('handleHeight', 'גובה פתח', 8, 'special', 2, 50);
export const continuationGenerators: Record<string, GeneratorDefinition> = {};
export const continuationSources: Record<string, number> = {};
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
  continuationGenerators[id] = {
    id,
    fields,
    generate,
    validate,
    notes: ['בטא: יש לבצע חיתוך ניסיון ובדיקת הרכבה בחומר שנבחר.', ...notes],
  };
  continuationSources[id] = page;
}
function shellIssues(p: Params) {
  return [
    ...(p.handleWidth && p.handleWidth < 4 * p.handleHeight
      ? [error('handleWidth', 'הפתח חייב להיות רחב מראשו המעוגל.')]
      : []),
    ...(p.lip >= p.W / 4 ? [error('lip', 'שפת הסגירה חייבת להיות קטנה מרבע W.')] : []),
    ...(p.tabWidth && p.tabWidth >= Math.min(p.L, p.W) / 2
      ? [error('tabWidth', 'רוחב הנעילה חייב להיות קטן מחצי הלוח הצר.')]
      : []),
    ...(p.lockDepth && p.lockDepth >= p.W / 4
      ? [error('lockDepth', 'עומק הנעילה חייב להיות קטן מרבע W.')]
      : []),
    ...(p.handleWidth && p.handleWidth >= Math.min(p.L, p.W) - 2 * (p.lip ?? 0)
      ? [error('handleWidth', 'פתח הידית רחב מדי ללוח.')]
      : []),
    ...(p.handleHeight && p.handleHeight >= Math.min(p.v ?? p.lip, p.lip) / 2
      ? [error('handleHeight', 'גובה הפתח חייב להיות קטן מחצי שפת הכותרת.')]
      : []),
    ...(p.headerDepth && p.handleWidth >= p.tabWidth - 2 * p.clearance
      ? [error('handleWidth', 'פתח התווית רחב מגשר החיבור.')]
      : []),
    ...(p.slotLength && p.slotLength >= Math.min(p.L / 4, p.W / 3)
      ? [error('slotLength', 'חריצי הנעילה ארוכים מדי.')]
      : []),
  ];
}
for (const [id, page] of [
  ['0207', 20],
  ['0217', 23],
  ['0218', 23],
  ['0219', 24],
  ['0222', 25],
  ['0225', 25],
  ['0227', 26],
  ['0232', 28],
  ['0240', 29],
  ['0241', 29],
  ['0242', 29],
] as const) {
  const locks = ['0207', '0227', '0217', '0219', '0222', '0240', '0241', '0242'].includes(id),
    handles = ['0217', '0219', '0222', '0240', '0241', '0242'].includes(id),
    slots = ['0218', '0232'].includes(id);
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
      ...(id === '0225' ? [] : [lip]),
      ...(locks ? [tabWidth, lockDepth] : []),
      ...(handles
        ? [
            { ...handleWidth, default: id === '0242' ? 24 : 32 },
            { ...handleHeight, default: 4 },
          ]
        : []),
      ...(['0240', '0241', '0242'].includes(id) ? [v] : []),
      ...(id === '0242' ? [f('headerDepth', 'עומק לוח תווית', 20, 'special', 4, 100)] : []),
      ...(slots ? [f('slotLength', 'אורך חריץ אלכסוני', 16, 'special', 2, 100)] : []),
    ],
    (p) => {
      const w = p.W + p.t,
        half = w / 2;
      const plain = (depth: number): FlapProfile => ({ depth }),
        tuck = (depth: number): FlapProfile => ({ depth, kind: 'tuck', fold: depth - p.lip });
      const bottomLocks: FlapProfile[] = [
        { depth: half, kind: 'notch' },
        { depth: half, kind: 'snap-left' },
        { depth: half, kind: 'snap-tongue' },
        { depth: half, kind: 'snap-right' },
      ];
      let top: FlapProfile[] = [plain(half), plain(half), plain(half), plain(half)],
        bottom: FlapProfile[] = top.map((x) => ({ ...x }));
      if (id === '0207')
        bottom = [
          { depth: w, kind: 'notch', fold: half },
          { depth: w, centreSlot: true },
          { depth: w, kind: 'notch', fold: half },
          { depth: w, centreSlot: true },
        ];
      if (id === '0217') {
        top = [
          { depth: half + p.lip, kind: 'handle', fold: half, handle: true },
          { depth: half, kind: 'gable', centreSlot: true },
          { depth: half + p.lip, kind: 'handle', fold: half, handle: true },
          { depth: half, kind: 'gable', centreSlot: true },
        ];
        bottom = bottomLocks;
      }
      if (id === '0218') {
        top = [{ depth: w, diagonalSlots: true }, plain(w), { depth: w, kind: 'wing' }, plain(w)];
      }
      if (id === '0219') {
        top = [
          { depth: w + p.lip, kind: 'handle', fold: w, handle: true },
          plain(half),
          tuck(w + p.lip),
          plain(half),
        ];
        bottom = bottomLocks;
      }
      if (id === '0222') {
        top = [
          { depth: half + p.lip, fold: half, centreSlot: true },
          { depth: half + p.lip, kind: 'handle', fold: half, handle: true },
          { depth: half + p.lip, fold: half, centreSlot: true },
          { depth: half + p.lip, kind: 'handle', fold: half, handle: true },
        ];
        bottom = [bottomLocks[1], bottomLocks[0], bottomLocks[3], bottomLocks[2]];
      }
      if (id === '0225') bottom = [plain(w), plain(w), plain(w), plain(w)];
      if (id === '0227') {
        top = [plain(w), plain(w - p.lip), { depth: w, kind: 'notch' }, plain(w - p.lip)];
        bottom = top.map((x) => ({ ...x }));
      }
      if (id === '0232')
        bottom = [
          { depth: half, diagonalSlots: true },
          tuck(half + p.lip),
          { depth: half, diagonalSlots: true },
          tuck(half + p.lip),
        ];
      if (id === '0240') {
        top = [
          { depth: half + 2 * p.v, kind: 'header', fold: half + p.v, handle: true },
          plain(half),
          tuck(w + p.lip),
          plain(half),
        ];
        bottom = bottomLocks;
      }
      if (id === '0241') {
        top = [
          plain(0),
          { depth: half + p.v, kind: 'header', fold: half, handle: true },
          { depth: w, fold: w - p.lip, centreSlot: true },
          { depth: half + p.v, kind: 'header', fold: half, handle: true },
        ];
        bottom = bottomLocks;
      }
      if (id === '0242') {
        top = [
          { depth: half + p.lip + 2 * p.v + p.headerDepth, kind: 'label' },
          plain(half),
          tuck(w + p.lip),
          plain(half),
        ];
        bottom = bottomLocks;
      }
      if (['0219', '0240', '0241'].includes(id))
        for (const flap of top) if (flap.handle) flap.handleShape = 'euro';
      const g = profiledShell(p, top, bottom, id === '0222', id === '0225');
      if (id === '0240') {
        const b = new GeometryBuilder(),
          x = p.glue + (p.L + p.t) / 2,
          y = Math.max(...top.map((s) => s.depth));
        b.path(
          'cut',
          'body',
          euroSlot(x, y - (half + p.v / 2), p.handleWidth, p.handleHeight),
          true,
        );
        g.paths.push(...b.paths);
      }
      // Retain the extra 0219 locking tongue and its receiving cuts in the cover.
      if (id === '0219') {
        const b = new GeometryBuilder(),
          y = Math.max(...top.map((s) => s.depth)),
          x = p.glue + (p.L + p.t) + (p.W + p.t) + (p.L + p.t) / 2,
          gap = p.t + p.clearance;
        b.path('cut', 'body', [
          [x - p.tabWidth / 2, y - p.lip],
          [x - p.tabWidth / 2, y + p.lip / 2],
          [x + p.tabWidth / 2, y + p.lip / 2],
          [x + p.tabWidth / 2, y - p.lip],
        ]);
        for (const dx of [-p.tabWidth, p.tabWidth])
          b.path('cut', 'body', ellipse(x + dx, y - w / 2, gap * 2, gap * 2), true);
        g.paths.push(...b.paths);
      }
      return g;
    },
    [
      'מעטפת בת ארבעה לוחות; פרופילי הסגירה, הידיות והחריצים נבנו לפי ציור המקור.',
      'כל מידות הנעילה והחיבור דורשות בדיקת הרכבה; אין אישור חוזק נשיאה.',
    ],
    shellIssues,
  );
}
// Display cards retain their own tabs, slots and crease counts.
const tabDepth = f('tabDepth', 'בליטת לשונית', 10, 'special', 2, 100),
  slotDepth = f('slotDepth', 'עומק חריץ', 10, 'special', 2, 100),
  radius = f('radius', 'רדיוס פינה', 10, 'special', 1, 100);
function arc(cx: number, cy: number, r: number, start: number, end: number): Point[] {
  const n = Math.max(8, Math.ceil(Math.abs(end - start) / Math.acos(1 - 0.01 / r)));
  return Array.from(
    { length: n + 1 },
    (_, i) =>
      [
        cx + r * Math.cos(start + ((end - start) * i) / n),
        cy + r * Math.sin(start + ((end - start) * i) / n),
      ] as Point,
  );
}
for (const [id, page] of [
  ['0880', 120],
  ['0881', 120],
  ['0882', 121],
] as const) {
  add(
    id,
    page,
    [
      L,
      H,
      ...(id === '0882' ? [W] : []),
      ...(id === '0881' ? [slotDepth, radius] : [tabWidth, tabDepth]),
      t,
      clearance,
    ],
    (p) => {
      const b = new GeometryBuilder(),
        gap = p.t + p.clearance,
        tw = p.tabWidth - 2 * p.clearance;
      if (id === '0880') {
        const h = p.H + p.t,
          outline: Point[] = [[0, p.tabDepth]];
        for (const x of [p.L / 3, (2 * p.L) / 3])
          outline.push(
            [x - tw / 2, p.tabDepth],
            [x - tw / 2, 0],
            [x + tw / 2, 0],
            [x + tw / 2, p.tabDepth],
          );
        outline.push([p.L, p.tabDepth], [p.L, 2 * h + p.tabDepth]);
        for (const x of [(2 * p.L) / 3, p.L / 3])
          outline.push(
            [x + tw / 2, 2 * h + p.tabDepth],
            [x + tw / 2, 2 * h + 2 * p.tabDepth],
            [x - tw / 2, 2 * h + 2 * p.tabDepth],
            [x - tw / 2, 2 * h + p.tabDepth],
          );
        outline.push([0, 2 * h + p.tabDepth]);
        b.part('body', 'כותרת דו שכבתית', outline);
        b.line('crease', 'body', [0, h + p.tabDepth], [p.L, h + p.tabDepth]);
      } else if (id === '0881') {
        const outline: Point[] = [
          ...arc(p.radius, p.radius, p.radius, Math.PI, 1.5 * Math.PI),
          ...arc(p.L - p.radius, p.radius, p.radius, 1.5 * Math.PI, 2 * Math.PI),
          [p.L, p.H - p.radius],
          [p.L - p.radius, p.H],
        ];
        for (const x of [(2 * p.L) / 3, p.L / 3])
          outline.push(
            [x + gap / 2, p.H],
            [x + gap / 2, p.H - p.slotDepth],
            [x - gap / 2, p.H - p.slotDepth],
            [x - gap / 2, p.H],
          );
        outline.push([p.radius, p.H], [0, p.H - p.radius]);
        b.part('body', 'כותרת עם שני חריצי חיבור', outline);
      } else {
        const w = p.W + p.t,
          height = p.H + p.t,
          total = p.L + 2 * w,
          outline: Point[] = [
            [w / 5, 0],
            [total - w / 5, 0],
            [total, height],
            [total - w / 5, height],
          ];
        for (const x of [w + p.L + w / 2, w + (5 * p.L) / 6, w + p.L / 2, w + p.L / 6, w / 2])
          outline.push(
            [x + tw / 2, height],
            [x + tw / 2, height + p.tabDepth],
            [x - tw / 2, height + p.tabDepth],
            [x - tw / 2, height],
          );
        outline.push([0, height]);
        b.part('body', 'מעטפת כותרת עם כנפיים', outline);
        for (const x of [w, w + p.L]) b.line('crease', 'body', [x, 0], [x, height]);
      }
      return b.finish();
    },
    ['כותרת / מעטפת לתצוגה בלבד; L/H הן מידות הלוח, ללא קופסה מומצאת.'],
    (p) => [
      ...(p.tabWidth && p.tabWidth >= Math.min(p.L / 6, p.W ?? Infinity)
        ? [error('tabWidth', 'הלשוניות רחבות מדי ביחס למרווח ביניהן.')]
        : []),
      ...(p.radius && p.radius >= Math.min(p.L, p.H) / 4
        ? [error('radius', 'רדיוס הפינה גדול מדי ללוח.')]
        : []),
      ...(p.slotDepth && p.slotDepth >= p.H / 2
        ? [error('slotDepth', 'חריצי החיבור עמוקים מדי.')]
        : []),
      ...(p.tabWidth && p.tabWidth <= 2 * p.clearance
        ? [error('clearance', 'המרווח מבטל את רוחב הלשונית.')]
        : []),
    ],
  );
}
// 0960: three separately folded treads and three staircase support cheeks.
add(
  '0960',
  140,
  [L, W, { ...H, default: 60 }, { ...v, default: 20 }, t, clearance, spacing],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance;
    const caps = Array.from({ length: 3 }, (_, i) => {
      const b = new GeometryBuilder(),
        total = 2 * p.v + w + (i + 1) * h,
        points: Point[] = [[0, 0]];
      for (const x of [l / 4, l / 2, (3 * l) / 4])
        points.push(
          [x - gap / 2, 0],
          [x - gap / 2, p.v / 2],
          [x + gap / 2, p.v / 2],
          [x + gap / 2, 0],
        );
      points.push([l, 0], [l, total]);
      for (const x of [(3 * l) / 4, l / 2, l / 4])
        points.push(
          [x + gap / 2, total],
          [x + gap / 2, total - p.v / 2],
          [x - gap / 2, total - p.v / 2],
          [x - gap / 2, total],
        );
      points.push([0, total]);
      const id = `tread-${i + 1}`;
      b.part(id, 'לוח מדרגה עם שפות נעילה', points);
      for (const y of [p.v, p.v + w, total - p.v]) b.line('crease', id, [0, y], [l, y]);
      return b.finish();
    });
    const cheeks = Array.from({ length: 3 }, (_, i) => {
      const b = new GeometryBuilder(),
        id = `support-${i + 1}`,
        d = p.v / 2;
      const points: Point[] = [
        [0, 3 * h],
        [0, d],
        [gap, d],
        [gap, 0],
        [w, 0],
        [w, h],
        [2 * w, h],
        [2 * w, 2 * h],
        [3 * w, 2 * h],
        [3 * w, 3 * h],
      ];
      b.part(id, 'תמיכת מדרגות', points);
      for (const [x, y] of [
        [w, 0],
        [2 * w, h],
        [3 * w, 2 * h],
      ])
        b.path('cut', id, [
          [x, y + d],
          [x - d, y + d],
          [x - d, y + d + gap],
          [x, y + d + gap],
        ]);
      return b.finish();
    });
    return pack([...caps, ...cheeks], p.spacing);
  },
  [
    'שלושה לוחות מדרגה ושלוש תמיכות מדורגות נפרדות, לפי ציור המקור.',
    'אין דירוג עומס; חריצי התמיכה דורשים ניסוי התאמה בחומר.',
  ],
  (p) =>
    p.v >= Math.min(p.W, p.H) / 2
      ? [error('v', 'שפת המדרגה חייבת להיות קטנה מחצי גובה / רוחב המדרגה.')]
      : [],
);
add(
  '0850',
  115,
  [
    { ...L, label: 'אורך צלע', default: 120 },
    { ...H, default: 240 },
    { ...v, label: 'עומק כנף', default: 15 },
    glue,
    t,
    clearance,
  ],
  (p) => {
    const s = p.L + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      alt = (s * Math.sqrt(3)) / 2,
      b = new GeometryBuilder(),
      x0 = p.glue,
      y0 = alt;
    const points: Point[] = [
      [0, y0 + Math.min(p.glue, h / 5)],
      [x0, y0],
    ];
    for (let i = 0; i < 3; i++) {
      const a = x0 + i * s + (i ? gap / 2 : 0),
        c = x0 + (i + 1) * s - (i < 2 ? gap / 2 : 0);
      points.push([a, y0]);
      if (i === 1) points.push([(a + c) / 2, 0]);
      else points.push([a + p.v / 2, y0 - p.v], [c - p.v / 2, y0 - p.v]);
      points.push([c, y0]);
      b.line('crease', 'body', [a, y0], [c, y0]);
    }
    points.push([x0 + 3 * s, y0 + h]);
    for (let i = 2; i >= 0; i--) {
      const a = x0 + i * s + (i ? gap / 2 : 0),
        c = x0 + (i + 1) * s - (i < 2 ? gap / 2 : 0);
      points.push(
        [c, y0 + h],
        [c - p.v / 2, y0 + h + p.v],
        [a + p.v / 2, y0 + h + p.v],
        [a, y0 + h],
      );
      b.line('crease', 'body', [a, y0 + h], [c, y0 + h]);
    }
    points.push([0, y0 + h - Math.min(p.glue, h / 5)]);
    b.part(
      'body',
      'מנסרה משולשת עם כנפי קצה',
      points.filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]),
    );
    for (const x of [x0, x0 + s, x0 + 2 * s]) b.line('crease', 'body', [x, y0], [x, y0 + h]);
    return b.finish();
  },
  [
    'וריאנט משולש של קוד 0850; המקור מאפשר צורות מרובות צלעות, שאינן נטענות כמיושמות כאן.',
    'שלושה לוחות צד, מכסה משולש מחובר וכנפי קצה משופעות.',
  ],
  (p) => (p.v >= p.L / 4 ? [error('v', 'הכנף חייבת להיות קטנה מרבע אורך הצלע.')] : []),
);
add(
  '0851',
  115,
  [L, { ...H, default: 240 }, { ...v, default: 30 }, glue, t, spacing],
  (p) => {
    const l = p.L + p.t,
      h = p.H + p.t,
      b = new GeometryBuilder();
    b.part('body', 'גוף עם קיפולים משולשים', rectangle(0, 0, 2 * l + p.glue, h + 2 * p.glue));
    for (const y of [p.glue, h + p.glue]) b.line('crease', 'body', [0, y], [2 * l, y]);
    for (const x of [l, 2 * l]) b.line('crease', 'body', [x, p.glue], [x, h + p.glue]);
    for (const x of [0, l]) {
      b.line('crease', 'body', [x, p.glue], [x + l / 2, h + p.glue]);
      b.line('crease', 'body', [x + l, p.glue], [x + l / 2, h + p.glue]);
    }
    return pack(
      [b.finish(), strip([l / 2, l / 2, l / 2, l / 2], p.v + p.t, 'base', p.glue)],
      p.spacing,
    );
  },
  ['שני לוחות רחבים עם קיפולי V ושפה עליונה / תחתונה, ובסיס נפרד בן ארבעה לוחות.'],
  (p) => (p.v >= p.H / 2 ? [error('v', 'גובה הבסיס חייב להיות קטן מחצי H.')] : []),
);
add(
  '0852',
  115,
  [{ ...L, default: 120 }, { ...W, default: 80 }, { ...H, default: 240 }, glue, t],
  (p) => {
    const h = p.H + p.t,
      w = p.W + p.t,
      l = p.L + p.t,
      face = Math.hypot(h, w),
      apex = (h * h) / face,
      depth = (h * w) / face,
      g = p.glue,
      b = new GeometryBuilder(),
      end = face + w + h + g;
    const pts: Point[] = [
      [0, depth],
      [apex - g / 3, g],
      [apex, g / 2],
      [apex + g / 3, g],
      [face, depth],
      [end, depth],
      [end, depth + l],
      [face, depth + l],
      [apex + g / 3, 2 * depth + l - g],
      [apex, 2 * depth + l - g / 2],
      [apex - g / 3, 2 * depth + l - g],
      [0, depth + l],
    ];
    b.part('body', 'מעמד משולש עם כנפי קצה', pts);
    for (const x of [face, face + w, face + w + h])
      b.line('crease', 'body', [x, depth], [x, depth + l]);
    for (const y of [depth, depth + l]) b.line('crease', 'body', [0, y], [face, y]);
    b.line('crease', 'body', [0, depth], [apex, g]);
    b.line('crease', 'body', [apex, g], [face, depth]);
    b.line('crease', 'body', [0, depth + l], [apex, 2 * depth + l - g]);
    b.line('crease', 'body', [apex, 2 * depth + l - g], [face, depth + l]);
    return pack([b.finish()], 0);
  },
  ['מעמד משולש: חזית מפותחת באורך √(H²+W²), בסיס W וגב H; שתי כנפי קצה משולשות.'],
  (p) =>
    p.glue >= Math.min(p.L, p.W) / 4 ? [error('glue', 'שפת החיבור גדולה מדי לכנפי הקצה.')] : [],
);
const shelfCount = f('shelfCount', 'מספר מדפים', 3, 'special', 1, 8, 1, 'מדפים');
for (const [id, page] of [
  ['0830', 110],
  ['0831', 110],
  ['0833', 111],
] as const) {
  add(
    id,
    page,
    [
      L,
      W,
      { ...H, default: 600 },
      { ...v, label: 'רוחב החזרת דופן', default: 40 },
      shelfCount,
      { ...tabWidth, default: 20 },
      t,
      clearance,
      spacing,
    ],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t,
        gap = p.t + p.clearance,
        total = l + 2 * w + 2 * p.v + 2 * p.t,
        b = new GeometryBuilder();
      const left = p.v + p.t + w,
        right = left + l;
      b.part('body', 'גב ודפנות תצוגה מוחזרות', rectangle(0, 0, total, h));
      for (const x of [p.v, p.v + p.t, left, right, right + w, right + w + p.t])
        b.line('crease', 'body', [x, 0], [x, h]);
      for (let k = 1; k <= p.shelfCount; k++) {
        const y = (k * h) / (p.shelfCount + 1);
        for (const x of [p.v / 2, total - p.v / 2])
          b.path('cut', 'body', rectangle(x - p.tabWidth / 2, y - gap / 2, p.tabWidth, gap), true);
        for (const x of [left, right])
          b.path('cut', 'body', rectangle(x - gap / 2, y - p.v / 4, gap, p.v / 2), true);
        if (id !== '0831')
          b.path('cut', 'body', [
            [left + l / 2 - p.tabWidth / 2, y + gap],
            [left + l / 2 - p.tabWidth / 2, y],
            [left + l / 2 + p.tabWidth / 2, y],
            [left + l / 2 + p.tabWidth / 2, y + gap],
          ]);
      }
      const pieces = [b.finish()];
      if (id === '0831') {
        const d = new GeometryBuilder();
        d.part('divider', 'מחיצה מרכזית כפולה', rectangle(0, 0, 2 * w + p.t, h));
        for (const x of [w, w + p.t]) d.line('crease', 'divider', [x, 0], [x, h]);
        for (let k = 1; k <= p.shelfCount; k++)
          d.path(
            'cut',
            'divider',
            rectangle(w / 2, (k * h) / (p.shelfCount + 1) - gap / 2, w + p.t, gap),
            true,
          );
        pieces.push(d.finish());
      }
      for (let k = 0; k < p.shelfCount; k++) {
        const s = new GeometryBuilder(),
          name = `shelf-${k + 1}`,
          returnDepth = id === '0833' ? w : p.v,
          fold = w + p.t,
          totalDepth = fold + returnDepth + p.v / 2;
        const pts: Point[] = [[p.v, 0]];
        if (id === '0831')
          pts.push(
            [p.v + l / 2 - gap / 2, 0],
            [p.v + l / 2 - gap / 2, w / 2],
            [p.v + l / 2 + gap / 2, w / 2],
            [p.v + l / 2 + gap / 2, 0],
          );
        if (id !== '0831')
          pts.push(
            [p.v + l / 2 - p.tabWidth / 2, 0],
            [p.v + l / 2 - p.tabWidth / 2, -p.v / 4],
            [p.v + l / 2 + p.tabWidth / 2, -p.v / 4],
            [p.v + l / 2 + p.tabWidth / 2, 0],
          );
        pts.push(
          [p.v + l, 0],
          [p.v + l, fold],
          [l + 2 * p.v, fold],
          [l + 2 * p.v, fold + returnDepth],
          [p.v + l, fold + returnDepth],
          [p.v + l, totalDepth],
          [p.v, totalDepth],
          [p.v, fold + returnDepth],
          [0, fold + returnDepth],
          [0, fold],
          [p.v, fold],
        );
        s.part(name, 'מדף עם שפה ואוזני חיבור', pts);
        for (const y of [w, fold, fold + returnDepth])
          s.line('crease', name, [p.v, y], [p.v + l, y]);
        if (id === '0833')
          s.line(
            'crease',
            name,
            [p.v, fold + returnDepth + p.t],
            [p.v + l, fold + returnDepth + p.t],
          );
        for (const x of [p.v, p.v + l]) s.line('crease', name, [x, fold], [x, fold + returnDepth]);

        pieces.push(s.finish());
      }
      return pack(pieces, p.spacing);
    },
    [
      'גב אחד עם דפנות מוחזרות ומדפים נפרדים; מספר המדפים, שפות הנעילה ומרווחי החיבור ניתנים לעריכה.',
      ...(id === '0831' ? ['מחיצה מרכזית כפולה עם חריצי מדפים; לכל מדף חריץ מרכזי תואם.'] : []),
      ...(id === '0833'
        ? ['למדף החזרה מלאה בעומק W וקיפול עובי נוסף, בשונה מהשפה הקצרה של 0830.']
        : []),
      'שפות ולשוניות הן מידות הנדסיות בטא; יש לבדוק התאמה ועומס בהרכבה.',
    ],
    (p) => [
      ...(!Number.isInteger(p.shelfCount)
        ? [error('shelfCount', 'מספר המדפים חייב להיות שלם.')]
        : []),
      ...(p.tabWidth >= p.v - 2 * (p.t + p.clearance)
        ? [error('tabWidth', 'החריץ רחב מדי לדופן המוחזרת.')]
        : []),
      ...(p.v >= Math.min(p.L, p.W) / 2
        ? [error('v', 'החזרת הדופן חייבת להיות קטנה מחצי מידת המדף.')]
        : []),
      ...(p.H / (p.shelfCount + 1) <= p.v + 2 * p.t
        ? [error('shelfCount', 'המדפים צפופים מדי לשפות החיבור.')]
        : []),
    ],
  );
}
const N = f('N', 'מספר צלעות', 8, 'special', 3, 12, 1, 'צלעות'),
  fit = f('fit', 'מרווח התאמה כולל', 1, 'material', 0.1, 5, 0.1);
add(
  '0859',
  117,
  [
    { ...L, label: 'אורך צלע', default: 60 },
    { ...H, default: 240 },
    { ...v, label: 'שפת קצה', default: 15 },
    N,
    glue,
    t,
    clearance,
    fit,
    spacing,
  ],
  (p) => {
    const side = p.L + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder(),
      outline: Point[] = [
        [0, p.v + p.glue / 3],
        [p.glue, p.v],
      ];
    for (let i = 0; i < p.N; i++) {
      const a = p.glue + i * side + (i ? gap / 2 : 0),
        c = p.glue + (i + 1) * side - (i < p.N - 1 ? gap / 2 : 0);
      outline.push([a, p.v], [a + p.v / 4, 0], [c - p.v / 4, 0], [c, p.v]);
      b.line('crease', 'body', [a, p.v], [c, p.v]);
    }
    outline.push([p.glue + p.N * side, p.v + h]);
    for (let i = p.N - 1; i >= 0; i--) {
      const a = p.glue + i * side + (i ? gap / 2 : 0),
        c = p.glue + (i + 1) * side - (i < p.N - 1 ? gap / 2 : 0);
      outline.push(
        [c, p.v + h],
        [c - p.v / 4, 2 * p.v + h],
        [a + p.v / 4, 2 * p.v + h],
        [a, p.v + h],
      );
      b.line('crease', 'body', [a, p.v + h], [c, p.v + h]);
    }
    outline.push([0, p.v + h - p.glue / 3]);
    b.part(
      'body',
      'שרוול רב צלעות עם שפות קצה',
      outline.filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]),
    );
    for (let i = 0; i < p.N; i++)
      b.line('crease', 'body', [p.glue + i * side, p.v], [p.glue + i * side, p.v + h]);
    const r = side / (2 * Math.sin(Math.PI / p.N)) - p.t - p.fit / 2,
      pad = new GeometryBuilder();
    pad.part(
      'base',
      'תחתית רב צלעות',
      Array.from(
        { length: p.N },
        (_, i) =>
          [
            r + r * Math.cos((2 * i * Math.PI) / p.N),
            r + r * Math.sin((2 * i * Math.PI) / p.N),
          ] as Point,
      ),
    );
    return pack([b.finish(), pad.finish()], p.spacing);
  },
  [
    'וריאנט רב צלעות רגולרי של קוד 0859: שרוול עם כנפי קצה ותחתית נפרדת.',
    'N משנה את מספר לוחות הדופן ואת צורת התחתית, ולא רק את שם הדגם.',
  ],
  (p) => [
    ...(!Number.isInteger(p.N) ? [error('N', 'מספר הצלעות חייב להיות שלם.')] : []),
    ...(p.v >= p.L / 2 ? [error('v', 'שפת הקצה חייבת להיות קטנה מחצי אורך הצלע.')] : []),
    ...(p.L / (2 * Math.sin(Math.PI / p.N)) <= p.t + p.fit / 2
      ? [error('fit', 'אין מקום לתחתית בתוך השרוול.')]
      : []),
  ],
);
