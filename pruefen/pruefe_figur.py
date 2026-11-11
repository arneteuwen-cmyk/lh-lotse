"""Prüft alle Zustände der Figur auf der Testseite von lechner+hayn mit der LOKALEN lotse.js (vor dem Veröffentlichen).
Antworten von n8n werden hier simuliert – es geht keine Mail raus.
Aufruf: py pruefen/pruefe_figur.py"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

B = "https://lechner-hayn-staging.dev10.econsor-programming.de/"
CODE = (Path(__file__).parent.parent / "lotse.js").read_bytes()
AUS = Path(__file__).parent / "fotos"
fehler = []


def ok(bed, text):
    print(("OK   " if bed else "FEHL ") + text)
    if not bed:
        fehler.append(text)


def antwort_n8n(route):
    body = json.loads(route.request.post_data or "{}")
    if body.get("art") == "anfrage":
        d = {"ok": True, "antwort": "Vielen Dank! Ihre Anfrage ist bei unserem Team angekommen.", "aktion": "keine", "positionen": []}
    elif "Liste" in json.dumps(body):
        d = {"ok": True, "antwort": "Ich habe 2 Positionen erkannt.", "aktion": "angebot",
             "positionen": [{"hersteller": "Lintex", "artikel": "Edge Wall", "ausfuehrung": "grau", "menge": "8", "hinweis": ""},
                            {"hersteller": "", "artikel": "Stehtisch", "ausfuehrung": "", "menge": "2", "hinweis": "Hersteller fehlt"}]}
    else:
        d = {"ok": True, "antwort": "Sie können Produkte in unseren Showrooms in Krefeld und Wuppertal ansehen. Muster liegen in beiden Häusern aus.", "aktion": "keine", "positionen": [], "quellen": [{"titel": "Lintex", "url": "https://lechner-hayn-staging.dev10.econsor-programming.de/marke/lintex/"}]}
    route.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=json.dumps(d))


def seite(b, query="", vp=(1440, 900), mobil=False, gewunken=True):
    c = b.new_context(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mobil, has_touch=mobil)
    if gewunken:
        c.add_init_script("localStorage.setItem('lh-lotse-gewunken','1')")
    s = c.new_page()
    s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    s.route("**/webhook/lh-homepage-lotse", antwort_n8n)
    s.goto(B + query, wait_until="load")
    s.wait_for_timeout(1500)
    return c, s


J = "document.getElementById('lh-lotse').shadowRoot"
ECKE = lambda vp: {"x": vp[0] - 300, "y": vp[1] - 360, "width": 300, "height": 360}

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1 Nacht: schläft, sitzt, Zzz sichtbar, Abendgruß
    c, s = seite(b, "?lotse-zeit=nacht&lotse-saison=keine&lotse-stil=verspielt")
    s.wait_for_timeout(9000)
    k = s.evaluate(f"(()=>{{const r={J}; return {{fig:r.querySelector('.knopf .fig').getAttribute('class'), knopf:r.querySelector('.knopf').className, zzz:getComputedStyle(r.querySelector('.knopf .zzz')).display}}}})()")
    ok("schlaeft" in k["fig"] and "sitzt" in k["knopf"] and k["zzz"] != "none", f"Nacht: schläft auf der Kante {k}")
    s.screenshot(path=str(AUS / "z_nacht.png"), clip=ECKE((1440, 900)))
    s.locator("#lh-lotse >> css=.knopf .kopf").hover(); s.wait_for_timeout(700)
    k2 = s.evaluate(f"{J}.querySelector('.knopf .fig').getAttribute('class')")
    ok("schlaeft" not in k2, "Nacht: wacht bei Maus auf")
    s.locator("#lh-lotse >> css=.knopf").click(); s.wait_for_timeout(300)
    v = s.evaluate(f"{J}.querySelector('.verlauf').innerText")
    ok("24 Stunden" in v or "Werktag" in v, "Nacht: Begrüßung mit Zusage")
    c.close()
    # 1b Nacht in der ruhigen Fassung: kein Schlafen, nur der Hinweis im Fenster
    c, s = seite(b, "?lotse-zeit=nacht&lotse-saison=keine")
    s.wait_for_timeout(9000)
    k = s.evaluate(f"(()=>{{const r={J}; return {{fig:r.querySelector('.knopf .fig').getAttribute('class'), knopf:r.querySelector('.knopf').className}}}})()")
    ok("schlaeft" not in k["fig"] and "sitzt" in k["knopf"], f"ruhig Nacht: sitzt wach {k}")
    s.evaluate(f"{J}.querySelector('.knopf').click()"); s.wait_for_timeout(300)
    ok(any(x in s.evaluate(f"{J}.querySelector('.verlauf').innerText") for x in ("24 Stunden", "Werktag")), "ruhig Nacht: Begrüßung mit Zusage")
    c.close()
    # 2 Dezember und Sommer
    for saison, sel in [("dezember", ".xmas"), ("sommer", ".brille")]:
        c, s = seite(b, f"?lotse-zeit=tag&lotse-saison={saison}" + ("&lotse-stil=verspielt" if saison == "sommer" else ""))
        d = s.evaluate(f"getComputedStyle({J}.querySelector('.knopf {sel}')).display")
        ok(d != "none", f"{saison}: {sel} sichtbar")
        s.screenshot(path=str(AUS / f"z_{saison}.png"), clip=ECKE((1440, 900)))
        c.close()
    # 3 Lese-Blase, Zeigen, Showroom-Karte, Luftsprung
    c, s = seite(b, "?lotse-zeit=tag&lotse-saison=keine")
    s.evaluate("window.__lhLotseBlase && window.__lhLotseBlase()"); s.wait_for_timeout(400)
    bl = s.evaluate(f"(()=>{{const e={J}.querySelector('.blase'); return {{zu:e.hidden, text:e.innerText}}}})()")
    ok(not bl["zu"] and "helfen" in bl["text"], f"Lese-Blase erscheint {bl}")
    s.screenshot(path=str(AUS / "z_blase.png"), clip=ECKE((1440, 900)))
    s.evaluate("window.__lhLotseBlase()");
    s.locator("#lh-lotse >> css=.blase .blase-text").click(); s.wait_for_timeout(300)
    ok(s.locator("#lh-lotse >> css=.fenster").is_visible(), "Klick auf Blase öffnet den Lotsen")
    s.locator("#lh-lotse >> css=textarea").fill("Kann ich das ansehen?"); s.keyboard.press("Enter"); s.wait_for_timeout(800)
    ok(s.evaluate(f"!!{J}.querySelector('.karte')"), "Showroom-Karte mit Adressen")
    s.wait_for_timeout(1200)
    ok(s.evaluate(J + ".querySelector('.quellen a') && " + J + ".querySelector('.quellen a').href.includes('/marke/lintex/')"), "Quellen-Link unter der Antwort")
    ok(s.evaluate(f"[...{J}.querySelectorAll('.msg.lotse')].some(m=>m.innerText.includes('Muster liegen in beiden'))"), "Antwort vollständig eingeflossen")
    s.locator("#lh-lotse >> css=textarea").fill("Liste: 8 Edge Wall, 2 Stehtische"); s.keyboard.press("Enter"); s.wait_for_timeout(800)
    ok(s.evaluate(f"!!{J}.querySelector('.zeige-liste .fig.zeigt') && !!{J}.querySelector('.tabelle')"), "Lotse zeigt auf die Tabelle")
    s.screenshot(path=str(AUS / "z_tabelle.png"))
    s.locator("#lh-lotse >> css=.tabelle .aktion").first.click(); s.wait_for_timeout(300)
    s.locator("#lh-lotse >> css=input[name=email]").fill("test@example.com")
    s.locator("#lh-lotse >> css=input[name=ds]").check()
    s.locator("#lh-lotse >> css=.formular [type=submit]").click(); s.wait_for_timeout(500)
    ok(not s.evaluate(f"!!{J}.querySelector('.mini-zeile .fig.freut')") and s.evaluate(f"!!{J}.querySelector('.mini-zeile')"), "ruhig: Dank ohne Luftsprung")
    s.screenshot(path=str(AUS / "z_freude.png"))
    # 4 Ruhe-Schalter und Mensch
    s.locator("#lh-lotse >> css=.ruhig").click(); s.wait_for_timeout(200)
    ok(s.evaluate(f"{J}.querySelector('.ruhig').getAttribute('aria-pressed')") == "true", "Ruhe-Schalter an")
    s.locator("#lh-lotse >> css=.mensch").click(); s.wait_for_timeout(200)
    ok("Frage an unser Team" in s.evaluate(f"{J}.querySelector('.formular').innerText"), "Mit einem Menschen sprechen öffnet das Formular")
    s.keyboard.press("Escape"); s.wait_for_timeout(200)
    an = s.evaluate(f"getComputedStyle({J}.querySelector('.knopf .koerper')).animationName")
    ok(an == "none", f"ruhig gestellt: keine Bewegung ({an})")
    c.close()
    # 5 Fehlerfall: n8n nicht erreichbar
    c, s = seite(b, "?lotse-zeit=tag")
    s.unroute("**/webhook/lh-homepage-lotse"); s.route("**/webhook/lh-homepage-lotse", lambda r: r.abort())
    s.evaluate(f"{J}.querySelector('.knopf').click()"); s.wait_for_timeout(300); s.locator("#lh-lotse >> css=textarea").fill("Hallo"); s.keyboard.press("Enter"); s.wait_for_timeout(800)
    ok(s.evaluate(f"[...{J}.querySelectorAll('.aktion')].some(b=>b.textContent==='Erneut versuchen')"), "Fehler: Erneut versuchen")
    c.close()
    # 6 Handy: Blase und Knopf über der Ecke
    c, s = seite(b, "?lotse-zeit=tag&lotse-saison=keine", vp=(390, 844), mobil=True)
    s.evaluate("window.__lhLotseBlase()"); s.wait_for_timeout(400)
    r = s.evaluate(f"(()=>{{const e={J}.querySelector('.blase').getBoundingClientRect(); return [e.left,e.right,e.top,e.bottom]}})()")
    ok(r[0] >= 0 and r[1] <= 390 and r[3] <= 844, f"Handy: Blase im Bild {r}")
    s.screenshot(path=str(AUS / "z_handy_blase.png"))
    c.close()
    b.close()
print("\n" + ("ALLES IN ORDNUNG" if not fehler else f"{len(fehler)} FEHLER"))
sys.exit(1 if fehler else 0)
