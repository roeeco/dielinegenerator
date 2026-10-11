import { writeFileSync, mkdirSync } from 'node:fs';
import { bookSources } from '../src/geometry/nonrectangular';
import { generators, defaultParams } from '../src/geometry/registry';
import { exportSvg } from '../src/export/svg';
mkdirSync('public/catalog/book', { recursive: true });
for (const code of Object.keys(bookSources))
  writeFileSync(
    `public/catalog/book/${code}.svg`,
    exportSvg(code, defaultParams(generators[code])).replaceAll(
      'stroke-width="0.1"',
      'stroke-width="1"',
    ),
  );
