# Generator specifications

Source: user-supplied FEFCO Code, 12th edition (2022), 145 PDF pages. Page numbers below are PDF page numbers. The engine is authored in this project; drawings are reference evidence, not geometry inputs at runtime.

The additional _Structural Package Designs_ PDF has a separate [canonical implementation backlog](implementation-backlog.md), including page-level provenance, existing-family mappings, new families, editable parameter plans and comparisons required to prevent duplicate implementations. Its planned models are not part of the implemented coverage below.

All dimensions are millimetres. `L`, `W`, `H` are internal dimensions when the model represents a box. No global `L >= W` restriction is imposed. Only relevant dimensions are displayed for flat inserts.

| Model     | Source                | Construction                                                                                                                                      | Parameters                                    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 0201      | p.18, middle drawing  | Four-panel L–W–L–W shell; all eight flaps have W/2 nominal depth; trapezoidal glue joint and finite-width flap slots                              | L, W, H, glue, t, clearance                   |
| 0204      | p.19, middle drawing  | Four-panel shell; L-panel flaps W/2, W-panel flaps L/2                                                                                            | L, W, H, glue, t, clearance                   |
| 0300      | p.32, top drawing     | Separate body and lid; vertical cuts separate corner ears from end walls; glue assembly; packed side by side                                      | L, W, H, lidDepth, t, clearance, fit, spacing |
| 0401      | p.45, middle drawing  | Central L×W panel; end walls H and closing flaps W/2; side walls H with small joining extensions                                                  | L, W, H, glue, t                              |
| 0453      | p.64, top drawing     | Open rectangular tray; horizontal corner cuts; corner ears fold onto and glue to end walls                                                        | L, W, H, t, clearance                         |
| 0501      | p.76, top drawing     | Open sleeve with L–W–L–W panels and a joining flap; no top or bottom                                                                              | L, W, H, glue, t                              |
| 0901      | p.126, middle drawing | Horizontal rectangular insert of size L×W                                                                                                         | L, W                                          |
| 0902      | p.126, bottom drawing | Vertical rectangular insert of size W×H                                                                                                           | W, H                                          |
| 0910      | p.129, middle drawing | Unjointed wrap of length L, cross-sections W/2–H–W–H–W/2                                                                                          | L, W, H, t                                    |
| 0982–0999 | p.7                   | Code range defines 2–19 panels, in arbitrary shapes. Implemented variant: rectangular interlocking grid with complementary open half-height slots | L, W, H, N, rows, t, clearance, spacing       |

## Material and joint assumptions

These are **beta construction assumptions**, not FEFCO-certified tolerance formulas:

- Folded shells use nominal panel pitch `dimension + t` as a first-order crease-centre allowance. Closing flaps use half the corresponding adjusted panel pitch. Actual scoring allowance depends on the board and folding method.
- Flap/corner slot width is `t + clearance`. `clearance` does not change the overall blank dimensions, and is distinct from laser kerf compensation.
- The 0300 body's adjusted base pitches are `L+t`, `W+t`. Lid internal dimensions are `L+2t+fit`, `W+2t+fit`, giving crease pitches `L+3t+fit`, `W+3t+fit`. `fit` is a total dimensional allowance, not a per-side amount.
- The 0300 lid depth is independent and must not exceed body height. Body and lid corner ears must not exceed half the smaller base dimension to avoid colliding during assembly. The 0453 uses the same corner-ear limit.
- A joining flap must be less than half the smallest relevant box dimension. This deliberately limits unsupported small/large joining proportions rather than drawing a deceptively valid blank.
- Folded models require dimensions at least four material thicknesses. Supported material thickness is 0.1–5 mm, subject to this geometric limit. This is a software guard, not certification that each material assembles successfully.
- The partition variant uses `rows` panels of length L and `N-rows` panels of length W. It places slots at equal cell pitches and makes opposite-side half-height openings, with slot width `t+clearance`. The fields count **panels**, not cells. Each direction needs at least one panel. All panels are laid side by side with `spacing` between bounding boxes.
- 0901 and 0902 are literal flat rectangles, with no invented thickness, height, or fold inputs. A 100×100 mm 0901 export is suitable as the dimensional calibration sample.
- Glue and tape are assembly steps, not generated engraving or production decorations. 0401's side joining extensions are a supported manufacturer's joining choice (source p.5), not a locking mechanism.
- No automatic kerf offset, physical partial-cut simulation, perforation, tear lines, or CFQ 0436.x geometry is claimed. Expanded locking models include editable tabs and receiving notches. Laminated pads export partial cuts on a separate PARTIAL_CUT layer; tool depth and cutting side remain machine settings.

## Verification boundary

Source drawings for all nine individual generators were inspected during implementation. Their distinct panel sequences, flap proportions, corner-slot orientation, and part count informed the implementation. Default geometry snapshots, three dimensional scales, finite values, boundary containment, simple contours, unique cut segments, part separation, independent XML/path parsing, and browser export are tested.

The source diagrams are schematic. **None of these tests establishes physical fold fit, adhesive strength, laser compatibility, board grain direction, or FEFCO manufacturing certification.** Do not promote any model to `verified` until the physical records in `production-validation.md` are completed. Reference-only codes never fall back to generic trays or unrelated generators.

## Expansion coverage

There are now 229 generator definitions (227 FEFCO and two book families), including the 0982–0999 family. The initial specifications above still apply. [generator-coverage.json](generator-coverage.json) records every implemented FEFCO code, PDF page, exposed parameter and construction note. The catalog binds entries to the actual registry, so unsupported entries remain reference-only. 98 FEFCO source entries are still unimplemented, mainly locking trays, glued constructions and telescopic constructions; this expansion does not complete all remaining generators.

- 01: 11/11 codes. L/W are developed sheet dimensions except 0130, where L is one accordion panel. Early panel widths are independent; the final panel is the positive remaining width. 0100 exports a flat length cut from a roll.
- 02: 36/36 codes. Flap depth, full or partial closures, notch/tongue outlines and tuck lips vary by code. 0226 has diagonal folds and continuous flaps rather than separated slots. Lock depth and tab width are explicit, with fit guards.
- 03: 13/25 codes. Cuts, inward/outward diagonal ear folds and uncut gussets remain distinct. Multiple sleeves and end covers are packed separately.
- 04: 21/86 codes. Wrappers use their own panel sequences and side extensions; two-part wrappers retain independent nested components.
- 05: 10/10 codes. Sleeve axes, nesting allowances, closing strap tabs and part counts follow the source constructions. 0507/0510 use similar flat components with a different assembly orientation.
- 06: 11/11 codes. Rigid constructions keep a separate wrap and two separate end panels, except 0621 which uses two matching half-shells. End-panel flanges and wrap directions vary by model. Corner gussets in chamfered end panels include explicit diagonal folds as an engineering folding assumption. 0615 double returns are limited to prevent overlapping folds.
- 07: 20/41 codes. Three automatic-bottom families have independent cut profiles and pre-glue fold placement. 0714 pairs a body with a nested, inverted lid. 0718 has double end walls; 0747/0748/0761 retain distinct diagonal wrapper folds. Pre-gluing and physical assembly remain unverified.
- 08: 49/49 codes. Separate shelf parts and a central divider are retained for 0830/0831/0833; triangular forms 0850/0851/0852, editable regular polygon 0859 and display cards 0880/0881/0882 are implemented.
- 09: 55/55 individual codes plus the count family. The stair display 0960 now exports three separate treads and three support cheeks. Slots are complementary and material-dependent. 0934 places edge slots at a separate margin; 0935 has both v-height and H-height panels. 0939 computes developed cell windows and exposes cell count; assembled length is cells×W/2.

For profiles with unlabelled source cross sections, leg, return and brace distances are editable construction variables; they are not automatic assembled width/height dimensions. Right-angle support diagonals use √2×H. Rounded holes use closed polygon paths with maximum chord error 0.01 mm. 0965/0966 share a developed five-panel pad; their physical cut face/assembly differ. Angle profiles 0971/0972 and 0973/0974 share flat panel sequences but differ in return orientation.

Model-specific validators run before any preview or export. Every exposed expansion parameter is tested for a real construction change. The suite also checks three size ranges, contour intersections, duplicate/zero cut segments, finite bounds, part separation, independent SVG/XML parsing and real desktop/mobile downloads. These checks establish software behavior, not physical manufacturability.

## Latest construction controls

The automatic-bottom models expose bottom bevel, notch/slot width, notch depth where used and tuck lip where used. Their placement follows the specific source family; they do not share a generic rectangular base. These are editable beta dimensions, and no automatic glue application, cut-depth setting or physical manufacturing certification is implied.

0454/0455 have rolled returns on opposite axes; 0456 has returns on both axes. The extra crease pitch is t. Quarter-span corner-ear limits prevent the doubled ears from colliding. 0458 is an unjoined four-wall cross: tape/stitching must provide its corner joints.

## Handled cartons and retail displays

All 36 category-02 codes now have generators. The latest shell engine retains different top and bottom profiles, the W–L–W–L sequence of 0222, joined bottom panels of 0225, the long slotted bottom of 0207, and the diagonal locking cuts of 0218/0232. Hand openings and Euro slots are closed cut contours. 0240 and 0241 each have two matching hanging openings; 0242 retains a narrow, twice-folded stem and a separate wide label area in the same blank. Relevant flap, lip, lock, hole and label dimensions are editable and guarded against panel collisions.

0880 is a double-height folded card with tabs at both ends; 0881 is a flat card with rounded upper corners and two open lower slots; 0882 is a three-panel header wrap with five lower tabs. Flat cards expose their panel dimensions rather than irrelevant box dimensions.

0830/0833 have a back with returned side walls and separate shelves with side ears and a back locking tab. 0831 retains an additional double-thickness centre divider and complementary shelf slots. Shelf count is an integer; shelf height spacing must accommodate the returns. 0833 has a full-depth W return and an extra material crease. These are beta construction profiles with no tested load rating.

0850 implements the triangular variant shown in the source, including its attached triangular top and short end flaps. It does not claim all possible polygons permitted by the source. 0851 retains the diagonal V folds and a separately packed four-panel base. 0852 derives the inclined face from √(H²+W²), with triangular end flaps. 0859 implements a regular polygon sleeve and separate matching bottom; editable N controls both the wall panel count and the base vertices, with thickness and fit allowances.

0960 has three stepped treads and three matching staircase supports, packed separately with editable spacing. Width, step depth, step rise, return depth and slot clearance change the actual geometry. The source sketches and these software checks do not establish fold fit or display load capacity; physical validation remains pending.

Book coverage is recorded separately in [book-generator-coverage.json](book-generator-coverage.json). [Non-rectangular generators](nonrectangular-generators.md) documents this batch and the source-specific controls.

Category 08 is complete at the catalog-code level. [Retail and e-commerce generators](retail-generators.md) records the final 38 source drawings, fields, constructions, and physical-verification limits.
