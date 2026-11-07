"""Prüft den Lotsen in einem echten Browser: Desktop 1440 und Handy 390, Knopf, Fenster, Tastatur, Bildschirmfotos.
Aufruf: py pruefen/pruefe_lotse.py [adresse]   (Standard http://127.0.0.1:8779/)
Mit --frage wird zusätzlich eine echte Frage an den Lotsen geschickt (kostet einen Aufruf)."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ADRESSE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://127.0.0.1:8779/")
FRAGE = "--frage" in sys.argv
AUS = Path(__file__).parent / "fotos"
AUS.mkdir(exist_ok=True)
fehler = []


def pruefe(bed, text):
    print(("OK   " if bed else "FEHL ") + text)
    if not bed:
        fehler.append(text)


with sync_playwright() as p:
    b = p.chromium.launch()
    for name, groesse, mobil in [("desktop", (1440, 900), False), ("handy", (390, 844), True)]:
        s = b.new_page(viewport={"width": groesse[0], "height": groesse[1]}, is_mobile=mobil, has_touch=mobil)
        s.goto(ADRESSE + "?lotse-bereich=raumakustik")
        s.wait_for_timeout(1200)
        knopf = s.locator("#lh-lotse >> css=.knopf")
        pruefe(knopf.is_visible(), f"{name}: Knopf sichtbar")
        bb = knopf.bounding_box()
        pruefe(bb and bb["x"] + bb["width"] <= groesse[0] and bb["y"] + bb["height"] <= groesse[1], f"{name}: Knopf im Bild {bb}")
        pruefe(s.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"{name}: kein Querscrollen")
        s.wait_for_timeout(2600)
        s.screenshot(path=str(AUS / f"{name}_1_knopf.png"))
        knopf.click()
        s.wait_for_timeout(300)
        fenster = s.locator("#lh-lotse >> css=.fenster")
        pruefe(fenster.is_visible(), f"{name}: Fenster offen")
        fb = fenster.bounding_box()
        pruefe(fb["x"] >= 0 and fb["x"] + fb["width"] <= groesse[0] + 1 and fb["y"] >= 0, f"{name}: Fenster im Bild {fb}")
        pruefe(s.evaluate("document.getElementById('lh-lotse').shadowRoot.activeElement && document.getElementById('lh-lotse').shadowRoot.activeElement.tagName") == "TEXTAREA", f"{name}: Fokus im Textfeld")
        s.screenshot(path=str(AUS / f"{name}_2_fenster.png"))
        if FRAGE and name == "desktop":
            s.locator("#lh-lotse >> css=textarea").fill("Kann ich den Unterschied vorher hören?")
            s.keyboard.press("Enter")
            s.wait_for_function("document.getElementById('lh-lotse').shadowRoot.querySelectorAll('.msg.lotse').length >= 2", timeout=40000)
            s.wait_for_timeout(300)
            s.screenshot(path=str(AUS / f"{name}_3_antwort.png"))
            s.locator("#lh-lotse >> css=textarea").fill("Bitte Angebot für 8x Lintex Edge Wall 1200x600 grau und 2 Stehtische")
            s.keyboard.press("Enter")
            s.wait_for_function("document.getElementById('lh-lotse').shadowRoot.querySelector('.tabelle')", timeout=60000)
            s.wait_for_timeout(300)
            s.screenshot(path=str(AUS / f"{name}_4_tabelle.png"))
            s.locator("#lh-lotse >> css=.tabelle .aktion").first.click()
            s.wait_for_timeout(300)
            s.screenshot(path=str(AUS / f"{name}_5_formular.png"))
        s.keyboard.press("Escape")
        s.wait_for_timeout(200)
        pruefe(not fenster.is_visible(), f"{name}: Escape schließt")
        s.close()
    # reduzierte Bewegung: keine Animation
    s = b.new_page(viewport={"width": 1000, "height": 700}, reduced_motion="reduce")
    s.goto(ADRESSE)
    s.wait_for_timeout(500)
    anim = s.evaluate("getComputedStyle(document.getElementById('lh-lotse').shadowRoot.querySelector('.koerper')).animationName")
    pruefe(anim in ("none", ""), f"reduzierte Bewegung: keine Animation ({anim})")
    b.close()
print("\n" + ("ALLES IN ORDNUNG" if not fehler else f"{len(fehler)} FEHLER"))
sys.exit(1 if fehler else 0)
