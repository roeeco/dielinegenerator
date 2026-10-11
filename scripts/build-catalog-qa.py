#!/usr/bin/env python3
"""Audit catalog references and build visual QA sheets without requiring the source PDF."""
import json
from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
records = json.loads((ROOT / 'src/catalog/fefco-catalog.json').read_text())
assert len(records) == 324
assert len({r['code'] for r in records}) == 324
expected = dict(zip([f'{n:02}' for n in range(1,10)], [11,36,25,86,10,11,41,49,55]))
assert dict(Counter(r['category'] for r in records)) == expected
out = ROOT / 'public/catalog/qa'
out.mkdir(parents=True, exist_ok=True)
for category in expected:
    subset = [r for r in records if r['category'] == category]
    sheet = Image.new('RGB', (1000, ((len(subset)+4)//5)*150), 'white')
    draw = ImageDraw.Draw(sheet)
    for i,r in enumerate(subset):
        path = ROOT/'public'/r['thumbnail']
        assert path.exists(), path
        with Image.open(path) as source:
            assert source.width > 24 and source.height > 24
            thumb = source.copy()
            thumb.thumbnail((174,116))
        x,y=(i%5)*200,(i//5)*150
        sheet.paste(thumb,(x+(200-thumb.width)//2,y+25+(116-thumb.height)//2))
        draw.text((x+12,y+6), r['code'] + (' *' if r['previewStatus']=='cell-render' else ''),fill='black')
        draw.rectangle((x,y,x+199,y+149),outline='#e2e5e9')
    sheet.save(out/f'{category}.webp',quality=90)
html='<!doctype html><html lang="en"><meta charset="utf-8"><title>FEFCO catalog QA</title><style>body{font:16px system-ui;margin:2rem;max-width:1100px}img{width:100%;height:auto}a{color:#334}</style><h1>FEFCO extraction QA · 324 entries</h1><p>All nine category counts match the source. An asterisk identifies a cell-render fallback. Review matching artwork, cropping, and composites before publication. © FEFCO 2022 — redistribution requires authorization.</p>'
for category in expected:
    html+=f'<h2>Category {category} · {expected[category]} entries</h2><img src="{category}.webp" alt="Category {category} contact sheet">'
html+='</html>'
(out/'index.html').write_text(html)
print('Catalog audit passed: 324 unique codes, 324 readable thumbnails, category counts match; 9 QA sheets written.')
