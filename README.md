# ZW-Pipeline

Zweite-Wahl-Artikel (ZW) aus Retouren automatisch in plentymarkets und Shopware anlegen.
Das Lager wählt auf der Seite **ZW-Station** nur den Zustand. Alles andere macht n8n.

Projektseite (verbindlich): Notion „Projekt: ZW-Pipeline (Zweite-Wahl-Artikel aus Retouren)“.

## Stand

**Probelauf mit echten Daten (nur lesend).** Retouren (Status 9.1.1), Artikel, EAN und Kommentare kommen aus plenty,
Preise und Mindestpreise aus Shopware. Anmeldung, Vorschau, Freigabe-Mail, ZW-Liste und Protokoll laufen echt in n8n.
Anlegen in plenty und Shopware wird nur nachgestellt (IDs `SIM-…`). Einrichten: [docs/einrichten.md](docs/einrichten.md).

**TMP-Tabelle statt Schreiben.** Alle Schreibbefehle (plenty-Kopie, Shopware-Klon, Bestand +1, Kommentare, Status) landen als Zeilen
in der n8n Data Table `ZW_TMP`. Die IT ersetzt den Baustein „TMP-Tabelle schreiben“ später durch die echten Schreib-Bausteine:
[docs/tmp-tabelle.md](docs/tmp-tabelle.md).

## Aufbau

```
n8n/zw-pipeline-probelauf.json   Import-Datei für n8n (wird gebaut, nicht von Hand ändern)
n8n/bauen.mjs                    baut die Import-Datei aus logic/ und frontend/
logic/zw-logik.js                Preisregel, Barcode, Nummern, Kommentartexte
logic/anmeldung.js               Passwort-Hash prüfen, Schlüssel ausstellen (reines JavaScript)
logic/quellen.js                 Abfragen an plenty und Shopware planen und Antworten auslesen (nur lesend)
logic/schreibplan.js             Schreibbefehle für plenty und Shopware bauen (Trockenlauf, TMP-Tabelle)
logic/ablauf.js                  alle Aktionen der Seite (Retouren, Vorschau, Anlegen, Freigabe, ZW-Liste)
frontend/zw-station.html         die Seite für das Lager, ausgeliefert von n8n
docs/                            Anleitungen
```

Der Workflow ist **ein** n8n-Workflow mit mehreren Webhooks unter `…/webhook/zw-station/…`:
Seite, `anmelden`, `retouren`, `retoure`, `vorschau`, `anlegen`, `zw-liste`, `zw-liste-buchen`, `zuruecksetzen`, `freigabe`, `freigabe-entscheiden`.

```
Webhook → Einstellungen → Vorbereiten → Daten nötig?
   ja:   plenty A → Runde B planen → plenty B → Shopware lesen → ZW-Logik
   nein: ZW-Logik
ZW-Logik → Mails da? → Freigabe-Mail senden → Mailergebnis → Schreibbefehle da?
Schreibbefehle da? → Schreibbefehle aufteilen → TMP-Tabelle schreiben (Data Table ZW_TMP) → TMP-Ergebnis → Antwort senden
```

„Vorbereiten“ prüft die Anmeldung und plant die Abfragen. Ohne gültige Anmeldung wird nichts abgefragt.
plenty läuft über den PlentyONE-Baustein (mehrere GET-Abfragen auf einmal), Shopware über eine Produktsuche.
Die Antwort geht erst nach Mailversand und TMP-Tabelle raus, weil n8n den Stand am Ende jedes Laufs speichert.

Testlauf direkt in n8n (ohne Webhook-Adresse): Die Aktion steht dann in `body.aktion`, z. B. `{"aktion":"retouren"}`.

## Entwickeln

Node 22 oder neuer.

```bash
npm test          # Tests: Preisregel, Anmeldung, Auslesen der plenty/Shopware-Antworten, kompletter Ablauf
npm run bauen     # baut n8n/zw-pipeline-probelauf.json neu
```

Nach jeder Änderung an `logic/` oder `frontend/` neu bauen und die JSON mit committen.

## Regeln

- Keine Zugangsdaten im Repo. Zugangsdaten nur in n8n (Credentials, Baustein „Einstellungen“) oder lokal in `.env`.
- Keine Schreibzugriffe auf plenty oder Shopware ohne ausdrückliches OK von Tobias für genau diesen Schritt.
- Positions-IDs und Barcodes (EAN + ZW1/ZW2/ZW3) sind Schlüssel im Protokoll: Format nicht ändern.
