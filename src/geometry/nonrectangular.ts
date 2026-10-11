import { GeometryBuilder } from './primitives';
import { pack } from './families/panels';
import type { GeneratorDefinition, ParameterField, Params, Point, ValidationIssue } from './types';
const field = (
  key: string,
  label: string,
  value: number,
  group: ParameterField['group'] = 'dimension',
  min = 5,
  max = 2000,
  step = 1,
): ParameterField => ({
  key,
  label,
  default: value,
  group,
  min,
  max,
  step,
  unit: key === 'closureVariant' ? 'סוג' : 'מ״מ',
});
const t = field('t', 'עובי חומר', 1, 'material', 0.1, 5, 0.1);
const glue = field('glue', 'לשונית הדבקה', 12, 'special', 2, 100);
const spacing = field('spacing', 'רווח בין חלקים', 10, 'material', 2, 100);
const error = (field: string, message: string): ValidationIssue => ({
  field,
  message,
  severity: 'error',
});
const beta =
  'דגם ניסיוני לפי שרטוט המקור; יש לבצע חיתוך ניסיון ובדיקת הרכבה. קיזוזי החומר הם התחלתיים.';
export const bookSources: Record<string, { pages: number[]; nameHe: string; canonicalId: string }> =
  {
    'SPD-pillow-pack': {
      pages: [305, 306],
      nameHe: 'אריזת כרית — הדבקה או לשונית',
      canonicalId: 'spd:pillow-pack',
    },
    'SPD-hexagonal-ring-box': {
      pages: [299],
      nameHe: 'קופסת טבעת משושה',
      canonicalId: 'spd:hexagonal-ring-box',
    },
  };
// Adaptive sampling of a quadratic crease: at most 0.01 mm chord error.
function curve(a: Point, c: Point, z: Point): Point[] {
  const n = Math.max(
    8,
    Math.ceil(Math.sqrt(Math.hypot(a[0] - 2 * c[0] + z[0], a[1] - 2 * c[1] + z[1]) / 0.04)),
  );
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [
      (1 - u) ** 2 * a[0] + 2 * u * (1 - u) * c[0] + u * u * z[0],
      (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * c[1] + u * u * z[1],
    ] as Point;
  });
}
function notchedCurve(a: Point, c: Point, z: Point, direction: number): Point[] {
  const pts = curve(a, c, z),
    mid = (a[1] + z[1]) / 2,
    r = Math.min(Math.abs(c[0] - a[0]) / 6, Math.abs(z[1] - a[1]) / 10);
  return pts.map(([x, y]) => [
    x + (Math.abs(y - mid) < r ? direction * r * Math.cos((((y - mid) / r) * Math.PI) / 2) : 0),
    y,
  ]);
}
function pillow(p: Params) {
  const b = new GeometryBuilder(),
    l = p.L + p.t,
    w = p.W + p.t,
    d = p.curveDepth,
    joint = p.glue;
  if (p.closureVariant === 0) {
    const outline: Point[] = [
      [d, 0],
      [d + l, 0],
      [d + l + joint / 2, joint],
    ];
    outline.push(
      ...curve([d + l, joint], [d + l + 2 * d, joint + w / 2], [d + l, joint + w]).slice(1),
    );
    // The second panel has integrated thumb notches, rather than an extra overlapping cut.
    outline.push(
      ...notchedCurve(
        [d + l, joint + w],
        [d + l + 2 * d, joint + 1.5 * w],
        [d + l, joint + 2 * w],
        -1,
      ).slice(1),
    );
    outline.push([d, joint + 2 * w]);
    outline.push(
      ...notchedCurve([d, joint + 2 * w], [d - 2 * d, joint + 1.5 * w], [d, joint + w], 1).slice(1),
    );
    outline.push(...curve([d, joint + w], [d - 2 * d, joint + w / 2], [d, joint]).slice(1));
    b.part('body', 'כרית עם חיבור מודבק', outline);
    for (const y of [joint, joint + w]) b.line('crease', 'body', [d, y], [d + l, y]);
    for (const y of [joint, joint + w]) {
      b.path('crease', 'body', curve([d, y], [d + 2 * d, y + w / 2], [d, y + w]));
      b.path('crease', 'body', curve([d + l, y], [d + l - 2 * d, y + w / 2], [d + l, y + w]));
    }
  } else {
    const flap = p.tuckDepth,
      tab = p.tabWidth,
      y = flap + w;
    const outline: Point[] = [
      [d, 0],
      [(l + 2 * d - tab) / 2, 0],
      [(l + 2 * d - tab) / 2, -joint / 2],
      [(l + 2 * d + tab) / 2, -joint / 2],
      [(l + 2 * d + tab) / 2, 0],
      [d + l, 0],
      [d + l, flap],
      [d + l + d, flap + d],
      [d + l + d, flap + w - d],
      [d + l, y],
      [d + l, y + w],
      [d, y + w],
      [d, y],
      [0, flap + w - d],
      [0, flap + d],
      [d, flap],
    ];
    b.part('body', 'כרית עם לשונית סגירה', outline);
    for (const yy of [flap, y]) b.line('crease', 'body', [d, yy], [d + l, yy]);
    b.line('crease', 'body', [(l + 2 * d - tab) / 2, 0], [(l + 2 * d + tab) / 2, 0]);
    b.path('cut', 'body', [
      [(l + 2 * d - tab) / 2, y + w - joint / 2 - 2],
      [(l + 2 * d - tab) / 2 + 2, y + w - joint / 2],
      [(l + 2 * d + tab) / 2 - 2, y + w - joint / 2],
      [(l + 2 * d + tab) / 2, y + w - joint / 2 - 2],
    ]);
    for (const side of [0, 1])
      b.path(
        'crease',
        'body',
        curve(
          [d + side * l, flap],
          [d + side * l + (side ? -2 : 2) * d, flap + w / 2],
          [d + side * l, y],
        ),
      );
  }
  return pack([b.finish()], 0);
}
// Walk a polygon edge and, where needed, insert a tapered gluing flange.
function edgeWithTab(b: GeometryBuilder, id: string, a: Point, z: Point, depth: number): Point[] {
  const dx = z[0] - a[0],
    dy = z[1] - a[1],
    len = Math.hypot(dx, dy),
    nx = dy / len,
    ny = -dx / len,
    inset = Math.min(depth / 3, len / 5);
  b.line('crease', id, a, z);
  return [
    [a[0] + (dx / len) * inset + nx * depth, a[1] + (dy / len) * inset + ny * depth],
    [z[0] - (dx / len) * inset + nx * depth, z[1] - (dy / len) * inset + ny * depth],
    z,
  ];
}
function ring(p: Params) {
  const s = p.sideLength + p.t,
    h = p.H + p.t,
    a = (Math.sqrt(3) * s) / 2,
    d = p.lidDepth,
    b = new GeometryBuilder();
  // Counterclockwise top cap traversal; reverse the flange normal to point outwards.
  const cap: Point[] = [
    [0, 0],
    [-s / 2, -a],
    [0, -2 * a],
    [s, -2 * a],
    [1.5 * s, -a],
    [s, 0],
  ];
  const top: Point[] = [cap[0]];
  for (let i = 0; i < 5; i++) {
    if ([0, 2, 4].includes(i)) {
      const pts = edgeWithTab(b, 'body', cap[i + 1], cap[i], d)
        .slice(0, -1)
        .reverse();
      top.push(...pts, cap[i + 1]);
    } else top.push(cap[i + 1]);
  }
  const bottom = top.map(([x, y]) => [x, h - y] as Point).reverse();
  const outline: Point[] = [[-s, 0], ...top, [2 * s, 0], [2 * s, h], ...bottom, [-s, h]];
  b.part('body', 'שני מכסים משושים ושלוש דפנות', outline);
  for (const x of [0, s]) b.line('crease', 'body', [x, 0], [x, h]);
  for (const y of [0, h]) b.line('crease', 'body', [0, y], [s, y]);
  // Mirror only the top cap flange folds into the lower cap.
  const topFolds = b.paths.filter(
    (path) => path.kind === 'crease' && path.points.every((pt) => pt[1] <= 0),
  );
  for (const path of topFolds)
    if (path.points.some((pt) => pt[1] < 0))
      b.path(
        'crease',
        'body',
        path.points.map(([x, y]) => [x, h - y]),
      );
  const c = new GeometryBuilder(),
    g = p.glue;
  c.part('belt', 'שלוש דפנות משלימות', [
    [0, 0],
    [g, 0],
    [g, -d],
    [g + s, -d],
    [g + s, 0],
    [g + 2 * s, 0],
    [g + 2 * s, -d],
    [g + 3 * s, -d],
    [g + 3 * s, 0],
    [2 * g + 3 * s, 0],
    [2 * g + 3 * s, h],
    [g + 3 * s, h],
    [g + 3 * s, h + d],
    [g + 2 * s, h + d],
    [g + 2 * s, h],
    [g + s, h],
    [g + s, h + d],
    [g, h + d],
    [g, h],
    [0, h],
  ]);
  for (const x of [g, g + s, g + 2 * s, g + 3 * s]) c.line('crease', 'belt', [x, 0], [x, h]);
  for (const x of [g, g + 2 * s])
    for (const y of [0, h]) c.line('crease', 'belt', [x, y], [x + s, y]);
  return pack([b.finish(), c.finish()], p.spacing);
}
function octagonalTray(p: Params) {
  const b = new GeometryBuilder(),
    l = p.L + p.t,
    w = p.W + p.t,
    c = p.corner,
    h = p.H + p.t;
  const poly: Point[] = [
    [c, 0],
    [l - c, 0],
    [l, c],
    [l, w - c],
    [l - c, w],
    [c, w],
    [0, w - c],
    [0, c],
  ];
  const outline: Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = poly[i],
      z = poly[(i + 1) % 8],
      dx = z[0] - a[0],
      dy = z[1] - a[1],
      len = Math.hypot(dx, dy),
      nx = dy / len,
      ny = -dx / len;
    const u: Point = [a[0] + nx * h, a[1] + ny * h],
      v: Point = [z[0] + nx * h, z[1] + ny * h];
    if (i % 2 === 1) {
      const ear = Math.min(h / 3, len / 6),
        ex = (dx / len) * ear,
        ey = (dy / len) * ear;
      outline.push(a, [u[0] - ex, u[1] - ey], u, v, [v[0] + ex, v[1] + ey]);
    } else outline.push(a, u, v);
    b.line('crease', 'body', a, z);
    if (i % 2 === 1) {
      // Diagonal corner walls fold down first; their ends carry glue ears.
      b.line('crease', 'body', a, u);
      b.line('crease', 'body', z, v);
    }
  }
  b.part('body', 'מגש מתומן', outline);
  return pack([b.finish()], 0);
}
function polygonTube(p: Params) {
  const b = new GeometryBuilder(),
    s = (p.L + p.t) / (1 + Math.sqrt(2)),
    h = p.H + p.t,
    v = p.v,
    g = p.glue;
  b.part('body', 'שרוול מתומן עם תמיכות פינה', [
    [0, v],
    [g, v],
    [g, 0],
    [g + 8 * s, 0],
    [g + 8 * s, v],
    [g + 8 * s, v + h],
    [0, v + h],
  ]);
  for (let i = 0; i < 8; i++) {
    const x = g + i * s;
    b.line('crease', 'body', [x, v], [x, v + h]);
    b.line('crease', 'body', [x, v], [x + s, v]);
    if (i < 7) b.line('cut', 'body', [x + s, 0], [x + s, v]);
  }
  // Four corner supports remain attached along the bottom edge. Only the top
  // of each U is cut; its sides and centre are creased, as in the source.
  for (const i of [1, 3, 5, 7]) {
    const x = g + i * s,
      half = s / 4;
    b.line('cut', 'body', [x - half, v + h - v], [x + half, v + h - v]);
    for (const xx of [x - half, x + half]) b.line('crease', 'body', [xx, h], [xx, v + h]);
  }
  const pad = new GeometryBuilder(),
    r = (p.L + p.t) / (2 * Math.cos(Math.PI / 8)) - p.fit;
  pad.part(
    'base',
    'בסיס מתומן',
    Array.from(
      { length: 8 },
      (_, i) =>
        [r * Math.cos(((i + 0.5) * Math.PI) / 4), r * Math.sin(((i + 0.5) * Math.PI) / 4)] as Point,
    ),
  );
  return pack([b.finish(), pad.finish()], p.spacing);
}
export const nonrectangularGenerators: Record<string, GeneratorDefinition> = {
  'SPD-pillow-pack': {
    id: 'SPD-pillow-pack',
    fields: [
      field('L', 'אורך בין קצות הקשת', 160),
      field('W', 'רוחב לוח מפותח', 80),
      field('curveDepth', 'עומק קשת', 18, 'special'),
      field('tuckDepth', 'עומק כנף לסגירת לשונית', 65, 'special'),
      field('tabWidth', 'רוחב לשונית סגירה', 30, 'special'),
      field('closureVariant', 'סגירה: 0 הדבקה, 1 לשונית', 0, 'special', 0, 1),
      glue,
      t,
    ],
    notes: [
      beta,
      'עמודים 305–306. W הוא רוחב הלוח המפותח; עומק הקשת קובע את צורת הכרית. אין הנחת גובה פנימי מלבני.',
      'במצב הדבקה עומק הכנף ורוחב הלשונית אינם בשימוש.',
    ],
    generate: pillow,
    validate: (p) => [
      ...(!Number.isInteger(p.closureVariant) ? [error('closureVariant', 'בחרו 0 או 1.')] : []),
      ...(p.curveDepth >= Math.min(p.L / 3, p.W / 3)
        ? [error('curveDepth', 'הקשת חייבת להיות קטנה משליש אורך ורוחב הלוח.')]
        : []),
      ...(p.closureVariant === 1 &&
      (p.tabWidth >= p.L / 2 || p.tuckDepth <= p.glue || p.W <= 2 * p.curveDepth)
        ? [error('tabWidth', 'נדרש מקום ללשונית ולקשתות הסגירה.')]
        : []),
    ],
  },
  'SPD-hexagonal-ring-box': {
    id: 'SPD-hexagonal-ring-box',
    fields: [
      field('sideLength', 'אורך צלע משושה', 60),
      field('H', 'גובה טבעת', 30),
      field('lidDepth', 'עומק שפת מכסה', 10, 'special'),
      glue,
      t,
      spacing,
    ],
    notes: [
      beta,
      'עמוד 299. שני מכסים משושים ושלוש דפנות מחוברים; שלוש דפנות משלימות מודבקות בנפרד. אינו שרוול מצולע עם בסיס נפרד.',
    ],
    generate: ring,
    validate: (p) =>
      p.lidDepth >= Math.min(p.sideLength / 3, p.H / 2) || p.glue >= Math.min(p.sideLength, p.H) / 2
        ? [error('lidDepth', 'שפת המכסה חייבת להיות קטנה משליש צלע ומחצי הגובה.')]
        : [],
  },
  '0459': {
    id: '0459',
    fields: [
      field('L', 'אורך בסיס', 200),
      field('W', 'רוחב בסיס', 140),
      field('H', 'גובה דופן', 18),
      field('corner', 'קטימת פינה', 40, 'special'),
      t,
    ],
    notes: [
      beta,
      'FEFCO 0459, עמוד 66; מקור מקביל בספר בעמוד 130. בסיס מתומן מוארך עם דפנות וקיפולי קצה בפינות. יש לבדוק חיבור פינות בהרכבה.',
    ],
    generate: octagonalTray,
    validate: (p) =>
      p.corner >= Math.min(p.L, p.W) / 2 || p.H + p.t >= p.corner / Math.sqrt(2)
        ? [
            error(
              'corner',
              'קטימת הפינה חייבת להיות קטנה מחצי הבסיס וגדולה מגובה הדופן כפול שורש 2.',
            ),
          ]
        : [],
  },
  '0858': {
    id: '0858',
    fields: [
      field('L', 'רוחב מתומן בין דפנות מקבילות', 140),
      field('H', 'גובה שרוול', 160),
      field('v', 'עומק תמיכות פינה ושפה', 15, 'special'),
      field('fit', 'מרווח בסיס רדיאלי', 1, 'material', 0.1, 5, 0.1),
      glue,
      t,
      spacing,
    ],
    notes: [
      beta,
      'FEFCO 0858: שמונה דפנות, כנפי שפה עליונות, ארבע תמיכות פינה ובסיס מתומן נפרד. להבדיל מ־0859 ללא תמיכות הפינה.',
    ],
    generate: polygonTube,
    validate: (p) =>
      p.v >= Math.min(p.L / (2 * (1 + Math.sqrt(2))), p.H / 3)
        ? [error('v', 'הלשוניות חייבות להיות קטנות מחצי צלע ומשליש גובה.')]
        : [],
  },
};
export const nonrectangularSources: Record<string, number> = { '0459': 66, '0858': 116 };
