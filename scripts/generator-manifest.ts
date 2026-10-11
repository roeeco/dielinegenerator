import { bookSources } from '../src/geometry/nonrectangular';
import { writeFileSync } from 'node:fs';
import { generators } from '../src/geometry/registry';
import { expandedSources } from '../src/geometry/expanded';
import catalog from '../src/catalog/fefco-catalog.json';
const entries = Object.values(generators)
  .filter((definition) => !definition.id.startsWith('SPD-'))
  .map((definition) => ({
    code: definition.id,
    page:
      expandedSources[definition.id] ??
      catalog.find((entry) => entry.code === definition.id)?.detailPage ??
      7,
    fields: definition.fields.map((field) => field.key),
    notes: definition.notes,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));
writeFileSync('docs/generator-coverage.json', JSON.stringify(entries, null, 2) + '\n');
console.log(
  `${entries.length} generators; ${324 - entries.filter((entry) => entry.code !== '0982').length} reference-only catalog codes`,
);

writeFileSync(
  'docs/book-generator-coverage.json',
  JSON.stringify(
    Object.entries(bookSources).map(([code, source]) => ({
      ...source,
      code,
      fields: generators[code].fields.map((f) => f.key),
    })),
    null,
    2,
  ) + '\n',
);
