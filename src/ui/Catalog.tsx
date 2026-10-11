import { useMemo, useState } from 'react';
import { ArrowLeft, Search, X, SlidersHorizontal, Box, BookOpen } from 'lucide-react';
import {
  assetUrl,
  availableCount,
  catalog,
  categories,
  sourceCatalog,
  type CatalogEntry,
} from '../catalog';
export function Catalog({ onSelect }: { onSelect: (entry: CatalogEntry) => void }) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('all'),
    [available, setAvailable] = useState(false);
  const entries = useMemo(
    () =>
      catalog.filter(
        (e) =>
          (category === 'all' || e.category === category) &&
          (!available || !!e.generatorId) &&
          (e.code.includes(search.trim()) ||
            e.nameHe.includes(search.trim()) ||
            (e.generatorId === '0982' && /^09(8[2-9]|9[0-9])$/.test(search.trim()))),
      ),
    [search, category, available],
  );
  return (
    <main className="catalog-page">
      <div className="catalog-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            קטלוג האריזות
          </div>
          <h1>
            כל אריזה מתחילה <span>בפריסה טובה.</span>
          </h1>
          <p>בחרו דגם, התאימו מידות וצרו פריסת חיתוך מדויקת במילימטרים.</p>
        </div>
        <div className="catalog-stat">
          <strong>{sourceCatalog.length}</strong>
          <span>דגמים בספר FEFCO</span>
          <small>מהדורה 12 · 2022</small>
        </div>
      </div>
      <div className="catalog-tools">
        <div className="search-field">
          <Search size={19} />
          <input
            aria-label="חיפוש לפי קוד או שם"
            placeholder="חיפוש לפי קוד או שם…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="icon-button" aria-label="ניקוי חיפוש" onClick={() => setSearch('')}>
              <X size={16} />
            </button>
          )}
          <span className="search-hint" dir="ltr">
            0201
          </span>
        </div>
        <label className="availability-filter">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          <span className="switch" />
          <span>דגמים עם מחולל</span>
          <span className="count-badge">{availableCount}</span>
        </label>
      </div>
      <nav className="category-tabs" aria-label="קטגוריות אריזה">
        <button
          aria-pressed={category === 'all'}
          className={category === 'all' ? 'active' : ''}
          onClick={() => setCategory('all')}
        >
          כל הדגמים
        </button>
        {categories.map(([code, name]) => (
          <button
            key={code}
            aria-pressed={category === code}
            className={category === code ? 'active' : ''}
            onClick={() => setCategory(code)}
          >
            <span dir="ltr">{code}</span>
            {name}
          </button>
        ))}
      </nav>
      <div className="results-heading">
        <div>
          <h2>
            {category === 'all' ? 'הדגם הבא שלכם' : categories.find((c) => c[0] === category)?.[1]}
          </h2>
          <span>
            {entries.length} {entries.length === 1 ? 'תוצאה' : 'תוצאות'}
          </span>
        </div>
        <span className="catalog-help">
          <SlidersHorizontal size={15} /> מחוללי בטא לחיתוך ניסיון
        </span>
      </div>
      {entries.length > 0 ? (
        <div className="catalog-grid">
          {entries.map((entry, index) => (
            <button
              key={entry.code}
              className="model-card"
              onClick={() => onSelect(entry)}
              aria-label={`פתיחת דגם ${entry.code}`}
            >
              <div className="model-image">
                <img
                  src={assetUrl(entry.thumbnail)}
                  alt={`איור מורכב של דגם ${entry.code}`}
                  loading={index < 15 ? 'eager' : 'lazy'}
                />
                {entry.generatorId && <span className="model-status">בטא · SVG</span>}
              </div>
              <div className="model-info">
                <div>
                  <strong dir="ltr">{entry.code}</strong>
                  <span>{entry.nameHe}</span>
                </div>
                <ArrowLeft size={18} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h3>לא נמצאו דגמים</h3>
          <p>נסו קוד אחר או הרחיבו את הסינון.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setAvailable(false);
            }}
          >
            איפוס מסננים
          </button>
        </div>
      )}
      <div className="catalog-bottom">
        <div>
          <Box size={19} />
          <span>324 דגמים מאוירים + משפחת מחיצות פרמטרית אחת</span>
        </div>
        <div>
          <BookOpen size={17} />
          <span>FEFCO Code · 12th Edition</span>
        </div>
      </div>
    </main>
  );
}
