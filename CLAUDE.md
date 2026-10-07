# ZW-Pipeline

- Verbindliche Quelle: Notion-Projektseite „Projekt: ZW-Pipeline“ (Arbeitsregeln, Fahrplan, Entscheidungen). Nach jedem Schritt dort Stand und Verlauf aktualisieren.
- Sprache: Deutsch, einfach und kurz. Tobias ist kein Entwickler im Hauptberuf.
- Keine Zugangsdaten im Repo. Keine Schreibzugriffe auf plenty/Shopware ohne ausdrückliches OK für genau diesen Schritt.
- `n8n/zw-pipeline-probelauf.json` nie von Hand ändern: Quellen in `logic/`, `frontend/`, `data/` ändern, dann `npm run bauen`.
- Prüfen: `npm test && npm run bauen`.
