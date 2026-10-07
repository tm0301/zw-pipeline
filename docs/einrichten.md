# ZW-Pipeline in n8n einrichten (Probelauf)

Dauer: etwa 15 Minuten. Im Probelauf wird **nichts** in plenty oder Shopware geändert.
Retouren, Artikel und Preise kommen echt aus plenty und Shopware, aber **nur lesend**.
Anlegen (neuer ZW-Artikel, Bestand +1, Kommentar, Status 9.3) wird nur nachgestellt.

Der Workflow ist schon in n8n eingespielt (Projekt „Sandbox & Test“, Ordner „Zweite Wahl“). Die Schritte unten
braucht es nur bei einem neuen Import.

## 1. Workflow importieren

1. In n8n (`mykitchens.app.n8n.cloud`) einen neuen Workflow anlegen.
2. Oben rechts im Menü **…** → **Import from File** und `n8n/zw-pipeline-probelauf.json` aus diesem Repo wählen.
3. Speichern. Der Workflow heißt **ZW-Pipeline (Probelauf)**.

## 2. Zugänge prüfen

Die Zugänge (Credentials) legt die IT an. Im Workflow sind diese eingetragen:

| Baustein | Zugang |
|---|---|
| **plenty A**, **plenty B** | PlentyONE Tobi - read all (nur lesen) |
| **Shopware lesen** | SWMK_n8n_products_test read_only |
| **Freigabe-Mail senden** | E-Mail-Zugang (SMTP) |

Fehlt ein Zugang nach dem Import, im Baustein bei **Credential** auswählen.

## 3. Veröffentlichen und Seite öffnen

1. Oben rechts **Publish** (bzw. „Active“) einschalten.
2. Die Seite liegt unter `https://mykitchens.app.n8n.cloud/webhook/zw-station`.

Wichtig: Nur diese **Produktions-Adresse** (`/webhook/…`) benutzen, nicht die Test-Adresse (`/webhook-test/…`).
n8n speichert den Stand (Protokoll, offene Freigaben) nur bei Produktionsläufen.

## 4. Zugänge erzeugen

Auf der Seite **Zugang einrichten (für Tobias)** öffnen. Alles läuft nur im Browser, Passwörter werden nicht gesendet.

- Pro Person: Benutzername, Anzeigename, Passwort (mindestens 10 Zeichen) → **Eintrag erzeugen** → die Zeile kopieren.
  Für dich selbst „Admin“ anhaken (darf den Probelauf zurücksetzen).

## 5. Baustein „Einstellungen“ ausfüllen

Doppelklick auf **Einstellungen**:

| Feld | Was eintragen |
|---|---|
| `einstellungen.freigabeAn` | E-Mail-Adresse, an die die Freigabe-Mails gehen |
| `einstellungen.absender` | Absender der Mails (muss zum E-Mail-Zugang passen) |
| `einstellungen.geheimSchluessel` | **leer lassen.** Der Workflow erzeugt beim ersten Aufruf selbst einen und behält ihn. Nur füllen, falls die Seite das ausdrücklich verlangt |
| `einstellungen.benutzer` | Liste der Zugänge in eckigen Klammern, mit Komma getrennt: `[{"benutzer":"tobias",…},{"benutzer":"lager1",…}]` |
| `einstellungen.abschlag…` | Prozente der Preisregel. Nur ändern, wenn sich die Regel ändert |
| `einstellungen.statusOffen` / `statusFertig` | Retouren-Status 9.1.1 (diese Retouren zeigt die Seite) und 9.3 |
| `einstellungen.anmeldungMinuten` | Wie lange eine Anmeldung gilt (Standard 600 = 10 Stunden) |
| `einstellungen.seitenAdresse` | leer lassen (nur nötig, falls die Links in den Mails falsch sind) |
| `einstellungen.bueroAn` | E-Mail-Adresse des Büros für „Nicht verkaufbar“. Leer = geht an `freigabeAn` |
| `einstellungen.statusNichtVerkaufbar` | Status, wenn eine Position nicht verkaufbar ist: 9.1.3 (Reklamieren) |

Danach **speichern und erneut Publish**, damit die Änderung gilt.

Eine Person sperren: in ihrem Eintrag `"gesperrt":true` ergänzen oder den Eintrag löschen, dann speichern und Publish. Das wirkt sofort.

## 6. Ausprobieren

Mit einem Zugang anmelden. Die Seite zeigt die echten Retouren im Status 9.1.1.
Eine Retoure öffnen und pro Artikel einen Zustand wählen: Die Vorschau rechnet den ZW-Preis aus den echten Shopware-Preisen.
**Anlegen** schickt die Freigabe-Mail. Die Mail enthält einen Link zu einer Seite mit **Freigeben** und **Ablehnen**.

## Was der Probelauf kann

- Anmeldung pro Person, Abmelden, automatische Abmeldung nach 30 Minuten ohne Nutzung, Sperre nach 5 Fehlversuchen (15 Minuten).
- Echte Retouren im Status 9.1.1 aus plenty, mit Shop-Auftragsnummer und den Kommentaren aus plenty. Suche nach Retouren-Nr.
- Pro Artikel: Neuwertig · Sehr gut · Gut · Nicht verkaufbar · Kein ZW, mit Vorschau (Preis aus Shopware, Streichpreis,
  neu oder +1 auf einen vorhandenen ZW-Artikel in plenty, Warnungen).
- **Grund** pro Position: Pflicht bei Sehr gut, Gut und Nicht verkaufbar, freiwillig bei Neuwertig und Kein ZW. Er steht in der Mail,
  im Kommentar und in der ZW-Liste und kommt später in die Beschreibung des ZW-Artikels.
- **Preis:** Die Seite zeigt eine Empfehlung nach der Preisregel. Das Lager darf den Preis ändern. In der Freigabe-Mail stehen dann beide Preise.
- Anlegen → eine Freigabe-Mail pro Artikel → Freigeben oder Ablehnen auf einer Bestätigungsseite.
- **Nicht verkaufbar:** Info-Mail mit Grund ans Büro. Sind alle Positionen entschieden, geht die Retoure auf 9.1.3 (Reklamieren), sonst auf 9.3.
- Die Vorschau zeigt, was der ZW-Artikel in Shopware nicht vom Original übernimmt: Sale-Kategorien, Tag „flash sale“, Produktoptionen I–III.
- Nachgestellt: neue Varianten-ID (`SIM-1`, `SIM-2` …), Bestand +1, Kommentar in der Retoure, Status 9.3. In plenty und Shopware ändert sich nichts.
- Tab **ZW-Liste** (ersetzt die Excel-Liste): alle freigegebenen ZW-Artikel, Knopf **Bestand gebucht**, Suche, Filter, CSV-Export. Darunter das Protokoll.
- Fehler (z. B. Original fehlt in Shopware, Artikel ohne EAN, Mail nicht gesendet) als Kommentar. Die Position kann neu angelegt werden.
- Admins können den Probelauf im Tab ZW-Liste zurücksetzen.

## Datenschutz

- In den Workflow-Einstellungen muss „Save successful production executions“ auf **Do not save** stehen.
  Sonst speichert n8n bei jeder Anmeldung das Passwort im Klartext unter Executions. Beim Import geht diese Einstellung verloren.
- Zugangsdaten, Hashes und Schlüssel nie in Chat, Notion oder Repo kopieren.

## Bekannte Grenzen des Probelaufs

- Der Stand liegt im Speicher des Workflows (Static Data). n8n schreibt ihn erst am Ende jedes Laufs.
  Laufen zwei Aktionen genau gleichzeitig, kann eine davon verloren gehen. Für den Echtbetrieb kommen ZW-Liste und Protokoll in eine n8n Data Table (Phase 6).
- Ein erneuter Import der JSON setzt den Probelauf zurück.
- Testläufe direkt in n8n speichern nichts im Speicher des Workflows. Nur die Seite (Produktions-Adresse) merkt sich den Stand.
- Der Shopware-Zugang gehört zu einem anderen n8n-Projekt. Fällt er weg, zeigt die Vorschau „Shopware meldet: …“.
- Kein Error-Workflow: Ein Fehler im Workflow selbst taucht nur in n8n unter **Executions** auf.
- Erfolgreiche Läufe werden nicht gespeichert, weil sie Passwörter und den Geheimschlüssel enthielten. Fehlgeschlagene Läufe schon.
- Etikett und Scanner kommen später.
