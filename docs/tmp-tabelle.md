# Übergabe an die IT: ZW-Pipeline mit TMP-Tabelle ZW_TMP

Stand 12.10.2026. Der Flow ist fertig bis zum Schreiben. Statt in plenty und Shopware zu schreiben, legt er **jeden Schreibbefehl
als Zeile** in der n8n Data Table **ZW_TMP** ab (Projekt „Sandbox & Test“). Die IT prüft den Flow und ersetzt danach den Baustein
**„TMP-Tabelle schreiben“** durch die echten Schreib-Bausteine.

Workflow: „ZW-Pipeline (Probelauf)“, ID `CnWHdgolMCRgbxnc`. Seite: `https://mykitchens.app.n8n.cloud/webhook/zw-station`.

## Was der Flow heute kann

- Lager meldet sich an, wählt eine Retoure (Status 9.1.1) und pro Artikel den Zustand. Grund, geänderter Preis (mit Begründung ab ±50 €) und bis zu 3 Bilder.
- Vorschau mit Preisregel, Streichpreis, „neu“ oder „+1“, Warnungen. Gelesen wird echt aus plenty und Shopware (nur lesend).
- Anlegen → Freigabe-Mail an Tobias → Freigeben/Ablehnen auf einer Bestätigungsseite. **Geschrieben wird erst nach „Freigeben“**
  (einzige Ausnahme: Bilder vom Lager werden schon beim Anlegen in einen Shopware-Medienordner geladen, noch keinem Artikel zugeordnet).
- Alle Schreibbefehle (plenty-Kopie, Shopware-Klon, Bilder, +1, Kommentare, Status) landen in **ZW_TMP**.
- Protokoll und ZW-Liste liegen in den Data Tables **ZW_PROTOKOLL** und **ZW_LISTE** (Spalten: [einrichten.md](einrichten.md), Abschnitt 2c).

## Was ihr macht (IT)

1. **Review** des Flows und der Zeilen in ZW_TMP. Ein echter Lauf mit Freigabe steht dort schon (Retoure 241698, 18 Zeilen).
2. **Zugänge zum Schreiben** als Credentials anlegen. Die vorhandenen können nur lesen.
   - plenty: Artikel, Varianten, Barcodes, Texte, Verkaufspreise, Lieferanten, Lager, Kategorien, Tags, Versandprofile, Eigenschaften, Kommentare, Auftragsstatus.
   - Shopware: Produkte klonen und ändern, Medien anlegen, hochladen und löschen.
3. **Shopware-Medienordner „ZW-Retouren“** anlegen und seine ID in **Einstellungen → `shopwareBilderOrdner`** eintragen.
4. **„TMP-Tabelle schreiben“ ersetzen** durch die Schreib-Bausteine:
   - Pro `lauf` die Zeilen in der Reihenfolge `nr` ausführen. Zeilen mit `system = info` überspringen.
   - Platzhalter (Spalte `platzhalter`) vorher ersetzen, siehe unten.
   - `system = n8n`: kein HTTP, sondern ein Data-Table-Baustein (ZW_LISTE: neue Varianten-ID eintragen).
   - Bild hochladen: Die Datei hängt am Item als **binary `datei`**. Als Body senden, Content-Type wie in `hinweis`.
5. **Fehlerweg:** Bricht ein Befehl ab, die restlichen Befehle dieses Laufs nicht mehr senden und den Fehler als Kommentar in die Retoure
   schreiben (`POST /rest/comments`, Text beginnt mit „ZW-Fehler“). Danach muss sich der Vorgang fortsetzen lassen, ohne doppelt anzulegen.
6. **Prüfung nach dem Anlegen:** plenty-Variante (über den Barcode) und Shopware-Produkt (über die Produktnummer) neu lesen und
   Nummer, Barcode, Preis und Bestand vergleichen. Abweichung = Fehler wie in Punkt 5.
7. **Ergebnis an „TMP-Ergebnis“:** ein Item pro Zeile, fehlgeschlagene Items mit `error` (wie „On Error: Continue“).
   TMP-Ergebnis schreibt das Ergebnis ins Protokoll und zeigt es auf der Freigabe-Seite.
8. **Erster echter Test** nur mit einem Testartikel und nach OK von Tobias. Der Shopware-Klon ist dabei noch inaktiv (`active: false`).

## Was später kommt (nicht Teil dieser Übergabe)

- Neue Varianten-ID auf der ZW-Station: Positionen, Kommentare und die „+1“-Erkennung auf der Seite nutzen im Probelauf noch die
  nachgestellten IDs `SIM-…` aus dem Speicher des Workflows. Sobald echt geschrieben wird, passen wir `logic/ablauf.js` gemeinsam an.
- Shopware-Klon aktiv schalten und Verkaufskanal setzen (nach dem Test).
- Texte „Probelauf“ und „Trockenlauf“ in Mails und auf der Seite entfernen.
- Etikett (PDF mit Code-128-Barcode) und Scanner im Lager.
- Pilot im Lager. Danach entscheidet Tobias, ob die Freigabe-Mail wegfallen kann.
- Error-Workflow für Fehler im Workflow selbst (heute nur unter Executions sichtbar).

## Feste Entscheidungen

- **Freigabe ist echt:** In plenty und Shopware wird erst nach „Freigeben“ geschrieben (Ausnahme: Bilder in den Medienordner, siehe oben).
- **Einkaufspreis** der ZW-Kopie wie beim Original, in der Variante und beim Lieferanten.
- **Bilder vom Lager** werden im Shopware-ZW-Artikel das 2. Bild (direkt nach dem Hauptbild). Bei „+1“ kommen sie nicht in den Artikel
  (Annahme: die Bilder des Artikels gehören zum ersten Stück), sie gehen nur in die Mail.
- plenty-Bestand bucht das Lager selbst (ZW-Liste, Knopf „Bestand gebucht“). n8n bucht in plenty keinen Bestand.

## Wo im Flow

```
… → ZW-Logik → Mails da? ─ja→ Freigabe-Mails aufteilen → Freigabe-Mail senden → Mailergebnis ─┐
                         └nein──────────────────────────────────────────────────────────────┤
                                                                                             ▼
                     Schreibbefehle da? ─ja→ Schreibbefehle aufteilen → TMP-Tabelle schreiben → TMP-Ergebnis ─┐
                                        └nein─────────────────────────────────────────────────────────────────┤
                                                                                                              ▼
   Ablage → Protokoll da? → [Protokoll aufteilen → Protokoll schreiben] → ZW-Liste da? → [ZW-Liste aufteilen → ZW-Liste schreiben] → Antwort senden
```

- **Schreibbefehle aufteilen** macht aus `schreiben` (hängt an der Antwort von ZW-Logik bzw. Mailergebnis) ein Item pro Befehl.
  Bilder hängen dabei als binary `datei` am Item.
- **TMP-Tabelle schreiben** (Data Table, Insert): **dieser Baustein wird ersetzt.**
- **TMP-Ergebnis** schreibt das Ergebnis ins Protokoll und hängt einen Hinweis an die Antwort.
  Es erwartet **ein Item pro Zeile**, fehlgeschlagene Items mit `error` (wie bei „On Error: Continue“).
- **Ablage** hält die Antwort an die Seite. Danach werden Protokoll und ZW-Liste geschrieben, dann antwortet „Antwort senden“.

Gelesen wird weiter nur über die vorhandenen Lesezugänge. Es gibt keinen Baustein, der in plenty oder Shopware schreibt.

## Spalten von ZW_TMP

| Spalte | Inhalt |
|---|---|
| `lauf` | Kennung eines Aufrufs, z. B. `20261008T101500-3fa9c1`. Zeilen eines Laufs gehören zusammen |
| `nr` | Reihenfolge im Lauf (1, 2, 3 …). Genau so ausführen |
| `zeit` | Zeitpunkt (ISO, UTC) |
| `aktion` | `anlegen` (Bilder hochladen, Kein ZW, Nicht verkaufbar, Fehler), `freigabe` (Freigeben/Ablehnen), `freigabe-mail` (Mail ging nicht raus), `status` (Retoure fertig) |
| `retoureId`, `positionId` | Retoure und Auftragsposition in plenty |
| `system` | `plenty`, `shopware`, `n8n` (Data Table ZW_LISTE) oder `info` |
| `titel` | Was der Befehl tut, z. B. „Barcode EAN1“ |
| `method`, `endpoint` | HTTP-Methode und Pfad. plenty: `https://plenty.mykitchens.de` + Pfad. Shopware: `https://mykitchens.de` + Pfad. Bei `n8n`: `UPDATE` und die Zeile in ZW_LISTE |
| `body` | JSON-Inhalt (als Text). Beim Bild-Upload `‹Bilddatei›` |
| `hinweis` | Erklärung, z. B. welche IDs die Antwort liefert |
| `platzhalter` | Platzhalter in `endpoint`/`body`, die vorher ersetzt werden müssen |
| `status` | `offen` (zu schreiben) oder `info` (nur Hinweis, **nicht senden**) |

## Wann entstehen Zeilen

| Ereignis | Zeilen |
|---|---|
| Anlegen, neuer ZW-Artikel mit Bildern | Pro Bild: Shopware `POST /api/media` (Medium im Ordner ZW-Retouren) und `POST /api/_action/media/{id}/upload` (Datei) |
| Freigeben, neuer ZW-Artikel | Hinweise (`info`), plenty-Kopie (Artikel, Texte, Barcode, Preise, Lieferant, Lager, Kategorie, Tags, Versandprofile, Eigenschaften), Shopware-Klon (Klon, B-Ware, Sale weg, Bilder als 2. Bild), Kommentar, ZW-Liste (`n8n`), ggf. Abschluss-Kommentar und Status |
| Freigeben, ZW-Artikel gibt es schon | Shopware Bestand +1 (ggf. Abverkauf an), Kommentar, ggf. Abschluss und Status. plenty-Bestand bucht das Lager. Hochgeladene Bilder löschen, falls aus „neu“ inzwischen „+1“ wurde |
| Ablehnen | Kommentar „ZW abgelehnt …“, hochgeladene Bilder löschen (`DELETE /api/media/{id}`) |
| Kein ZW / Nicht verkaufbar | Kommentar, ggf. Abschluss und Status (9.3 bzw. 9.1.3) |
| Fehler (z. B. Original fehlt in Shopware, Mail nicht gesendet) | Kommentar „ZW-Fehler …“, bei Mailfehler hochgeladene Bilder löschen |

Status-IDs stehen schon in der internen Form: 9.3 → `9.3`, 9.1.3 → `9.13`.

## Platzhalter

| Platzhalter | Woher |
|---|---|
| `‹neue Artikel-ID›`, `‹neue Varianten-ID›` | Antwort von `POST /rest/items` (Artikel-ID und ID der Hauptvariante). Die Varianten-ID ist auch die Shopware-Produktnummer und steht im Kommentar und in ZW_LISTE |
| `‹neue Shopware-Produkt-ID›` | Antwort von `POST /api/_action/clone/product/{id}` |
| `‹Bilddatei›` | binary `datei` des Items (nur beim Anlegen, nur in diesem Lauf vorhanden) |
| `‹Ordner ZW-Retouren›` | ID des Shopware-Medienordners. Verschwindet, sobald `shopwareBilderOrdner` in Einstellungen steht |
| `‹Shopware-ID von SIM-n›`, `‹Bestand + 1›` | Nur im Probelauf: +1 auf einen nachgestellten Artikel. Gibt es im Echtbetrieb nicht |

Medien-IDs (`/api/media/…`) und die IDs der Produkt-Bilder (`media[].id`) erzeugt der Flow selbst (32 Hex-Zeichen). Sie sind keine Platzhalter.

## Hinweise für den Umbau

- Bilder als 2. Bild: Vor dem `PATCH /api/product/‹neue Shopware-Produkt-ID›` mit `media` die Bilder des Klons lesen
  (`GET /api/product/‹…›/media`) und alle außer dem Hauptbild um die Anzahl der Lager-Bilder nach hinten schieben. Das Hauptbild (`coverId`) bleibt.
- `PATCH` Bestand +1: Der Wert in `body.stock` stammt vom Anlegen. Direkt vor dem Schreiben neu lesen.
- Zwischen Anlegen und Freigeben kann ein anderer ZW-Artikel mit demselben Barcode entstanden sein. Vor dem Anlegen in plenty
  nach dem Barcode suchen. Gibt es ihn schon, +1 statt neu.
- Code nicht im n8n-Editor ändern, sondern im Repo (`logic/`, `n8n/bauen.mjs`) und neu bauen: `npm test && npm run bauen`.
  Eigene Bausteine der IT (die neuen Schreib-Bausteine) dürfen direkt in n8n entstehen. Bitte danach Bescheid geben,
  dann übernehmen wir sie in `n8n/bauen.mjs`.
