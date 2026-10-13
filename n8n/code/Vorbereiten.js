// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version 45d55dd676
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

const ZW_ZUSTAENDE = {
  'Neuwertig': { endung: 'ZW1', schluessel: 'abschlagNeuwertig' },
  'Sehr gut': { endung: 'ZW2', schluessel: 'abschlagSehrGut' },
  'Gut': { endung: 'ZW3', schluessel: 'abschlagGut' },
};

function istZwZustand(zustand) {
  return Object.prototype.hasOwnProperty.call(ZW_ZUSTAENDE, zustand);
}

function zwBarcode(ean, zustand) {
  const sauber = String(ean || '').trim();
  if (!/^\d{8,14}$/.test(sauber)) throw new Error('Ungültige EAN: ' + ean);
  if (!istZwZustand(zustand)) throw new Error('Unbekannter Zustand: ' + zustand);
  return sauber + ZW_ZUSTAENDE[zustand].endung;
}

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

function hmacSha256(schluessel, nachricht) {
  let k = schluessel.length > 64 ? sha256(schluessel) : schluessel;
  const innen = new Uint8Array(64 + nachricht.length);
  const aussen = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    const kb = i < k.length ? k[i] : 0;
    innen[i] = kb ^ 0x36;
    aussen[i] = kb ^ 0x5c;
  }
  innen.set(nachricht, 64);
  aussen.set(sha256(innen), 64);
  return sha256(aussen);
}

// Vergleich in konstanter Zeit, damit die Antwortzeit nichts verrät.
function gleich(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function hexZuText(hex) {
  if (!/^([0-9a-f]{2})*$/.test(hex)) throw new Error('Kein Hex-Text');
  return decodeURIComponent(hex.replace(/../g, '%$&'));
}

function signatur(geheimnis, text) {
  return bytesZuHex(hmacSha256(utf8(geheimnis), utf8(text)));
}

// Gibt die Daten des Schlüssels zurück oder null, wenn er ungültig oder abgelaufen ist.
function schluesselPruefen(geheimnis, schluessel, jetztMs) {
  const teile = String(schluessel || '').split('.');
  if (teile.length !== 2) return null;
  if (!gleich(signatur(geheimnis, 'anmeldung|' + teile[0]), teile[1])) return null;
  let daten;
  try { daten = JSON.parse(hexZuText(teile[0])); } catch (e) { return null; }
  if (!daten || typeof daten.ablauf !== 'number' || daten.ablauf < (jetztMs || Date.now())) return null;
  return daten;
}

const LEER_SHOPWARE = { limit: 1, filter: [{ type: 'equals', field: 'productNumber', value: 'ZW-KEINE-ABFRAGE' }], includes: { product: ['id'] } };

const SHOPWARE_FELDER = ['id', 'productNumber', 'name', 'ean', 'active', 'stock', 'isCloseout', 'price', 'purchasePrices', 'customFields', 'categoryIds', 'tagIds', 'description'];

// Was der Trockenlauf (6.0) vom plenty-Original braucht, um die Kopie nachzubauen
const PLENTY_ORIGINAL_MIT = 'variationSalesPrices,variationCategories,variationDefaultCategory,variationSuppliers,variationWarehouses,variationBarcodes,properties,tags,unit';

// Status wie in plenty angezeigt („9.1.1“) in die interne Zahl umrechnen (9.11).
function plentyStatus(text) {
  const teile = String(text === undefined || text === null ? '' : text).trim().split('.');
  if (!teile[0]) return NaN;
  return Number(teile.length <= 2 ? teile.join('.') : teile[0] + '.' + teile.slice(1).join(''));
}

function retourenNummer(nr) {
  const id = String(nr || '').trim().replace(/^R-?/i, '');
  return /^\d{1,12}$/.test(id) ? id : null;
}

// ---------- Abfragen ----------

function anfrageRetourenListe(e) {
  const status = plentyStatus(e.statusOffen || '9.1.1');
  return [{
    method: 'GET', endpoint: '/rest/orders',
    query: { typeId: 3, statusFrom: status, statusTo: status, itemsPerPage: 250, sortBy: 'id', sortOrder: 'desc', 'with[]': 'orderItems' },
  }];
}

function anfrageRetoure(id) {
  return [
    { method: 'GET', endpoint: '/rest/orders/' + id, query: { 'with[]': 'orderItems' } },
    { method: 'GET', endpoint: '/rest/comments/order/' + id },
  ];
}

function anfrageBarcode(code) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: code, itemsPerPage: 5 } };
}

// Originale über die Produktnummer (= plenty-Varianten-ID). Mit EANs zusätzlich alle Artikel mit derselben EAN,
// darunter die vorhandenen ZW-Artikel (für Bestand +1 im Trockenlauf).
function shopwareSuche(varianteIds, eans) {
  const ids = [...new Set(varianteIds.map(String))];
  if (!ids.length) return LEER_SHOPWARE;
  const mitEan = [...new Set((eans || []).map(String))];
  const filter = mitEan.length
    ? [{ type: 'multi', operator: 'or', queries: [{ type: 'equalsAny', field: 'productNumber', value: ids }, { type: 'equalsAny', field: 'ean', value: mitEan }] }]
    : [{ type: 'equalsAny', field: 'productNumber', value: ids }];
  return { limit: mitEan.length ? 100 : ids.length, filter, includes: { product: SHOPWARE_FELDER } };
}

function anfrageOriginale(ids) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { id: ids.join(','), with: PLENTY_ORIGINAL_MIT, itemsPerPage: 100 } };
}

// ---------- Antworten auslesen ----------

function plentyFehler(antworten) {
  const f = (antworten || []).find((a) => a && !Array.isArray(a) && a.error);
  return f ? String(f.error) : null;
}

const DATEN_AKTIONEN = ['retouren', 'retoure', 'vorschau', 'anlegen'];

// Diese Aktionen lesen die Data Tables ZW_LISTE (neueste 300 Zeilen) und ZW_PROTOKOLL (neueste 50)
const TABELLEN_AKTIONEN = ['zw-liste', 'zw-liste-buchen'];

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
    const tabellen = TABELLEN_AKTIONEN.includes(route.aktion);
    if (!DATEN_AKTIONEN.includes(route.aktion) && !tabellen) return { weiter: 'logik' };
    if (!route.testlauf) {
      // Ohne gültige Anmeldung keine Abfragen an plenty und Shopware. Die Ablehnung schreibt die ZW-Logik.
      const g = String(e.geheimSchluessel || '').trim().length >= 32 ? String(e.geheimSchluessel).trim() : speicher.geheimnis;
      const kopf = String((anfrage.headers || {}).authorization || '');
      if (!g || !schluesselPruefen(g, kopf.replace(/^Bearer\s+/i, ''), k.jetzt)) return { weiter: 'logik' };
    }
    const q = anfrage.query || {};
    const body = anfrage.body || {};

    if (tabellen) return { weiter: 'tabellen', plan: { art: 'tabellen' } };
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

// ---------- Hilfen ----------

function json(status, inhalt) {
  return { status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(inhalt) };
}

function abbrechen(status, fehler) {
  const err = new Error(fehler);
  err.zwAntwort = json(status, { ok: false, fehler });
  throw err;
}

function speicherVorbereiten(speicher) {
  if (!speicher.positionen) speicher.positionen = {};
  if (!speicher.fehlversuche) speicher.fehlversuche = {};
  if (!speicher.cache) speicher.cache = { positionen: {}, retouren: {}, reihenfolge: [] };
  if (!speicher.kommentare) speicher.kommentare = {};
  if (!speicher.retourenFertig) speicher.retourenFertig = {};
  if (!speicher.sim) speicher.sim = { naechsteNr: 1, zwArtikel: {} };
}

function geheimnis(e) {
  const g = String(e.geheimSchluessel || '').trim();
  if (g.length < 32) abbrechen(500, 'Kein Geheimschlüssel: n8n liefert hier keine sicheren Zufallszahlen. Bitte in Einstellungen geheimSchluessel setzen (mindestens 32 Zeichen).');
  return g;
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

// ---------- Aufruf durch n8n: Welche Daten braucht diese Anfrage? ----------
const anfrage = $input.first().json;
const plan = zwVorbereiten({ url: anfrage.webhookUrl, query: anfrage.query, body: anfrage.body, headers: anfrage.headers }, {
  einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData('global'), jetzt: Date.now(),
});
return [{ json: plan }];
