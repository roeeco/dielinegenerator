import { effectiveCode, generators } from '../geometry/registry';
import { generateValidated, validateGeometry } from '../geometry/validate';
import { precision } from '../geometry/primitives';
import type { DielineGeometry, Params, PathKind } from '../geometry/types';
export const GENERATOR_VERSION = '0.3.0';
export const layers: Record<PathKind, { id: string; color: string }> = {
  cut: { id: 'CUT', color: '#ff0000' },
  crease: { id: 'CREASE', color: '#0000ff' },
  partial: { id: 'PARTIAL_CUT', color: '#008000' },
  perforation: { id: 'PERFORATION', color: '#ff00ff' },
  tear: { id: 'TEAR', color: '#ff8800' },
};
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function exportSvg(id: string, params: Params, geometry?: DielineGeometry): string {
  const result = generateValidated(id, params);
  if (!generators[id] || !result.geometry || result.issues.some((i) => i.severity === 'error'))
    throw new Error('Cannot export an unavailable or invalid model');
  const g = geometry ?? result.geometry;
  // A supplied geometry must be the current generator output; reject stale or replaced previews.
  if (validateGeometry(g).length || JSON.stringify(g) !== JSON.stringify(result.geometry))
    throw new Error('Export geometry does not match the current parameters');
  const { width, height, x, y } = g.boundsMm;
  if (x !== 0 || y !== 0) throw new Error('Production geometry must originate at 0,0');
  const metadata = escape(
    JSON.stringify({
      code: effectiveCode(id, params),
      family: id,
      params,
      generatorVersion: GENERATOR_VERSION,
      status: 'beta',
      units: 'mm',
    }),
  );
  const groups = (Object.keys(layers) as PathKind[])
    .flatMap((kind) => {
      const paths = g.paths.filter((p) => p.kind === kind);
      if (!paths.length) return [];
      return [
        `  <g id="${layers[kind].id}" stroke="${layers[kind].color}" fill="none" stroke-width="0.1">\n${paths.map((p) => `    <path d="${p.d}" data-part="${escape(p.partId)}" />`).join('\n')}\n  </g>`,
      ];
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${precision(width)}mm" height="${precision(height)}mm" viewBox="0 0 ${precision(width)} ${precision(height)}">\n  <metadata>${metadata}</metadata>\n${groups}\n</svg>\n`;
}
export function svgFilename(id: string, p: Params): string {
  const dimensions = ['L', 'W', 'H']
    .filter((k) => Number.isFinite(p[k]))
    .map((k) => p[k])
    .join('x');
  const special =
    generators[id]?.fields
      .filter((field) => field.group === 'special' && !['glue', 'N'].includes(field.key))
      .map((field) => `_${field.key === 'lidDepth' ? 'lid' : field.key}${p[field.key]}`)
      .join('') ?? '';
  return `FEFCO_${effectiveCode(id, p)}_${dimensions}${p.t !== undefined ? `_t${p.t.toFixed(1)}` : ''}${special}.svg`;
}
export function downloadSvg(id: string, p: Params) {
  const content = exportSvg(id, p),
    url = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = svgFilename(id, p);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
