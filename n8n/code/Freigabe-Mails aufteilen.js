// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version c26bf167ea
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Eine Mail pro Artikel. Bilder vom Lager (Base64) werden zu Dateien, die „Freigabe-Mail senden“ anhängt.
const mails = $input.first().json.mails || [];
return mails.map((m) => {
  const { anhaenge, ...json } = m;
  const binary = {};
  (anhaenge || []).forEach((a, i) => { binary['bild' + (i + 1)] = { data: a.daten, mimeType: a.mimeType, fileName: a.name }; });
  json.anhangNamen = Object.keys(binary).join(',');
  return json.anhangNamen ? { json, binary } : { json };
});
