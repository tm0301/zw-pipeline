// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version 63361b5279
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Anmeldung: Passwort-Hash prüfen und zeitlich begrenzte Schlüssel (Tokens) ausstellen.
// Bewusst reines JavaScript (SHA-256, HMAC, PBKDF2), weil der n8n-Code-Baustein
// je nach Einstellung keine Node-Module wie „crypto“ laden darf.
// Gleiches Verfahren wie im Browser (Web Crypto PBKDF2-SHA-256), siehe tools/zugang-erzeugen.html.

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8(text) {
  const s = unescape(encodeURIComponent(String(text)));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function bytesZuHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  return s;
}

function sha256(daten) {
  const laenge = daten.length;
  const bloecke = Math.ceil((laenge + 9) / 64);
  const m = new Uint8Array(bloecke * 64);
  m.set(daten);
  m[laenge] = 0x80;
  const bits = laenge * 8;
  m[m.length - 4] = (bits >>> 24) & 0xff;
  m[m.length - 3] = (bits >>> 16) & 0xff;
  m[m.length - 2] = (bits >>> 8) & 0xff;
  m[m.length - 1] = bits & 0xff;
  m[m.length - 5] = Math.floor(bits / 0x100000000) & 0xff;

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);
  for (let b = 0; b < bloecke; b++) {
    for (let i = 0; i < 16; i++) {
      const j = b * 64 + i * 4;
      w[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (h[i] >>> 24) & 0xff; out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff; out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

// ---------- Antworten auslesen ----------

function plentyFehler(antworten) {
  const f = (antworten || []).find((a) => a && !Array.isArray(a) && a.error);
  return f ? String(f.error) : null;
}

function befehl(system, titel, method, endpoint, body, hinweis) {
  const b = { system, titel, method, endpoint };
  if (body !== undefined) b.body = body;
  if (hinweis) b.hinweis = hinweis;
  return b;
}

// Hochgeladene Bilder wieder löschen (abgelehnt, Mail nicht gesendet oder doch nur +1)
function bilderLoeschenBefehle(medien, grund) {
  return (medien || []).map((m, i) => befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager löschen', 'DELETE', '/api/media/' + m.mediaId, undefined,
    'Grund: ' + grund + '. Das Bild wurde beim Anlegen hochgeladen und wird nicht gebraucht.'));
}

// Befehle an die Retoure: Kommentar und Status
function kommentarBefehl(retoureId, text) {
  return befehl('plenty', 'Kommentar in Retoure ' + retoureId, 'POST', '/rest/comments',
    { referenceType: 'order', referenceValue: Number(retoureId), text, isVisibleForContact: false });
}

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

// ---------- Hilfen ----------

function json(status, inhalt) {
  return { status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(inhalt) };
}

function abbrechen(status, fehler) {
  const err = new Error(fehler);
  err.zwAntwort = json(status, { ok: false, fehler });
  throw err;
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

// Kommentar in der Retoure: im Probelauf nur im Speicher, dazu als Schreibbefehl für die TMP-Tabelle.
// extra: { aktion, positionId, echtText } – echtText ist der Text für plenty, falls er vom Probelauf-Text abweicht.
function kommentarSim(speicher, retoureId, zeit, text, extra) {
  if (!speicher.kommentare[retoureId]) speicher.kommentare[retoureId] = [];
  speicher.kommentare[retoureId].push({ zeit, text });
  const x = extra || {};
  ausgangMerken(speicher, { aktion: x.aktion, retoureId, positionId: x.positionId }, [kommentarBefehl(retoureId, x.echtText || text)]);
}

// ---------- Schreibbefehle für die TMP-Tabelle ----------
// Während einer Anfrage sammeln sich die Befehle in speicher.ausgang. Am Ende hängen sie als Zeilen an der Antwort
// und werden aus dem Speicher entfernt, sie bleiben also nie im Speicher des Workflows liegen.

function ausgangMerken(speicher, meta, befehle) {
  if (!speicher.ausgang) speicher.ausgang = [];
  for (const b of befehle) speicher.ausgang.push(Object.assign({}, b, meta));
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

// Shopware-Medien-IDs für die Bilder einer Position. Fest aus Position, Versuch und Zeit abgeleitet (32 Hex-Zeichen),
// so stehen sie schon in den Schreibbefehlen und brauchen keinen Platzhalter.
function bilderMedien(bilder, positionId, versuch, jetzt) {
  const id = (art, i) => bytesZuHex(sha256(utf8('zw-bild|' + art + '|' + positionId + '|' + versuch + '|' + i + '|' + jetzt))).slice(0, 32);
  return bilder.map((b, i) => ({ mediaId: id('medium', i), produktMediaId: id('produkt', i), name: b.name, mimeType: b.mimeType }));
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
  return ausgabeAnhaengen({ status: antwort.status, contentType: antwort.contentType, body: JSON.stringify(inhalt), schreiben: antwort.schreiben, ablage: antwort.ablage }, speicher, jetzt);
}

// Mail konnte nicht gesendet werden: Position auf Fehler setzen.
function zwMailfehler(speicher, positionId, meldung, jetzt) {
  const st = speicher.positionen && speicher.positionen[positionId];
  if (!st || st.status !== 'wartet') return;
  const zeit = new Date(jetzt).toISOString();
  speicher.positionen[positionId] = Object.assign({}, st, { status: 'fehler', meldung: 'Freigabe-Mail nicht gesendet: ' + meldung, aktualisiert: zeit });
  if (st.retoureId) kommentarSim(speicher, st.retoureId, zeit, 'ZW-Fehler (' + positionId + '): Freigabe-Mail nicht gesendet', { aktion: 'freigabe-mail', positionId });
  ausgangMerken(speicher, { aktion: 'freigabe-mail', retoureId: st.retoureId, positionId }, bilderLoeschenBefehle((st.vorschau || {}).bilderMedien, 'Freigabe-Mail nicht gesendet'));
  protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'freigabe-mail', positionId, ergebnis: 'fehler', meldung });
}

// Mails, die nicht rausgingen, als Fehler vermerken (das Lager kann neu anlegen). Danach antwortet „Antwort senden“.
const antwort = zwNachMailversand(
  $('ZW-Logik').first().json,
  $input.all().map((item) => item.json),
  $getWorkflowStaticData('global'),
  Date.now(),
);
return [{ json: antwort }];
