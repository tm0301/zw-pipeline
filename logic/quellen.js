// Abfragen an plenty und Shopware planen und ihre Antworten auslesen. Nur lesend.
// Die Abfragen führt n8n aus: plenty über den PlentyONE-Baustein (mehrere Abfragen auf einmal,
// Ergebnisse in derselben Reihenfolge), Shopware über einen HTTP-Baustein (eine Suche).

// Platzhalter, wenn in einer Runde nichts zu holen ist. Liefert leere Ergebnisse.
const LEER_PLENTY = { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: 'ZW-KEINE-ABFRAGE', itemsPerPage: 1 } };
const LEER_SHOPWARE = { limit: 1, filter: [{ type: 'equals', field: 'productNumber', value: 'ZW-KEINE-ABFRAGE' }], includes: { product: ['id'] } };
const SHOPWARE_FELDER = ['id', 'productNumber', 'name', 'ean', 'active', 'stock', 'isCloseout', 'price', 'purchasePrices', 'customFields', 'categoryIds', 'tagIds'];
const POSITION_VERSANDKOSTEN = 6;

// Sale-Kategorien und -Tags des Originals soll der ZW-Artikel in Shopware nicht bekommen (Annahme, Tobias bestätigt noch).
// IDs per API gelesen am 07.10.2026. Neue Sale-Unterkategorien müssen hier ergänzt werden (Phase 6: dynamisch laden).
const SALE_KATEGORIEN = {
  '01920f7ac35c752a8113760414000306': 'Sale',
  '019c753f7c9a7bf8a5920e6c349456ea': 'Flash Sale',
  '019c8fca63057eacaa2ff83aaeeb3db4': 'Spring Sale',
  '019f13061667716a9525667c2acb4d56': 'Summer Sale',
  '019f1355481e7d639cb8f821bd02d6a9': '75 EUR Rabatt',
  '019f13556493703cb923c03d32ef347c': '250 EUR Rabatt',
  '01a037ed9aff7e0997523b5585f46a51': 'Autumn Sale',
};
const SALE_TAGS = { '019c75c6b03378f4bb6bb46085c38bdc': 'flash sale' };
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

// Rabatte wie „2 % Rabatt bei Vorkasse per Überweisung“ oder „Summer Sale - 75 EUR Rabatt“ stehen in plenty
// als normale Artikel-Positionen mit negativem Preis in der Retoure. Sie dürfen nicht zur Auswahl stehen.
function istRabatt(p) {
  const preis = ((p.amounts || [])[0] || {}).priceGross;
  return (typeof preis === 'number' && preis < 0) || /rabatt/i.test(String(p.orderItemName || ''));
}

function rabattPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN && istRabatt(p))
    .map((p) => ({ name: p.orderItemName || '', preis: zahl(((p.amounts || [])[0] || {}).priceGross) }));
}

function artikelPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN && !istRabatt(p))
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
    nichtUebernehmen: nichtUebernehmen(p),
  };
}

// Sale-Kategorien und Sale-Tags des Originals, die der ZW-Artikel nicht bekommt.
function nichtUebernehmen(p) {
  return []
    .concat((p.categoryIds || []).filter((id) => SALE_KATEGORIEN[id]).map((id) => 'Kategorie ' + SALE_KATEGORIEN[id]))
    .concat((p.tagIds || []).filter((id) => SALE_TAGS[id]).map((id) => 'Tag ' + SALE_TAGS[id]));
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
    plentyFehler, eintraege, artikelPositionen, rabattPositionen, istRabatt, shopAuftrag, eanAusVariante, textOhneHtml, shopwareProdukt, shopwareNachNummer,
    SALE_KATEGORIEN, SALE_TAGS, nichtUebernehmen,
  };
}
