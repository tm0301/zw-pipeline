// Baut den n8n-Workflow „ZW-Pipeline (Probelauf)“ als Import-Datei.
// Aufruf: node n8n/bauen.mjs  →  n8n/zw-pipeline-probelauf.json
// Die Logik (logic/), die Seite (frontend/) und die Beispieldaten (data/) werden in die Code-Bausteine kopiert.
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

const logik = ['logic/zw-logik.js', 'logic/anmeldung.js', 'logic/ablauf.js'].map((p) => fuerN8n(lies(p))).join('\n');
const seite = lies('frontend/zw-station.html');
const beispieldaten = JSON.parse(lies('data/beispieldaten.json'));
const version = createHash('sha256').update(logik + seite + JSON.stringify(beispieldaten)).digest('hex').slice(0, 10);

const KOPF = '// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version ' + version + '\n' +
  '// Nicht hier ändern: Änderungen im Repo machen und neu bauen.\n\n';

const codeLogik = KOPF +
  'const SEITE_HTML = ' + JSON.stringify(seite) + ';\n\n' +
  'const BEISPIELDATEN = ' + JSON.stringify(beispieldaten) + ';\n\n' +
  logik + '\n' +
  '// ---------- Aufruf durch n8n ----------\n' +
  'const anfrage = $input.first().json;\n' +
  'const antwort = zwVerarbeiten(\n' +
  '  { url: anfrage.webhookUrl, query: anfrage.query, body: anfrage.body, headers: anfrage.headers },\n' +
  '  {\n' +
  '    einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData(\'global\'), jetzt: Date.now(),\n' +
  '    seiteHtml: SEITE_HTML, beispieldaten: BEISPIELDATEN,\n' +
  '    eigenerCode: () => { try { return $(\'ZW-Logik\').params.jsCode; } catch (err) { return null; } },\n' +
  '  },\n' +
  ');\n' +
  'return [{ json: antwort }];\n';

const codeMailsAufteilen = KOPF +
  '// Eine Mail pro Artikel, der auf Freigabe wartet\n' +
  'const mails = $input.first().json.mails || [];\n' +
  'return mails.map((m) => ({ json: m }));\n';

const codeMailergebnis = KOPF + logik + '\n' +
  '// Mails, die nicht rausgingen, als Fehler vermerken (das Lager kann neu anlegen). Danach antwortet „Antwort senden“.\n' +
  'const antwort = zwNachMailversand(\n' +
  '  $(\'ZW-Logik\').first().json,\n' +
  '  $input.all().map((item) => item.json),\n' +
  '  $getWorkflowStaticData(\'global\'),\n' +
  '  Date.now(),\n' +
  ');\n' +
  'return [{ json: antwort }];\n';

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
  position: [300, mitte],
  notes: 'Hier alles eintragen, was sich ändern darf: Prozente, Status, E-Mail, Benutzer, Geheimschlüssel. Siehe docs/einrichten.md im Repo.',
  notesInFlow: true,
});
verbinde('Einstellungen', 'ZW-Logik');

nodes.push({
  parameters: { jsCode: codeLogik },
  id: id('ZW-Logik'), name: 'ZW-Logik', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [560, mitte],
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
  position: [800, mitte],
});
verbinde('Mails da?', 'Freigabe-Mails aufteilen', 0);
verbinde('Mails da?', 'Antwort senden', 1);

nodes.push({
  parameters: { jsCode: codeMailsAufteilen },
  id: id('Freigabe-Mails aufteilen'), name: 'Freigabe-Mails aufteilen', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [1040, mitte - 160],
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
  position: [1280, mitte - 160], onError: 'continueRegularOutput',
  notes: 'E-Mail-Zugang (Credential) hier auswählen.', notesInFlow: true,
});
verbinde('Freigabe-Mail senden', 'Mailergebnis');

nodes.push({
  parameters: { jsCode: codeMailergebnis },
  id: id('Mailergebnis'), name: 'Mailergebnis', type: 'n8n-nodes-base.code', typeVersion: 2,
  position: [1520, mitte - 160],
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
  position: [1760, mitte],
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
