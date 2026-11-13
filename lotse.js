/*! Lotse – KI-Assistent von lechner+hayn · Stand 07.11.2026
 * Einbau: <script src="https://arneteuwen-cmyk.github.io/lh-lotse/lotse.js" defer></script>
 * Optional am Script-Tag: data-bereich="raumakustik" (sonst erkennt der Lotse den Bereich aus der Adresse).
 * Antworten kommen vom n8n-Workflow „Homepage-Lotse (Claude)“ (Jy5Mw3M3bXjj5kCi). Keine Abhängigkeiten.
 */
(function () {
  'use strict';
  if (window.__lhLotse) return; window.__lhLotse = true;

  var EINST = {
    adresse: 'https://lechnerhayn.app.n8n.cloud/webhook/lh-homepage-lotse',
    schluessel: 'HPLotse-13cc76124068',
    datenschutz: '/datenschutz/',
    rot: '#EB1E26',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  };
  var skript = document.currentScript;

  // ---------- Speicher (darf fehlen) ----------
  function lies(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }
  function schreib(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} }

  // ---------- Bereich erkennen ----------
  function bereichErkennen() {
    var fest = skript && skript.getAttribute('data-bereich');
    if (fest && fest !== 'auto') return fest;
    var q = (location.search.match(/[?&]lotse-bereich=([a-z0-9-]+)/) || [])[1];
    if (q) return q;
    var p = (location.pathname || '').toLowerCase(), k = document.body ? document.body.className : '';
    var m = p.match(/\/marke\/([a-z0-9-]+)/);
    if (m) return 'hersteller-' + m[1];
    if (/(^|\s)(single-product|post-type-archive-product|tax-product_cat)(\s|$)/.test(k) || /\/produkt\/|\/shop\//.test(p)) return 'shop';
    var regeln = [[/akustik/, 'raumakustik'], [/licht|beleuchtung/, 'beleuchtung'], [/moebel-?design|individuelle/, 'moebeldesign'],
      [/nachhaltig/, 'nachhaltigkeit'], [/innenarchitektur|planung/, 'innenarchitektur'], [/new-?work/, 'newwork'], [/consulting/, 'consulting']];
    for (var i = 0; i < regeln.length; i++) if (regeln[i][0].test(p)) return regeln[i][1];
    return 'allgemein';
  }
  var BEREICH = bereichErkennen();

  var TEXTE = {
    allgemein: { blase: 'Kann ich Ihnen bei etwas helfen?', titel: 'Wobei darf ich helfen?', merkmal: 'muetze', tipps: ['Was macht lechner+hayn?', 'Wo kann ich Möbel ansehen?', 'Stückliste hochladen'] },
    innenarchitektur: { blase: 'Haben Sie einen Grundriss? Schicken Sie ihn mir gern.', titel: 'Fragen zur Planung?', merkmal: 'stift', tipps: ['Wie läuft eine Planung ab?', 'Grundriss schicken', 'Wer gehört zum Kreativteam?'] },
    raumakustik: { blase: 'Hallt es bei Ihnen? Ich erkläre Ihnen gern, wie wir messen.', titel: 'Hallt es bei Ihnen?', merkmal: 'wellen', tipps: ['Wie läuft ein Akustikprojekt ab?', 'Kann ich das probehören?', 'Welche Nachhallzeit ist erlaubt?'] },
    beleuchtung: { blase: 'Soll ich Ihnen erklären, wie eine Lichtplanung abläuft?', titel: 'Fragen zum Licht?', merkmal: 'leuchte', tipps: ['Wie läuft eine Lichtplanung ab?', 'Wo kann ich Licht erleben?', 'Grundriss schicken'] },
    moebeldesign: { blase: 'Etwas Eigenes geplant? Erzählen Sie mir davon.', titel: 'Etwas Eigenes geplant?', merkmal: 'zollstock', tipps: ['Was können Sie individuell bauen?', 'Wie läuft eine Sonderanfertigung ab?', 'Skizze oder Liste hochladen'] },
    nachhaltigkeit: { blase: 'Alte Möbel aufarbeiten statt neu kaufen? Fragen Sie mich.', titel: 'Nachhaltig einrichten?', merkmal: 'blatt', tipps: ['Können Sie alte Möbel aufarbeiten?', 'Was ist der Walkaround?', 'Welche Siegel gibt es?'] },
    shop: { blase: 'Mehrere Stück oder eine ganze Liste? Ich nehme sie gern auf.', titel: 'Fragen zum Produkt?', merkmal: 'massband', tipps: ['Angebot für mehrere Stück', 'Stückliste hochladen', 'Kann ich das Produkt ansehen?'] },
    hersteller: { blase: 'Wo Sie das ansehen können? Fragen Sie mich.', titel: 'Fragen zum Hersteller?', merkmal: 'muetze', tipps: ['Wo kann ich das ansehen?', 'Welches Modell passt zu mir?', 'Angebot anfragen'] }
  };
  // Tageszeit und Jahreszeit (Europe/Berlin). Zum Testen: ?lotse-zeit=nacht|tag, ?lotse-saison=dezember|sommer|keine
  function berlin() {
    try {
      var t = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', hour: 'numeric', month: 'numeric', day: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; t.forEach(function (x) { o[x.type] = x.value; }); return { tag: o.weekday, stunde: +o.hour, monat: +o.month, datum: +o.day };
    } catch (e) { var d = new Date(); return { tag: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()], stunde: d.getHours(), monat: d.getMonth() + 1, datum: d.getDate() }; }
  }
  var JETZT = berlin(), QS = location.search;
  var NACHT = /lotse-zeit=nacht/.test(QS) || (!/lotse-zeit=tag/.test(QS) && (/^(Sa|So)/.test(JETZT.tag) || JETZT.stunde >= 18 || JETZT.stunde < 7));
  var SAISON = (QS.match(/lotse-saison=([a-z]+)/) || [])[1] ||
    (JETZT.monat === 12 && JETZT.datum <= 26 ? 'dezember' : ((JETZT.monat === 6 && JETZT.datum >= 21) || JETZT.monat === 7 || JETZT.monat === 8) ? 'sommer' : '');
  if (SAISON === 'keine') SAISON = '';
  // Gestalt seit 13.11.2026 (Arne): der „Kiesel“, Form C – ein Objekt aus Keramikweiß, schwarzem Glas und rotem Licht.
  // Außenhaut immer gleich; das Glas blendet ein, wo man gerade ist; auf Licht-Seiten leuchtet er. Dezember: Weihnachtsmütze.
  var RUHIG = false;
  if (SAISON === 'sommer') SAISON = '';
  var T = TEXTE[BEREICH] || (BEREICH.indexOf('hersteller-') === 0 ? TEXTE.hersteller : TEXTE.allgemein);

  // ---------- Figur: Kiesel C (SVG) ----------
  var KOERPER = 'M161.0 114.0L160.9 121.9L160.5 127.4L160.0 132.2L159.2 136.6L158.1 140.7L156.9 144.5L155.4 148.1L153.7 151.4L151.8 154.5L149.7 157.4L147.3 160.1L144.8 162.5L142.0 164.8L139.0 166.8L135.8 168.6L132.3 170.2L128.7 171.6L124.7 172.0L120.5 172.0L115.9 172.0L110.7 172.0L104.6 172.0L95.4 172.0L89.3 172.0L84.1 172.0L79.5 172.0L75.3 172.0L71.3 171.6L67.7 170.2L64.2 168.6L61.0 166.8L58.0 164.8L55.2 162.5L52.7 160.1L50.3 157.4L48.2 154.5L46.3 151.4L44.6 148.1L43.1 144.5L41.9 140.7L40.8 136.6L40.0 132.2L39.5 127.4L39.1 121.9L39.0 114.0L39.1 106.1L39.5 100.6L40.0 95.8L40.8 91.4L41.9 87.3L43.1 83.5L44.6 79.9L46.3 76.6L48.2 73.5L50.3 70.6L52.7 67.9L55.2 65.5L58.0 63.2L61.0 61.2L64.2 59.4L67.7 57.8L71.3 56.4L75.3 55.3L79.5 54.4L84.1 53.7L89.3 53.3L95.4 53.0L104.6 53.0L110.7 53.3L115.9 53.7L120.5 54.4L124.7 55.3L128.7 56.4L132.3 57.8L135.8 59.4L139.0 61.2L142.0 63.2L144.8 65.5L147.3 67.9L149.7 70.6L151.8 73.5L153.7 76.6L155.4 79.9L156.9 83.5L158.1 87.3L159.2 91.4L160.0 95.8L160.5 100.6L160.9 106.1L161.0 114.0Z', FUSS = 24.7;
  var ZEICHEN_SVG = {
    leistungen: '<path d="M-11 -11h9v9h-9zM2 -11h9v9h-9zM-11 2h9v9h-9zM2 2h9v9h-9z"/>',
    referenzen: '<path d="M-11 11V-10H3V11M3 -2H11V11M-15 11H15M-7 -5h2M-2 -5h1M-7 0h2M-2 0h1M-7 5h2M-2 5h1"/>',
    insights: '<path d="M-13 -8H13M-13 -1H13M-13 6H3"/>',
    kontakt: '<path d="M-13 -10H13V5H-1L-8 11V5H-13Z"/>',
    plan: '<path d="M-16 -11H16V11H-16ZM-2 -11V0M-2 11V6M-2 0A6 6 0 0 1 4 6"/>',
    akustik: '<circle cx="-12" cy="0" r="2.6" fill="#fff" stroke="none"/><path d="M-5.6 -6.4A9 9 0 0 1 -5.6 6.4M-1.4 -10.6A15 15 0 0 1 -1.4 10.6M4.8 -10.9A20 20 0 0 1 4.8 10.9"/>',
    licht: '<circle r="5"/><path d="M8.5 0.0L12.5 0.0 M6.0 6.0L8.8 8.8 M0.0 8.5L0.0 12.5 M-6.0 6.0L-8.8 8.8 M-8.5 0.0L-12.5 0.0 M-6.0 -6.0L-8.8 -8.8 M-0.0 -8.5L-0.0 -12.5 M6.0 -6.0L8.8 -8.8"/>',
    stuhl: '<path d="M-8 -11L-6 2H8M-6 2L-8 11M8 2L10 11"/>',
    blatt: '<path d="M-10 9C-10 -6 2 -11 12 -10C13 2 6 11 -6 9ZM-10 9L4 -3"/>',
    newwork: '<circle cx="-6" r="9"/><circle cx="6" r="9"/>',
    consulting: '<path d="M-12 10V4M-4 10V-1M4 10V-6M12 10V-11" stroke-width="3.4"/>',
    umzug: '<path d="M-15 -5H1V10H-15ZM-15 0H1M5 3H16M12 -1L16 3L12 7"/>',
    ausbau: '<path d="M-14 -9H14V9H-14ZM-14 -3H14M-14 3H14M0 -9V-3M-7 -3V3M7 -3V3M0 3V9"/>',
    shop: '<path d="M-10 -4H10L8 11H-8ZM-5 -4V-7A5 5 0 0 1 5 -7V-4"/>',
    produkt: '<path d="M0 -12L11 -6V6L0 12L-11 6V-6ZM-11 -6L0 0L11 -6M0 0V12"/>',
    suche: '<circle cx="-3" cy="-3" r="8"/><path d="M3 3L12 12"/>'
  };
  // Welches Zeichen zeigt das Glas beim Ankommen? Unabhängig vom Wissensbereich (BEREICH), nur aus Adresse und Seitenart.
  var HERSTELLER_KURZ = { 'koenig-neurath': 'K+N', 'hersteller': 'A–Z', 'usm': 'USM', 'xal': 'XAL', 'oka': 'OKA' };
  var LICHT_HERSTELLER = /^(occhio|artemide|xal|delta-light|foscarini|waldmann|grau|tobias-grau)$/;
  function seiteErkennen() {
    var p = (location.pathname || '').toLowerCase(), k = document.body ? document.body.className : '', q = (QS.match(/lotse-zeichen=([a-z0-9:+–-]+)/i) || [])[1];
    var m = p.match(/\/marke\/([a-z0-9-]+)/), slug = m ? m[1] : (BEREICH.indexOf('hersteller-') === 0 ? BEREICH.slice(11) : '');
    var s = { zeichen: '', still: false, licht: /lotse-licht=1/.test(QS) };
    if (/warenkorb|kasse|cart|checkout|impressum|datenschutz|agb/.test(p)) s.still = true;
    else if (/(^|\s)error404(\s|$)/.test(k)) s.zeichen = 'text:?';
    else if (/(^|\s)search(\s|$)/.test(k)) s.zeichen = 'suche';
    else if (slug) { s.zeichen = 'text:' + (HERSTELLER_KURZ[slug] || slug.charAt(0).toUpperCase()); if (LICHT_HERSTELLER.test(slug)) s.licht = true; }
    else if (/(^|\s)single-product(\s|$)/.test(k) || /\/produkt\//.test(p)) s.zeichen = 'produkt';
    else if (/\/produkt-kategorie\/|\/shop/.test(p) || BEREICH === 'shop') s.zeichen = 'shop';
    else if (/\/kontakt/.test(p)) s.zeichen = 'kontakt';
    else if (/\/referenz/.test(p)) s.zeichen = 'referenzen';
    else if (/\/news\/|\/insights/.test(p)) s.zeichen = 'insights';
    else if (/umzug/.test(p)) s.zeichen = 'umzug';
    else if (/innenausbau/.test(p)) s.zeichen = 'ausbau';
    else if (/\/leistungen-expertise\/?$/.test(p)) s.zeichen = 'leistungen';
    else s.zeichen = { innenarchitektur: 'plan', raumakustik: 'akustik', beleuchtung: 'licht', moebeldesign: 'stuhl', nachhaltigkeit: 'blatt', newwork: 'newwork', consulting: 'consulting' }[BEREICH] || '';
    if (BEREICH === 'beleuchtung' || /\/produkt-kategorie\/beleuchtung/.test(p)) { s.licht = true; if (!s.zeichen || s.zeichen === 'shop') s.zeichen = 'licht'; }
    if (q) s.zeichen = q;
    s.slug = (QS.match(/lotse-logo=([a-z0-9-]+)/i) || [])[1] || (q ? '' : slug);   // Herstellerseite: Logo statt Buchstabe, wenn es groß genug ist
    return s;
  }
  var SEITE = seiteErkennen();
  if (SEITE.still) T = { titel: T.titel, merkmal: T.merkmal, tipps: T.tipps, blase: '' };
  function linie(d) { return '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + d + '</g>'; }
  function zeichenSvg(z) {
    if (!z) return '';
    if (z.indexOf('text:') === 0) { var t = z.slice(5), gr = t.length === 1 ? 27 : t.length === 2 ? 21 : 17;
      return '<text y="' + (gr * 0.355).toFixed(1) + '" text-anchor="middle" font-size="' + gr + '" font-weight="600" fill="#fff" font-family="Segoe UI,Helvetica Neue,Arial,sans-serif">' + esc(t) + '</text>'; }
    return ZEICHEN_SVG[z] ? linie(ZEICHEN_SVG[z]) : '';
  }
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<radialGradient id="lglasur" cx="34%" cy="22%" r="95%"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#f1f1f4"/><stop offset=".62" stop-color="#d6d6dc"/><stop offset="1" stop-color="#9a9aa6"/></radialGradient>' +
    '<radialGradient id="lwarm" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#fffef6"/><stop offset=".6" stop-color="#ffedb8"/><stop offset="1" stop-color="#f4cc74"/></radialGradient>' +
    '<linearGradient id="lunten" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#3c3c4b" stop-opacity="0"/><stop offset="1" stop-color="#3c3c4b" stop-opacity=".4"/></linearGradient>' +
    '<linearGradient id="lfase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".5" stop-color="#8a8a92" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>' +
    '<linearGradient id="lscheibe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1e23"/><stop offset=".5" stop-color="#0b0b0d"/><stop offset="1" stop-color="#050506"/></linearGradient>' +
    '<linearGradient id="lspiegel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<filter id="lb1" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>' +
    '<filter id="lb2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
    '<filter id="lb6" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>' +
    '<filter id="lb8" x="-60%" y="-300%" width="220%" height="700%"><feGaussianBlur stdDeviation="8"/></filter>' +
    '<filter id="lb20" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>' +
    // Herstellerlogo im Glas: dunkles Logo auf hellem oder durchsichtigem Grund wird weiß, der Grund verschwindet
    '<filter id="lweiss" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -.2764 -.9298 -.0939 1.3 0"/></filter></defs></svg>';
  // Herstellerlogo holen: Liste logos.json liegt neben lotse.js (erzeugt von pruefen/baue_logos.py), das Bild in der Mediathek der Seite.
  // Ins Glas kommt es nur, wenn es dort mindestens 12 Pixel hoch wird; sonst, bei Fehlern oder nach 1,8 s bleibt der Anfangsbuchstabe.
  function logoHolen(slug, fig, fertig) {
    var start = Date.now(), erledigt = false;
    function ende(svg) { if (erledigt) return; erledigt = true; setTimeout(function () { fertig(svg); }, Math.max(0, 700 - (Date.now() - start))); }
    setTimeout(function () { ende(''); }, 1800);
    try {
      var basis = skript && skript.src ? skript.src.replace(/[^\/]*$/, '') : 'https://arneteuwen-cmyk.github.io/lh-lotse/';
      fetch(basis + 'logos.json').then(function (r) { return r.json(); }).then(function (liste) {
        var e = liste[slug]; if (!e) return ende('');
        var k = fig.querySelector('.koerper').getBoundingClientRect().height / 119;   // Pixel je Zeichen-Einheit
        if (Math.min(26, 62 / e[1]) * k < 12) return ende('');
        var adr = location.origin + '/wp-content/uploads/' + e[0], b = new Image();
        b.onload = function () { ende('<image href="' + adr + '" x="-31" y="-13" width="62" height="26" preserveAspectRatio="xMidYMid meet" filter="url(#lweiss)"/>'); };
        b.onerror = function () { ende(''); };
        b.src = adr;
      }).catch(function () { ende(''); });
    } catch (e) { ende(''); }
  }
  var AUGEN_SVG = '<rect x="-16" y="-9" width="9" height="18" rx="4.5" fill="#fff"/><rect x="7" y="-9" width="9" height="18" rx="4.5" fill="#fff"/>';
  var figNr = 0;
  function figurSvg(merkmal, klein) {
    var i = ++figNr, rot = EINST.rot, f1 = (100 - FUSS + 3).toFixed(1), f2 = (100 + FUSS - 3).toFixed(1), fb = Math.round(FUSS);
    return '<svg class="fig' + (klein ? ' klein' : '') + (SAISON ? ' ' + SAISON : '') + '" viewBox="0 0 200 196" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="lk' + i + '"><path d="' + KOERPER + '"/></clipPath><clipPath id="lg' + i + '"><rect x="56" y="81" width="88" height="52" rx="26"/></clipPath></defs>' +
      '<circle class="hof" cx="100" cy="114" r="92" fill="#ffd36b" filter="url(#lb20)"/>' +
      '<ellipse cx="104" cy="178" rx="' + (fb + 34) + '" ry="8" fill="#000" opacity=".2" filter="url(#lb8)"/>' +
      '<ellipse cx="100" cy="173.5" rx="' + (fb + 6) + '" ry="3" fill="#000" opacity=".42" filter="url(#lb2)"/>' +
      '<ellipse class="rotlicht" cx="100" cy="175" rx="' + (fb + 6) + '" ry="6" fill="' + rot + '" opacity=".45" filter="url(#lb6)"/>' +
      '<path class="koerper" d="' + KOERPER + '" fill="url(#lglasur)"/><path class="warm" d="' + KOERPER + '" fill="url(#lwarm)"/>' +
      '<g clip-path="url(#lk' + i + ')"><rect class="schatt" x="30" y="50" width="140" height="130" fill="url(#lunten)"/>' +
      '<ellipse class="rotlicht" cx="100" cy="174" rx="' + (fb + 8) + '" ry="13" fill="' + rot + '" opacity=".3" filter="url(#lb6)"/>' +
      '<path d="' + KOERPER + '" fill="none" stroke="#fff" stroke-width="4" opacity=".42" filter="url(#lb2)"/>' +
      '<ellipse cx="76" cy="72" rx="27" ry="13" fill="#fff" opacity=".9" filter="url(#lb6)" transform="rotate(-30 76 72)"/>' +
      '<ellipse cx="71" cy="69" rx="10" ry="4" fill="#fff" filter="url(#lb1)" transform="rotate(-30 71 69)"/>' +
      '<ellipse cx="141" cy="150" rx="10" ry="20" fill="#fff" opacity=".3" filter="url(#lb6)" transform="rotate(28 141 150)"/></g>' +
      '<path d="' + KOERPER + '" fill="none" stroke="rgba(0,0,0,.13)" stroke-width=".8"/>' +
      '<path class="rotlicht" d="M' + f1 + ' 170.8H' + f2 + '" stroke="' + rot + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="53.8" y="78.8" width="92.4" height="56.4" rx="28.2" fill="url(#lfase)"/><rect x="56" y="81" width="88" height="52" rx="26" fill="url(#lscheibe)"/>' +
      '<g clip-path="url(#lg' + i + ')"><ellipse cx="92" cy="84" rx="50" ry="11" fill="url(#lspiegel)"/><path d="M114 77L130 77L102 137L86 137Z" fill="#fff" opacity=".055"/></g>' +
      '<g transform="translate(100 107)">' +
      '<g class="gi g-augen"><g filter="url(#lb2)" opacity=".7">' + AUGEN_SVG.replace(/#fff/g, '#dfe9ff') + '</g><g class="lid">' + AUGEN_SVG + '</g></g>' +
      '<g class="gi g-zu"><path d="M-16 1h9M7 1h9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>' +
      '<g class="gi g-zeichen">' + zeichenSvg(SEITE.zeichen) + '</g>' +
      '<g class="gi g-welle"><rect class="b1" x="-22" y="-4" width="4" height="8" rx="2" fill="#fff"/><rect class="b2" x="-12" y="-8" width="4" height="16" rx="2" fill="#fff"/><rect class="b3" x="-2" y="-12" width="4" height="24" rx="2" fill="#fff"/><rect class="b2" x="8" y="-7" width="4" height="14" rx="2" fill="#fff"/><rect class="b1" x="18" y="-4" width="4" height="8" rx="2" fill="#fff"/></g>' +
      '<g class="gi g-liste">' + linie('<path d="M-8 -9H16M-8 0H16M-8 9H16"/><path d="M-16 -9h.1M-16 0h.1M-16 9h.1" stroke-width="3.6"/>') + '</g>' +
      '<g class="gi g-pin">' + linie('<path d="M0 12C-8 3 -10 -1 -10 -4A10 10 0 0 1 10 -4C10 -1 8 3 0 12Z"/><circle cy="-4" r="3.2"/>') + '</g>' +
      '<g class="gi g-haken"><path d="M-12 0L-4 8L12 -9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
      '<g class="xmas"><path d="M56 80C58 46 104 30 132 50C144 60 152 76 155 92L142 84C130 62 92 60 56 80Z" fill="' + rot + '"/>' +
      '<path d="M55 82C80 64 118 63 142 87" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><circle cx="156" cy="96" r="6.5" fill="#fff"/></g>' +
      '</svg>';
  }


  // ---------- Stil ----------
  var CSS = [
    ':host{all:initial;font-family:inherit;color:#1a1a1a}',
    '*{box-sizing:border-box;font-family:inherit}',
    '.fig{width:100%;height:100%;overflow:visible;display:block}',
    '.knopf{position:fixed;right:var(--lotse-rechts,2px);bottom:var(--lotse-unten,0px);width:146px;height:143px;border:0;background:transparent;cursor:pointer;padding:0;z-index:2147483000;-webkit-tap-highlight-color:transparent;pointer-events:none}',
    '.knopf .fig *{pointer-events:visiblePainted}.knopf .fig .hof{pointer-events:none}',
    '.knopf:focus-visible{outline:3px solid ' + EINST.rot + ';outline-offset:-22px;border-radius:40px}',
    '.knopf .schild{position:absolute;right:124px;bottom:66px;white-space:nowrap;background:#1a1a1a;color:#fff;font-size:14px;line-height:1.2;padding:8px 12px;border-radius:14px 14px 2px 14px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}',
    '.knopf:hover .schild,.knopf.zeigen .schild,.knopf:focus-visible .schild{opacity:1;transform:none}',
    '.gi{opacity:0;transition:opacity .4s ease}.g-augen{opacity:1}',
    '.fig.ruht .g-augen{opacity:0}.fig.ruht .g-zu{opacity:1}',
    '.fig.ankunft .g-augen,.fig.ankunft .g-zu{opacity:0}.fig.ankunft .g-zeichen{opacity:1}',
    '.fig.zeigt .g-augen,.fig.haelt .g-augen,.fig.freut .g-augen{opacity:0}.fig.zeigt .g-liste,.fig.haelt .g-pin,.fig.freut .g-haken{opacity:1}',
    '.fig.denkt .g-augen,.fig.denkt .g-zu,.fig.denkt .g-zeichen,.fig.denkt .g-liste,.fig.denkt .g-pin,.fig.denkt .g-haken{opacity:0}.fig.denkt .g-welle{opacity:1}',
    '.rotlicht{transition:opacity .6s ease}.fig.ruht .rotlicht{opacity:.14}.fig.ruht path.rotlicht{opacity:.45}',
    '.hof,.warm{opacity:0}.xmas{display:none}.dezember .xmas{display:inline}',
    ':host(.licht) .hof{opacity:.3}:host(.licht) .warm{opacity:.6}:host(.licht) .schatt{opacity:.35}',
    '@media (prefers-reduced-motion:no-preference){',
    ' :host(.licht) .knopf .hof{animation:lichtan 6s ease forwards}:host(.licht) .knopf .warm{animation:warman 6s ease forwards}',
    ' .lid{animation:blinzeln 6.4s infinite;transform-box:fill-box;transform-origin:center}',
    ' .fig.denkt .b1{animation:welle 1s ease-in-out infinite}.fig.denkt .b2{animation:welle 1s ease-in-out .15s infinite}.fig.denkt .b3{animation:welle 1s ease-in-out .3s infinite}',
    ' .blase{animation:blase-rein .35s ease-out}',
    '}',
    '.ruhe .lid,.ruhe .b1,.ruhe .b2,.ruhe .b3{animation:none!important}',
    '@keyframes lichtan{0%{opacity:0}14%{opacity:.85}60%{opacity:.85}100%{opacity:.3}}',
    '@keyframes warman{0%{opacity:0}14%{opacity:1}60%{opacity:1}100%{opacity:.6}}',
    '@keyframes blinzeln{0%,95%,100%{transform:scaleY(1)}97.5%{transform:scaleY(.12)}}',
    '@keyframes welle{0%,100%{opacity:.35}50%{opacity:1}}',
    '@keyframes blase-rein{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}',
    '.mini-zeile{display:flex;gap:6px;align-items:flex-end;align-self:stretch}.mini-zeile .mini-fig{width:58px;height:57px;flex:none;margin-bottom:-4px}.mini-zeile .msg{max-width:none;flex:1}',
    '.karte{flex:1;border:1.5px solid #1a1a1a;border-radius:12px;padding:10px 12px;font-size:14px;background:#fff}.karte strong{display:block;margin-bottom:4px}.karte a{color:#1a1a1a}',
    '.blase{position:fixed;right:max(10px,calc(var(--lotse-rechts,2px) - 60px));bottom:calc(var(--lotse-unten,0px) + 138px);max-width:min(280px,calc(100vw - 40px));background:#1a1a1a;color:#fff;font-size:14px;line-height:1.35;padding:10px 34px 10px 14px;border-radius:16px 16px 4px 16px;z-index:2147483000;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}',
    '.blase[hidden]{display:none}.blase .weg-x{position:absolute;right:4px;top:4px;border:0;background:none;color:#fff;font-size:18px;cursor:pointer;width:28px;height:28px}',
    '@media (max-width:600px){.blase{right:10px;bottom:calc(var(--lotse-unten,0px) + 108px)}}',
    '.leiste2{display:flex;justify-content:space-between;gap:8px;padding:6px 14px;border-bottom:1px solid #eee}',
    '.leiste2 button{border:0;background:none;padding:6px 0;font-size:13px;color:#1a1a1a;text-decoration:underline;cursor:pointer;min-height:32px}',
    '.quellen{margin-top:6px;font-size:12.5px;color:#555}.quellen a{color:#1a1a1a;font-weight:600}',
    '.fenster{position:fixed;right:18px;bottom:18px;width:400px;max-width:calc(100vw - 32px);height:min(640px,calc(100vh - 36px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;z-index:2147483001;font-size:15px;line-height:1.45}',
    '.fenster[hidden]{display:none}',
    '.kopf-leiste{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;border-bottom:1px solid #eee}',
    '.kopf-leiste .mini{width:60px;height:59px;flex:none;margin:-6px -4px -8px -6px}',
    '.kopf-leiste .name{font-weight:700;font-size:16px}',
    '.kopf-leiste .ki{font-size:12px;color:#666}',
    '.kopf-leiste .zu{margin-left:auto;width:40px;height:40px;border:0;background:transparent;border-radius:10px;cursor:pointer;font-size:22px;line-height:1;color:#1a1a1a}',
    '.kopf-leiste .zu:hover,.kopf-leiste .zu:focus-visible{background:#f2f2f2}',
    '.verlauf>*{flex-shrink:0}',
    '.verlauf{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}',
    '.msg{max-width:88%;padding:10px 13px;border-radius:16px;white-space:pre-wrap;word-wrap:break-word}',
    '.msg.lotse{background:#f4f4f2;border-bottom-left-radius:4px;align-self:flex-start}',
    '.msg.nutzer{background:#1a1a1a;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}',
    '.msg.hinweis{background:transparent;color:#666;font-size:13px;padding:0 2px;align-self:center;text-align:center}',
    '.tipps{display:flex;flex-wrap:wrap;gap:6px}',
    '.tipp,.aktion{border:1.5px solid #1a1a1a;background:#fff;color:#1a1a1a;border-radius:999px;padding:7px 12px;font-size:14px;cursor:pointer;min-height:36px}',
    '.tipp:hover,.tipp:focus-visible{background:#1a1a1a;color:#fff}',
    '.aktion{background:' + EINST.rot + ';border-color:' + EINST.rot + ';color:#fff;font-weight:600}',
    '.aktion:hover,.aktion:focus-visible{filter:brightness(.92)}',
    '.aktion.zweit{background:#fff;color:#1a1a1a;border-color:#1a1a1a;font-weight:400}',
    '.tabelle{align-self:stretch;border:1px solid #e3e3e3;border-radius:12px;overflow:hidden;font-size:13px}',
    '.tabelle table{width:100%;border-collapse:collapse}',
    '.tabelle th{background:#f4f4f2;text-align:left;font-weight:600;padding:6px 8px}',
    '.tabelle td{border-top:1px solid #eee;padding:5px 8px;vertical-align:top}',
    '.tabelle td.m input{width:52px;padding:4px;border:1px solid #ccc;border-radius:6px;font-size:13px}',
    '.tabelle .offen{color:#a15c00;font-size:12px}',
    '.tabelle .weg{border:0;background:none;cursor:pointer;color:#999;font-size:16px}',
    '.tabelle .fuss{padding:8px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid #eee}',
    '.formular{align-self:stretch;border:1px solid #e3e3e3;border-radius:12px;padding:12px;display:grid;gap:8px}',
    '.formular label{font-size:13px;display:grid;gap:3px}',
    '.formular input[type=email],.formular input[type=text],.formular input[type=tel],.formular textarea{width:100%;padding:8px 10px;border:1px solid #bbb;border-radius:8px;font-size:15px}',
    '.formular .check{display:flex;gap:8px;align-items:flex-start;font-size:13px}',
    '.formular .check input{margin-top:3px;width:18px;height:18px;flex:none}',
    '.formular a{color:#1a1a1a}',
    '.eingabe{border-top:1px solid #eee;padding:10px;display:flex;gap:8px;align-items:flex-end}',
    '.eingabe textarea{flex:1;resize:none;border:1px solid #bbb;border-radius:12px;padding:9px 12px;font-size:15px;max-height:140px;min-height:42px;line-height:1.35}',
    '.eingabe textarea:focus{outline:2px solid #1a1a1a;outline-offset:0;border-color:#1a1a1a}',
    '.rund{width:42px;height:42px;flex:none;border-radius:50%;border:1.5px solid #1a1a1a;background:#fff;cursor:pointer;display:grid;place-items:center;color:#1a1a1a}',
    '.rund.senden{background:' + EINST.rot + ';border-color:' + EINST.rot + ';color:#fff}',
    '.rund:disabled{opacity:.4;cursor:default}',
    '.rund svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.datei-chip{font-size:12px;color:#444;padding:0 12px 6px}',
    '.fuss-ki{font-size:11px;color:#777;text-align:center;padding:0 10px 8px}',
    '.nur-vorleser{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '@media (max-width:600px){.fenster{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;border-radius:0}.knopf{width:108px;height:106px}.knopf .schild{display:none}}',
    '@media print{.knopf,.fenster{display:none!important}}'
  ].join('\n');

  // ---------- Aufbau ----------
  var host = document.createElement('div');
  host.id = 'lh-lotse';
  host.className = 'kiesel' + (SEITE.licht ? ' licht' : '');
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' + CSS + '</style>' + DEFS +
    '<button class="knopf" type="button" aria-haspopup="dialog" aria-label="Lotse öffnen – KI-Assistent von lechner+hayn">' +
    '<span class="schild">' + esc(T.titel) + '</span>' + figurSvg(T.merkmal) + '</button>' +
    '<div class="blase" role="status" hidden><span class="blase-text"></span><button type="button" class="weg-x" aria-label="Hinweis schließen">×</button></div>' +
    '<section class="fenster" role="dialog" aria-modal="false" aria-label="Lotse, KI-Assistent von lechner+hayn" hidden>' +
    '<div class="kopf-leiste"><div class="mini">' + figurSvg(T.merkmal, true) + '</div>' +
    '<div><div class="name">Lotse</div><div class="ki">KI-Assistent von lechner+hayn</div></div>' +
    '<button class="zu" type="button" aria-label="Lotse schließen">×</button></div>' +
    '<div class="leiste2"><button type="button" class="mensch">Mit einem Menschen sprechen</button><button type="button" class="ruhig" aria-pressed="false">Lotse ruhig stellen</button></div>' +
    '<div class="verlauf" aria-live="polite"></div>' +
    '<div class="datei-chip" hidden></div>' +
    '<form class="eingabe">' +
    '<input type="file" class="datei" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt" hidden>' +
    '<button type="button" class="rund anhang" aria-label="Datei anhängen (Stückliste, Grundriss, Foto)" title="Datei anhängen"><svg viewBox="0 0 24 24"><path d="M21 11.5l-8.5 8.5a5 5 0 01-7-7L14 4.5a3.5 3.5 0 015 5L10.5 18a2 2 0 01-3-3L15 7.5"/></svg></button>' +
    '<label class="nur-vorleser" for="lh-lotse-text">Ihre Nachricht an den Lotsen</label>' +
    '<textarea id="lh-lotse-text" rows="1" placeholder="Frage stellen oder Liste einfügen …"></textarea>' +
    '<button type="submit" class="rund senden" aria-label="Senden"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>' +
    '</form><div class="fuss-ki">Antworten erstellt eine KI und können Fehler enthalten. Verbindlich ist nur das Angebot unseres Teams.</div></section>';

  // Der Kiesel steht auf der Unterkante links neben der roten Kontakt-Ecke (.cta-fixed), nie im Dreieck.
  // Ohne Ecke steht er unten rechts. Im SVG (200 × 196) liegt die Standfläche bei y = 172, der Körper reicht bis x = 161.
  function platz() {
    var ecke = null, kandidaten = document.querySelectorAll('.cta-fixed, [data-lotse-ausweichen]');
    for (var i = 0; i < kandidaten.length; i++) {
      var r = kandidaten[i].getBoundingClientRect();
      if (r.width > 40 && r.right > innerWidth - 120 && r.bottom > innerHeight - 40) ecke = r;
    }
    var k = root.querySelector('.knopf'), w = (k && k.offsetWidth) || 146, h = (k && k.offsetHeight) || 143;
    var randR = w * 39 / 200, randU = h * 24 / 196;
    if (!ecke) { host.style.setProperty('--lotse-rechts', Math.round(14 - randR) + 'px'); host.style.setProperty('--lotse-unten', Math.round(12 - randU) + 'px'); return; }
    host.style.setProperty('--lotse-rechts', Math.round(innerWidth - ecke.left + 6 - randR) + 'px');
    host.style.setProperty('--lotse-unten', Math.round(innerHeight - ecke.bottom - randU) + 'px');
  }
  function start() { document.body.appendChild(host); einrichten(); platz(); setTimeout(platz, 1500); addEventListener('resize', platz); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel) { return root.querySelector(sel); }

  // ---------- Zustand ----------
  var besucher = lies('lh-lotse-besucher') || ('b-' + Math.random().toString(36).slice(2, 12));
  schreib('lh-lotse-besucher', besucher);
  var zustand = { nachrichten: [], positionen: [], dateiname: '', angezeigt: [] };
  try { var alt = JSON.parse(lies('lh-lotse-zustand', true) || 'null'); if (alt && alt.nachrichten) zustand = alt; } catch (e) {}
  function sichern() { schreib('lh-lotse-zustand', JSON.stringify({ nachrichten: zustand.nachrichten.slice(-30), positionen: zustand.positionen, dateiname: zustand.dateiname, angezeigt: zustand.angezeigt.slice(-60) }), true); }
  var anhang = null, beschaeftigt = false;

  function einrichten() {
    var knopf = $('.knopf'), fenster = $('.fenster'), zu = $('.zu'), form = $('.eingabe'), feld = $('textarea'),
      dateiFeld = $('.datei'), anhangKnopf = $('.anhang');

    // Zustände des Kiesels: wach (Augen), ruht (Augen zu, Licht gedimmt), ankunft (Zeichen der Seite, 2,4 s).
    var fig = knopf.querySelector('.fig'), ruheUhr = null, ruhigGestellt = lies('lh-lotse-ruhig') === '1';
    function ruhe(an) { host.classList.toggle('ruhe-an', !!an); var f = root.querySelectorAll('.fig'); for (var i = 0; i < f.length; i++) f[i].classList.toggle('ruhe', !!an); }
    function schlaf(an) { fig.classList.toggle('ruht', !!an); }
    function planen() {
      clearTimeout(ruheUhr);
      if (ruhigGestellt) { ruhe(true); return; }
      ruhe(false);
      ruheUhr = setTimeout(function () { ruhe(true); schlaf(true); }, 60000);   // nach einer Minute ohne Aktion ruht er
    }
    function aufspringen() { if (!SEITE.still) schlaf(false); planen(); }       // Name bleibt: wird wach
    var ruhigKnopf = $('.ruhig');
    function ruhigAnzeigen() { ruhigKnopf.textContent = ruhigGestellt ? 'Lotse wieder bewegen' : 'Lotse ruhig stellen'; ruhigKnopf.setAttribute('aria-pressed', ruhigGestellt ? 'true' : 'false'); }
    ruhigKnopf.addEventListener('click', function () { ruhigGestellt = !ruhigGestellt; schreib('lh-lotse-ruhig', ruhigGestellt ? '1' : '0'); ruhigAnzeigen(); planen(); });
    ruhigAnzeigen();
    $('.mensch').addEventListener('click', function () { formularZeigen('team'); });
    knopf.addEventListener('mouseenter', aufspringen); knopf.addEventListener('focus', aufspringen);
    knopf.addEventListener('touchstart', aufspringen, { passive: true });

    // Ankommen: Abends, am Wochenende und auf stillen Seiten (Kasse, Rechtliches) ruht er. Sonst zeigt das Glas kurz,
    // wo man ist; beim ersten Besuch erscheint einmal sein Schild.
    if (NACHT || SEITE.still) schlaf(true);
    if (!SEITE.still) {
      // Das Zeichen (auf Herstellerseiten das Logo) bleibt 2,4 s im Glas, dann kommen die Augen zurück.
      var ankommen = function () { fig.classList.add('ankunft'); setTimeout(function () { fig.classList.remove('ankunft'); }, 2400); };
      if (SEITE.slug) logoHolen(SEITE.slug, fig, function (bild) { if (bild) fig.querySelector('.g-zeichen').innerHTML = bild; if (bild || SEITE.zeichen) ankommen(); });
      else if (SEITE.zeichen) setTimeout(ankommen, 700);
      if (!lies('lh-lotse-gegruesst', true) && !NACHT) {
        schreib('lh-lotse-gegruesst', '1', true); schreib('lh-lotse-gewunken', '1');
        setTimeout(function () { knopf.classList.add('zeigen'); }, 3300);
        setTimeout(function () { knopf.classList.remove('zeigen'); }, 6800);
      }
    }
    schreib('lh-lotse-bereich', BEREICH);
    planen();


    // Lese-Blase: wer eine Seite bis fast unten liest und mindestens 20 s da ist, bekommt einmal je Besuch ein passendes Angebot.
    var blase = $('.blase'), seitStart = Date.now(), blaseGezeigt = !!lies('lh-lotse-blase', true);
    function blaseZeigen() {
      if (blaseGezeigt || knopf.hidden || !T.blase) return;
      blaseGezeigt = true; schreib('lh-lotse-blase', '1', true);
      $('.blase-text').textContent = T.blase; blase.hidden = false; aufspringen(); schlaf(false);
      setTimeout(function () { blase.hidden = true; }, 12000);
    }
    blase.addEventListener('click', function (e) { blase.hidden = true; if (e.target.classList && e.target.classList.contains('weg-x')) return; oeffnen(); });
    addEventListener('scroll', function () {
      if (blaseGezeigt) return;
      var h = document.documentElement, weit = (scrollY + innerHeight) / Math.max(1, h.scrollHeight);
      if (weit > 0.85 && Date.now() - seitStart > 20000) blaseZeigen();
    }, { passive: true });
    window.__lhLotseBlase = blaseZeigen; // nur für Tests


    function oeffnen() {
      blase.hidden = true; schlaf(false); clearTimeout(ruheUhr);
      fenster.hidden = false; knopf.hidden = true; knopf.setAttribute('aria-expanded', 'true');
      if (!zustand.angezeigt.length) begruessen(); else wiederherstellen();
      setTimeout(function () { feld.focus(); }, 30);
    }
    function schliessen() { fenster.hidden = true; knopf.hidden = false; knopf.setAttribute('aria-expanded', 'false'); knopf.focus(); planen(); }
    knopf.addEventListener('click', oeffnen);
    zu.addEventListener('click', schliessen);
    fenster.addEventListener('keydown', function (e) { if (e.key === 'Escape') schliessen(); });

    feld.addEventListener('input', function () {
      feld.style.height = 'auto'; feld.style.height = Math.min(140, feld.scrollHeight) + 'px';
      blick(feld.value ? 'schaut-unten' : '');
    });
    feld.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : senden(); } });
    form.addEventListener('submit', function (e) { e.preventDefault(); senden(); });
    anhangKnopf.addEventListener('click', function () { dateiFeld.click(); });
    dateiFeld.addEventListener('change', function () { if (dateiFeld.files[0]) dateiLesen(dateiFeld.files[0]); dateiFeld.value = ''; });
    fenster.addEventListener('dragover', function (e) { e.preventDefault(); });
    fenster.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) dateiLesen(e.dataTransfer.files[0]); });
  }

  function blick(k) { var f = root.querySelectorAll('.fig'); for (var i = 0; i < f.length; i++) { f[i].classList.remove('schaut-unten', 'schaut-links'); if (k) f[i].classList.add(k); } }
  function denkt(an) { var f = root.querySelectorAll('.fig'); for (var i = 0; i < f.length; i++) f[i].classList.toggle('denkt', an); }

  // ---------- Verlauf ----------
  function zeige(art, inhalt, merken) {
    var v = $('.verlauf'), el;
    if (art === 'lotse' || art === 'nutzer' || art === 'hinweis') { el = document.createElement('div'); el.className = 'msg ' + art; el.textContent = inhalt; }
    else el = inhalt;
    v.appendChild(el); v.scrollTop = v.scrollHeight;
    if (merken !== false && typeof inhalt === 'string') { zustand.angezeigt.push([art, inhalt]); sichern(); }
    return el;
  }
  function begruessen() {
    var wochenende = /^(Sa|So)/.test(JETZT.tag);
    zeige('lotse', 'Hallo, ich bin der Lotse, der KI-Assistent von lechner+hayn. Fragen Sie mich alles rund um Ihre Einrichtung – oder fügen Sie einfach eine Stückliste oder Produkte ein. ' +
      (wochenende ? 'Ein konkretes Angebot oder eine Rückmeldung bekommen Sie am nächsten Werktag.' : 'Spätestens nach 24 Stunden bekommen Sie ein konkretes Angebot oder eine Rückmeldung.'));
    tippsZeigen();
  }
  function tippsZeigen() {
    var box = document.createElement('div'); box.className = 'tipps';
    T.tipps.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tipp'; b.textContent = t;
      b.addEventListener('click', function () {
        box.remove();
        if (/hochladen|schicken/i.test(t)) { zeige('lotse', 'Gern! Hängen Sie die Datei über die Büroklammer an (Excel, CSV, PDF oder Bild) oder fügen Sie die Liste einfach in das Textfeld ein.'); $('.anhang').focus(); return; }
        if (/^Angebot/i.test(t)) { formularZeigen('angebot'); return; }
        $('textarea').value = t; senden();
      });
      box.appendChild(b);
    });
    zeige(null, box, false);
  }
  // Antwort Wort für Wort einblenden (höchstens ~0,8 s). Vorleseprogramme bekommen den ganzen Text auf einmal.
  var BEWEGUNG = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function quellenZeigen(el, quellen) {
    if (!quellen || !quellen.length) return;
    var q = document.createElement('div'); q.className = 'quellen';
    q.innerHTML = 'Mehr dazu: ' + quellen.map(function (x) {
      return /^https:\/\//.test(x.url) ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.titel) + ' ↗</a>' : '';
    }).filter(Boolean).join(' · ');
    el.appendChild(q);
  }
  function zeigeFliessend(text, quellen) {
    zustand.angezeigt.push(['lotse', text, quellen || []]); sichern();
    var el = document.createElement('div'); el.className = 'msg lotse';
    var vor = document.createElement('span'); vor.className = 'nur-vorleser'; vor.textContent = text;
    var sicht = document.createElement('span'); sicht.setAttribute('aria-hidden', 'true');
    el.appendChild(vor); el.appendChild(sicht);
    var v = $('.verlauf'); v.appendChild(el);
    var woerter = text.split(/(\s+)/), i = 0;
    if (!BEWEGUNG || woerter.length < 4) { sicht.textContent = text; quellenZeigen(el, quellen); v.scrollTop = v.scrollHeight; return el; }
    var proSchritt = Math.max(1, Math.ceil(woerter.length / 40));
    (function weiter() {
      i = Math.min(woerter.length, i + proSchritt * 2);
      sicht.textContent = woerter.slice(0, i).join('');
      v.scrollTop = v.scrollHeight;
      if (i < woerter.length) setTimeout(weiter, 20); else { quellenZeigen(el, quellen); v.scrollTop = v.scrollHeight; }
    })();
    return el;
  }

  function wiederherstellen() {
    if ($('.verlauf').childElementCount) return;
    zustand.angezeigt.forEach(function (m) { var el = zeige(m[0], m[1], false); if (m[2]) quellenZeigen(el, m[2]); });
    if (zustand.positionen.length) tabelleZeigen();
  }

  // ---------- Dateien ----------
  function dateiLesen(f) {
    var name = f.name || 'Datei', typ = (f.type || '').toLowerCase(), endung = (name.split('.').pop() || '').toLowerCase();
    if (f.size > 15 * 1024 * 1024) { zeige('hinweis', 'Die Datei ist zu groß (höchstens 15 MB).'); return; }
    if (/^(xlsx|xls)$/.test(endung)) return excelLesen(f, name);
    if (/^(csv|txt)$/.test(endung) || typ === 'text/csv' || typ === 'text/plain') {
      var r = new FileReader(); r.onload = function () { anhangSetzen({ name: name, text: String(r.result).slice(0, 60000), art: 'Tabelle' }); }; r.readAsText(f); return;
    }
    if (typ === 'application/pdf' || endung === 'pdf') {
      if (f.size > 5 * 1024 * 1024) { zeige('hinweis', 'PDFs kann ich bis etwa 5 MB lesen. Bitte eine kleinere Datei oder nur die Seiten mit der Liste.'); return; }
      return alsBase64(f, function (d) { anhangSetzen({ name: name, typ: 'application/pdf', daten: d, art: 'PDF' }); });
    }
    if (/^image\//.test(typ)) return bildVerkleinern(f, function (d, t) { anhangSetzen({ name: name, typ: t, daten: d, art: 'Bild' }); });
    zeige('hinweis', 'Diesen Dateityp kann ich nicht lesen. Bitte Excel, CSV, PDF oder ein Bild.');
  }
  function alsBase64(f, fertig) { var r = new FileReader(); r.onload = function () { fertig(String(r.result).split(',')[1] || ''); }; r.readAsDataURL(f); }
  function bildVerkleinern(f, fertig) {
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      var max = 2000, s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); fertig(c.toDataURL('image/jpeg', 0.85).split(',')[1], 'image/jpeg');
    };
    img.onerror = function () { zeige('hinweis', 'Das Bild konnte ich nicht öffnen.'); };
    img.src = url;
  }
  function excelLesen(f, name) {
    function weiter() {
      var r = new FileReader();
      r.onload = function () {
        try {
          var wb = window.XLSX.read(new Uint8Array(r.result), { type: 'array' }), teile = [];
          wb.SheetNames.slice(0, 5).forEach(function (n) { teile.push('Blatt „' + n + '“:\n' + window.XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ';', blankrows: false })); });
          anhangSetzen({ name: name, text: teile.join('\n\n').slice(0, 60000), art: 'Excel' });
        } catch (e) { zeige('hinweis', 'Die Excel-Datei konnte ich nicht lesen. Speichern Sie sie bitte als CSV oder PDF.'); }
      };
      r.readAsArrayBuffer(f);
    }
    if (window.XLSX) return weiter();
    var s = document.createElement('script'); s.src = EINST.xlsx; s.async = true; s.onload = weiter;
    s.onerror = function () { zeige('hinweis', 'Excel kann ich gerade nicht öffnen. Speichern Sie die Liste bitte als CSV oder PDF.'); };
    document.head.appendChild(s);
  }
  function anhangSetzen(a) {
    anhang = a; zustand.dateiname = a.name; sichern();
    var chip = $('.datei-chip'); chip.hidden = false;
    chip.innerHTML = '📎 ' + esc(a.name) + ' (' + a.art + ') <button type="button" class="tipp" style="min-height:24px;padding:1px 8px;margin-left:6px">entfernen</button>';
    chip.querySelector('button').onclick = function () { anhang = null; chip.hidden = true; };
    var feld = $('textarea'); if (!feld.value) feld.value = 'Bitte lesen Sie meine Liste aus.';
    feld.focus();
  }

  // ---------- Senden ----------
  function senden() {
    if (beschaeftigt) return;
    var feld = $('textarea'), text = feld.value.trim();
    if (!text && !anhang) return;
    if (!text) text = 'Bitte lesen Sie meine Datei aus.';
    var inhalt = text, sichtbar = text, a = anhang;
    if (a) { sichtbar = text + '\n📎 ' + a.name; if (a.text) inhalt = text + '\n\nDatei „' + a.name + '“ (' + a.art + '):\n' + a.text; else inhalt = text + '\n\n(Datei „' + a.name + '“ ist angehängt.)'; }
    feld.value = ''; feld.style.height = 'auto'; anhang = null; $('.datei-chip').hidden = true; blick('');
    var alteTipps = root.querySelector('.verlauf .tipps'); if (alteTipps) alteTipps.remove();
    zeige('nutzer', sichtbar);
    zustand.nachrichten.push({ role: 'user', content: inhalt.slice(0, 60000) }); sichern();
    var body = { art: 'frage', schluessel: EINST.schluessel, besucher: besucher, bereich: BEREICH, seite: location.pathname, nachrichten: zustand.nachrichten.slice(-16) };
    if (a && a.daten) body.datei = { name: a.name, typ: a.typ, daten: a.daten };
    beschaeftigt = true; $('.senden').disabled = true; denkt(true);
    var warte = zeige('hinweis', a ? 'Der Lotse öffnet Ihre Datei …' : 'Der Lotse liest nach …', false);
    var schritte = a ? [[2500, 'Der Lotse liest die Positionen …'], [9000, 'Noch einen Moment – die Liste ist etwas länger …'], [25000, 'Fast fertig …']]
      : [[1400, 'Der Lotse sucht die passende Stelle …'], [2800, 'Der Lotse formuliert die Antwort …'], [8000, 'Das dauert etwas länger – gleich fertig …']];
    var statusUhren = schritte.map(function (x) { return setTimeout(function () { warte.textContent = x[1]; }, x[0]); });
    var statusEnde = function () { statusUhren.forEach(clearTimeout); warte.remove(); };
    fetch(EINST.adresse, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        statusEnde();
        var antwort = (d && d.antwort) || 'Das konnte ich gerade nicht beantworten.';
        zeigeFliessend(antwort, d.quellen || []);
        if (/Krefeld/.test(antwort) && /Wuppertal/.test(antwort) && /(ansehen|besuch|showroom|ausstell|probe|anschauen|vorbei)/i.test(text + ' ' + antwort)) showroomKarte();
        var kurz = antwort;
        if (d.positionen && d.positionen.length) {
          zustand.positionen = d.positionen; kurz += '\n[Erkannte Positionen: ' + d.positionen.map(function (p) { return [p.menge, p.hersteller, p.artikel, p.ausfuehrung].filter(Boolean).join(' '); }).join(' | ') + ']';
          tabelleZeigen();
        } else if (d.aktion === 'angebot' || d.aktion === 'team' || d.aktion === 'planung') aktionZeigen(d.aktion);
        zustand.nachrichten.push({ role: 'assistant', content: kurz.slice(0, 4000) }); sichern();
      })
      .catch(function () {
        statusEnde(); zustand.nachrichten.pop(); sichern();
        var box = document.createElement('div'); box.className = 'tipps'; box.setAttribute('role', 'alert');
        var m = document.createElement('div'); m.className = 'msg lotse'; m.textContent = 'Das hat nicht geklappt – ich bin gerade nicht erreichbar.';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'aktion'; b.textContent = 'Erneut versuchen';
        var t2 = document.createElement('button'); t2.type = 'button'; t2.className = 'aktion zweit'; t2.textContent = 'An das Team geben';
        b.addEventListener('click', function () { box.remove(); m.remove(); $('textarea').value = text; if (a) anhang = a; senden(); });
        t2.addEventListener('click', function () { box.remove(); formularZeigen('team'); });
        zeige(null, m, false); box.appendChild(b); box.appendChild(t2); zeige(null, box, false); b.focus();
      })
      .then(function () { beschaeftigt = false; $('.senden').disabled = false; denkt(false); });
  }

  function aktionZeigen(aktion) {
    var box = document.createElement('div'); box.className = 'tipps';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'aktion';
    b.textContent = aktion === 'angebot' ? 'Angebot anfragen' : aktion === 'planung' ? 'Planung anfragen' : 'An das Team geben';
    b.addEventListener('click', function () { box.remove(); formularZeigen(aktion); });
    box.appendChild(b); zeige(null, box, false);
  }

  function miniZeile(pose, inhalt) {
    var z = document.createElement('div'); z.className = 'mini-zeile';
    z.innerHTML = '<div class="mini-fig" aria-hidden="true">' + figurSvg(T.merkmal, true).replace('class="fig', 'class="fig ' + pose) + '</div>';
    if (inhalt) z.appendChild(inhalt);
    return z;
  }
  var showroomGezeigt = !!lies('lh-lotse-showroom', true);
  function showroomKarte() {
    if (showroomGezeigt) return; showroomGezeigt = true; schreib('lh-lotse-showroom', '1', true);
    var k = document.createElement('div'); k.className = 'karte';
    var q = function (a) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('lechner+hayn ' + a); };
    k.innerHTML = '<strong>Unsere Showrooms</strong>Krefeld: <a href="' + q('Nauenweg 32, 47805 Krefeld') + '" target="_blank" rel="noopener">Nauenweg 32</a><br>' +
      'Wuppertal: <a href="' + q('Uellendahler Str. 447, 42109 Wuppertal') + '" target="_blank" rel="noopener">Uellendahler Str. 447</a>';
    zeige(null, miniZeile('haelt', k), false);
  }

  // ---------- Positionstabelle ----------
  function tabelleZeigen() {
    var alt = root.querySelector('.verlauf .tabelle'); if (alt) alt.remove();
    var box = document.createElement('div'); box.className = 'tabelle';
    function bauen() {
      var zeilen = zustand.positionen.map(function (p, i) {
        return '<tr><td class="m"><input aria-label="Menge Position ' + (i + 1) + '" value="' + esc(p.menge) + '" data-i="' + i + '"></td>' +
          '<td><strong>' + esc([p.hersteller, p.artikel].filter(Boolean).join(' ')) + '</strong>' + (p.ausfuehrung ? '<br>' + esc(p.ausfuehrung) : '') +
          (p.hinweis ? '<br><span class="offen">' + esc(p.hinweis) + '</span>' : '') + '</td>' +
          '<td><button type="button" class="weg" data-weg="' + i + '" aria-label="Position ' + (i + 1) + ' entfernen">×</button></td></tr>';
      }).join('');
      box.innerHTML = '<table><thead><tr><th>Menge</th><th>Position (' + zustand.positionen.length + ')</th><th></th></tr></thead><tbody>' + zeilen + '</tbody></table>' +
        '<div class="fuss"><button type="button" class="aktion">Angebot für diese Liste anfragen</button><button type="button" class="aktion zweit">Liste verwerfen</button></div>';
      box.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('change', function () { zustand.positionen[+inp.dataset.i].menge = inp.value.trim(); sichern(); }); });
      box.querySelectorAll('[data-weg]').forEach(function (b) { b.addEventListener('click', function () { zustand.positionen.splice(+b.dataset.weg, 1); sichern(); bauen(); }); });
      box.querySelector('.aktion').addEventListener('click', function () { formularZeigen('angebot'); });
      box.querySelector('.zweit').addEventListener('click', function () { zustand.positionen = []; sichern(); box.remove(); });
    }
    bauen();
    var alteZeile = root.querySelector('.verlauf .zeige-liste'); if (alteZeile) alteZeile.remove();
    var hinweis = document.createElement('div'); hinweis.className = 'msg lotse'; hinweis.textContent = 'Hier ist Ihre Liste – bitte prüfen Sie Mengen und Angaben.';
    var zeile = miniZeile('zeigt', hinweis); zeile.classList.add('zeige-liste');
    zeige(null, zeile, false); zeige(null, box, false);
  }

  // ---------- Anfrage-Formular ----------
  function formularZeigen(aktion) {
    var alt = root.querySelector('.verlauf .formular'); if (alt) alt.remove();
    var f = document.createElement('form'); f.className = 'formular'; f.noValidate = true;
    var titel = aktion === 'planung' ? 'Planung anfragen' : aktion === 'team' ? 'Frage an unser Team' : 'Individuelles Angebot anfragen';
    f.innerHTML = '<strong>' + titel + '</strong>' +
      (zustand.positionen.length ? '<span style="font-size:13px">' + zustand.positionen.length + ' Positionen aus der Liste werden mitgeschickt.</span>' : '') +
      '<label>E-Mail-Adresse *<input type="email" name="email" autocomplete="email" required></label>' +
      '<label>Name<input type="text" name="name" autocomplete="name"></label>' +
      '<label>Firma<input type="text" name="firma" autocomplete="organization"></label>' +
      '<label>Telefon<input type="tel" name="telefon" autocomplete="tel"></label>' +
      '<label>Was sollen wir noch wissen?<textarea name="anliegen" rows="2"></textarea></label>' +
      '<label class="check"><input type="checkbox" name="ds" required><span>Ich bin einverstanden, dass lechner+hayn meine Angaben und diesen Chat zur Bearbeitung der Anfrage speichert. <a href="' + EINST.datenschutz + '" target="_blank" rel="noopener">Datenschutzhinweise</a> *</span></label>' +
      '<div class="tipps"><button type="submit" class="aktion">Anfrage senden</button><button type="button" class="aktion zweit">Abbrechen</button></div>' +
      '<div class="fehler" role="alert" style="color:#b00020;font-size:13px"></div>';
    f.querySelector('.zweit').addEventListener('click', function () { f.remove(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(f), email = String(fd.get('email') || '').trim(), fehler = f.querySelector('.fehler');
      if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) { fehler.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'; f.email.focus(); return; }
      if (!f.ds.checked) { fehler.textContent = 'Bitte bestätigen Sie die Datenschutzhinweise.'; f.ds.focus(); return; }
      var knopf = f.querySelector('[type=submit]'); knopf.disabled = true; knopf.textContent = 'Wird gesendet …';
      var body = { art: 'anfrage', schluessel: EINST.schluessel, besucher: besucher, bereich: BEREICH, seite: location.pathname, datenschutz: true,
        kontakt: { email: email, name: fd.get('name'), firma: fd.get('firma'), telefon: fd.get('telefon') },
        anliegen: (aktion === 'planung' ? '[Planung] ' : aktion === 'team' ? '[Frage] ' : '[Angebot] ') + (fd.get('anliegen') || ''),
        positionen: zustand.positionen, dateiname: zustand.dateiname,
        verlauf: zustand.angezeigt.filter(function (m) { return m[0] !== 'hinweis'; }).map(function (m) { return { role: m[0] === 'nutzer' ? 'user' : 'assistant', content: m[1] }; }) };
      fetch(EINST.adresse, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok) { f.remove(); var dank = document.createElement('div'); dank.className = 'msg lotse'; dank.textContent = d.antwort;
            zeige(null, miniZeile(RUHIG ? '' : 'freut', dank), false); zustand.angezeigt.push(['lotse', d.antwort]);
            var kf = RUHIG ? null : root.querySelector('.kopf-leiste .fig'); if (kf) { kf.classList.add('freut'); setTimeout(function () { kf.classList.remove('freut'); }, 2000); } zustand.positionen = []; sichern(); var t = root.querySelector('.verlauf .tabelle'); if (t) t.remove(); var zl = root.querySelector('.verlauf .zeige-liste'); if (zl) zl.remove(); $('textarea').focus(); }
          else { fehler.textContent = (d && d.antwort) || 'Das hat nicht geklappt.'; knopf.disabled = false; knopf.textContent = 'Anfrage senden'; }
        })
        .catch(function () { fehler.textContent = 'Keine Verbindung. Bitte versuchen Sie es noch einmal.'; knopf.disabled = false; knopf.textContent = 'Anfrage senden'; });
    });
    zeige(null, f, false);
    setTimeout(function () { f.scrollIntoView({ block: 'start' }); f.email.focus({ preventScroll: true }); }, 30);
  }
})();
