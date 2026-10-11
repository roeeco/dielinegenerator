import { GeometryBuilder } from '../primitives';
import type { Params, Point } from '../types';
export type FlapProfile = {
  depth: number;
  kind?:
    | 'plain'
    | 'tuck'
    | 'notch'
    | 'snap-left'
    | 'snap-right'
    | 'snap-tongue'
    | 'gable'
    | 'handle'
    | 'wing'
    | 'header'
    | 'label';
  fold?: number;
  handle?: boolean;
  handleShape?: 'euro';
  centreSlot?: boolean;
  diagonalSlots?: boolean;
};
export function ellipse(cx: number, cy: number, width: number, height: number): Point[] {
  const n = Math.max(
    32,
    Math.ceil(Math.PI / Math.acos(1 - 0.01 / Math.max(width / 2, height / 2))),
  );
  return Array.from(
    { length: n },
    (_, i) =>
      [
        cx + (width / 2) * Math.cos((i * 2 * Math.PI) / n),
        cy + (height / 2) * Math.sin((i * 2 * Math.PI) / n),
      ] as Point,
  );
}
export function euroSlot(cx: number, cy: number, width: number, height: number): Point[] {
  const r = height,
    dx = (Math.sqrt(3) * r) / 2,
    cap = height / 2;
  const arc = (x: number, y: number, rad: number, a: number, z: number): Point[] => {
    const n = Math.max(8, Math.ceil(Math.abs(z - a) / (2 * Math.acos(1 - 0.01 / rad))));
    return Array.from(
      { length: n + 1 },
      (_, i) =>
        [
          x + rad * Math.cos(a + ((z - a) * i) / n),
          y + rad * Math.sin(a + ((z - a) * i) / n),
        ] as Point,
    );
  };
  return [
    [cx - width / 2 + cap, cy - cap],
    [cx - dx, cy - cap],
    ...arc(cx, cy, r, (7 * Math.PI) / 6, (11 * Math.PI) / 6).slice(1),
    [cx + width / 2 - cap, cy - cap],
    ...arc(cx + width / 2 - cap, cy, cap, -Math.PI / 2, Math.PI / 2).slice(1),
    [cx + dx, cy + cap],
    ...arc(cx, cy, r, Math.PI / 6, (5 * Math.PI) / 6).slice(1),
    [cx - width / 2 + cap, cy + cap],
    ...arc(cx - width / 2 + cap, cy, cap, Math.PI / 2, (3 * Math.PI) / 2).slice(1, -1),
  ];
}
/** Four crease-centre wall panels, each with a source-specific closure profile. */
export function profiledShell(
  p: Params,
  top: FlapProfile[],
  bottom: FlapProfile[],
  swapped = false,
  joinBottom = false,
) {
  const l = p.L + p.t,
    w = p.W + p.t,
    h = p.H + p.t,
    gap = p.t + p.clearance;
  const widths = swapped ? [w, l, w, l] : [l, w, l, w],
    edges = [p.glue];
  for (const width of widths) edges.push(edges[edges.length - 1] + width);
  const y0 = Math.max(...top.map((f) => f.depth)),
    b = new GeometryBuilder();
  function flap(i: number, spec: FlapProfile, y: number, sign: number): Point[] {
    const joined = joinBottom && sign === 1 && i > 0;
    const a = edges[i] + (i && !joined ? gap / 2 : 0),
      c = edges[i + 1] - (i < 3 && !(joinBottom && sign === 1 && i > 0) ? gap / 2 : 0),
      mid = (a + c) / 2,
      d = spec.depth;
    const at = (x: number, z: number): Point => [x, y + sign * z];
    if (!d) return [at(a, 0), at(c, 0)];
    let points: Point[] = [at(a, 0), at(a, d), at(c, d), at(c, 0)];
    const tab = p.tabWidth ?? (c - a) / 4,
      lock = p.lockDepth ?? 8,
      lip = p.lip ?? 12;
    if (spec.kind === 'tuck')
      points = [
        at(a, 0),
        at(a, d - lip),
        at(a + lip / 3, d),
        at(c - lip / 3, d),
        at(c, d - lip),
        at(c, 0),
      ];
    if (spec.kind === 'notch')
      points = [
        at(a, 0),
        at(a, d),
        at(mid - tab / 2, d),
        at(mid - tab / 2, d - lock),
        at(mid + tab / 2, d - lock),
        at(mid + tab / 2, d),
        at(c, d),
        at(c, 0),
      ];
    if (spec.kind === 'snap-left')
      points = [at(a, 0), at(mid, d - lock), at(mid, d), at(c, d), at(c, 0)];
    if (spec.kind === 'snap-right')
      points = [at(a, 0), at(a, d), at(mid, d), at(mid, d - lock), at(c, 0)];
    if (spec.kind === 'snap-tongue')
      points = [
        at(a, 0),
        at(mid - tab / 2, d - lock),
        at(mid - tab / 2, d),
        at(mid + tab / 2, d),
        at(mid + tab / 2, d - lock),
        at(c, 0),
      ];
    if (spec.kind === 'gable')
      points = [at(a, 0), at(mid - gap / 2, d), at(mid + gap / 2, d), at(c, 0)];
    if (spec.kind === 'handle')
      points = [at(a, 0), at(a, d - lip), at(a + lip, d), at(c - lip, d), at(c, d - lip), at(c, 0)];
    if (spec.kind === 'wing')
      points = [
        at(a, 0),
        at(a + lip, d / 2),
        at(a + lip / 2, d - lip),
        at(a + lip, d),
        at(c - lip, d),
        at(c - lip / 2, d - lip),
        at(c - lip, d / 2),
        at(c, 0),
      ];
    if (spec.kind === 'header') points = [at(a, 0), at(a, d), at(c, d), at(c, 0)];
    if (spec.kind === 'label') {
      const stem = p.tabWidth,
        base = w / 2 + lip,
        stemEnd = base + 2 * p.v;
      points = [
        at(a, 0),
        at(a, base),
        at(mid - stem / 2, base),
        at(mid - stem / 2, stemEnd),
        at(a, stemEnd),
        at(a, d),
        at(c, d),
        at(c, stemEnd),
        at(mid + stem / 2, stemEnd),
        at(mid + stem / 2, base),
        at(c, base),
        at(c, 0),
      ];
      for (const z of [base, base + p.v, stemEnd])
        b.line('crease', 'body', at(mid - stem / 2, z), at(mid + stem / 2, z));
      for (const z of [base + p.v / 2, base + 1.5 * p.v])
        b.path('cut', 'body', euroSlot(mid, y + sign * z, p.handleWidth, p.handleHeight), true);
    }
    b.line('crease', 'body', at(a, 0), at(c, 0));
    if (spec.fold) b.line('crease', 'body', at(a, spec.fold), at(c, spec.fold));
    if (spec.handle)
      b.path(
        'cut',
        'body',
        (spec.handleShape === 'euro' ? euroSlot : ellipse)(
          mid,
          y + sign * (d - (p.handleHeight / 2 + lip / 2)),
          p.handleWidth,
          p.handleHeight,
        ),
        true,
      );
    if (spec.kind === 'gable' && spec.centreSlot)
      points = [
        at(a, 0),
        at(mid - gap / 2, d),
        at(mid - gap / 2, gap),
        at(mid + gap / 2, gap),
        at(mid + gap / 2, d),
        at(c, 0),
      ];
    if (spec.centreSlot && spec.kind !== 'gable') {
      const end = d - lip;
      b.path('cut', 'body', [
        at(mid - gap / 2, 0),
        at(mid - gap / 2, end),
        at(mid + gap / 2, end),
        at(mid + gap / 2, 0),
      ]);
    }
    if (spec.diagonalSlots)
      for (const side of [-1, 1]) {
        const cx = mid + (side * (c - a)) / 4,
          z = d / 3,
          length = p.slotLength;
        const dx = length / Math.sqrt(2),
          dz = length / Math.sqrt(2);
        b.path('cut', 'body', [
          at(cx - (side * dx) / 2, z - dz / 2),
          at(cx + (side * dx) / 2, z + dz / 2),
        ]);
      }
    return points;
  }
  const outline: Point[] = [];
  for (let i = 0; i < 4; i++) outline.push(...flap(i, top[i], y0, -1));
  outline.push([edges[4], y0 + h]);
  for (let i = 3; i >= 0; i--) {
    if (joinBottom && i > 1) {
      flap(i, bottom[i], y0 + h, 1);
      continue;
    }
    if (joinBottom && i === 1) {
      flap(i, bottom[i], y0 + h, 1);
      outline.push(
        [edges[4], y0 + h + bottom[1].depth],
        [edges[1] + gap / 2, y0 + h + bottom[1].depth],
        [edges[1] + gap / 2, y0 + h],
      );
      for (const x of edges.slice(2, 4))
        b.line('crease', 'body', [x, y0 + h], [x, y0 + h + bottom[1].depth]);
    } else outline.push(...flap(i, bottom[i], y0 + h, 1).reverse());
  }
  const inset = Math.min(h / 5, p.glue / 3);
  outline.push([0, y0 + h - inset], [0, y0 + inset]);
  b.part(
    'body',
    'מעטפת עם סגירה ייעודית',
    outline.filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]),
  );
  for (const x of edges.slice(0, 4)) b.line('crease', 'body', [x, y0], [x, y0 + h]);
  return b.finish();
}
