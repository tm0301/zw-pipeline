# TMP-Tabelle ZW_TMP (für die IT)

Der Flow ist fertig bis zum Schreiben. Statt in plenty und Shopware zu schreiben, legt er **jeden Schreibbefehl als Zeile**
in der n8n Data Table **ZW_TMP** ab (Projekt „Sandbox & Test“). Die IT prüft den Flow und ersetzt danach den Baustein
**„TMP-Tabelle schreiben“** durch die echten Schreib-Bausteine.

## Wo im Flow

```
… → ZW-Logik → Mails da? ─ja→ Freigabe-Mails aufteilen → Freigabe-Mail senden → Mailergebnis ─┐
                         └nein──────────────────────────────────────────────────────────────┤
                                                                                             ▼
                     Schreibbefehle da? ─ja→ Schreibbefehle aufteilen → TMP-Tabelle schreiben → TMP-Ergebnis → Antwort senden
                                        └nein────────────────────────────────────────────────────────────────→ Antwort senden
```

- **Schreibbefehle aufteilen** macht aus `schreiben` (hängt an der Antwort von ZW-Logik bzw. Mailergebnis) ein Item pro Befehl.
- **TMP-Tabelle schreiben** (Data Table, Insert): **dieser Baustein wird ersetzt.**
- **TMP-Ergebnis** schreibt das Ergebnis ins Protokoll der ZW-Station und hängt einen Hinweis an die Antwort.
  Es erwartet **ein Item pro Zeile**, fehlgeschlagene Items mit `error` (wie bei „On Error: Continue“).

Gelesen wird weiter nur über die vorhandenen Lesezugänge. Es gibt keinen Baustein, der in plenty oder Shopware schreibt.

## Spalten

| Spalte | Inhalt |
|---|---|
| `lauf` | Kennung eines Aufrufs, z. B. `20261008T101500-3fa9c1`. Zeilen eines Laufs gehören zusammen |
| `nr` | Reihenfolge im Lauf (1, 2, 3 …). Genau so ausführen |
| `zeit` | Zeitpunkt (ISO, UTC) |
| `aktion` | `freigabe` (Freigeben/Ablehnen), `anlegen` (Kein ZW, Nicht verkaufbar, Fehler), `freigabe-mail` (Mail ging nicht raus), `status` (Retoure fertig) |
| `retoureId`, `positionId` | Retoure und Auftragsposition in plenty |
| `system` | `plenty`, `shopware` oder `info` |
| `titel` | Was der Befehl tut, z. B. „Barcode EAN1“ |
| `method`, `endpoint` | HTTP-Methode und Pfad. plenty: `https://plenty.mykitchens.de` + Pfad. Shopware: `https://mykitchens.de` + Pfad |
| `body` | JSON-Inhalt (als Text) |
| `hinweis` | Erklärung, z. B. welche IDs die Antwort liefert |
| `platzhalter` | Platzhalter in `endpoint`/`body`, die vorher ersetzt werden müssen |
| `status` | `offen` (zu schreiben) oder `info` (nur Hinweis, **nicht senden**) |

## Wann entstehen Zeilen

| Ereignis | Zeilen |
|---|---|
| Freigeben, neuer ZW-Artikel | Hinweise (`info`), plenty-Kopie (Artikel, Texte, Barcode, Preise, Lieferant, Lager, Kategorie, Tags, Versandprofile, Eigenschaften), Shopware-Klon (Klon, B-Ware, Sale weg, Bilder), Kommentar, ggf. Abschluss-Kommentar und Status |
| Freigeben, ZW-Artikel gibt es schon | Shopware Bestand +1 (ggf. Abverkauf an), Kommentar, ggf. Abschluss und Status. plenty-Bestand bucht das Lager |
| Ablehnen | Kommentar „ZW abgelehnt …“ |
| Kein ZW / Nicht verkaufbar | Kommentar, ggf. Abschluss und Status (9.3 bzw. 9.1.3) |
| Fehler (z. B. Original fehlt in Shopware, Mail nicht gesendet) | Kommentar „ZW-Fehler …“ |

Status-IDs stehen schon in der internen Form: 9.3 → `9.3`, 9.1.3 → `9.13`.

## Platzhalter

| Platzhalter | Woher |
|---|---|
| `‹neue Artikel-ID›`, `‹neue Varianten-ID›` | Antwort von `POST /rest/items` (Artikel-ID und ID der Hauptvariante). Die Varianten-ID ist auch die Shopware-Produktnummer und steht im Kommentar |
| `‹neue Shopware-Produkt-ID›` | Antwort von `POST /api/_action/clone/product/{id}` |
| `‹neue Medien-ID n›`, `‹Ordner ZW-Retouren›`, `‹Bilddatei›` | Bilder vom Lager. Noch offen: Die Bilder werden heute nicht zwischengespeichert (Vorschlag: Shopware-Medienordner „ZW-Retouren“) |
| `‹Shopware-ID von SIM-n›`, `‹Bestand + 1›` | Nur im Probelauf: +1 auf einen nachgestellten Artikel. Gibt es im Echtbetrieb nicht |

## Hinweise für den Umbau

- Pro `lauf` die Zeilen in der Reihenfolge `nr` ausführen, `system = info` überspringen.
  Bricht ein Befehl ab, die restlichen Befehle des Laufs nicht mehr senden und den Fehler als Kommentar in die Retoure schreiben.
- Zugänge: Zum Schreiben braucht es neue Zugänge (plenty: Artikel, Varianten, Barcodes, Tags, Texte, Lieferanten, Eigenschaften,
  Kommentare, Status. Shopware: Produkte klonen und ändern, Medien). Die vorhandenen Zugänge können nur lesen.
- `PATCH` Bestand +1: Der Wert in `body.stock` stammt vom Anlegen. Direkt vor dem Schreiben neu lesen.
- Zwischen Anlegen und Freigeben kann ein anderer ZW-Artikel mit demselben Barcode entstanden sein. Vor dem Anlegen in plenty
  nach dem Barcode suchen. Gibt es ihn schon, +1 statt neu.
- Die ZW-Station selbst (ZW-Liste, Kommentare auf der Seite) zeigt weiter die nachgestellten IDs `SIM-…`.
  Sobald echt geschrieben wird, muss die neue Varianten-ID zurück in die ZW-Liste. Das passen wir in `logic/ablauf.js` gemeinsam an.
- Code nicht im n8n-Editor ändern, sondern im Repo (`logic/`, `n8n/bauen.mjs`) und neu bauen: `npm test && npm run bauen`.
  Eigene Bausteine der IT (die neuen Schreib-Bausteine) dürfen direkt in n8n entstehen. Bitte danach Bescheid geben,
  dann übernehmen wir sie in `n8n/bauen.mjs`.
