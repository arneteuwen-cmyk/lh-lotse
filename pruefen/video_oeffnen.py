"""Nimmt das Öffnen und Schließen des Glasfensters als Video auf (echte Testseite, lokale lotse.js, nichts wird hochgeladen).
Aufruf: py pruefen/video_oeffnen.py <Zielordner>"""
import shutil, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
B = "https://lechner-hayn-staging.dev10.econsor-programming.de"
HIER = Path(__file__).parent
CODE = (HIER.parent / "lotse.js").read_bytes(); LOGOS = (HIER.parent / "logos.json").read_bytes()
ZIEL = Path(sys.argv[1]); TMP = HIER / "fotos" / "_video"
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1280, "height": 800}, record_video_dir=str(TMP), record_video_size={"width": 1280, "height": 800})
    c.add_init_script("sessionStorage.setItem('lh-lotse-gegruesst','1')")
    s = c.new_page()
    s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    s.route("**/lh-lotse/logos.json", lambda r: r.fulfill(body=LOGOS, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}))
    s.goto(B + "/marke/lintex/?lotse-logo=vitra&lotse-zeit=tag&lotse-saison=keine", wait_until="domcontentloaded", timeout=90000)
    s.wait_for_timeout(4200)
    for _ in range(2):
        s.locator("#lh-lotse >> css=.knopf .koerper").click(); s.wait_for_timeout(2600)
        s.locator("#lh-lotse >> css=.kopf-leiste .zu").click(); s.wait_for_timeout(1500)
    pfad = s.video.path(); c.close(); b.close()
shutil.copy(pfad, ZIEL / "lotse_glasfenster_bewegung.webm"); print((ZIEL / "lotse_glasfenster_bewegung.webm").stat().st_size)
