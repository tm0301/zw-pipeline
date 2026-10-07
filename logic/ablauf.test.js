const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { zwVerarbeiten, zwMailfehler } = require('./ablauf.js');
const beispieldaten = require('../data/beispieldaten.json');

const BASIS = 'https://mykitchens.app.n8n.cloud/webhook/zw-station';

function hash(passwort) {
  const salz = crypto.randomBytes(16);
  return 'pbkdf2-sha256$10000$' + salz.toString('hex') + '$' + crypto.pbkdf2Sync(passwort, salz, 10000, 32, 'sha256').toString('hex');
}

function aufbau() {
  const einstellungen = {
    abschlagNeuwertig: 0, abschlagSehrGut: 5, abschlagGut: 10, abschlagNeuwertigSonderfall: 2,
    freigabeAn: 'tobias@example.com', geheimSchluessel: 'x'.repeat(64),
    benutzer: JSON.stringify([
      { benutzer: 'lager1', name: 'Lager Eins', hash: hash('Passwort-Lager1'), rolle: 'lager' },
      { benutzer: 'chef', name: 'Tobias', hash: hash('Passwort-Chef1'), rolle: 'admin' },
      { benutzer: 'alt', name: 'Gesperrt', hash: hash('Passwort-Alt12'), gesperrt: true },
    ]),
  };
  const k = { einstellungen, speicher: {}, jetzt: Date.parse('2026-10-07T10:00:00Z'), seiteHtml: '<html>Seite</html>', beispieldaten };
  const rufe = (aktion, { body, query, schluessel } = {}) => {
    const r = zwVerarbeiten({
      url: BASIS + (aktion ? '/' + aktion : ''), body: body || {}, query: query || {},
      headers: schluessel ? { authorization: 'Bearer ' + schluessel } : {},
    }, k);
    return Object.assign({}, r, { daten: r.contentType.startsWith('application/json') ? JSON.parse(r.body) : null });
  };
  const anmelden = (benutzer, passwort) => rufe('anmelden', { body: { benutzer, passwort } }).daten.schluessel;
  return { k, rufe, anmelden };
}

test('Seite wird ohne Anmeldung ausgeliefert', () => {
  const { rufe } = aufbau();
  const r = rufe('');
  assert.equal(r.status, 200);
  assert.match(r.contentType, /text\/html/);
  assert.equal(r.body, '<html>Seite</html>');
});

test('ohne Schlüssel kein Zugriff', () => {
  const { rufe } = aufbau();
  assert.equal(rufe('retouren').status, 401);
  assert.equal(rufe('retouren', { schluessel: 'quatsch.abc' }).status, 401);
  assert.equal(rufe('vorschau', { body: { entscheidungen: [] } }).status, 401);
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

test('ohne Geheimschlüssel klare Fehlermeldung', () => {
  const { k, rufe } = aufbau();
  k.einstellungen.geheimSchluessel = '';
  const r = rufe('anmelden', { body: { benutzer: 'lager1', passwort: 'Passwort-Lager1' } });
  assert.equal(r.status, 500);
  assert.match(r.daten.fehler, /geheimSchluessel/);
});

test('Retouren-Liste und Vorschau mit den Prüfbeispielen', () => {
  const { rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const liste = rufe('retouren', { schluessel: s }).daten.retouren;
  assert.deepEqual(liste.map((r) => r.id), ['50101', '50102', '50103']);
  assert.equal(liste[1].anzahl, 3);

  const v = rufe('vorschau', { schluessel: s, body: { entscheidungen: [
    { positionId: '50101-1', zustand: 'Neuwertig' },
    { positionId: '50101-1', zustand: 'Sehr gut' },
    { positionId: '50102-2', zustand: 'Neuwertig' },
    { positionId: '50102-3', zustand: 'Gut' },
    { positionId: '50103-1', zustand: 'Gut' },
    { positionId: '50102-1', zustand: 'Kein ZW' },
  ] } }).daten.vorschau;
  assert.equal(v[0].preis, 864.99); assert.equal(v[0].fall, 'normal'); assert.equal(v[0].neu, true);
  assert.equal(v[0].barcode, '4002516769965ZW1');
  assert.match(v[0].hinweise[0], /Alter ZW-Artikel 787567/);
  assert.equal(v[1].preis, 820.99); assert.equal(v[1].neu, false); assert.equal(v[1].bestehendeVarianteId, '788902');
  assert.equal(v[2].preis, 831.99); assert.equal(v[2].fall, 'a');
  assert.equal(v[3].preis, 988.99); assert.equal(v[3].fall, 'b');
  assert.equal(v[3].warnungen.length, 2, 'Mindestpreis leer + unter Einkaufspreis');
  assert.match(v[4].fehler, /nicht in Shopware/);
  assert.equal(v[5].artikel, false);
  assert.equal(v[0].name, '[Zweite Wahl] Miele H 2861-1 B 125 Edition Einbau-Backofen Edelstahl/CleanSteel');
  assert.equal(v[0].variantennummer, '[ZW] H 2861-1 B 125 Edition');
});

test('kompletter Durchlauf: anlegen, Mail, freigeben, +1, ablehnen, 9.3', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');

  // Retoure 50102: drei Positionen
  const a = rufe('anlegen', { schluessel: s, body: { retoureId: '50102', entscheidungen: [
    { positionId: '50102-1', zustand: 'Gut' },
    { positionId: '50102-2', zustand: 'Kein ZW' },
    { positionId: '50102-3', zustand: 'Neuwertig' },
  ] } });
  assert.equal(a.status, 200);
  assert.deepEqual(a.daten.ergebnisse.map((e) => e.status), ['wartet', 'kein_zw', 'wartet']);
  assert.equal(a.mails.length, 2);
  const mail = a.mails[0];
  assert.equal(mail.an, 'tobias@example.com');
  assert.match(mail.betreff, /Retoure 50102/);
  const link = mail.html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
  assert.ok(link.startsWith(BASIS + '/freigabe?p=50102-1&n=1&s='), link);

  // Doppelt anlegen ändert nichts
  const doppelt = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50102-1', zustand: 'Gut' }] } });
  assert.equal(doppelt.mails.length, 0);
  assert.match(doppelt.daten.ergebnisse[0].hinweis, /Schon entschieden/);

  // Freigabe-Seite zeigt Knöpfe, falsche Signatur wird abgewiesen
  const q = Object.fromEntries(new URL(link).searchParams);
  const seite = rufe('freigabe', { query: q });
  assert.equal(seite.status, 200);
  assert.match(seite.body, /value="freigeben"/);
  assert.equal(rufe('freigabe', { query: Object.assign({}, q, { s: 'ab' + q.s.slice(2) }) }).status, 403);

  // Freigeben → neuer ZW-Artikel 790001
  const f1 = rufe('freigabe-entscheiden', { body: Object.assign({}, q, { entscheidung: 'freigeben' }) });
  assert.match(f1.body, /ZW angelegt: 790001 \(Gut\)/);
  // Zweiter Klick auf denselben Link: schon entschieden
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q, { entscheidung: 'freigeben' }) }).body, /Schon entschieden/);

  // Zweite Mail ablehnen
  const q2 = Object.fromEntries(new URL(a.mails[1].html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')).searchParams);
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q2, { entscheidung: 'ablehnen' }) }).body, /Abgelehnt/);

  let r = rufe('retoure', { schluessel: s, query: { nr: '50102' } }).daten.retoure;
  assert.deepEqual(r.positionen.map((p) => p.status), ['angelegt', 'kein_zw', 'abgelehnt']);
  assert.equal(r.status, '9.1.1', 'abgelehnte Position ist noch offen');

  // Abgelehnte Position neu entscheiden: Nicht verkaufbar → Retoure fertig
  rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50102-3', zustand: 'Nicht verkaufbar' }] } });
  r = rufe('retoure', { schluessel: s, query: { nr: '50102' } }).daten.retoure;
  assert.equal(r.status, '9.3');
  assert.deepEqual(r.kommentare.map((x) => x.text), [
    'Kein ZW (50102-2)',
    'ZW angelegt: 790001 (Gut)',
    'ZW abgelehnt: Neuwertig (50102-3), nichts angelegt',
    'Nicht verkaufbar, an Büro (50102-3)',
    'Alle Positionen entschieden, Status 9.3',
  ]);
  assert.deepEqual(rufe('retouren', { schluessel: s }).daten.retouren.map((x) => x.id), ['50101', '50103']);

  // +1 auf bestehenden ZW-Artikel (Sehr gut existiert als 788902)
  const p = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50101-1', zustand: 'Sehr gut' }] } });
  const q3 = Object.fromEntries(new URL(p.mails[0].html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')).searchParams);
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q3, { entscheidung: 'freigeben' }) }).body, /ZW \+1: 788902 \(Sehr gut\)/);
  assert.equal(k.speicher.sim.zwArtikel['4002516769965ZW2'].bestand, 1);

  // ZW-Liste und Protokoll
  const zl = rufe('zw-liste', { schluessel: s }).daten;
  assert.deepEqual(zl.zwListe.map((z) => [z.zwVarianteId, z.neuOderPlus1, z.preis]), [['788902', '+1', 820.99], ['790001', 'neu', 1033.99]]);
  assert.ok(zl.protokoll.some((x) => x.aktion === 'freigabe' && x.ergebnis === 'abgelehnt'));
  assert.ok(zl.protokoll.every((x) => x.zeit));
});

test('Fehler (Original fehlt in Shopware) landet als Kommentar, Mailfehler setzt Position auf Fehler', () => {
  const { k, rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '50103-1', zustand: 'Gut' }, { positionId: '50103-2', zustand: 'Gut' },
  ] } });
  assert.deepEqual(a.daten.ergebnisse.map((e) => e.status), ['fehler', 'wartet']);
  zwMailfehler(k.speicher, '50103-2', 'SMTP nicht erreichbar', k.jetzt);
  const r = rufe('retoure', { schluessel: s, query: { nr: '50103' } }).daten.retoure;
  assert.deepEqual(r.positionen.map((p) => p.status), ['fehler', 'fehler']);
  assert.match(r.kommentare[0].text, /nicht in Shopware/);
  assert.match(r.kommentare[1].text, /Freigabe-Mail nicht gesendet/);
  // Fehler-Positionen dürfen neu angelegt werden
  const b = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50103-2', zustand: 'Gut' }] } });
  assert.equal(b.daten.ergebnisse[0].status, 'wartet');
  assert.equal(b.daten.ergebnisse[0].versuch, 2);
});

test('alter Freigabe-Link gilt nach neuem Versuch nicht mehr', () => {
  const { rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  const a1 = rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50101-1', zustand: 'Gut' }] } });
  const q1 = Object.fromEntries(new URL(a1.mails[0].html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&')).searchParams);
  rufe('freigabe-entscheiden', { body: Object.assign({}, q1, { entscheidung: 'ablehnen' }) });
  rufe('anlegen', { schluessel: s, body: { entscheidungen: [{ positionId: '50101-1', zustand: 'Neuwertig' }] } });
  assert.match(rufe('freigabe-entscheiden', { body: Object.assign({}, q1, { entscheidung: 'freigeben' }) }).body, /veraltet/);
});

test('Zurücksetzen nur für Admins', () => {
  const { k, rufe, anmelden } = aufbau();
  const lager = anmelden('lager1', 'Passwort-Lager1');
  rufe('anlegen', { schluessel: lager, body: { entscheidungen: [{ positionId: '50101-1', zustand: 'Kein ZW' }] } });
  assert.equal(rufe('zuruecksetzen', { schluessel: lager, body: {} }).status, 403);
  const chef = anmelden('chef', 'Passwort-Chef1');
  assert.equal(rufe('zuruecksetzen', { schluessel: chef, body: {} }).status, 200);
  assert.deepEqual(k.speicher.positionen, {});
  assert.equal(k.speicher.sim.retouren[0].status, '9.1.1');
});

test('unbekannte Retoure und unbekannte Aktion', () => {
  const { rufe, anmelden } = aufbau();
  const s = anmelden('lager1', 'Passwort-Lager1');
  assert.equal(rufe('retoure', { schluessel: s, query: { nr: '99999' } }).status, 404);
  assert.equal(rufe('retoure', { schluessel: s, query: { nr: 'R-50101' } }).status, 200);
  assert.equal(rufe('gibtsnicht', { schluessel: s }).status, 404);
  assert.equal(rufe('vorschau', { schluessel: s, body: { entscheidungen: [{ positionId: '50101-1', zustand: 'Super' }] } }).daten.vorschau[0].fehler, 'Unbekannter Zustand.');
});

test('nach dem Mailversand: Fehler landen in Speicher und Antwort', () => {
  const { k, rufe, anmelden } = aufbau();
  const { zwNachMailversand } = require('./ablauf.js');
  const s = anmelden('lager1', 'Passwort-Lager1');
  const a = rufe('anlegen', { schluessel: s, body: { entscheidungen: [
    { positionId: '50101-1', zustand: 'Gut' }, { positionId: '50102-1', zustand: 'Gut' },
  ] } });
  const neu = zwNachMailversand(a, [{ accepted: ['x'] }, { error: 'Authentication failed' }], k.speicher, k.jetzt);
  const d = JSON.parse(neu.body);
  assert.deepEqual(d.ergebnisse.map((e) => e.status), ['wartet', 'fehler']);
  assert.match(d.ergebnisse[1].meldung, /Authentication failed/);
  assert.equal(k.speicher.positionen['50102-1'].status, 'fehler');
  assert.equal(k.speicher.positionen['50101-1'].status, 'wartet');
  assert.equal(neu.mails, undefined, 'Mails gehen nicht an die Seite');
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
