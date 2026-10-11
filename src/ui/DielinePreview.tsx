import { useEffect, useRef, useState } from 'react';
import { Maximize, Minus, Plus, Move } from 'lucide-react';
import { layers } from '../export/svg';
import type { Bounds, DielineGeometry, PathKind } from '../geometry/types';
type View = Bounds;
function fitted(g: DielineGeometry): View {
  const pad = Math.max(g.boundsMm.width, g.boundsMm.height) * 0.075;
  return {
    x: -pad,
    y: -pad,
    width: g.boundsMm.width + pad * 2,
    height: g.boundsMm.height + pad * 2,
  };
}
export function DielinePreview({ geometry }: { geometry: DielineGeometry }) {
  const [view, setView] = useState<View>(() => fitted(geometry));
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{ id: number; x: number; y: number; view: View } | null>(null);
  useEffect(() => {
    setView(fitted(geometry));
  }, [geometry]);
  const zoom = (factor: number) =>
    setView((v) => {
      const ratio = v.width / geometry.boundsMm.width;
      if (ratio * factor < 0.12 || ratio * factor > 8) return v;
      return {
        x: v.x + (v.width * (1 - factor)) / 2,
        y: v.y + (v.height * (1 - factor)) / 2,
        width: v.width * factor,
        height: v.height * factor,
      };
    });
  return (
    <div className="preview-container">
      <div className="preview-top">
        <span>תצוגת הפריסה</span>
        <span className="preview-live">
          <span />
          מתעדכנת בזמן אמת
        </span>
      </div>
      <svg
        ref={svg}
        className="dieline-canvas"
        role="img"
        aria-label="פריסת חיתוך במילימטרים"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        direction="ltr"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, view };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId || !svg.current) return;
          const rect = svg.current.getBoundingClientRect();
          const scale = Math.max(d.view.width / rect.width, d.view.height / rect.height);
          setView({
            ...d.view,
            x: d.view.x - (e.clientX - d.x) * scale,
            y: d.view.y - (e.clientY - d.y) * scale,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {geometry.paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            stroke={layers[path.kind].color}
            strokeWidth={path.kind === 'cut' ? 1.3 : 1.1}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={path.kind === 'crease' ? '5 4' : undefined}
          />
        ))}
      </svg>
      <div className="preview-bottom">
        <div className="line-legend">
          {(Object.keys(layers) as PathKind[])
            .filter((kind) => geometry.paths.some((path) => path.kind === kind))
            .map((kind) => (
              <span key={kind}>
                <i
                  className={
                    kind === 'crease' ? 'crease-line' : kind === 'cut' ? 'cut-line' : undefined
                  }
                  style={{ borderColor: layers[kind].color }}
                />
                {
                  {
                    cut: 'חיתוך',
                    crease: 'קיפול / סימון',
                    partial: 'חיתוך חלקי',
                    perforation: 'ניקוב',
                    tear: 'קו קריעה',
                  }[kind]
                }
              </span>
            ))}
        </div>
        <div className="zoom-controls" dir="ltr">
          <button aria-label="הקטנת תצוגה" onClick={() => zoom(1.25)}>
            <Minus size={17} />
          </button>
          <button aria-label="התאמת פריסה למסך" onClick={() => setView(fitted(geometry))}>
            <Maximize size={17} />
          </button>
          <button aria-label="הגדלת תצוגה" onClick={() => zoom(0.8)}>
            <Plus size={17} />
          </button>
        </div>
      </div>
      <div className="pan-hint">
        <Move size={13} />
        גררו להזזה · התצוגה מותאמת מחדש בשינוי מידה
      </div>
    </div>
  );
}
