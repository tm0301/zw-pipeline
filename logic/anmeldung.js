// Anmeldung: Passwort-Hash prüfen und zeitlich begrenzte Schlüssel (Tokens) ausstellen.
// Bewusst reines JavaScript (SHA-256, HMAC, PBKDF2), weil der n8n-Code-Baustein
// je nach Einstellung keine Node-Module wie „crypto“ laden darf.
// Gleiches Verfahren wie im Browser (Web Crypto PBKDF2-SHA-256), siehe tools/zugang-erzeugen.html.

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8(text) {
  const s = unescape(encodeURIComponent(String(text)));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function hexZuBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function bytesZuHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
  return s;
}

function sha256(daten) {
  const laenge = daten.length;
  const bloecke = Math.ceil((laenge + 9) / 64);
  const m = new Uint8Array(bloecke * 64);
  m.set(daten);
  m[laenge] = 0x80;
  const bits = laenge * 8;
  m[m.length - 4] = (bits >>> 24) & 0xff;
  m[m.length - 3] = (bits >>> 16) & 0xff;
  m[m.length - 2] = (bits >>> 8) & 0xff;
  m[m.length - 1] = bits & 0xff;
  m[m.length - 5] = Math.floor(bits / 0x100000000) & 0xff;

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);
  for (let b = 0; b < bloecke; b++) {
    for (let i = 0; i < 16; i++) {
      const j = b * 64 + i * 4;
      w[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (h[i] >>> 24) & 0xff; out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff; out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

function hmacSha256(schluessel, nachricht) {
  let k = schluessel.length > 64 ? sha256(schluessel) : schluessel;
  const innen = new Uint8Array(64 + nachricht.length);
  const aussen = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    const kb = i < k.length ? k[i] : 0;
    innen[i] = kb ^ 0x36;
    aussen[i] = kb ^ 0x5c;
  }
  innen.set(nachricht, 64);
  aussen.set(sha256(innen), 64);
  return sha256(aussen);
}

function pbkdf2Sha256(passwort, salz, durchlaeufe) {
  // Ein Block (32 Byte) reicht für den Hash.
  const s = new Uint8Array(salz.length + 4);
  s.set(salz);
  s[salz.length + 3] = 1;
  let u = hmacSha256(passwort, s);
  const t = u.slice();
  for (let i = 1; i < durchlaeufe; i++) {
    u = hmacSha256(passwort, u);
    for (let j = 0; j < 32; j++) t[j] ^= u[j];
  }
  return t;
}

// Vergleich in konstanter Zeit, damit die Antwortzeit nichts verrät.
function gleich(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Format: pbkdf2-sha256$<Durchläufe>$<Salz hex>$<Hash hex>
function passwortPruefen(passwort, gespeicherterHash) {
  const teile = String(gespeicherterHash || '').split('$');
  if (teile.length !== 4 || teile[0] !== 'pbkdf2-sha256') return false;
  const durchlaeufe = parseInt(teile[1], 10);
  if (!(durchlaeufe >= 1000 && durchlaeufe <= 200000)) return false;
  const ist = bytesZuHex(pbkdf2Sha256(utf8(passwort), hexZuBytes(teile[2]), durchlaeufe));
  return gleich(ist, teile[3].toLowerCase());
}

// Inhalt als Hex-Text, weil btoa/atob im n8n-Code-Baustein nicht sicher vorhanden sind.
function textZuHex(text) {
  return bytesZuHex(utf8(text));
}

function hexZuText(hex) {
  if (!/^([0-9a-f]{2})*$/.test(hex)) throw new Error('Kein Hex-Text');
  return decodeURIComponent(hex.replace(/../g, '%$&'));
}

function signatur(geheimnis, text) {
  return bytesZuHex(hmacSha256(utf8(geheimnis), utf8(text)));
}

function schluesselAusstellen(geheimnis, daten, gueltigMinuten, jetztMs) {
  const inhalt = textZuHex(JSON.stringify(Object.assign({}, daten, {
    ablauf: (jetztMs || Date.now()) + gueltigMinuten * 60000,
  })));
  return inhalt + '.' + signatur(geheimnis, 'anmeldung|' + inhalt);
}

// Gibt die Daten des Schlüssels zurück oder null, wenn er ungültig oder abgelaufen ist.
function schluesselPruefen(geheimnis, schluessel, jetztMs) {
  const teile = String(schluessel || '').split('.');
  if (teile.length !== 2) return null;
  if (!gleich(signatur(geheimnis, 'anmeldung|' + teile[0]), teile[1])) return null;
  let daten;
  try { daten = JSON.parse(hexZuText(teile[0])); } catch (e) { return null; }
  if (!daten || typeof daten.ablauf !== 'number' || daten.ablauf < (jetztMs || Date.now())) return null;
  return daten;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    utf8, sha256, hmacSha256, pbkdf2Sha256, bytesZuHex, hexZuBytes,
    passwortPruefen, signatur, schluesselAusstellen, schluesselPruefen, gleich,
  };
}
