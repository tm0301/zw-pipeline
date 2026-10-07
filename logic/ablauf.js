// Ablauf der ZW-Station im Probelauf: verteilt jede Anfrage an die passende Aktion.
// plenty und Shopware werden hier noch mit Beispieldaten nachgestellt („sim“).
// Der Zustand (Protokoll, offene Freigaben, ZW-Liste) liegt im Speicher des Workflows.
// Beim Bauen des n8n-Workflows wird alles zwischen NUR-NODE-ANFANG und NUR-NODE-ENDE entfernt.

// NUR-NODE-ANFANG
const {
  istZwZustand, istGueltigeEntscheidung, berechneZwPreis, zwBarcode, zwVariantennummer, zwName, zwKommentar, euro,
} = require('./zw-logik.js');
const { passwortPruefen, signatur, schluesselAusstellen, schluesselPruefen, gleich } = require('./anmeldung.js');
// NUR-NODE-ENDE

const ERLEDIGT = ['angelegt', 'plus1', 'nicht_verkaufbar', 'kein_zw'];
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MINUTEN = 15;

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
  speicherVorbereiten(speicher, k.beispieldaten);
  const e = Object.assign({}, k.einstellungen || {}, { geheimSchluessel: geheimSchluesselBestimmen(k.einstellungen || {}, speicher, k.zufall) });
  const pfad = String(anfrage.url || '').split('?')[0].replace(/\/+$/, '');
  const aktion = pfad.slice(pfad.lastIndexOf('/') + 1);
  const q = anfrage.query || {};
  const body = anfrage.body || {};

  switch (aktion) {
    case 'zw-station':
      return { status: 200, contentType: 'text/html; charset=utf-8', body: k.seiteHtml };

    case 'anmelden':
      return anmelden(body, e, speicher, k.jetzt);

    case 'freigabe':
      return freigabeSeite(q, e, speicher);

    case 'freigabe-entscheiden':
      return freigabeEntscheiden(body, e, speicher, k.jetzt);
  }

  // Alle weiteren Aktionen nur mit gültigem Schlüssel
  const person = angemeldetePerson(anfrage.headers || {}, e, k.jetzt);
  switch (aktion) {
    case 'retouren':
      return json(200, { ok: true, person, modus: 'probelauf', retouren: retourenListe(speicher, e) });
    case 'retoure':
      return json(200, { ok: true, retoure: retoureDetail(speicher, q.nr) });
    case 'vorschau':
      return json(200, { ok: true, vorschau: vorschauListe(speicher, body, e) });
    case 'anlegen':
      return anlegen(speicher, body, e, person, k.jetzt, anfrage.url);
    case 'zw-liste':
      return json(200, { ok: true, zwListe: speicher.zwListe.slice(-100).reverse(), protokoll: speicher.protokoll.slice(-50).reverse() });
    case 'zuruecksetzen':
      if (person.rolle !== 'admin') return json(403, { ok: false, fehler: 'Nur für Admins.' });
      for (const s of Object.keys(speicher)) if (s !== 'fehlversuche' && s !== 'geheimnis') delete speicher[s];
      speicherVorbereiten(speicher, k.beispieldaten);
      return json(200, { ok: true });
  }
  return json(404, { ok: false, fehler: 'Unbekannte Aktion: ' + aktion });
}

// ---------- Hilfen ----------

function json(status, daten) {
  return { status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(daten) };
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
      '.k{max-width:560px;margin:0 auto;background:#fff;border:1px solid #d5dde3;border-radius:14px;padding:24px}' +
      'h1{font-size:1.3rem;margin:0 0 12px}table{border-collapse:collapse;width:100%;margin:12px 0}' +
      'td{padding:6px 8px;border-bottom:1px solid #d5dde3;vertical-align:top}td:first-child{color:#5b6b78;white-space:nowrap}' +
      '.w{background:#fdf0da;color:#9a5a00;padding:8px 12px;border-radius:8px;margin:8px 0}' +
      'form{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}button{font:600 1rem system-ui,sans-serif;padding:14px 22px;border-radius:10px;cursor:pointer}' +
      '.ja{background:#1d7a46;color:#fff;border:1px solid #1d7a46}.nein{background:#fff;color:#b3261e;border:1px solid #b3261e}' +
      '@media (prefers-color-scheme:dark){body{background:#0f161c;color:#e6edf2}.k{background:#172129;border-color:#2c3a45}td{border-color:#2c3a45}.nein{background:#172129}}' +
      '</style></head><body><div class="k">' + inhalt + '</div></body></html>',
  };
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function kopie(x) {
  return JSON.parse(JSON.stringify(x));
}

function speicherVorbereiten(speicher, beispieldaten) {
  if (!speicher.sim) {
    const b = kopie(beispieldaten);
    speicher.sim = {
      originale: b.originale,
      retouren: b.retouren.map((r) => Object.assign(r, { kommentare: [] })),
      zwArtikel: b.zwArtikel,
      alteZwArtikel: b.alteZwArtikel,
      naechsteVarianteId: b.naechsteVarianteId,
      naechsteArtikelId: b.naechsteArtikelId || 9729001,
    };
  }
  if (!speicher.positionen) speicher.positionen = {};
  if (!speicher.protokoll) speicher.protokoll = [];
  if (!speicher.zwListe) speicher.zwListe = [];
  if (!speicher.fehlversuche) speicher.fehlversuche = {};
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
  const daten = schluesselPruefen(geheimnis(e), schluessel, jetzt);
  if (!daten) abbrechen(401, 'Bitte neu anmelden.');
  // Gesperrte oder entfernte Personen verlieren den Zugriff sofort
  const person = benutzerListe(e).find((b) => String(b.benutzer || '').toLowerCase() === daten.benutzer);
  if (!person || person.gesperrt) abbrechen(401, 'Zugang gesperrt. Bitte an Tobias wenden.');
  return { benutzer: daten.benutzer, name: person.name || daten.benutzer, rolle: person.rolle || 'lager' };
}

// ---------- Retouren ----------

function positionsStatus(speicher, positionId) {
  return speicher.positionen[positionId] || { status: 'offen' };
}

function retourenListe(speicher, e) {
  const offen = String(e.statusOffen || '9.1.1');
  return speicher.sim.retouren
    .filter((r) => r.status === offen)
    .map((r) => {
      const st = r.positionen.map((p) => positionsStatus(speicher, p.positionId).status);
      return {
        id: r.id, datum: r.datum, kunde: r.kunde, anzahl: r.positionen.length,
        erledigt: st.filter((s) => ERLEDIGT.includes(s)).length,
        wartet: st.filter((s) => s === 'wartet').length,
        fehler: st.filter((s) => s === 'fehler').length,
      };
    });
}

function retoureFinden(speicher, nr) {
  const id = String(nr || '').trim().replace(/^R-?/i, '');
  const r = speicher.sim.retouren.find((x) => x.id === id);
  if (!r) abbrechen(404, 'Retoure „' + (nr || '') + '“ nicht gefunden.');
  return r;
}

function retoureDetail(speicher, nr) {
  const r = retoureFinden(speicher, nr);
  return {
    id: r.id, auftragId: r.auftragId, datum: r.datum, kunde: r.kunde, status: r.status,
    kommentare: r.kommentare,
    positionen: r.positionen.map((p) => {
      const o = speicher.sim.originale[p.varianteId] || {};
      return Object.assign({
        positionId: p.positionId, varianteId: p.varianteId, ean: o.ean, modell: o.modell,
        name: o.namePlenty || ('Variante ' + p.varianteId), lagerKommentar: p.lagerKommentar, bild: null,
      }, positionsStatus(speicher, p.positionId));
    }),
  };
}

function positionFinden(speicher, positionId) {
  for (const r of speicher.sim.retouren) {
    const p = r.positionen.find((x) => x.positionId === positionId);
    if (p) return { retoure: r, position: p };
  }
  return null;
}

// ---------- Vorschau ----------

function vorschauPosition(speicher, positionId, zustand, e) {
  const fund = positionFinden(speicher, positionId);
  if (!fund) return { positionId, zustand, fehler: 'Position nicht gefunden.' };
  if (!istGueltigeEntscheidung(zustand)) return { positionId, zustand, fehler: 'Unbekannter Zustand.' };
  const basis = { positionId, retoureId: fund.retoure.id, zustand };
  if (!istZwZustand(zustand)) {
    return Object.assign(basis, { artikel: false, kommentar: zwKommentar({ zustand }) });
  }
  const o = speicher.sim.originale[fund.position.varianteId];
  if (!o) return Object.assign(basis, { fehler: 'Original ' + fund.position.varianteId + ' nicht in plenty gefunden.' });
  if (!o.shopware) return Object.assign(basis, { fehler: 'Original ' + o.varianteId + ' nicht in Shopware gefunden. Bitte ans Büro geben.' });

  let barcode, preis;
  try {
    barcode = zwBarcode(o.ean, zustand);
    preis = berechneZwPreis({
      jetzigerPreis: o.shopware.preis, mindestpreis: o.shopware.mindestpreis, zustand, einkaufspreis: o.shopware.einkaufspreis,
    }, e);
  } catch (err) {
    return Object.assign(basis, { fehler: err.message });
  }
  const vorhanden = speicher.sim.zwArtikel[barcode];
  const hinweise = [];
  const alt = speicher.sim.alteZwArtikel && speicher.sim.alteZwArtikel[o.ean + 'ZW'];
  if (alt) hinweise.push('Alter ZW-Artikel ' + alt.varianteId + ' (Barcode ' + o.ean + 'ZW) wird ignoriert.');
  return Object.assign(basis, {
    artikel: true,
    originalVarianteId: o.varianteId,
    barcode,
    name: zwName(o.shopware.name),
    variantennummer: zwVariantennummer(o.modell),
    preis: preis.preis,
    streichpreis: preis.streichpreis,
    fall: preis.fall,
    abschlag: preis.abschlag,
    neu: !vorhanden,
    bestehendeVarianteId: vorhanden ? vorhanden.varianteId : null,
    warnungen: preis.warnungen,
    hinweise,
  });
}

function entscheidungenLesen(body) {
  const liste = Array.isArray(body.entscheidungen) ? body.entscheidungen : [];
  if (!liste.length) abbrechen(400, 'Keine Positionen übergeben.');
  if (liste.length > 50) abbrechen(400, 'Zu viele Positionen auf einmal.');
  return liste.map((x) => ({ positionId: String(x.positionId || ''), zustand: String(x.zustand || '') }));
}

function vorschauListe(speicher, body, e) {
  return entscheidungenLesen(body).map((x) => vorschauPosition(speicher, x.positionId, x.zustand, e));
}

// ---------- Anlegen ----------

function anlegen(speicher, body, e, person, jetzt, url) {
  const freigabeAn = String(e.freigabeAn || '').trim();
  if (!freigabeAn) abbrechen(500, 'Einstellungen: freigabeAn (E-Mail für die Freigabe) fehlt.');
  const g = geheimnis(e);
  const basisUrl = String(e.seitenAdresse || '').trim().replace(/\/+$/, '') ||
    String(url || '').split('?')[0].replace(/\/anlegen\/?$/, '');
  const ergebnisse = [];
  const mails = [];

  for (const x of entscheidungenLesen(body)) {
    const bisher = positionsStatus(speicher, x.positionId);
    if (bisher.status === 'wartet' || ERLEDIGT.includes(bisher.status)) {
      ergebnisse.push(Object.assign({ positionId: x.positionId, hinweis: 'Schon entschieden, nichts geändert.' }, bisher));
      continue;
    }
    const v = vorschauPosition(speicher, x.positionId, x.zustand, e);
    const fund = positionFinden(speicher, x.positionId);
    const gemeinsam = { zustand: x.zustand, von: person.benutzer, aktualisiert: new Date(jetzt).toISOString() };

    if (v.fehler) {
      if (!fund) { ergebnisse.push({ positionId: x.positionId, status: 'fehler', meldung: v.fehler }); continue; }
      const st = Object.assign({ status: 'fehler', meldung: v.fehler, versuch: (bisher.versuch || 0) }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      fund.retoure.kommentare.push({ zeit: gemeinsam.aktualisiert, text: 'ZW-Fehler (' + x.positionId + '): ' + v.fehler });
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'anlegen', retoureId: fund.retoure.id, positionId: x.positionId, zustand: x.zustand, ergebnis: 'fehler', meldung: v.fehler });
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    if (!v.artikel) {
      const status = x.zustand === 'Kein ZW' ? 'kein_zw' : 'nicht_verkaufbar';
      const st = Object.assign({ status, meldung: v.kommentar }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      fund.retoure.kommentare.push({ zeit: gemeinsam.aktualisiert, text: v.kommentar + ' (' + x.positionId + ')' });
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'entscheidung', retoureId: fund.retoure.id, positionId: x.positionId, zustand: x.zustand, ergebnis: status });
      retoureAbschliessenWennFertig(speicher, fund.retoure, jetzt, e);
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    const versuch = (bisher.versuch || 0) + 1;
    const st = Object.assign({ status: 'wartet', versuch, vorschau: v }, gemeinsam);
    speicher.positionen[x.positionId] = st;
    protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'freigabe-angefragt', retoureId: fund.retoure.id, positionId: x.positionId, zustand: x.zustand, preis: v.preis, ergebnis: 'wartet' });
    mails.push(freigabeMail(v, fund, person, versuch, basisUrl, g, e, freigabeAn));
    ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
  }
  const antwort = json(200, { ok: true, ergebnisse });
  antwort.mails = mails;
  return antwort;
}

function freigabeSignatur(g, positionId, versuch) {
  return signatur(g, 'freigabe|' + positionId + '|' + versuch);
}

function freigabeMail(v, fund, person, versuch, basisUrl, g, e, an) {
  const o = { positionId: v.positionId, versuch, s: freigabeSignatur(g, v.positionId, versuch) };
  const link = basisUrl + '/freigabe?p=' + encodeURIComponent(o.positionId) + '&n=' + versuch + '&s=' + o.s;
  const zeilen = vorschauZeilen(v, fund);
  return {
    positionId: v.positionId,
    an,
    von: String(e.absender || an),
    betreff: 'ZW-Freigabe: ' + v.name + ' · ' + v.zustand + ' · Retoure ' + fund.retoure.id,
    html: '<p>' + esc(person.name) + ' möchte einen ZW-Artikel anlegen (Probelauf, es wird nichts in plenty oder Shopware geändert).</p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + zeilen + '</table>' +
      (v.warnungen.length ? '<p style="color:#9a5a00"><b>Warnung:</b> ' + v.warnungen.map(esc).join('<br>') + '</p>' : '') +
      '<p><a href="' + esc(link) + '" style="display:inline-block;background:#1f5f8b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Freigeben oder ablehnen</a></p>' +
      '<p style="color:#5b6b78;font-size:13px">Der Link öffnet eine Seite mit den Knöpfen Freigeben und Ablehnen. Erst der Klick dort zählt.</p>',
  };
}

function vorschauZeilen(v, fund) {
  const z = [
    ['Retoure', fund.retoure.id + ' · ' + fund.retoure.kunde],
    ['Artikel', v.name],
    ['Zustand', v.zustand],
    ['Barcode', v.barcode],
    ['Preis', euro(v.preis) + ' (Streichpreis ' + euro(v.streichpreis) + ')'],
    ['Preisregel', v.fall === 'normal' ? 'Mindestpreis − ' + v.abschlag + ' %' : (v.fall === 'a' ? 'Mindestpreis erreicht' : 'Mindestpreis leer') + ': jetziger Preis − ' + v.abschlag + ' %'],
    ['Ergebnis', v.neu ? 'Neuer ZW-Artikel' : 'Bestand +1 auf ' + v.bestehendeVarianteId],
  ];
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
  return { positionId, versuch, st, fund: positionFinden(speicher, positionId) };
}

function statusText(s) {
  return ({ wartet: 'Wartet auf Freigabe', angelegt: 'Angelegt', plus1: 'Bestand +1', abgelehnt: 'Abgelehnt', fehler: 'Fehler', nicht_verkaufbar: 'Nicht verkaufbar', kein_zw: 'Kein ZW' })[s] || s;
}

function freigabeSeite(q, e, speicher) {
  const f = freigabePruefen(q, e, speicher);
  if (f.fehler) return f.fehler;
  const v = f.st.vorschau;
  return html(200, 'ZW-Freigabe', '<h1>ZW-Freigabe</h1><p>Angefragt von <b>' + esc(f.st.von) + '</b>. Probelauf: Es wird nichts in plenty oder Shopware geändert.</p>' +
    '<table>' + vorschauZeilen(v, f.fund) + '</table>' +
    v.warnungen.map((w) => '<div class="w">' + esc(w) + '</div>').join('') +
    '<form method="post" action="freigabe-entscheiden">' +
    '<input type="hidden" name="p" value="' + esc(f.positionId) + '"><input type="hidden" name="n" value="' + f.versuch + '">' +
    '<input type="hidden" name="s" value="' + esc(q.s) + '">' +
    '<button class="ja" name="entscheidung" value="freigeben">Freigeben</button>' +
    '<button class="nein" name="entscheidung" value="ablehnen">Ablehnen</button></form>');
}

function freigabeEntscheiden(body, e, speicher, jetzt) {
  const f = freigabePruefen(body, e, speicher);
  if (f.fehler) return f.fehler;
  const zeit = new Date(jetzt).toISOString();
  const v = f.st.vorschau;
  const retoure = f.fund.retoure;
  const von = 'Freigabe-Mail (' + String(e.freigabeAn || '') + ')';

  if (body.entscheidung === 'ablehnen') {
    speicher.positionen[f.positionId] = Object.assign({}, f.st, { status: 'abgelehnt', meldung: 'Abgelehnt, nichts angelegt', aktualisiert: zeit });
    retoure.kommentare.push({ zeit, text: 'ZW abgelehnt: ' + v.zustand + ' (' + f.positionId + '), nichts angelegt' });
    protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId: retoure.id, positionId: f.positionId, zustand: v.zustand, ergebnis: 'abgelehnt' });
    return html(200, 'Abgelehnt', '<h1>Abgelehnt</h1><p>Es wurde nichts angelegt. Das Lager sieht den Status auf der ZW-Station.</p>');
  }
  if (body.entscheidung !== 'freigeben') return html(400, 'Unklar', '<h1>Keine Entscheidung erkannt</h1>');

  // Probelauf: plenty-Kopie und Shopware-Klon werden nur nachgestellt.
  // Neu berechnen, falls sich seit der Anfrage etwas geändert hat (z. B. ZW-Artikel inzwischen angelegt).
  const aktuell = vorschauPosition(speicher, f.positionId, v.zustand, e);
  if (aktuell.fehler) {
    speicher.positionen[f.positionId] = Object.assign({}, f.st, { status: 'fehler', meldung: aktuell.fehler, aktualisiert: zeit });
    retoure.kommentare.push({ zeit, text: 'ZW-Fehler (' + f.positionId + '): ' + aktuell.fehler });
    protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId: retoure.id, positionId: f.positionId, zustand: v.zustand, ergebnis: 'fehler', meldung: aktuell.fehler });
    return html(200, 'Fehler', '<h1>Fehler</h1><p>' + esc(aktuell.fehler) + '</p>');
  }

  const sim = speicher.sim;
  let zw = sim.zwArtikel[aktuell.barcode];
  const plus1 = !!zw;
  if (zw) {
    zw.bestand += 1;
  } else {
    zw = {
      varianteId: String(sim.naechsteVarianteId++), artikelId: String(sim.naechsteArtikelId++),
      originalVarianteId: aktuell.originalVarianteId, zustand: v.zustand, bestand: 1,
      preis: aktuell.preis, streichpreis: aktuell.streichpreis, name: aktuell.name, variantennummer: aktuell.variantennummer,
    };
    sim.zwArtikel[aktuell.barcode] = zw;
  }
  const kommentar = zwKommentar({ zustand: v.zustand, varianteId: zw.varianteId, plus1 });
  retoure.kommentare.push({ zeit, text: kommentar });
  speicher.zwListe.push({
    datum: zeit.slice(0, 10), retoureId: retoure.id, originalVarianteId: aktuell.originalVarianteId,
    zwArtikelId: zw.artikelId || '', zwVarianteId: zw.varianteId, barcode: aktuell.barcode, name: aktuell.name,
    zustand: v.zustand, preis: plus1 ? zw.preis || aktuell.preis : aktuell.preis, streichpreis: aktuell.streichpreis,
    neuOderPlus1: plus1 ? '+1' : 'neu', freigegebenVon: von, bestandGebucht: false,
  });
  // Prüfung: im Probelauf werden die nachgestellten Daten gegeneinander geprüft.
  const pruefung = zw.varianteId && sim.zwArtikel[aktuell.barcode] === zw ? 'ok' : 'abweichung';
  speicher.positionen[f.positionId] = Object.assign({}, f.st, {
    status: plus1 ? 'plus1' : 'angelegt', varianteId: zw.varianteId, barcode: aktuell.barcode,
    preis: aktuell.preis, meldung: kommentar, pruefung, aktualisiert: zeit,
  });
  protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId: retoure.id, positionId: f.positionId, zustand: v.zustand, ergebnis: plus1 ? 'plus1' : 'angelegt', varianteId: zw.varianteId, preis: aktuell.preis });
  retoureAbschliessenWennFertig(speicher, retoure, jetzt, e);
  return html(200, 'Freigegeben', '<h1>Freigegeben</h1><p>' + esc(kommentar) + '</p><p>Probelauf: nachgestellt, nichts in plenty oder Shopware geändert.</p>');
}

function retoureAbschliessenWennFertig(speicher, retoure, jetzt, e) {
  const fertigStatus = String(e.statusFertig || '9.3');
  const fertig = retoure.positionen.every((p) => ERLEDIGT.includes(positionsStatus(speicher, p.positionId).status));
  if (fertig && retoure.status !== fertigStatus) {
    retoure.status = fertigStatus;
    retoure.kommentare.push({ zeit: new Date(jetzt).toISOString(), text: 'Alle Positionen entschieden, Status ' + fertigStatus });
    protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'status', retoureId: retoure.id, ergebnis: fertigStatus });
  }
}

// Nach dem Mailversand (Baustein „Mailergebnis“): Fehlgeschlagene Mails vermerken und die Antwort an die Seite anpassen.
// „gesendet“ ist die Ausgabe von „Freigabe-Mail senden“, in derselben Reihenfolge wie „mails“.
function zwNachMailversand(antwort, gesendet, speicher, jetzt) {
  const mails = antwort.mails || [];
  const daten = JSON.parse(antwort.body);
  mails.forEach((m, i) => {
    const r = gesendet[i];
    const fehler = !r ? 'keine Rückmeldung vom Mailversand' : (r.error ? (r.error.message || r.error) : null);
    if (!fehler) return;
    zwMailfehler(speicher, m.positionId, String(fehler).slice(0, 300), jetzt);
    const eintrag = (daten.ergebnisse || []).find((x) => x.positionId === m.positionId);
    if (eintrag) Object.assign(eintrag, speicher.positionen[m.positionId]);
  });
  return { status: antwort.status, contentType: antwort.contentType, body: JSON.stringify(daten) };
}

// Mail konnte nicht gesendet werden: Position auf Fehler setzen.
function zwMailfehler(speicher, positionId, meldung, jetzt) {
  const st = speicher.positionen && speicher.positionen[positionId];
  if (!st || st.status !== 'wartet') return;
  const zeit = new Date(jetzt).toISOString();
  speicher.positionen[positionId] = Object.assign({}, st, { status: 'fehler', meldung: 'Freigabe-Mail nicht gesendet: ' + meldung, aktualisiert: zeit });
  const fund = positionFinden(speicher, positionId);
  if (fund) fund.retoure.kommentare.push({ zeit, text: 'ZW-Fehler (' + positionId + '): Freigabe-Mail nicht gesendet' });
  protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'freigabe-mail', positionId, ergebnis: 'fehler', meldung });
}

// NUR-NODE-ANFANG
module.exports = { zwVerarbeiten, zwMailfehler, zwNachMailversand };
// NUR-NODE-ENDE
