# Physical production acceptance — outstanding

All generator definitions currently have status `beta`. The plan's physical manufacturing checks cannot be performed by the cloud environment. Do not change the catalog status to `verified` based only on automated tests or resemblance to the reference illustration.

1. Select the actual material and measured thickness. Identify the laser application and its supported SVG physical units.
2. Export 0901 with L=100, W=100. Open it in the laser application and confirm a 100×100 mm square at 1:1 scale. This test uses a standalone insert; it does not add calibration lines to other production files.
3. Map `CUT` (#ff0000) to the required cut operation and `CREASE` (#0000ff) to the intended score/engrave operation. Confirm that blue continuous lines are not processed as full-depth cuts. Choose machine-specific power/speed in the machine software.
4. Trial-cut at least three constructions: slotted 0201, glued tray 0453, and two-part 0300. Use small, medium and large sizes and multiple real material thicknesses. Check glue-flap proportions, corner-ear overlap, flap closure, and lid nesting.
5. Repeat for each of the other available generators before accepting that model for production. For the partition family, check complementary slot entry, actual slot width, panel intersections, and cell dimensions.
6. Record the code, generator version, exact input values, material, grain/flute direction, machine/software, layer mapping, scale measurements, and assembly photographs. Record adjustments rather than hiding failed samples.
7. The plan requires at least six distinct models across families to pass physical cutting and assembly. At present the number of physically validated models is **zero**.

| Construction           | Automated checks | Source comparison  | Physical cut / assembly |
| ---------------------- | ---------------- | ------------------ | ----------------------- |
| 0201 / 0204            | Covered          | p.18 / p.19        | Pending                 |
| 0300                   | Covered          | p.32               | Pending                 |
| 0401                   | Covered          | p.45               | Pending                 |
| 0453                   | Covered          | p.64               | Pending                 |
| 0501                   | Covered          | p.76               | Pending                 |
| 0901 / 0902            | Covered          | p.126              | Pending                 |
| 0910                   | Covered          | p.129              | Pending                 |
| 0982–0999 grid variant | Covered          | Code semantics p.7 | Pending                 |

The catalog-derived artwork requires appropriate FEFCO redistribution permission before public publication. Keep local/internal evaluation separate from public asset distribution.
