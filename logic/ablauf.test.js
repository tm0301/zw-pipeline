const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { zwVerarbeiten, zwVorbereiten, zwRundeB, zwMailfehler, zwNachMailversand } = require('./ablauf.js');

const BASIS = 'https://mykitchens.app.n8n.cloud/webhook/zw-station';

function hash(passwort) {
  const salz = crypto.randomBytes(16);
  return 'pbkdf2-sha256$10000$' + salz.toString('hex') + '$' + crypto.pbkdf2Sync(passwort, salz, 10000, 32, 'sha256').toString('hex');
}

// ---------- Nachgestelltes plenty und Shopware (Antworten in der echten Form) ----------

function auftrag(id, positionen, shopNr) {
  return {
    id, typeId: 3, statusId: 9.11, statusName: '[9.1.1] Retoure eingegangen', createdAt: '2026-10-01T09:12:00+02:00',
    properties: [{ typeId: 7, value: shopNr }, { typeId: 4, value: 'x' }],
    orderItems: positionen.concat([{ id: id * 10 + 9, typeId: 6, itemVariationId: 0, orderItemName: 'Versandkosten', quantity: 1 }]),
  };
}

const AUFTRAEGE = {
  241881: auftrag(241881, [{ id: 5001, typeId: 1, itemVariationId: 772160, orderItemName: 'Miele H 2861-1 B Backofen', quantity: 1 }], 'MK91001'),
  241900: auftrag(241900, [
    { id: 5101, typeId: 1, itemVariationId: 772161, orderItemName: 'Bosch Kochfeld', quantity: 1 },
    { id: 5102, typeId: 1, itemVariationId: 772162, orderItemName: 'Siemens Spüler', quantity: 1 },
    { id: 5103, typeId: 1, itemVariationId: 772163, orderItemName: 'Teil ohne EAN', quantity: 1 },
    { id: 5104, typeId: 1, itemVariationId: 787119, orderItemName: '2% Rabatt bei Vorkasse per Überweisung', quantity: 1, amounts: [{ priceGross: -55.19 }] },
    { id: 5105, typeId: 1, itemVariationId: 787573, orderItemName: 'Summer Sale - 75 EUR Rabatt', quantity: 1, amounts: [{ priceGross: -75 }] },
  ], 'MK91002'),
};

const VARIANTEN = {
  772160: { id: 772160, number: '772160', model: 'H 2861-1 B 125 Edition', externalId: '', variationBarcodes: [{ barcodeId: 3, code: 'ABC' }, { barcodeId: 1, code: '4002516769965' }] },
  772161: { id: 772161, number: '772161', model: 'PIE 611', externalId: '4242005000001', variationBarcodes: [] },
  772162: { id: 772162, number: '772162', model: '', variationBarcodes: [{ barcodeId: 1, code: '4242003000002' }] },
  772163: { id: 772163, number: '772163', model: 'X', variationBarcodes: [] },
};

const BARCODES = {
  '4002516769965ZW': [{ id: 787567 }], // alter ZW-Artikel ohne Stufe
  '4002516769965ZW2': [{ id: 788902 }], // „Sehr gut“ gibt es schon
};

const SHOPWARE = [
  {
    id: 'a1', productNumber: '772160', name: 'Miele H 2861-1 B 125 Edition Einbau-Backofen Edelstahl/CleanSteel', ean: '4002516769965',
    price: [{ currencyId: 'x', gross: 1149, net: 965.55, listPrice: { gross: 1299 } }], purchasePrices: [{ gross: 644.11 }],
    customFields: { custom_price_minprice: 865 },
    categoryIds: ['kat-backofen', '019f13061667716a9525667c2acb4d56'], tagIds: ['019c75c6b03378f4bb6bb46085c38bdc'],
  },
  {
    id: 'a2', productNumber: '772162', name: 'Siemens iQ500 Geschirrspüler', ean: '4242003000002',
    price: [{ gross: 1099, listPrice: null }], purchasePrices: [{ gross: 1000 }], customFields: {},
  },
];

function plentyAnfrage(r) {
  const q = r.query || {};
  if (r.endpoint === '/rest/orders') {
    assert.equal(q.typeId, 3);
    assert.equal(q.statusFrom, 9.11);
    return { page: 1, entries: Object.values(AUFTRAEGE).reverse() };
  }
  let m = r.endpoint.match(/^\/rest\/orders\/(\d+)$/);
  if (m) return AUFTRAEGE[m[1]] || { error: '404 - Order not found' };
  m = r.endpoint.match(/^\/rest\/comments\/order\/(\d+)$/);
  if (m) return m[1] === '241881' ? [{ id: 1, text: '<p>Kratzer&nbsp;an der <b>Tür</b></p>', createdAt: '2026-10-02T08:00:00+02:00' }] : [];
  if (r.endpoint === '/rest/items/variations') {
    if (q.barcode) return { entries: BARCODES[q.barcode] || [] };
    assert.equal(q.with, 'variationBarcodes');
    return { entries: String(q.id).split(',').map((id) => VARIANTEN[id]).filter(Boolean) };
  }
  throw new Error('unerwartet: ' + r.endpoint);
}

// Wie der PlentyONE-Baustein: Scheitert eine Anfrage, scheitert der ganze Stapel.
function plentyStapel(anfragen, protokoll) {
  protokoll.push(...anfragen);
  const antworten = anfragen.map(plentyAnfrage);
  const fehler = antworten.find((x) => x && x.error);
  return fehler ? [{ error: fehler.error }] : antworten;
}

function shopwareSuchen(suche) {
  const f = suche.filter[0];
  const nummern = f.type === 'equalsAny' ? f.value : [f.value];
  return { total: 0, data: SHOPWARE.filter((p) => nummern.includes(p.productNumber)) };
}

// ---------- Ein Aufruf wie in n8n: Vorbereiten → plenty A → Runde B → plenty B → Shopware → ZW-Logik ----------

function aufbau() {
  const einstellungen = {
    abschlagNeuwertig: 0, abschlagSehrGut: 5, abschlagGut: 10, abschlagNeuwertigSonderfall: 2,
    statusOffen: '9.1.1', statusFertig: '9.3',
    freigabeAn: 'tobias@example.com', bueroAn: 'buero@example.com', geheimSchluessel: 'x'.repeat(64),
    benutzer: JSON.stringify([
      { benutzer: 'lager1', name: 'Lager Eins', hash: hash('Passwort-Lager1'), rolle: 'lager' },
      { benutzer: 'chef', name: 'Tobias', hash: hash('Passwort-Chef1'), rolle: 'admin' },
      { benutzer: 'alt', name: 'Gesperrt', hash: hash('Passwort-Alt12'), gesperrt: true },
    ]),
  };
  const k = { einstellungen, speicher: {}, jetzt: Date.parse('2026-10-07T10:00:00Z'), seiteHtml: '<html>Seite</html>' };
  const abfragen = [];
  const lauf = (anfrage) => {
    const v = zwVorbereiten(anfrage, k);
    k.daten = null;
    if (v.weiter === 'daten') {
      const a = plentyStapel(v.plenty, abfragen);
      const b = plentyStapel(zwRundeB(v.plan, a), abfragen);
      k.daten = { plan: v.plan, a, b, shopware: shopwareSuchen(v.shopware) };
    }
    const r = zwVerarbeiten(anfrage, k);
    return Object.assign({}, r, { daten: r.contentType.startsWith('application/json') ? JSON.parse(r.body) : null });
  };
  const rufe = (aktion, { body, query, schluessel } = {}) => lauf({
    url: BASIS + (aktion ? '/' + aktion : ''), body: body || {}, query: query || {},
    headers: Object.assign({ host: 'mykitchens.app.n8n.cloud' }, schluessel ? { authorization: 'Bearer ' + schluessel } : {}),
  });
  const anmelden = (benutzer, passwort) => rufe('anmelden', { body: { benutzer, passwort } }).daten.schluessel;
  const link = (mail) => Object.fromEntries(new URL(mail.html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')).searchParams);
  return { k, rufe, lauf, anmelden, abfragen, link };
}

// ---------- Anmeldung ----------

test('Seite wird ohne Anmeldung ausgeliefert', () => {
  const { rufe } = aufbau();
  const r = rufe('');
  assert.equal(r.status, 200);
  assert.match(r.contentType, /text\/html/);
  assert.equal(r.body, '<html>Seite</html>');
});

test('ohne Schlüssel kein Zugriff und keine Abfrage an plenty', () => {
  const { rufe, abfragen } = aufbau();
  assert.equal(rufe('retouren').status, 401);
  assert.equal(rufe('retouren', { schluessel: 'quatsch.abc' }).status, 401);
  assert.equal(rufe('retoure', { query: { nr: '241881' } }).status, 401);
  assert.equal(rufe('vorschau', { body: { entscheidungen: [] } }).status, 401);
  assert.equal(abfragen.length, 0);
});

test('Anmeldung: richtig, falsch, gesperrt, zu viele Versuche', () => {
  const { rufe } = aufbau();
  const ok = rufe('anmelden', { body: { benutzer: 'Lager1', passwort: 'Passwort-Lager1' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.daten.name, 'Lager Eins');
  assert.equal(rufe('anmelden', { body: { benutzer: 'lager1', passwort: 'falsch' } }).status, 401);
  assert.equal(rufe('anmelden', { body: { benutzer: 'alt', passwort: 'Passwort-Alt12' } }).status, 401);
  for (let i = 0; i < 5; i++) rufe('anmelden', { body: { benutzer: 'chef', passwort: 'falsch' } });
  assert.equal(rufe('anmelden', { body: { benutzer: 'chef', passwort: 'Passwort-Chef1' } }).status, 429, 'nach 5 Fehlversuchen gesperrt');
});

test('Schlüssel einer später gesperrten Person gilt nicht mehr', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  assert.equal(rufe('retouren', { schluessel: s }).status, 200);
  const liste = JSON.parse(k.einstellungen.benutzer);
  liste[0].gesperrt = true;
  k.einstellungen.benutzer = JSON.stringify(liste);
  assert.equal(rufe('retouren', { schluessel: s }).status, 401);
});

test('ohne eingetragenen Geheimschlüssel wird einer erzeugt und behalten', () => {
  const { k, rufe, anmelden } = aufbau();
  k.einstellungen.geheimSchluessel = '';
  const s = anmelden('lager1', 'Passwort-Lager1');
  assert.ok(s);
  assert.match(k.speicher.geheimnis, /^[0-9a-f]{64}$/);
  const gemerkt = k.speicher.geheimnis;
  assert.equal(rufe('retouren', { schluessel: s }).status, 200, 'Schlüssel gilt auch beim nächsten Aufruf');
  const chef = anmelden('chef', 'Passwort-Chef1');
  rufe('zuruecksetzen', { schluessel: chef, body: {} });
  assert.equal(k.speicher.geheimnis, gemerkt, 'Zurücksetzen behält den Geheimschlüssel');
  assert.equal(rufe('retouren', { schluessel: s }).status, 200);
});

test('ohne sichere Zufallsquelle klare Fehlermeldung', () => {
  const { k, rufe } = aufbau();
  k.einstellungen.geheimSchluessel = '';
  k.zufall = () => null;
  const r = rufe('anmelden', { body: { benutzer: 'lager1', passwort: 'Passwort-Lager1' } });
  assert.equal(r.status, 500);
  assert.match(r.daten.fehler, /geheimSchluessel setzen/);
});

test('Benutzerliste wird nachsichtig gelesen', () => {
  const { k, rufe } = aufbau();
  const liste = JSON.parse(k.einstellungen.benutzer);
  const login = () => rufe('anmelden', { body: { benutzer: 'lager1', passwort: 'Passwort-Lager1' } });
  k.einstellungen.benutzer = ' ' + JSON.stringify(liste[0]) + ' '; // ein Eintrag ohne [ ]
  assert.equal(login().status, 200);
  k.einstellungen.benutzer = JSON.stringify(liste[1]) + ',' + JSON.stringify(liste[0]); // mehrere ohne [ ]
  assert.equal(login().status, 200);
  k.einstellungen.benutzer = liste; // als echtes Array (Typ „Array“ im Baustein)
  assert.equal(login().status, 200);
});

test('kaputte Benutzerliste gibt eine klare Meldung statt „Passwort falsch“', () => {
  const { k, rufe } = aufbau();
  const login = () => rufe('anmelden', { body: { benutzer: 'lager1', passwort: 'Passwort-Lager1' } });
  for (const [wert, muster] of [
    ['[]', /benutzer ist leer/],
    ['', /benutzer ist leer/],
    ['[{"benutzer":"lager1"', /kein gültiges JSON/],
    ['[{"benutzer":"lager1","hash":"pbkdf2-sha256$10000$ab$cd"}]', /ohne gültigen Benutzernamen oder Hash/],
  ]) {
    k.einstellungen.benutzer = wert;
    const r = login();
    assert.equal(r.status, 500, wert);
    assert.match(r.daten.fehler, muster);
  }
});

// ---------- Testlauf direkt in n8n ----------

test('Testlauf ohne Webhook-Adresse: Aktion aus body.aktion, gilt als Admin', () => {
  const { lauf } = aufbau();
  const r = lauf({ body: { aktion: 'retouren' }, query: {}, headers: {} });
  assert.equal(r.status, 200);
  assert.equal(r.daten.person.rolle, 'admin');
  assert.equal(r.daten.retouren.length, 2);
  // Von außen (mit Kopfzeilen) ist das kein Testlauf
  assert.equal(lauf({ body: { aktion: 'retouren' }, query: {}, headers: { host: 'x' } }).status, 401);
});

// ---------- Retouren und Vorschau mit echten Daten ----------

test('Retouren-Liste aus plenty', () => {
  const { rufe, anmelden } = aufbau();
  const d = rufe('retouren', { schluessel: anmelden('lager1', 'Passwort-Lager1') }).daten;
  assert.equal(d.modus, 'probelauf-echtdaten');
  assert.deepEqual(d.retouren.map((r) => [r.id, r.shopAuftrag, r.anzahl, r.datum]), [
    ['241900', 'MK91002', 3, '2026-10-01'], ['241881', 'MK91001', 1, '2026-10-01'],
  ]);
});

test('Retoure mit Positionen, EAN und Kommentaren aus plenty', () => {
  const { rufe, anmelden, abfragen } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const r = rufe('retoure', { schluessel: s, query: { nr: 'R-241881' } }).daten.retoure;
  assert.equal(r.shopAuftrag, 'MK91001');
  assert.deepEqual(r.positionen.map((p) => [p.positionId, p.varianteId, p.ean, p.modell, p.status]), [['5001', '772160', '4002516769965', 'H 2861-1 B 125 Edition', 'offen']]);
  assert.deepEqual(r.plentyKommentare.map((c) => c.text), ['Kratzer an der Tür']);
  assert.ok(!('kunde' in r));
  assert.deepEqual(abfragen.map((a) => a.endpoint), ['/rest/orders/241881', '/rest/comments/order/241881', '/rest/items/variations']);

  const r2 = rufe('retoure', { schluessel: s, query: { nr: '241900' } }).daten.retoure;
  assert.deepEqual(r2.positionen.map((p) => p.ean), ['4242005000001', '4242003000002', null], 'EAN aus Barcode 1, sonst externe ID');

  assert.equal(rufe('retoure', { schluessel: s, query: { nr: '99999' } }).status, 404);
  assert.equal(rufe('retoure', { schluessel: s, query: { nr: 'quatsch' } }).status, 404);
});

test('Vorschau mit echten Preisen aus Shopware und vorhandenen ZW-Artikeln aus plenty', () => {
  const { rufe, anmelden, abfragen } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  abfragen.length = 0;
  const v = rufe('vorschau', { schluessel: s, body: { entscheidungen: [
    { positionId: '5001', zustand: 'Neuwertig' },
    { positionId: '5001', zustand: 'Sehr gut', grund: 'Kleine Delle hinten' },
    { positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' },
    { positionId: '5101', zustand: 'Gut', grund: 'Kratzer an der Seite' },
    { positionId: '5103', zustand: 'Gut', grund: 'Kratzer an der Seite' },
    { positionId: '5001', zustand: 'Kein ZW' },
    { positionId: '5001', zustand: 'Super' },
    { positionId: '9999', zustand: 'Gut', grund: 'Kratzer an der Seite' },
  ] } }).daten.vorschau;
  assert.equal(v[0].preis, 864.99); assert.equal(v[0].fall, 'normal'); assert.equal(v[0].neu, true);
  assert.equal(v[0].streichpreis, 1149);
  assert.equal(v[0].barcode, '4002516769965ZW1');
  assert.match(v[0].hinweise[0], /Alter ZW-Artikel 787567/);
  assert.equal(v[0].name, '[Zweite Wahl] Miele H 2861-1 B 125 Edition Einbau-Backofen Edelstahl/CleanSteel');
  assert.equal(v[0].variantennummer, '[ZW] H 2861-1 B 125 Edition');
  assert.equal(v[1].preis, 820.99); assert.equal(v[1].neu, false); assert.equal(v[1].bestehendeVarianteId, '788902');
  assert.equal(v[2].preis, 988.99); assert.equal(v[2].fall, 'b');
  assert.equal(v[2].warnungen.length, 3, 'Mindestpreis leer + unter Einkaufspreis + Modell fehlt');
  assert.match(v[3].fehler, /nicht in Shopware/);
  assert.match(v[4].fehler, /keine EAN/);
  assert.equal(v[5].artikel, false);
  assert.equal(v[6].fehler, 'Unbekannter Zustand.');
  assert.match(v[7].fehler, /Position unbekannt/);
  // Nur lesende Abfragen
  assert.ok(abfragen.every((a) => a.method === 'GET'));
});

// ---------- Anlegen (nachgestellt) und Freigabe ----------

test('kompletter Durchlauf: anlegen, Mail, freigeben, +1, ablehnen, fertig', () => {
  const { k, rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });

  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '5101', zustand: 'Kein ZW' },
    { positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' },
    { positionId: '5103', zustand: 'Nicht verkaufbar', grund: 'Glasfront gebrochen' },
  ] } });
  assert.equal(a.status, 200);
  assert.deepEqual(a.daten.ergebnisse.map((e) => e.status), ['kein_zw', 'wartet', 'nicht_verkaufbar']);
  assert.equal(a.mails.length, 2, 'Freigabe-Mail für 5102, Info ans Büro für 5103');
  assert.equal(a.mails[0].an, 'tobias@example.com');
  assert.match(a.mails[0].betreff, /Retoure 241900/);
  assert.match(a.mails[0].html, /241900 · MK91002/);
  assert.match(a.mails[0].html, /Kratzer an der Seite/);
  assert.equal(a.mails[1].art, 'info');
  assert.equal(a.mails[1].an, 'buero@example.com');
  assert.match(a.mails[1].betreff, /Nicht verkaufbar/);
  assert.match(a.mails[1].html, /Glasfront gebrochen/);
  assert.match(a.mails[1].html, /9\.1\.3/);
  const q = link(a.mails[0]);
  assert.equal(q.p, '5102');

  // Doppelt anlegen ändert nichts
  const doppelt = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } });
  assert.equal(doppelt.mails.length, 0);
  assert.match(doppelt.daten.ergebnisse[0].hinweis, /Schon entschieden/);

  // Freigabe-Seite, falsche Signatur
  const seite = rufe('freigabe', { query: q });
  assert.equal(seite.status, 200);
  assert.match(seite.body, /value="freigeben"/);
  assert.equal(rufe('freigabe', { query: Object.assign({}, q, { s: 'ab' + q.s.slice(2) }) }).status, 403);

  // Freigeben → nachgestellter ZW-Artikel SIM-1, Retoure fertig
  const f1 = rufe('freigabe-entscheiden', { body: Object.assign({}, q, { entscheidung: 'freigeben' }) });
  assert.match(f1.body, /ZW angelegt: SIM-1 \(Gut\)\. Grund: Kratzer an der Seite/);
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q, { entscheidung: 'freigeben' }) }).body, /Schon entschieden/);

  const r = rufe('retoure', { schluessel: s, query: { nr: '241900' } }).daten.retoure;
  assert.deepEqual(r.positionen.map((p) => p.status), ['kein_zw', 'angelegt', 'nicht_verkaufbar']);
  assert.equal(r.probelaufFertig, true);
  assert.equal(r.probelaufStatus, '9.1.3', 'eine Position nicht verkaufbar → Reklamieren');
  assert.deepEqual(r.kommentare.map((x) => x.text), [
    'Kein ZW (5101)',
    'Nicht verkaufbar, an Büro. Grund: Glasfront gebrochen (5103)',
    'ZW angelegt: SIM-1 (Gut). Grund: Kratzer an der Seite',
    'Alle Positionen entschieden, Status 9.1.3 (Reklamieren, weil nicht verkaufbar) (Probelauf: nicht gesetzt)',
  ]);
  const liste = rufe('retouren', { schluessel: s }).daten.retouren;
  assert.deepEqual(liste.map((x) => [x.id, x.probelaufStatus, x.erledigt]), [['241900', '9.1.3', 3], ['241881', null, 0]]);

  // Retoure 241881: Sehr gut gibt es echt (788902) → +1, Ablehnen lässt die Position offen
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const p = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Neuwertig' }] } });
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, link(p.mails[0]), { entscheidung: 'ablehnen' }) }).body, /Abgelehnt/);
  let r2 = rufe('retoure', { schluessel: s, query: { nr: '241881' } }).daten.retoure;
  assert.equal(r2.positionen[0].status, 'abgelehnt');
  assert.equal(r2.probelaufFertig, false);
  const p2 = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Sehr gut', grund: 'Kleine Delle hinten' }] } });
  assert.equal(p2.daten.ergebnisse[0].versuch, 2);
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, link(p2.mails[0]), { entscheidung: 'freigeben' }) }).body, /ZW \+1: 788902 \(Sehr gut\)/);
  r2 = rufe('retoure', { schluessel: s, query: { nr: '241881' } }).daten.retoure;
  assert.equal(r2.positionen[0].status, 'plus1');
  assert.equal(r2.probelaufStatus, '9.3');

  // ZW-Liste und Protokoll
  const zl = rufe('zw-liste', { schluessel: s }).daten;
  assert.deepEqual(zl.zwListe.map((z) => [z.id, z.zwVarianteId, z.neuOderPlus1, z.preis, z.bestandGebucht, z.grund]), [
    ['Z2', '788902', '+1', 820.99, false, 'Kleine Delle hinten'], ['Z1', 'SIM-1', 'neu', 988.99, false, 'Kratzer an der Seite'],
  ]);
  assert.ok(zl.protokoll.some((x) => x.aktion === 'freigabe' && x.ergebnis === 'abgelehnt'));
  assert.ok(zl.protokoll.every((x) => x.zeit));
  assert.equal(k.speicher.sim.zwArtikel['4242003000002ZW3'].bestand, 1);
});

test('nachgestellter ZW-Artikel bekommt beim zweiten Mal +1', () => {
  const { rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } });
  rufe('freigabe-entscheiden', { body: Object.assign({}, link(a.mails[0]), { entscheidung: 'freigeben' }) });
  const v = rufe('vorschau', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } }).daten.vorschau[0];
  assert.equal(v.neu, false);
  assert.equal(v.bestehendeVarianteId, 'SIM-1');
  assert.equal(v.bestehendSimuliert, true);
});

test('ZW-Liste: Bestand gebucht setzen und zurücknehmen', () => {
  const { rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } });
  rufe('freigabe-entscheiden', { body: Object.assign({}, link(a.mails[0]), { entscheidung: 'freigeben' }) });
  const b = rufe('zw-liste-buchen', { schluessel: s, body: { id: 'Z1', gebucht: true } });
  assert.equal(b.status, 200);
  assert.equal(b.daten.zeile.bestandGebucht, true);
  assert.equal(b.daten.zeile.gebuchtVon, 'lager1');
  assert.equal(rufe('zw-liste-buchen', { schluessel: s, body: { id: 'Z1', gebucht: false } }).daten.zeile.gebuchtVon, null);
  assert.equal(rufe('zw-liste-buchen', { schluessel: s, body: { id: 'Z9' } }).status, 404);
  assert.equal(rufe('zw-liste-buchen', { body: { id: 'Z1' } }).status, 401);
});

test('Fehler (Original fehlt in Shopware) landet als Kommentar, Mailfehler setzt Position auf Fehler', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '5101', zustand: 'Gut', grund: 'Kratzer an der Seite' }, { positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' },
  ] } });
  assert.deepEqual(a.daten.ergebnisse.map((e) => e.status), ['fehler', 'wartet']);
  zwMailfehler(k.speicher, '5102', 'SMTP nicht erreichbar', k.jetzt);
  const r = rufe('retoure', { schluessel: s, query: { nr: '241900' } }).daten.retoure;
  assert.deepEqual(r.positionen.map((p) => p.status), ['fehler', 'fehler', 'offen']);
  assert.match(r.kommentare[0].text, /nicht in Shopware/);
  assert.match(r.kommentare[1].text, /Freigabe-Mail nicht gesendet/);
  const b = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } });
  assert.equal(b.daten.ergebnisse[0].status, 'wartet');
  assert.equal(b.daten.ergebnisse[0].versuch, 2);
});

test('alter Freigabe-Link gilt nach neuem Versuch nicht mehr', () => {
  const { rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const a1 = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } });
  const q1 = link(a1.mails[0]);
  rufe('freigabe-entscheiden', { body: Object.assign({}, q1, { entscheidung: 'ablehnen' }) });
  rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Neuwertig' }] } });
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q1, { entscheidung: 'freigeben' }) }).body, /veraltet/);
});

test('Zurücksetzen nur für Admins', () => {
  const { k, rufe, anmelden } = aufbau();
  const lager = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: lager, query: { nr: '241881' } });
  rufe('anlegen', { schluessel: lager, body: { entscheidungen: [{ positionId: '5001', zustand: 'Kein ZW' }] } });
  assert.equal(rufe('zuruecksetzen', { schluessel: lager, body: {} }).status, 403);
  const chef = anmelden('chef', 'Passwort-Chef1');
  assert.equal(rufe('zuruecksetzen', { schluessel: chef, body: {} }).status, 200);
  assert.deepEqual(k.speicher.positionen, {});
  assert.deepEqual(k.speicher.retourenFertig, {});
});

test('plenty- und Shopware-Fehler werden klar gemeldet', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const anfrage = { url: BASIS + '/retouren', body: {}, query: {}, headers: { host: 'x', authorization: 'Bearer ' + s } };
  k.daten = { plan: { art: 'retouren' }, a: [{ error: 'Unauthorized' }], b: [{}], shopware: {} };
  let r = JSON.parse(zwVerarbeiten(anfrage, k).body);
  assert.match(r.fehler, /plenty meldet: Unauthorized/);
  k.daten = null;
  r = zwVerarbeiten(anfrage, k);
  assert.equal(r.status, 502);
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  k.daten = { plan: { art: 'vorschau', barcodes: [] }, a: [{ entries: [] }], b: [{}], shopware: { error: { message: 'invalid_grant' } } };
  r = zwVerarbeiten(Object.assign({}, anfrage, { url: BASIS + '/vorschau', body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }] } }), k);
  assert.match(JSON.parse(r.body).fehler, /Shopware meldet: invalid_grant/);
});

test('unbekannte Aktion', () => {
  const { rufe, anmelden } = aufbau();
  assert.equal(rufe('gibtsnicht', { schluessel: anmelden('lager1', 'Passwort-Lager1') }).status, 404);
});

test('nach dem Mailversand: Fehler landen in Speicher und Antwort', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '5001', zustand: 'Gut', grund: 'Kratzer an der Seite' }, { positionId: '5102', zustand: 'Gut', grund: 'Kratzer an der Seite' },
  ] } });
  const neu = zwNachMailversand(a, [{ accepted: ['x'] }, { error: 'Authentication failed' }], k.speicher, k.jetzt);
  const d = JSON.parse(neu.body);
  assert.deepEqual(d.ergebnisse.map((e) => e.status), ['wartet', 'fehler']);
  assert.match(d.ergebnisse[1].meldung, /Authentication failed/);
  assert.equal(k.speicher.positionen['5102'].status, 'fehler');
  assert.equal(k.speicher.positionen['5001'].status, 'wartet');
  assert.equal(neu.mails, undefined, 'Mails gehen nicht an die Seite');
});

test('Zwischenspeicher bleibt begrenzt', () => {
  const { k } = aufbau();
  k.speicher = {};
  const { zwVerarbeiten: v } = require('./ablauf.js');
  for (let i = 0; i < 305; i++) {
    const id = 300000 + i;
    k.daten = {
      plan: { art: 'retoure', id: String(id) },
      a: [Object.assign({}, AUFTRAEGE[241881], { id, orderItems: [{ id: id * 10, typeId: 1, itemVariationId: 772160, quantity: 1 }] }), []],
      b: [{ entries: [VARIANTEN[772160]] }], shopware: {},
    };
    v({ body: { aktion: 'retoure' }, query: { nr: String(id) }, headers: {} }, k);
  }
  assert.equal(k.speicher.cache.reihenfolge.length, 300);
  assert.equal(Object.keys(k.speicher.cache.positionen).length, 300);
  assert.ok(!k.speicher.cache.retouren['300000']);
});

// ---------- Grund, Preis vom Lager, 9.1.3 ----------

test('ohne Grund wird nichts angelegt (Sehr gut, Gut, Nicht verkaufbar)', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  for (const zustand of ['Sehr gut', 'Gut', 'Nicht verkaufbar']) {
    const r = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
      { positionId: '5101', zustand: 'Kein ZW' }, { positionId: '5102', zustand, grund: '   ' },
    ] } });
    assert.equal(r.status, 400, zustand);
    assert.match(r.daten.fehler, /Grund/);
  }
  assert.deepEqual(k.speicher.positionen, {}, 'auch die gültige Position wurde nicht angelegt');
  // Neuwertig und Kein ZW brauchen keinen Grund
  const ok = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5102', zustand: 'Neuwertig' }, { positionId: '5101', zustand: 'Kein ZW' }] } });
  assert.deepEqual(ok.daten.ergebnisse.map((e) => e.status), ['wartet', 'kein_zw']);
});

test('Lager ändert den Preis: Empfehlung bleibt sichtbar, Warnungen neu berechnet', () => {
  const { rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const v = rufe('vorschau', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut' }] } }).daten.vorschau[0];
  assert.equal(v.empfehlung, 777.99);
  assert.equal(v.einkaufspreis, 644.11);
  assert.deepEqual(v.nichtUebernehmen, ['Kategorie Summer Sale', 'Tag flash sale']);

  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'Kratzer', preis: '599,00' }] } });
  const st = a.daten.ergebnisse[0];
  assert.equal(st.vorschau.preis, 599);
  assert.equal(st.vorschau.empfehlung, 777.99);
  assert.equal(st.vorschau.preisVomLager, true);
  assert.ok(st.vorschau.warnungen.some((w) => /unter dem Einkaufspreis/.test(w)));
  assert.match(a.mails[0].html, /vom Lager geändert, Empfehlung 777,99/);
  assert.match(a.mails[0].html, /Nicht übernehmen.*Summer Sale/);
  rufe('freigabe-entscheiden', { body: Object.assign({}, link(a.mails[0]), { entscheidung: 'freigeben' }) });
  const z = rufe('zw-liste', { schluessel: s }).daten.zwListe[0];
  assert.deepEqual([z.preis, z.empfehlung, z.preisVomLager], [599, 777.99, true]);
});

test('ungültiger Preis vom Lager wird abgewiesen, gleicher Preis zählt als Empfehlung', () => {
  const { rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  for (const preis of ['abc', '0', '-5']) {
    const r = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'x', preis }] } });
    assert.equal(r.status, 400, preis);
  }
  const ok = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'x', preis: '777,99' }] } });
  assert.equal(ok.daten.ergebnisse[0].vorschau.preisVomLager, false);
});

test('ohne bueroAn geht die Info an freigabeAn, Mailfehler bei der Info ändert die Entscheidung nicht', () => {
  const { k, rufe, anmelden } = aufbau();
  delete k.einstellungen.bueroAn;
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Nicht verkaufbar', grund: 'Motor defekt' }] } });
  assert.equal(a.mails[0].an, 'tobias@example.com');
  const neu = JSON.parse(zwNachMailversand(a, [{ error: { message: 'SMTP aus' } }], k.speicher, k.jetzt).body);
  assert.equal(neu.ergebnisse[0].status, 'nicht_verkaufbar');
  assert.match(neu.ergebnisse[0].hinweis, /Büro nicht gesendet/);
  assert.equal(k.speicher.retourenFertig['241881'].status, '9.1.3');
});

test('Rabatt-Positionen (negativer Preis) stehen nicht zur Auswahl', () => {
  const { rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const liste = rufe('retouren', { schluessel: s }).daten.retouren;
  assert.equal(liste.find((r) => r.id === '241900').anzahl, 3);
  const r = rufe('retoure', { schluessel: s, query: { nr: '241900' } }).daten.retoure;
  assert.deepEqual(r.positionen.map((p) => p.positionId), ['5101', '5102', '5103']);
  assert.deepEqual(r.ausgeblendet, [
    { name: '2% Rabatt bei Vorkasse per Überweisung', preis: -55.19 }, { name: 'Summer Sale - 75 EUR Rabatt', preis: -75 },
  ]);
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5104', zustand: 'Kein ZW' }] } });
  assert.match(a.daten.ergebnisse[0].meldung, /Position unbekannt/);
});

test('Bilder zum Grund: als Anhang in die Mails, nicht im Speicher', () => {
  const { k, rufe, anmelden, link } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241900' } });
  const jpg = 'data:image/jpeg;base64,' + Buffer.from('bild-eins').toString('base64');
  const png = 'data:image/png;base64,' + Buffer.from('bild-zwei').toString('base64');
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '5102', zustand: 'Gut', grund: 'Delle', bilder: [{ name: 'IMG 0001.HEIC.jpg', daten: jpg }, { name: '', daten: png }] },
    { positionId: '5101', zustand: 'Nicht verkaufbar', grund: 'Glas gesprungen', bilder: [{ name: 'riss.jpg', daten: jpg }] },
  ] } });
  assert.equal(a.status, 200);
  const freigabe = a.mails.find((m) => m.positionId === '5102');
  const buero = a.mails.find((m) => m.positionId === '5101');
  assert.deepEqual(freigabe.anhaenge.map((x) => [x.name, x.mimeType]), [
    ['retoure-pos5102-1-IMG-0001-HEIC.jpg', 'image/jpeg'], ['retoure-pos5102-2-bild.png', 'image/png'],
  ]);
  assert.equal(Buffer.from(freigabe.anhaenge[0].daten, 'base64').toString(), 'bild-eins');
  assert.match(freigabe.html, /2 Bilder im Anhang/);
  assert.equal(buero.anhaenge.length, 1);
  assert.match(buero.html, /1 Bild im Anhang/);
  assert.deepEqual(a.daten.ergebnisse.map((e) => e.bilder), [2, 1]);
  assert.ok(!JSON.stringify(k.speicher).includes(freigabe.anhaenge[0].daten), 'Bilddaten liegen nicht im Speicher');
  assert.ok(!a.body.includes(freigabe.anhaenge[0].daten), 'Bilddaten gehen nicht zurück an die Seite');
  // Freigabe-Seite und ZW-Liste nennen die Anzahl
  assert.match(rufe('freigabe', { query: link(freigabe) }).body, /2 Bilder/);
  rufe('freigabe-entscheiden', { body: Object.assign({}, link(freigabe), { entscheidung: 'freigeben' }) });
  assert.equal(rufe('zw-liste', { schluessel: s }).daten.zwListe[0].bilder, 2);
});

test('ungültige Bilder werden abgewiesen, ohne etwas anzulegen', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  rufe('retoure', { schluessel: s, query: { nr: '241881' } });
  const jpg = { name: 'a.jpg', daten: 'data:image/jpeg;base64,QUJD' };
  const falsch = [
    [jpg, jpg, jpg, jpg],
    [{ name: 'x.svg', daten: 'data:image/svg+xml;base64,PHN2Zz4=' }],
    [{ name: 'x.jpg', daten: 'data:image/jpeg;base64,<script>' }],
    [{ name: 'gross.jpg', daten: 'data:image/jpeg;base64,' + 'A'.repeat(2500004) }],
    'kein-array',
  ];
  for (const bilder of falsch) {
    const r = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '5001', zustand: 'Gut', grund: 'x', bilder }] } });
    assert.equal(r.status, 400, JSON.stringify(bilder).slice(0, 60));
    assert.match(r.daten.fehler, /Bild/);
  }
  assert.deepEqual(k.speicher.positionen, {});
});
