#!/usr/bin/env python3
"""Extract source evidence for implemented generators from the user-provided PDF.
First run: node_modules/.bin/vite-node scripts/generator-manifest.ts
Then run: python3 scripts/extract-generator-references.py /path/to/FEFCO.pdf
"""
import argparse
import importlib.util
import json
import re
from pathlib import Path
import fitz
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog_extract',ROOT/'scripts/extract-fefco-index.py')
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('pdf', type=Path)
args=p.parse_args()
doc=fitz.open(args.pdf)
entries=json.loads((ROOT/'docs/generator-coverage.json').read_text())
for entry in entries:
    if entry['code']=='0982': continue
    page=doc[entry['page']-1]
    headings=sorted([w for w in page.get_text('words') if re.fullmatch(r'0\d{3}(?:\.\d+)?',w[4]) and w[0]<120 and w[3]<780],key=lambda w:w[1])
    row=next(i for i,w in enumerate(headings) if w[4]==entry['code'])
    top=headings[row][3]+16
    bottom=headings[row+1][1]-12 if row+1<len(headings) else 775
    # Most artwork occupies the left half; two long 09 strips intentionally extend further.
    right=442 if entry['code'] in ['0920','0921'] else 360 if entry['code']=='0975' else 334
    extract.save_crop(page,fitz.Rect(36,top,right,bottom),ROOT/f"public/catalog/references/{entry['code']}.webp")
print(f"Extracted {len(entries)-1} reference images")
