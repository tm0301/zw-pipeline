// Trockenlauf (Phase 6.0): alle Schreibbefehle für plenty und Shopware mit echten Daten bauen, aber NICHT senden.
// Die Liste steht auf der Freigabe-Seite. So sieht Tobias vor dem ersten echten Schreiben, was angelegt würde.
// IDs, die erst beim Anlegen entstehen, stehen als Platzhalter in spitzen Klammern, z. B. ‹neue Varianten-ID›.
// Endpunkte: Lesezugriff auf dieselben Adressen am 07.10.2026 geprüft (außer variation_suppliers: Lesezugang „Forbidden“).

// NUR-NODE-ANFANG
const { zwName } = require('./zw-logik.js');
// NUR-NODE-ENDE

const NEU_ARTIKEL = '‹neue Artikel-ID›';
const NEU_VARIANTE = '‹neue Varianten-ID›';
const NEU_PRODUKT = '‹neue Shopware-Produkt-ID›';
const BILD_ORDNER = '‹Ordner ZW-Retouren›';
const BILD_DATEI = '‹Bilddatei›';

// Feste Werte aus Abschnitt 5b/6 der Projektseite (per API gelesen am 07.10.2026)
const PLENTY_ZW = { zustand: 4, zustandApi: 5, typLagerware: 0, tagBWare: 32 };
const SHOPWARE_BWARE = { kategorie: '01920f841f897e6ab196fe9fd2af50a0', tag: '019745bc913a7554aef3d1634e45c2a7' };
const SHOPWARE_ZUSTAND = { 'Neuwertig': 'likenew', 'Sehr gut': 'verygood', 'Gut': 'good' };

function befehl(system, titel, method, endpoint, body, hinweis) {
  const b = { system, titel, method, endpoint };
  if (body !== undefined) b.body = body;
  if (hinweis) b.hinweis = hinweis;
  return b;
}

function heute(jetzt) {
  return new Date(jetzt).toISOString().slice(0, 10);
}

function escText(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gerundet(x, stellen) {
  const f = Math.pow(10, stellen);
  return Math.round(x * f) / f;
}

// Shopware-Preis: brutto aus der Preisregel, netto mit demselben Steuersatz wie beim Original
function shopwarePreis(sw, brutto, streichpreis) {
  const faktor = sw.nettoFaktor || 1 / 1.19;
  const preis = { currencyId: sw.waehrungId, gross: brutto, net: gerundet(brutto * faktor, 4), linked: true };
  if (streichpreis) preis.listPrice = { currencyId: sw.waehrungId, gross: streichpreis, net: gerundet(streichpreis * faktor, 4), linked: true };
  return [preis];
}

// Beschreibung im Shopware-Klon: Grund vom Lager oben, darunter die Beschreibung des Originals
function shopwareBeschreibung(zustand, grund, original) {
  if (!grund) return null;
  return '<p><strong>Zweite Wahl (' + escText(zustand) + '):</strong> ' + escText(grund) + '</p>' + (original || '');
}

function ohneLeere(obj) {
  const o = {};
  for (const k of Object.keys(obj)) if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') o[k] = obj[k];
  return o;
}

// ---------- plenty: Kopie des Originals nachbauen ----------

function plentyNeu(v, p, hinweise) {
  const va = p.variante;
  const art = p.artikel || {};
  const schritte = [];
  const pfad = '/rest/items/' + NEU_ARTIKEL + '/variations/' + NEU_VARIANTE;

  schritte.push(befehl('plenty', 'Artikel mit Hauptvariante anlegen', 'POST', '/rest/items', ohneLeere({
    stockType: PLENTY_ZW.typLagerware,
    condition: PLENTY_ZW.zustand,
    conditionApi: PLENTY_ZW.zustandApi,
    manufacturerId: art.manufacturerId,
    producingCountryId: art.producingCountryId,
    customsTariffNumber: art.customsTariffNumber,
    variations: [ohneLeere({
      number: v.variantennummer,
      model: va.model,
      externalId: va.externalId,
      isActive: false,
      availability: va.availability,
      mainWarehouseId: va.mainWarehouseId,
      purchasePrice: va.purchasePrice,
      vatId: va.vatId,
      weightG: va.weightG,
      weightNetG: va.weightNetG,
      widthMM: va.widthMM,
      lengthMM: va.lengthMM,
      heightMM: va.heightMM,
      unit: va.unit ? { unitId: va.unit.unitId, content: va.unit.content } : null,
      variationCategories: (va.variationCategories || []).map((c) => ({ categoryId: c.categoryId })),
    })],
  }), 'Antwort liefert ' + NEU_ARTIKEL + ' und ' + NEU_VARIANTE + '. Die Varianten-ID wird die Shopware-Produktnummer.'));

  const texte = (art.texts || []).map((t) => ohneLeere({
    lang: t.lang, name: zwName(t.name1), name2: t.name2, name3: t.name3, previewDescription: t.shortDescription,
    description: t.description, technicalData: t.technicalData, metaDescription: t.metaDescription, metaKeywords: t.keywords, title: t.title,
  }));
  if (!texte.length) hinweise.push('plenty: Texte des Originals fehlen, Name aus Shopware genommen.');
  for (const t of (texte.length ? texte : [{ lang: 'de', name: v.name }])) {
    schritte.push(befehl('plenty', 'Texte (' + t.lang + ')', 'POST', pfad + '/descriptions', t));
  }

  schritte.push(befehl('plenty', 'Barcode EAN1', 'POST', pfad + '/variation_barcodes', { barcodeId: 1, code: v.barcode }));

  const preise = (va.variationSalesPrices || []).filter((x) => Number(x.price) > 0);
  for (const x of preise) {
    schritte.push(befehl('plenty', 'Verkaufspreis ' + x.salesPriceId + ' wie Original', 'POST', pfad + '/variation_sales_prices', { salesPriceId: x.salesPriceId, price: x.price }));
  }

  for (const x of va.variationSuppliers || []) {
    schritte.push(befehl('plenty', 'Lieferant ' + x.supplierId + ' wie Original', 'POST', pfad + '/variation_suppliers', ohneLeere({
      supplierId: x.supplierId, purchasePrice: x.purchasePrice, minimumPurchase: x.minimumPurchase, itemNumber: x.itemNumber,
      deliveryTimeInDays: x.deliveryTimeInDays, packagingUnit: x.packagingUnit, discount: x.discount, isDiscountable: x.isDiscountable,
    })));
  }

  for (const x of va.variationWarehouses || []) {
    schritte.push(befehl('plenty', 'Lager ' + x.warehouseId, 'POST', pfad + '/variation_warehouses', { warehouseId: x.warehouseId }));
  }

  for (const x of va.variationDefaultCategory || []) {
    schritte.push(befehl('plenty', 'Standardkategorie', 'POST', pfad + '/variation_default_categories', { branchId: x.branchId, plentyId: x.plentyId }));
  }

  const tagIds = [...new Set((va.tags || []).map((t) => Number(t.tagId)).concat([PLENTY_ZW.tagBWare]))];
  schritte.push(befehl('plenty', 'Tags wie Original + B-Ware', 'POST', '/rest/tags/relations',
    tagIds.map((tagId) => ({ tagId, tagType: 'variation', relationshipValue: NEU_VARIANTE }))));

  for (const x of p.versandprofile || []) {
    schritte.push(befehl('plenty', 'Versandprofil ' + x.profileId, 'POST', '/rest/items/' + NEU_ARTIKEL + '/item_shipping_profiles', { profileId: x.profileId }));
  }
  if (!(p.versandprofile || []).length) hinweise.push('plenty: Original hat keine Versandprofile.');

  for (const x of va.properties || []) {
    schritte.push(befehl('plenty', 'Eigenschaft ' + x.propertyId + ' wie Original', 'POST', '/rest/properties/relations', {
      propertyId: x.propertyId, relationTypeIdentifier: x.relationTypeIdentifier, relationTargetId: NEU_VARIANTE,
      relationValues: (x.relationValues || []).map((r) => ohneLeere({ lang: r.lang, value: r.value, description: r.description })),
    }));
  }

  // Einkaufspreis: wie beim Original, in der Variante und beim Lieferanten (entschieden 12.10.2026)
  if (Number(va.purchasePrice) !== Number(((va.variationSuppliers || [])[0] || {}).purchasePrice)) {
    hinweise.push('Einkaufspreis wie beim Original: Variante ' + va.purchasePrice + ', Lieferant ' + ((va.variationSuppliers || [])[0] || {}).purchasePrice + '.');
  }
  return schritte;
}

// ---------- Shopware: Original klonen und anpassen ----------

function shopwareNeu(v, sw, jetzt, hinweise) {
  const schritte = [];
  const ueberschreiben = {
    productNumber: NEU_VARIANTE,
    name: v.name,
    active: false,
    stock: 1,
    isCloseout: true,
    releaseDate: heute(jetzt),
    price: shopwarePreis(sw, v.preis, v.streichpreis),
    customFields: { custom_secondhand_condition: SHOPWARE_ZUSTAND[v.zustand] },
  };
  const beschreibung = shopwareBeschreibung(v.zustand, v.grund, sw.beschreibung);
  if (beschreibung) ueberschreiben.description = beschreibung;
  schritte.push(befehl('shopware', 'Original ' + sw.produktnummer + ' klonen', 'POST', '/api/_action/clone/product/' + sw.id,
    { overwrites: ueberschreiben, cloneChildren: false },
    'Antwort liefert ' + NEU_PRODUKT + '. Beim ersten Test inaktiv. Bilder, Eigenschaften, Zusatzfelder, Einkaufspreis, Lieferzeit, GTIN kommen mit dem Klon.'));

  schritte.push(befehl('shopware', 'Kategorie und Tag B-Ware dazu', 'PATCH', '/api/product/' + NEU_PRODUKT,
    { categories: [{ id: SHOPWARE_BWARE.kategorie }], tags: [{ id: SHOPWARE_BWARE.tag }] }));
  for (const id of sw.saleKategorieIds || []) {
    schritte.push(befehl('shopware', 'Sale-Kategorie entfernen', 'DELETE', '/api/product/' + NEU_PRODUKT + '/categories/' + id));
  }
  for (const id of sw.saleTagIds || []) {
    schritte.push(befehl('shopware', 'Sale-Tag entfernen', 'DELETE', '/api/product/' + NEU_PRODUKT + '/tags/' + id));
  }

  // Bilder vom Lager: beim Anlegen schon in den Medienordner „ZW-Retouren“ hochgeladen (bilderHochladenBefehle),
  // jetzt direkt hinter das Hauptbild. Die Bilder des Klons ab Position 1 rücken nach hinten.
  const medien = v.bilderMedien || [];
  if (medien.length) {
    schritte.push(befehl('shopware', 'Lager-Bilder als 2. Bild einsortieren', 'PATCH', '/api/product/' + NEU_PRODUKT, {
      media: medien.map((m, i) => ({ id: m.produktMediaId, mediaId: m.mediaId, position: i + 1 })),
    }, 'Vorher GET /api/product/' + NEU_PRODUKT + '/media lesen und alle Bilder außer dem Hauptbild (kleinste position) um ' + medien.length +
      ' nach hinten schieben (position + ' + medien.length + '), z. B. im selben PATCH mit ihrer id. Hauptbild (coverId) bleibt.'));
  } else if (v.bilder > 0) {
    hinweise.push('Bilder vom Lager nur in der Mail: Die Position wurde vor dem Update vom 12.10.2026 angelegt.');
  }
  return schritte;
}

// Beim Anlegen (vor der Freigabe): Bilder vom Lager in den Shopware-Medienordner „ZW-Retouren“ hochladen, noch keinem Artikel
// zugeordnet. Die Medien-IDs stehen fest (bilderMedien in ablauf.js). Die Datei hängt am Item als binary „datei“
// (Baustein „Schreibbefehle aufteilen“), in der TMP-Tabelle steht dafür ‹Bilddatei›.
function bilderHochladenBefehle(v, bilder, versuch, ordnerId) {
  const schritte = [];
  (v.bilderMedien || []).forEach((m, i) => {
    const b = bilder[i] || {};
    const endung = String(m.name || '').split('.').pop() || 'jpg';
    const datei = 'zw-' + v.retoureId + '-' + v.positionId + '-' + versuch + '-' + (i + 1);
    schritte.push(befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager: Medium anlegen', 'POST', '/api/media',
      { id: m.mediaId, mediaFolderId: ordnerId || BILD_ORDNER },
      ordnerId ? 'Ordner ZW-Retouren aus Einstellungen (shopwareBilderOrdner).' : 'Ordner ZW-Retouren in Shopware anlegen und seine ID in Einstellungen → shopwareBilderOrdner eintragen.'));
    const hoch = befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager hochladen', 'POST',
      '/api/_action/media/' + m.mediaId + '/upload?extension=' + endung + '&fileName=' + datei, BILD_DATEI,
      'Datei = binary „datei“ dieses Items (' + m.mimeType + '), als Body senden mit Content-Type ' + m.mimeType + '. Bei Ablehnung wird das Medium wieder gelöscht.');
    hoch.datei = { daten: b.daten, mimeType: m.mimeType, name: datei + '.' + endung };
    schritte.push(hoch);
  });
  return schritte;
}

// Hochgeladene Bilder wieder löschen (abgelehnt, Mail nicht gesendet oder doch nur +1)
function bilderLoeschenBefehle(medien, grund) {
  return (medien || []).map((m, i) => befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager löschen', 'DELETE', '/api/media/' + m.mediaId, undefined,
    'Grund: ' + grund + '. Das Bild wurde beim Anlegen hochgeladen und wird nicht gebraucht.'));
}

// Nach dem echten Anlegen: neue Varianten-ID in die Zeile der ZW-Liste (n8n Data Table ZW_LISTE, kein HTTP)
function zwListeBefehl(zeileId) {
  return befehl('n8n', 'ZW-Liste: neue Varianten-ID eintragen', 'UPDATE', 'Data Table ZW_LISTE, Zeile zeileId = ' + zeileId,
    { zwVarianteId: NEU_VARIANTE, probelauf: false },
    'Data-Table-Baustein „Update row(s)“, Filter zeileId = ' + zeileId + '. Im Probelauf steht dort SIM-….');
}

// ---------- Plan für eine Position ----------

// v: Vorschau der Position (mit grund, bilder, preis). o: { plenty: { variante, artikel, versandprofile }, shopware, shopwareZw }
function zwSchreibplan(v, o, jetzt) {
  const hinweise = [];
  const fehlt = [];
  let schritte = [];
  const sw = o.shopware;

  if (v.neu) {
    if (o.plenty && o.plenty.variante) schritte = schritte.concat(plentyNeu(v, o.plenty, hinweise));
    else fehlt.push('plenty-Daten des Originals ' + v.originalVarianteId);
    if (sw && sw.id) schritte = schritte.concat(shopwareNeu(v, sw, jetzt, hinweise));
    else fehlt.push('Shopware-Daten des Originals ' + v.originalVarianteId);
  } else if (v.bestehendSimuliert) {
    hinweise.push('+1 auf einen im Probelauf nachgestellten Artikel (' + v.bestehendeVarianteId + '). Im Echtbetrieb gäbe es ihn wirklich.');
    schritte.push(befehl('shopware', 'Bestand +1', 'PATCH', '/api/product/‹Shopware-ID von ' + v.bestehendeVarianteId + '›', { stock: '‹Bestand + 1›' }));
  } else if (o.shopwareZw && o.shopwareZw.id) {
    schritte.push(befehl('shopware', 'Bestand +1 auf ' + v.bestehendeVarianteId, 'PATCH', '/api/product/' + o.shopwareZw.id,
      { stock: (Number(o.shopwareZw.bestand) || 0) + 1 }, 'Bestand jetzt ' + (Number(o.shopwareZw.bestand) || 0) + '. Wird direkt vor dem Schreiben neu gelesen.'));
    if (!o.shopwareZw.abverkauf) schritte.push(befehl('shopware', 'Abverkauf an', 'PATCH', '/api/product/' + o.shopwareZw.id, { isCloseout: true }));
  } else {
    fehlt.push('ZW-Artikel ' + v.bestehendeVarianteId + ' in Shopware (gesucht über die EAN)');
  }
  if (!v.neu) hinweise.push('plenty: kein Schreibbefehl. Den Bestand bucht das Lager laut ZW-Liste.');
  return { erstellt: new Date(jetzt).toISOString(), schritte, hinweise, fehlt };
}

// Befehle an die Retoure: Kommentar und Status
function kommentarBefehl(retoureId, text) {
  return befehl('plenty', 'Kommentar in Retoure ' + retoureId, 'POST', '/rest/comments',
    { referenceType: 'order', referenceValue: Number(retoureId), text, isVisibleForContact: false });
}

// Status wie auf der Seite (9.1.3) → intern in plenty (9.13)
function statusBefehl(retoureId, status) {
  return befehl('plenty', 'Retoure ' + retoureId + ' auf Status ' + status, 'PUT', '/rest/orders/' + retoureId,
    { statusId: Number(String(status).replace(/^(\d+)\.(\d+)\.(\d+)$/, '$1.$2$3')) });
}

// Befehle an die Retoure, die bei der Entscheidung dazukommen
function retoureBefehle(retoureId, kommentar, neuerStatus) {
  const b = [kommentarBefehl(retoureId, kommentar)];
  if (neuerStatus) b.push(statusBefehl(retoureId, neuerStatus));
  return b;
}

// ---------- TMP-Tabelle: Schreibbefehle als Zeilen statt senden ----------
// Die IT ersetzt später den Baustein „TMP-Tabelle schreiben“ durch echte Schreib-Bausteine.
// Eine Zeile = ein Befehl. Zeilen eines Laufs (lauf) gehören zusammen und laufen in der Reihenfolge von nr.

// Platzhalter wie ‹neue Varianten-ID› in einem Befehl (Endpunkt und Inhalt)
function platzhalterIn(b) {
  const text = b.endpoint + ' ' + (b.body === undefined ? '' : (typeof b.body === 'string' ? b.body : JSON.stringify(b.body)));
  return [...new Set(text.match(/‹[^›]*›/g) || [])];
}

// Hinweis für die Prüfung, kein Schreibbefehl (system „info“, wird beim echten Schreiben übersprungen)
function infoZeile(titel, hinweis) {
  return { system: 'info', titel, method: '', endpoint: '', hinweis };
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

// Plan als HTML für die Freigabe-Seite
function schreibplanHtml(plan, extra) {
  if (!plan) return '';
  const schritte = plan.schritte.concat(extra || []);
  const titel = { plenty: 'plenty', shopware: 'Shopware', n8n: 'n8n' };
  return '<h2>Trockenlauf: ' + schritte.length + ' Schreibbefehle (nicht gesendet)</h2>' +
    '<p class="m">So würde n8n nach „Freigeben“ in plenty und Shopware schreiben. ‹…› sind IDs, die erst beim Anlegen entstehen.</p>' +
    (plan.fehlt.length ? '<div class="w">Fehlt für den Plan: ' + plan.fehlt.map(escText).join(', ') + '</div>' : '') +
    plan.hinweise.map((h) => '<div class="i">' + escText(h) + '</div>').join('') +
    '<ol class="plan">' + schritte.map((s) =>
      '<li><b>' + titel[s.system] + ':</b> ' + escText(s.titel) + '<br><code>' + s.method + ' ' + escText(s.endpoint) + '</code>' +
      (s.body !== undefined ? '<pre>' + escText(typeof s.body === 'string' ? s.body : JSON.stringify(s.body, null, 2)) + '</pre>' : '') +
      (s.hinweis ? '<span class="m">' + escText(s.hinweis) + '</span>' : '') + '</li>').join('') + '</ol>';
}

// NUR-NODE-ANFANG
module.exports = { NEU_VARIANTE, zwSchreibplan, bilderHochladenBefehle, bilderLoeschenBefehle, zwListeBefehl, retoureBefehle, kommentarBefehl, statusBefehl, infoZeile, tmpZeile, platzhalterIn, schreibplanHtml, shopwarePreis, shopwareBeschreibung, PLENTY_ZW, SHOPWARE_BWARE, SHOPWARE_ZUSTAND };
// NUR-NODE-ENDE
