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

## 2b. TMP-Tabelle ZW_TMP

Der Baustein **TMP-Tabelle schreiben** schreibt in die Data Table **ZW_TMP** im selben Projekt. Gibt es sie noch nicht,
unter **Data tables** anlegen, mit diesen Spalten (Typ in Klammern):
`lauf`, `nr` (Number), `zeit`, `aktion`, `retoureId`, `positionId`, `system`, `titel`, `method`, `endpoint`, `body`, `hinweis`, `platzhalter`, `status`.
Alle ohne Angabe sind Text (String). Was in den Spalten steht: [tmp-tabelle.md](tmp-tabelle.md).

## 2c. Protokoll und ZW-Liste: ZW_PROTOKOLL und ZW_LISTE

Protokoll und ZW-Liste liegen in zwei Data Tables im selben Projekt (Bausteine **ZW-Liste lesen/schreiben**, **Protokoll lesen/schreiben**):

- **ZW_PROTOKOLL:** `zeit`, `benutzer`, `aktion`, `retoureId`, `positionId`, `zustand`, `preis` (Number), `varianteId`, `ergebnis`, `meldung`
- **ZW_LISTE:** `zeileId` (Schlüssel), `datum`, `retoureId`, `positionId`, `originalVarianteId`, `zwVarianteId`, `barcode`, `name`, `zustand`, `grund`,
  `bilder` (Number), `preis` (Number), `empfehlung` (Number), `preisVomLager` (Boolean), `preisGrund`, `streichpreis` (Number), `neuOderPlus1`,
  `freigegebenVon`, `probelauf` (Boolean), `bestandGebucht` (Boolean), `gebuchtVon`, `gebuchtAm`, `lauf`

Alle ohne Angabe sind Text. Der erste echte Aufruf nach dem Update zieht Protokoll und ZW-Liste aus dem Speicher des Workflows einmalig in die Tabellen um.
„Probelauf zurücksetzen“ ändert die Tabellen nicht. Probelauf-Zeilen erkennt man in ZW_LISTE an `probelauf = true` und `zwVarianteId = SIM-…`.

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
| `einstellungen.shopwareBilderOrdner` | ID des Shopware-Medienordners „ZW-Retouren“ für die Bilder vom Lager. Leer = in ZW_TMP steht der Platzhalter ‹Ordner ZW-Retouren› |

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
- Rabatt-Positionen in der Retoure (z. B. „2 % Rabatt bei Vorkasse per Überweisung“, „Summer Sale - 75 EUR Rabatt“) stehen nicht zur Auswahl.
  Erkannt am negativen Preis oder an „Rabatt“ im Namen. Die Seite nennt sie nur als „ausgeblendet“.
- Die Vorschau zeigt, welche Sale-Kategorien und Sale-Tags der ZW-Artikel in Shopware nicht vom Original übernimmt.
- Nachgestellt: neue Varianten-ID (`SIM-1`, `SIM-2` …), Bestand +1, Kommentar in der Retoure, Status 9.3. In plenty und Shopware ändert sich nichts.
- **TMP-Tabelle:** Alles, was im Echtbetrieb geschrieben würde, steht als Zeile in der Data Table ZW_TMP (ein Befehl pro Zeile).
  Die Freigabe-Seite nennt nach dem Freigeben die Anzahl der Zeilen. Das Protokoll in der ZW-Liste zeigt jeden Lauf („tmp-tabelle“).
- Tab **ZW-Liste** (ersetzt die Excel-Liste): die neuesten 300 freigegebenen ZW-Artikel aus ZW_LISTE, Knopf **Bestand gebucht**, Suche, Filter,
  CSV-Export. Darunter die neuesten 50 Einträge aus ZW_PROTOKOLL.
- **Bilder vom Lager:** gehen als Anhang in die Mails. Bei einem neuen ZW-Artikel stehen in ZW_TMP zusätzlich die Befehle zum Hochladen
  in Shopware (beim Anlegen) und zum Einsortieren als 2. Bild (nach der Freigabe). Abgelehnt → Befehle zum Löschen.
- Fehler (z. B. Original fehlt in Shopware, Artikel ohne EAN, Mail nicht gesendet) als Kommentar. Die Position kann neu angelegt werden.
- Admins können den Probelauf im Tab ZW-Liste zurücksetzen.

## Datenschutz

- In den Workflow-Einstellungen muss „Save successful production executions“ auf **Do not save** stehen.
  Sonst speichert n8n bei jeder Anmeldung das Passwort im Klartext unter Executions. Beim Import geht diese Einstellung verloren.
- Zugangsdaten, Hashes und Schlüssel nie in Chat, Notion oder Repo kopieren.

## Bekannte Grenzen des Probelaufs

- Offene Freigaben und Positionen liegen im Speicher des Workflows (Static Data). n8n schreibt ihn erst am Ende jedes Laufs.
  Laufen zwei Aktionen genau gleichzeitig, kann eine davon verloren gehen. Protokoll und ZW-Liste liegen in Data Tables und sind davon nicht betroffen.
- Data Tables haben in n8n zusammen ein Limit von 50 MB. Bilder liegen dort nicht.
- Ein erneuter Import der JSON setzt den Probelauf zurück.
- Testläufe direkt in n8n speichern nichts im Speicher des Workflows. Nur die Seite (Produktions-Adresse) merkt sich den Stand.
- Der Shopware-Zugang gehört zu einem anderen n8n-Projekt. Fällt er weg, zeigt die Vorschau „Shopware meldet: …“.
- Kein Error-Workflow: Ein Fehler im Workflow selbst taucht nur in n8n unter **Executions** auf.
- Erfolgreiche Läufe werden nicht gespeichert, weil sie Passwörter und den Geheimschlüssel enthielten. Fehlgeschlagene Läufe schon.
- Etikett und Scanner kommen später.
