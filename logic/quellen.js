// Abfragen an plenty und Shopware planen und ihre Antworten auslesen. Nur lesend.
// Die Abfragen führt n8n aus: plenty über den PlentyONE-Baustein (mehrere Abfragen auf einmal,
// Ergebnisse in derselben Reihenfolge), Shopware über einen HTTP-Baustein (eine Suche).

// Platzhalter, wenn in einer Runde nichts zu holen ist. Liefert leere Ergebnisse.
const LEER_PLENTY = { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: 'ZW-KEINE-ABFRAGE', itemsPerPage: 1 } };
const LEER_SHOPWARE = { limit: 1, filter: [{ type: 'equals', field: 'productNumber', value: 'ZW-KEINE-ABFRAGE' }], includes: { product: ['id'] } };
const SHOPWARE_FELDER = ['id', 'productNumber', 'name', 'ean', 'active', 'stock', 'isCloseout', 'price', 'purchasePrices', 'customFields', 'categoryIds', 'tagIds'];
const POSITION_VERSANDKOSTEN = 6;
const AUFTRAG_EIGENSCHAFT_EXTERNE_NR = 7; // Shop-Auftragsnummer, z. B. MK91001

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

function anfrageVarianten(ids) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { id: ids.join(','), with: 'variationBarcodes', itemsPerPage: 100 } };
}

function anfrageBarcode(code) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: code, itemsPerPage: 5 } };
}

function shopwareSuche(varianteIds) {
  const ids = [...new Set(varianteIds.map(String))];
  if (!ids.length) return LEER_SHOPWARE;
  return { limit: ids.length, filter: [{ type: 'equalsAny', field: 'productNumber', value: ids }], includes: { product: SHOPWARE_FELDER } };
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

function artikelPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN)
    .map((p) => ({ positionId: String(p.id), varianteId: String(p.itemVariationId), name: p.orderItemName || '', menge: Number(p.quantity) || 1 }));
}

function shopAuftrag(auftrag) {
  const p = (auftrag.properties || []).find((x) => Number(x.typeId) === AUFTRAG_EIGENSCHAFT_EXTERNE_NR);
  return p ? String(p.value) : '';
}

const IST_EAN = /^\d{8,14}$/;

function eanAusVariante(v) {
  const codes = (v.variationBarcodes || []).filter((b) => IST_EAN.test(String(b.code || '')));
  const eins = codes.find((b) => Number(b.barcodeId) === 1) || codes[0];
  if (eins) return String(eins.code);
  return IST_EAN.test(String(v.externalId || '')) ? String(v.externalId) : null;
}

function textOhneHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function zahl(x) {
  const n = typeof x === 'number' ? x : Number(String(x === undefined || x === null ? '' : x).replace(',', '.'));
  return x === null || x === undefined || x === '' || !Number.isFinite(n) ? null : n;
}

// Was die ZW-Logik aus einem Shopware-Produkt braucht.
function shopwareProdukt(p) {
  const preis = (p.price || [])[0] || {};
  const ek = (p.purchasePrices || [])[0] || {};
  const cf = p.customFields || {};
  return {
    id: p.id,
    produktnummer: String(p.productNumber),
    name: p.name || '',
    ean: p.ean || '',
    preis: zahl(preis.gross),
    streichpreisAktuell: preis.listPrice ? zahl(preis.listPrice.gross) : null,
    mindestpreis: zahl(cf.custom_price_minprice),
    einkaufspreis: zahl(ek.gross),
    zustand: cf.custom_secondhand_condition || null,
  };
}

function shopwareNachNummer(antwort) {
  const liste = (antwort && Array.isArray(antwort.data)) ? antwort.data : [];
  const karte = {};
  for (const p of liste) karte[String(p.productNumber)] = shopwareProdukt(p);
  return karte;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LEER_PLENTY, LEER_SHOPWARE, plentyStatus, retourenNummer,
    anfrageRetourenListe, anfrageRetoure, anfrageVarianten, anfrageBarcode, shopwareSuche,
    plentyFehler, eintraege, artikelPositionen, shopAuftrag, eanAusVariante, textOhneHtml, shopwareProdukt, shopwareNachNummer,
  };
}
