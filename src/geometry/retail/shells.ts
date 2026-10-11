import { GeometryBuilder } from '../primitives';
import { profiledShell, ellipse } from '../families/profiled-shell';
import type { Point } from '../types';
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
  error,
  finish,
  panelShell,
  plain,
  clipped,
  slot,
  amend,
  receiver,
} from './common';
for (const code of ['0818', '0819'] as const)
  add(
    code,
    109,
    [L, W, { ...H, default: 160 }, v, glue, lip, tab, t, clearance],
    (p) => {
      const w = p.W + p.t,
        collar = p.v,
        depth = collar + w / 2;
      const top = Array.from({ length: 4 }, (_, i) => ({
        depth,
        fold: collar,
        kind: code === '0819' && i % 2 === 0 ? ('gable' as const) : ('plain' as const),
      }));
      const g = profiledShell(
        p,
        top,
        Array.from({ length: 4 }, () => ({ depth: w / 2, kind: 'tuck' as const })),
        false,
      );
      const edges = [
        p.glue,
        p.glue + p.L + p.t,
        p.glue + p.L + p.t + w,
        p.glue + 2 * (p.L + p.t) + w,
      ];
      return amend(g, (b) => {
        edges.forEach((x, i) => {
          const len = i % 2 ? w : p.L + p.t;
          for (const frac of [0.25, 0.75]) {
            const cx = x + len * frac;
            if (code === '0818' && i % 2 === 0) {
              b.path('cut', 'body', [
                [cx - p.tabWidth / 4, p.lip],
                [cx - p.tabWidth / 4, p.lip + p.lip / 2],
                [cx + p.tabWidth / 4, p.lip + p.lip / 2],
                [cx + p.tabWidth / 4, p.lip + p.lip / 4],
              ]);
              b.line('crease', 'body', [cx - p.tabWidth / 4, p.lip], [cx + p.tabWidth / 4, p.lip]);
            } else
              slot(
                b,
                'body',
                cx,
                depth - collar / 2,
                i % 2 ? p.t + p.clearance : p.tabWidth,
                i % 2 ? collar / 2 : p.t + p.clearance,
              );
          }
          receiver(b, 'body', x + len / 2, depth - collar, p.tabWidth, p.t + p.clearance);
        });
      });
    },
    [
      code === '0818'
        ? 'ארבע כנפי כיסוי עם צווארון מקופל ונעילות שחרור בצורת וו.'
        : 'כנפיים מרכזיות משולשות עם צווארון ושלוטי נעילה אנכיים בלוחות הקצה.',
    ],
    (p) =>
      p.v >= p.H / 2 || p.lip >= p.W / 5 || p.tabWidth >= Math.min(p.L, p.W) / 4
        ? [error('v', 'הצווארון והנעילות גדולים מדי ביחס ללוחות.')]
        : [],
  );
add(
  '0825',
  109,
  [L, W, H, glue, lip, tab, t, clearance],
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
        if (i === 0) return plain(len, w / 2);
        if (i === 1) {
          const pts: Point[] = [
            [0, 0],
            [0, l / 2],
          ];
          const arc = ellipse(len / 2, l / 2, len, l)
            .filter(([_, y]) => y >= l / 2)
            .sort((a, b) => a[0] - b[0]);
          pts.push(...arc, [len, l / 2], [len, 0]);
          return pts;
        }
        return clipped(len, w / 4, p.lip / 2);
      },
      (i, len) => (i === 2 ? plain(len, w) : clipped(len, w / 2, p.lip / 2)),
      gap,
      (b, e) => {
        for (let i = 0; i < 4; i++) b.line('crease', 'body', [e[i], h], [e[i + 1], h]);
        b.line('crease', 'body', [e[1], 0], [e[2], 0]);
        for (const x of [e[1] + w / 3, e[1] + (2 * w) / 3])
          b.line('crease', 'body', [x, 0], [x, -l / 2]);
        receiver(b, 'body', e[1] + w / 2, -l / 3, p.tabWidth, gap);
        for (const i of [1, 3])
          b.line('crease', 'body', [e[i], h], [e[i + 1] - p.lip / 2, h + w / 2]);
      },
    );
  },
  ['רביעיית דפנות עם כיסוי משיכה מעוגל בעל קיפולי צד, כנפי אבק קצרות ותחתית עם כנף מלאה.'],
  (p) =>
    p.lip >= p.W / 4 || p.tabWidth >= p.W / 3
      ? [error('lip', 'שפת הסגירה או רוחב המשיכה גדול מדי.')]
      : [],
);
add(
  '0826',
  110,
  [L, W, H, v, lip, t, clearance],
  (p) => {
    const l = p.L + p.t,
      w = p.W + p.t,
      h = p.H + p.t,
      front = p.v + p.t,
      b = new GeometryBuilder(),
      e = p.lip;
    b.part('body', 'תצוגת גב עם רגל וכנפי חזית', [
      [0, 0],
      [l, 0],
      [l, h],
      [l, h + 2 * w],
      [l + front, h + 2 * w + front / 4],
      [l + front, h + 2 * w + front],
      [l, h + 2 * w + front],
      [0, h + 2 * w + front],
      [-front, h + 2 * w + front],
      [-front, h + 2 * w + front / 4],
      [0, h + 2 * w],
      [0, h + w],
      [0, h],
    ]);
    for (const y of [h, h + w, h + 2 * w]) b.line('crease', 'body', [0, y], [l, y]);
    for (const x of [0, l]) {
      const direction = x ? 1 : -1;
      b.line('crease', 'body', [x, h + 2 * w], [x, h + 2 * w + front]);
      b.path('cut', 'body', [
        [x + (direction * e) / 3, h + 2 * w + front / 3],
        [x + (direction * e) / 3, h + 2 * w + e / 12 + p.t + p.clearance],
      ]);
    }
    for (const x of [e / 2, l - e / 2]) slot(b, 'body', x, h, p.t + p.clearance, 2 * e);
    return finish(b);
  },
  ['גב גבוה, בסיס בעל שני קיפולים ורגל תמיכה, חזית עם כנפי צד וחריצי קיבוע.'],
  (p) =>
    p.v >= p.H / 2 || p.lip >= Math.min(p.L, p.W) / 4
      ? [error('v', 'החזית והחריצים גדולים מדי.')]
      : [],
);
