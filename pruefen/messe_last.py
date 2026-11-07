"""Misst, wie viel Rechenzeit lotse.js auf der Testseite kostet: Seite je 5-mal mit und ohne Lotse, Medianwerte.
Aufruf: py pruefen/messe_last.py"""
import statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

B = "https://lechner-hayn-staging.dev10.econsor-programming.de/leistungen-expertise/raumakustik/"
CODE = (Path(__file__).parent.parent / "lotse.js").read_bytes()
JS_EIGEN = """() => { const e = performance.getEntriesByType('resource').find(r => r.name.includes('lh-lotse/lotse.js'));
  return e ? Math.round(e.duration) : null; }"""


def lauf(p, mit):
    b = p.chromium.launch()
    s = b.new_page(viewport={"width": 1440, "height": 900})
    cdp = s.context.new_cdp_session(s)
    cdp.send("Performance.enable")
    if mit:
        s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    else:
        s.route("**/lh-lotse/lotse.js", lambda r: r.abort())
    s.add_init_script("""window.__lang = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lang += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });""")
    s.goto(B, wait_until="load")
    s.wait_for_timeout(3000)
    m = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    blockiert = s.evaluate("window.__lang")
    b.close()
    return m["ScriptDuration"] * 1000, blockiert


with sync_playwright() as p:
    erg = {}
    for mit in (False, True, False, True, False, True, False, True, False, True):
        erg.setdefault(mit, []).append(lauf(p, mit))
for mit in (False, True):
    sk = statistics.median(x[0] for x in erg[mit]); bl = statistics.median(x[1] for x in erg[mit])
    print(f"{'mit Lotse ' if mit else 'ohne Lotse'}: Skriptzeit {sk:6.0f} ms · blockierende Zeit {bl:5.0f} ms")
print(f"Lotse-Datei: {len(CODE)/1024:.1f} KB (über GitHub Pages gzip-komprimiert ausgeliefert)")
