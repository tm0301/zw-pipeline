// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version ddb3d85113
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Eine Zeile pro Schreibbefehl, in der Reihenfolge von nr. Die Felder sind die Spalten der Data Table ZW_TMP.
// Bilder vom Lager (Befehl „hochladen“) hängen als binary „datei“ am Item. In der Tabelle steht dafür ‹Bilddatei›.
return ($input.first().json.schreiben || []).map((zeile) => {
  const { datei, ...json } = zeile;
  if (!datei || !datei.daten) return { json };
  return { json, binary: { datei: { data: datei.daten, mimeType: datei.mimeType, fileName: datei.name } } };
});
