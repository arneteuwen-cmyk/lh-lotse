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
  var T = TEXTE[BEREICH] || (BEREICH.indexOf('hersteller-') === 0 ? TEXTE.hersteller : TEXTE.allgemein);

  // ---------- Figur (Linien, SVG) ----------
  var MERKMALE = {
    muetze: '<g class="mz"><path class="r fl" d="M35 17c3-11 27-11 30 0z"/><path class="r" d="M30 17.5h40"/></g>',
    stift: '<path d="M66 12l9-9 4 4-9 9z"/><path class="r" d="M66 12l-3 7 7-3"/><path d="M14 64h10M16 60h6"/><rect x="11" y="56" width="14" height="5" rx="2.5" class="r"/>',
    wellen: '<path class="r w1" d="M75 27c3 3 3 9 0 12"/><path class="r w2" d="M80 23c5 5 5 15 0 20"/><path class="r w1" d="M25 27c-3 3-3 9 0 12"/><path class="r w2" d="M20 23c-5 5-5 15 0 20"/>',
    leuchte: '<path d="M50 0v5"/><path class="r fl" d="M41 11c0-7 18-7 18 0z"/><path class="r lz" d="M43 14l-3 3M57 14l3 3"/>',
    zollstock: '<path class="r" d="M70 60l18-18 4 4-18 18z"/><path d="M75 55l2 2M79 51l2 2M83 47l2 2"/>',
    blatt: '<path class="r fl" d="M60 10c10-6 20-2 20-2s-2 12-14 14c-4 1-7-1-6-5"/><path class="r" d="M62 18c6-3 10-6 14-9"/>',
    massband: '<circle class="r" cx="80" cy="62" r="8"/><path class="r" d="M80 70H62"/><path d="M66 70v-3M70 70v-3M74 70v-3"/>'
  };
  function figurSvg(merkmal, klein) {
    return '<svg class="fig' + (klein ? ' klein' : '') + (SAISON ? ' ' + SAISON : '') + (merkmal === 'leuchte' ? ' ohne-xmas' : '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<g class="koerper">' +
      '<g class="beine-stehen"><path d="M50 72c-3 6-6 11-9 15M50 72c3 6 6 11 9 15"/><path d="M37 87h6M57 87h6"/></g>' +
      '<g class="beine-sitzen"><path d="M50 72c-5 1-10 2-14 3c-1 4-1 9 0 13M50 72c-3 2-6 5-8 7c0 4 1 8 2 12"/><path d="M32 88h5M40 91h5"/></g>' +
      '<g class="oben">' +
      '<path d="M50 52v20"/>' +
      '<path class="arm-l" d="M50 58c-6 2-10 6-13 10"/><path class="arm-r" d="M50 58c6 2 10 6 13 10"/>' +
      '<path class="ap ap-z" d="M50 58c6-1 11-1 17-1"/><path class="ap ap-h" d="M50 58c7-2 13-6 17-12"/><path class="ap ap-fr" d="M50 58c7-2 14-6 19-13"/><path class="ap ap-fl" d="M50 58c-7-2-14-6-19-13"/>' +
      '<circle class="kopf" cx="50" cy="32" r="19"/>' +
      '<circle class="wange" cx="38.5" cy="38" r="3.2"/><circle class="wange" cx="61.5" cy="38" r="3.2"/>' +
      '<g class="blick"><g class="augen"><ellipse cx="43" cy="31" rx="2.3" ry="2.8" class="p"/><ellipse cx="57" cy="31" rx="2.3" ry="2.8" class="p"/>' +
      '<circle cx="43.8" cy="30" r=".8" class="glanz"/><circle cx="57.8" cy="30" r=".8" class="glanz"/></g></g>' +
      '<g class="zu-augen"><path d="M40.5 31c1.6 1.6 3.4 1.6 5 0M54.5 31c1.6 1.6 3.4 1.6 5 0"/></g>' +
      '<g class="brille"><path class="glas" d="M37 27h11v4.5c0 2.6-2.4 4-5.5 4S37 34 37 31.5z"/><path class="glas" d="M52 27h11v4.5c0 2.6-2.4 4-5.5 4S52 34 52 31.5z"/><path d="M48 28.5h4M37 28l-5-2M63 28l5-2"/><path class="glanz-l" d="M39.5 29.5l2.5-1.5M54.5 29.5l2.5-1.5"/></g>' +
      '<path class="mund" d="M45 39.5c3 3.2 7 3.2 10 0"/>' +
      '<g class="xmas"><path class="fl r" d="M32 18C34 6 58 1 67 10c4 4 8 9 11 15l-9-6z"/><rect class="weiss" x="30" y="15" width="40" height="5.5" rx="2.75"/><circle class="weiss" cx="79" cy="26" r="3.6"/></g>' +
      '<g class="zzz"><path class="z1" d="M70 12h5l-5 5h5"/><path class="z2" d="M78 4h4l-4 4h4"/><path class="z3" d="M85 -3h3l-3 3h3"/></g>' +
      (MERKMALE[merkmal] || MERKMALE.muetze) +
      '</g>' +
      '<path class="zeichnen r" d="M28 95c8-4 14 3 22-1s12 2 20-1"/>' +
      '</g></svg>';
  }

  // ---------- Stil ----------
  var CSS = [
    ':host{all:initial;font-family:inherit;color:#1a1a1a}',
    '*{box-sizing:border-box;font-family:inherit}',
    '.fig{width:100%;height:100%;overflow:visible}',
    '.fig path,.fig circle,.fig rect,.fig ellipse{fill:none;stroke:#1a1a1a;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}',
    '.fig .r{stroke:' + EINST.rot + '}',
    '.fig .p{fill:#1a1a1a;stroke:none}',
    '.fig .kopf{fill:#fff}',
    '.fig .wange{fill:' + EINST.rot + ';stroke:none;opacity:.18}',
    '.fig .glanz{fill:#fff;stroke:none}',
    '.fig .fl{fill:' + EINST.rot + '}',
    '.fig .zeichnen{opacity:0;stroke-dasharray:60;stroke-dashoffset:60}',
    '.knopf{position:fixed;right:18px;bottom:var(--lotse-unten,18px);width:104px;height:112px;border:0;background:transparent;cursor:pointer;padding:0;z-index:2147483000;-webkit-tap-highlight-color:transparent}',
    '.knopf .fig{filter:drop-shadow(0 0 1.2px #fff) drop-shadow(0 0 1.2px #fff) drop-shadow(0 1px 3px rgba(0,0,0,.25))}',
    '.knopf:focus-visible{outline:3px solid ' + EINST.rot + ';outline-offset:4px;border-radius:12px}',
    '.knopf .schild{position:absolute;right:92px;bottom:64px;white-space:nowrap;background:#1a1a1a;color:#fff;font-size:14px;line-height:1.2;padding:8px 12px;border-radius:14px 14px 2px 14px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}',
    '.knopf:hover .schild,.knopf.zeigen .schild,.knopf:focus-visible .schild{opacity:1;transform:none}',
    '@media (prefers-reduced-motion:no-preference){',
    ' .koerper{animation:atmen 3.6s ease-in-out infinite;transform-origin:50% 90%}',
    ' .augen{animation:blinzeln 5.2s infinite;transform-origin:50% 33px}',
    ' .w1{animation:welle 1.8s ease-in-out infinite}.w2{animation:welle 1.8s ease-in-out .3s infinite}',
    ' .lz{animation:welle 2.4s ease-in-out infinite}',
    ' .winkt .arm-r{animation:winken .5s ease-in-out 4;transform-origin:50px 56px}',
    ' .huepft .koerper{animation:huepfen .6s ease-out 1}',
    ' .denkt .zeichnen{opacity:1;animation:zeichnen 1.4s linear infinite}',
    ' .denkt .arm-r{transform:rotate(28deg);transform-origin:50px 56px;transition:transform .3s}',
    '}',
    '.blick{transition:transform .15s}.schaut-links .blick{transform:translateX(-2px)!important}.schaut-unten .blick{transform:translateY(1.6px)!important}',
    '.zu-augen,.brille,.xmas,.zzz{display:none}',
    '.schlaeft .augen{display:none}.schlaeft .zu-augen,.schlaeft .zzz{display:inline}',
    '.sommer .brille{display:inline}.sommer .brille .glas{fill:#1a1a1a}.sommer .brille .glanz-l{stroke:#fff;stroke-width:1.4}.sommer .augen{visibility:hidden}.sommer.schlaeft .brille{display:none}',
    '.dezember .xmas{display:inline}.dezember .mz{display:none}.dezember .xmas .weiss{fill:#fff}.dezember.ohne-xmas .xmas{display:none}',
    '.ap{display:none}.zeigt .arm-r,.haelt .arm-r,.freut .arm-r,.freut .arm-l{display:none}.zeigt .ap-z,.haelt .ap-h,.freut .ap-fr,.freut .ap-fl{display:inline}',
    '.mini-zeile{display:flex;gap:8px;align-items:flex-end;align-self:stretch}.mini-zeile .mini-fig{width:46px;height:52px;flex:none}.mini-zeile .msg{max-width:none;flex:1}',
    '.karte{flex:1;border:1.5px solid #1a1a1a;border-radius:12px;padding:10px 12px;font-size:14px;background:#fff}.karte strong{display:block;margin-bottom:4px}.karte a{color:#1a1a1a}',
    '.blase{position:fixed;right:18px;bottom:calc(var(--lotse-unten,18px) + 118px);max-width:min(280px,calc(100vw - 40px));background:#1a1a1a;color:#fff;font-size:14px;line-height:1.35;padding:10px 34px 10px 14px;border-radius:16px 16px 4px 16px;z-index:2147483000;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}',
    '.blase[hidden]{display:none}.blase .weg-x{position:absolute;right:4px;top:4px;border:0;background:none;color:#fff;font-size:18px;cursor:pointer;width:28px;height:28px}',
    '@media (max-width:600px){.blase{right:10px;bottom:calc(var(--lotse-unten,8px) + 92px)}}',
    '@media (prefers-reduced-motion:no-preference){.zzz .z1{animation:zz 2.4s ease-in-out infinite}.zzz .z2{animation:zz 2.4s ease-in-out .5s infinite}.zzz .z3{animation:zz 2.4s ease-in-out 1s infinite}.freut .koerper{animation:luftsprung .9s cubic-bezier(.3,1.6,.5,1) 2}.blase{animation:blase-rein .35s ease-out}}',
    '@keyframes zz{0%,100%{opacity:0;transform:translateY(3px)}40%,70%{opacity:1;transform:none}}',
    '@keyframes luftsprung{0%,100%{transform:translateY(0)}40%{transform:translateY(-14px) rotate(-4deg)}}',
    '@keyframes blase-rein{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}',
    '.leiste2{display:flex;justify-content:space-between;gap:8px;padding:6px 14px;border-bottom:1px solid #eee}',
    '.leiste2 button{border:0;background:none;padding:6px 0;font-size:13px;color:#1a1a1a;text-decoration:underline;cursor:pointer;min-height:32px}',
    '.ruhe .koerper,.ruhe .augen,.ruhe .w1,.ruhe .w2,.ruhe .lz,.ruhe .zzz path{animation:none!important}.ruhe .blick{transform:none!important}',
    '.quellen{margin-top:6px;font-size:12.5px;color:#555}.quellen a{color:#1a1a1a;font-weight:600}',
    '.beine-sitzen{display:none}.sitzt .beine-stehen{display:none}.sitzt .beine-sitzen{display:inline}',
    '.sitzt .oben{transform:rotate(7deg);transform-origin:50px 72px}.sitzt .arm-r{transform:rotate(38deg);transform-origin:50px 58px}',
    '.knopf.sitzt{pointer-events:none}.knopf.sitzt .fig *{pointer-events:visiblePainted}',
    '@media (prefers-reduced-motion:no-preference){.knopf{transition:transform .5s cubic-bezier(.34,1.56,.64,1)}.springt .koerper{animation:huepfen .6s ease-out 1}}',
    '@keyframes atmen{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}',
    '@keyframes blinzeln{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}',
    '@keyframes welle{0%,100%{opacity:.25}50%{opacity:1}}',
    '@keyframes winken{0%,100%{transform:rotate(0)}50%{transform:rotate(-55deg)}}',
    '@keyframes huepfen{0%{transform:translateY(0)}35%{transform:translateY(-9px)}70%{transform:translateY(0)}85%{transform:translateY(-2px)}}',
    '@keyframes zeichnen{0%{stroke-dashoffset:60}70%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}',
    '.fenster{position:fixed;right:18px;bottom:18px;width:400px;max-width:calc(100vw - 32px);height:min(640px,calc(100vh - 36px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;z-index:2147483001;font-size:15px;line-height:1.45}',
    '.fenster[hidden]{display:none}',
    '.kopf-leiste{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;border-bottom:1px solid #eee}',
    '.kopf-leiste .mini{width:50px;height:54px;flex:none}',
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
    '@media (max-width:600px){.fenster{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;border-radius:0}.knopf{right:8px;bottom:var(--lotse-unten,8px);width:76px;height:84px}.knopf .schild{display:none}}',
    '@media print{.knopf,.fenster{display:none!important}}'
  ].join('\n');

  // ---------- Aufbau ----------
  var host = document.createElement('div');
  host.id = 'lh-lotse';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' + CSS + '</style>' +
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

  // Feste Elemente der Website unten rechts (z. B. die rote Kontakt-Ecke .cta-fixed) nicht verdecken: Lotse darüber setzen.
  function platz() {
    var unten = 0, kandidaten = document.querySelectorAll('.cta-fixed, [data-lotse-ausweichen]');
    for (var i = 0; i < kandidaten.length; i++) {
      var r = kandidaten[i].getBoundingClientRect();
      if (r.width > 0 && r.right > innerWidth - 120 && r.bottom > innerHeight - 40) unten = Math.max(unten, innerHeight - r.top);
    }
    host.style.setProperty('--lotse-unten', unten ? Math.round(unten + 8) + 'px' : '');
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

    // Begrüßung beim ersten Besuch: einmal winken, Schild kurz zeigen. Neuer Bereich: kurz hüpfen.
    if (!lies('lh-lotse-gewunken')) {
      setTimeout(function () { knopf.classList.add('winkt', 'zeigen'); schreib('lh-lotse-gewunken', '1');
        setTimeout(function () { knopf.classList.remove('winkt', 'zeigen'); }, 4200); }, 2500);
    } else if (lies('lh-lotse-bereich') !== BEREICH) {
      setTimeout(function () { knopf.classList.add('huepft'); setTimeout(function () { knopf.classList.remove('huepft'); }, 700); }, 1200);
    }
    schreib('lh-lotse-bereich', BEREICH);

    // Sitzen und Aufspringen: Ohne Aktion setzt sich der Lotse nach einer Weile auf die schräge Kante der Kontakt-Ecke.
    // Maus darüber, Fokus oder Antippen: er springt auf. Ohne Kontakt-Ecke bleibt er stehen.
    var dx = 0, dy = 0, sitzUhr = null;
    function ecke() {
      var k = document.querySelectorAll('.cta-fixed, [data-lotse-ausweichen]');
      for (var i = 0; i < k.length; i++) { var r = k[i].getBoundingClientRect(); if (r.width > 40 && r.right > innerWidth - 120 && r.bottom > innerHeight - 40) return r; }
      return null;
    }
    var hinsetzen = function () {
      var r = ecke(); if (!r || knopf.hidden || beschaeftigt || knopf.matches(':hover')) return;
      var k = knopf.getBoundingClientRect(), sk = Math.min(k.width, k.height) / 100, oy = (k.height - 100 * sk) / 2;
      var hx = k.left - dx + 50 * sk, hy = k.top - dy + oy + 72 * sk;
      var tx = r.right - r.width * 0.24, ty = r.top + (r.right - tx) * (r.height / r.width);
      dx = Math.round(tx - hx); dy = Math.round(ty - hy + 1.5 * sk);
      knopf.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; knopf.classList.add('sitzt');
    };
    function aufspringen() {
      if (knopf.classList.contains('sitzt')) {
        knopf.classList.remove('sitzt'); dx = dy = 0; knopf.style.transform = '';
        knopf.classList.add('springt'); setTimeout(function () { knopf.classList.remove('springt'); }, 650);
      }
      planen();
    }
    var ruheUhr = null, ruhigGestellt = lies('lh-lotse-ruhig') === '1';
    function ruhe(an) { host.classList.toggle('ruhe-an', !!an); var f = root.querySelectorAll('.fig'); for (var i = 0; i < f.length; i++) f[i].classList.toggle('ruhe', !!an); }
    function planen() {
      clearTimeout(sitzUhr); clearTimeout(ruheUhr);
      if (ruhigGestellt) { ruhe(true); return; }
      ruhe(false);
      sitzUhr = setTimeout(function () { hinsetzen(); }, 8000);
      ruheUhr = setTimeout(function () { ruhe(true); }, 60000);
    }
    var ruhigKnopf = $('.ruhig');
    function ruhigAnzeigen() { ruhigKnopf.textContent = ruhigGestellt ? 'Lotse wieder bewegen' : 'Lotse ruhig stellen'; ruhigKnopf.setAttribute('aria-pressed', ruhigGestellt ? 'true' : 'false'); }
    ruhigKnopf.addEventListener('click', function () { ruhigGestellt = !ruhigGestellt; schreib('lh-lotse-ruhig', ruhigGestellt ? '1' : '0'); ruhigAnzeigen(); planen(); });
    ruhigAnzeigen();
    $('.mensch').addEventListener('click', function () { formularZeigen('team'); });
    knopf.addEventListener('mouseenter', aufspringen); knopf.addEventListener('focus', aufspringen);
    knopf.addEventListener('touchstart', aufspringen, { passive: true });
    addEventListener('resize', function () { if (knopf.classList.contains('sitzt')) { knopf.classList.remove('sitzt'); dx = dy = 0; knopf.style.transform = ''; setTimeout(function () { hinsetzen(); }, 50); } });
    planen();

    // Abends und am Wochenende schläft er (auf der Kante, wenn es eine gibt). Beim Aufspringen wacht er auf.
    function schlaf(an) { var f = knopf.querySelector('.fig'); if (f) f.classList.toggle('schlaeft', !!an); }
    if (NACHT) {
      schlaf(true);
      knopf.addEventListener('mouseenter', function () { schlaf(false); });
      knopf.addEventListener('focus', function () { schlaf(false); });
      var wachHin = hinsetzen; hinsetzen = function () { wachHin(); if (knopf.classList.contains('sitzt') || !ecke()) schlaf(true); };
    }

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

    // Augen folgen der Maus (nur mit Maus, nicht bei reduzierter Bewegung).
    if (window.matchMedia && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var plan = false, mx = 0, my = 0;
      document.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY; if (plan || ruhigGestellt || knopf.querySelector('.fig.ruhe')) return; plan = true;
        requestAnimationFrame(function () {
          plan = false; if (knopf.hidden) return;
          var k = knopf.getBoundingClientRect(), cx = k.left + k.width / 2, cy = k.top + k.height * 0.32, vx = mx - cx, vy = my - cy, l = Math.sqrt(vx * vx + vy * vy) || 1;
          var b = knopf.querySelector('.blick'); if (b) b.style.transform = 'translate(' + (vx / l * 1.8).toFixed(2) + 'px,' + (vy / l * 1.5).toFixed(2) + 'px)';
        });
      }, { passive: true });
    }

    function oeffnen() {
      blase.hidden = true; schlaf(false);
      knopf.classList.remove('sitzt'); dx = dy = 0; knopf.style.transform = ''; clearTimeout(sitzUhr);
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
    if (NACHT) zeige('hinweis', 'Unser Team ist gerade nicht im Haus und meldet sich am nächsten Werktag. Ich bin trotzdem für Sie da.');
    zeige('lotse', (NACHT && JETZT.stunde >= 18 ? 'Guten Abend!' : 'Guten Tag!') + ' Ich bin der Lotse, ein KI-Assistent von lechner+hayn. Ich beantworte Fragen zu unseren Leistungen und Produkten, nehme Produkt- und Stücklisten auf und gebe Ihre Anfrage für ein individuelles Angebot an unser Team weiter.');
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
            zeige(null, miniZeile('freut', dank), false); zustand.angezeigt.push(['lotse', d.antwort]);
            var kf = root.querySelector('.kopf-leiste .fig'); if (kf) { kf.classList.add('freut'); setTimeout(function () { kf.classList.remove('freut'); }, 2000); } zustand.positionen = []; sichern(); var t = root.querySelector('.verlauf .tabelle'); if (t) t.remove(); var zl = root.querySelector('.verlauf .zeige-liste'); if (zl) zl.remove(); }
          else { fehler.textContent = (d && d.antwort) || 'Das hat nicht geklappt.'; knopf.disabled = false; knopf.textContent = 'Anfrage senden'; }
        })
        .catch(function () { fehler.textContent = 'Keine Verbindung. Bitte versuchen Sie es noch einmal.'; knopf.disabled = false; knopf.textContent = 'Anfrage senden'; });
    });
    zeige(null, f, false);
    setTimeout(function () { f.scrollIntoView({ block: 'start' }); f.email.focus({ preventScroll: true }); }, 30);
  }
})();
