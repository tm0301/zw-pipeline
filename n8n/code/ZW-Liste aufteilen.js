// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version ebdc5a1c46
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Eine Zeile pro Eintrag für die Data Table ZW_LISTE.
return (($('Ablage').first().json.ablage || {}).zwListe || []).map((zeile) => ({ json: zeile }));
