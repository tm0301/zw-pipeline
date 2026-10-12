// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version 23311e168d
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// ---------- TMP-Tabelle: Schreibbefehle als Zeilen statt senden ----------
// Die IT ersetzt später den Baustein „TMP-Tabelle schreiben“ durch echte Schreib-Bausteine.
// Eine Zeile = ein Befehl. Zeilen eines Laufs (lauf) gehören zusammen und laufen in der Reihenfolge von nr.

// Platzhalter wie ‹neue Varianten-ID› in einem Befehl (Endpunkt und Inhalt)
function platzhalterIn(b) {
  const text = b.endpoint + ' ' + (b.body === undefined ? '' : (typeof b.body === 'string' ? b.body : JSON.stringify(b.body)));
  return [...new Set(text.match(/‹[^›]*›/g) || [])];
}

// datei (Bild vom Lager) wandert nicht in die Tabelle: „Schreibbefehle aufteilen“ macht daraus binary „datei“.
function tmpZeile(b, nr, lauf, zeit) {
  const zeile = {
    lauf, nr, zeit,
    aktion: b.aktion || '',
    retoureId: b.retoureId ? String(b.retoureId) : '',
    positionId: b.positionId ? String(b.positionId) : '',
    system: b.system,
    titel: b.titel,
    method: b.method || '',
    endpoint: b.endpoint || '',
    body: b.body === undefined ? '' : (typeof b.body === 'string' ? b.body : JSON.stringify(b.body, null, 2)),
    hinweis: b.hinweis || '',
    platzhalter: b.system === 'info' ? '' : platzhalterIn(b).join(', '),
    status: b.system === 'info' ? 'info' : 'offen',
  };
  if (b.datei) zeile.datei = b.datei;
  return zeile;
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function speicherVorbereiten(speicher) {
  if (!speicher.positionen) speicher.positionen = {};
  if (!speicher.fehlversuche) speicher.fehlversuche = {};
  if (!speicher.cache) speicher.cache = { positionen: {}, retouren: {}, reihenfolge: [] };
  if (!speicher.kommentare) speicher.kommentare = {};
  if (!speicher.retourenFertig) speicher.retourenFertig = {};
  if (!speicher.sim) speicher.sim = { naechsteNr: 1, zwArtikel: {} };
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

// ---------- Protokoll und ZW-Liste (Data Tables) ----------
// Neue Zeilen sammeln sich während einer Anfrage in speicher.ablageAusgang und hängen am Ende als „ablage“ an der Antwort.
// n8n schreibt sie in ZW_PROTOKOLL (neue Zeile) bzw. ZW_LISTE (neu oder ändern, Schlüssel zeileId).

const PROTOKOLL_SPALTEN = ['zeit', 'benutzer', 'aktion', 'retoureId', 'positionId', 'zustand', 'preis', 'varianteId', 'ergebnis', 'meldung'];

const ZAHL_SPALTEN = ['preis', 'empfehlung', 'streichpreis', 'bilder'];

const JA_NEIN_SPALTEN = ['preisVomLager', 'probelauf', 'bestandGebucht'];

// Eine Zeile mit genau den Spalten der Tabelle: Texte nie leer (''), Zahlen oder null, Ja/Nein als true/false
function tabellenZeile(spalten, x) {
  const z = {};
  for (const s of spalten) {
    const w = x[s];
    if (ZAHL_SPALTEN.includes(s)) z[s] = typeof w === 'number' && Number.isFinite(w) ? w : (w === null || w === undefined || w === '' || !Number.isFinite(Number(w)) ? null : Number(w));
    else if (JA_NEIN_SPALTEN.includes(s)) z[s] = w === true || w === 'true';
    else z[s] = w === null || w === undefined ? '' : String(w);
  }
  return z;
}

function ablageMerken(speicher, tabelle, zeile) {
  if (!speicher.ablageAusgang) speicher.ablageAusgang = { protokoll: [], zwListe: [] };
  speicher.ablageAusgang[tabelle].push(zeile);
}

function protokollieren(speicher, jetzt, eintrag) {
  ablageMerken(speicher, 'protokoll', tabellenZeile(PROTOKOLL_SPALTEN, Object.assign({ zeit: new Date(jetzt).toISOString() }, eintrag)));
}

// Schreibbefehle (TMP-Tabelle) und neue Zeilen für Protokoll und ZW-Liste an die Antwort hängen.
// Was schon an der Antwort hängt (aus einem früheren Baustein desselben Laufs), bleibt davor.
function ausgabeAnhaengen(antwort, speicher, jetzt) {
  const neu = (speicher && speicher.ausgang) || [];
  const ablage = (speicher && speicher.ablageAusgang) || { protokoll: [], zwListe: [] };
  if (speicher) { delete speicher.ausgang; delete speicher.ablageAusgang; }
  if (neu.length) {
    const bisher = antwort.schreiben || [];
    const lauf = bisher.length ? bisher[0].lauf : laufId(jetzt);
    const zeit = new Date(jetzt).toISOString();
    antwort.schreiben = bisher.concat(neu.map((b, i) => tmpZeile(b, bisher.length + i + 1, lauf, zeit)));
    // Neue Zeilen der ZW-Liste gehören zu diesem Lauf in ZW_TMP
    for (const z of ablage.zwListe) if (!z.lauf) z.lauf = lauf;
  }
  if (ablage.protokoll.length || ablage.zwListe.length || antwort.ablage) {
    const alt = antwort.ablage || { protokoll: [], zwListe: [] };
    // Ändert ein Aufruf dieselbe Zeile der ZW-Liste mehrmals, zählt die letzte Fassung
    const zwListe = alt.zwListe.concat(ablage.zwListe).filter((z, i, l) => !l.slice(i + 1).some((y) => y.zeileId === z.zeileId));
    antwort.ablage = { protokoll: alt.protokoll.concat(ablage.protokoll), zwListe };
  }
  return antwort;
}

// Kennung eines Laufs: Zeit plus Zufall, z. B. 20261007T100000-3fa9c1
function laufId(jetzt) {
  const z = zufallsHex();
  return new Date(jetzt).toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + (z ? z.slice(0, 6) : String(Math.random()).slice(2, 8));
}

// Nach „TMP-Tabelle schreiben“ (Baustein „TMP-Ergebnis“): Ergebnis ins Protokoll, Hinweis in die Antwort.
// ergebnisse ist die Ausgabe von „TMP-Tabelle schreiben“, eine Zeile pro Befehl.
function zwNachTmp(antwort, ergebnisse, speicher, jetzt) {
  speicherVorbereiten(speicher);
  const zeilen = antwort.schreiben || [];
  const lauf = zeilen.length ? zeilen[0].lauf : '';
  const fehlerItem = (ergebnisse || []).find((r) => r && r.error);
  let fehler = null;
  if (fehlerItem) fehler = String(fehlerItem.error.message || fehlerItem.error).slice(0, 300);
  else if ((ergebnisse || []).length < zeilen.length) fehler = 'nur ' + (ergebnisse || []).length + ' von ' + zeilen.length + ' Zeilen bestätigt';
  const ersteRetoure = (zeilen.find((z) => z.retoureId) || {}).retoureId;
  protokollieren(speicher, jetzt, {
    benutzer: 'automatisch', aktion: 'tmp-tabelle', retoureId: ersteRetoure || undefined,
    ergebnis: fehler ? 'fehler' : 'geschrieben', meldung: fehler || zeilen.length + ' Zeilen, Lauf ' + lauf,
  });
  const aus = { status: antwort.status, contentType: antwort.contentType, body: antwort.body, ablage: antwort.ablage };
  if (String(antwort.contentType || '').startsWith('text/html')) {
    const satz = fehler
      ? '<div class="w">TMP-Tabelle ZW_TMP: nicht geschrieben (' + esc(fehler) + ').</div>'
      : '<p class="m">' + zeilen.length + ' Schreibbefehle in die Tabelle ZW_TMP geschrieben (Lauf ' + esc(lauf) + ').</p>';
    aus.body = aus.body.includes('</div></body>') ? aus.body.replace('</div></body>', satz + '</div></body>') : aus.body + satz;
  } else {
    try {
      const inhalt = JSON.parse(aus.body);
      inhalt.tmp = { lauf, zeilen: zeilen.length, fehler };
      aus.body = JSON.stringify(inhalt);
    } catch (err) { /* Antwort unverändert lassen */ }
  }
  return ausgabeAnhaengen(aus, speicher, jetzt);
}

// Ergebnis von „TMP-Tabelle schreiben“ ins Protokoll, Hinweis in die Antwort. Danach antwortet „Antwort senden“.
const antwort = zwNachTmp(
  $('Schreibbefehle da?').first().json,
  $input.all().map((item) => item.json),
  $getWorkflowStaticData('global'),
  Date.now(),
);
return [{ json: antwort }];
