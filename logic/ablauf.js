// Ablauf der ZW-Station: verteilt jede Anfrage an die passende Aktion.
// Stand Phase 6.0: Retouren, Artikel und Preise kommen echt aus plenty und Shopware (nur lesend).
// Anlegen wird nur nachgestellt: nichts wird in plenty oder Shopware geschrieben („Probelauf“).
// Trockenlauf: Beim Anlegen werden alle Schreibbefehle mit echten Daten gebaut und auf der Freigabe-Seite gezeigt, nicht gesendet.
// Der Zustand (Protokoll, offene Freigaben, ZW-Liste, Zwischenspeicher) liegt im Speicher des Workflows.
// Beim Bauen des n8n-Workflows wird alles zwischen NUR-NODE-ANFANG und NUR-NODE-ENDE entfernt.
//
// Ablauf in n8n pro Anfrage:
//   Webhook → Einstellungen → Vorbereiten (zwVorbereiten) → [plenty Runde A → Runde B planen (zwRundeB)
//   → plenty Runde B → Shopware] → ZW-Logik (zwVerarbeiten) → Antwort
// Die eckigen Klammern laufen nur, wenn Daten gebraucht werden.

// NUR-NODE-ANFANG
const {
  istZwZustand, istGueltigeEntscheidung, grundPflicht, ZW_GRUND_MAX, berechneZwPreis, zwPreisWarnungen, lagerPreisLesen,
  zwBarcode, zwVariantennummer, zwName, zwKommentar, euro,
} = require('./zw-logik.js');
const { passwortPruefen, signatur, schluesselAusstellen, schluesselPruefen, gleich, sha256, utf8, bytesZuHex } = require('./anmeldung.js');
const {
  LEER_PLENTY, LEER_SHOPWARE, retourenNummer, anfrageRetourenListe, anfrageRetoure, anfrageVarianten, anfrageBarcode, shopwareSuche,
  anfrageOriginale, anfrageArtikel, artikelIdsAus, plentyFehler, eintraege, artikelPositionen, rabattPositionen, shopAuftrag, eanAusVariante, textOhneHtml, shopwareNachNummer,
} = require('./quellen.js');
const { zwSchreibplan, retoureBefehle, schreibplanHtml, NEU_VARIANTE } = require('./schreibplan.js');
// NUR-NODE-ENDE

const ERLEDIGT = ['angelegt', 'plus1', 'nicht_verkaufbar', 'kein_zw'];
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MINUTEN = 15;
const MAX_ZWISCHENSPEICHER_RETOUREN = 300;
// Fertige Retouren stehen so lange im Ordner „Fertig“, danach räumt die Station sie weg.
const FERTIG_TAGE = 7;
const DATEN_AKTIONEN = ['retouren', 'retoure', 'vorschau', 'anlegen'];
// Bilder zum Grund: höchstens 3 pro Position. Die Seite verkleinert sie vorher (JPEG, etwa 300 KB).
const BILDER_MAX = 3;
const BILD_MAX_ZEICHEN = 2500000;
const BILD_TYPEN = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Trockenlauf: so viele Schreibpläne bleiben gespeichert (die ältesten fallen weg)
const MAX_SCHREIBPLAENE = 50;
// So weit darf das Lager vom Preisvorschlag abweichen, ohne den Preis zu begründen (entschieden 08.10.2026).
// Überschreibbar mit einstellungen.preisAbweichungMax.
const PREIS_ABWEICHUNG_OHNE_GRUND = 50;

// ---------- Einstieg ----------

// Welche Aktion? Aus der Webhook-Adresse. Ohne Adresse und ohne Kopfzeilen (Testlauf direkt in n8n,
// nicht von außen erreichbar) aus body.aktion oder query.aktion.
function zwRoute(anfrage) {
  const url = String(anfrage.url || '');
  const ueberWebhook = !!(anfrage.headers && (anfrage.headers.host || anfrage.headers.Host));
  if (!url && !ueberWebhook) {
    const a = (anfrage.body && anfrage.body.aktion) || (anfrage.query && anfrage.query.aktion) || '';
    return { aktion: String(a), testlauf: true };
  }
  const pfad = url.split('?')[0].replace(/\/+$/, '');
  return { aktion: pfad.slice(pfad.lastIndexOf('/') + 1), testlauf: false };
}

// Schritt 1 in n8n: Welche Daten braucht diese Anfrage? Liefert die Abfragen für plenty Runde A und Shopware.
function zwVorbereiten(anfrage, k) {
  try {
    const speicher = k.speicher;
    speicherVorbereiten(speicher);
    const e = k.einstellungen || {};
    const route = zwRoute(anfrage);
    if (!DATEN_AKTIONEN.includes(route.aktion)) return { weiter: 'logik' };
    if (!route.testlauf) {
      // Ohne gültige Anmeldung keine Abfragen an plenty und Shopware. Die Ablehnung schreibt die ZW-Logik.
      const g = String(e.geheimSchluessel || '').trim().length >= 32 ? String(e.geheimSchluessel).trim() : speicher.geheimnis;
      const kopf = String((anfrage.headers || {}).authorization || '');
      if (!g || !schluesselPruefen(g, kopf.replace(/^Bearer\s+/i, ''), k.jetzt)) return { weiter: 'logik' };
    }
    const q = anfrage.query || {};
    const body = anfrage.body || {};

    if (route.aktion === 'retouren') {
      return { weiter: 'daten', plan: { art: 'retouren' }, plenty: anfrageRetourenListe(e), shopware: LEER_SHOPWARE };
    }
    if (route.aktion === 'retoure') {
      const id = retourenNummer(q.nr);
      if (!id) return { weiter: 'logik' };
      return { weiter: 'daten', plan: { art: 'retoure', id }, plenty: anfrageRetoure(id), shopware: LEER_SHOPWARE };
    }
    // vorschau und anlegen: Barcodes der möglichen ZW-Artikel in plenty suchen, Originale in Shopware lesen
    const entscheidungen = Array.isArray(body.entscheidungen) ? body.entscheidungen.slice(0, 50) : [];
    const barcodes = [];
    const varianten = [];
    const eans = [];
    for (const x of entscheidungen) {
      const pos = speicher.cache.positionen[String(x.positionId || '')];
      if (!pos || !pos.ean || !istZwZustand(String(x.zustand || ''))) continue;
      for (const code of [zwBarcode(pos.ean, x.zustand), pos.ean + 'ZW']) if (!barcodes.includes(code)) barcodes.push(code);
      varianten.push(pos.varianteId);
      eans.push(pos.ean);
    }
    if (!barcodes.length) return { weiter: 'logik' };
    if (route.aktion === 'vorschau') {
      return { weiter: 'daten', plan: { art: 'vorschau', barcodes }, plenty: barcodes.map(anfrageBarcode), shopware: shopwareSuche(varianten) };
    }
    // Anlegen: zusätzlich das plenty-Original mit allen Feldern (Runde B: Artikel und Versandprofile)
    // und in Shopware alle Artikel mit derselben EAN (vorhandene ZW-Artikel). Für den Trockenlauf.
    const ids = [...new Set(varianten)];
    return {
      weiter: 'daten', plan: { art: 'anlegen', barcodes, originale: true },
      plenty: barcodes.map(anfrageBarcode).concat([anfrageOriginale(ids)]), shopware: shopwareSuche(varianten, eans),
    };
  } catch (err) {
    return { weiter: 'logik' };
  }
}

// Schritt 2 in n8n: Abfragen für plenty Runde B, abhängig von den Ergebnissen aus Runde A.
function zwRundeB(plan, antwortenA) {
  if (plan && plan.art === 'retoure' && !plentyFehler(antwortenA) && antwortenA[0]) {
    const ids = [...new Set(artikelPositionen(antwortenA[0]).map((p) => p.varianteId))];
    if (ids.length) return [anfrageVarianten(ids)];
  }
  // Trockenlauf: Artikel und Versandprofile der Originale (je zwei Abfragen pro Artikel)
  if (plan && plan.art === 'anlegen' && plan.originale && !plentyFehler(antwortenA)) {
    const ids = artikelIdsAus(antwortenA[plan.barcodes.length]).slice(0, 25);
    if (ids.length) return [].concat(...ids.map(anfrageArtikel));
  }
  return [LEER_PLENTY];
}

// Schritt 3 in n8n: die eigentliche Aktion. k.daten = { plan, a, b, shopware } wenn Daten geholt wurden.
function zwVerarbeiten(anfrage, k) {
  try {
    return zwAktion(anfrage, k);
  } catch (e) {
    if (e && e.zwAntwort) return e.zwAntwort;
    return json(500, { ok: false, fehler: 'Interner Fehler: ' + (e && e.message ? e.message : String(e)) });
  }
}

function zwAktion(anfrage, k) {
  const speicher = k.speicher;
  speicherVorbereiten(speicher);
  const e = Object.assign({}, k.einstellungen || {}, { geheimSchluessel: geheimSchluesselBestimmen(k.einstellungen || {}, speicher, k.zufall) });
  const route = zwRoute(anfrage);
  const aktion = route.aktion;
  const q = anfrage.query || {};
  const body = anfrage.body || {};

  switch (aktion) {
    case 'zw-station':
      if (q.pruefen === 'version') {
        // Prüfsumme des Codes, der in n8n tatsächlich steht. Damit lässt sich ein Update überprüfen.
        const quelle = typeof k.eigenerCode === 'function' ? k.eigenerCode() : null;
        return json(200, { ok: true, codeSha256: quelle ? bytesZuHex(sha256(utf8(quelle))) : null });
      }
      return { status: 200, contentType: 'text/html; charset=utf-8', body: k.seiteHtml };
    case 'anmelden':
      return anmelden(body, e, speicher, k.jetzt);
    case 'freigabe':
      return freigabeSeite(q, e, speicher);
    case 'freigabe-entscheiden':
      return freigabeEntscheiden(body, e, speicher, k.jetzt);
  }

  // Alle weiteren Aktionen nur mit gültigem Schlüssel. Testläufe direkt in n8n (ohne Webhook-Adresse) gelten als Admin.
  const person = route.testlauf
    ? { benutzer: 'test', name: 'Testlauf in n8n', rolle: 'admin' }
    : angemeldetePerson(anfrage.headers || {}, e, k.jetzt);
  switch (aktion) {
    case 'retouren':
      fertigAufraeumen(speicher, k.jetzt);
      return json(200, { ok: true, person, modus: 'probelauf-echtdaten', retouren: retourenListe(speicher, daten(k, 'retouren')), fertig: fertigListe(speicher) });
    case 'retoure':
      if (!retourenNummer(q.nr)) return json(404, { ok: false, fehler: 'Retoure „' + String(q.nr || '').slice(0, 40) + '“ nicht gefunden.' });
      return json(200, { ok: true, retoure: retoureDetail(speicher, q.nr, daten(k, 'retoure'), k.jetzt) });
    case 'vorschau':
      return json(200, { ok: true, vorschau: vorschauListe(speicher, body, e, quellenFuerVorschau(k)) });
    case 'anlegen':
      return anlegen(speicher, body, e, person, k.jetzt, anfrage.url, quellenFuerVorschau(k));
    case 'zw-liste':
      return json(200, { ok: true, zwListe: speicher.zwListe.slice(-300).reverse(), protokoll: speicher.protokoll.slice(-50).reverse() });
    case 'zw-liste-buchen':
      return zwListeBuchen(speicher, body, person, k.jetzt);
    case 'zuruecksetzen':
      if (person.rolle !== 'admin') return json(403, { ok: false, fehler: 'Nur für Admins.' });
      for (const s of Object.keys(speicher)) if (s !== 'fehlversuche' && s !== 'geheimnis') delete speicher[s];
      speicherVorbereiten(speicher);
      return json(200, { ok: true });
  }
  return json(404, { ok: false, fehler: 'Unbekannte Aktion: ' + aktion });
}

// ---------- Hilfen ----------

function json(status, inhalt) {
  return { status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(inhalt) };
}

function abbrechen(status, fehler) {
  const err = new Error(fehler);
  err.zwAntwort = json(status, { ok: false, fehler });
  throw err;
}

function html(status, titel, inhalt) {
  return {
    status, contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(titel) + '</title><style>' +
      'body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#eef1f3;color:#16212b;margin:0;padding:24px 16px}' +
      '.k{max-width:760px;margin:0 auto;background:#fff;border:1px solid #d5dde3;border-radius:14px;padding:24px}' +
      'h1{font-size:1.3rem;margin:0 0 12px}table{border-collapse:collapse;width:100%;margin:12px 0}' +
      'td{padding:6px 8px;border-bottom:1px solid #d5dde3;vertical-align:top}td:first-child{color:#5b6b78;white-space:nowrap}' +
      '.w{background:#fdf0da;color:#9a5a00;padding:8px 12px;border-radius:8px;margin:8px 0}' +
      '.i{background:#e8f1fb;color:#1f4f7a;padding:8px 12px;border-radius:8px;margin:8px 0}.m{color:#5b6b78;font-size:.9rem}' +
      'h2{font-size:1.1rem;margin:28px 0 8px;padding-top:16px;border-top:1px solid #d5dde3}.plan{padding-left:22px}.plan li{margin:0 0 14px}' +
      'code{font:600 .85rem ui-monospace,Menlo,monospace;word-break:break-all}' +
      'pre{font:.78rem/1.4 ui-monospace,Menlo,monospace;background:#f4f6f8;border:1px solid #d5dde3;border-radius:8px;padding:8px;overflow-x:auto;margin:6px 0;white-space:pre-wrap;word-break:break-all}' +
      'form{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}button{font:600 1rem system-ui,sans-serif;padding:14px 22px;border-radius:10px;cursor:pointer}' +
      '.ja{background:#1d7a46;color:#fff;border:1px solid #1d7a46}.nein{background:#fff;color:#b3261e;border:1px solid #b3261e}' +
      '@media (prefers-color-scheme:dark){body{background:#0f161c;color:#e6edf2}.k{background:#172129;border-color:#2c3a45}td{border-color:#2c3a45}.nein{background:#172129}' +
      'pre{background:#0f161c;border-color:#2c3a45}.i{background:#16304a;color:#cfe3f7}h2{border-color:#2c3a45}}' +
      '</style></head><body><div class="k">' + inhalt + '</div></body></html>',
  };
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function speicherVorbereiten(speicher) {
  if (!speicher.positionen) speicher.positionen = {};
  if (!speicher.protokoll) speicher.protokoll = [];
  if (!speicher.zwListe) speicher.zwListe = [];
  if (!speicher.fehlversuche) speicher.fehlversuche = {};
  if (!speicher.cache) speicher.cache = { positionen: {}, retouren: {}, reihenfolge: [] };
  if (!speicher.kommentare) speicher.kommentare = {};
  if (!speicher.retourenFertig) speicher.retourenFertig = {};
  if (!speicher.sim) speicher.sim = { naechsteNr: 1, zwArtikel: {}, naechsteZeile: 1 };
}

// Geheimschlüssel: aus „Einstellungen“, falls dort gesetzt. Sonst einmalig zufällig erzeugen
// und im Speicher des Workflows behalten. So muss niemand einen Schlüssel von Hand kopieren.
function geheimSchluesselBestimmen(e, speicher, zufall) {
  const eingetragen = String(e.geheimSchluessel || '').trim();
  if (eingetragen.length >= 32) return eingetragen;
  if (!speicher.geheimnis) {
    const neu = (zufall || zufallsHex)();
    if (!neu || neu.length < 64) return '';
    speicher.geheimnis = neu;
  }
  return speicher.geheimnis;
}

// 32 zufällige Bytes als Hex, aus einer sicheren Quelle. Gibt null zurück, wenn keine da ist.
function zufallsHex() {
  try { return require('crypto').randomBytes(32).toString('hex'); } catch (err) { /* weiter */ }
  try {
    const b = new Uint8Array(32);
    globalThis.crypto.getRandomValues(b);
    return Array.from(b, (x) => (x < 16 ? '0' : '') + x.toString(16)).join('');
  } catch (err) { return null; }
}

function geheimnis(e) {
  const g = String(e.geheimSchluessel || '').trim();
  if (g.length < 32) abbrechen(500, 'Kein Geheimschlüssel: n8n liefert hier keine sicheren Zufallszahlen. Bitte in Einstellungen geheimSchluessel setzen (mindestens 32 Zeichen).');
  return g;
}

// Nachsichtig lesen: einzelner Eintrag ohne [ ], mehrere Einträge ohne [ ], Leerzeichen.
// Ist die Liste unbrauchbar, kommt eine klare Meldung statt „Passwort falsch“.
function benutzerListe(e) {
  let liste = e.benutzer;
  if (typeof liste === 'string') {
    const text = liste.trim();
    if (!text || text === '[]') abbrechen(500, 'Einstellungen: benutzer ist leer. Einträge aus „Zugang einrichten“ einfügen, speichern und Publish.');
    try {
      liste = JSON.parse(text);
    } catch (err) {
      try { liste = JSON.parse('[' + text + ']'); } catch (err2) {
        abbrechen(500, 'Einstellungen: benutzer ist kein gültiges JSON. Form: [{…},{…}] mit Komma zwischen den Einträgen.');
      }
    }
  }
  if (liste && !Array.isArray(liste) && typeof liste === 'object') liste = [liste];
  if (!Array.isArray(liste) || !liste.length) abbrechen(500, 'Einstellungen: benutzer ist leer.');
  const kaputt = liste.filter((b) => !b || !b.benutzer || !/^pbkdf2-sha256\$\d+\$[0-9a-f]+\$[0-9a-f]{64}$/i.test(String(b.hash || '').trim()));
  if (kaputt.length) {
    abbrechen(500, 'Einstellungen: ' + kaputt.length + ' Eintrag/Einträge in benutzer ohne gültigen Benutzernamen oder Hash. Eintrag neu erzeugen und komplett einfügen.');
  }
  return liste.map((b) => Object.assign({}, b, { benutzer: String(b.benutzer).trim(), hash: String(b.hash).trim() }));
}

function protokollieren(speicher, jetzt, eintrag) {
  speicher.protokoll.push(Object.assign({ zeit: new Date(jetzt).toISOString() }, eintrag));
  if (speicher.protokoll.length > 1000) speicher.protokoll.splice(0, speicher.protokoll.length - 1000);
}

// Die von n8n geholten Daten für diese Aktion. Fehlen sie, lief „Vorbereiten“ nicht wie erwartet.
function daten(k, art) {
  const d = k.daten;
  if (!d || !d.plan || d.plan.art !== art) abbrechen(502, 'Keine Daten aus plenty erhalten. Bitte erneut versuchen.');
  const fehler = plentyFehler(d.a) || plentyFehler(d.b);
  if (fehler && art === 'retoure' && /\b404\b|not found/i.test(fehler)) abbrechen(404, 'Retoure „' + d.plan.id + '“ nicht gefunden.');
  if (fehler) abbrechen(502, 'plenty meldet: ' + fehler);
  if (d.shopware && d.shopware.error) abbrechen(502, 'Shopware meldet: ' + (d.shopware.error.message || d.shopware.error));
  return d;
}

function kommentarSim(speicher, retoureId, zeit, text) {
  if (!speicher.kommentare[retoureId]) speicher.kommentare[retoureId] = [];
  speicher.kommentare[retoureId].push({ zeit, text });
}

// ---------- Anmeldung ----------

function anmelden(body, e, speicher, jetzt) {
  const name = String(body.benutzer || '').trim().toLowerCase().slice(0, 100);
  const passwort = String(body.passwort || '');
  const g = geheimnis(e);
  if (!name || !passwort) return json(400, { ok: false, fehler: 'Benutzername und Passwort eingeben.' });

  const fv = speicher.fehlversuche[name];
  if (fv && fv.gesperrtBis && fv.gesperrtBis > jetzt) {
    return json(429, { ok: false, fehler: 'Zu viele Fehlversuche. Bitte in ' + Math.ceil((fv.gesperrtBis - jetzt) / 60000) + ' Minuten erneut versuchen.' });
  }

  const person = benutzerListe(e).find((b) => String(b.benutzer || '').toLowerCase() === name);
  const richtig = person && !person.gesperrt && passwortPruefen(passwort, person.hash);
  if (!richtig) {
    const sperreAbgelaufen = fv && fv.gesperrtBis && fv.gesperrtBis <= jetzt;
    const neu = { anzahl: (fv && !sperreAbgelaufen ? fv.anzahl : 0) + 1, gesperrtBis: 0 };
    if (neu.anzahl >= MAX_FEHLVERSUCHE) neu.gesperrtBis = jetzt + SPERRE_MINUTEN * 60000;
    // Speicher klein halten, falls jemand viele ausgedachte Namen durchprobiert
    if (Object.keys(speicher.fehlversuche).length > 500) speicher.fehlversuche = {};
    speicher.fehlversuche[name] = neu;
    protokollieren(speicher, jetzt, { benutzer: name, aktion: 'anmeldung', ergebnis: 'fehlgeschlagen' });
    return json(401, { ok: false, fehler: 'Benutzername oder Passwort falsch.' });
  }

  delete speicher.fehlversuche[name];
  const minuten = Number(e.anmeldungMinuten) > 0 ? Number(e.anmeldungMinuten) : 600;
  const schluessel = schluesselAusstellen(g, { benutzer: name }, minuten, jetzt);
  protokollieren(speicher, jetzt, { benutzer: name, aktion: 'anmeldung', ergebnis: 'ok' });
  return json(200, { ok: true, schluessel, name: person.name || name, rolle: person.rolle || 'lager', gueltigMinuten: minuten });
}

function angemeldetePerson(headers, e, jetzt) {
  const kopf = String(headers.authorization || headers.Authorization || '');
  const schluessel = kopf.replace(/^Bearer\s+/i, '');
  const inhalt = schluesselPruefen(geheimnis(e), schluessel, jetzt);
  if (!inhalt) abbrechen(401, 'Bitte neu anmelden.');
  // Gesperrte oder entfernte Personen verlieren den Zugriff sofort
  const person = benutzerListe(e).find((b) => String(b.benutzer || '').toLowerCase() === inhalt.benutzer);
  if (!person || person.gesperrt) abbrechen(401, 'Zugang gesperrt. Bitte an Tobias wenden.');
  return { benutzer: inhalt.benutzer, name: person.name || inhalt.benutzer, rolle: person.rolle || 'lager' };
}

// ---------- Retouren (echt aus plenty) ----------

function positionsStatus(speicher, positionId) {
  return speicher.positionen[positionId] || { status: 'offen' };
}

function zaehlen(speicher, positionIds) {
  const st = positionIds.map((id) => positionsStatus(speicher, id).status);
  return {
    erledigt: st.filter((s) => ERLEDIGT.includes(s)).length,
    wartet: st.filter((s) => s === 'wartet').length,
    fehler: st.filter((s) => s === 'fehler').length,
  };
}

// Offene Retouren. Fertige (alle Positionen entschieden) stehen im Ordner „Fertig“, nicht hier.
// Im Echtbetrieb verlassen sie 9.1.1 ohnehin, im Probelauf bleiben sie in plenty auf 9.1.1.
function retourenListe(speicher, d) {
  return eintraege(d.a[0]).map((auftrag) => {
    const positionen = artikelPositionen(auftrag);
    const id = String(auftrag.id);
    return Object.assign({
      id, datum: String(auftrag.createdAt || '').slice(0, 10), shopAuftrag: shopAuftrag(auftrag), anzahl: positionen.length,
      probelaufFertig: !!speicher.retourenFertig[id], probelaufStatus: fertigStatus(speicher, id),
    }, zaehlen(speicher, positionen.map((p) => p.positionId)));
  }).filter((r) => !r.probelaufFertig && !(r.anzahl > 0 && r.erledigt === r.anzahl));
}

function fertigZeit(f) {
  return Date.parse(f && typeof f === 'object' ? f.zeit : f);
}

// Ordner „Fertig“: zuletzt abgeschlossene Retouren zuerst
function fertigListe(speicher) {
  return Object.keys(speicher.retourenFertig).map((id) => {
    const t = fertigZeit(speicher.retourenFertig[id]);
    const r = speicher.cache.retouren[id] || {};
    return {
      id, status: fertigStatus(speicher, id), fertigAm: Number.isFinite(t) ? new Date(t).toISOString() : '',
      datum: r.datum || '', shopAuftrag: r.shopAuftrag || '', anzahl: (r.positionIds || []).length,
    };
  }).sort((a, b) => (a.fertigAm < b.fertigAm ? 1 : -1));
}

// Nach FERTIG_TAGE Tagen aus dem Ordner entfernen. Die Entscheidungen der Positionen bleiben gespeichert,
// damit eine Retoure, die im Probelauf noch auf 9.1.1 steht, nicht wieder als offen erscheint.
function fertigAufraeumen(speicher, jetzt) {
  const grenze = jetzt - FERTIG_TAGE * 86400000;
  for (const id of Object.keys(speicher.retourenFertig)) {
    if (!(fertigZeit(speicher.retourenFertig[id]) >= grenze)) {
      delete speicher.retourenFertig[id];
      delete speicher.kommentare[id];
    }
  }
}

// Status, auf den die Retoure im Echtbetrieb gesetzt würde (im Probelauf nur vermerkt).
function fertigStatus(speicher, id) {
  const f = speicher.retourenFertig[id];
  return f && typeof f === 'object' ? f.status : null;
}

function retoureMerken(speicher, id, eintrag) {
  const c = speicher.cache;
  if (!c.retouren[id]) c.reihenfolge.push(id);
  c.retouren[id] = eintrag;
  while (c.reihenfolge.length > MAX_ZWISCHENSPEICHER_RETOUREN) {
    const alt = c.reihenfolge.shift();
    for (const p of (c.retouren[alt] || {}).positionIds || []) delete c.positionen[p];
    delete c.retouren[alt];
  }
}

function retoureDetail(speicher, nr, d, jetzt) {
  const auftrag = d.a[0] || {};
  const id = String(auftrag.id || '');
  if (!id || Number(auftrag.typeId) !== 3) abbrechen(404, 'Retoure „' + (nr || '') + '“ nicht gefunden.');
  const varianten = {};
  for (const v of eintraege(d.b && d.b[0])) varianten[String(v.id)] = v;
  const positionen = artikelPositionen(auftrag).map((p) => {
    const v = varianten[p.varianteId] || {};
    const pos = Object.assign({}, p, { retoureId: id, ean: eanAusVariante(v), modell: v.model || '', variantennummer: v.number || '' });
    speicher.cache.positionen[p.positionId] = pos;
    return pos;
  });
  retoureMerken(speicher, id, { positionIds: positionen.map((p) => p.positionId), shopAuftrag: shopAuftrag(auftrag), datum: String(auftrag.createdAt || '').slice(0, 10), gemerkt: new Date(jetzt).toISOString() });
  return {
    id, shopAuftrag: shopAuftrag(auftrag), datum: String(auftrag.createdAt || '').slice(0, 10), status: auftrag.statusName || String(auftrag.statusId),
    probelaufFertig: !!speicher.retourenFertig[id], probelaufStatus: fertigStatus(speicher, id),
    plentyKommentare: eintraege(d.a[1]).map((c) => ({ zeit: c.createdAt, text: textOhneHtml(c.text) })).filter((c) => c.text),
    ausgeblendet: rabattPositionen(auftrag),
    kommentare: speicher.kommentare[id] || [],
    positionen: positionen.map((p) => Object.assign({
      positionId: p.positionId, varianteId: p.varianteId, ean: p.ean, modell: p.modell, name: p.name, menge: p.menge, bild: null,
    }, positionsStatus(speicher, p.positionId))),
  };
}

// ---------- Vorschau ----------

function quellenFuerVorschau(k) {
  const d = k.daten;
  if (!d || !d.plan || (d.plan.art !== 'vorschau' && d.plan.art !== 'anlegen')) return { barcodes: {}, shopware: {}, geholt: false };
  const fehler = plentyFehler(d.a);
  if (fehler) abbrechen(502, 'plenty meldet: ' + fehler);
  if (d.shopware && d.shopware.error) abbrechen(502, 'Shopware meldet: ' + (d.shopware.error.message || d.shopware.error));
  const barcodes = {};
  (d.plan.barcodes || []).forEach((code, i) => { barcodes[code] = eintraege(d.a[i]); });
  return { barcodes, shopware: shopwareNachNummer(d.shopware), originale: originaleLesen(d), geholt: true };
}

// Trockenlauf: plenty-Original pro Varianten-ID mit Artikel und Versandprofilen. Fehlt etwas, bleibt es leer
// (der Schreibplan zeigt dann, was fehlt). Anlegen wird dadurch nicht blockiert.
function originaleLesen(d) {
  const karte = {};
  if (!d.plan.originale) return karte;
  const antwort = d.a[d.plan.barcodes.length];
  const artikelIds = artikelIdsAus(antwort).slice(0, 25);
  const bOk = !plentyFehler(d.b);
  const artikel = {};
  artikelIds.forEach((id, i) => {
    const a = bOk ? (d.b || [])[2 * i] : null;
    const versand = bOk ? (d.b || [])[2 * i + 1] : null;
    if (a && String(a.id) === id) artikel[id] = { artikel: a, versandprofile: Array.isArray(versand) ? versand : eintraege(versand) };
  });
  for (const v of eintraege(antwort)) {
    const a = artikel[String(v.itemId)] || {};
    karte[String(v.id)] = { variante: v, artikel: a.artikel || null, versandprofile: a.versandprofile || [] };
  }
  return karte;
}

function vorschauPosition(speicher, positionId, zustand, e, quellen) {
  const pos = speicher.cache.positionen[positionId];
  if (!pos) return { positionId, zustand, fehler: 'Position unbekannt. Bitte die Retoure neu öffnen.' };
  if (!istGueltigeEntscheidung(zustand)) return { positionId, zustand, fehler: 'Unbekannter Zustand.' };
  const basis = { positionId, retoureId: pos.retoureId, zustand };
  if (!istZwZustand(zustand)) {
    return Object.assign(basis, { artikel: false, kommentar: zwKommentar({ zustand }) });
  }
  if (!pos.ean) return Object.assign(basis, { fehler: 'Variante ' + pos.varianteId + ' hat in plenty keine EAN. Bitte ans Büro geben.' });
  if (!quellen.geholt) return Object.assign(basis, { fehler: 'Daten aus plenty und Shopware fehlen. Bitte erneut versuchen.' });
  const sw = quellen.shopware[pos.varianteId];
  if (!sw) return Object.assign(basis, { fehler: 'Original ' + pos.varianteId + ' nicht in Shopware gefunden. Bitte ans Büro geben.' });

  let barcode, preis;
  try {
    barcode = zwBarcode(pos.ean, zustand);
    preis = berechneZwPreis({ jetzigerPreis: sw.preis, mindestpreis: sw.mindestpreis, zustand, einkaufspreis: sw.einkaufspreis }, e);
  } catch (err) {
    return Object.assign(basis, { fehler: err.message });
  }
  // Warnungen, die nicht vom Preis abhängen (bleiben, wenn das Lager den Preis ändert)
  const preisWarnungen = zwPreisWarnungen(preis.preis, { einkaufspreis: sw.einkaufspreis, streichpreis: preis.streichpreis });
  const regelWarnungen = preis.warnungen.filter((w) => !preisWarnungen.includes(w))
    .concat(pos.modell ? [] : ['Modell fehlt in plenty. Variantennummer wird aus dem Namen gebildet.']);
  // Gibt es den ZW-Artikel schon? Echt in plenty (Barcode) oder im Probelauf nachgestellt.
  const echt = (quellen.barcodes[barcode] || [])[0];
  const sim = speicher.sim.zwArtikel[barcode];
  const vorhanden = echt ? { varianteId: String(echt.id), simuliert: false } : (sim ? { varianteId: sim.varianteId, simuliert: true } : null);
  const hinweise = [];
  const alt = (quellen.barcodes[pos.ean + 'ZW'] || [])[0];
  if (alt) hinweise.push('Alter ZW-Artikel ' + alt.id + ' (Barcode ' + pos.ean + 'ZW) wird ignoriert.');
  return Object.assign(basis, {
    artikel: true,
    originalVarianteId: pos.varianteId,
    ean: pos.ean,
    barcode,
    name: zwName(sw.name),
    variantennummer: zwVariantennummer(pos.modell || sw.name),
    preis: preis.preis,
    empfehlung: preis.preis,
    preisVomLager: false,
    streichpreis: preis.streichpreis,
    mindestpreis: sw.mindestpreis,
    einkaufspreis: sw.einkaufspreis,
    fall: preis.fall,
    abschlag: preis.abschlag,
    neu: !vorhanden,
    bestehendeVarianteId: vorhanden ? vorhanden.varianteId : null,
    bestehendSimuliert: vorhanden ? vorhanden.simuliert : false,
    regelWarnungen,
    warnungen: regelWarnungen.concat(preisWarnungen),
    nichtUebernehmen: sw.nichtUebernehmen || [],
    hinweise,
  });
}

// Das Lager darf den Preis ändern. Die berechnete Empfehlung bleibt zum Vergleich erhalten.
function preisGrenze(e) {
  const g = Number(e.preisAbweichungMax);
  return g > 0 ? g : PREIS_ABWEICHUNG_OHNE_GRUND;
}

// Mehr als die erlaubte Abweichung vom Vorschlag? Dann braucht der Preis eine Begründung.
function preisBrauchtGrund(preis, empfehlung, e) {
  return Math.abs(preis - empfehlung) > preisGrenze(e) + 0.001;
}

function preisSetzen(v, preis) {
  if (preis === null || preis === undefined) return v;
  v.preis = preis;
  v.preisVomLager = preis !== v.empfehlung;
  v.warnungen = v.regelWarnungen.concat(zwPreisWarnungen(preis, { einkaufspreis: v.einkaufspreis, streichpreis: v.streichpreis }));
  return v;
}

function entscheidungenLesen(body) {
  const liste = Array.isArray(body.entscheidungen) ? body.entscheidungen : [];
  if (!liste.length) abbrechen(400, 'Keine Positionen übergeben.');
  if (liste.length > 50) abbrechen(400, 'Zu viele Positionen auf einmal.');
  return liste.map((x) => ({
    positionId: String(x.positionId || ''),
    zustand: String(x.zustand || ''),
    grund: String(x.grund || '').replace(/\s+/g, ' ').trim().slice(0, ZW_GRUND_MAX),
    preis: x.preis,
    preisGrund: String(x.preisGrund || '').replace(/\s+/g, ' ').trim().slice(0, ZW_GRUND_MAX),
    bilder: bilderLesen(x.bilder, String(x.positionId || '')),
  }));
}

// Bilder kommen als Data-URL (data:image/jpeg;base64,…). Sie gehen nur als Anhang in die Mails
// und werden nicht im Speicher des Workflows abgelegt.
function bilderLesen(liste, positionId) {
  if (liste === undefined || liste === null) return [];
  if (!Array.isArray(liste)) abbrechen(400, 'Position ' + positionId + ': Bilder ungültig.');
  if (liste.length > BILDER_MAX) abbrechen(400, 'Position ' + positionId + ': höchstens ' + BILDER_MAX + ' Bilder.');
  return liste.map((b, i) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String((b && b.daten) || ''));
    if (!m) abbrechen(400, 'Position ' + positionId + ': Bild ' + (i + 1) + ' ist kein JPEG, PNG oder WebP.');
    if (m[2].length > BILD_MAX_ZEICHEN) abbrechen(400, 'Position ' + positionId + ': Bild ' + (i + 1) + ' ist zu groß.');
    const name = String((b && b.name) || '').replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'bild';
    return { name: 'retoure-pos' + positionId + '-' + (i + 1) + '-' + name + '.' + BILD_TYPEN[m[1]], mimeType: m[1], daten: m[2] };
  });
}

function bilderZeile(anzahl) {
  return anzahl ? anzahl + (anzahl === 1 ? ' Bild' : ' Bilder') + ' im Anhang der Mail' : 'keine';
}

function vorschauListe(speicher, body, e, quellen) {
  return entscheidungenLesen(body).map((x) => vorschauPosition(speicher, x.positionId, x.zustand, e, quellen));
}

// ---------- Anlegen (Probelauf: nichts wird geschrieben) ----------

function anlegen(speicher, body, e, person, jetzt, url, quellen) {
  const freigabeAn = String(e.freigabeAn || '').trim();
  if (!freigabeAn) abbrechen(500, 'Einstellungen: freigabeAn (E-Mail für die Freigabe) fehlt.');
  const g = geheimnis(e);
  const basisUrl = String(e.seitenAdresse || '').trim().replace(/\/+$/, '') ||
    String(url || '').split('?')[0].replace(/\/anlegen\/?$/, '');
  const bueroAn = String(e.bueroAn || '').trim() || freigabeAn;
  const ergebnisse = [];
  const mails = [];
  const liste = entscheidungenLesen(body);

  // Erst alles prüfen, dann ändern: fehlt ein Grund oder ist ein Preis ungültig, wird nichts angelegt.
  for (const x of liste) {
    const bisher = positionsStatus(speicher, x.positionId);
    if (bisher.status === 'wartet' || ERLEDIGT.includes(bisher.status)) continue;
    if (grundPflicht(x.zustand) && !x.grund) abbrechen(400, 'Bitte bei „' + x.zustand + '“ einen Grund angeben (Position ' + x.positionId + ').');
    try {
      x.lagerPreis = istZwZustand(x.zustand) ? lagerPreisLesen(x.preis) : null;
    } catch (err) {
      abbrechen(400, 'Position ' + x.positionId + ': ' + err.message);
    }
    if (x.lagerPreis !== null && !x.preisGrund) {
      const v = vorschauPosition(speicher, x.positionId, x.zustand, e, quellen);
      if (v.artikel && !v.fehler && preisBrauchtGrund(x.lagerPreis, v.empfehlung, e)) {
        abbrechen(400, 'Position ' + x.positionId + ': Der Preis weicht mehr als ' + preisGrenze(e) + ' € von der Empfehlung ' + euro(v.empfehlung) + ' ab. Bitte begründen.');
      }
    }
  }

  for (const x of liste) {
    const bisher = positionsStatus(speicher, x.positionId);
    if (bisher.status === 'wartet' || ERLEDIGT.includes(bisher.status)) {
      ergebnisse.push(Object.assign({ positionId: x.positionId, hinweis: 'Schon entschieden, nichts geändert.' }, bisher));
      continue;
    }
    const v = vorschauPosition(speicher, x.positionId, x.zustand, e, quellen);
    const pos = speicher.cache.positionen[x.positionId];
    const gemeinsam = { zustand: x.zustand, grund: x.grund, bilder: x.bilder.length, von: person.benutzer, retoureId: pos ? pos.retoureId : null, aktualisiert: new Date(jetzt).toISOString() };

    if (v.fehler) {
      if (!pos) { ergebnisse.push({ positionId: x.positionId, status: 'fehler', meldung: v.fehler }); continue; }
      const st = Object.assign({ status: 'fehler', meldung: v.fehler, versuch: (bisher.versuch || 0) }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      kommentarSim(speicher, pos.retoureId, gemeinsam.aktualisiert, 'ZW-Fehler (' + x.positionId + '): ' + v.fehler);
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'anlegen', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, ergebnis: 'fehler', meldung: v.fehler });
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    if (!v.artikel) {
      const status = x.zustand === 'Kein ZW' ? 'kein_zw' : 'nicht_verkaufbar';
      const kommentar = zwKommentar({ zustand: x.zustand, grund: x.grund });
      const st = Object.assign({ status, meldung: kommentar }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      kommentarSim(speicher, pos.retoureId, gemeinsam.aktualisiert, kommentar + ' (' + x.positionId + ')');
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'entscheidung', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, ergebnis: status, meldung: x.grund || undefined });
      retoureAbschliessenWennFertig(speicher, pos.retoureId, jetzt, e);
      if (status === 'nicht_verkaufbar') mails.push(Object.assign(bueroMail(speicher, pos, x, person, e, bueroAn), { anhaenge: x.bilder }));
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    v.grund = x.grund;
    v.bilder = x.bilder.length;
    preisSetzen(v, x.lagerPreis);
    v.preisGrund = v.preisVomLager ? x.preisGrund : '';
    const versuch = (bisher.versuch || 0) + 1;
    schreibplanMerken(speicher, x.positionId, versuch, zwSchreibplan(v, {
      plenty: (quellen.originale || {})[v.originalVarianteId] || null,
      shopware: quellen.shopware[v.originalVarianteId] || null,
      shopwareZw: v.bestehendeVarianteId ? quellen.shopware[v.bestehendeVarianteId] || null : null,
    }, jetzt));
    const st = Object.assign({ status: 'wartet', versuch, vorschau: v }, gemeinsam);
    speicher.positionen[x.positionId] = st;
    protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'freigabe-angefragt', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, preis: v.preis, ergebnis: 'wartet' });
    mails.push(Object.assign(freigabeMail(speicher, v, person, versuch, basisUrl, g, e, freigabeAn), { anhaenge: x.bilder }));
    ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
  }
  const antwort = json(200, { ok: true, ergebnisse });
  antwort.mails = mails;
  return antwort;
}

function freigabeSignatur(g, positionId, versuch) {
  return signatur(g, 'freigabe|' + positionId + '|' + versuch);
}

function retoureText(speicher, retoureId) {
  const r = speicher.cache.retouren[retoureId];
  return String(retoureId) + (r && r.shopAuftrag ? ' · ' + r.shopAuftrag : '');
}

function freigabeMail(speicher, v, person, versuch, basisUrl, g, e, an) {
  const link = basisUrl + '/freigabe?p=' + encodeURIComponent(v.positionId) + '&n=' + versuch + '&s=' + freigabeSignatur(g, v.positionId, versuch);
  return {
    positionId: v.positionId,
    an,
    von: String(e.absender || an),
    betreff: 'ZW-Freigabe: ' + v.name + ' · ' + v.zustand + ' · Retoure ' + v.retoureId,
    html: '<p>' + esc(person.name) + ' möchte einen ZW-Artikel anlegen. <b>Probelauf:</b> Daten sind echt, angelegt wird aber noch nichts in plenty oder Shopware.</p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + vorschauZeilen(speicher, v) + '</table>' +
      (v.warnungen.length ? '<p style="color:#9a5a00"><b>Warnung:</b> ' + v.warnungen.map(esc).join('<br>') + '</p>' : '') +
      '<p><b>Trockenlauf:</b> Die Schreibbefehle für plenty und Shopware stehen auf der Freigabe-Seite. Gesendet wird nichts.</p>' +
      '<p><a href="' + esc(link) + '" style="display:inline-block;background:#1f5f8b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Freigeben oder ablehnen</a></p>' +
      '<p style="color:#5b6b78;font-size:13px">Der Link öffnet eine Seite mit den Knöpfen Freigeben und Ablehnen. Erst der Klick dort zählt.</p>',
  };
}

// Info ans Büro bei „Nicht verkaufbar“. Keine Freigabe nötig.
function bueroMail(speicher, pos, x, person, e, an) {
  const z = [
    ['Retoure', retoureText(speicher, pos.retoureId)],
    ['Artikel', pos.name],
    ['Original', 'Variante ' + pos.varianteId + (pos.ean ? ' · EAN ' + pos.ean : '')],
    ['Entscheidung', 'Nicht verkaufbar'],
    ['Grund', x.grund],
    ['Bilder', bilderZeile(x.bilder.length)],
    ['Gemeldet von', person.name],
  ];
  return {
    positionId: x.positionId,
    art: 'info',
    an,
    von: String(e.absender || an),
    betreff: 'ZW: Nicht verkaufbar · ' + pos.name + ' · Retoure ' + pos.retoureId,
    html: '<p>Das Lager hat einen Artikel als <b>nicht verkaufbar</b> gemeldet. Bitte weiter bearbeiten.</p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + z.map((r) => '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</table>' +
      '<p>Sind alle Positionen der Retoure entschieden, geht sie auf Status ' + esc(String(e.statusNichtVerkaufbar || '9.1.3')) + ' (Reklamieren). <b>Probelauf:</b> In plenty wird noch nichts geändert.</p>',
  };
}

function vorschauZeilen(speicher, v) {
  const z = [
    ['Retoure', retoureText(speicher, v.retoureId)],
    ['Artikel', v.name],
    ['Original', 'Variante ' + v.originalVarianteId + ' · EAN ' + v.ean],
    ['Zustand', v.zustand],
    ['Grund', v.grund || '–'],
    ['Bilder', bilderZeile(v.bilder || 0)],
    ['Barcode', v.barcode],
    ['Preis', euro(v.preis) + (v.preisVomLager ? ' (vom Lager geändert, Empfehlung ' + euro(v.empfehlung) + ')' : ' (Empfehlung)') + ', Streichpreis ' + euro(v.streichpreis)],
    ...(v.preisGrund ? [['Begründung Preis', v.preisGrund]] : []),
    ['Preisregel', v.fall === 'normal' ? 'Mindestpreis ' + euro(v.mindestpreis) + ' − ' + v.abschlag + ' %' : (v.fall === 'a' ? 'Mindestpreis erreicht' : 'Mindestpreis leer') + ': jetziger Preis − ' + v.abschlag + ' %'],
    ['Ergebnis', v.neu ? 'Neuer ZW-Artikel' : 'Bestand +1 auf ' + v.bestehendeVarianteId + (v.bestehendSimuliert ? ' (Probelauf)' : '')],
  ];
  if ((v.nichtUebernehmen || []).length) z.push(['Nicht übernehmen', v.nichtUebernehmen.join(', ')]);
  return z.map((r) => '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('');
}

// ---------- Freigabe ----------

function freigabePruefen(werte, e, speicher) {
  const positionId = String(werte.p || '');
  const versuch = parseInt(werte.n, 10);
  const st = speicher.positionen[positionId];
  if (!positionId || !versuch || !gleich(freigabeSignatur(geheimnis(e), positionId, versuch), String(werte.s || ''))) {
    return { fehler: html(403, 'Ungültiger Link', '<h1>Ungültiger Link</h1><p>Dieser Freigabe-Link ist ungültig.</p>') };
  }
  if (!st || st.versuch !== versuch || st.status !== 'wartet') {
    const text = st && st.versuch === versuch ? 'Status: ' + statusText(st.status) : 'Dieser Link ist veraltet.';
    return { fehler: html(200, 'Schon entschieden', '<h1>Schon entschieden</h1><p>' + esc(text) + '</p>') };
  }
  return { positionId, versuch, st };
}

function statusText(s) {
  return ({ wartet: 'Wartet auf Freigabe', angelegt: 'Angelegt', plus1: 'Bestand +1', abgelehnt: 'Abgelehnt', fehler: 'Fehler', nicht_verkaufbar: 'Nicht verkaufbar', kein_zw: 'Kein ZW' })[s] || s;
}

function freigabeSeite(q, e, speicher) {
  const f = freigabePruefen(q, e, speicher);
  if (f.fehler) return f.fehler;
  const v = f.st.vorschau;
  return html(200, 'ZW-Freigabe', '<h1>ZW-Freigabe</h1><p>Angefragt von <b>' + esc(f.st.von) + '</b>. Probelauf: Daten sind echt, angelegt wird noch nichts.</p>' +
    '<table>' + vorschauZeilen(speicher, v) + '</table>' +
    v.warnungen.map((w) => '<div class="w">' + esc(w) + '</div>').join('') +
    '<form method="post" action="freigabe-entscheiden">' +
    '<input type="hidden" name="p" value="' + esc(f.positionId) + '"><input type="hidden" name="n" value="' + f.versuch + '">' +
    '<input type="hidden" name="s" value="' + esc(q.s) + '">' +
    '<button class="ja" name="entscheidung" value="freigeben">Freigeben</button>' +
    '<button class="nein" name="entscheidung" value="ablehnen">Ablehnen</button></form>' +
    schreibplanHtml(schreibplan(speicher, f.positionId, f.versuch), retoureBefehle(v.retoureId,
      zwKommentar({ zustand: v.zustand, varianteId: v.neu ? NEU_VARIANTE : v.bestehendeVarianteId, plus1: !v.neu, grund: v.grund }),
      statusWennFertig(speicher, v.retoureId, f.positionId, e))));
}

// ---------- Trockenlauf: Schreibpläne ----------

function schreibplanMerken(speicher, positionId, versuch, plan) {
  if (!speicher.schreibplaene) speicher.schreibplaene = {};
  const sp = speicher.schreibplaene;
  delete sp[positionId];
  sp[positionId] = Object.assign({ versuch }, plan);
  const schluessel = Object.keys(sp);
  for (const k of schluessel.slice(0, Math.max(0, schluessel.length - MAX_SCHREIBPLAENE))) delete sp[k];
}

function schreibplan(speicher, positionId, versuch) {
  const p = (speicher.schreibplaene || {})[positionId];
  return p && p.versuch === versuch ? p : null;
}

// Status, auf den die Retoure ginge, wenn diese Position jetzt erledigt wird (sonst null)
function statusWennFertig(speicher, retoureId, positionId, e) {
  const r = speicher.cache.retouren[retoureId];
  if (!r || !r.positionIds.length) return null;
  const rest = r.positionIds.filter((p) => p !== positionId);
  if (!rest.every((p) => ERLEDIGT.includes(positionsStatus(speicher, p).status))) return null;
  const nichtVerkaufbar = rest.some((p) => positionsStatus(speicher, p).status === 'nicht_verkaufbar');
  return nichtVerkaufbar ? String(e.statusNichtVerkaufbar || '9.1.3') : String(e.statusFertig || '9.3');
}

function freigabeEntscheiden(body, e, speicher, jetzt) {
  const f = freigabePruefen(body, e, speicher);
  if (f.fehler) return f.fehler;
  const zeit = new Date(jetzt).toISOString();
  const v = f.st.vorschau;
  const retoureId = v.retoureId;
  const von = 'Freigabe-Mail (' + String(e.freigabeAn || '') + ')';

  if (body.entscheidung === 'ablehnen') {
    speicher.positionen[f.positionId] = Object.assign({}, f.st, { status: 'abgelehnt', meldung: 'Abgelehnt, nichts angelegt', aktualisiert: zeit });
    kommentarSim(speicher, retoureId, zeit, 'ZW abgelehnt: ' + v.zustand + ' (' + f.positionId + '), nichts angelegt');
    protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId, positionId: f.positionId, zustand: v.zustand, ergebnis: 'abgelehnt' });
    return html(200, 'Abgelehnt', '<h1>Abgelehnt</h1><p>Es wurde nichts angelegt. Das Lager sieht den Status auf der ZW-Station.</p>');
  }
  if (body.entscheidung !== 'freigeben') return html(400, 'Unklar', '<h1>Keine Entscheidung erkannt</h1>');

  // Probelauf: plenty-Kopie und Shopware-Klon werden nur nachgestellt (IDs mit „SIM-“).
  const sim = speicher.sim;
  const echtVorhanden = v.bestehendeVarianteId && !v.bestehendSimuliert;
  let zw = sim.zwArtikel[v.barcode];
  let plus1;
  let varianteId;
  if (echtVorhanden) {
    plus1 = true;
    varianteId = v.bestehendeVarianteId;
  } else if (zw) {
    plus1 = true;
    zw.bestand += 1;
    varianteId = zw.varianteId;
  } else {
    plus1 = false;
    zw = { varianteId: 'SIM-' + (sim.naechsteNr++), originalVarianteId: v.originalVarianteId, zustand: v.zustand, bestand: 1, preis: v.preis };
    sim.zwArtikel[v.barcode] = zw;
    varianteId = zw.varianteId;
  }
  const kommentar = zwKommentar({ zustand: v.zustand, varianteId, plus1, grund: v.grund });
  const neuerStatus = statusWennFertig(speicher, retoureId, f.positionId, e);
  kommentarSim(speicher, retoureId, zeit, kommentar);
  speicher.zwListe.push({
    id: 'Z' + (sim.naechsteZeile++), datum: zeit.slice(0, 10), retoureId, originalVarianteId: v.originalVarianteId,
    zwVarianteId: varianteId, barcode: v.barcode, name: v.name, zustand: v.zustand, grund: v.grund || '', bilder: v.bilder || 0,
    preis: v.preis, empfehlung: v.empfehlung, preisVomLager: !!v.preisVomLager, preisGrund: v.preisGrund || '', streichpreis: v.streichpreis,
    neuOderPlus1: plus1 ? '+1' : 'neu', freigegebenVon: von, probelauf: true, bestandGebucht: false, gebuchtVon: null, gebuchtAm: null,
  });
  speicher.positionen[f.positionId] = Object.assign({}, f.st, {
    status: plus1 ? 'plus1' : 'angelegt', varianteId, barcode: v.barcode, preis: v.preis, meldung: kommentar, aktualisiert: zeit,
  });
  protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId, positionId: f.positionId, zustand: v.zustand, ergebnis: plus1 ? 'plus1' : 'angelegt', varianteId, preis: v.preis });
  retoureAbschliessenWennFertig(speicher, retoureId, jetzt, e);
  return html(200, 'Freigegeben', '<h1>Freigegeben</h1><p>' + esc(kommentar) + '</p><p>Probelauf: nachgestellt, nichts in plenty oder Shopware geändert.</p>' +
    schreibplanHtml(schreibplan(speicher, f.positionId, f.versuch), retoureBefehle(retoureId, kommentar, neuerStatus)));
}

function retoureAbschliessenWennFertig(speicher, retoureId, jetzt, e) {
  const r = speicher.cache.retouren[retoureId];
  if (!r || !r.positionIds.length) return;
  const fertig = r.positionIds.every((p) => ERLEDIGT.includes(positionsStatus(speicher, p).status));
  if (fertig && !speicher.retourenFertig[retoureId]) {
    // Ist eine Position nicht verkaufbar, geht die Retoure auf 9.1.3 (Reklamieren), sonst auf 9.3.
    const nichtVerkaufbar = r.positionIds.some((p) => positionsStatus(speicher, p).status === 'nicht_verkaufbar');
    const status = nichtVerkaufbar ? String(e.statusNichtVerkaufbar || '9.1.3') : String(e.statusFertig || '9.3');
    speicher.retourenFertig[retoureId] = { zeit: new Date(jetzt).toISOString(), status };
    kommentarSim(speicher, retoureId, new Date(jetzt).toISOString(), 'Alle Positionen entschieden, Status ' + status +
      (nichtVerkaufbar ? ' (Reklamieren, weil nicht verkaufbar)' : '') + ' (Probelauf: nicht gesetzt)');
    protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'status', retoureId, ergebnis: status + ' (Probelauf)' });
  }
}

// ---------- ZW-Liste ----------

function zwListeBuchen(speicher, body, person, jetzt) {
  const zeile = speicher.zwListe.find((z) => z.id === String(body.id || ''));
  if (!zeile) abbrechen(404, 'Zeile nicht gefunden.');
  const gebucht = body.gebucht !== false;
  zeile.bestandGebucht = gebucht;
  zeile.gebuchtVon = gebucht ? person.benutzer : null;
  zeile.gebuchtAm = gebucht ? new Date(jetzt).toISOString() : null;
  protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'bestand-gebucht', retoureId: zeile.retoureId, ergebnis: gebucht ? 'gebucht' : 'zurückgenommen', varianteId: zeile.zwVarianteId });
  return json(200, { ok: true, zeile });
}

// ---------- Mailversand ----------

// Nach dem Mailversand (Baustein „Mailergebnis“): Fehlgeschlagene Mails vermerken und die Antwort an die Seite anpassen.
// „gesendet“ ist die Ausgabe von „Freigabe-Mail senden“, in derselben Reihenfolge wie „mails“.
function zwNachMailversand(antwort, gesendet, speicher, jetzt) {
  const mails = antwort.mails || [];
  const inhalt = JSON.parse(antwort.body);
  mails.forEach((m, i) => {
    const r = gesendet[i];
    const fehler = !r ? 'keine Rückmeldung vom Mailversand' : (r.error ? (r.error.message || r.error) : null);
    if (!fehler) return;
    const eintrag = (inhalt.ergebnisse || []).find((x) => x.positionId === m.positionId);
    if (m.art === 'info') {
      // Info-Mail ans Büro: Die Entscheidung bleibt gültig, nur der Hinweis kommt nicht an.
      protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'buero-mail', positionId: m.positionId, ergebnis: 'fehler', meldung: String(fehler).slice(0, 300) });
      if (eintrag) eintrag.hinweis = 'Info-Mail ans Büro nicht gesendet. Bitte das Büro selbst informieren.';
      return;
    }
    zwMailfehler(speicher, m.positionId, String(fehler).slice(0, 300), jetzt);
    if (eintrag) Object.assign(eintrag, speicher.positionen[m.positionId]);
  });
  return { status: antwort.status, contentType: antwort.contentType, body: JSON.stringify(inhalt) };
}

// Mail konnte nicht gesendet werden: Position auf Fehler setzen.
function zwMailfehler(speicher, positionId, meldung, jetzt) {
  const st = speicher.positionen && speicher.positionen[positionId];
  if (!st || st.status !== 'wartet') return;
  const zeit = new Date(jetzt).toISOString();
  speicher.positionen[positionId] = Object.assign({}, st, { status: 'fehler', meldung: 'Freigabe-Mail nicht gesendet: ' + meldung, aktualisiert: zeit });
  if (st.retoureId) kommentarSim(speicher, st.retoureId, zeit, 'ZW-Fehler (' + positionId + '): Freigabe-Mail nicht gesendet');
  protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'freigabe-mail', positionId, ergebnis: 'fehler', meldung });
}

// NUR-NODE-ANFANG
module.exports = { zwVerarbeiten, zwVorbereiten, zwRundeB, zwRoute, zwMailfehler, zwNachMailversand };
// NUR-NODE-ENDE
