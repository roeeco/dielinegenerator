import { useEffect, useState } from 'react';
import { Box, ArrowUpLeft } from 'lucide-react';
import { findEntry } from './catalog';
import { Catalog } from './ui/Catalog';
import { Editor } from './ui/Editor';
function currentCode() {
  try {
    return decodeURIComponent(window.location.hash.replace(/^#\/?model\//, ''));
  } catch {
    return '';
  }
}
export default function App() {
  const [code, setCode] = useState(currentCode);
  useEffect(() => {
    const update = () => {
      setCode(currentCode());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const entry = findEntry(code);
  const back = () => {
    window.location.hash = '';
  };
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="פריסה — חזרה לקטלוג">
            <span className="brand-icon">
              <Box size={23} strokeWidth={1.6} />
            </span>
            <strong>פריסה</strong>
            <span className="brand-divider" />
            <span className="brand-subtitle">עורך פריסות FEFCO</span>
          </a>
          <span className="header-label">
            מאריזה לרעיון. מרעיון לפריסה.
            <ArrowUpLeft size={15} />
          </span>
        </div>
      </header>
      {entry ? (
        <Editor key={code} entry={entry} initialCode={code} onBack={back} />
      ) : (
        <Catalog
          onSelect={(e) => {
            window.location.hash = `/model/${encodeURIComponent(e.generatorId === '0982' ? '0982' : e.code)}`;
          }}
        />
      )}
      <footer className="site-footer">
        <span>פריסה · כלי לתכנון אריזות</span>
        <p>
          איורי הקטלוג: © FEFCO 2022. נדרשת הרשאה להפצה ציבורית. מחוללי בטא מחייבים בדיקת הרכבה.
        </p>
        <span dir="ltr">SVG · 1:1 · mm</span>
      </footer>
    </>
  );
}
