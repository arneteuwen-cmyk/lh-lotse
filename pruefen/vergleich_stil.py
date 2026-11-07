"""Vergleichsbild ruhig/verspielt auf der echten Testseite (lokale lotse.js): steht, sitzt, Dezember.
Ergebnis: pruefen/fotos/vergleich_stil.png"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

B = "https://lechner-hayn-staging.dev10.econsor-programming.de/"
CODE = (Path(__file__).parent.parent / "lotse.js").read_bytes()
AUS = Path(__file__).parent / "fotos"
bilder = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for stil in ("ruhig", "verspielt"):
        for name, q, warten in [("steht", "lotse-zeit=tag&lotse-saison=keine", 1500), ("sitzt", "lotse-zeit=tag&lotse-saison=keine", 10000), ("Dezember", "lotse-zeit=tag&lotse-saison=dezember", 10000)]:
            c = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
            c.add_init_script("localStorage.setItem('lh-lotse-gewunken','1')")
            s = c.new_page()
            s.route("**/lh-lotse/lotse.js", lambda r: r.fulfill(body=CODE, content_type="application/javascript"))
            s.goto(B + f"?{q}&lotse-stil={stil}", wait_until="domcontentloaded")
            s.wait_for_timeout(warten)
            f = AUS / f"stil_{stil}_{name}.png"
            s.screenshot(path=str(f), clip={"x": 1220, "y": 640, "width": 220, "height": 260})
            bilder.append((stil, name, f))
            c.close()
    b.close()
w, h = 440, 520
gesamt = Image.new("RGB", (w * 3, h * 2 + 60), "white")
d = ImageDraw.Draw(gesamt)
for i, (stil, name, f) in enumerate(bilder):
    x, y = (i % 3) * w, (i // 3) * (h + 30) + 30
    gesamt.paste(Image.open(f).resize((w, h)), (x, y))
    d.text((x + 10, y - 22), f"{stil} – {name}", fill="black")
gesamt.save(AUS / "vergleich_stil.png")
print("ok")
