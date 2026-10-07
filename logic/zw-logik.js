// ZW-Logik: Preis, Barcode, Nummern und Kommentartexte.
// Reines JavaScript ohne Abhängigkeiten. Läuft in Node (Tests) und wird beim Bauen
// des n8n-Workflows in den Code-Baustein kopiert (siehe n8n/bauen.mjs).

/* Standardwerte. In n8n überschreibt der Baustein „Einstellungen“ diese Werte. */
const ZW_STANDARD = {
  abschlagNeuwertig: 0, // Prozent im Normalfall
  abschlagSehrGut: 5,
  abschlagGut: 10,
  abschlagNeuwertigSonderfall: 2, // Prozent bei Neuwertig, wenn Mindestpreis erreicht oder leer
};

const ZW_ZUSTAENDE = {
  'Neuwertig': { endung: 'ZW1', schluessel: 'abschlagNeuwertig' },
  'Sehr gut': { endung: 'ZW2', schluessel: 'abschlagSehrGut' },
  'Gut': { endung: 'ZW3', schluessel: 'abschlagGut' },
};

// Entscheidungen, die keinen Artikel erzeugen
const ZW_OHNE_ARTIKEL = ['Nicht verkaufbar', 'Kein ZW'];

function istZwZustand(zustand) {
  return Object.prototype.hasOwnProperty.call(ZW_ZUSTAENDE, zustand);
}

function istGueltigeEntscheidung(zustand) {
  return istZwZustand(zustand) || ZW_OHNE_ARTIKEL.includes(zustand);
}

// Größter Preis mit ,99 am Ende, der den Betrag nicht übersteigt.
// Gerechnet wird in Cent, damit keine Rundungsfehler entstehen.
function abrundenAuf99(betrag) {
  const cent = Math.round(betrag * 1e6) / 1e4; // Betrag in Cent, Fließkomma-Rauschen entfernt
  let kandidat = Math.floor(cent / 100) * 100 + 99;
  if (kandidat > cent) kandidat -= 100;
  if (kandidat < 99) throw new Error('Preis zu klein: ' + betrag);
  return kandidat / 100;
}

function zahlOderNull(wert) {
  if (wert === null || wert === undefined || wert === '') return null;
  const z = typeof wert === 'number' ? wert : Number(String(wert).replace(',', '.'));
  return Number.isFinite(z) ? z : null;
}

// Preisregel aus Abschnitt 5 der Projektseite.
// Normalfall: jetziger Preis > Mindestpreis → Mindestpreis − Abschlag.
// Sonderfall a: Mindestpreis erreicht (jetziger Preis ≤ Mindestpreis) → jetziger Preis − Abschlag.
// Sonderfall b: Mindestpreis leer oder 0 → jetziger Preis − Abschlag.
// In beiden Sonderfällen gilt bei Neuwertig der Sonderfall-Abschlag (−2 %).
function berechneZwPreis({ jetzigerPreis, mindestpreis, zustand, einkaufspreis }, einstellungen) {
  const e = Object.assign({}, ZW_STANDARD, einstellungen || {});
  if (!istZwZustand(zustand)) throw new Error('Unbekannter Zustand: ' + zustand);
  const jetzt = zahlOderNull(jetzigerPreis);
  if (jetzt === null || jetzt <= 0) throw new Error('Jetziger Preis fehlt');
  const minimum = zahlOderNull(mindestpreis);

  let fall, basis, abschlag;
  if (minimum !== null && minimum > 0 && jetzt > minimum) {
    fall = 'normal';
    basis = minimum;
    abschlag = Number(e[ZW_ZUSTAENDE[zustand].schluessel]);
  } else {
    fall = minimum !== null && minimum > 0 ? 'a' : 'b';
    basis = jetzt;
    abschlag = zustand === 'Neuwertig'
      ? Number(e.abschlagNeuwertigSonderfall)
      : Number(e[ZW_ZUSTAENDE[zustand].schluessel]);
  }

  const roh = basis * (100 - abschlag) / 100;
  const preis = abrundenAuf99(roh);
  const warnungen = [];
  if (fall === 'b') warnungen.push('Mindestpreis ist leer. Preis wurde vom jetzigen Preis berechnet.');
  const ek = zahlOderNull(einkaufspreis);
  if (ek !== null && preis < ek) {
    warnungen.push('ZW-Preis ' + euro(preis) + ' liegt unter dem Einkaufspreis ' + euro(ek) + '.');
  }
  return { preis, streichpreis: jetzt, fall, basis, abschlag, warnungen };
}

function zwBarcode(ean, zustand) {
  const sauber = String(ean || '').trim();
  if (!/^\d{8,14}$/.test(sauber)) throw new Error('Ungültige EAN: ' + ean);
  if (!istZwZustand(zustand)) throw new Error('Unbekannter Zustand: ' + zustand);
  return sauber + ZW_ZUSTAENDE[zustand].endung;
}

function mitPraefix(praefix, text) {
  const t = String(text || '').trim();
  return t.startsWith(praefix) ? t : praefix + ' ' + t;
}

function zwVariantennummer(modell) {
  return mitPraefix('[ZW]', modell);
}

function zwName(name) {
  return mitPraefix('[Zweite Wahl]', name);
}

function zwKommentar({ zustand, varianteId, plus1 }) {
  if (zustand === 'Nicht verkaufbar') return 'Nicht verkaufbar, an Büro';
  if (zustand === 'Kein ZW') return 'Kein ZW';
  return (plus1 ? 'ZW +1: ' : 'ZW angelegt: ') + varianteId + ' (' + zustand + ')';
}

function euro(betrag) {
  return betrag.toFixed(2).replace('.', ',') + ' €';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ZW_STANDARD, ZW_ZUSTAENDE, ZW_OHNE_ARTIKEL,
    istZwZustand, istGueltigeEntscheidung, abrundenAuf99, berechneZwPreis,
    zwBarcode, zwVariantennummer, zwName, zwKommentar, euro,
  };
}
