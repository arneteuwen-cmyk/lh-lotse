# Lotse – KI-Assistent von lechner+hayn

Einbau auf der Website (eine Zeile, z. B. GeneratePress → Elemente → Hook `wp_footer`):

```html
<script src="https://arneteuwen-cmyk.github.io/lh-lotse/lotse.js" defer></script>
```

- `lotse.js` – Figur, Fenster, Stücklisten, Anfrageformular (keine Abhängigkeiten; Excel-Leser wird nur bei Bedarf von cdnjs geladen).
- `index.html` – Testseite mit allen Bereichen.
- Antworten: n8n-Workflow „Homepage-Lotse (Claude)“. Wissen: OneDrive `Claude Homepage/Lotse/` (`werkzeuge/baue_wissen.py --hochladen`).
- Prüfen: `py pruefen/pruefe_lotse.py [--frage]`.
