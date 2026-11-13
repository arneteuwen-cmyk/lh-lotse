"""Baut logos.json für den Lotsen: Herstellerlogos von der Herstellerwand der Startseite (Testseite).
Je Hersteller: Pfad unter /wp-content/uploads/ und Seitenverhältnis (Breite / Höhe). Der Lotse zeigt das Logo im Glas nur,
wenn es dort mindestens 12 Pixel hoch wird, sonst den Anfangsbuchstaben. Helle Logos (auf dunklem Grund nicht umfärbbar) bleiben draußen.
Aufruf: py pruefen/baue_logos.py"""
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageOps
from playwright.sync_api import sync_playwright

B = "https://lechner-hayn-staging.dev10.econsor-programming.de"
ZIEL = Path(__file__).parent.parent / "logos.json"

with sync_playwright() as p:
    b = p.chromium.launch()
    s = b.new_page()
    s.goto(B + "/", wait_until="domcontentloaded", timeout=90000)
    s.wait_for_timeout(2000)
    pfade = sorted(set(re.findall(r"/wp-content/uploads/(\d{4}/\d{2}/[a-z0-9-]+-logo-zugeschnitten(?:-scaled)?\.png)", s.content())))
    netz = b.new_context().request
    logos, aus = {}, []
    for pf in pfade:
        slug = pf.split("/")[2].split("-logo-zugeschnitten")[0]
        r = netz.get(f"{B}/wp-content/uploads/{pf}")
        if not r.ok:
            aus.append((slug, r.status)); continue
        bild = Image.open(io.BytesIO(r.body())).convert("RGBA")
        grund = Image.new("RGBA", bild.size, "white"); grund.alpha_composite(bild)
        dunkel = ImageOps.invert(grund.convert("L"))
        kasten = dunkel.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not kasten:
            aus.append((slug, "hell")); continue
        rand = 1 - ((kasten[2] - kasten[0]) * (kasten[3] - kasten[1])) / (bild.width * bild.height)
        if rand > .35:
            aus.append((slug, f"Rand {rand:.0%}")); continue
        logos[slug] = [pf, round(bild.width / bild.height, 2)]
    b.close()
ZIEL.write_text(json.dumps(logos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
gross = [k for k, v in logos.items() if min(26, 62 / v[1]) * 86 / 119 >= 12]
print(len(logos), "Logos,", len(gross), "davon im Glas (>= 12 px):", ", ".join(gross))
print("ausgelassen:", aus)
