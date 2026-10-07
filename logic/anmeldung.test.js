const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const A = require('./anmeldung.js');

test('SHA-256 stimmt mit Node überein', () => {
  for (const text of ['', 'abc', 'ä€😀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)]) {
    const soll = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
    assert.equal(A.bytesZuHex(A.sha256(A.utf8(text))), soll, text.slice(0, 10));
  }
});

test('HMAC-SHA-256 stimmt mit Node überein', () => {
  for (const key of ['k', 'g'.repeat(64), 'g'.repeat(100)]) {
    const soll = crypto.createHmac('sha256', key).update('Nachricht').digest('hex');
    assert.equal(A.bytesZuHex(A.hmacSha256(A.utf8(key), A.utf8('Nachricht'))), soll);
  }
});

test('PBKDF2 stimmt mit Node überein', () => {
  const salz = crypto.randomBytes(16);
  const soll = crypto.pbkdf2Sync('Geheim 123 ä', salz, 1000, 32, 'sha256').toString('hex');
  assert.equal(A.bytesZuHex(A.pbkdf2Sha256(A.utf8('Geheim 123 ä'), new Uint8Array(salz), 1000)), soll);
});

function hashErzeugen(passwort, durchlaeufe = 10000) {
  const salz = crypto.randomBytes(16);
  const h = crypto.pbkdf2Sync(passwort, salz, durchlaeufe, 32, 'sha256').toString('hex');
  return `pbkdf2-sha256$${durchlaeufe}$${salz.toString('hex')}$${h}`;
}

test('Passwort prüfen', () => {
  const hash = hashErzeugen('Lager-2026!');
  assert.equal(A.passwortPruefen('Lager-2026!', hash), true);
  assert.equal(A.passwortPruefen('lager-2026!', hash), false);
  assert.equal(A.passwortPruefen('', hash), false);
  assert.equal(A.passwortPruefen('Lager-2026!', 'kaputt'), false);
  assert.equal(A.passwortPruefen('Lager-2026!', 'pbkdf2-sha256$10$aa$bb'), false); // zu wenige Durchläufe
});

test('Schlüssel ausstellen und prüfen', () => {
  const jetzt = 1_800_000_000_000;
  const s = A.schluesselAusstellen('geheim', { benutzer: 'tobias', name: 'Tobias Ä' }, 60, jetzt);
  const d = A.schluesselPruefen('geheim', s, jetzt + 59 * 60000);
  assert.equal(d.benutzer, 'tobias');
  assert.equal(d.name, 'Tobias Ä');
  assert.equal(A.schluesselPruefen('geheim', s, jetzt + 61 * 60000), null, 'abgelaufen');
  assert.equal(A.schluesselPruefen('anderes', s, jetzt), null, 'falsches Geheimnis');
  const [inhalt, sig] = s.split('.');
  const gefaelscht = A.utf8(JSON.stringify({ benutzer: 'chef', ablauf: jetzt + 1e9 }));
  assert.equal(A.schluesselPruefen('geheim', A.bytesZuHex(gefaelscht) + '.' + sig, jetzt), null, 'veränderter Inhalt');
  assert.equal(A.schluesselPruefen('geheim', inhalt, jetzt), null, 'ohne Signatur');
  assert.equal(A.schluesselPruefen('geheim', 'zz.' + sig, jetzt), null, 'Unsinn');
});
