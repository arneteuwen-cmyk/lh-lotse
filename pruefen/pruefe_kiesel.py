"""Prüft den Kiesel (Form C) auf der echten Testseite mit der LOKALEN lotse.js – nichts wird hochgeladen, n8n wird simuliert.
Misst Standplatz neben der Kontakt-Ecke, Anzeige je Seite, Zustände, Leuchten, Chat. Bilder: pruefen/fotos/kiesel_*.png
Aufruf: py pruefen/pruefe_kiesel.py"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

B = "https://lechner-hayn-staging.dev10.econsor-programming.de"
CODE = (Path(__file__).parent.parent / "lotse.js").read_bytes()
LOGOS = (Path(__file__).parent.parent / "logos.json").read_bytes()
AUS = Path(__file__).parent / "fotos"
AUS.mkdir(exist_ok=True)
J = "document.getElementById('lh-lotse').shadowRoot"
fehler, bilder = [], []


def ok(bed, text):
    print(("OK   " if bed else "FEHL ") + text)
    if not bed:
        fehler.append(text)


def n8n(route):
    body = json.loads(route.request.post_data or "{}")
    if body.get("art") == "anfrage":
        d = {"ok": True, "antwort": "Vielen Dank! Ihre Anfrage ist bei unserem Team.", "aktion": "keine", "positionen": []}
    elif "Liste" in json.dumps(body):
        d = {"ok": True, "antwort": "Ich habe 2 Positionen erkannt.", "aktion": "angebot", "quellen": [],
             "positionen": [{"hersteller": "Lintex", "artikel": "Edge Wall", "ausfuehrung": "grau", "menge": "8", "hinweis": ""},
                            {"hersteller": "", "artikel": "Stehtisch", "ausfuehrung": "", "menge": "2", "hinweis": "Hersteller fehlt"}]}
    else:
        d = {"ok": True, "antwort": "Sie können Produkte in unseren Showrooms in Krefeld und Wuppertal ansehen.", "aktion": "keine", "positionen": [], "quellen": []}
    route.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=json.dumps(d))


def seite(b, pfad, vp=(1440, 900), mobil=False, gegruesst=True):
    c = b.new_context(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mobil, has_touch=mobil, device_scale_factor=2)
    if gegruesst:
        c.add_init_script("sessionStorage.setItem('lh-lotse-gegruesst','1')")
    s = c.new_page()
    s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    s.route("**/lh-lotse/logos.json", lambda r: r.fulfill(body=LOGOS, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}))
    s.route("**/webhook/lh-homepage-lotse", n8n)
    fehl = []
    s.on("pageerror", lambda e: fehl.append(str(e)))
    s.goto(B + pfad, wait_until="domcontentloaded", timeout=90000)
    s.wait_for_timeout(1900)
    return c, s, fehl


def lage(s):
    return s.evaluate(f"""(()=>{{const r={J}, k=r.querySelector('.knopf'), f=k.querySelector('.fig'), kb=k.querySelector('.koerper').getBoundingClientRect();
      const e=document.querySelector('.cta-fixed'); const er=e?e.getBoundingClientRect():null; const sichtbar=g=>getComputedStyle(f.querySelector(g)).opacity;
      return {{klasse:f.getAttribute('class'), host:document.getElementById('lh-lotse').className, unten:Math.round(kb.bottom), rechts:Math.round(kb.right), hoehe:Math.round(kb.height),
        ecke: er?Math.round(er.left):null, vh:innerHeight, zeichen:f.querySelector('.g-zeichen').textContent||(f.querySelector('.g-zeichen').innerHTML?'Zeichen':''),
        augen:sichtbar('.g-augen'), zu:sichtbar('.g-zu'), zeichenSichtbar:sichtbar('.g-zeichen'), hof:sichtbar('.hof'), muetze:getComputedStyle(f.querySelector('.xmas')).display}}}})()""")


def foto(s, name, titel, vp=(1440, 900), breite=340, hoehe=300):
    f = AUS / f"kiesel_{name}.png"
    s.screenshot(path=str(f), clip={"x": vp[0] - breite, "y": vp[1] - hoehe, "width": breite, "height": hoehe})
    bilder.append((titel, f))


with sync_playwright() as p:
    b = p.chromium.launch()
    # 1 Startseite: Standplatz, Größe, keine eigenen Fehler
    c, s, fehl = seite(b, "/?lotse-zeit=tag&lotse-saison=keine")
    l = lage(s)
    ok(l["ecke"] and abs(l["unten"] - l["vh"]) <= 2 and 0 <= l["ecke"] - l["rechts"] <= 12, f"Start: steht auf der Unterkante neben der Kontakt-Ecke {l}")
    ok(84 <= l["hoehe"] <= 88, f"Start: Körper {l['hoehe']} px hoch (Soll 86)")
    ok(not [x for x in fehl if "lotse" in x.lower()], f"Start: keine Skriptfehler vom Lotsen {fehl[:1]}")
    ok(float(l["augen"]) > .9 and l["zeichen"] == "", "Start: Augen, kein Zeichen")
    foto(s, "start", "Startseite")
    s.locator("#lh-lotse >> css=.knopf .koerper").click()
    s.wait_for_timeout(400)
    ok(s.locator("#lh-lotse >> css=.fenster").is_visible(), "Klick auf den Kiesel öffnet das Fenster")
    s.locator("#lh-lotse >> css=textarea").fill("Liste: 8 Edge Wall, 2 Stehtische"); s.keyboard.press("Enter"); s.wait_for_timeout(1400)
    ok(s.evaluate(f"!!{J}.querySelector('.zeige-liste .fig.zeigt') && !!{J}.querySelector('.tabelle')"), "Chat: Kiesel zeigt die Liste, Tabelle da")
    s.locator("#lh-lotse >> css=.tabelle .aktion").first.click(); s.wait_for_timeout(300)
    s.locator("#lh-lotse >> css=input[name=email]").fill("test@example.com"); s.locator("#lh-lotse >> css=input[name=ds]").check()
    s.locator("#lh-lotse >> css=.formular [type=submit]").click(); s.wait_for_timeout(600)
    ok(s.evaluate(f"!!{J}.querySelector('.mini-zeile .fig.freut')"), "Chat: Haken nach gesendeter Anfrage")
    f = AUS / "kiesel_chat.png"; s.screenshot(path=str(f), clip={"x": 1000, "y": 230, "width": 440, "height": 670});
    s.keyboard.press("Escape"); s.wait_for_timeout(300)
    ok(s.locator("#lh-lotse >> css=.knopf").is_visible(), "Escape schließt, Kiesel wieder da")
    c.close()
    # 2 Erster Besuch: Schild erscheint einmal
    c, s, _ = seite(b, "/?lotse-zeit=tag&lotse-saison=keine", gegruesst=False)
    s.wait_for_timeout(2200)
    ok("zeigen" in s.evaluate(f"{J}.querySelector('.knopf').className"), "Erster Besuch: Schild erscheint")
    foto(s, "schild", "Erster Besuch", breite=460)
    c.close()
    # 3 Anzeige je Seite
    for pfad, soll, titel in [("/leistungen-expertise/raumakustik/?lotse-zeit=tag&lotse-saison=keine", "Zeichen", "Raumakustik"),
                              ("/leistungen-expertise/innenarchitektur-planung/?lotse-zeit=tag&lotse-saison=keine", "Zeichen", "Innenarchitektur"),
                              ("/marke/lintex/?lotse-zeit=tag&lotse-saison=keine", "L", "Lintex"), ("/kontakt/?lotse-zeit=tag&lotse-saison=keine", "Zeichen", "Kontakt")]:
        c, s, _ = seite(b, pfad)
        l = lage(s)
        ok(l["zeichen"] == soll and float(l["zeichenSichtbar"]) > .8, f"{titel}: Glas zeigt beim Ankommen „{soll}“ ({l['zeichen']}, {l['zeichenSichtbar']})")
        foto(s, titel.lower(), titel)
        s.wait_for_timeout(2600)
        l = lage(s)
        ok(float(l["augen"]) > .9 and float(l["zeichenSichtbar"]) < .1, f"{titel}: danach wieder die Augen")
        c.close()
    # 3b Herstellerlogo im Glas: kurzes Logo erscheint und verschwindet wieder, langes Logo bleibt beim Buchstaben
    for slug, soll in [("vitra", True), ("bene", True), ("fritz-hansen", False)]:
        c, s, _ = seite(b, f"/marke/lintex/?lotse-logo={slug}&lotse-zeit=tag&lotse-saison=keine")
        s.wait_for_timeout(400)
        da = s.evaluate(f"(()=>{{const i={J}.querySelector('.knopf .g-zeichen image'); return !!i && i.getBoundingClientRect().height}})()")
        l = lage(s)
        ok(bool(da) == soll and float(l["zeichenSichtbar"]) > .8, f"Logo {slug}: {'Logo im Glas' if soll else 'Buchstabe bleibt'} ({da})")
        if soll:
            foto(s, f"logo_{slug}", f"Logo {slug}")
        s.wait_for_timeout(2700)
        l = lage(s)
        ok(float(l["augen"]) > .9 and float(l["zeichenSichtbar"]) < .1, f"Logo {slug}: verschwindet wieder, Augen zurück")
        c.close()
    # 4 Licht: leuchtet
    c, s, _ = seite(b, "/produkt-kategorie/beleuchtung/?lotse-zeit=tag&lotse-saison=keine")
    l = lage(s)
    ok("licht" in l["host"] and float(l["hof"]) > .5, f"Beleuchtung: leuchtet {l['host']} {l['hof']}")
    foto(s, "licht", "Beleuchtung (leuchtet)")
    c.close()
    # 5 Abend, Kasse, Dezember
    c, s, _ = seite(b, "/?lotse-zeit=nacht&lotse-saison=keine")
    l = lage(s)
    ok("ruht" in l["klasse"] and float(l["zu"]) > .9, "Abend: ruht (Augen zu)")
    foto(s, "abend", "Abend / Wochenende")
    s.locator("#lh-lotse >> css=.knopf .koerper").hover(); s.wait_for_timeout(700)
    ok("ruht" not in lage(s)["klasse"], "Abend: wird bei Maus wach")
    c.close()
    c, s, _ = seite(b, "/impressum/?lotse-zeit=tag&lotse-saison=keine")
    ok("ruht" in lage(s)["klasse"], "Impressum: schweigt")
    c.close()
    c, s, _ = seite(b, "/?lotse-zeit=tag&lotse-saison=dezember")
    ok(lage(s)["muetze"] != "none", "Dezember: Weihnachtsmütze")
    foto(s, "dezember", "Dezember")
    c.close()
    # 6 Handy
    c, s, _ = seite(b, "/?lotse-zeit=tag&lotse-saison=keine", vp=(390, 844), mobil=True)
    l = lage(s)
    ok(abs(l["unten"] - l["vh"]) <= 2 and 0 <= l["ecke"] - l["rechts"] <= 12 and 62 <= l["hoehe"] <= 66 and s.evaluate("document.documentElement.scrollWidth<=innerWidth"), f"Handy: Platz und Größe {l}")
    foto(s, "handy", "Handy", vp=(390, 844), breite=340)
    c.close()
    # 7 reduzierte Bewegung
    c = b.new_context(viewport={"width": 1200, "height": 800}, reduced_motion="reduce"); s = c.new_page()
    s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
    s.goto(B + "/?lotse-zeit=tag", wait_until="domcontentloaded"); s.wait_for_timeout(1500)
    ok(s.evaluate(f"getComputedStyle({J}.querySelector('.knopf .lid')).animationName") == "none", "Reduzierte Bewegung: kein Blinzeln")
    c.close()
    b.close()

w, h = 340, 300
g = Image.new("RGB", (w * 5, (h + 28) * 2), "white")
d = ImageDraw.Draw(g)
for i, (t, f) in enumerate(bilder[:10]):
    x, y = (i % 5) * w, (i // 5) * (h + 28)
    bild = Image.open(f)
    bild = bild.crop((bild.width - w * 2, 0, bild.width, bild.height)).resize((w, h))
    g.paste(bild, (x, y + 28)); d.text((x + 8, y + 8), t, fill="black")
g.save(AUS / "kiesel_uebersicht.png")
print("\n" + ("ALLES IN ORDNUNG" if not fehler else f"{len(fehler)} FEHLER"))
sys.exit(1 if fehler else 0)
