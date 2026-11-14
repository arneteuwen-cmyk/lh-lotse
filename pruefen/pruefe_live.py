"""Prüft den Lotsen so, wie ihn Besucher der Testseite bekommen: echte lotse.js von GitHub Pages, echter n8n-Workflow (eine echte Frage, keine Anfrage).
Aufruf: py pruefen/pruefe_live.py"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
B = "https://lechner-hayn-staging.dev10.econsor-programming.de"
J = "document.getElementById('lh-lotse').shadowRoot"
AUS = Path(__file__).parent / "fotos"
fehler = []
def ok(b, t):
    print(("OK   " if b else "FEHL ") + t); fehler.append(t) if not b else None
with sync_playwright() as p:
    b = p.chromium.launch()
    r = b.new_context().request
    js = r.get("https://arneteuwen-cmyk.github.io/lh-lotse/lotse.js"); lo = r.get("https://arneteuwen-cmyk.github.io/lh-lotse/logos.json")
    ok(js.ok and "KI-Lotse" in js.text() and "glasOrt" in js.text(), f"GitHub Pages liefert die neue lotse.js ({len(js.body())} Bytes)")
    ok(lo.ok and "vitra" in lo.text(), "GitHub Pages liefert logos.json")
    c = b.new_context(viewport={"width": 1440, "height": 900}); s = c.new_page()
    fehl = []; s.on("pageerror", lambda e: fehl.append(str(e)))
    s.goto(B + "/marke/lintex/?lotse-logo=vitra&lotse-zeit=tag&lotse-saison=keine", wait_until="domcontentloaded", timeout=90000); s.wait_for_timeout(1500)
    ok(s.evaluate(f"!!document.getElementById('lh-lotse') && {J}.querySelector('.knopf .koerper') !== null"), "Testseite: der Kiesel steht da")
    ok(s.evaluate(f"(()=>{{const i={J}.querySelector('.knopf .g-zeichen image'); return !!i}})()"), "Testseite: Herstellerlogo im Glas")
    s.wait_for_timeout(3000)
    s.locator("#lh-lotse >> css=.knopf .koerper").click(); s.wait_for_timeout(1500)
    ok(s.evaluate(f"{J}.querySelector('.kopf-leiste .name').textContent") == "KI-Lotse" and s.locator("#lh-lotse >> css=.fenster").is_visible(), "Testseite: Glasfenster offen, Name KI-Lotse")
    s.locator("#lh-lotse >> css=textarea").fill("Wie heißen Sie und wo kann ich Möbel ansehen?"); s.keyboard.press("Enter")
    s.wait_for_function(f"[...{J}.querySelectorAll('.msg.lotse')].length >= 2 && !{J}.querySelector('.fenster').classList.contains('hoert')", timeout=60000); s.wait_for_timeout(1500)
    antwort = s.evaluate(f"[...{J}.querySelectorAll('.msg.lotse')].pop().textContent")
    print("Antwort:", antwort[:400])
    ok("Krefeld" in antwort or "Wuppertal" in antwort or "Showroom" in antwort, "n8n antwortet aus dem Wissen")
    s.screenshot(path=str(AUS / "live_fenster.png"), clip={"x": 960, "y": 200, "width": 480, "height": 700})
    ok(not [x for x in fehl if "lotse" in x.lower()], f"keine Skriptfehler vom Lotsen {fehl[:1]}")
    b.close()
print("\nALLES IN ORDNUNG" if not fehler else f"\n{len(fehler)} FEHLER"); sys.exit(1 if fehler else 0)
