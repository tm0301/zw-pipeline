const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./zw-logik.js');

// Prüfbeispiele aus Abschnitt 5 der Projektseite (Mindestpreis 865)
const PRUEFBEISPIELE = [
  { fall: 'normal', jetzt: 1099, minimum: 865, erwartet: { 'Neuwertig': 864.99, 'Sehr gut': 820.99, 'Gut': 777.99 } },
  { fall: 'a', jetzt: 849, minimum: 865, erwartet: { 'Neuwertig': 831.99, 'Sehr gut': 805.99, 'Gut': 763.99 } },
  { fall: 'b', jetzt: 1099, minimum: null, erwartet: { 'Neuwertig': 1076.99, 'Sehr gut': 1043.99, 'Gut': 988.99 } },
];

for (const b of PRUEFBEISPIELE) {
  for (const [zustand, preis] of Object.entries(b.erwartet)) {
    test(`Prüfbeispiel ${b.fall} · ${zustand} → ${preis}`, () => {
      const r = L.berechneZwPreis({ jetzigerPreis: b.jetzt, mindestpreis: b.minimum, zustand });
      assert.equal(r.preis, preis);
      assert.equal(r.fall, b.fall);
      assert.equal(r.streichpreis, b.jetzt);
    });
  }
}

test('Mindestpreis 0 zählt wie leer (Sonderfall b)', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: 1099, mindestpreis: 0, zustand: 'Gut' });
  assert.equal(r.fall, 'b');
  assert.equal(r.preis, 988.99);
});

test('jetziger Preis gleich Mindestpreis ist Sonderfall a', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: 865, mindestpreis: 865, zustand: 'Neuwertig' });
  assert.equal(r.fall, 'a');
  assert.equal(r.preis, 846.99); // 865 − 2 % = 847,70
});

test('Mindestpreis als Text mit Komma wird gelesen', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: '1099,00', mindestpreis: '865,00', zustand: 'Sehr gut' });
  assert.equal(r.preis, 820.99);
});

test('Prozente kommen aus den Einstellungen', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: 1099, mindestpreis: 865, zustand: 'Gut' }, { abschlagGut: 20 });
  assert.equal(r.preis, 691.99); // 865 − 20 % = 692,00
});

test('Warnung bei Preis unter Einkaufspreis, blockiert aber nicht', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: 1099, mindestpreis: 865, zustand: 'Gut', einkaufspreis: 820.96 });
  assert.equal(r.preis, 777.99);
  assert.equal(r.warnungen.length, 1);
  assert.match(r.warnungen[0], /unter dem Einkaufspreis 820,96/);
});

test('Warnung bei leerem Mindestpreis', () => {
  const r = L.berechneZwPreis({ jetzigerPreis: 1099, mindestpreis: '', zustand: 'Gut' });
  assert.match(r.warnungen[0], /Mindestpreis ist leer/);
});

test('ohne jetzigen Preis gibt es einen Fehler', () => {
  assert.throws(() => L.berechneZwPreis({ jetzigerPreis: null, mindestpreis: 865, zustand: 'Gut' }), /Jetziger Preis fehlt/);
});

test('Abrunden auf ,99', () => {
  assert.equal(L.abrundenAuf99(865), 864.99);
  assert.equal(L.abrundenAuf99(864.99), 864.99);
  assert.equal(L.abrundenAuf99(864.98), 863.99);
  assert.equal(L.abrundenAuf99(821.75), 820.99);
  assert.equal(L.abrundenAuf99(1099 * 0.98), 1076.99);
  assert.equal(L.abrundenAuf99(1.5), 0.99);
  assert.throws(() => L.abrundenAuf99(0.5));
});

test('Barcode = EAN + ZW1/ZW2/ZW3', () => {
  assert.equal(L.zwBarcode('4002516769965', 'Neuwertig'), '4002516769965ZW1');
  assert.equal(L.zwBarcode('4002516769965', 'Sehr gut'), '4002516769965ZW2');
  assert.equal(L.zwBarcode(' 4002516769965 ', 'Gut'), '4002516769965ZW3');
  assert.throws(() => L.zwBarcode('4002516769965ZW', 'Gut'), /Ungültige EAN/);
  assert.throws(() => L.zwBarcode('4002516769965', 'Kein ZW'), /Unbekannter Zustand/);
});

test('Variantennummer und Name bekommen das Präfix genau einmal', () => {
  assert.equal(L.zwVariantennummer('H 2861-1 B 125 Edition'), '[ZW] H 2861-1 B 125 Edition');
  assert.equal(L.zwVariantennummer('[ZW] H 2861-1 B 125 Edition'), '[ZW] H 2861-1 B 125 Edition');
  assert.equal(L.zwName('Miele H 2861-1'), '[Zweite Wahl] Miele H 2861-1');
  assert.equal(L.zwName('[Zweite Wahl] Miele H 2861-1'), '[Zweite Wahl] Miele H 2861-1');
});

test('Kommentartexte wie auf der Projektseite', () => {
  assert.equal(L.zwKommentar({ zustand: 'Neuwertig', varianteId: 787567 }), 'ZW angelegt: 787567 (Neuwertig)');
  assert.equal(L.zwKommentar({ zustand: 'Neuwertig', varianteId: 787567, plus1: true }), 'ZW +1: 787567 (Neuwertig)');
  assert.equal(L.zwKommentar({ zustand: 'Nicht verkaufbar' }), 'Nicht verkaufbar, an Büro');
});

test('gültige Entscheidungen', () => {
  for (const z of ['Neuwertig', 'Sehr gut', 'Gut', 'Nicht verkaufbar', 'Kein ZW']) assert.ok(L.istGueltigeEntscheidung(z));
  assert.ok(!L.istGueltigeEntscheidung('Wie neu'));
});

test('Grund-Pflicht, Lager-Preis und Preis-Warnungen', () => {
  const z = require('./zw-logik.js');
  assert.deepEqual(['Neuwertig', 'Sehr gut', 'Gut', 'Nicht verkaufbar', 'Kein ZW'].map(z.grundPflicht), [false, true, true, true, false]);
  assert.equal(z.lagerPreisLesen('2.237,99'), 2237.99);
  assert.equal(z.lagerPreisLesen('2237.99'), 2237.99);
  assert.equal(z.lagerPreisLesen(''), null);
  assert.throws(() => z.lagerPreisLesen('1,999'));
  assert.throws(() => z.lagerPreisLesen('0'));
  assert.deepEqual(z.zwPreisWarnungen(500, { einkaufspreis: 600, streichpreis: 499 }).length, 2);
  assert.match(z.zwKommentar({ zustand: 'Gut', varianteId: '1', grund: 'Kratzer' }), /Grund: Kratzer$/);
});
