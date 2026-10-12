// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version eb4a20442f
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Abfragen an plenty und Shopware planen und ihre Antworten auslesen. Nur lesend.
// Die Abfragen führt n8n aus: plenty über den PlentyONE-Baustein (mehrere Abfragen auf einmal,
// Ergebnisse in derselben Reihenfolge), Shopware über einen HTTP-Baustein (eine Suche).

// Platzhalter, wenn in einer Runde nichts zu holen ist. Liefert leere Ergebnisse.
const LEER_PLENTY = { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: 'ZW-KEINE-ABFRAGE', itemsPerPage: 1 } };

const POSITION_VERSANDKOSTEN = 6;

function anfrageVarianten(ids) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { id: ids.join(','), with: 'variationBarcodes', itemsPerPage: 100 } };
}

function anfrageArtikel(itemId) {
  return [
    { method: 'GET', endpoint: '/rest/items/' + itemId },
    { method: 'GET', endpoint: '/rest/items/' + itemId + '/item_shipping_profiles' },
  ];
}

// Artikel-IDs der Originale, in fester Reihenfolge (Runde B fragt sie in dieser Reihenfolge ab)
function artikelIdsAus(variantenAntwort) {
  return [...new Set(eintraege(variantenAntwort).map((v) => String(v.itemId)).filter((id) => /^\d+$/.test(id)))];
}

// ---------- Antworten auslesen ----------

function plentyFehler(antworten) {
  const f = (antworten || []).find((a) => a && !Array.isArray(a) && a.error);
  return f ? String(f.error) : null;
}

function eintraege(antwort) {
  if (Array.isArray(antwort)) return antwort;
  return (antwort && Array.isArray(antwort.entries)) ? antwort.entries : [];
}

// Rabatte wie „2 % Rabatt bei Vorkasse per Überweisung“ oder „Summer Sale - 75 EUR Rabatt“ stehen in plenty
// als normale Artikel-Positionen mit negativem Preis in der Retoure. Sie dürfen nicht zur Auswahl stehen.
function istRabatt(p) {
  const preis = ((p.amounts || [])[0] || {}).priceGross;
  return (typeof preis === 'number' && preis < 0) || /rabatt/i.test(String(p.orderItemName || ''));
}

function artikelPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN && !istRabatt(p))
    .map((p) => ({ positionId: String(p.id), varianteId: String(p.itemVariationId), name: p.orderItemName || '', menge: Number(p.quantity) || 1 }));
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

// ---------- Aufruf durch n8n: Abfragen für plenty Runde B ----------
const plan = $('Vorbereiten').first().json.plan;
return [{ json: { plenty: zwRundeB(plan, $input.all().map((i) => i.json)) } }];
