// Baut den n8n-Workflow „ZW-Pipeline (Probelauf)“ als Import-Datei.
// Aufruf: node n8n/bauen.mjs  →  n8n/zw-pipeline-probelauf.json
// Die Logik (logic/) und die Seite (frontend/) werden in die Code-Bausteine kopiert.
// plenty und Shopware werden nur gelesen: über die vorhandenen Zugänge (PlentyONE-Baustein, HTTP-Baustein mit OAuth2).
// Bitte nicht die JSON von Hand ändern, sondern die Quellen und dann neu bauen.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

// Teile, die nur für Node gedacht sind (require/module.exports), entfernen
function fuerN8n(quelle) {
  return quelle
    .replace(/\/\/ NUR-NODE-ANFANG[\s\S]*?\/\/ NUR-NODE-ENDE\n?/g, '')
    .replace(/\nif \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?\n\}\n?$/, '\n');
}

const logik = ['logic/zw-logik.js', 'logic/anmeldung.js', 'logic/quellen.js', 'logic/ablauf.js'].map((p) => fuerN8n(lies(p))).join('\n');

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
  '  if (!v || v.weiter !== \'daten\') return null;\n' +
  '  const sw = ausgabe(\'Shopware lesen\');\n' +
  '  return { plan: v.plan, a: ausgabe(\'plenty A\') || [], b: ausgabe(\'plenty B\') || [], shopware: sw && sw[0] ? sw[0] : null };\n' +
  '}\n' +
  'const anfrage = $(\'Einstellungen\').first().json;\n' +
  'const antwort = zwVerarbeiten(' + ANFRAGE + ', {\n' +
  '  einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData(\'global\'), jetzt: Date.now(),\n' +
  '  seiteHtml: SEITE_HTML, daten: geholteDaten(),\n' +
  '  eigenerCode: () => { try { return $(\'ZW-Logik\').params.jsCode; } catch (err) { return null; } },\n' +
  '});\n' +
  'return [{ json: antwort }];\n');

const codeMailsAufteilen = mitKopf(
  '// Eine Mail pro Artikel, der auf Freigabe wartet\n' +
  'const mails = $input.first().json.mails || [];\n' +
  'return mails.map((m) => ({ json: m }));\n');

const codeMailergebnis = mitKopf(nurNoetig(['zwNachMailversand']) + '\n' +
  '// Mails, die nicht rausgingen, als Fehler vermerken (das Lager kann neu anlegen). Danach antwortet „Antwort senden“.\n' +
  'const antwort = zwNachMailversand(\n' +
  '  $(\'ZW-Logik\').first().json,\n' +
  '  $input.all().map((item) => item.json),\n' +
  '  $getWorkflowStaticData(\'global\'),\n' +
  '  Date.now(),\n' +
  ');\n' +
  'return [{ json: antwort }];\n');

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
verbinde('Daten nötig?', 'ZW-Logik', 1);

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
verbinde('Mails da?', 'Antwort senden', 1);

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
    options: { appendAttribution: false },
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
verbinde('Mailergebnis', 'Antwort senden');

nodes.push({
  parameters: {
    respondWith: 'text',
    responseBody: '={{ $json.body }}',
    options: {
      responseCode: '={{ $json.status }}',
      responseHeaders: {
        entries: [
          { name: 'Content-Type', value: '={{ $json.contentType }}' },
          { name: 'Cache-Control', value: 'no-store' },
          { name: 'X-Robots-Tag', value: 'noindex' },
          { name: 'X-Frame-Options', value: 'DENY' },
          { name: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    },
  },
  id: id('Antwort senden'), name: 'Antwort senden', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
  position: [2940, mitte],
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
