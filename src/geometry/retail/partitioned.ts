import { GeometryBuilder, rectangle } from '../primitives';
import { pack, strip, crossBlank } from '../families/panels';
import { tray } from '../families/tray';
import { ellipse } from '../families/profiled-shell';
import type { Params, Point } from '../types';
import { shelf } from './displays';
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
  shelfCount,
  columns,
  rows,
  f,
  error,
  slot,
  countIssues,
  shelfIssues,
  panelShell,
  plain,
} from './common';
function grid(p: Params, height: number) {
  const l = p.L + p.t,
    w = p.W + p.t,
    gap = p.t + p.clearance,
    parts = [];
  for (let direction = 0; direction < 2; direction++) {
    const count = direction ? p.columns : p.rows,
      length = direction ? w : l,
      otherCount = direction ? p.rows : p.columns;
    for (let n = 1; n < count; n++) {
      const b = new GeometryBuilder(),
        id = `partition-${direction}-${n}`,
        pts: Point[] = [[0, 0]];
      if (direction === 0)
        for (let k = 1; k < otherCount; k++) {
          const x = (k * length) / otherCount;
          pts.push(
            [x - gap / 2, 0],
            [x - gap / 2, height / 2],
            [x + gap / 2, height / 2],
            [x + gap / 2, 0],
          );
        }
      pts.push([length, 0], [length, height]);
      if (direction === 1)
        for (let k = otherCount - 1; k >= 1; k--) {
          const x = (k * length) / otherCount;
          pts.push(
            [x + gap / 2, height],
            [x + gap / 2, height / 2],
            [x - gap / 2, height / 2],
            [x - gap / 2, height],
          );
        }
      pts.push([0, height]);
      b.part(id, 'מחיצה עם חריצי חיבור משלימים', pts);
      parts.push(b.finish());
    }
  }
  return parts;
}
const gridIssues = (p: Params) => [
  ...countIssues(p, ['columns', 'rows']),
  ...(Math.min(p.L / p.columns, p.W / p.rows) <= 4 * (p.t + p.clearance)
    ? [error('columns', 'התאים קטנים מדי לחיבור המחיצות.')]
    : []),
];
add(
  '0848',
  114,
  [
    L,
    W,
    { ...H, default: 320 },
    { ...v, label: 'גובה בסיס', default: 45 },
    columns,
    rows,
    lip,
    { ...tab, default: 14 },
    t,
    clearance,
    spacing,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder(),
      base = p.v + p.t;
    b.part('collar', 'חגורת בסיס ארבע-דפנית', [
      [0, 0],
      [2 * (l + w), 0],
      [2 * (l + w), base],
      [0, base],
    ]);
    let x = 0;
    for (const len of [l, w, l]) {
      x += len;
      b.line('crease', 'collar', [x, 0], [x, base]);
    }
    const trayPart = tray(l, w, p.v / 2, gap, 'base');
    const parts = [b.finish(), trayPart, ...grid(p, p.H + p.t)];
    const middle = new GeometryBuilder();
    middle.part('deck', 'מגש מדף מחורץ', rectangle(0, 0, l, w));
    for (let col = 1; col < p.columns; col++)
      for (let row = 1; row <= p.rows; row++)
        slot(middle, 'deck', (col * l) / p.columns, ((row - 0.5) * w) / p.rows, gap, p.tabWidth);
    for (const yy of [p.lip, w - p.lip])
      for (let col = 1; col <= p.columns; col++)
        slot(middle, 'deck', ((col - 0.5) * l) / p.columns, yy, p.tabWidth, gap);
    parts.push(middle.finish(), strip([p.lip, p.t, p.lip], l, 'front-rail'));
    return pack(parts, p.spacing);
  },
  ['רשת מחיצות אנכית עם חריצים משלימים, מגש בסיס, חגורת בסיס, לוח ביניים מחורץ ושפת מדף נפרדת.'],
  (p) => [
    ...gridIssues(p),
    ...(p.v >= Math.min(p.L, p.W, p.H) / 2 ? [error('v', 'הבסיס גבוה מדי ביחס למידות.')] : []),
    ...(p.lip >= p.W / 4 || p.tabWidth >= Math.min(p.L / p.columns, p.W / p.rows) / 2
      ? [error('tabWidth', 'השפה או החריצים גדולים מדי לתאי הרשת.')]
      : []),
  ],
);
add(
  '0849',
  114,
  [
    L,
    W,
    { ...H, default: 700 },
    { ...v, label: 'גובה מגש / החזרת דופן', default: 25 },
    tab,
    shelfCount,
    t,
    clearance,
    spacing,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder();
    b.part('body', 'גב כפול עם דפנות ושפות', [
      [0, 0],
      [l, 0],
      [l, -p.v],
      [2 * l, -p.v],
      [2 * l, h - w],
      [2 * l - w / 3, h],
      [l + w / 3, h],
      [l, h - w],
      [l, h],
      [0, h],
    ]);
    b.line('crease', 'body', [l, 0], [l, h - w]);
    b.line('crease', 'body', [l, 0], [l + w / 5, 0]);
    for (const y of [0, h - w]) b.line('crease', 'body', [l, y], [2 * l, y]);
    for (let k = 1; k <= p.shelfCount; k++) {
      const y = (k * h) / (p.shelfCount + 1);
      slot(b, 'body', 1.5 * l, y, p.tabWidth, gap);
      for (const x of [l + l / 3, l + (2 * l) / 3]) slot(b, 'body', x, y, gap, p.v / 2);
    }
    const parts = [b.finish()];
    for (let k = 0; k < p.shelfCount; k++) parts.push(shelf(p, `tray-${k + 1}`));
    parts.push(strip([p.v, p.t, p.v], l, 'lower-return'));
    for (let i = 0; i < 2; i++) {
      const s = new GeometryBuilder(),
        id = `stand-${i + 1}`;
      s.part(id, 'רגל אחורית גבוהה', [
        [0, 0],
        [p.v, 0],
        [p.v, h - w],
        [p.v + w / 2, h],
        [0, h],
      ]);
      s.line('crease', id, [p.v / 2, 0], [p.v / 2, h - w]);
      parts.push(s.finish());
    }
    return pack(parts, p.spacing);
  },
  [
    'גב כפול, דפנות, שלוש נקודות קיבוע בכל שורת מדף, מגשי מדף נפרדים ושתי רגלי גב נפרדות. המקור מפנה למגש 0874; החיבור נשאר תחת קוד 0849.',
  ],
  shelfIssues,
);
for (const code of ['0853', '0854'] as const)
  add(
    code,
    116,
    [
      L,
      W,
      { ...H, default: 350 },
      { ...v, label: code === '0853' ? 'גובה לוח כותרת' : 'גובה חזית מדף', default: 60 },
      columns,
      rows,
      ...(code === '0853' ? [f('holeDiameter', 'קוטר פתח מוצר', 12, 'special')] : []),
      glue,
      lip,
      t,
      clearance,
      spacing,
    ],
    (p) => {
      const l = p.L + p.t,
        w = p.W + p.t,
        h = p.H + p.t,
        gap = p.t + p.clearance;
      const body = panelShell(
        [l, w, l, w],
        h,
        p.glue,
        (i, len) =>
          code === '0853'
            ? plain(len, i === 0 ? p.v : p.lip)
            : [
                [0, 0],
                [0, i === 0 ? p.v : p.lip],
                [len, i === 2 ? p.lip : p.v],
                [len, 0],
              ],
        (_, len) => plain(len, 0),
        gap,
        (b, e) => {
          for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], 0], [e[i + 1], 0]);
        },
      );
      const platform = new GeometryBuilder();
      const platformNet = crossBlank(l, w, [p.lip], [p.lip], 'platform');
      platform.parts = platformNet.parts;
      platform.paths = platformNet.paths;
      if (code === '0853')
        for (let col = 0; col < p.columns; col++)
          for (let row = 0; row < p.rows; row++)
            platform.path(
              'cut',
              'platform',
              ellipse(
                p.lip + (l * (col + 0.5)) / p.columns,
                p.lip + (w * (row + 0.5)) / p.rows,
                p.holeDiameter,
                p.holeDiameter,
              ),
              true,
            );
      else
        for (let col = 1; col < p.columns; col++)
          for (let row = 1; row <= p.rows; row++)
            slot(
              platform,
              'platform',
              p.lip + (col * l) / p.columns,
              p.lip + ((row - 0.5) * w) / p.rows,
              gap,
              p.lip,
            );
      const parts = [body, ...grid(p, h), platform.finish()];
      const base = tray(l, w, p.lip, gap, 'base');
      parts.push(base);
      if (code === '0854')
        for (let i = 0; i < 2; i++)
          parts.push(strip([p.lip, p.t, p.lip, p.t, p.lip], l, `side-support-${i + 1}`));
      return pack(parts, p.spacing);
    },
    [
      code === '0853'
        ? 'גוף ארבע-דפני עם כותרת גבוהה, רשת מחיצות, מגש תחתון ולוח עליון בעל פתחים עגולים.'
        : 'גוף עם גבהי קצה משתנים, מחיצות ליצירת תאים, מגש תחתון, לוח עליון מחורץ ושתי קורות תמיכה נפרדות.',
    ],
    (p) => [
      ...gridIssues(p),
      ...(p.lip >= Math.min(p.L, p.W) / 5 ? [error('lip', 'השפה רחבה מדי למשטח התצוגה.')] : []),
      ...(code === '0853' && p.holeDiameter >= Math.min(p.L / p.columns, p.W / p.rows) - 2 * p.lip
        ? [error('holeDiameter', 'פתחים עגולים חופפים או קרובים מדי לשפות.')]
        : []),
    ],
  );
