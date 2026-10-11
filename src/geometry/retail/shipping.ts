import { GeometryBuilder } from '../primitives';
import { automaticBase } from '../families/automatic';
import type { Point } from '../types';
import {
  add,
  L,
  W,
  H,
  t,
  clearance,
  glue,
  lip,
  tab,
  f,
  error,
  slot,
  amend,
  finish,
  panelShell,
  plain,
} from './common';
const seal = f('sealWidth', 'רוחב פס הדבקה', 12, 'special', 4, 50),
  tear = f('tearWidth', 'רוחב רצועת פתיחה', 8, 'special', 3, 40);
function tearStrip(
  b: GeometryBuilder,
  id: string,
  a: Point,
  z: Point,
  width: number,
  vertical = false,
) {
  for (const offset of [0, width])
    b.line(
      'tear',
      id,
      vertical ? [a[0] + offset, a[1]] : [a[0], a[1] + offset],
      vertical ? [z[0] + offset, z[1]] : [z[0], z[1] + offset],
    );
}
add(
  '0885',
  121,
  [L, W, { ...H, default: 45 }, lip, tab, seal, tear, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance,
      band = 2 * p.sealWidth + p.tearWidth,
      b = new GeometryBuilder(),
      end = w + h + w + band;
    const returnDepth = 2 * h + p.t,
      topReturn: Point[] = [
        [0, 0],
        [0, -returnDepth],
      ];
    for (const x of [w / 3, (2 * w) / 3])
      topReturn.push(
        [x - p.tabWidth / 2, -returnDepth],
        [x - p.tabWidth / 2, -returnDepth - p.lip],
        [x + p.tabWidth / 2, -returnDepth - p.lip],
        [x + p.tabWidth / 2, -returnDepth],
      );
    topReturn.push([w, -returnDepth], [w, 0]);
    b.part('body', 'מעטפת מסחר מקוון עם מכסה ופס פתיחה', [
      ...topReturn,
      [w + h, 0],
      [w + h, -h / 2],
      [w + h + w, -h / 2],
      [w + h + w, 0],
      [end, 0],
      [end, l],
      [w + h + w, l],
      [w + h + w, l + h / 2],
      [w + h, l + h / 2],
      [w + h, l],
      ...topReturn.map(([x, y]) => [x, l - y] as Point).reverse(),
      [-h, l],
      [-h, 0],
    ]);
    for (const y of [0, -h, -h - p.t, l, l + h, l + h + p.t])
      b.line('crease', 'body', [0, y], [w, y]);
    for (const x of [0, w, w + h, w + h + w]) b.line('crease', 'body', [x, 0], [x, l]);
    for (const y of [0, l]) b.line('crease', 'body', [w + h, y], [w + h + w, y]);
    for (const x of [w / 3, (2 * w) / 3])
      for (const y of [-returnDepth, l + returnDepth])
        b.line('crease', 'body', [x - p.tabWidth / 2, y], [x + p.tabWidth / 2, y]);
    for (const y of [gap * 2, l - gap * 2])
      for (const x of [w / 3, (2 * w) / 3]) slot(b, 'body', x, y, p.tabWidth, gap);
    tearStrip(
      b,
      'body',
      [w + h + w + p.sealWidth, 0],
      [w + h + w + p.sealWidth, l],
      p.tearWidth,
      true,
    );
    return finish(b);
  },
  [
    'מעטפת בעלת דפנות קצה כפולות, מכסה מחובר וכנפי אבק; שתי רצועות הדבקה סביב רצועת פתיחה. פסי הדבקה עצמם אינם קווי חיתוך; רוחבם נכלל במידת הכנף.',
  ],
  (p) =>
    p.H >= Math.min(p.L, p.W) / 2 ||
    p.lip >= p.W / 5 ||
    p.tabWidth >= p.W / 4 ||
    2 * p.sealWidth + p.tearWidth >= p.W / 2
      ? [error('H', 'דפנות הקצה והשפות גדולות מדי למעטפת.')]
      : [],
);
add(
  '0886',
  121,
  [
    L,
    W,
    { ...H, default: 100 },
    glue,
    tab,
    f('bottomBevel', 'שיפוע כנף תחתית', 12, 'special'),
    seal,
    tear,
    t,
    clearance,
  ],
  (p) => {
    const l = p.L + p.t,
      band = 2 * p.sealWidth + p.tearWidth;
    const g = automaticBase({ ...p, lip: band }, 'B', 'tuck');
    return amend(g, (b) =>
      tearStrip(b, 'body', [p.glue, p.sealWidth], [p.glue + l, p.sealWidth], p.tearWidth),
    );
  },
  [
    'גוף ארבע-דפני, תחתית אוטומטית עם כנף מלאה, כיסוי מחובר עם שתי רצועות הדבקה ופס פתיחה. מקור 0886 שונה מ־0887 בעל ארבע כנפי תחתית רגילות.',
  ],
  (p) =>
    p.bottomBevel >= p.W / 4 || p.tabWidth >= p.W / 4 || 2 * p.sealWidth + p.tearWidth >= p.W / 2
      ? [error('sealWidth', 'רצועות הסגירה או פרופיל התחתית גדולים מדי.')]
      : [],
);
add(
  '0887',
  122,
  [L, W, { ...H, default: 180 }, glue, seal, tear, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      band = 2 * p.sealWidth + p.tearWidth,
      gap = p.t + p.clearance;
    return panelShell(
      [l, w, l, w],
      h,
      p.glue,
      (i, len) => plain(len, i === 0 ? w + band : w / 2),
      (i, len) => plain(len, i === 0 ? w + p.sealWidth : w / 2),
      gap,
      (b, e) => {
        for (let i = 0; i < 4; i++) {
          b.line('crease', 'body', [e[i], 0], [e[i + 1], 0]);
          b.line('crease', 'body', [e[i], h], [e[i + 1], h]);
        }
        b.line('crease', 'body', [e[0], -w], [e[1], -w]);
        b.line('crease', 'body', [e[0], h + w], [e[1], h + w]);
        tearStrip(
          b,
          'body',
          [e[0], -w - p.sealWidth - p.tearWidth],
          [e[1], -w - p.sealWidth - p.tearWidth],
          p.tearWidth,
        );
      },
    );
  },
  [
    'ארבע כנפי קצה רגילות, כיסוי עליון מלא עם פס פתיחה ורצועות הדבקה, וכנף תחתית מלאה בעלת פס הדבקה. פסי ההדבקה מוגדרים במידות אך אינם שכבת חיתוך.',
  ],
  (p) =>
    2 * p.sealWidth + p.tearWidth >= p.W / 2
      ? [error('sealWidth', 'פסי הסגירה רחבים מדי ביחס לכנף.')]
      : [],
);
