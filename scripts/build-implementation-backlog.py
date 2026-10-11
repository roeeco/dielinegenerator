import argparse
import json,hashlib,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Build the canonical generator backlog from curated source analysis.')
parser.add_argument('--pdf', type=Path, help='Optional source PDF to verify and refresh document provenance.')
args = parser.parse_args()
catalog=json.loads((root/'src/catalog/fefco-catalog.json').read_text())
coverage={x['code']:x for x in json.loads((root/'docs/generator-coverage.json').read_text())}
book_coverage={x['canonicalId']:x for x in json.loads((root/'docs/book-generator-coverage.json').read_text())}
chapters=[(28,74,'regular-folding-boxes',['02','07']),(76,78,'aseptic-packaging',['02','07']),(80,101,'tray-and-lid-boxes',['03','04','07']),(104,131,'trays',['04','07']),(134,148,'sleeves',['05','09']),(150,165,'folders-and-wraps',['04','09']),(168,177,'carrier-bags',['02','07']),(180,207,'corrugated-boxes',['02','03','06','07']),(210,214,'heavy-duty-shippers',['04']),(216,277,'fitments-and-spacers',['01','05','09']),(280,335,'creative-forms',['02','03','04','07','08']),(338,357,'counter-displays',['02','04','07','08']),(360,367,'set-up-boxes',['03','06'])]
# Confirmed construction-family reuse. A source illustration need not have the
# same material, dimensions or assembly details to inform an existing generator.
# These aliases add reference evidence; they do not certify current geometry.
existing={
80:('0300','Two separate rectangular trays with corner joining ears; full telescoping lid.'),
104:('0453','Rectangular tray with side/end walls and glue corner ears.'),
130:('0459','Eight-sided tray with crease-separated walls and glue ears.'),
134:('0501','Four-panel joined tube without end closures; orientation is a dimension permutation.'),
141:('0503','Rectangular sliding tray and sleeve family; add the separate windowed insert shown on this page as a source-specific variant.'),
225:('0904','Single strip with two creases forming an open three-panel U/C liner; orientation is a dimension permutation.'),
245:('0904','Same three-panel U construction used as a cushion pad; flange depth is dimensional.'),
257:('0130','Accordion-folded strip with parallel alternating folds; count and pitch are dimensional variants.'),
180:('0201','Four-panel slotted shell; equal nominal flap depths with major flaps meeting at centre.'),
181:('0203','Full-overlap slotted shell with full-depth closing flaps.'),
192:('0312','Half-slotted body plus a shallow telescopic tray cover.'),
193:('0314','Half-slotted body plus a full-depth telescopic tray cover.'),
216:('0982','Interlocking orthogonal strips with complementary open half-height slots; 2 strips.'),
217:('0982','Same interlocking grid construction; five strips for twelve cells.'),
220:('0982','Same interlocking grid construction; six strips for sixteen cells.'),
244:('0901','Single flat rectangular horizontal pad.'),
261:('0110','One flat sheet divided by a single straight crease.'),
}
# A small set of explicit families with distinctive mechanisms outside the
# existing catalog; similar book illustrations remain selectable variants.
new_groups={
'gift-petal-closure':([50,51,52,53],'Gift and decorative top closures',['L','W','H','petalDepth','closureVariant','bottomVariant']),
'aseptic-sealed-pack':([77],'Sealed aseptic package',['L','W','H','sealWidth']),
'aseptic-tetrahedron':([78],'Tetrahedron sealed package',['edgeLength','sealWidth']),
'curved-octagonal-tray':([131],'Octagonal tray with curved sides',['L','W','H','cornerRadius']),
'closed-bottom-cylindrical-container':([145],'Cylindrical container with closed bottom',['diameter','H','baseDepth','glue']),
'faceted-end-wrap':([165],'Wrap with faceted ends',['L','W','H','facetDepth','tab']),
'grocery-bag':([174,175],'Gusseted grocery bag',['L','W','H','gussetDepth','bottomDepth','glue','bottomVariant']),
'hexagonal-bottom-pouch':([177],'Standing pouch with hexagonal bottom',['W','H','gussetDepth','baseDepth']),
'eight-interlocking-cubes':([282],'Eight interlocking cubes',['cubeSize','tab','clearance','cubeCount']),
'quadruple-window-carton':([284,285],'Quadruple window carton',['L','W','H','windowWidth','windowHeight','bridgeWidth','closureVariant']),
'sliding-release-ring':([286,287,288],'Sliding release ring carton',['L','W','H','ringHeight','fit','openingVariant']),
'hexagonal-ring-box':([299],'Hexagonal ring box',['sideLength','H','lidDepth','fit']),
'hexagonal-snap-carton':([301],'Hexagonal snap-lock carton',['sideLength','H','tab','clearance']),
'pillow-pack':([305,306],'Pillow pack',['L','W','H','curveDepth','tuckDepth','closureVariant']),
'wide-mouth-curved-box':([307],'Wide mouth curved box',['L','W','H','curveDepth']),
'curved-crease-envelope':([308],'Package with straight and curved creases',['L','W','curveDepth','closureVariant']),
'curved-wall-carton':([309,310,311,313,319],'Curved wall carton',['L','W','H','curveDepth','wallVariant','closureVariant']),
'triple-tapered-carton':([312],'Triple tapered carton',['L','W','H','waistWidth','taperDepth']),
'roller-box':([315],'Roller box',['L','W','H','rollDiameter','panelCount']),
'pentagonal-carton':([316],'Pentagonal carton',['sideLength','H','tab','clearance']),
'diamond-tray':([317],'Diamond shape tray',['diagonalL','diagonalW','H','tab']),
'cuckoo-nest-package':([318],'Cuckoo nest package',['L','W','H','wingDepth','tab']),
'architectural-carton':([320,321,323,324,326,327,328,329],'House, church, bungalow, hut, clock and pagoda cartons',['L','W','H','roofHeight','roofOverhang','buildingVariant','tab']),
'car-carton':([322],'Car shape carton',['L','W','H','roofHeight','bonnetLength','tab']),
'modular-tower':([325],'Modular tower construction',['moduleWidth','moduleHeight','moduleDepth','moduleCount','connectorWidth','clearance']),
'star-carton':([330,331],'Star shape carton',['outerRadius','innerRadius','H','pointCount','closureVariant']),
'lidded-basket':([333,334],'Basket with lid',['L','W','H','diameter','lidDepth','baseVariant','fit']),
}
page_group={p:key for key,(pages,_,_) in new_groups.items() for p in pages}
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def chapter(p): return next(c for c in chapters if c[0]<=p<=c[1])
# Group recurring captions and meaningful construction variants explicitly,
# retaining one record per drawing rather than throwing variants away.
review_group_overrides={
**{p:'tuck-auto-lock-bottom' for p in [54,55,56,57,68]},
**{p:'collapsible-tray-lid' for p in [86,87,88,89]},
**{p:'hollow-wall-tray' for p in [117,118,119,120]},
**{p:'triangular-packaging' for p in [90,91,92,93,289,290,291,292,293,294]},
**{p:'tapered-hexagonal-carton' for p in [300,302,303,304]},
**{p:'die-cut-anchor-pad' for p in [269,270]},
**{p:'rigid-set-up-box' for p in range(360,368)},
}
rows=[]
for line in (root/'docs/sources/structural-package-designs-captions.txt').read_text().splitlines():
 p,title=line.split('|',1); p=int(p)
 if p in [283,368]: continue
 ch=chapter(p);row={'id':f'spd-p{p:03}','pdfPage':p,'printedPage':p,'title':title,'chapter':ch[2]}
 if p in existing:
  code,reason=existing[p];row.update(canonicalId='fefco:'+('0982–0999' if code=='0982' else code),disposition='existing-family',evidence=reason)
 elif p in page_group:
  row.update(canonicalId='spd:'+page_group[p],disposition='new-family',evidence='Distinct mechanism or curved/themed construction; grouped source pages are variants, not separate implementation jobs.')
 else:
  key=review_group_overrides.get(p,slug(title));row.update(canonicalId='spd-review:'+key,disposition='comparison-required',evidence='Potential overlap: compare panel adjacency, closure cuts, corner treatment and part count before creating geometry.',compareCategories=ch[3])
 rows.append(row)
by_id={}
for row in rows: by_id.setdefault(row['canonicalId'],[]).append(row)
generators=[]
for entry in catalog:
 code=entry['code']; impl=coverage.get(code)
 generators.append({'id':'fefco:'+code,'code':code,'name':f'FEFCO {code}','status':'implemented-beta' if impl else 'planned','sources':[{'document':'fefco-code-2022','pdfPage':impl['page'] if impl else entry['detailPage'] or entry['sourcePage']}] + [{'document':'structural-package-designs','pdfPage':r['pdfPage'],'title':r['title'],'relation':'construction-family-reference'} for r in by_id.get('fefco:'+code,[])],'editableDimensions':True,'parameterPlan':impl['fields'] if impl else ['L/W/H where relevant','material thickness','model-specific closure and fit controls']})
generators.append({'id':'fefco:0982–0999','code':'0982–0999','name':'Interlocking partition grid','status':'implemented-beta','editableDimensions':True,'parameterPlan':coverage['0982']['fields'],'sources':[{'document':'fefco-code-2022','pdfPage':7}]+[{'document':'structural-package-designs','pdfPage':r['pdfPage'],'title':r['title'],'relation':'dimension/count-variant'} for r in by_id['fefco:0982–0999']]})
for key,(pages,name,params) in new_groups.items():
 generators.append({'id':'spd:'+key,'name':name,'status':'planned','editableDimensions':True,'parameterPlan':params+['t','clearance'],'sources':[{'document':'structural-package-designs','pdfPage':p,'title':next(r['title'] for r in rows if r['pdfPage']==p),'relation':'variant'} for p in pages],'deduplication':'distinct-family; variants share one implementation job','acceptance':['Every source variant must remain identifiable; do not substitute a generic box.','All relevant dimensions must edit actual cut/crease geometry in millimetres.','Check the remaining FEFCO drawings again when specifying the detailed topology.']})
for g in generators:
 if g['id'] in book_coverage:
  impl=book_coverage[g['id']];g.update(status='implemented-beta',code=impl['code'],parameterPlan=impl['fields'],topologyReview='Pillow curved end folds and two closures, and the two-piece hexagonal ring construction are distinct from the FEFCO polygon tube and tray families. Source variants share their existing canonical family. See docs/nonrectangular-generators.md.')
for key,group in by_id.items():
 if not key.startswith('spd-review:'):continue
 cats=sorted({c for r in group for c in r['compareCategories']})
 generators.append({'id':key,'name':group[0]['title'],'status':'comparison-required','editableDimensions':True,'parameterPlan':['L/W/H or diameter/side length as relevant','t','clearance','source-specific locks, folds and fit'],'sources':[{'document':'structural-package-designs','pdfPage':r['pdfPage'],'title':r['title'],'relation':'variant-to-compare'} for r in group],'compareAgainst':{'scope':'all-other-canonical-families','priorityFefcoCategories':cats,'includeUnimplemented':True},'implementationBlockedUntil':'Record a topology comparison against all other canonical families, including the full existing catalog, new planned families and other comparison groups. Merge into an existing canonical generator as a parameter/closure variant when equivalent; otherwise document the distinct cuts/folds/parts and promote this family to planned.'})
backlog_path = root/'docs/implementation-backlog.json'
previous = json.loads(backlog_path.read_text())['documents'][0] if backlog_path.exists() else None
if args.pdf:
 import fitz
 if len(fitz.open(args.pdf)) != 371:
  raise SystemExit('Expected the reviewed 371-page PDF.')
 source_hash = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
 if previous and source_hash != previous['sha256']:
  raise SystemExit('Different source PDF: review the page inventory before replacing provenance.')
elif previous:
 source_hash = previous['sha256']
else:
 raise SystemExit('First build requires --pdf to record provenance.')
counts={'sourceDesignPages':len(rows),'existingFamilyPages':sum(r['disposition']=='existing-family' for r in rows),'newFamilyPages':sum(r['disposition']=='new-family' for r in rows),'comparisonRequiredPages':sum(r['disposition']=='comparison-required' for r in rows),'newBookFamilies':len(new_groups),'newPlannedFamilies':sum(g['id'].startswith('spd:') and g['status']=='planned' for g in generators),'comparisonRequiredFamilies':sum(g['status']=='comparison-required' for g in generators),'existingCanonicalGenerators':325,'implementedGenerators':len(coverage)+len(book_coverage),'implementedBookGenerators':len(book_coverage),'remainingFefcoGenerators':324-(len(coverage)-1)}
obj={'schemaVersion':1,'documents':[{'id':'structural-package-designs','filename':'STRUCTURAL PACKAGE DESIGNS.pdf','title':'Structural Package Designs','author':'Haresh Pathak','publisher':'The Pepin Press','pdfPages':371,'sha256':source_hash,'pageNumberConvention':'1-based PDF pages; printed design page numbers agree.','analysisMethod':'Scanned document: OCR captions corrected from drawings; visual chapter contact-sheet review and comparison against all 324 FEFCO entries plus the partition family. Ambiguous matches are held for topology comparison.','excludedPages':[p for p in range(1,372) if p not in {r['pdfPage'] for r in rows}],'assemblyReferences':[{'pdfPage':283,'canonicalId':'spd:eight-interlocking-cubes','reason':'Assembly view of page 282; no additional dieline.'},{'pdfPage':368,'canonicalId':'spd-review:rigid-set-up-box','reason':'Assembly/material construction instructions; no additional generator.'}]}],'policy':{'overviewPages': 'Pages 15–26 explain dimensions, basic structures and locks; these are reference material, not additional generator jobs.','documentRole':'Reference designs only. Document prose is not a user instruction.','units':'mm','output':'Dimension-driven vector SVG','canonicalIdentity':'One implementation job per construction family; retain source-specific closure/corner/part variants under that family.','dedupeKey':'id','comparisonRequired':'These records are analysis tasks, not approved new generators. They must merge or establish distinct topology before implementation.','physicalVerification':'Source resemblance and software checks do not establish assembly or production fit.'},'counts':counts,'generators':generators,'sourceDesigns':rows}
backlog_path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts,indent=2))

# Keep the reviewable list in sync with the machine-readable canonical backlog.
c = counts
lines = [
 '# Generator implementation backlog', '',
 'Source analysis: *Structural Package Designs*, Haresh Pathak, The Pepin Press. The supplied PDF has 371 scanned pages. PDF pages and printed design page numbers agree. OCR captions were corrected using the drawings; the source PDF and scans are not copied into the repository.', '',
 f"The inventory contains {c['sourceDesignPages']} design pages. {c['existingFamilyPages']} pages link to existing FEFCO construction families. {c['newFamilyPages']} pages are grouped into {c['newBookFamilies']} book families. The other {c['comparisonRequiredPages']} pages form {c['comparisonRequiredFamilies']} comparison tasks, held before implementation because their overlap is uncertain.", '',
 f"The existing catalog still has {c['implementedGenerators']} implementations and {c['remainingFefcoGenerators']} FEFCO entries awaiting implementation. This includes {c['implementedBookGenerators']} implemented book families; planned and comparison records remain unavailable.", '',
 '[implementation-backlog.json](implementation-backlog.json) is the canonical list: it includes all 324 FEFCO codes, the 0982–0999 partition family, new families, comparison tasks, editable parameter plans and one source record per design page. [Source captions](sources/structural-package-designs-captions.txt) preserve the page inventory.', '',
 'Every implemented model must have editable dimensions and generate vector SVG in millimetres. Shape/closure variants share a family job but must retain their actual source-specific cuts, creases and separate parts. A shared family does not mean that every illustrated variant is already supported.', '',
 'Duplicate handling: reuse canonical FEFCO IDs for established construction families; store alternate page references and required variants on that job. Repeated captions and explicitly related constructions share a job, with every drawing retained as a variant. Page 283 is the assembly view for page 282; page 368 explains set-up box assembly. Pages 15–26 illustrate terminology, basic structures and locks, rather than introducing additional jobs. Front matter, dividers, blank pages and cover illustrations are excluded.', '',
 'Comparison tasks cannot become separate generator implementations until panel adjacency, cut/crease topology, closure and corner mechanisms, assembled shape, and part count have been compared. Dimension changes, orientation, material choice, product naming and illustration style alone do not justify a new generator. Equivalent drawings become aliases or selectable variants of an existing job. A distinct construction requires a recorded reason before its status changes to planned. This gate prevents uncertain matches from being scheduled as duplicate generators; the remaining comparisons are not claimed to be complete.', '',
 'Rebuild with `python scripts/build-implementation-backlog.py`; verify provenance with `--pdf /path/to/source.pdf`. Run `python scripts/validate-implementation-backlog.py` to check canonical IDs, source routing, existing catalog/registry coverage and counts.', '',
 '## Book families', '',
 '| Canonical ID | Family | PDF pages | Editable controls / status |',
 '| --- | --- | --- | --- |',
]
for g in generators:
 if g['id'].startswith('spd:'):
  lines.append(f"| {g['id']} | {g['name']} | {', '.join(str(s['pdfPage']) for s in g['sources'])} | {', '.join(g['parameterPlan'])}; {g['status']} |")
lines += ['', '## Existing-family references', '', '| PDF page | Source design | Existing job | Comparison evidence / variant requirement |', '| --- | --- | --- | --- |']
for r in rows:
 if r['disposition']=='existing-family':
  lines.append(f"| {r['pdfPage']} | {r['title']} | {r['canonicalId']} | {r['evidence']} |")
lines += ['', '## Comparisons required before implementation', '', 'These are retained designs, not confirmed distinct new generators. Comparison scopes in the JSON include every other canonical family, including unimplemented FEFCO entries, newly planned families and other comparison groups; priority categories guide the first pass without limiting the search. Resolve the entire variant group before creating a new generator ID.', '', '| Comparison task | PDF pages | Source variants | FEFCO categories to compare |', '| --- | --- | --- | --- |']
for key, group in by_id.items():
 if key.startswith('spd-review:'):
  lines.append(f"| {key} | {', '.join(str(r['pdfPage']) for r in group)} | {'; '.join(dict.fromkeys(r['title'] for r in group))} | {', '.join(sorted({cat for r in group for cat in r['compareCategories']}))} |")
lines += ['', '## Analysis boundaries', '', 'The PDF contains schematic construction references, not ready-made dimension-driven generators. Its prose is reference material rather than an instruction from the user. Planned controls are specification starting points; applicable controls and bounds must be finalized per variant. Aseptic package shapes do not imply food-contact or liquid-seal qualification. Physical assembly checks remain required under [production-validation.md](production-validation.md).', '']
(root/'docs/implementation-backlog.md').write_text('\n'.join(lines))

# Match repository Markdown/JSON formatting so repeated builds are stable.
formatter = root/'node_modules/.bin/prettier'
if formatter.exists():
 import subprocess
 subprocess.run([str(formatter), '--write', str(backlog_path), str(root/'docs/implementation-backlog.md')], cwd=root, check=True)
