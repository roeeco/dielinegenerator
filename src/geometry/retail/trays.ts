import { GeometryBuilder } from '../primitives';
import type { Point, Params } from '../types';
import {
  add,
  L,
  W,
  H,
  v,
  t,
  clearance,
  glue,
  lip,
  tab,
  f,
  error,
  clean,
  finish,
  slot,
  receiver,
  panelShell,
  plain,
  clipped,
} from './common';
const trayCodes = ['0802', '0803', '0804', '0808', '0809', '0815', '0816', '0817'] as const;
const pages: Record<string, number> = {
  '0802': 106,
  '0803': 106,
  '0804': 107,
  '0808': 107,
  '0809': 107,
  '0815': 108,
  '0816': 108,
  '0817': 108,
};
function displayTray(p: Params, code: string) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    front = p.v + p.t,
    gap = p.t + p.clearance,
    b = new GeometryBuilder();
  const roots: Point[] = [
      [0, 0],
      [l, 0],
      [l, w],
      [0, w],
    ],
    lengths = [l, w, l, w];
  const heights =
    code === '0804'
      ? [
          [h, h],
          [h, h],
          [h, h],
          [h, h],
        ]
      : [
          [h, h],
          [h, front],
          [front, front],
          [front, h],
        ];
  const rolled =
    code === '0802'
      ? [true, false, true, false]
      : code === '0808' || code === '0816' || code === '0809'
        ? [false, true, true, true]
        : [true, true, true, true];
  const points: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const a = roots[i],
      z = roots[(i + 1) % 4],
      len = lengths[i],
      dx = (z[0] - a[0]) / len,
      dy = (z[1] - a[1]) / len,
      nx = dy,
      ny = -dx;
    const at = (u: number, d: number): Point => [a[0] + dx * u + nx * d, a[1] + dy * u + ny * d];
    const [hl, hr] = heights[i],
      offset = (u: number) => hl + ((hr - hl) * u) / len;
    const local: Point[] = [
      [0, 0],
      [0, hl],
    ];
    if (rolled[i]) {
      local.push([gap, hl + p.t], [gap, 2 * offset(gap) + p.t]);
      const fingers = code === '0815' && i % 2 === 1 ? 2 : 3;
      for (let k = 1; k <= fingers; k++) {
        const mid = (k * len) / (fingers + 1),
          a = mid - p.tabWidth / 2,
          z = mid + p.tabWidth / 2;
        local.push(
          [a, 2 * offset(a) + p.t],
          [a, 2 * offset(a) + p.t + p.lockDepth],
          [z, 2 * offset(z) + p.t + p.lockDepth],
          [z, 2 * offset(z) + p.t],
        );
        const inward = at(mid, -gap * 2);
        slot(
          b,
          'body',
          inward[0],
          inward[1],
          i % 2 ? gap : p.tabWidth + gap,
          i % 2 ? p.tabWidth + gap : gap,
        );
        // Slot above was centred a short distance inside the base, independent of flap cuts.
      }
      local.push([len - gap, 2 * offset(len - gap) + p.t], [len - gap, hr + p.t], [len, hr]);
      b.line('crease', 'body', at(0, hl), at(len, hr));
      b.line('crease', 'body', at(gap, offset(gap) + p.t), at(len - gap, offset(len - gap) + p.t));
    } else {
      if (i === 0 && (code === '0808' || code === '0809' || code === '0816')) {
        const ear = p.cornerEar;
        local.splice(1, 1, [-ear, code === '0809' ? gap : hl / 3], [-ear, hl * 0.7], [0, hl]);
        local.push([len, hr], [len + ear, hr * 0.7], [len + ear, hr / 3]);
        for (const u of [0, len]) b.line('crease', 'body', at(u, hl / 3), at(u, hl * 0.7));
      } else local.push([len, hr]);
    }
    local.push([len, 0]);
    points.push(...local.map(([u, d]) => at(u, d)));
    b.line('crease', 'body', a, z);
    if ((code === '0816' || code === '0809') && i % 2 === 1)
      b.line('crease', 'body', at(len / 2, 0), at(len / 2, offset(len / 2)));
    if (code === '0817' && i % 2 === 1)
      receiver(
        b,
        'body',
        at(len / 3, -p.tabWidth)[0],
        at(len / 3, -p.tabWidth)[1],
        p.tabWidth / 2,
        gap / 2,
      );
  }
  b.part('body', 'מגש תצוגה עם החזרות ונעילות', clean(points));
  return finish(b);
}
for (const code of trayCodes) {
  const ears = ['0808', '0809', '0816'].includes(code);
  add(
    code,
    pages[code],
    [
      L,
      W,
      { ...H, default: 70 },
      ...(code === '0804' ? [] : [v]),
      tab,
      f('lockDepth', 'גובה לשונית נעילה', 4, 'special', 1, 40),
      ...(ears ? [f('cornerEar', 'רוחב אוזן גב', 20, 'special')] : []),
      t,
      clearance,
    ],
    (p) => displayTray(code === '0804' ? { ...p, v: p.H } : p, code),
    [
      code === '0802'
        ? 'גב וחזית עם החזרות מלאות; דפנות צד משופעות ללא החזרה.'
        : code === '0803'
          ? 'גב גבוה, דפנות משופעות והחזרות צד; חזית נמוכה עם החזרה.'
          : code === '0804'
            ? 'ארבע דפנות בגובה אחיד, החזרות מלאות וחריצי בסיס בכל הצדדים.'
            : code === '0808'
              ? 'גב זקוף ללא החזרה עם אוזני פינה; צדדים וחזית מוחזרים.'
              : code === '0809'
                ? 'גב עם אוזני חיבור רחבות והחזרות צד פנימיות, חזית נעולה.'
                : code === '0815'
                  ? 'גב ושתי דפנות עם החזרות מלאות וחזית נמוכה נעולה.'
                  : code === '0816'
                    ? 'גב ואוזני פינה, החזרות צד עם קיפול אמצעי ושפה חזיתית.'
                    : 'גב מוחזר והחזרות צד משופעות עם חריצי קיבוע נוספים.',
    ],
    (p) => [
      ...(p.v && p.v >= p.H ? [error('v', 'גובה החזית חייב להיות קטן מגובה הגב.')] : []),
      ...(p.tabWidth >= Math.min(p.L, p.W) / 5
        ? [error('tabWidth', 'הלשוניות רחבות מדי לשורות הנעילה.')]
        : []),
      ...(p.lockDepth >= Math.min(p.H, p.v ?? p.H) / 3
        ? [error('lockDepth', 'הלשונית עמוקה מדי ביחס לדופן.')]
        : []),
      ...(p.cornerEar && p.cornerEar >= Math.min(p.W, p.H) / 2
        ? [error('cornerEar', 'אוזן הגב גדולה מדי.')]
        : []),
    ],
  );
}
add(
  '0801',
  106,
  [L, W, { ...H, default: 80 }, v, glue, lip, tab, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      gap = p.t + p.clearance;
    return panelShell(
      [l, w, l, w],
      h,
      p.glue,
      (i, len) => {
        if (i % 2 === 0)
          return [
            [0, 0],
            [0, h - p.v],
            [len / 3, h - p.v],
            [len, 0],
          ];
        return i === 1 ? plain(len, p.v + p.lip) : plain(len, h - p.v);
      },
      (i, len) =>
        i % 2
          ? clipped(len, w / 2, p.lip / 2)
          : [
              [0, 0],
              [p.lip / 3, w / 2],
              [len / 2 - p.tabWidth / 2, w / 2],
              [len / 2, w / 2 - p.lip],
              [len / 2 + p.tabWidth / 2, w / 2],
              [len - p.lip / 3, w / 2],
              [len, 0],
            ],
      gap,
      (b, e) => {
        for (let i = 0; i < 4; i++) {
          b.line('crease', 'body', [e[i], h], [e[i + 1], h]);
          if (i % 2 === 0)
            b.line('crease', 'body', [e[i + 1], h], [e[i] + (e[i + 1] - e[i]) / 2, h + w / 2]);
        }
        for (const y of [0, -p.v]) b.line('crease', 'body', [e[1], y], [e[2], y]);
        for (const x of [e[1] + w / 3, e[1] + (2 * w) / 3])
          slot(b, 'body', x, h + gap, p.tabWidth, gap);
      },
    );
  },
  ['גוף רציף ארבע-דפני עם קווי חיתוך צד משופעים, חזית מוחזרת ותחתית אוטומטית בעלת קיפולי אלכסון.'],
  (p) =>
    p.v >= p.H || p.lip >= p.W / 4 || p.tabWidth >= p.W / 4
      ? [error('v', 'בדקו גובה חזית, שפה ורוחב נעילה ביחס לגוף.')]
      : [],
);
