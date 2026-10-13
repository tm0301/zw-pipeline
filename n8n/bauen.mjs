// Baut den n8n-Workflow „ZW-Pipeline (Probelauf)“ als Import-Datei.
// Aufruf: node n8n/bauen.mjs  →  n8n/zw-pipeline-probelauf.json
// Die Logik (logic/) und die Seite (frontend/) werden in die Code-Bausteine kopiert.
// plenty und Shopware werden nur gelesen: über die vorhandenen Zugänge (PlentyONE-Baustein, HTTP-Baustein mit OAuth2).
// Bitte nicht die JSON von Hand ändern, sondern die Quellen und dann neu bauen.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PROTOKOLL_SPALTEN, ZW_LISTE_SPALTEN, ZAHL_SPALTEN, JA_NEIN_SPALTEN } = createRequire(import.meta.url)('../logic/ablauf.js');
const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

// Teile, die nur für Node gedacht sind (require/module.exports), entfernen
function fuerN8n(quelle) {
  return quelle
    .replace(/\/\/ NUR-NODE-ANFANG[\s\S]*?\/\/ NUR-NODE-ENDE\n?/g, '')
    .replace(/\nif \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?\n\}\n?$/, '\n');
}

const logik = ['logic/zw-logik.js', 'logic/anmeldung.js', 'logic/quellen.js', 'logic/schreibplan.js', 'logic/ablauf.js'].map((p) => fuerN8n(lies(p))).join('\n');

// Die kleinen Bausteine (Vorbereiten, Runde B planen, Mailergebnis) bekommen nur die Teile, die sie brauchen:
// ausgehend von der Einstiegsfunktion alle Funktionen und Konstanten, die darin vorkommen (und deren Teile).
function teile(quelle) {
  const stuecke = [];
  let kommentar = [];
  for (const zeile of quelle.split('\n')) {
    const m = zeile.match(/^(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=)/);
    if (m) {
      stuecke.push({ name: m[1] || m[2], zeilen: kommentar.concat([zeile]) });
      kommentar = [];
    } else if (/^\/\//.test(zeile) || zeile.trim() === '') {
      kommentar.push(zeile);
    } else if (stuecke.length) {
      const letztes = stuecke[stuecke.length - 1];
      letztes.zeilen.push(...kommentar, zeile);
      kommentar = [];
    }
  }
  return stuecke.map((x) => ({ name: x.name, text: x.zeilen.join('\n').replace(/^\n+/, '').replace(/\n+$/, '') }));
}
const alleTeile = teile(logik);
function nurNoetig(einstieg) {
  const namen = new Set(alleTeile.map((x) => x.name));
  const noetig = new Set();
  const offen = [...einstieg];
  while (offen.length) {
    const name = offen.pop();
    if (noetig.has(name)) continue;
    noetig.add(name);
    const t = alleTeile.find((x) => x.name === name);
    const ohneTexte = t.text.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
    for (const w of ohneTexte.match(/[A-Za-z_$][\w$]*/g) || []) if (namen.has(w) && !noetig.has(w)) offen.push(w);
  }
  return alleTeile.filter((x) => noetig.has(x.name)).map((x) => x.text).join('\n\n') + '\n';
}
const seite = lies('frontend/zw-station.html');
// Die Seite steht als String.raw`…` im Code-Baustein. Dafür darf sie keine Backticks und kein ${ enthalten.
if (/`|\$\{/.test(seite)) throw new Error('frontend/zw-station.html darf keine Backticks und kein ${ enthalten');
const version = createHash('sha256').update(logik + seite).digest('hex').slice(0, 10);

// Kopf jedes Code-Bausteins. Die Version ist eine Prüfsumme über den Inhalt dieses Bausteins,
// so ändert sich der Kopf nur, wenn sich der Baustein wirklich ändert.
const mitKopf = (inhalt) => '// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version ' +
  createHash('sha256').update(inhalt).digest('hex').slice(0, 10) + '\n' +
  '// Nicht hier ändern: Änderungen im Repo machen und neu bauen.\n\n' + inhalt;

// Zugänge, die es in n8n schon gibt (nur lesend). Name und ID aus n8n, keine Geheimnisse.
const ZUGANG_PLENTY = { plentymarketsApi: { id: 'mF2triRKwGA42wpL', name: 'PlentyONE Tobi - read all' } };
const ZUGANG_SHOPWARE = { oAuth2Api: { id: 'YTk8Iq3jR4bhXcEI', name: 'SWMK_n8n_products_test read_only' } };
const SHOPWARE_SUCHE = 'https://mykitchens.de/api/search/product';

const ANFRAGE = '{ url: anfrage.webhookUrl, query: anfrage.query, body: anfrage.body, headers: anfrage.headers }';

const codeVorbereiten = mitKopf(nurNoetig(['zwVorbereiten']) + '\n' +
  '// ---------- Aufruf durch n8n: Welche Daten braucht diese Anfrage? ----------\n' +
  'const anfrage = $input.first().json;\n' +
  'const plan = zwVorbereiten(' + ANFRAGE + ', {\n' +
  '  einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData(\'global\'), jetzt: Date.now(),\n' +
  '});\n' +
  'return [{ json: plan }];\n');

const codeRundeB = mitKopf(nurNoetig(['zwRundeB']) + '\n' +
  '// ---------- Aufruf durch n8n: Abfragen für plenty Runde B ----------\n' +
  'const plan = $(\'Vorbereiten\').first().json.plan;\n' +
  'return [{ json: { plenty: zwRundeB(plan, $input.all().map((i) => i.json)) } }];\n');

// Alle Code-Bausteine außer ZW-Logik selbst. Ihre Prüfsummen liefert …/webhook/zw-station?pruefen=version.
const CODE_BAUSTEINE = [
  'Vorbereiten', 'Runde B planen', 'Freigabe-Mails aufteilen', 'Mailergebnis', 'Schreibbefehle aufteilen', 'TMP-Ergebnis',
  'Ablage', 'Protokoll aufteilen', 'ZW-Liste aufteilen',
];

const codeLogik = mitKopf(
  '// Die Seite der ZW-Station als Rohtext (Quelle: frontend/zw-station.html)\n' +
  'const SEITE_HTML = String.raw`' + seite + '`;\n\n' +
  logik + '\n' +
  '// ---------- Aufruf durch n8n ----------\n' +
  '// Die Daten aus plenty und Shopware gibt es nur, wenn „Daten nötig?“ den oberen Weg genommen hat.\n' +
  'function ausgabe(name) { try { return $(name).all().map((i) => i.json); } catch (err) { return null; } }\n' +
  'function geholteDaten() {\n' +
  '  let v;\n' +
  '  try { v = $(\'Vorbereiten\').first().json; } catch (err) { return null; }\n' +
  '  if (v && v.weiter === \'tabellen\') return { plan: v.plan, zwListe: ausgabe(\'ZW-Liste lesen\') || [], protokoll: ausgabe(\'Protokoll lesen\') || [] };\n' +
  '  if (!v || v.weiter !== \'daten\') return null;\n' +
  '  const sw = ausgabe(\'Shopware lesen\');\n' +
  '  return { plan: v.plan, a: ausgabe(\'plenty A\') || [], b: ausgabe(\'plenty B\') || [], shopware: sw && sw[0] ? sw[0] : null };\n' +
  '}\n' +
  'const anfrage = $(\'Einstellungen\').first().json;\n' +
  'const antwort = zwVerarbeiten(' + ANFRAGE + ', {\n' +
  '  einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData(\'global\'), jetzt: Date.now(),\n' +
  '  seiteHtml: SEITE_HTML, daten: geholteDaten(),\n' +
  '  eigenerCode: () => { try { return $(\'ZW-Logik\').params.jsCode; } catch (err) { return null; } },\n' +
  '  alleCodes: () => Object.fromEntries([' + CODE_BAUSTEINE.map((n) => '\'' + n + '\'').join(', ') + '].map((n) => {\n' +
  '    try { return [n, $(n).params.jsCode]; } catch (err) { return [n, null]; }\n' +
  '  })),\n' +
  '});\n' +
  'return [{ json: antwort }];\n');

const codeMailsAufteilen = mitKopf(
  '// Eine Mail pro Artikel. Bilder vom Lager (Base64) werden zu Dateien, die „Freigabe-Mail senden“ anhängt.\n' +
  'const mails = $input.first().json.mails || [];\n' +
  'return mails.map((m) => {\n' +
  '  const { anhaenge, ...json } = m;\n' +
  '  const binary = {};\n' +
  '  (anhaenge || []).forEach((a, i) => { binary[\'bild\' + (i + 1)] = { data: a.daten, mimeType: a.mimeType, fileName: a.name }; });\n' +
  '  json.anhangNamen = Object.keys(binary).join(\',\');\n' +
  '  return json.anhangNamen ? { json, binary } : { json };\n' +
  '});\n');

const codeMailergebnis = mitKopf(nurNoetig(['zwNachMailversand']) + '\n' +
  '// Mails, die nicht rausgingen, als Fehler vermerken (das Lager kann neu anlegen). Danach antwortet „Antwort senden“.\n' +
  'const antwort = zwNachMailversand(\n' +
  '  $(\'ZW-Logik\').first().json,\n' +
  '  $input.all().map((item) => item.json),\n' +
  '  $getWorkflowStaticData(\'global\'),\n' +
  '  Date.now(),\n' +
  ');\n' +
  'return [{ json: antwort }];\n');

// TMP-Tabelle: Statt in plenty und Shopware zu schreiben, landen alle Schreibbefehle als Zeilen in der Data Table ZW_TMP.
// Die IT ersetzt später „TMP-Tabelle schreiben“ durch die echten Schreib-Bausteine (siehe docs/tmp-tabelle.md).
const TMP_TABELLE = 'ZW_TMP';
const TMP_SPALTEN = [
  ['lauf', 'string'], ['nr', 'number'], ['zeit', 'string'], ['aktion', 'string'], ['retoureId', 'string'], ['positionId', 'string'],
  ['system', 'string'], ['titel', 'string'], ['method', 'string'], ['endpoint', 'string'], ['body', 'string'], ['hinweis', 'string'],
  ['platzhalter', 'string'], ['status', 'string'],
];

const codeSchreibbefehleAufteilen = mitKopf(
  '// Eine Zeile pro Schreibbefehl, in der Reihenfolge von nr. Die Felder sind die Spalten der Data Table ' + TMP_TABELLE + '.\n' +
  '// Bilder vom Lager (Befehl „hochladen“) hängen als binary „datei“ am Item. In der Tabelle steht dafür ‹Bilddatei›.\n' +
  'return ($input.first().json.schreiben || []).map((zeile) => {\n' +
  '  const { datei, ...json } = zeile;\n' +
  '  if (!datei || !datei.daten) return { json };\n' +
  '  return { json, binary: { datei: { data: datei.daten, mimeType: datei.mimeType, fileName: datei.name } } };\n' +
  '});\n');

const codeTmpErgebnis = mitKopf(nurNoetig(['zwNachTmp']) + '\n' +
  '// Ergebnis von „TMP-Tabelle schreiben“ ins Protokoll, Hinweis in die Antwort. Danach antwortet „Antwort senden“.\n' +
  'const antwort = zwNachTmp(\n' +
  '  $(\'Schreibbefehle da?\').first().json,\n' +
  '  $input.all().map((item) => item.json),\n' +
  '  $getWorkflowStaticData(\'global\'),\n' +
  '  Date.now(),\n' +
  ');\n' +
  'return [{ json: antwort }];\n');

// Protokoll und ZW-Liste: Data Tables ZW_PROTOKOLL und ZW_LISTE (Spalten wie in logic/ablauf.js)
const PROTOKOLL_TABELLE = 'ZW_PROTOKOLL';
const ZW_LISTE_TABELLE = 'ZW_LISTE';
const spaltenTyp = (name) => (ZAHL_SPALTEN.includes(name) ? 'number' : (JA_NEIN_SPALTEN.includes(name) ? 'boolean' : 'string'));

// Alles, was nach ZW-Logik, Mails und TMP-Tabelle an die Seite geht. Die Bausteine danach lesen von hier.
const codeAblage = mitKopf(
  '// Antwort an die Seite, dazu neue Zeilen für ZW_PROTOKOLL und ZW_LISTE (ablage). Kommt von „TMP-Ergebnis“ oder „Schreibbefehle da?“.\n' +
  'return [{ json: $input.first().json }];\n');
const codeAufteilen = (feld, tabelle) => mitKopf(
  '// Eine Zeile pro Eintrag für die Data Table ' + tabelle + '.\n' +
  'return (($(\'Ablage\').first().json.ablage || {}).' + feld + ' || []).map((zeile) => ({ json: zeile }));\n');

// Feste IDs, damit ein erneuter Import dieselben Bausteine ergibt
const id = (name) => {
  const h = createHash('sha256').update('zw-pipeline|' + name).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const WEBHOOKS = [
  ['Seite (GET)', 'GET', 'zw-station'],
  ['Anmelden (POST)', 'POST', 'zw-station/anmelden'],
  ['Retouren (GET)', 'GET', 'zw-station/retouren'],
  ['Retoure (GET)', 'GET', 'zw-station/retoure'],
  ['Vorschau (POST)', 'POST', 'zw-station/vorschau'],
  ['Anlegen (POST)', 'POST', 'zw-station/anlegen'],
  ['ZW-Liste (GET)', 'GET', 'zw-station/zw-liste'],
  ['ZW-Liste buchen (POST)', 'POST', 'zw-station/zw-liste-buchen'],
  ['Zurücksetzen (POST)', 'POST', 'zw-station/zuruecksetzen'],
  ['Freigabe-Seite (GET)', 'GET', 'zw-station/freigabe'],
  ['Freigabe entscheiden (POST)', 'POST', 'zw-station/freigabe-entscheiden'],
];

const EINSTELLUNGEN = [
  ['abschlagNeuwertig', 'number', 0],
  ['abschlagSehrGut', 'number', 5],
  ['abschlagGut', 'number', 10],
  ['abschlagNeuwertigSonderfall', 'number', 2],
  ['statusOffen', 'string', '9.1.1'],
  ['statusFertig', 'string', '9.3'],
  ['freigabeAn', 'string', ''],
  ['absender', 'string', ''],
  ['geheimSchluessel', 'string', ''],
  ['benutzer', 'string', '[]'],
  ['anmeldungMinuten', 'number', 600],
  ['seitenAdresse', 'string', ''],
  ['bueroAn', 'string', ''],
  ['statusNichtVerkaufbar', 'string', '9.1.3'],
  ['shopwareBilderOrdner', 'string', ''],
];

const nodes = [];
const connections = {};
const verbinde = (von, nach, ausgang = 0) => {
  connections[von] ??= { main: [] };
  while (connections[von].main.length <= ausgang) connections[von].main.push([]);
  connections[von].main[ausgang].push({ node: nach, type: 'main', index: 0 });
};

WEBHOOKS.forEach(([name, methode, pfad], i) => {
  nodes.push({
    parameters: { httpMethod: methode, path: pfad, responseMode: 'responseNode', options: {} },
    id: id(name), name, type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [0, i * 112], webhookId: id('webhook|' + pfad),
  });
  verbinde(name, 'Einstellungen');
});

const mitte = Math.round(((WEBHOOKS.length - 1) * 112) / 2);

nodes.push({
  parameters: {
    assignments: {
      assignments: EINSTELLUNGEN.map(([name, type, value]) => ({ id: id('einstellung|' + name), name: 'einstellungen.' + name, value, type })),
    },
    includeOtherFields: true,
    options: {},
  },
  id: id('Einstellungen'), name: 'Einstellungen', type: 'n8n-nodes-base.set', typeVersion: 3.4,
  position: [280, mitte],
  notes: 'Hier alles eintragen, was sich ändern darf: Prozente, Status, E-Mail, Benutzer, Geheimschlüssel. Siehe docs/einrichten.md im Repo.',
  notesInFlow: true,
});
verbinde('Einstellungen', 'Vorbereiten');

const code = (name, jsCode, position) => nodes.push({
  parameters: { jsCode }, id: id(name), name, type: 'n8n-nodes-base.code', typeVersion: 2, position,
});
const plenty = (name, position) => nodes.push({
  parameters: { resource: 'custom', operation: 'custom.jsonDefinition', requestJson: '={{ $json.plenty }}' },
  id: id(name), name, type: 'n8n-nodes-plentyone.Plentymarkets', typeVersion: 1, position,
  credentials: ZUGANG_PLENTY, onError: 'continueRegularOutput', alwaysOutputData: true,
  notes: 'Nur lesende Abfragen (GET). Welche, plant der Baustein davor.', notesInFlow: true,
});

code('Vorbereiten', codeVorbereiten, [520, mitte]);
verbinde('Vorbereiten', 'Daten nötig?');

nodes.push({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{
        id: id('bedingung|daten'),
        leftValue: '={{ $json.weiter === \'daten\' }}',
        rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  },
  id: id('Daten nötig?'), name: 'Daten nötig?', type: 'n8n-nodes-base.if', typeVersion: 2,
  position: [740, mitte],
});
verbinde('Daten nötig?', 'plenty A', 0);
verbinde('Daten nötig?', 'Tabellen nötig?', 1);

const wenn = (name, ausdruck, position) => nodes.push({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{
        id: id('bedingung|' + name),
        leftValue: '={{ ' + ausdruck + ' }}',
        rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  },
  id: id(name), name, type: 'n8n-nodes-base.if', typeVersion: 2, position,
});
const tabelle = (name) => ({ __rl: true, mode: 'name', value: name });
const spaltenSchema = (spalten) => spalten.map((name) => ({
  id: name, displayName: name, required: false, defaultMatch: false, display: true, type: spaltenTyp(name), canBeUsedToMatch: true,
}));
const lesen = (name, tabellenName, limit, position) => nodes.push({
  parameters: {
    resource: 'row', operation: 'get', dataTableId: tabelle(tabellenName),
    returnAll: false, limit, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC',
  },
  id: id(name), name, type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position,
  alwaysOutputData: true, executeOnce: true,
  notes: 'Nur lesen: die neuesten ' + limit + ' Zeilen.', notesInFlow: true,
});

// ZW-Liste und Protokoll lesen (nur für die Aktionen zw-liste und zw-liste-buchen)
wenn('Tabellen nötig?', '$json.weiter === \'tabellen\'', [960, mitte + 220]);
verbinde('Tabellen nötig?', 'ZW-Liste lesen', 0);
verbinde('Tabellen nötig?', 'ZW-Logik', 1);
lesen('ZW-Liste lesen', ZW_LISTE_TABELLE, 300, [1180, mitte + 220]);
verbinde('ZW-Liste lesen', 'Protokoll lesen');
lesen('Protokoll lesen', PROTOKOLL_TABELLE, 50, [1400, mitte + 220]);
verbinde('Protokoll lesen', 'ZW-Logik');

plenty('plenty A', [960, mitte - 220]);
verbinde('plenty A', 'Runde B planen');
code('Runde B planen', codeRundeB, [1180, mitte - 220]);
verbinde('Runde B planen', 'plenty B');
plenty('plenty B', [1400, mitte - 220]);
verbinde('plenty B', 'Shopware lesen');

nodes.push({
  parameters: {
    method: 'POST', url: SHOPWARE_SUCHE,
    authentication: 'genericCredentialType', genericAuthType: 'oAuth2Api',
    sendBody: true, contentType: 'json', specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($(\'Vorbereiten\').first().json.shopware) }}',
    options: {},
  },
  id: id('Shopware lesen'), name: 'Shopware lesen', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
  position: [1620, mitte - 220], credentials: ZUGANG_SHOPWARE,
  onError: 'continueRegularOutput', alwaysOutputData: true, executeOnce: true,
  notes: 'Nur Suche (lesend): Preise und Mindestpreise der Originale.', notesInFlow: true,
});
verbinde('Shopware lesen', 'ZW-Logik');

nodes.push({
  parameters: { jsCode: codeLogik },
  id: id('ZW-Logik'), name: 'ZW-Logik', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [1840, mitte],
});
verbinde('ZW-Logik', 'Mails da?');

// Antwort erst nach dem Mailversand: n8n speichert den Workflow-Speicher erst am Ende eines Laufs.
nodes.push({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{
        id: id('bedingung|mails'),
        leftValue: '={{ ($json.mails || []).length > 0 }}',
        rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  },
  id: id('Mails da?'), name: 'Mails da?', type: 'n8n-nodes-base.if', typeVersion: 2,
  position: [2060, mitte],
});
verbinde('Mails da?', 'Freigabe-Mails aufteilen', 0);
verbinde('Mails da?', 'Schreibbefehle da?', 1);

nodes.push({
  parameters: { jsCode: codeMailsAufteilen },
  id: id('Freigabe-Mails aufteilen'), name: 'Freigabe-Mails aufteilen', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [2280, mitte - 160],
});
verbinde('Freigabe-Mails aufteilen', 'Freigabe-Mail senden');

nodes.push({
  parameters: {
    fromEmail: '={{ $json.von }}',
    toEmail: '={{ $json.an }}',
    subject: '={{ $json.betreff }}',
    emailFormat: 'html',
    html: '={{ $json.html }}',
    options: { appendAttribution: false, fileAttachments: '={{ $json.anhangNamen }}' },
  },
  id: id('Freigabe-Mail senden'), name: 'Freigabe-Mail senden', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1,
  position: [2500, mitte - 160], onError: 'continueRegularOutput',
  notes: 'E-Mail-Zugang (Credential) hier auswählen.', notesInFlow: true,
});
verbinde('Freigabe-Mail senden', 'Mailergebnis');

nodes.push({
  parameters: { jsCode: codeMailergebnis },
  id: id('Mailergebnis'), name: 'Mailergebnis', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [2720, mitte - 160],
});
verbinde('Mailergebnis', 'Schreibbefehle da?');

// Schreibbefehle (plenty, Shopware, Kommentare, Status) in die TMP-Tabelle statt in die Systeme
nodes.push({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{
        id: id('bedingung|schreiben'),
        leftValue: '={{ ($json.schreiben || []).length > 0 }}',
        rightValue: '',
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  },
  id: id('Schreibbefehle da?'), name: 'Schreibbefehle da?', type: 'n8n-nodes-base.if', typeVersion: 2,
  position: [2940, mitte],
});
verbinde('Schreibbefehle da?', 'Schreibbefehle aufteilen', 0);
verbinde('Schreibbefehle da?', 'Ablage', 1);

nodes.push({
  parameters: { jsCode: codeSchreibbefehleAufteilen },
  id: id('Schreibbefehle aufteilen'), name: 'Schreibbefehle aufteilen', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [3160, mitte - 160],
});
verbinde('Schreibbefehle aufteilen', 'TMP-Tabelle schreiben');

nodes.push({
  parameters: {
    resource: 'row',
    operation: 'insert',
    dataTableId: { __rl: true, mode: 'name', value: TMP_TABELLE },
    columns: {
      mappingMode: 'autoMapInputData',
      value: {},
      matchingColumns: [],
      schema: TMP_SPALTEN.map(([name, type]) => ({
        id: name, displayName: name, required: false, defaultMatch: false, display: true, type, canBeUsedToMatch: true,
      })),
    },
    options: {},
  },
  id: id('TMP-Tabelle schreiben'), name: 'TMP-Tabelle schreiben', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [3380, mitte - 160], onError: 'continueRegularOutput', alwaysOutputData: true,
  notes: 'Platzhalter für die IT: hier kommen später die echten Schreib-Bausteine für plenty und Shopware hin. ' +
    'Eine Zeile = ein Befehl, je lauf in der Reihenfolge von nr. Zeilen mit system = info überspringen. Siehe docs/tmp-tabelle.md.',
  notesInFlow: true,
});
verbinde('TMP-Tabelle schreiben', 'TMP-Ergebnis');

nodes.push({
  parameters: { jsCode: codeTmpErgebnis },
  id: id('TMP-Ergebnis'), name: 'TMP-Ergebnis', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [3600, mitte - 160],
});
verbinde('TMP-Ergebnis', 'Ablage');

// Protokoll und ZW-Liste in die Data Tables. Das Protokoll darf scheitern (die Arbeit geht weiter),
// die ZW-Liste nicht: Scheitert sie, bricht der Lauf ab und die Seite zeigt einen Fehler.
code('Ablage', codeAblage, [3820, mitte]);
verbinde('Ablage', 'Protokoll da?');
wenn('Protokoll da?', '(($(\'Ablage\').first().json.ablage || {}).protokoll || []).length > 0', [4040, mitte]);
verbinde('Protokoll da?', 'Protokoll aufteilen', 0);
verbinde('Protokoll da?', 'ZW-Liste da?', 1);
code('Protokoll aufteilen', codeAufteilen('protokoll', PROTOKOLL_TABELLE), [4260, mitte - 160]);
verbinde('Protokoll aufteilen', 'Protokoll schreiben');
nodes.push({
  parameters: {
    resource: 'row', operation: 'insert', dataTableId: tabelle(PROTOKOLL_TABELLE),
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: spaltenSchema(PROTOKOLL_SPALTEN) },
    options: {},
  },
  id: id('Protokoll schreiben'), name: 'Protokoll schreiben', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [4480, mitte - 160], onError: 'continueRegularOutput', alwaysOutputData: true,
  notes: 'Neue Zeilen in ZW_PROTOKOLL. Ein Fehler hier hält die ZW-Station nicht auf.', notesInFlow: true,
});
verbinde('Protokoll schreiben', 'ZW-Liste da?');
wenn('ZW-Liste da?', '(($(\'Ablage\').first().json.ablage || {}).zwListe || []).length > 0', [4700, mitte]);
verbinde('ZW-Liste da?', 'ZW-Liste aufteilen', 0);
verbinde('ZW-Liste da?', 'Antwort senden', 1);
code('ZW-Liste aufteilen', codeAufteilen('zwListe', ZW_LISTE_TABELLE), [4920, mitte - 160]);
verbinde('ZW-Liste aufteilen', 'ZW-Liste schreiben');
nodes.push({
  parameters: {
    resource: 'row', operation: 'upsert', dataTableId: tabelle(ZW_LISTE_TABELLE),
    matchType: 'allConditions',
    filters: { conditions: [{ keyName: 'zeileId', condition: 'eq', keyValue: '={{ $json.zeileId }}' }] },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: spaltenSchema(ZW_LISTE_SPALTEN) },
    options: {},
  },
  id: id('ZW-Liste schreiben'), name: 'ZW-Liste schreiben', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
  position: [5140, mitte - 160],
  notes: 'Neue oder geänderte Zeilen in ZW_LISTE (Schlüssel zeileId).', notesInFlow: true,
});
verbinde('ZW-Liste schreiben', 'Antwort senden');

// Antwort an die Seite: immer die von „Ablage“, egal welcher Weg davor lief
const ANTWORT = '$(\'Ablage\').first().json';
nodes.push({
  parameters: {
    respondWith: 'text',
    responseBody: '={{ ' + ANTWORT + '.body }}',
    options: {
      responseCode: '={{ ' + ANTWORT + '.status }}',
      responseHeaders: {
        entries: [
          { name: 'Content-Type', value: '={{ ' + ANTWORT + '.contentType }}' },
          { name: 'Cache-Control', value: 'no-store' },
          { name: 'X-Robots-Tag', value: 'noindex' },
          { name: 'X-Frame-Options', value: 'DENY' },
          { name: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    },
  },
  id: id('Antwort senden'), name: 'Antwort senden', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
  position: [5360, mitte], executeOnce: true,
});

const workflow = {
  name: 'ZW-Pipeline (Probelauf)',
  nodes,
  connections,
  pinData: {},
  // Erfolgreiche Läufe nicht speichern: Sie enthielten sonst Passwörter (Anmeldung) und den Geheimschlüssel im Klartext.
  settings: { executionOrder: 'v1', saveManualExecutions: true, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all' },
  meta: { templateCredsSetupCompleted: false, zwPipelineVersion: version },
  tags: [],
};

writeFileSync(join(wurzel, 'n8n/zw-pipeline-probelauf.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log('n8n/zw-pipeline-probelauf.json gebaut, Version ' + version + ', ' + nodes.length + ' Bausteine');

// Jeder Code-Baustein zusätzlich als lesbare Datei: zum Review und zum Einfügen von Hand in n8n
// (Baustein öffnen, ganzen Code markieren, Inhalt der Datei einfügen). Danach Prüfsumme über ?pruefen=version vergleichen.
mkdirSync(join(wurzel, 'n8n/code'), { recursive: true });
const pruefsummen = {};
for (const n of nodes.filter((x) => x.parameters.jsCode)) {
  writeFileSync(join(wurzel, 'n8n/code', n.name + '.js'), n.parameters.jsCode);
  pruefsummen[n.name] = createHash('sha256').update(n.parameters.jsCode).digest('hex');
}
writeFileSync(join(wurzel, 'n8n/code/pruefsummen.json'), JSON.stringify(pruefsummen, null, 2) + '\n');
