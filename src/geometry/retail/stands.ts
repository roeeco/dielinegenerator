import { GeometryBuilder } from '../primitives';
import { pack, crossBlank } from '../families/panels';
import type { Params, Point } from '../types';
import {
  add,
  L,
  W,
  H,
  v,
  t,
  clearance,
  glue,
  spacing,
  lip,
  tab,
  f,
  error,
  clean,
  finish,
  slot,
  receiver,
  countIssues,
  panelShell,
  plain,
  clipped,
} from './common';
add(
  '0860',
  117,
  [
    { ...L, label: 'רוחב לוח מצולע', default: 80 },
    H,
    { ...v, label: 'עומק חצי בסיס', default: 100 },
    glue,
    lip,
    f('holeDiameter', 'קוטר פתח בסיס', 6, 'special', 2, 40),
    t,
    clearance,
    spacing,
  ],
  (p) => {
    const s = p.L + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance;
    const body = panelShell(
      Array(6).fill(s),
      h,
      p.glue,
      (_, len) => plain(len, p.lip),
      (_, len) => plain(len, 0),
      gap,
      (b, e) => {
        for (let i = 0; i < 6; i++) b.line('crease', 'body', [e[i], 0], [e[i + 1], 0]);
      },
    );
    const b = new GeometryBuilder(),
      d = p.v,
      ear = p.lip;
    b.part('base', 'בסיס כפול עם אוזניים אלכסוניות', [
      [0, 0],
      [s / 4, -d / 2],
      [s / 4, -d / 2 - ear],
      [(3 * s) / 4, -d / 2 - ear],
      [(3 * s) / 4, -d / 2],
      [s, 0],
      [(5 * s) / 4, -d / 2],
      [(5 * s) / 4, -d / 2 - ear],
      [(7 * s) / 4, -d / 2 - ear],
      [(7 * s) / 4, -d / 2],
      [2 * s, 0],
      [2 * s, d],
      [(7 * s) / 4, 1.5 * d],
      [(7 * s) / 4, 1.5 * d + ear],
      [(5 * s) / 4, 1.5 * d + ear],
      [(5 * s) / 4, 1.5 * d],
      [s, d],
      [(3 * s) / 4, 1.5 * d],
      [(3 * s) / 4, 1.5 * d + ear],
      [s / 4, 1.5 * d + ear],
      [s / 4, 1.5 * d],
      [0, d],
    ]);
    b.line('crease', 'base', [s, 0], [s, d]);
    for (const x of [0, s]) {
      for (const y of [0, d]) b.line('crease', 'base', [x, y], [x + s, y]);
      for (const y of [-d / 2, 1.5 * d])
        b.line('crease', 'base', [x + s / 4, y], [x + (3 * s) / 4, y]);
      slot(b, 'base', x + s / 2, 0, p.holeDiameter, p.holeDiameter);
    }
    return pack([body, b.finish()], p.spacing);
  },
  [
    'שרוול בן שש דפנות עם שפת החזרה ובסיס נפרד בעל שני לוחות, אוזניים אלכסוניות ופתחי בסיס. L ו־v הן מידות לוחות הבסיס, לא קוטר חיצוני.',
  ],
  (p) =>
    p.lip >= Math.min(p.L, p.v) / 4 || p.holeDiameter >= Math.min(p.L, p.v) / 5
      ? [error('lip', 'שפות ופתחים גדולים מדי ללוחות הבסיס.')]
      : [],
);
add(
  '0861',
  117,
  [
    { ...L, label: 'צלע בסיס ריבועי', default: 120 },
    { ...H, label: 'גובה דופן מפותח', default: 180 },
    lip,
    t,
  ],
  (p) => {
    const s = p.L + p.t,
      h = p.H + p.t,
      b = new GeometryBuilder(),
      roots: Point[] = [
        [0, 0],
        [s, 0],
        [s, s],
        [0, s],
      ],
      outline: Point[] = [];
    for (let i = 0; i < 4; i++) {
      const a = roots[i],
        z = roots[(i + 1) % 4],
        dx = (z[0] - a[0]) / s,
        dy = (z[1] - a[1]) / s,
        nx = dy,
        ny = -dx;
      const at = (u: number, d: number): Point => [a[0] + dx * u + nx * d, a[1] + dy * u + ny * d];
      outline.push(
        a,
        at(s / 2, h),
        at(s / 2 + p.lip / 3, h + p.lip),
        at(1.5 * s - p.lip / 3, h + p.lip),
        at(1.5 * s, h),
      );
      b.line('crease', 'body', a, z);
      b.line('crease', 'body', a, at(1.5 * s, h));
      b.line('crease', 'body', at(s / 2, h), at(1.5 * s, h));
    }
    b.part('body', 'כלי מסובב עם דפנות משולשות', clean(outline));
    return finish(b);
  },
  [
    'בסיס ריבועי וארבע דפנות מוזחות עם קיפולי אלכסון ושפות. H הוא גובה מפותח לפני סיבוב, לא גובה פנימי לאחר הרכבה.',
  ],
  (p) => (p.lip >= p.L / 5 ? [error('lip', 'שפת החזרה רחבה מדי.')] : []),
);
function footShell(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance;
  return panelShell(
    [l, w, l, w],
    h,
    p.glue,
    (i, len) =>
      code === '0865' && i === 2
        ? [
            [0, 0],
            [len / 5, 0],
            [len / 5, -p.openingHeight],
            [(4 * len) / 5, -p.openingHeight],
            [(4 * len) / 5, 0],
            [len, 0],
          ]
        : plain(len, code === '0866' ? w / 4 : 0),
    (_, len) => {
      const pts: Point[] = [[0, 0]];
      for (const frac of [1 / 3, 2 / 3]) {
        const x = frac * len;
        pts.push(
          [x - (p.footWidth + gap) / 2, 0],
          [x - (p.footWidth + gap) / 2, -p.footDepth],
          [x + (p.footWidth + gap) / 2, -p.footDepth],
          [x + (p.footWidth + gap) / 2, 0],
        );
      }
      pts.push([len, 0]);
      return pts;
    },
    gap,
    (b, e) => {
      if (code === '0866') {
        for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], 0], [e[i + 1], 0]);
        const depth = p.openingHeight;
        b.path('perforation', 'body', [
          [e[1] + w / 2, -w / 4],
          [e[1] + w / 2, 0],
          [e[2] + l / 8, depth / 4],
          [e[2] + l / 8, depth],
          [e[3] - l / 8, depth],
          [e[3] - l / 8, depth / 4],
          [e[3] + w / 2, 0],
          [e[3] + w / 2, -w / 4],
        ]);
        b.line('perforation', 'body', [e[2] + l / 8, depth / 2], [e[3] - l / 8, depth / 2]);
        for (const i of [0, 2]) slot(b, 'body', e[i] + l / 2, gap * 2, p.footWidth, gap);
      }
    },
  );
}
for (const code of ['0865', '0866'] as const)
  add(
    code,
    118,
    [
      L,
      W,
      { ...H, default: 200 },
      f('openingHeight', 'גובה פתח תצוגה', 100, 'special'),
      f('footWidth', 'רוחב מגרעת רגל', 20, 'special'),
      f('footDepth', 'עומק מגרעת רגל', 12, 'special'),
      glue,
      t,
      clearance,
    ],
    (p) => footShell(p, code),
    [
      code === '0865'
        ? 'מעטפת פתוחה עם חזית חתוכה ומגרעות רגל בבסיס. לוח הרצפה המופיע באיור הוא רכיב נפרד, למשל 0901.'
        : 'מעטפת משלוח עם כנפי קצה, מגרעות רגל וקווי ניקוב להסרת חזית וחשיפת המוצר. לוח רצפה נפרד אינו כלול.',
    ],
    (p) =>
      p.openingHeight >= p.H - p.footDepth ||
      p.footWidth >= Math.min(p.L, p.W) / 4 ||
      p.footDepth >= p.H / 5
        ? [error('openingHeight', 'פתח התצוגה או מגרעות הרגל גדולים מדי.')]
        : [],
  );
add(
  '0870',
  118,
  [
    L,
    W,
    { ...H, label: 'גובה בסיס', default: 180 },
    f('stepRise', 'גובה מדרגה', 30, 'special'),
    f('steps', 'מספר מדרגות', 3, 'special', 1, 5),
    glue,
    lip,
    tab,
    t,
    clearance,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      r = p.stepRise + p.t,
      d = w / p.steps,
      gap = p.t + p.clearance;
    return panelShell(
      [w, l, w, l],
      h,
      p.glue,
      (i, len) => {
        if (i === 1) return plain(len, p.steps * (r + d) + p.lip);
        if (i === 3) return plain(len, p.steps * r);
        const pts: Point[] = [[0, 0]],
          tread = len / p.steps;
        if (i === 0) {
          pts.push([0, p.steps * r]);
          for (let k = 0; k < p.steps; k++)
            pts.push(
              [(k + 1) * tread, (p.steps - k) * r],
              [(k + 1) * tread, (p.steps - k - 1) * r],
            );
        } else {
          for (let k = 0; k < p.steps; k++)
            pts.push([k * tread, (k + 1) * r], [(k + 1) * tread, (k + 1) * r]);
          pts.push([len, p.steps * r], [len, 0]);
        }
        return pts;
      },
      (_, len) => clipped(len, w / 4, p.lip / 3),
      gap,
      (b, e) => {
        for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], h], [e[i + 1], h]);
        for (let k = 0; k < p.steps; k++) {
          const y = -k * (r + d);
          for (const yy of [y, y - r]) b.line('crease', 'body', [e[1], yy], [e[2], yy]);
          for (const i of [0, 2])
            slot(
              b,
              'body',
              e[i] + (k + 0.5) * d,
              -(i === 0 ? (p.steps - k) * r : (k + 1) * r) + r / 3,
              gap,
              p.tabWidth / 2,
            );
        }
        b.line('crease', 'body', [e[1], -p.steps * (r + d)], [e[2], -p.steps * (r + d)]);
      },
    );
  },
  [
    'תצוגת מדרגות מחתיכה אחת: צדדים מדורגים, חזית רציפה עם קיפולי מדרך / רום וגב גבוה. מספר המדרגות ומידותיהן ניתנים לעריכה.',
  ],
  (p) => [
    ...countIssues(p, ['steps']),
    ...(p.lip >= p.W / (p.steps * 2) || p.tabWidth >= p.stepRise || p.stepRise >= p.H / 2
      ? [error('stepRise', 'המדרגות והנעילות גדולות מדי ביחס לבסיס.')]
      : []),
  ],
);
add(
  '0871',
  119,
  [
    L,
    W,
    { ...H, default: 360 },
    { ...v, label: 'גובה חזית', default: 90 },
    glue,
    lip,
    tab,
    t,
    clearance,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      front = p.v + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance;
    return panelShell(
      [w, l, w, l],
      front,
      p.glue,
      (i, len) =>
        i === 3
          ? plain(len, h - front + p.lip)
          : i === 1
            ? plain(len, h / 2 + p.lip)
            : i === 0
              ? [
                  [0, 0],
                  [0, h - front],
                  [len, 0],
                ]
              : [
                  [0, 0],
                  [len, h - front],
                  [len, 0],
                ],
      (_, len) => clipped(len, w / 4, p.lip / 3),
      gap,
      (b, e) => {
        for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], front], [e[i + 1], front]);
        for (const y of [0, -h / 2, -h / 2 - p.lip / 2])
          b.line('crease', 'body', [e[1], y], [e[2], y]);
        b.line('crease', 'body', [e[3], -(h - front)], [e[4], -(h - front)]);
        for (const i of [0, 2]) slot(b, 'body', e[i] + w / 2, -(h - front) / 3, p.tabWidth, gap);
        receiver(b, 'body', e[1] + l / 2, -p.lip, p.tabWidth, gap);
      },
    );
  },
  ['גוף עם צדדים משופעים, חזית בעלת לוח תלוי ושפת נעילה, גב גבוה בעל החזרה וחריצי צד.'],
  (p) =>
    p.v >= p.H / 2 || p.lip >= p.W / 5 || p.tabWidth >= Math.min(p.L, p.W) / 4
      ? [error('v', 'החזית והנעילות גדולות מדי ביחס לגוף.')]
      : [],
);
add(
  '0872',
  119,
  [
    { ...L, label: 'רוחב תא', default: 120 },
    { ...W, label: 'גובה תא', default: 160 },
    { ...H, label: 'עומק מדף', default: 80 },
    lip,
    t,
    clearance,
    spacing,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder(),
      totalW = 2 * l,
      totalH = 3 * w,
      r = p.lip;
    const net = crossBlank(totalW, totalH, [h, p.t, h], [h, p.t, h]);
    b.parts = net.parts;
    b.paths = net.paths;
    const origin = 2 * h + p.t;
    for (const y of [origin + w, origin + 2 * w])
      for (const x of [origin + gap * 2, origin + totalW - gap * 2])
        slot(b, 'body', x, y, gap, r / 2);
    for (const y of [origin + gap * 2, origin + totalH - gap * 2])
      for (const x of [origin + l / 2, origin + 1.5 * l]) slot(b, 'body', x, y, r, gap);
    const parts = [b.finish()];
    const d = new GeometryBuilder();
    d.part('divider', 'מחיצה מרכזית כפולה', [
      [0, 0],
      [2 * h + p.t, 0],
      [2 * h + p.t, totalH],
      [0, totalH],
    ]);
    for (const x of [h, h + p.t]) d.line('crease', 'divider', [x, 0], [x, totalH]);
    for (const y of [w, 2 * w]) slot(d, 'divider', h, y, h, gap);
    parts.push(d.finish());
    for (let i = 0; i < 2; i++) {
      const s = new GeometryBuilder(),
        id = `shelf-${i + 1}`,
        pts: Point[] = [
          [0, 0],
          [l - gap / 2, 0],
          [l - gap / 2, h / 2],
          [l + gap / 2, h / 2],
          [l + gap / 2, 0],
          [totalW, 0],
          [totalW, 2 * h + p.t],
          [0, 2 * h + p.t],
        ];
      s.part(id, 'מדף כפול עם חריץ מרכזי', pts);
      for (const y of [h, h + p.t]) s.line('crease', id, [0, y], [totalW, y]);
      parts.push(s.finish());
    }
    return pack(parts, p.spacing);
  },
  [
    'כוננית דו-עמודתית ושלוש שורות: גב, מחיצה כפולה, שני מדפים כפולים, צדדים ומכסי קצה. L/W/H מציינים רוחב תא, גובה תא ועומק מדף לפי המקור.',
  ],
  (p) => (p.lip >= Math.min(p.L, p.W, p.H) / 4 ? [error('lip', 'שפת הכוננית גדולה מדי.')] : []),
);
add(
  '0873',
  119,
  [L, W, H, lip, tab, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      b = new GeometryBuilder(),
      g = p.t + p.clearance;
    b.part('body', 'תומך עם כנפי U', [
      [0, 0],
      [h + w + l, 0],
      [h + w + l, w],
      [h + w + l * 0.55, w],
      [h + w + l * 0.55, w + l],
      [h + w + l, w + l],
      [h + w + l, 2 * w + l],
      [0, 2 * w + l],
    ]);
    for (const x of [h, h + w]) b.line('crease', 'body', [x, 0], [x, 2 * w + l]);
    for (const y of [w, w + l]) b.line('crease', 'body', [0, y], [h + w + l, y]);
    for (const y of [w / 2, w + l + w / 2]) {
      receiver(b, 'body', h / 2, y, p.tabWidth, g);
      slot(b, 'body', h + w + l - p.lip, y, p.tabWidth, g);
    }
    return finish(b);
  },
  [
    'תומך פנימי יחיד עם לוח H×L, שפות W ושתי כנפי U נעולות. המקור מראה רכיב המחובר בתוך קופסה, לא קופסה עצמאית.',
  ],
  (p) =>
    p.lip >= Math.min(p.L, p.W) / 4 || p.tabWidth >= p.W / 3
      ? [error('tabWidth', 'לשוניות התומך גדולות מדי.')]
      : [],
);
add(
  '0874',
  120,
  [L, W, { ...H, default: 60 }, { ...v, label: 'גובה חזית', default: 25 }, lip, tab, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      front = p.v + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder();
    b.part('body', 'מגש עם קיפול צד אלכסוני וחזית כפולה', [
      [0, 0],
      [l, 0],
      [l + h, h / 4],
      [l + h, w],
      [l, w],
      [l, w + 2 * front + w],
      [l / 2 + p.tabWidth / 2, w + 2 * front + w],
      [l / 2 + p.tabWidth / 2, w + 2 * front + w + p.lip],
      [l / 2 - p.tabWidth / 2, w + 2 * front + w + p.lip],
      [l / 2 - p.tabWidth / 2, w + 2 * front + w],
      [0, w + 2 * front + w],
      [0, w],
      [-h, w],
      [-h, h / 4],
    ]);
    for (const x of [0, l]) b.line('crease', 'body', [x, 0], [x, w]);
    for (const y of [w, w + front, w + 2 * front]) b.line('crease', 'body', [0, y], [l, y]);
    for (const side of [-1, 1]) {
      const x = side < 0 ? 0 : l;
      b.line('crease', 'body', [x, 0], [x + side * h, w]);
      slot(b, 'body', x + (side * h) / 3, h / 2, p.tabWidth / 2, gap);
    }
    for (const x of [gap * 2, l - gap * 2]) slot(b, 'body', x, w / 3, gap, p.tabWidth);
    return finish(b);
  },
  ['מגש עם קיפולי צד אלכסוניים, חריצי קיבוע, חזית נמוכה כפולה והחזרת רצפה מלאה עם לשונית.'],
  (p) =>
    p.v >= p.H / 2 || p.lip >= p.W / 5 || p.tabWidth >= Math.min(p.L, p.W) / 4
      ? [error('v', 'גובה חזית ושפות הנעילה גדולים מדי.')]
      : [],
);
