# ZW-Pipeline

Zweite-Wahl-Artikel (ZW) aus Retouren automatisch in plentymarkets und Shopware anlegen.
Das Lager wählt auf der Seite **ZW-Station** nur den Zustand. Alles andere macht n8n.

Projektseite (verbindlich): Notion „Projekt: ZW-Pipeline (Zweite-Wahl-Artikel aus Retouren)“.

## Stand

**Probelauf** mit Beispieldaten. Anmeldung, Vorschau, Anlegen, Freigabe-Mail und Protokoll laufen echt in n8n.
plenty und Shopware werden nur nachgestellt. Einrichten: [docs/einrichten.md](docs/einrichten.md).

## Aufbau

```
n8n/zw-pipeline-probelauf.json   Import-Datei für n8n (wird gebaut, nicht von Hand ändern)
n8n/bauen.mjs                    baut die Import-Datei aus logic/, frontend/ und data/
logic/zw-logik.js                Preisregel, Barcode, Nummern, Kommentartexte
logic/anmeldung.js               Passwort-Hash prüfen, Schlüssel ausstellen (reines JavaScript)
logic/ablauf.js                  alle Aktionen der Seite (Retouren, Vorschau, Anlegen, Freigabe)
frontend/zw-station.html         die Seite für das Lager, ausgeliefert von n8n
data/beispieldaten.json          Retouren und Artikel für den Probelauf
docs/                            Anleitungen
```

Der Workflow ist **ein** n8n-Workflow mit mehreren Webhooks unter `…/webhook/zw-station/…`:
Seite, `anmelden`, `retouren`, `retoure`, `vorschau`, `anlegen`, `zw-liste`, `zuruecksetzen`, `freigabe`, `freigabe-entscheiden`.
Alle laufen über **Einstellungen → ZW-Logik**. Die Antwort geht erst nach dem Mailversand raus, weil n8n den Stand am Ende jedes Laufs speichert.

## Entwickeln

Node 22 oder neuer.

```bash
npm test          # Tests: Preisregel mit den Prüfbeispielen, Anmeldung, kompletter Ablauf
npm run bauen     # baut n8n/zw-pipeline-probelauf.json neu
```

Nach jeder Änderung an `logic/`, `frontend/` oder `data/` neu bauen und die JSON mit committen.

## Regeln

- Keine Zugangsdaten im Repo. Zugangsdaten nur in n8n (Credentials, Baustein „Einstellungen“) oder lokal in `.env`.
- Keine Schreibzugriffe auf plenty oder Shopware ohne ausdrückliches OK von Tobias für genau diesen Schritt.
- Positions-IDs und Barcodes (EAN + ZW1/ZW2/ZW3) sind Schlüssel im Protokoll: Format nicht ändern.
