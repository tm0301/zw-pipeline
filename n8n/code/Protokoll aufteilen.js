// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version 12a7a8d3dc
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Eine Zeile pro Eintrag für die Data Table ZW_PROTOKOLL.
return (($('Ablage').first().json.ablage || {}).protokoll || []).map((zeile) => ({ json: zeile }));
