# פריסה — Hebrew FEFCO dieline editor

A static React + TypeScript application for choosing a FEFCO design, entering dimensions, previewing a newly generated blank, and downloading a mechanical SVG at 1:1 scale in millimetres. The interface is Hebrew and RTL. There is no backend, account, database, or runtime API dependency; fonts and artwork are served locally.

## Run

Use Node 24 (or Node >=22.12) and npm 11. The existing checkout is the working directory; a separate worktree is unnecessary.

```sh
npm ci
npm run dev
```

```sh
npm run build       # TypeScript + production bundle in dist/
npm test            # Catalog, geometry, validation and SVG tests
npm run test:e2e    # Chromium desktop + mobile browser workflows
npm run check       # All three
```

Browser tests use `/usr/bin/chromium` when present. Otherwise install the Playwright browser with `npx playwright install chromium` (and its documented system dependencies if your machine needs them).

## Implemented scope

- All **324 illustrated source entries**, across all nine categories, with extracted WebP thumbnails, code/name search, category filters, and a filter for models with generators.
- The **0982–0999** interior-fitment range appears as one additional parametric family, not 18 duplicate images. Its implementation is an explicitly identified interlocking grid variant; the codes specify panel count, not a unique shape.
- **191 editable generators**: 188 individual FEFCO source codes, the partition family, and two book families (three source designs). All 11 sheet/roll entries and all 10 sleeve entries and all 11 rigid-box entries are implemented; all 55 individual insert entries are implemented. The remaining **136 source codes** are reference-only. The full remaining-generator request is not yet complete; see [coverage](docs/generator-coverage.json).
- The additional _Structural Package Designs_ reference is indexed in the [implementation backlog](docs/implementation-backlog.md): 319 design pages, 27 new planned families, existing-family aliases, and gated comparison tasks. All planned generators require editable dimensions. Ambiguous overlaps must be resolved before implementing another generator.
- Model-specific dimensions and material controls, immediate SVG updates, zoom/fit/pan, field-level validation, blank dimensions, multiple parts, and source drawing references.
- Mechanical SVG with physical `mm` dimensions, matching `viewBox`, continuous fold paths, stable `CUT`/`CREASE`/`PARTIAL_CUT` layer IDs where applicable, metadata, no raster artwork or visible text, and filenames including the code and dimensions.
- Unimplemented entries are reference-only and have no export action. The exporter also rejects unknown models, invalid input, and stale geometry.

Every implemented generator is **beta**. Automated geometry checks are not a physical assembly test. No model is claimed to be production verified. Material allowances are documented starting assumptions, and laser kerf compensation is not applied automatically. Check the actual material, glue joints, lid clearance, and the laser software's colour-to-operation mapping before use.

Stages A and the software portion of B in the supplied plan are implemented. Stage B's physical cutting/assembly acceptance, the remaining 136 model implementations in stage C, and optional stage D features (project JSON, dimensional export, machine profiles, 3D) remain future work. See [generator specifications](docs/generators.md) and [production acceptance](docs/production-validation.md).

## Catalog extraction and QA

The application uses committed static assets; it never processes the PDF in the browser. To reproduce the assets from the user-supplied **145-page FEFCO Code, 12th edition (2022)** PDF:

```sh
python3 -m venv /tmp/fefco-assets-venv
/tmp/fefco-assets-venv/bin/pip install -r scripts/requirements.txt
/tmp/fefco-assets-venv/bin/python scripts/extract-fefco-index.py /path/to/FEFCO.pdf
/tmp/fefco-assets-venv/bin/python scripts/build-catalog-qa.py
```

`docs/catalog-extraction.json` records the source SHA-256, page mapping, exact counts, and fallback codes. The image matcher is used to identify raster/composite entries; full artwork cells are rendered to preserve vector outlines and image soft masks. Cyan source `NEW` annotations are removed. Original art is never stretched into production geometry.

`public/catalog/qa/index.html` provides nine contact sheets. The Python audit checks counts, uniqueness, readable artwork, and category membership without requiring the source PDF. Thumbnail/source matching should receive a second human visual review before distribution.

## Rights and distribution

**The FEFCO illustrations are © FEFCO 2022, all rights reserved. They are not open-source assets.** They were extracted from the user-provided reference for this implementation. The source PDF is not included in the repository. Obtain appropriate permission before publicly distributing the source-derived thumbnails, reference drawings, or QA contact sheets; alternatively replace them with original licensed illustrations. See [asset notices](public/catalog/NOTICE.md).

The application code and generators were written for this project. No implementation code was copied from OpenBox3D or OpenDieline. The independent geometry architecture follows the plan's general recommendations without importing either project.

For an authorized static deployment, serve `dist/` from GitHub Pages, Cloudflare Pages, or another static host. Vite uses relative asset paths and hash navigation, so nested deployment paths work without server rewrite rules. Deployment is not performed by this repository setup.

## Expanded generator families

Sheets have editable total dimensions, panel widths and panel counts. Slotted boxes add full-overlap flaps, tuck lids, locking bottoms and continuous gusset folds. Telescopic models keep their source-specific corner cuts, diagonal folds, separate covers and sleeve directions. Inserts include end-slot grids, mixed-height partitions, circular apertures, cell windows, laminated pads and angle profiles. Some source codes share a flat blank and differ in assembly orientation; their notes state that explicitly.

Special variables appear as editable fields rather than fixed-size SVG assets. For unlabelled profile dimensions, the editor names the leg, return or brace width explicitly; it does not claim those widths are an inferred assembled L/W/H. Model notes explain sheet totals and dependent final panels.

Regenerate the implementation manifest after changing the registry:

```sh
npm run generators:manifest
python3 scripts/extract-generator-references.py /path/to/FEFCO.pdf
```

The source PDF remains outside the repository. Reference crops support comparison; runtime geometry is generated by TypeScript construction functions.

The latest expansion adds source-specific wrappers, rolled-wall trays, all rigid-box models (0601–0621), and automatic-bottom constructions 0700–0714, 0718/0719, 0747/0748 and 0761. Automatic bases include their diagonal pre-glue folds and alignment slots. Rigid boxes export each end panel separately. 0229/0229.1 use a user-selected return depth capped by H, matching the source's MAX H note.

New non-rectangular designs: pillow pack with glued/tuck closures, hexagonal ring box, FEFCO 0459 octagonal tray and FEFCO 0858 octagonal container. See [source comparisons and controls](docs/nonrectangular-generators.md).
