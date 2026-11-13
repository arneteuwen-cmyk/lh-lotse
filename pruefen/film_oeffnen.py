"""Zeigt das Öffnen und Schließen des Glasfensters Bild für Bild (Animationen werden angehalten und auf feste Zeiten gestellt).
Echte Testseite, lokale lotse.js, nichts wird hochgeladen. Ergebnis: pruefen/fotos/oeffnen_bogen.png, schliessen_bogen.png
Aufruf: py pruefen/film_oeffnen.py [Pfad der Seite]"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

B = "https://lechner-hayn-staging.dev10.econsor-programming.de"
HIER = Path(__file__).parent
CODE = (HIER.parent / "lotse.js").read_bytes()
LOGOS = (HIER.parent / "logos.json").read_bytes()
AUS = HIER / "fotos"
PFAD = sys.argv[1] if len(sys.argv) > 1 else "/?lotse-zeit=tag&lotse-saison=keine"
STELL = """t=>{const r=document.getElementById('lh-lotse').shadowRoot; r.getAnimations().forEach(a=>{ if(a.constructor.name==='Animation'){a.pause(); a.currentTime=t} });
  const k=r.querySelector('.knopf'); return r.getAnimations().length}"""
CLIP = {"x": 960, "y": 200, "width": 480, "height": 700}


def bogen(s, zeiten, name):
    bilder = []
    for t in zeiten:
        n = s.evaluate(STELL, t); s.wait_for_timeout(60)
        f = AUS / f"_{name}_{t}.png"; s.screenshot(path=str(f), clip=CLIP); bilder.append((t, f, n))
    b, h = 480, 700
    g = Image.new("RGB", (b * len(bilder) // 2 + (b if len(bilder) % 2 else 0), h * 2 + 60), "white"); d = ImageDraw.Draw(g)
    je = (len(bilder) + 1) // 2
    g = Image.new("RGB", (b * je, (h + 30) * 2), "white"); d = ImageDraw.Draw(g)
    for i, (t, f, n) in enumerate(bilder):
        x, y = (i % je) * b, (i // je) * (h + 30)
        g.paste(Image.open(f).resize((b, h)), (x, y + 30)); d.text((x + 8, y + 8), f"{t} ms", fill="black")
    g.save(AUS / f"{name}_bogen.png"); print(name, g.size)


with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    c.add_init_script("sessionStorage.setItem('lh-lotse-gegruesst','1')")
    s = c.new_page()
    s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    s.route("**/lh-lotse/logos.json", lambda r: r.fulfill(body=LOGOS, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}))
    fehl = []; s.on("pageerror", lambda e: fehl.append(str(e)))
    s.goto(B + PFAD, wait_until="domcontentloaded", timeout=90000); s.wait_for_timeout(3600)
    s.evaluate("document.getElementById('lh-lotse').shadowRoot.querySelector('.knopf').click()")
    bogen(s, [0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 900, 1100, 1300, 1700], "oeffnen")
    s.evaluate("document.getElementById('lh-lotse').shadowRoot.getAnimations().forEach(a=>{try{a.finish()}catch(e){}})"); s.wait_for_timeout(900)
    s.screenshot(path=str(AUS / "fenster_fertig.png"), clip=CLIP)
    s.evaluate("document.getElementById('lh-lotse').shadowRoot.querySelector('.kopf-leiste .zu').click()")
    bogen(s, [0, 60, 120, 180, 240, 300, 350, 399], "schliessen")
    s.evaluate("document.getElementById('lh-lotse').shadowRoot.getAnimations().forEach(a=>{try{a.play()}catch(e){}})"); s.wait_for_timeout(1200)
    s.screenshot(path=str(AUS / "nach_schliessen.png"), clip=CLIP)
    print([x for x in fehl if "lotse" in x.lower() or "feld" in x.lower()][:3])
    b.close()
