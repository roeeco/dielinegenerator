import { retailNames } from '../geometry/retail/names';
import { bookSources } from '../geometry/nonrectangular';
import data from './fefco-catalog.json';
import { expandedSources } from '../geometry/expanded';
import { generators } from '../geometry/registry';
export type CatalogEntry = {
  code: string;
  sourceDocument?: string;
  category: string;
  nameHe: string;
  thumbnail: string;
  sourcePage: number;
  detailPage: number | null;
  referenceImage: string | null;
  previewStatus: string;
  status: 'reference' | 'beta' | 'verified';
  generatorId: string | null;
  requiredParams: string[];
  specialVariables: string[];
};
export const categories = [
  ['01', 'גלילים ויריעות'],
  ['02', 'קופסאות עם כנפיים'],
  ['03', 'קופסאות טלסקופיות'],
  ['04', 'מתקפלות ומגשים'],
  ['05', 'שרוולים ונשלפות'],
  ['06', 'קופסאות קשיחות'],
  ['07', 'מודבקות מראש'],
  ['08', 'קמעונאות ומסחר מקוון'],
  ['09', 'מחיצות ורכיבי פנים'],
  ['SP', 'עיצובים מהספר'],
] as const;
export const sourceCatalog: CatalogEntry[] = (data as CatalogEntry[]).map((entry) => {
  const definition = generators[entry.code];
  if (!definition) return entry;
  return {
    ...entry,
    generatorId: entry.code,
    nameHe: retailNames[entry.code] ?? entry.nameHe,
    status: 'beta',
    detailPage: expandedSources[entry.code] ?? entry.detailPage,
    referenceImage: `catalog/references/${entry.code}.webp`,
    requiredParams: definition.fields.map((f) => f.key),
    specialVariables: definition.fields.filter((f) => f.group === 'special').map((f) => f.key),
  };
});
export const partitionFamily: CatalogEntry = {
  code: '0982–0999',
  category: '09',
  nameHe: 'רשת מחיצות לפי מספר לוחות',
  thumbnail: 'catalog/thumbs/0982.svg',
  sourcePage: 7,
  detailPage: 7,
  referenceImage: null,
  previewStatus: 'original-illustration',
  status: 'beta',
  generatorId: '0982',
  requiredParams: generators['0982'].fields.map((f) => f.key),
  specialVariables: ['N', 'rows'],
};
export const bookCatalog: CatalogEntry[] = Object.entries(bookSources).map(([code, source]) => ({
  code,
  category: 'SP',
  nameHe: source.nameHe,
  sourceDocument: 'Structural Package Designs',
  thumbnail: `catalog/book/${code}.svg`,
  sourcePage: source.pages[0],
  detailPage: source.pages[0],
  referenceImage: null,
  previewStatus: 'original-illustration',
  status: 'beta',
  generatorId: code,
  requiredParams: generators[code].fields.map((f) => f.key),
  specialVariables: generators[code].fields.filter((f) => f.group === 'special').map((f) => f.key),
}));
export const catalog = [...sourceCatalog, partitionFamily, ...bookCatalog];
export const availableCount = catalog.filter((c) => !!c.generatorId).length;
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export function findEntry(code: string): CatalogEntry | undefined {
  if (/^09(8[2-9]|9[0-9])$/.test(code)) return partitionFamily;
  return catalog.find((c) => c.code === code);
}
