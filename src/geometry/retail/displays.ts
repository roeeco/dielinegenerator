import { GeometryBuilder, rectangle } from '../primitives';
import { pack, strip } from '../families/panels';
import { ellipse } from '../families/profiled-shell';
import type { Params, Point, DielineGeometry } from '../types';
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
  tab,
  shelfCount,
  columns,
  lip,
  f,
  error,
  clean,
  finish,
  slot,
  receiver,
  shelfIssues,
  countIssues,
  panelShell,
  plain,
  clipped,
} from './common';
export function shelf(
  p: Params,
  id: string,
  centreNotch = false,
  fullReturn = false,
): DielineGeometry {
  const l = p.L + p.t,
    w = p.W + p.t,
    lip = p.v,
    gap = p.t + p.clearance,
    b = new GeometryBuilder(),
    depth = fullReturn ? w : lip;
  const outline: Point[] = [[0, 0]];
  if (centreNotch)
    outline.push(
      [l / 2 - gap / 2, 0],
      [l / 2 - gap / 2, w / 2],
      [l / 2 + gap / 2, w / 2],
      [l / 2 + gap / 2, 0],
    );
  else
    outline.push(
      [l / 2 - p.tabWidth / 2, 0],
      [l / 2 - p.tabWidth / 2, -lip / 3],
      [l / 2 + p.tabWidth / 2, -lip / 3],
      [l / 2 + p.tabWidth / 2, 0],
    );
  outline.push(
    [l, 0],
    [l, w],
    [l + lip, w],
    [l + lip, w + depth],
    [l, w + depth],
    [l, w + depth + lip / 2],
    [0, w + depth + lip / 2],
    [0, w + depth],
    [-lip, w + depth],
    [-lip, w],
    [0, w],
  );
  b.part(id, 'מדף עם שפה ואוזני חיבור', clean(outline));
  for (const y of [w, w + p.t, w + depth]) b.line('crease', id, [0, y], [l, y]);
  for (const x of [0, l]) b.line('crease', id, [x, w], [x, w + depth]);
  return b.finish();
}
function foldedDisplay(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance,
    b = new GeometryBuilder(),
    r = p.v;
  const outline: Point[] = [
    [-w / 2, 0],
    [0, 0],
    [l, 0],
    [l + w / 2, 0],
    [l + w, h],
    [l, h],
    [0, h],
    [-w, h],
  ];
  b.part('body', 'גב עם דפנות משופעות והחזרות', outline);
  for (const x of [0, l]) b.line('crease', 'body', [x, 0], [x, h]);
  for (const side of [-1, 1]) {
    const x = side < 0 ? 0 : l;
    b.line('crease', 'body', [x + side * (w / 2 - r), 0], [x + side * (w - r), h]);
    b.line('crease', 'body', [x + side * (w / 2 - r - p.t), 0], [x + side * (w - r - p.t), h]);
  }
  for (let k = 1; k <= p.shelfCount; k++) {
    const y = (k * h) / (p.shelfCount + 1),
      xOffset = w / 2 + ((w / 2) * y) / h;
    for (const side of [-1, 1])
      slot(b, 'body', (side < 0 ? 0 : l) + side * (xOffset - r / 2), y, p.tabWidth, gap);
    for (const x of [0, l]) slot(b, 'body', x, y, gap, r / 2);
    if (code === '0834') receiver(b, 'body', l / 2, y, p.tabWidth, gap);
  }
  const parts = [b.finish()];
  if (code === '0832') {
    const d = new GeometryBuilder();
    d.part('divider', 'מחיצה מרכזית משופעת', [
      [w / 2, 0],
      [1.5 * w, 0],
      [2 * w, h],
      [0, h],
    ]);
    d.line('crease', 'divider', [w, 0], [w, h]);
    for (let k = 1; k <= p.shelfCount; k++)
      slot(d, 'divider', w, (k * h) / (p.shelfCount + 1), w / 2, gap);
    parts.push(d.finish());
  }
  for (let k = 0; k < p.shelfCount; k++) {
    parts.push(shelf(p, `shelf-${k + 1}`, code === '0832', code === '0834'));
    if (code === '0834') parts.push(strip([r, p.t, r], l, `brace-${k + 1}`));
  }
  return pack(parts, p.spacing);
}
for (const [code, page] of [
  ['0832', 111],
  ['0834', 111],
] as const)
  add(
    code,
    page,
    [
      L,
      W,
      { ...H, default: 600 },
      { ...v, label: 'רוחב החזרה ושפת מדף', default: 30 },
      tab,
      shelfCount,
      t,
      clearance,
      spacing,
    ],
    (p) => foldedDisplay(p, code),
    [
      code === '0832'
        ? 'דפנות משופעות, מחיצה מרכזית נפרדת ומדפים עם חריץ אמצעי תואם.'
        : 'דפנות משופעות והחזרות כפולות, מדפים מוחזרים מלאים וקורות חיזוק נפרדות.',
    ],
    shelfIssues,
  );
add(
  '0840',
  112,
  [
    L,
    W,
    { ...H, default: 1000 },
    { ...v, label: 'שפת מדף', default: 30 },
    tab,
    { ...shelfCount, default: 4 },
    t,
    clearance,
    spacing,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      b = new GeometryBuilder(),
      pitch = h / (p.shelfCount + 1),
      r = p.v;
    const edge = (side: number): Point[] => {
      const x = side < 0 ? -w : l + w,
        inner = side < 0 ? -w / 3 : l + w / 3,
        pts: Point[] = [[x, 0]];
      for (let k = 1; k <= p.shelfCount; k++) {
        const y = k * pitch;
        pts.push(
          [x, y - r],
          [x + side * r, y - r],
          [x + side * r, y],
          [x, y],
          [inner, y],
          [inner, y + pitch / 2],
          [x, y + pitch / 2],
        );
      }
      pts.push([x, h]);
      return pts;
    };
    b.part('body', 'גב ודפנות עם פתחים ומנופי מדף', clean([...edge(-1).reverse(), ...edge(1)]));
    for (const x of [0, l]) b.line('crease', 'body', [x, 0], [x, h]);
    for (let k = 1; k <= p.shelfCount; k++)
      receiver(b, 'body', l / 2, k * pitch, p.tabWidth, p.t + p.clearance);
    return pack(
      [b.finish(), ...Array.from({ length: p.shelfCount }, (_, i) => shelf(p, `shelf-${i + 1}`))],
      p.spacing,
    );
  },
  ['גב ודפנות עם פתחים פתוחים מהקצוות, זרועות מדף ומדפים נפרדים עם שפה מוחזרת.'],
  shelfIssues,
);
add(
  '0841',
  112,
  [L, W, { ...H, default: 500 }, { ...v, default: 200 }, glue, lip, tab, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      front = p.v + p.t,
      gap = p.t + p.clearance;
    const g = panelShell(
      [l, w, l, w],
      front,
      p.glue,
      (i, len) =>
        i === 0
          ? plain(len, h - front)
          : i === 2
            ? plain(len, w)
            : [
                [0, 0],
                [0, h - front],
                [len / 3, h - front],
                [len, 0],
              ],
      (_, len) => clipped(len, w / 3, p.lip / 2),
      gap,
      (b, e) => {
        b.line('crease', 'body', [e[2], -w], [e[3], -w]);
        for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], front], [e[i + 1], front]);
        receiver(b, 'body', e[0] + l / 2, -(h - front) / 3, p.tabWidth, gap);
        receiver(b, 'body', e[2] + l / 2, 0, p.tabWidth, gap);
      },
    );
    return g;
  },
  ['מעמד רציף ארבע-דפני: גב גבוה, צדדים יורדים, חזית נמוכה ומדף / מכסה מחובר לחזית.'],
  (p) =>
    p.v >= p.H - p.W || p.lip >= p.W / 4 || p.tabWidth >= p.L / 4
      ? [error('v', 'נדרש גב גבוה יותר מהחזית ומעומק המדף.')]
      : [],
);
add(
  '0842',
  112,
  [
    L,
    W,
    { ...H, default: 1000 },
    { ...v, label: 'גובה שפה', default: 30 },
    glue,
    tab,
    shelfCount,
    t,
    clearance,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      b = new GeometryBuilder(),
      pitch = h / (p.shelfCount + 1),
      e = [p.glue, p.glue + l, p.glue + l + w, p.glue + 2 * l + w, p.glue + 2 * (l + w)];
    b.part('body', 'דפנות עם חזית מדורגת מחוברת', [
      [0, 0],
      [e[1], 0],
      [e[2], w / 2],
      [e[3], w / 2],
      [e[4], 0],
      [e[4], h],
      [e[0], h],
      [0, h - p.glue],
    ]);
    for (const x of e.slice(0, -1))
      b.line('crease', 'body', [x, x === e[2] || x === e[3] ? w / 2 : 0], [x, h]);
    for (let k = 1; k <= p.shelfCount; k++) {
      const y = k * pitch;
      receiver(b, 'body', e[0] + l / 2, y, p.tabWidth, gap);
      // Attached front shelves are released by side cuts and fold as W-depth plates.
      for (const x of [e[2], e[3]])
        b.line(
          'cut',
          'body',
          [x + (x === e[2] ? gap : -gap), y - w],
          [x + (x === e[2] ? gap : -gap), y],
        );
      b.line('cut', 'body', [e[2] + gap, y - w], [e[3] - gap, y - w]);
      b.line('crease', 'body', [e[2] + gap, y], [e[3] - gap, y]);
      b.line('crease', 'body', [e[2] + gap, y - p.v], [e[3] - gap, y - p.v]);
    }
    return finish(b);
  },
  ['מדפים מחוברים לחזית בעומק W, עם חיתוכי צד וקיפולי שפה; גב עם קולטי לשונית. אין מדפים נפרדים.'],
  (p) => [
    ...shelfIssues(p),
    ...(p.H / (p.shelfCount + 1) <= p.W + 2 * p.v
      ? [error('shelfCount', 'גובה בין מדפים חייב להכיל את עומק המדף ושפתו.')]
      : []),
  ],
);
add(
  '0843',
  113,
  [
    L,
    W,
    { ...H, default: 1000 },
    { ...v, label: 'שפת מדף', default: 25 },
    glue,
    tab,
    shelfCount,
    t,
    clearance,
  ],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance;
    return panelShell(
      [w, l, w, l],
      h,
      p.glue,
      (i, len) =>
        i % 2
          ? [
              [0, 0],
              [len / 6, 0],
              [len / 6, p.v + w],
              [(5 * len) / 6, p.v + w],
              [(5 * len) / 6, 0],
              [len, 0],
            ]
          : plain(len, 0),
      (_, len) => plain(len, 0),
      gap,
      (b, e) => {
        for (let k = 1; k <= p.shelfCount; k++) {
          const y = (k * h) / (p.shelfCount + 1);
          for (let i = 0; i < 4; i++) {
            const len = i % 2 ? l : w,
              x = e[i] + len / 2;
            if (i % 2 === 0) slot(b, 'body', x, y, len / 2, w / 2);
            else {
              const left = x - l / 3,
                right = x + l / 3;
              b.path('cut', 'body', [
                [left, y - w],
                [left, y],
                [right, y],
                [right, y - w],
              ]);
              b.line('crease', 'body', [left, y - w], [right, y - w]);
              b.line('crease', 'body', [left, y - w + p.v], [right, y - w + p.v]);
              for (const xx of [left, right])
                receiver(b, 'body', xx, y - w + p.v, p.tabWidth / 3, gap);
            }
          }
        }
      },
    );
  },
  ['שני לוחות צד עם חלונות ושני לוחות חזית עם מדפים מחוברים; חיתוכי U משאירים ציר קיפול עליון.'],
  (p) => [
    ...shelfIssues(p),
    ...(p.H / (p.shelfCount + 1) <= p.W + 2 * p.v
      ? [error('shelfCount', 'אין מקום למדף המחובר בין השורות.')]
      : []),
  ],
);
// Windowed sleeve and separate internal plates: curved, hexagonal and perforated variants.
function windowTower(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance,
    b = new GeometryBuilder();
  const perimeter =
    code === '0845'
      ? Math.PI * ((3 * (l + w)) / 2 - Math.sqrt((3 * l + w) * (l + 3 * w)) / 2)
      : 2 * (l + w);
  const widths = code === '0845' ? [perimeter / 2, perimeter / 2] : [w, l, w, l],
    edges = [p.glue];
  widths.forEach((s) => edges.push(edges.at(-1)! + s));
  b.part('body', 'מעטפת תצוגה עם פתחים', rectangle(0, 0, edges.at(-1)!, h));
  if (code !== '0845') for (const x of edges.slice(0, -1)) b.line('crease', 'body', [x, 0], [x, h]);
  else b.line('crease', 'body', [p.glue, 0], [p.glue, h]);
  const pitch = h / (p.shelfCount + 1);
  for (let i = 0; i < widths.length; i++)
    for (let k = 1; k <= p.shelfCount; k++) {
      const y = k * pitch,
        cx = edges[i] + widths[i] / 2;
      if (code === '0847' && i % 2 === 1)
        for (let col = 0; col < p.columns; col++)
          b.path(
            'cut',
            'body',
            ellipse(
              edges[i] + (widths[i] * (col + 1)) / (p.columns + 1),
              y,
              p.holeDiameter,
              p.holeDiameter,
            ),
            true,
          );
      else if (code !== '0847') {
        const ww = widths[i] - 2 * p.v,
          hh = pitch - p.v * 1.5;
        // An attached bottom flap remains in each opening for the hexagonal shelf type.
        if (code === '0846') {
          const x = cx - ww / 2,
            y0 = y - hh / 2;
          b.path('cut', 'body', [
            [x, y0 + hh],
            [x, y0],
            [x + ww, y0],
            [x + ww, y0 + hh],
          ]);
          b.line('crease', 'body', [x, y0 + hh], [x + ww, y0 + hh]);
        } else slot(b, 'body', cx, y, ww, hh);
      }
    }
  const pieces = [b.finish()];
  if (code === '0845' || code === '0847')
    for (let j = 0; j < 2; j++) {
      const d = new GeometryBuilder(),
        id = `support-${j + 1}`,
        dw = code === '0845' ? w : l;
      // Edge notches are part of the exterior, so there is no doubled outline cut.
      const outline: Point[] = [
        [0, 0],
        [dw, 0],
      ];
      for (let k = 1; k <= p.shelfCount; k++) {
        const y = k * pitch;
        outline.push(
          [dw, y - gap / 2],
          [dw - p.v, y - gap / 2],
          [dw - p.v, y + gap / 2],
          [dw, y + gap / 2],
        );
      }
      outline.push([dw, h], [0, h]);
      for (let k = p.shelfCount; k >= 1; k--) {
        const y = k * pitch;
        outline.push([0, y + gap / 2], [p.v, y + gap / 2], [p.v, y - gap / 2], [0, y - gap / 2]);
      }
      d.part(id, 'לוח תמיכה פנימי', outline);
      if (code === '0845')
        for (const x of [dw / 2, dw / 2 + p.t]) d.line('crease', id, [x, 0], [x, h]);
      if (code === '0847')
        for (let k = 1; k <= p.shelfCount; k++)
          for (let col = 0; col < p.columns; col++)
            d.path(
              'cut',
              id,
              ellipse(
                (dw * (col + 1)) / (p.columns + 1),
                k * pitch,
                p.holeDiameter,
                p.holeDiameter,
              ),
              true,
            );
      pieces.push(d.finish());
    }
  for (let k = 0; k < p.shelfCount; k++) {
    const s = new GeometryBuilder(),
      id = `shelf-${k + 1}`;
    if (code === '0845') {
      s.part(id, 'מדף אליפטי', ellipse(l / 2, w / 2, l, w));
      for (const x of [l / 4, (3 * l) / 4]) slot(s, id, x, w / 2, gap, p.v);
    } else if (code === '0846') {
      const c = w / 3,
        poly: Point[] = [
          [c, 0],
          [l - c, 0],
          [l, w / 2],
          [l - c, w],
          [c, w],
          [0, w / 2],
        ],
        outline: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = poly[i],
          z = poly[(i + 1) % 6],
          dx = z[0] - a[0],
          dy = z[1] - a[1],
          len = Math.hypot(dx, dy),
          nx = dy / len,
          ny = -dx / len;
        outline.push(
          a,
          [a[0] + nx * p.v + (dx / len) * gap, a[1] + ny * p.v + (dy / len) * gap],
          [z[0] + nx * p.v - (dx / len) * gap, z[1] + ny * p.v - (dy / len) * gap],
        );
        s.line('crease', id, a, z);
      }
      s.part(id, 'מדף משושה עם כנפי חיבור', outline);
    } else {
      s.part(id, 'מדף פנימי מחורץ', rectangle(0, 0, l, w));
      for (const x of [l / 4, (3 * l) / 4]) slot(s, id, x, w / 2, gap, p.v);
      s.line('crease', id, [0, w / 2], [l, w / 2]);
    }
    pieces.push(s.finish());
  }
  if (code === '0845') {
    pieces.push(strip([p.v, p.t, p.v, p.t, p.v], l, 'stiffener'));
    for (const [id, width] of [
      ['foot-width', w],
      ['foot-length', l],
    ] as const) {
      const s = new GeometryBuilder();
      s.part(id, 'רגל תמיכה מחורצת', [
        [0, 0],
        [width, 0],
        [width, p.v],
        [width / 2 + gap / 2, p.v],
        [width / 2 + gap / 2, p.v / 2],
        [width / 2 - gap / 2, p.v / 2],
        [width / 2 - gap / 2, p.v],
        [0, p.v],
      ]);
      pieces.push(s.finish());
    }
  }
  return pack(pieces, p.spacing);
}
for (const [code, page] of [
  ['0845', 113],
  ['0846', 113],
  ['0847', 114],
] as const)
  add(
    code,
    page,
    [
      L,
      W,
      { ...H, default: 700 },
      { ...v, label: 'שפה / מסגרת פנימית', default: code === '0847' ? 12 : 20 },
      shelfCount,
      ...(code === '0847' ? [columns, f('holeDiameter', 'קוטר פתח מוצר', 12, 'special')] : []),
      glue,
      t,
      clearance,
      spacing,
    ],
    (p) => windowTower(p, code),
    [
      code === '0845'
        ? 'מעטפת אליפטית מפותחת לפי קירוב היקף רמנוג׳ן, חלונות, שני לוחות תמיכה, מדפים אליפטיים וקורות / רגליים מחורצות.'
        : code === '0846'
          ? 'מעטפת ארבע-דפנית עם חלונות ומדפים משושים בעלי כנפי חיבור.'
          : 'מעטפת עם מערך פתחי מוצר עגולים ושני לוחות פנימיים תואמים; מדפים / מרווחים נפרדים.',
    ],
    (p) => [
      ...shelfIssues(p),
      ...(code === '0846' && p.L <= (2 * p.W) / 3 + 4 * (p.t + p.clearance)
        ? [error('L', 'אין מקום לפינות המדף המשושה ביחס לרוחב.')]
        : []),
      ...(code === '0847'
        ? [
            ...countIssues(p, ['columns']),
            ...(p.holeDiameter >=
            Math.min(p.L / (p.columns + 1) - 2 * p.v, p.H / (p.shelfCount + 1) - 2 * p.v)
              ? [error('holeDiameter', 'הפתחים גדולים מדי למרווחי המוצר.')]
              : []),
          ]
        : []),
    ],
  );
