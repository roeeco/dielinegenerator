# Initial generator specifications

Source: user-supplied FEFCO Code, 12th edition (2022), 145 PDF pages. Page numbers below are PDF page numbers. The engine is authored in this project; drawings are reference evidence, not geometry inputs at runtime.

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
- No automatic kerf offset, partial-cut simulation, perforation, tear lines, locking tabs, or CFQ 0436.x geometry is claimed. The semantic path type and export layer mapping reserve those distinct kinds for future implemented models.

## Verification boundary

Source drawings for all nine individual generators were inspected during implementation. Their distinct panel sequences, flap proportions, corner-slot orientation, and part count informed the implementation. Default geometry snapshots, three dimensional scales, finite values, boundary containment, simple contours, unique cut segments, part separation, independent XML/path parsing, and browser export are tested.

The source diagrams are schematic. **None of these tests establishes physical fold fit, adhesive strength, laser compatibility, board grain direction, or FEFCO manufacturing certification.** Do not promote any model to `verified` until the physical records in `production-validation.md` are completed. Reference-only codes never fall back to generic trays or unrelated generators.
