"""Ablauf an der Kontakt-Ecke auf der Testseite (lokale lotse.js), Stand Arne 11.11.2026:
sitzt beim Start auf dem Boden neben dem Dreieck → steht einmal je Besuch auf und grüßt → sitzt wieder;
weitere Seiten im selben Besuch: sitzt ruhig; Maus darüber: steht auf, danach sitzt er wieder.
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
      const sitzt=k.classList.contains('sitzt'); const b=k.querySelector(sitzt?'.beine-sitzen':'.beine-stehen').getBoundingClientRect();
      const t=[...document.querySelectorAll('.cta-fixed *')].filter(x=>/KONTAKT/i.test(x.textContent)&&!x.children.length).map(x=>x.getBoundingClientRect())[0];
      const f=k.querySelector('.fig').getBoundingClientRect(); const ueber= t ? !(f.right<t.left||f.left>t.right||f.bottom<t.top||f.top>t.bottom) : null;
      const fig=k.querySelector('.fig').getBoundingClientRect();
      return {{klasse:k.className, textUeberdeckt:ueber, text:t?[Math.round(t.left),Math.round(t.top),Math.round(t.right),Math.round(t.bottom)]:null, fussUnten:Math.round(b.bottom), rechts:Math.round(Math.max(b.right, k.querySelector('.oben').getBoundingClientRect().right)), eckeLinks:Math.round(e.left), hoehe:innerHeight}}}})()""")


def am_boden(l):
    if "sitzt" in l["klasse"]:
        return l["fussUnten"] <= l["hoehe"] + 1   # sitzt auf dem Dreieck, Füße im Bild
    return abs(l["fussUnten"] - l["hoehe"]) <= 5 and l["rechts"] <= l["eckeLinks"] + 1


def foto(s, name, titel, vp):
    f = AUS / f"ablauf_{name}.png"
    s.screenshot(path=str(f), clip={"x": vp[0] - 320, "y": vp[1] - 300, "width": 320, "height": 300})
    bilder.append((titel, f))


with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, mobil in [((1440, 900), False), ((390, 844), True)]:
        n = "h" if mobil else "d"
        c = b.new_context(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mobil, has_touch=mobil, device_scale_factor=2)
        s = c.new_page()
        s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
        s.goto(B, wait_until="domcontentloaded")
        s.wait_for_timeout(300)
        l = lage(s)
        ok("sitzt" in l["klasse"] and am_boden(l), f"{n}: sitzt beim Start auf dem Dreieck {l}")
        if not mobil:
            foto(s, n + "1", "Start: sitzt", vp)
        s.wait_for_timeout(2700)
        l = lage(s)
        ok("sitzt" not in l["klasse"] and "gruesst" in l["klasse"] and am_boden(l), f"{n}: steht auf und grüßt {l}")
        if not mobil:
            foto(s, n + "2", "steht auf und grüßt", vp)
        s.wait_for_timeout(3000)
        l = lage(s)
        ok("sitzt" in l["klasse"] and am_boden(l), f"{n}: sitzt wieder {l}")
        foto(s, n + "3", "sitzt wieder" if not mobil else "Handy: sitzt", vp)
        # nächste Seite im selben Besuch: kein Aufstehen
        s.goto(B, wait_until="domcontentloaded")
        s.wait_for_timeout(3000)
        ok("sitzt" in lage(s)["klasse"], f"{n}: nächste Seite: sitzt ruhig, kein Gruß")
        if not mobil:
            s.locator("#lh-lotse >> css=.knopf .kopf").hover()
            s.wait_for_timeout(900)
            l = lage(s)
            ok("sitzt" not in l["klasse"] and am_boden(l), f"{n}: Maus darüber: steht neben dem Dreieck {l}")
            foto(s, n + "4", "Maus darüber: steht", vp)
            s.mouse.move(200, 200)
            s.wait_for_timeout(7000)
            ok("sitzt" in lage(s)["klasse"], f"{n}: setzt sich wieder")
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
