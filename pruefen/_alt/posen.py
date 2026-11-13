"""Rendert alle Posen der Figur groß nebeneinander nach pruefen/fotos/posen.png (lokaler Server 8779)."""
from playwright.sync_api import sync_playwright

JS = """() => {
  const r = document.getElementById('lh-lotse').shadowRoot;
  const w = document.createElement('div');
  w.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:200px;background:#fff;display:flex;gap:16px;z-index:2147483647;padding:10px';
  for (const p of ['', 'zeigt', 'haelt', 'freut', 'denkt', 'sitzt', 'schlaeft']) {
    const d = document.createElement('div');
    d.style.cssText = 'width:120px;height:140px;text-align:center;font:12px sans-serif';
    d.innerHTML = r.querySelector('.knopf .fig').outerHTML + '<div>' + (p || 'steht') + '</div>';
    const f = d.querySelector('svg');
    if (p === 'sitzt' || p === 'schlaeft') d.classList.add('sitzt');
    if (p && p !== 'sitzt') f.classList.add(p);
    f.classList.add('ruhe');
    w.appendChild(d);
  }
  r.appendChild(w);
}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    s = b.new_page(viewport={"width": 1000, "height": 200})
    s.goto("http://127.0.0.1:8779/?lotse-zeit=tag&lotse-saison=keine")
    s.wait_for_timeout(800)
    s.evaluate(JS)
    s.wait_for_timeout(300)
    s.screenshot(path="pruefen/fotos/posen.png")
    b.close()
print("ok")
