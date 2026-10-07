const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('./quellen.js');

test('Status wie in plenty angezeigt', () => {
  assert.equal(q.plentyStatus('9.1.1'), 9.11);
  assert.equal(q.plentyStatus('9.3'), 9.3);
  assert.equal(q.plentyStatus('5'), 5);
  assert.ok(Number.isNaN(q.plentyStatus('')));
});

test('Retouren-Nummer', () => {
  assert.equal(q.retourenNummer('R-241881'), '241881');
  assert.equal(q.retourenNummer(' 241881 '), '241881');
  assert.equal(q.retourenNummer('241881; drop'), null);
  assert.equal(q.retourenNummer(''), null);
});

test('Abfragen sind nur lesend', () => {
  const alle = [].concat(q.anfrageRetourenListe({}), q.anfrageRetoure('1'), [q.anfrageVarianten(['1', '2']), q.anfrageBarcode('4002516769965ZW1'), q.LEER_PLENTY]);
  assert.ok(alle.every((a) => a.method === 'GET'));
  assert.equal(q.anfrageVarianten(['1', '2']).query.id, '1,2');
  assert.deepEqual(q.shopwareSuche(['772160', 772160]).filter[0].value, ['772160']);
  assert.equal(q.shopwareSuche([]), q.LEER_SHOPWARE);
});

test('Positionen ohne Versandkosten', () => {
  const p = q.artikelPositionen({ orderItems: [
    { id: 1, typeId: 1, itemVariationId: 5, orderItemName: 'A', quantity: 2 },
    { id: 2, typeId: 6, itemVariationId: 0, orderItemName: 'Versand' },
    { id: 3, typeId: 1, itemVariationId: 0, orderItemName: 'Gutschein' },
  ] });
  assert.deepEqual(p, [{ positionId: '1', varianteId: '5', name: 'A', menge: 2 }]);
});

test('EAN aus der Variante', () => {
  assert.equal(q.eanAusVariante({ variationBarcodes: [{ barcodeId: 2, code: '1111111111111' }, { barcodeId: 1, code: '4002516769965' }] }), '4002516769965');
  assert.equal(q.eanAusVariante({ variationBarcodes: [{ barcodeId: 2, code: '4002516769965ZW1' }], externalId: '4242005000001' }), '4242005000001');
  assert.equal(q.eanAusVariante({ variationBarcodes: [] }), null);
});

test('Text ohne HTML', () => {
  assert.equal(q.textOhneHtml('<p>Kratzer&nbsp;an<br>der <b>Tür</b> &amp; Seite</p>'), 'Kratzer an der Tür & Seite');
});

test('Shopware-Produkt auslesen', () => {
  const k = q.shopwareNachNummer({ data: [{
    id: 'x', productNumber: '772160', name: 'Backofen', ean: '4002516769965',
    price: [{ gross: 1149, listPrice: { gross: 1299 } }], purchasePrices: [{ gross: 644.11 }], customFields: { custom_price_minprice: '865,00' },
  }] });
  assert.deepEqual(k['772160'], {
    id: 'x', produktnummer: '772160', name: 'Backofen', ean: '4002516769965', preis: 1149, streichpreisAktuell: 1299,
    mindestpreis: 865, einkaufspreis: 644.11, zustand: null,
  });
  assert.deepEqual(q.shopwareNachNummer({ error: 'x' }), {});
});

test('plenty-Fehler erkennen', () => {
  assert.equal(q.plentyFehler([{ entries: [] }, []]), null);
  assert.equal(q.plentyFehler([{ error: 'Unauthorized' }]), 'Unauthorized');
});
