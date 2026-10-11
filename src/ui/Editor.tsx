import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Download,
  Info,
  RotateCcw,
  FileImage,
  ExternalLink,
} from 'lucide-react';
import { assetUrl, categories, type CatalogEntry } from '../catalog';
import { defaultParams, effectiveCode, generators } from '../geometry/registry';
import { generateValidated } from '../geometry/validate';
import { downloadSvg, svgFilename } from '../export/svg';
import type { Params } from '../geometry/types';
import { DimensionFields } from './DimensionFields';
import { DielinePreview } from './DielinePreview';
export function Editor({
  entry,
  initialCode,
  onBack,
}: {
  entry: CatalogEntry;
  initialCode?: string;
  onBack: () => void;
}) {
  const definition = entry.generatorId ? generators[entry.generatorId] : null;
  const [params, setParams] = useState<Params>(() => {
    const defaults = definition ? defaultParams(definition) : {};
    if (entry.generatorId === '0982' && initialCode && /^09(8[2-9]|9[0-9])$/.test(initialCode)) {
      defaults.N = Number(initialCode) - 980;
      defaults.rows = Math.min(defaults.rows, defaults.N - 1);
    }
    return defaults;
  });
  const [downloadError, setDownloadError] = useState('');
  const result = useMemo(
    () => (definition ? generateValidated(definition.id, params) : null),
    [definition, params],
  );
  const code =
    definition && Number.isFinite(params.N) ? effectiveCode(definition.id, params) : entry.code;
  const category = categories.find((c) => c[0] === entry.category)?.[1];
  const update = (key: string, value: number) => {
    setDownloadError('');
    setParams((p) => ({ ...p, [key]: value }));
  };
  return (
    <main className="editor-page">
      <button className="back-button" onClick={onBack}>
        <ArrowRight size={17} />
        בחירת דגם אחר
      </button>
      <div className="editor-heading">
        <div>
          <div className="eyebrow">
            {category}
            <span>/</span>
            <b dir="ltr">
              {entry.sourceDocument ? '' : 'FEFCO '}
              {code}
            </b>
          </div>
          <h1>{entry.nameHe}</h1>
        </div>
        <img src={assetUrl(entry.thumbnail)} alt={`איור מקור ${entry.code}`} />
      </div>
      {definition ? (
        <div className="editor-layout">
          <aside className="parameter-panel">
            <div className="panel-title">
              <h2>מידות הדגם</h2>
              <button
                className="icon-button"
                aria-label="איפוס מידות"
                title="איפוס מידות"
                onClick={() => setParams(defaultParams(definition))}
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <p className="panel-caption">מידות הדגם · במילימטרים</p>
            <DimensionFields
              fields={definition.fields.filter((f) => f.group === 'dimension')}
              params={params}
              onChange={update}
              issues={result?.issues ?? []}
            />
            {definition.fields.some((f) => f.group === 'special') && (
              <div className="special-fields">
                <h3>הגדרות הדגם</h3>
                <DimensionFields
                  fields={definition.fields.filter(
                    (f) =>
                      f.group === 'special' &&
                      !(
                        definition.id === 'SPD-pillow-pack' &&
                        params.closureVariant === 0 &&
                        ['tuckDepth', 'tabWidth'].includes(f.key)
                      ),
                  )}
                  params={params}
                  onChange={update}
                  issues={result?.issues ?? []}
                />
              </div>
            )}
            {definition.fields.some((f) => f.group === 'material') && (
              <details className="material-settings">
                <summary>
                  הגדרות חומר והתאמה
                  <ChevronDown size={16} />
                </summary>
                <DimensionFields
                  fields={definition.fields.filter((f) => f.group === 'material')}
                  params={params}
                  onChange={update}
                  issues={result?.issues ?? []}
                />
              </details>
            )}
            {result?.issues
              .filter((i) => !i.field)
              .map((i, index) => (
                <p className="field-error" role="alert" key={index}>
                  {i.message}
                </p>
              ))}
            {result?.issues.some(
              (i) =>
                i.field && definition.fields.find((f) => f.key === i.field)?.group === 'material',
            ) && (
              <p className="field-error" role="alert">
                יש לתקן את הקלט בהגדרות החומר.
              </p>
            )}
            <div className="export-block">
              <button
                className="primary-button"
                disabled={!result?.geometry}
                onClick={() => {
                  try {
                    downloadSvg(definition.id, params);
                  } catch {
                    setDownloadError('הייצוא נכשל. בדקו את המידות ונסו שוב.');
                  }
                }}
              >
                <Download size={18} />
                הורדת SVG
              </button>
              <p>קובץ וקטורי · קנה מידה 1:1 · מ״מ</p>
              {result?.geometry && (
                <span className="export-filename" dir="ltr">
                  {svgFilename(definition.id, params)}
                </span>
              )}
              {downloadError && (
                <p role="alert" className="field-error">
                  {downloadError}
                </p>
              )}
            </div>
          </aside>
          <section className="drawing-panel">
            {result?.geometry ? (
              <>
                <DielinePreview geometry={result.geometry} />
                <div className="drawing-summary">
                  <div>
                    <span>מידות המשטח הפרוס</span>
                    <strong dir="ltr" data-testid="blank-size">
                      {Number(result.geometry.boundsMm.width.toFixed(2))} ×{' '}
                      {Number(result.geometry.boundsMm.height.toFixed(2))} <small>mm</small>
                    </strong>
                  </div>
                  <div>
                    <span>חלקים בפריסה</span>
                    <strong>{result.geometry.parts.length}</strong>
                  </div>
                  <div>
                    <span>סטטוס הדגם</span>
                    <strong className="beta-label">בטא · לחיתוך ניסיון</strong>
                  </div>
                </div>
                {result.geometry.parts.length > 1 && (
                  <p className="part-list">
                    {result.geometry.parts.map((p) => p.nameHe).join(' · ')}
                  </p>
                )}
              </>
            ) : (
              <div className="invalid-preview">
                <FileImage size={36} />
                <h2>נדרשות מידות תקינות</h2>
                <p>תקנו את השדות המסומנים כדי להציג פריסה ולהוריד SVG.</p>
              </div>
            )}
            <div className="engineering-note">
              <Info size={18} />
              <div>
                <strong>לפני החיתוך</strong>
                <p>{definition.notes[0]}</p>
                <details>
                  <summary>הערות תכנון</summary>
                  {definition.notes.slice(1).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                  <p>
                    אדום: חיתוך. כחול: קיפול/סימון. בייצוא קווי הקיפול רציפים. יש להתאים בתוכנת
                    הלייזר את הצבעים לפעולות המכונה. לא מיושם פיצוי kerf אוטומטי.
                  </p>
                </details>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="reference-only">
          <div>
            <span className="reference-tag">דגם לעיון בלבד</span>
            <h2>הדגם הזה עוד בדרך לשולחן החיתוך.</h2>
            <p>
              אפשר לעיין באיור המקור. יצירת פריסה וייצוא SVG יהיו זמינים לאחר מימוש ובדיקת מחולל
              ייעודי לדגם.
            </p>
            <button className="secondary-button" onClick={onBack}>
              בחירת דגם עם מחולל
              <ArrowRight size={16} />
            </button>
          </div>
          <img src={assetUrl(entry.thumbnail)} alt={`איור מקור FEFCO ${entry.code}`} />
        </section>
      )}
      <details className="source-reference">
        <summary>
          מקור הדגם · {entry.sourceDocument ?? 'FEFCO 2022'} · עמוד{' '}
          {entry.detailPage ?? entry.sourcePage}
          <ChevronDown size={16} />
        </summary>
        <p>
          {entry.sourceDocument
            ? 'עיצוב לפי Structural Package Designs, Haresh Pathak, The Pepin Press. איור התצוגה נוצר מהמחולל; אינו צילום מהספר.'
            : 'איור המקור הוא חומר עיון, ואינו חלק מקובץ החיתוך. © FEFCO 2022. כל הזכויות שמורות.'}
        </p>
        {entry.referenceImage && (
          <img src={assetUrl(entry.referenceImage)} alt={`שרטוט מקור של פריסת ${entry.code}`} />
        )}
        <a href={assetUrl('catalog/qa/index.html')} target="_blank" rel="noreferrer">
          דפי בקרת איכות של הקטלוג
          <ExternalLink size={14} />
        </a>
      </details>
    </main>
  );
}
