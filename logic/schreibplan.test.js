const test = require('node:test');
const assert = require('node:assert/strict');
const { zwSchreibplan } = require('./schreibplan.js');

// Eigenschaften und Tags nach plenty-Doku (geprüft 13.10.2026)
function plan(properties, tags) {
  const v = { neu: true, name: '[Zweite Wahl] Test', variantennummer: '[ZW] T1', barcode: '4000000000000ZW1', zustand: 'Neuwertig', preis: 99.99 };
  const o = { plenty: { variante: { properties, tags }, artikel: {}, versandprofile: [] } };
  return zwSchreibplan(v, o, '2026-10-13T10:00:00Z').schritte;
}

test('Eigenschaft mit cast „selection“: ein Aufruf mit selectionRelationId', () => {
  const s = plan([{ propertyId: 5, relationTypeIdentifier: 'item', propertyRelation: { cast: 'selection' }, relationValues: [{ lang: '0', value: '7' }] }]);
  const e = s.filter((x) => x.titel.startsWith('Eigenschaft'));
  assert.equal(e.length, 1);
  assert.equal(e[0].endpoint, '/rest/properties/relations');
  assert.equal(e[0].body.selectionRelationId, 7);
});

test('Text-Eigenschaft: Relation anlegen, dann je Sprache ein Wert', () => {
  const s = plan([{ propertyId: 8, relationTypeIdentifier: 'item', propertyRelation: { cast: 'text' }, relationValues: [{ lang: 'de', value: 'Hallo' }, { lang: 'en', value: 'Hello' }] }]);
  const e = s.filter((x) => x.titel.startsWith('Eigenschaft'));
  assert.deepEqual(e.map((x) => x.endpoint), ['/rest/properties/relations', '/rest/properties/relations/values', '/rest/properties/relations/values']);
  assert.equal(e[0].body.selectionRelationId, undefined);
  assert.deepEqual(e[1].body, { propertyRelationId: '‹Relation-ID Eigenschaft 8›', lang: 'de', value: 'Hallo' });
});

test('Zahl ohne cast und mit Sprache: kein Auswahl-Aufruf', () => {
  const s = plan([{ propertyId: 9, relationTypeIdentifier: 'item', relationValues: [{ lang: 'de', value: '12' }] }]);
  assert.equal(s.filter((x) => x.titel.startsWith('Eigenschaft')).length, 2);
});

test('Tags: B-Ware kommt nur einmal dazu, ein Aufruf pro Tag', () => {
  const s = plan([], [{ tagId: 32 }, { tagId: 97 }]);
  const t = s.filter((x) => x.titel.startsWith('Tag '));
  assert.deepEqual(t.map((x) => x.body.tagId), [32, 97]);
  assert.ok(t.every((x) => x.endpoint === '/rest/tags/relationships' && x.body.relationshipValue === '‹neue Varianten-ID›'));
});
