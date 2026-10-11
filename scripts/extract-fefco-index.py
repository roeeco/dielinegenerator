#!/usr/bin/env python3
"""Prepare local reference assets from the user-supplied FEFCO 12th edition PDF.
Usage: python3 scripts/extract-fefco-index.py /path/to/FEFCO.pdf
Requires PyMuPDF and Pillow. Source PDF is deliberately not redistributed.
"""
import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
import fitz
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PAGES = {"01": [10], "02": [16, 17], "03": [31], "04": [42, 43, 44],
         "05": [75], "06": [81], "07": [87, 88], "08": [104, 105], "09": [124, 125]}
EXPECTED = {"01": 11, "02": 36, "03": 25, "04": 86, "05": 10, "06": 11, "07": 41, "08": 49, "09": 55}
GENERATORS = {"0201": (18, 1), "0204": (19, 1), "0300": (32, 0),
              "0401": (45, 1), "0453": (64, 0), "0501": (76, 0),
              "0901": (126, 1), "0902": (126, 2), "0910": (129, 1)}
NAMES = {"0201": "קופסה עם כנפיים רגילות", "0204": "קופסה עם כנפיים באורכים שונים",
         "0300": "קופסה ומכסה טלסקופי", "0401": "אריזה מתקפלת עם כנפי סגירה",
         "0453": "מגש עם פינות להדבקה", "0501": "שרוול פתוח", "0901": "לוח הפרדה אופקי",
         "0902": "לוח הפרדה אנכי", "0910": "מחיצה עוטפת"}


def clusters(values, tolerance=8):
    result = []
    for value in sorted(values):
        if not result or value - result[-1] > tolerance:
            result.append(value)
    return result


def save_crop(page, clip, target):
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip, alpha=False)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    # NEW flags in the source index are cyan vector lettering, not part of the carton.
    # Remove only the source annotation colour; beige fills and neutral outlines stay intact.
    r, g, b = image.split()
    cyan = ImageChops.multiply(
        ImageChops.subtract(g, r).point(lambda v: 255 if v > 12 else 0),
        ImageChops.subtract(b, r).point(lambda v: 255 if v > 12 else 0))
    image.paste("white", mask=cyan)
    # Remove white margins without cutting pale carton fills or fine source lines.
    difference = ImageChops.difference(image, Image.new("RGB", image.size, "white")).convert("L")
    bbox = difference.point(lambda p: 255 if p > 18 else 0).getbbox()
    if not bbox:
        raise ValueError(f"Empty artwork: {target}")
    image = image.crop(bbox)
    image.thumbnail((420, 340), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (image.width + 24, image.height + 24), "white")
    canvas.paste(image, (12, 12))
    canvas.save(target, "WEBP", quality=92)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    doc = fitz.open(args.pdf)
    if len(doc) != 145:
        raise ValueError("Expected the supplied 145-page FEFCO 12th edition")
    thumbs = ROOT / "public/catalog/thumbs"
    refs = ROOT / "public/catalog/references"
    thumbs.mkdir(parents=True, exist_ok=True)
    refs.mkdir(parents=True, exist_ok=True)
    records = []
    for category, page_numbers in PAGES.items():
        for number in page_numbers:
            page = doc[number - 1]
            words = [w for w in page.get_text("words") if re.fullmatch(r"0\d{3}(?:\.\d+)?", w[4])]
            rows = clusters([w[1] for w in words])
            cols = clusters([w[0] for w in words])
            images = page.get_image_info(xrefs=True)
            for word in words:
                x0, y0, _, y1, code, *_ = word
                row = min(range(len(rows)), key=lambda i: abs(rows[i] - y0))
                col = min(range(len(cols)), key=lambda i: abs(cols[i] - x0))
                cell = fitz.Rect(cols[col] - 10, y1 + 4,
                                 cols[col] + 98, min(rows[row + 1] - 8 if row + 1 < len(rows) else y0 + 120, 795))
                matches = [fitz.Rect(im["bbox"]) for im in images
                           if cell.contains(fitz.Point((im["bbox"][0] + im["bbox"][2]) / 2,
                                                     (im["bbox"][1] + im["bbox"][3]) / 2))]
                # Render the matched artwork region to preserve soft masks and composites.
                # Vector entries or composite entries that cross cell boundaries use the cell clip.
                clip = cell
                method = "cell-render"
                if matches:
                    union = fitz.Rect(matches[0])
                    for rect in matches[1:]:
                        union.include_rect(rect)
                    union = fitz.Rect(union.x0 - 1, union.y0 - 1, union.x1 + 1, union.y1 + 1)
                    if cell.contains(union):
                        method = "matched-image-cell-render"
                save_crop(page, clip, thumbs / f"{code}.webp")
                detail = GENERATORS.get(code)
                records.append({"code": code, "category": category,
                    "nameHe": NAMES.get(code, f"דגם FEFCO {code}"),
                    "thumbnail": f"catalog/thumbs/{code}.webp", "sourcePage": number,
                    "detailPage": detail[0] if detail else None,
                    "referenceImage": f"catalog/references/{code}.webp" if detail else None,
                    "previewStatus": method, "status": "beta" if detail else "reference",
                    "generatorId": code if detail else None,
                    "requiredParams": ({
                        "0201": ["L","W","H","glue","t","clearance"],
                        "0204": ["L","W","H","glue","t","clearance"],
                        "0300": ["L","W","H","lidDepth","t","clearance","fit","spacing"],
                        "0401": ["L","W","H","glue","t"],
                        "0453": ["L","W","H","t","clearance"],
                        "0501": ["L","W","H","glue","t"],
                        "0901": ["L","W"], "0902": ["W","H"], "0910": ["L","W","H","t"]
                    }.get(code, [])),
                    "specialVariables": {"0201":["glue"],"0204":["glue"],"0300":["lidDepth"],"0401":["glue"],"0501":["glue"]}.get(code, [])})
    records.sort(key=lambda r: [int(p) for p in r["code"].split(".")])
    counts = dict(Counter(r["category"] for r in records))
    assert counts == EXPECTED, counts
    assert len({r["code"] for r in records}) == 324
    for code, (number, row) in GENERATORS.items():
        page = doc[number - 1]
        # Detailed sheets have three horizontal design rows. Crop the original blank only.
        headings = sorted([w for w in page.get_text("words")
                           if re.fullmatch(r"0\d{3}(?:\.\d+)?", w[4]) and w[0] < 120 and w[3] < 780], key=lambda w: w[1])
        top = headings[row][3] + 16
        bottom = headings[row + 1][1] - 12 if row < 2 else 775
        save_crop(page, fitz.Rect(36, top, 334, bottom), refs / f"{code}.webp")
    (ROOT / "src/catalog/fefco-catalog.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    report = {"edition": "FEFCO 12th edition (2022)", "pdfSha256": hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
              "counts": counts, "total": len(records), "methods": dict(Counter(r["previewStatus"] for r in records)),
              "fallbackCodes": [r["code"] for r in records if r["previewStatus"] == "cell-render"],
              "manualQa": "Contact sheets provided; visual review is required before public publication.",
              "rights": "FEFCO © 2022, all rights reserved. Source-derived assets require authorization for public redistribution."}
    (ROOT / "docs/catalog-extraction.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
