# Category 08: retail and e-commerce

All 49 category 08 catalog codes now have editable beta SVG generators. This batch implements the remaining 38 codes. Each catalog entry retains its FEFCO 2022 PDF page and reference drawing; no new catalog codes or duplicate book families were added.

The generators distinguish integral shelves from separate shelves, supports and partitions. Multi-part exports contain every part, packed without overlap. Only relevant model controls are exposed: front height, rolled returns, tongue widths, product openings, integer shelf/grid counts, staircase rise/count, base fit, glue joints, tape-band width and opening-strip width. L/W/H are internal dimensions where the source supports that convention; developed dimensions and cell dimensions are labelled explicitly.

| Code | Model                              | PDF page | Editable controls                                                          |
| ---- | ---------------------------------- | -------- | -------------------------------------------------------------------------- |
| 0801 | מגש תצוגה עם תחתית אוטומטית        | 106      | L, W, H, v, glue, lip, tabWidth, t, clearance                              |
| 0802 | מגש משופע עם גב וחזית כפולים       | 106      | L, W, H, v, tabWidth, lockDepth, t, clearance                              |
| 0803 | מגש משופע עם החזרות צד             | 106      | L, W, H, v, tabWidth, lockDepth, t, clearance                              |
| 0804 | מגש עם ארבע דפנות כפולות           | 107      | L, W, H, tabWidth, lockDepth, t, clearance                                 |
| 0808 | מגש תצוגה עם גב זקוף ואוזניים      | 107      | L, W, H, v, tabWidth, lockDepth, cornerEar, t, clearance                   |
| 0809 | מגש עם גב רחב וקיפולי צד פנימיים   | 107      | L, W, H, v, tabWidth, lockDepth, cornerEar, t, clearance                   |
| 0815 | מגש תצוגה עם החזרות ותמיכות צד     | 108      | L, W, H, v, tabWidth, lockDepth, t, clearance                              |
| 0816 | מגש עם החזרות צד מחולקות           | 108      | L, W, H, v, tabWidth, lockDepth, cornerEar, t, clearance                   |
| 0817 | מגש משופע עם חריצי צד נוספים       | 108      | L, W, H, v, tabWidth, lockDepth, t, clearance                              |
| 0818 | קופסה עם צווארון ונעילות שחרור     | 109      | L, W, H, v, glue, lip, tabWidth, t, clearance                              |
| 0819 | קופסה עם כנפי נעילה משולשות        | 109      | L, W, H, v, glue, lip, tabWidth, t, clearance                              |
| 0825 | קופסת משיכה עם כיסוי מעוגל         | 109      | L, W, H, glue, lip, tabWidth, t, clearance                                 |
| 0826 | מעמד תצוגה עם גב גבוה ורגל         | 110      | L, W, H, v, lip, t, clearance                                              |
| 0832 | כוננית משופעת עם מחיצה מרכזית      | 111      | L, W, H, v, tabWidth, shelfCount, t, clearance, spacing                    |
| 0834 | כוננית משופעת עם קורות חיזוק       | 111      | L, W, H, v, tabWidth, shelfCount, t, clearance, spacing                    |
| 0840 | כוננית עם דפנות פתוחות וזרועות     | 112      | L, W, H, v, tabWidth, shelfCount, t, clearance, spacing                    |
| 0841 | מעמד עם חזית נמוכה ומדף מחובר      | 112      | L, W, H, v, glue, lip, tabWidth, t, clearance                              |
| 0842 | כוננית עם מדפים מחוברים לחזית      | 112      | L, W, H, v, glue, tabWidth, shelfCount, t, clearance                       |
| 0843 | מעמד דו-צדדי עם מדפים מחוברים      | 113      | L, W, H, v, glue, tabWidth, shelfCount, t, clearance                       |
| 0845 | כוננית אליפטית עם תמיכות פנימיות   | 113      | L, W, H, v, shelfCount, glue, t, clearance, spacing                        |
| 0846 | כוננית עם מדפים משושים             | 113      | L, W, H, v, shelfCount, glue, t, clearance, spacing                        |
| 0847 | מעמד מוצר עם פתחים עגולים          | 114      | L, W, H, v, shelfCount, columns, holeDiameter, glue, t, clearance, spacing |
| 0848 | מעמד עם רשת מחיצות ומגש ביניים     | 114      | L, W, H, v, columns, rows, lip, tabWidth, t, clearance, spacing            |
| 0849 | כוננית מגשים עם גב כפול ורגליים    | 114      | L, W, H, v, tabWidth, shelfCount, t, clearance, spacing                    |
| 0853 | מעמד עם לוח מוצר מחורר וכותרת      | 116      | L, W, H, v, columns, rows, holeDiameter, glue, lip, t, clearance, spacing  |
| 0854 | מעמד עם תאים ומחיצות               | 116      | L, W, H, v, columns, rows, glue, lip, t, clearance, spacing                |
| 0860 | כלי מצולע עם בסיס כפול             | 117      | L, H, v, glue, lip, holeDiameter, t, clearance, spacing                    |
| 0861 | כלי מסובב עם קיפולים משולשים       | 117      | L, H, lip, t                                                               |
| 0865 | מעטפת תצוגה עם פתח ומגרעות רגל     | 118      | L, W, H, openingHeight, footWidth, footDepth, glue, t, clearance           |
| 0866 | מעטפת משלוח עם חזית להסרה          | 118      | L, W, H, openingHeight, footWidth, footDepth, glue, t, clearance           |
| 0870 | מעמד מדרגות מחתיכה אחת             | 118      | L, W, H, stepRise, steps, glue, lip, tabWidth, t, clearance                |
| 0871 | מעמד עם חזית תלויה                 | 119      | L, W, H, v, glue, lip, tabWidth, t, clearance                              |
| 0872 | כוננית שלוש שורות ושתי עמודות      | 119      | L, W, H, lip, t, clearance, spacing                                        |
| 0873 | תומך פנימי עם כנפי U               | 119      | L, W, H, lip, tabWidth, t, clearance                                       |
| 0874 | מגש עם חזית כפולה והחזרת רצפה      | 120      | L, W, H, v, lip, tabWidth, t, clearance                                    |
| 0885 | מעטפת מסחר מקוון עם פס פתיחה       | 121      | L, W, H, lip, tabWidth, sealWidth, tearWidth, t, clearance                 |
| 0886 | קופסת מסחר מקוון עם תחתית אוטומטית | 121      | L, W, H, glue, tabWidth, bottomBevel, sealWidth, tearWidth, t, clearance   |
| 0887 | קופסת מסחר מקוון עם כנפי סגירה     | 122      | L, W, H, glue, sealWidth, tearWidth, t, clearance                          |

## Construction and validation boundaries

0802–0817 preserve the distinct combinations of rear, side and front returns and corner receivers. 0832 includes a separate centre divider; 0834 adds shelf braces. 0840 has open side profiles; 0842 and 0843 retain attached shelf hinges. 0845 develops a curved sleeve by an ellipse-perimeter approximation and uses separate elliptical shelves and supports. 0846 has hexagonal shelf flanges; 0847 matches product-hole rows between the sleeve and supports. 0848, 0853 and 0854 export complementary partition grids and their separate platforms. 0872 retains one folded outer body, one double divider and two double shelves.

0860 uses a six-panel tube and a separate two-panel folded base. 0861 is a one-piece twisted net: H is developed wall span, rather than assembled interior height. 0865 and 0866 are display shells; the floor shown in their assembled reference requires a separate pad such as 0901. 0873 is an internal support, not an independent shipping carton. 0870 preserves one continuous stepped blank for editable stair counts.

0885–0887 use the TEAR layer for opening-strip boundaries. Tape is not emitted as a cutter path; sealWidth changes the developed closing-flap allowance. SVG geometry does not apply adhesive or select cut depth. 0886 retains an automatic-bottom pattern; 0887 uses independent regular bottom flaps.

Counts must be integers; validators block overcrowded shelves, colliding product openings, oversized locks/returns and unsuitable tape-band dimensions. Retail generation also rejects self-crossing closed contours and cuts outside their part. This protects unsupported input proportions before preview/export.

The software tests cover every exposed control, three scales, normalized millimetre bounds, noncrossing contours, duplicate cuts, part spacing, independent XML/SVG parsing, complete source/registry coverage, and desktop/mobile preview and downloads. Source-specific regression checks cover integral hinge attachment, complementary partitions, circular circumference, matching apertures, variable stair counts and tear layers.

These are engineering interpretations of schematic reference drawings. No source drawing supplies complete material-dependent tooling allowances, and software tests do not establish physical fit, strength or production readiness. Trial-cut and assemble each model under [production-validation.md](production-validation.md). Existing source-variant limits remain explicit in each generator’s notes.
