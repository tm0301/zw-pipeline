# ZW-Pipeline in n8n einrichten (Probelauf)

Dauer: etwa 15 Minuten. Im Probelauf wird **nichts** in plenty oder Shopware geändert.
Die Seite arbeitet mit Beispieldaten (`data/beispieldaten.json`). Echt sind nur die Anmeldung und die Freigabe-Mails.

## 1. Workflow importieren

1. In n8n (`mykitchens.app.n8n.cloud`) einen neuen Workflow anlegen.
2. Oben rechts im Menü **…** → **Import from File** und `n8n/zw-pipeline-probelauf.json` aus diesem Repo wählen.
3. Speichern. Der Workflow heißt **ZW-Pipeline (Probelauf)**.

## 2. E-Mail-Zugang wählen

Doppelklick auf **Freigabe-Mail senden** → bei **Credential** deinen E-Mail-Zugang (SMTP) auswählen.

Falls dein Zugang ein Gmail- oder Outlook-Zugang ist (kein SMTP): Sag mir Bescheid, dann tausche ich den Baustein
gegen „Gmail → Send“ bzw. „Microsoft Outlook → Send“ aus.

## 3. Veröffentlichen und Seite öffnen

1. Oben rechts **Publish** (bzw. „Active“) einschalten.
2. Die Seite liegt unter `https://mykitchens.app.n8n.cloud/webhook/zw-station`.

Wichtig: Nur diese **Produktions-Adresse** (`/webhook/…`) benutzen, nicht die Test-Adresse (`/webhook-test/…`).
n8n speichert den Stand (Protokoll, offene Freigaben) nur bei Produktionsläufen.

## 4. Geheimschlüssel und Zugänge erzeugen

Auf der Seite **Zugang einrichten (für Tobias)** öffnen. Alles läuft nur im Browser, Passwörter werden nicht gesendet.

- **Geheimschlüssel erzeugen** → den Text kopieren.
- Pro Person: Benutzername, Anzeigename, Passwort (mindestens 10 Zeichen) → **Eintrag erzeugen** → die Zeile kopieren.
  Für dich selbst „Admin“ anhaken (darf den Probelauf zurücksetzen).

## 5. Baustein „Einstellungen“ ausfüllen

Doppelklick auf **Einstellungen**:

| Feld | Was eintragen |
|---|---|
| `einstellungen.freigabeAn` | E-Mail-Adresse, an die die Freigabe-Mails gehen |
| `einstellungen.absender` | Absender der Mails (muss zum E-Mail-Zugang passen) |
| `einstellungen.geheimSchluessel` | Geheimschlüssel aus Schritt 4 (mindestens 32 Zeichen) |
| `einstellungen.benutzer` | Liste der Zugänge in eckigen Klammern, mit Komma getrennt: `[{"benutzer":"tobias",…},{"benutzer":"lager1",…}]` |
| `einstellungen.abschlag…` | Prozente der Preisregel. Nur ändern, wenn sich die Regel ändert |
| `einstellungen.statusOffen` / `statusFertig` | Retouren-Status 9.1.1 und 9.3 |
| `einstellungen.anmeldungMinuten` | Wie lange eine Anmeldung gilt (Standard 600 = 10 Stunden) |
| `einstellungen.seitenAdresse` | leer lassen (nur nötig, falls die Links in den Mails falsch sind) |

Danach **speichern und erneut Publish**, damit die Änderung gilt.

Eine Person sperren: in ihrem Eintrag `"gesperrt":true` ergänzen oder den Eintrag löschen, dann speichern und Publish. Das wirkt sofort.

## 6. Ausprobieren

Mit einem Zugang anmelden und eine Beispiel-Retoure durchspielen:
50101 (ein Artikel, Normalfall), 50102 (drei Artikel: Sonderfall a, Sonderfall b mit Warnung), 50103 (ein Fehlerfall).
Die Freigabe-Mail enthält einen Link zu einer Seite mit **Freigeben** und **Ablehnen**.

## Was der Probelauf kann

- Anmeldung pro Person, Abmelden, automatische Abmeldung nach 30 Minuten ohne Nutzung, Sperre nach 5 Fehlversuchen (15 Minuten).
- Retouren im Status 9.1.1, Suche nach Retouren-Nr.
- Pro Artikel: Neuwertig · Sehr gut · Gut · Nicht verkaufbar · Kein ZW, mit Vorschau (Preis, Streichpreis, neu oder +1, Warnungen).
- Anlegen → eine Freigabe-Mail pro Artikel → Freigeben oder Ablehnen auf einer Bestätigungsseite.
- Nachgestellt: neue Varianten-ID, Bestand +1, Kommentar in der Retoure, Status 9.3, Zeile in der ZW-Liste, Protokoll.
- Fehler (z. B. Original fehlt in Shopware, Mail nicht gesendet) als Kommentar in der Retoure. Die Position kann neu angelegt werden.
- Admins können den Probelauf unter „ZW-Liste und Protokoll“ zurücksetzen.

## Bekannte Grenzen des Probelaufs

- Der Stand liegt im Speicher des Workflows (Static Data). n8n schreibt ihn erst am Ende jedes Laufs.
  Laufen zwei Aktionen genau gleichzeitig, kann eine davon verloren gehen. Für den Echtbetrieb kommt das Protokoll in eine n8n Data Table.
- Ein erneuter Import der JSON setzt den Probelauf zurück.
- Kein Error-Workflow: Ein Fehler im Workflow selbst taucht nur in n8n unter **Executions** auf.
- Erfolgreiche Läufe werden nicht gespeichert, weil sie Passwörter und den Geheimschlüssel enthielten. Fehlgeschlagene Läufe schon.
- Etikett und Scanner kommen später.
