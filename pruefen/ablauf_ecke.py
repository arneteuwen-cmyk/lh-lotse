"""Ablauf an der Kontakt-Ecke auf der Testseite (lokale lotse.js): erster Besuch (Auftritt → Schild → Sitzen),
zweiter Besuch (sitzt sofort), Maus darüber (hüpft hoch, steht links neben dem Dreieck, Füße auf dem Boden).
Bilder: pruefen/fotos/ablauf_*.png und ablauf.png. Aufruf: py pruefen/ablauf_ecke.py"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

B = "https://lechner-hayn-staging.dev10.econsor-programming.de/?lotse-zeit=tag&lotse-saison=keine"
CODE = (Path(__file__).parent.parent / "lotse.js").read_bytes()
AUS = Path(__file__).parent / "fotos"
J = "document.getElementById('lh-lotse').shadowRoot"
fehler, bilder = [], []


def ok(bed, text):
    print(("OK   " if bed else "FEHL ") + text)
    if not bed:
        fehler.append(text)


def lage(s):
    return s.evaluate(f"""(()=>{{const k={J}.querySelector('.knopf'), e=document.querySelector('.cta-fixed').getBoundingClientRect();
      const f=k.querySelector('.beine-stehen').getBoundingClientRect(), fig=k.querySelector('.oben').getBoundingClientRect();
      return {{klasse:k.className, fussUnten:Math.round(f.bottom), figRechts:Math.round(Math.max(f.right,fig.right)), eckeLinks:Math.round(e.left), hoehe:innerHeight}}}})()""")


def foto(s, name, titel, vp):
    f = AUS / f"ablauf_{name}.png"
    s.screenshot(path=str(f), clip={"x": vp[0] - 320, "y": vp[1] - 300, "width": 320, "height": 300})
    bilder.append((titel, f))


with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, mobil in [((1440, 900), False), ((390, 844), True)]:
        n = "d" if not mobil else "h"
        c = b.new_context(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mobil, has_touch=mobil, device_scale_factor=2 if not mobil else 2)
        s = c.new_page()
        s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
        s.goto(B, wait_until="domcontentloaded")
        s.wait_for_timeout(400)
        if not mobil:
            foto(s, n + "1", "1. Besuch: kommt herein", vp)
        s.wait_for_timeout(1800)
        l = lage(s)
        ok(abs(l["fussUnten"] - l["hoehe"]) <= 4 and l["figRechts"] <= l["eckeLinks"] + 1, f"{n}: steht auf dem Boden links neben dem Dreieck {l}")
        if not mobil:
            foto(s, n + "2", "zeigt Schild", vp)
        s.wait_for_timeout(3500)
        ok("sitzt" in lage(s)["klasse"], f"{n}: sitzt nach dem Auftritt")
        foto(s, n + "3", "setzt sich auf die Kante" if not mobil else "Handy: sitzt", vp)
        s.wait_for_timeout(7000)
        ok("sitzt" in lage(s)["klasse"], f"{n}: bleibt sitzen")
        if not mobil:
            s.locator("#lh-lotse >> css=.knopf .kopf").hover()
            s.wait_for_timeout(250)
            foto(s, n + "4", "Maus darüber: hüpft hoch", vp)
            s.wait_for_timeout(900)
            l = lage(s)
            ok("sitzt" not in l["klasse"] and l["figRechts"] <= l["eckeLinks"] + 1, f"{n}: steht nach Maus neben dem Dreieck {l}")
            s.mouse.move(200, 200)
            s.wait_for_timeout(7000)
            ok("sitzt" in lage(s)["klasse"], f"{n}: setzt sich wieder")
        # zweiter Besuch: sitzt sofort
        s.goto(B, wait_until="domcontentloaded")
        s.wait_for_timeout(700)
        ok("sitzt" in lage(s)["klasse"], f"{n}: zweiter Besuch sitzt sofort")
        if not mobil:
            s.evaluate(f"{J}.querySelector('.knopf').click()")
            s.wait_for_timeout(300)
            g = s.evaluate(f"{J}.querySelector('.msg.lotse').textContent")
            ok(g.startswith("Hallo, ich bin der Lotse") and ("24 Stunden" in g or "Werktag" in g), "Begrüßung kurz mit Zusage")
            print("     ", g)
        c.close()
    b.close()

w, h = 320, 300
g = Image.new("RGB", (w * len(bilder), h + 28), "white")
d = ImageDraw.Draw(g)
for i, (t, f) in enumerate(bilder):
    g.paste(Image.open(f).resize((w, h)), (i * w, 28))
    d.text((i * w + 8, 8), t, fill="black")
g.save(AUS / "ablauf.png")
print("\n" + ("ALLES IN ORDNUNG" if not fehler else f"{len(fehler)} FEHLER"))
sys.exit(1 if fehler else 0)
