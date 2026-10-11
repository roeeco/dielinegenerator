"""Validate the canonical implementation queue and complete source routing.

This checks data integrity, not physical/topological equivalence of drawings.
Ambiguous designs must remain comparison tasks until topology review resolves them.
"""
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
backlog = json.loads((root / 'docs/implementation-backlog.json').read_text())
catalog = json.loads((root / 'src/catalog/fefco-catalog.json').read_text())
coverage = json.loads((root / 'docs/generator-coverage.json').read_text())
generators = backlog['generators']
source_rows = backlog['sourceDesigns']
ids = [g['id'] for g in generators]
assert len(ids) == len(set(ids)), 'Duplicate canonical implementation IDs'
by_id = {g['id']: g for g in generators}
expected_fefco = {'fefco:' + e['code'] for e in catalog} | {'fefco:0982–0999'}
actual_fefco = {key for key in ids if key.startswith('fefco:')}
assert actual_fefco == expected_fefco, 'Missing or duplicated existing catalog family'
implemented = {('fefco:0982–0999' if e['code'] == '0982' else 'fefco:' + e['code']) for e in coverage}
assert {g['id'] for g in generators if g['status'] == 'implemented-beta'} == implemented
assert all(g['editableDimensions'] is True and g['parameterPlan'] for g in generators)
assert all(g['status'] in {'planned', 'implemented-beta', 'comparison-required'} for g in generators)

page_counts = Counter(r['pdfPage'] for r in source_rows)
assert all(n == 1 for n in page_counts.values()), 'Source design page routed twice'
assert len({r['id'] for r in source_rows}) == len(source_rows)
source_links = Counter(s['pdfPage'] for g in generators for s in g['sources'] if s['document'] == 'structural-package-designs')
assert source_links == page_counts, 'Source design omitted or referenced by two canonical jobs'
for r in source_rows:
    g = by_id[r['canonicalId']]
    assert any(s['document'] == 'structural-package-designs' and s['pdfPage'] == r['pdfPage'] and s['title'] == r['title'] for s in g['sources'])
    if r['disposition'] == 'comparison-required':
        assert g['status'] == 'comparison-required'
        assert g['implementationBlockedUntil']
        scope = g['compareAgainst']
        assert scope['scope'] == 'all-other-canonical-families' and scope['includeUnimplemented']
        assert scope['priorityFefcoCategories']
        assert set(scope['priorityFefcoCategories']) <= {e['category'] for e in catalog}
    elif r['disposition'] == 'existing-family':
        assert r['canonicalId'] in expected_fefco and r['evidence']
    else:
        assert r['disposition'] == 'new-family' and g['status'] == 'planned'

source = backlog['documents'][0]
assert len(source['sha256']) == 64
assert set(range(1, source['pdfPages'] + 1)) == set(page_counts) | set(source['excludedPages'])
assert not set(page_counts) & set(source['excludedPages'])
assert all(a['pdfPage'] in source['excludedPages'] and a['canonicalId'] in by_id for a in source['assemblyReferences'])
# Overview captions are not designs; assembly pages must not become extra jobs.
captions = {int(line.split('|', 1)[0]) for line in (root / 'docs/sources/structural-package-designs-captions.txt').read_text().splitlines()}
assert captions == set(page_counts) | {a['pdfPage'] for a in source['assemblyReferences']}

counts = backlog['counts']
assert counts['sourceDesignPages'] == len(source_rows)
assert counts['existingFamilyPages'] == sum(r['disposition'] == 'existing-family' for r in source_rows)
assert counts['newFamilyPages'] == sum(r['disposition'] == 'new-family' for r in source_rows)
assert counts['comparisonRequiredPages'] == sum(r['disposition'] == 'comparison-required' for r in source_rows)
assert counts['newPlannedFamilies'] == sum(g['id'].startswith('spd:') for g in generators)
assert counts['comparisonRequiredFamilies'] == sum(g['status'] == 'comparison-required' for g in generators)
assert counts['implementedGenerators'] == len(coverage)
assert counts['remainingFefcoGenerators'] == len(expected_fefco) - len(implemented)
assert counts['existingCanonicalGenerators'] == len(expected_fefco)
print(f"Validated {len(ids)} unique canonical records and {len(source_rows)} singly-routed design pages; {counts['comparisonRequiredFamilies']} comparison tasks remain gated.")
