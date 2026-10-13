// ZW-Pipeline · erzeugt von n8n/bauen.mjs · Version 71b0bd37ae
// Nicht hier ändern: Änderungen im Repo machen und neu bauen.

// Die Seite der ZW-Station als Rohtext (Quelle: frontend/zw-station.html)
const SEITE_HTML = String.raw`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>ZW-Station</title>
<style>
:root {
  --bg: #f3f6f4; --surface: #ffffff; --surface-2: #f7faf8; --fg: #1c2a23; --muted: #66766e; --line: #e0e7e2;
  /* Grün aus dem mykitchens-Logo */
  --accent: #3b864b; --accent-dark: #2f6d3c; --accent-ink: #ffffff; --accent-soft: #eaf3ec;
  --ok: #15803d; --ok-bg: #e5f5ea; --warn: #9a5b06; --warn-bg: #fff3dc;
  --err: #c0362c; --err-bg: #fdeceb; --info-bg: #eff6f1;
  --font-ui: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-code: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --schatten: 0 1px 2px rgba(20, 50, 35, .06), 0 2px 8px rgba(20, 50, 35, .05);
  color-scheme: light;
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.45 var(--font-ui); }
button { font-family: var(--font-ui); cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .5; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
[hidden] { display: none !important; }
.hint { color: var(--muted); margin: 0; }
.error { color: var(--err); background: var(--err-bg); padding: 10px 12px; border-radius: 8px; margin: 0; font-weight: 500; }

/* Logo */
.logo { display: flex; align-items: center; gap: 10px; }
.logo-bild { display: inline-block; width: 140px; height: 25px; flex: none; background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATQAAAA4BAMAAACBGhljAAAAMFBMVEUAAAA7h0sjeFg7h0s6hUoziUsldigA/wBtcG1TplRAklEvqC////8A//8A/393/3cgUUimAAAAEHRSTlMA+Q+hYiMGAQIE+gQBAQIC60HPWgAAC7NJREFUeNrNmX10VOWdxz/3mclMRpIwN9hFE0xuhhCxhU3kpXWtKYEQe6THGNhaVqQ60t2InNVzrWc1a89CzBYEuwcHPLXYY2twqVXUrMUVEds4RFyrQBhBTguGeAkag0DmhrfJTDJ39o9777yEEMSjlOefufd5nt9zv8/3+b0+A6n2C8C9hUuwZXPr7Nm30ngJQmsslQvWyzWjL1Ruom+imtqfz9eIaPIpQ2e5m3y+C1tXSj06cwEoV5ovDaocyV1NKNQBOLb7X/98ISu4imV5xl/tN9/MwbHHmg7J3zg+ZFqWIl9eG7qQhUWSvo+sU4l/5+pFZeoXXsAzuCzc322/6RPfOnaUZ8LhsBhynsay8LFg45c60Lo+e0tOfQDXguYvDC0Hz7j37VVi7/LEwrlBnMeNTG7jeTAa7cuwtjlJ9mChz7fg+QvZYGQw9QjnZrzignTNCeDy+Y2lqb4xneztX/U3NwMnkL2lqiHdVDuhc0xllfq3h+b+p5pqXcrNtB5j++YvtZ4HAgu/GmgC9v1uUnvnwaF2Hb8+8CWWC3ylrImy8mHtZt9u0+pVVvHTsr6nOoGJqrR6P26VaMAeTDxuCzwEKPUz924KPQI8IFYBiKtVfdfGpAvp+UO03bL9pYUJafV+UzAacJfcn9VmjiwtkKxJ/n9cLw/bUnHlZwDrwA/wehp8FXKzZFmeQrph+ufK8jfMxweDACvA5ZBl+UcKkNWYWpOJSRnA1QhQhvUo8eSGvwyvNWV1KlA2yH0Vi0r65DeVbmo/lnybL7/xj8z+temtxvH9p3OgpB23NCfkin+r/qW3pdi1QRz5NxQ1kt2wfEZYkt+89wlXPA9mbJqn09HTDwjDV6LLeS3+ZlwLg7Of76/V6egyQBilxbrc0R1Dyh40Qycz38p/5OUgMKvV8sa9gGtaRCs+dRwoCd1xshWYHpwW6eKHTwFKia6JEyY0xdGLoDL2meY4NjcIijajSvVvmKx5Iozf2bgingc1R0Mgcv2NUPdhrhZQmd7Wz6t+qDzZDqLS24z6yZ8IqKKyolE03GyxFFp7iE2AeMW2EBe40TSPKxfg49oNrQC7CryaYez3g7trv2YrvvjRWDAkL3aP5tEV8bvJKhE4+O0mAI76AeN0I7hey9VQYcd1KC2rjdVj2gHjnecYtfZPoGJsb0JSZMsI5L67Knb/FqT7V1uR/0QM98BoEGbMkcpDAJ7iHh1KvhfAZeSCU8+BknZXPA8oVw6FMFmDcpW5zZYGzrjx3rykqsyoaPQfCtkfWbBNB0WzRrzbguZAeZWUlWMJnMrra74zDya0WycsTlrQhrS1d+WCM3oCz4IWPCXv50BJu/8DDRwnHtv6bgrag7W5yVD9+vUpaFl90mBypNz7gZ4cKTkYGQUEVHD2icTQYHpZyucNHw/umwsYJ+DRXoh8CuB0bdCASXcF0yduvDmVRVSlu/OUFsG+dNfeFTUAsRYwEBleUoJhkwOR8Xu0Aoz5jYQ0EIsABh+uBMR7ngypM6mljO9Y6RxAvLhLA0pnVgPGAhO1ApBIXAVU7/aCUSASQ6gRrhRQG7Xjpg0KgGP5DxVA9wL7ve5nNZB+DuD8eQi4an5qm2Lq1M9aNKBUnq0AUQCmT64GmPisBs4dLS9VgaEHAabfkg8YN1WAY9PBT5KZB8AaO/IdTsUq+yFnwwZHHnDDYhx5cPTDXOj6thCAG4BYZQjEX+vSdvhHsu9sAccOOp25eDoAHFthZgj04l747o0ntN/kgKY2gnPrVnNEBqng9y8+4sjrTKqY6oSEBFL8rCzT0a26BCDewOUDYgYgZkQSwIQnAE9WCPAVpeV4Cd/KK3qBSU1kv3QN0ckA4xbxrTYAA8QrSxrWDSjQrQCFCivt4zc6H77tX3a2akIaEpGlVEruth+UQGwAEMuQDgLxdgXiPn8toKlApAMQJ7amL6M1VOkg2pbSv2fs+MpWgLFFfCRZiiXV+3y+eiARAvKraJhlQ7u8Zv6SeYsRGUlpHOJxm63Cn9i9XZaaPgwOBXhZB66s0MDRkyS5+NCQAk/RQXICS2fu3LIZwNPMIIAehfiL4XD4RQ1oBvIUspsB8oH4zldrWrbY7hQk21S3JZf22gcasyA6YTvA8i7gTI0GhpEsyVwNQ8xaB6RBgPtW9telZ9VE0qYNpPsVnjWJ21nVhXAN2WvR2zag1nOWB56fAp3lQOmCZGfHiqEeJ+k73A0jpWUZAH5h1Q97axWx0hqJS2ukNU4zTwXwFN1z7jJllAKJOPB5yo7jc845P/rFs891FjNGW7dYtskmdufATlXBq5jfip72nLsqblbAqADxaVpN2D3EoIwUHSuHiSs+q92V4eOvG2dZg+QQ/XdavLqedP8qBrxmak/ZRyOUez2bzLAhDaR1dg75vhdImBVbQ+C1oUPS1HA4HD5ePvX2YGaV/3K1AmB8X0SLTG0fZEn0HlfS05a2F32B8nW8mnY/Ea/K3IzmhcQg0HDVNKXmrBWe6a6v7+6q/XUko3vUR7y0b4wC6IIVn5hTE+AKa6aDF9N2KCMV2on/MA/LY5/ZpApg35m0GaUPBb1gfO9JcrKLDp6cNZS1eP2dDcv+55afzHohY+SXi2bf9ljHXvDogtjPxgAkblfIegaoGATRtnj/SKRFO01MisWa4/+6AGOtlYSFgAOrevKBD5dwankIY0+GfD7wzvqn1vzgiLH7uoyR6t27fu+esAYiCFjRMUYBQ6vj1krwRuOAWDdyIfbCFABHi/U6ji7AuC6QvECI3+QLrAfi0/2v3QBkZYivBw433L147l/w9Gcav8aUew7fCx6vgFhZxz4v7N3s2mAXow7jPDVi4hEAY4ltsrHbK4A9z5nXfyHgz+Hn/0sBOl5dGAKuzhBfqIDxxOzqVohk+lU3HJp3x1yLNQ4sdh8Gd8GCZIJ3xW3ngdbfqgBFPfYNDv/uA6T/TAU2wK1YoRzENRniQR1w72oHxFsZhl0HxrZdrUCXAFh3UoLIGUvzneaMkVu7F1BSO57yDGC8HkrPEIr/kLLHpzOkZx1ORqvxj2a4wwcAoxNwaCIVHzrOd2/lSJGOroN4IyVxemkFsEeLAPhMjmItyfA4ak2GgfYutO+z1n4ey0jCFlq79Vyz2oIWSrqKM6H700/faceEI1Y48kAUXMs109+AI4DHCavaAvC43wMBXjhiBrx5/6uYlJT2qMmAFMCj+5/bbn3k8R6tKmDadCKAh+Beywe8bbOmVoAzCPC5O5oR/caCYgBjQYkRvT4CpYaZTRZuAQYJEImpJBIBUDUAxw0fT4GIF6NwbwBPgPE7eiRUq+5QiXjV2A+mKnhgfPsVv5qnItDol1QiMC4fAojJ7oB1SOsGIjhufUOHU++9c6Xu1W1bjdd+87PTOnBZjvu0DuTN+ezUcVbkaqB4t4CRdeO4qfu2MJi4+ZsF4XDfnIKNR2L/tnGOL/zu8/TPafuu833l02fL4875V56uCRJ3FlwfDmscuPnlf3Dmj9/++i/jL/y4sPeWdcCPC4rvXjdwZNw12/Knv5E8Z49Dlv8ueK0sy3Jd3bVyxfnMwD9TluW71SFmn3r2216lEcA1zAoPmud59sBaO9mzUlohcpnw2P0aMLrqAy2rL3mq9o1V5m/T42Z1b11erbJmssqe5gvW7LcusXjvt+nT7F/xKPzmwDAjEx6QxHItCc1lZEBznuwf+e5xIJezLrm/6ibO7qpLK/POlUsWA4V3cFGgGRALmunRK5n/Dw2ran8PKMGLAs3hALRkXivOQ5uigdiifb3QnOklUCR5i32ea+7lOSBiXBTWEnE81p8hVTokskaWKgrgKbnv4kDDQcTUNBHECzUjCs2vUuEy5SKx9rbHDqRV/girQ/6RhJrbLpezv/Z/Y6xAFZ90rG/MFbIG0kPs+eTN2qdHlOrtDYe/ZvtMa9nVSmPJ+o3r/1sJVE87X5wSTb6mrx1R0oGFKuCfNZDepOyAO8ql1OqTujO6Xr0UAP0/t2UV2CGQD88AAAAASUVORK5CYII=) no-repeat left center / contain; }
.logo-app { font-weight: 700; font-size: 1rem; color: var(--fg); padding-top: 3px; }

/* Knöpfe und Felder */
.btn { font-size: 1rem; font-weight: 600; padding: 12px 20px; border-radius: 10px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink); min-height: 48px; }
.btn:hover:not(:disabled) { background: var(--accent-dark); border-color: var(--accent-dark); }
.btn.ghost { background: var(--surface); color: var(--fg); border-color: var(--line); }
.btn.ghost:hover:not(:disabled) { background: var(--surface-2); border-color: var(--muted); }
.btn.small { min-height: 38px; padding: 7px 14px; font-size: .92rem; }
.linkbtn { background: none; border: none; color: var(--accent-dark); text-decoration: underline; font-size: .92rem; padding: 4px 0; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-weight: 500; font-size: .95rem; }
.field input, textarea, .feld { font: 500 1rem var(--font-ui); padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); min-width: 0; }
textarea { font: .85rem var(--font-code); width: 100%; min-height: 90px; }

/* Anmeldung */
.mitte { min-height: 100%; display: grid; place-items: center; padding: 24px 16px; }
.karte { width: 100%; max-width: 440px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--schatten); }
.karte.breit { max-width: 640px; }
.karte h2 { margin: 0; font-size: 1.2rem; }
.liste { display: flex; flex-direction: column; gap: 12px; }
.setup { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }

/* Aufbau: links Auswahl, rechts Inhalt */
.app { display: grid; grid-template-columns: 300px minmax(0, 1fr); min-height: 100%; }
.side { background: var(--surface); border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 100vh; position: sticky; top: 0; max-height: 100vh; }
.side-kopf { padding: 18px 18px 14px; display: flex; flex-direction: column; gap: 14px; border-bottom: 1px solid var(--line); }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 3px; }
.seg button { border: 0; background: transparent; border-radius: 8px; padding: 8px 6px; font-weight: 600; font-size: .9rem; color: var(--muted); }
.seg button[aria-selected="true"] { background: var(--surface); color: var(--fg); box-shadow: var(--schatten); }
.seg .zahl { font-weight: 700; color: var(--accent-dark); margin-left: 4px; }
.side-suche { display: flex; gap: 6px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.side-suche input { flex: 1; font-family: var(--font-code); font-size: .95rem; padding: 9px 11px; }
.side-suche button { min-height: 0; padding: 8px 12px; }
.side-liste { flex: 1; overflow-y: auto; padding: 6px 0; }
.side-item { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; text-align: left; padding: 10px 18px; border: 0; border-left: 3px solid transparent; background: transparent; color: var(--fg); font-size: .95rem; }
.side-item:hover { background: var(--surface-2); }
.side-item[aria-current="true"] { background: var(--accent-soft); border-left-color: var(--accent); }
.side-item .nr { font: 600 1rem var(--font-code); }
.side-item .klein { grid-column: 1 / -1; color: var(--muted); font-size: .8rem; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.side-item .anzahl { color: var(--muted); font-weight: 600; font-size: .9rem; }
.ordner { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; padding: 12px 18px; border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--fg); font-weight: 600; font-size: .95rem; text-align: left; }
.ordner:hover { background: var(--surface-2); }
.ordner .pfeil { display: inline-block; color: var(--muted); transition: transform .15s; margin-right: 6px; }
.ordner[aria-expanded="true"] .pfeil { transform: rotate(90deg); }
.ordner-hinweis { padding: 0 18px 6px; font-size: .78rem; }
.side-item.erledigt .nr { color: var(--muted); }
.side-item.filter { display: flex; justify-content: space-between; padding: 12px 18px; }
.side-item.filter .anzahl { color: var(--fg); }
.side-info { padding: 12px 18px; }
.side-fuss { border-top: 1px solid var(--line); padding: 12px 18px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.punkt { display: inline-block; font-size: .72rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
.punkt.ok { background: var(--ok-bg); color: var(--ok); }
.punkt.warn { background: var(--warn-bg); color: var(--warn); }
.punkt.err { background: var(--err-bg); color: var(--err); }

.haupt { padding: 16px 20px 48px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.kopf { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; box-shadow: var(--schatten); }
.kopf .titel { flex: 1 1 260px; min-width: 0; }
.kopf h1 { margin: 0; font-size: 1.3rem; }
.kopf .unter { color: var(--muted); font-size: .92rem; }
.kopf .unter b { color: var(--fg); }
.marke { font-size: .82rem; font-weight: 700; padding: 5px 10px; border-radius: 6px; background: var(--warn-bg); color: var(--warn); white-space: nowrap; }
.wer { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: .92rem; }
.leer { text-align: center; color: var(--muted); padding: 48px 16px; }
.inhalt { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--schatten); }

/* Retoure */
.notes { margin: 0; padding: 10px 12px 10px 30px; border-radius: 10px; background: var(--warn-bg); color: var(--fg); font-size: .95rem; }
.notes small { color: var(--muted); }
.pos { border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: var(--surface-2); }
.pos-head { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: start; }
.thumb { width: 56px; aspect-ratio: 1; border-radius: 10px; background: var(--surface); border: 1px solid var(--line); display: grid; place-items: center; color: var(--muted); font-size: .68rem; text-align: center; }
.pos h3 { margin: 0 0 4px; font-size: 1.02rem; overflow-wrap: anywhere; }
.pos .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--muted); font-size: .86rem; }
.pos .meta b { font-family: var(--font-code); color: var(--fg); font-weight: 600; }
.cond { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.cond button { min-height: 56px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); font-weight: 600; font-size: .95rem; padding: 8px; }
.cond button:hover { border-color: var(--accent); }
.cond button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.cond button.neg[aria-pressed="true"] { background: #5c6b64; border-color: #5c6b64; color: #fff; }
.preview { border-radius: 10px; padding: 12px 14px; background: var(--info-bg); display: flex; flex-direction: column; gap: 6px; }
.preview .row { display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: baseline; }
.preview .price { font: 700 1.3rem var(--font-code); }
.preview .strike { color: var(--muted); text-decoration: line-through; font-family: var(--font-code); }
.preview .warn { color: var(--warn); background: var(--warn-bg); padding: 6px 10px; border-radius: 8px; font-size: .9rem; }
.preview .info { color: var(--muted); font-size: .86rem; }
.preview.err { background: var(--err-bg); color: var(--err); }
.status { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; font-weight: 600; padding: 10px 12px; border-radius: 10px; }
.status.wartet { background: var(--warn-bg); color: var(--warn); }
.status.ok { background: var(--ok-bg); color: var(--ok); }
.status.err { background: var(--err-bg); color: var(--err); }
.status.neutral { background: var(--surface); color: var(--muted); border: 1px solid var(--line); }
.status small { font-weight: 400; }
.actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.comments { margin: 0; padding-left: 18px; color: var(--muted); font-size: .9rem; }
.eingabe { display: flex; flex-direction: column; gap: 10px; }
.eingabe label { font-weight: 600; font-size: .93rem; display: flex; flex-direction: column; gap: 6px; }
.eingabe label small { font-weight: 400; color: var(--muted); }
.eingabe textarea { font: 1rem var(--font-ui); min-height: 70px; resize: vertical; width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); }
.eingabe input { font: 600 1.1rem var(--font-code); padding: 9px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--fg); max-width: 220px; }
.eingabe .fehlt { border-color: var(--err); box-shadow: 0 0 0 1px var(--err); }
.eingabe .pflicht { color: var(--err); }
.preiswarn { display: flex; flex-direction: column; gap: 4px; }
.preiswarn span { color: var(--warn); background: var(--warn-bg); padding: 6px 10px; border-radius: 8px; font-size: .88rem; }
.eingabe-bilder { display: flex; flex-direction: column; gap: 6px; font-size: .93rem; }
.bilder { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bilder figure { margin: 0; position: relative; width: 84px; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: var(--surface); }
.bilder figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bilder figure button { position: absolute; top: 4px; right: 4px; width: 30px; height: 30px; border-radius: 50%; border: 0; background: rgba(0,0,0,.6); color: #fff; font-size: 1rem; line-height: 1; cursor: pointer; }
.bilder .datei { position: relative; display: inline-flex; flex-direction: row; align-items: center; justify-content: center; min-height: 44px; padding: 8px 14px; border-radius: 10px; border: 2px dashed var(--line); background: var(--surface); color: var(--fg); font-weight: 600; cursor: pointer; }
.bilder .datei:hover { border-color: var(--accent); }
.bilder .datei input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.bilder .datei:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }

/* ZW-Liste */
.filter { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.filter input { flex: 1 1 220px; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .88rem; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); background: var(--surface-2); }
td.code { font-family: var(--font-code); }
td .btn.small { min-height: 34px; padding: 5px 12px; font-size: .86rem; }
td .gebucht { color: var(--ok); font-weight: 600; }
details.panel { border: 1px solid var(--line); border-radius: 12px; padding: 2px 16px; }
details.panel > summary { cursor: pointer; padding: 12px 0; font-weight: 600; }

/* Tablet und Handy: Auswahl oben, Inhalt darunter */
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .side { position: static; min-height: 0; max-height: none; border-right: 0; border-bottom: 1px solid var(--line); }
  .side-liste { max-height: 260px; }
  .side-fuss { display: none; }
  .haupt { padding: 12px 12px 40px; }
}
@media (max-width: 640px) {
  /* drei ZW-Zustände in einer Reihe, darunter Nicht verkaufbar und Kein ZW */
  .cond { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .cond button { grid-column: span 2; padding: 6px 4px; font-size: .9rem; overflow-wrap: anywhere; }
  .cond button.neg { grid-column: span 3; min-height: 48px; }
  .inhalt, .karte { padding: 16px; }
}
</style>
</head>
<body>
<!-- Anmeldung -->
<div class="mitte" id="s-login" hidden>
  <section class="karte">
    <div class="logo"><span class="logo-bild" role="img" aria-label="mykitchens"></span><span class="logo-app">ZW-Station</span></div>
    <h2>Anmelden</h2>
    <form id="login-form" class="liste" autocomplete="on">
      <div class="field"><label for="l-user">Benutzername</label><input id="l-user" name="username" autocomplete="username" required autocapitalize="none"></div>
      <div class="field"><label for="l-pass">Passwort</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
      <p class="error" id="login-error" hidden></p>
      <button class="btn" type="submit" id="login-btn">Anmelden</button>
    </form>
    <button class="linkbtn" type="button" id="open-setup">Zugang einrichten (für Tobias)</button>
  </section>
</div>

<!-- Zugang einrichten: läuft nur im Browser, nichts wird gesendet -->
<div class="mitte" id="s-setup" hidden>
  <section class="karte breit">
    <div class="logo"><span class="logo-bild" role="img" aria-label="mykitchens"></span><span class="logo-app">ZW-Station</span></div>
    <h2>Zugang einrichten</h2>
    <p class="hint">Erzeugt den Eintrag für eine Person. Das Passwort verlässt diesen Browser nicht. Den Eintrag in n8n im Baustein „Einstellungen“ unter <b>einstellungen.benutzer</b> in die Liste einfügen.</p>
    <form id="setup-form" class="setup">
      <div class="field"><label for="u-user">Benutzername</label><input id="u-user" required autocapitalize="none"></div>
      <div class="field"><label for="u-name">Anzeigename</label><input id="u-name" required></div>
      <div class="field"><label for="u-pass">Passwort (mind. 10 Zeichen)</label><input id="u-pass" type="password" minlength="10" required autocomplete="new-password"></div>
      <div class="field"><label for="u-admin"><input id="u-admin" type="checkbox"> Admin (darf Probelauf zurücksetzen)</label></div>
      <button class="btn" type="submit">Eintrag erzeugen</button>
    </form>
    <textarea id="setup-out" readonly hidden aria-label="Eintrag für die Benutzerliste"></textarea>
    <button class="linkbtn" type="button" id="close-setup">Zurück zur Anmeldung</button>
  </section>
</div>

<!-- Arbeitsfläche: links Auswahl, rechts Inhalt -->
<div class="app" id="s-app" hidden>
  <aside class="side">
    <div class="side-kopf">
      <div class="logo"><span class="logo-bild" role="img" aria-label="mykitchens"></span><span class="logo-app">ZW-Station</span></div>
      <div class="seg" role="tablist">
        <button type="button" role="tab" id="tab-ret" aria-selected="true">Retouren<span class="zahl" id="n-ret"></span></button>
        <button type="button" role="tab" id="tab-zw" aria-selected="false">ZW-Artikel<span class="zahl" id="n-zw"></span></button>
      </div>
    </div>

    <!-- Retouren (Status 9.1.1) -->
    <form class="side-suche" id="search-form" autocomplete="off">
      <input class="feld" id="search-input" inputmode="numeric" placeholder="Retouren-Nr." aria-label="Retouren-Nr. suchen oder eingeben">
      <button class="btn small" type="submit">Öffnen</button>
    </form>
    <div class="side-liste" id="side-ret">
      <p class="hint side-info" id="list-loading" hidden>Retouren werden aus plenty geladen …</p>
      <p class="error side-info" id="list-error" hidden></p>
      <p class="hint side-info" id="list-empty" hidden>Keine offenen Retouren.</p>
      <div id="ret-list"></div>
    </div>

    <!-- Erledigte ZW-Artikel -->
    <div class="side-liste" id="side-zw" hidden>
      <div id="zw-filter"></div>
    </div>

    <div class="side-fuss">
      <button class="linkbtn" type="button" id="neu-laden">Liste neu laden</button>
      <button class="linkbtn" type="button" id="reset" hidden>Probelauf zurücksetzen</button>
    </div>
  </aside>

  <main class="haupt">
    <header class="kopf">
      <span class="marke" id="banner" hidden title="Retouren und Preise kommen echt aus plenty und Shopware (nur gelesen). Anlegen wird nur nachgestellt.">Probelauf</span>
      <div class="titel">
        <h1 id="kopf-titel">Retouren</h1>
        <div class="unter" id="kopf-unter"></div>
      </div>
      <div class="wer"><span>Angemeldet als <b id="who-name"></b></span><button class="btn ghost small" type="button" id="logout">Abmelden</button></div>
    </header>

    <!-- Keine Retoure gewählt -->
    <section class="inhalt leer" id="s-leer">
      <p>Links eine Retoure wählen oder die Retouren-Nr. eingeben.</p>
    </section>

    <!-- Retoure -->
    <section class="inhalt" id="s-ret" hidden>
      <ul class="notes" id="plenty-notes" hidden></ul>
      <div class="liste" id="pos-list"></div>
      <p class="error" id="ret-error" hidden></p>
      <div class="actions">
        <span class="hint" id="anlegen-hint"></span>
        <button class="btn" type="button" id="anlegen" disabled>Anlegen</button>
      </div>
      <details id="ret-comments-wrap" hidden><summary>Kommentare der ZW-Station (Probelauf: nicht in plenty)</summary><ul class="comments" id="ret-comments"></ul></details>
    </section>

    <!-- Erledigte ZW-Artikel (ersetzt die Excel-Liste) -->
    <section class="inhalt" id="s-zw" hidden>
      <p class="hint">Alle freigegebenen ZW-Artikel. Nach dem Umbuchen im Lager „Bestand gebucht“ drücken.</p>
      <div class="filter">
        <input class="feld" id="zw-suche" type="search" placeholder="Suchen: Retoure, Variante, Barcode, Name" aria-label="ZW-Liste durchsuchen">
        <button class="btn ghost small" type="button" id="zw-csv">CSV herunterladen</button>
      </div>
      <p class="error" id="zw-error" hidden></p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Datum</th><th>Retoure</th><th>ZW-Variante</th><th>Barcode</th><th>Name</th><th>Zustand</th><th>Grund</th><th>Preis</th><th>Streichpreis</th><th>neu/+1</th><th>Bestand</th></tr></thead>
          <tbody id="zw-liste"></tbody>
        </table>
      </div>
      <details class="panel">
        <summary>Protokoll (letzte 50 Einträge)</summary>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Zeit</th><th>Wer</th><th>Aktion</th><th>Retoure</th><th>Position</th><th>Zustand</th><th>Ergebnis</th></tr></thead>
            <tbody id="protokoll"></tbody>
          </table>
        </div>
      </details>
    </section>
  </main>
</div>

<script>
(function () {
  'use strict';
  var ZUSTAENDE = ['Neuwertig', 'Sehr gut', 'Gut', 'Nicht verkaufbar', 'Kein ZW'];
  var OHNE_ARTIKEL = ['Nicht verkaufbar', 'Kein ZW'];
  // Bei diesen Entscheidungen ist ein Grund Pflicht (geht ans Büro und später in die Artikelbeschreibung)
  var GRUND_PFLICHT = ['Sehr gut', 'Gut', 'Nicht verkaufbar'];
  var LEERLAUF_MINUTEN = 30;
  // Bilder zum Grund: höchstens 3 pro Position, vor dem Senden auf 1600 px verkleinert (JPEG)
  var BILDER_MAX = 3;
  var BILD_MAX_PX = 1600;
  var BILD_MAX_ZEICHEN = 2000000;
  var ABFRAGE_SEKUNDEN = 8;
  // So weit darf das Lager vom Preisvorschlag abweichen. Mehr nur mit Begründung (prüft auch n8n).
  var PREIS_ABWEICHUNG = 50;

  // Die Seite liegt unter …/zw-station, die Aktionen unter …/zw-station/<aktion>
  var BASIS = location.pathname.replace(/\/+$/, '') + '/';
  var $ = function (id) { return document.getElementById(id); };
  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var zustand = { schluessel: null, name: '', rolle: '', retoure: null, auswahl: {}, vorschau: {}, grund: {}, preis: {}, preisGrund: {}, bilder: {}, bilderLaden: {}, abfrage: null, letzteAktivitaet: Date.now(), zwListe: [], zwFilter: 'offen', retouren: null, tab: 'ret' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function speichern(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function lesen(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  // Ansichten: 'login', 'setup' (ohne Seitenleiste) und 'ret', 'zw' (Arbeitsfläche mit Seitenleiste)
  function zeige(ansicht) {
    $('s-login').hidden = ansicht !== 'login';
    $('s-setup').hidden = ansicht !== 'setup';
    $('s-app').hidden = ansicht !== 'ret' && ansicht !== 'zw';
    if ($('s-app').hidden) return;
    zustand.tab = ansicht;
    var ret = ansicht === 'ret';
    $('tab-ret').setAttribute('aria-selected', String(ret));
    $('tab-zw').setAttribute('aria-selected', String(!ret));
    $('search-form').hidden = !ret; $('side-ret').hidden = !ret; $('side-zw').hidden = ret;
    $('s-zw').hidden = ret;
    $('s-ret').hidden = !ret || !zustand.retoure;
    $('s-leer').hidden = !ret || !!zustand.retoure;
    kopfSetzen();
  }

  function kopfSetzen() {
    if (zustand.tab === 'zw') {
      $('kopf-titel').textContent = 'Erledigte ZW-Artikel';
      $('kopf-unter').textContent = 'Freigegebene ZW-Artikel · Bestand in plenty abhaken';
      return;
    }
    var r = zustand.retoure;
    if (!r) {
      $('kopf-titel').textContent = 'Retouren';
      $('kopf-unter').textContent = 'Status 9.1.1 · Retoure - ZW erstellen';
      return;
    }
    $('kopf-titel').textContent = 'Retoure ' + r.id;
    $('kopf-unter').innerHTML = [datum(r.datum), r.shopAuftrag ? 'Shop-Auftrag <b>' + esc(r.shopAuftrag) + '</b>' : '', 'Status ' + esc(r.status),
      r.probelaufFertig ? 'alle Positionen entschieden' + (r.probelaufStatus ? ', Status ' + esc(r.probelaufStatus) : '') + ' (Probelauf: nicht gesetzt)' : ''].filter(Boolean).join(' · ');
  }

  $('tab-ret').addEventListener('click', function () { zeige('ret'); if (zustand.retoure) zeigeRetoure(); else if (!zustand.retouren) ladeListe(); });
  $('tab-zw').addEventListener('click', function () { stoppeAbfrage(); zeige('zw'); ladeZwListe(); });
  $('neu-laden').addEventListener('click', function () { if (zustand.tab === 'zw') ladeZwListe(); else ladeListe(); });

  function fehler(id, text) { $(id).textContent = text || ''; $(id).hidden = !text; }

  function api(aktion, opt) {
    opt = opt || {};
    var kopf = { 'Accept': 'application/json' };
    if (zustand.schluessel) kopf.Authorization = 'Bearer ' + zustand.schluessel;
    if (opt.body) kopf['Content-Type'] = 'application/json';
    return fetch(BASIS + aktion + (opt.query ? '?' + new URLSearchParams(opt.query) : ''), {
      method: opt.body ? 'POST' : 'GET', headers: kopf, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store',
    }).then(function (r) {
      return r.text().then(function (t) {
        var d; try { d = JSON.parse(t); } catch (e) { d = { ok: false, fehler: 'Unerwartete Antwort (' + r.status + ')' }; }
        if (r.status === 401 && aktion !== 'anmelden') { abmelden(d.fehler || 'Bitte neu anmelden.'); throw new Error(d.fehler); }
        if (!r.ok || d.ok === false) throw new Error(d.fehler || ('Fehler ' + r.status));
        return d;
      });
    }, function () { throw new Error('Keine Verbindung zu n8n.'); });
  }

  // ---------- Anmeldung ----------
  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    fehler('login-error');
    $('login-btn').disabled = true;
    api('anmelden', { body: { benutzer: $('l-user').value, passwort: $('l-pass').value } }).then(function (d) {
      zustand.schluessel = d.schluessel; zustand.name = d.name; zustand.rolle = d.rolle;
      speichern('zw-schluessel', d.schluessel); speichern('zw-name', d.name); speichern('zw-rolle', d.rolle);
      $('l-pass').value = '';
      start();
    }).catch(function (err) { fehler('login-error', err.message); }).then(function () { $('login-btn').disabled = false; });
  });

  function abmelden(grund) {
    zustand.schluessel = null; zustand.retoure = null;
    speichern('zw-schluessel', null); speichern('zw-name', null); speichern('zw-rolle', null);
    stoppeAbfrage();
    zeige('login');
    fehler('login-error', grund || '');
    setTimeout(function () { $('l-user').focus(); }, 0);
  }
  $('logout').addEventListener('click', function () { abmelden(); });

  ['click', 'keydown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { zustand.letzteAktivitaet = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (zustand.schluessel && Date.now() - zustand.letzteAktivitaet > LEERLAUF_MINUTEN * 60000) abmelden('Automatisch abgemeldet nach ' + LEERLAUF_MINUTEN + ' Minuten ohne Nutzung.');
  }, 30000);

  // ---------- Zugang einrichten (nur im Browser) ----------
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  $('open-setup').addEventListener('click', function () { zeige('setup'); });
  $('close-setup').addEventListener('click', function () { zeige('login'); });
  $('setup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) { alert('Dieser Browser kann hier keinen Hash erzeugen (nur über https).'); return; }
    var durchlaeufe = 10000;
    var salz = crypto.getRandomValues(new Uint8Array(16));
    crypto.subtle.importKey('raw', new TextEncoder().encode($('u-pass').value), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salz, iterations: durchlaeufe }, k, 256);
    }).then(function (bits) {
      var eintrag = { benutzer: $('u-user').value.trim().toLowerCase(), name: $('u-name').value.trim(), rolle: $('u-admin').checked ? 'admin' : 'lager',
        hash: 'pbkdf2-sha256$' + durchlaeufe + '$' + hex(salz) + '$' + hex(bits) };
      $('setup-out').value = JSON.stringify(eintrag);
      $('setup-out').hidden = false; $('setup-out').select();
      $('u-pass').value = '';
    });
  });

  // ---------- Retouren ----------
  function start() {
    $('who-name').textContent = zustand.name;
    $('reset').hidden = zustand.rolle !== 'admin';
    zustand.retoure = null;
    zeige('ret');
    ladeListe();
    ladeZwListe(true);
  }

  function ladeListe() {
    fehler('list-error');
    $('list-loading').hidden = false;
    $('list-empty').hidden = true;
    api('retouren').then(function (d) {
      $('banner').hidden = String(d.modus || '').indexOf('probelauf') !== 0;
      $('list-loading').hidden = true;
      zustand.retouren = d.retouren;
      zustand.fertig = d.fertig || [];
      zeigeRetourenListe();
      if (!zustand.retoure && window.matchMedia('(min-width: 901px)').matches) setTimeout(function () { $('search-input').focus(); }, 0);
    }).catch(function (err) { $('list-loading').hidden = true; fehler('list-error', err.message); });
  }

  // Seitenleiste: Retouren-Nummern, beim Tippen gefiltert
  function zeigeRetourenListe() {
    var alle = zustand.retouren || [];
    var such = $('search-input').value.trim();
    var liste = such ? alle.filter(function (r) { return String(r.id).indexOf(such) >= 0 || String(r.shopAuftrag || '').toLowerCase().indexOf(such.toLowerCase()) >= 0; }) : alle;
    $('n-ret').textContent = alle.length ? ' ' + alle.length : '';
    $('list-empty').hidden = liste.length > 0 || !zustand.retouren;
    $('list-empty').textContent = such ? 'Nicht in der Liste. Mit „Öffnen“ trotzdem suchen.' : 'Keine offenen Retouren.';
    var aktiv = zustand.retoure ? String(zustand.retoure.id) : null;
    var fertig = (zustand.fertig || []).filter(function (r) { return !such || String(r.id).indexOf(such) >= 0 || String(r.shopAuftrag || '').toLowerCase().indexOf(such.toLowerCase()) >= 0; });
    // Ordner „Fertig“: alle Positionen entschieden, wird nach 7 Tagen automatisch geleert
    var ordner = '<button type="button" class="ordner" id="ordner-fertig" aria-expanded="' + !!zustand.fertigOffen + '"><span><span class="pfeil" aria-hidden="true">▸</span>Fertig</span><span class="anzahl">' + fertig.length + '</span></button>' +
      (zustand.fertigOffen ? '<p class="hint ordner-hinweis">Wird nach 7 Tagen automatisch geleert.</p>' + fertig.map(function (r) {
        return '<button type="button" class="side-item erledigt" data-nr="' + esc(r.id) + '" aria-current="' + (String(r.id) === aktiv) + '">' +
          '<span class="nr">' + esc(r.id) + '</span><span class="punkt ' + (r.status === '9.3' ? 'ok' : 'warn') + '">' + esc(r.status || 'fertig') + '</span>' +
          '<span class="klein">fertig am ' + esc(datum(r.fertigAm)) + (r.shopAuftrag ? ' · ' + esc(r.shopAuftrag) : '') + '</span></button>';
      }).join('') : '');
    $('ret-list').innerHTML = ordnerUndListe(liste, aktiv) + ordner;
  }

  function ordnerUndListe(liste, aktiv) {
    return liste.map(function (r) {
      var b = [];
      if (r.probelaufFertig) b.push('<span class="punkt ok">fertig' + (r.probelaufStatus ? ' ' + esc(r.probelaufStatus) : '') + '</span>');
      else if (r.erledigt) b.push('<span class="punkt ok">' + r.erledigt + ' erledigt</span>');
      if (r.wartet) b.push('<span class="punkt warn">' + r.wartet + ' wartet</span>');
      if (r.fehler) b.push('<span class="punkt err">' + r.fehler + ' Fehler</span>');
      return '<button type="button" class="side-item" data-nr="' + esc(r.id) + '" aria-current="' + (String(r.id) === aktiv) + '">' +
        '<span class="nr">' + esc(r.id) + '</span><span class="anzahl" title="Artikel">' + r.anzahl + ' Art.</span>' +
        '<span class="klein">' + esc(datum(r.datum)) + (r.shopAuftrag ? ' · ' + esc(r.shopAuftrag) : '') + ' ' + b.join(' ') + '</span></button>';
    }).join('');
  }

  // Zähler der geöffneten Retoure in der Seitenleiste nachziehen, ohne plenty neu zu fragen
  function listenEintragAktualisieren() {
    var r = zustand.retoure; if (!r || !zustand.retouren) return;
    var e = zustand.retouren.filter(function (x) { return String(x.id) === String(r.id); })[0]; if (!e) return;
    if (r.probelaufFertig) {
      zustand.retouren = zustand.retouren.filter(function (x) { return x !== e; });
      zustand.fertig = [{ id: e.id, status: r.probelaufStatus, fertigAm: new Date().toISOString(), datum: e.datum, shopAuftrag: e.shopAuftrag, anzahl: e.anzahl }].concat(zustand.fertig || []);
      zeigeRetourenListe();
      return;
    }
    var st = r.positionen.map(function (p) { return p.status; });
    e.erledigt = st.filter(function (s) { return ['angelegt', 'plus1', 'nicht_verkaufbar', 'kein_zw'].indexOf(s) >= 0; }).length;
    e.wartet = st.filter(function (s) { return s === 'wartet'; }).length;
    e.fehler = st.filter(function (s) { return s === 'fehler'; }).length;
    e.probelaufFertig = r.probelaufFertig; e.probelaufStatus = r.probelaufStatus;
    zeigeRetourenListe();
  }

  $('ret-list').addEventListener('click', function (e) {
    if (e.target.closest('#ordner-fertig')) { zustand.fertigOffen = !zustand.fertigOffen; zeigeRetourenListe(); return; }
    var b = e.target.closest('.side-item'); if (b) oeffneRetoure(b.dataset.nr);
  });
  $('search-input').addEventListener('input', zeigeRetourenListe);
  $('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nr = $('search-input').value.trim(); if (nr) oeffneRetoure(nr);
  });

  function datum(iso) { if (!iso) return ''; var t = String(iso).slice(0, 10).split('-'); return t.length === 3 ? t[2] + '.' + t[1] + '.' + t[0] : iso; }

  function oeffneRetoure(nr) {
    fehler('list-error');
    api('retoure', { query: { nr: nr } }).then(function (d) {
      zustand.auswahl = {}; zustand.vorschau = {}; zustand.grund = {}; zustand.preis = {}; zustand.preisGrund = {}; zustand.bilder = {}; zustand.bilderLaden = {};
      zustand.retoure = d.retoure;
      $('search-input').value = '';
      zeige('ret');
      zeigeRetoure();
      listenEintragAktualisieren();
      // Auf Tablet und Handy steht die Auswahl oben: zur Retoure springen
      if (!window.matchMedia('(min-width: 901px)').matches) $('s-ret').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) { fehler('list-error', err.message); });
  }

  function offen(p) { return p.status === 'offen' || p.status === 'abgelehnt' || p.status === 'fehler'; }

  function zeigeRetoure() {
    var r = zustand.retoure;
    kopfSetzen();
    var notes = r.plentyKommentare || [];
    $('plenty-notes').hidden = !notes.length;
    $('plenty-notes').innerHTML = notes.map(function (k) { return '<li>' + esc(k.text) + (k.zeit ? ' <small>' + esc(datum(k.zeit)) + '</small>' : '') + '</li>'; }).join('');
    // Beim Neuzeichnen das Feld behalten, in dem gerade getippt wird
    var aktiv = document.activeElement, fokus = aktiv && aktiv.dataset ? (aktiv.dataset.grund ? 'grund' : (aktiv.dataset.preis ? 'preis' : (aktiv.dataset.preisgrund ? 'preisgrund' : null))) : null;
    var fokusPos = fokus ? aktiv.dataset[fokus] : null, auswahlStart = fokus ? aktiv.selectionStart : null;
    $('pos-list').innerHTML = r.positionen.map(positionHtml).join('') + ((r.ausgeblendet || []).length
      ? '<p class="hint">Ausgeblendet, weil kein Artikel: ' + r.ausgeblendet.map(function (x) { return esc(x.name) + (x.preis != null ? ' (' + eur.format(x.preis) + ')' : ''); }).join(', ') + '</p>' : '');
    if (fokus) {
      var neu = $('pos-list').querySelector('[data-' + fokus + '="' + fokusPos + '"]');
      if (neu) { neu.focus(); try { neu.setSelectionRange(auswahlStart, auswahlStart); } catch (e) {} }
    }
    $('ret-comments-wrap').hidden = !r.kommentare.length;
    $('ret-comments').innerHTML = r.kommentare.map(function (k) { return '<li>' + esc(k.text) + '</li>'; }).join('');
    aktualisiereAnlegen();
    if (r.positionen.some(function (p) { return p.status === 'wartet'; })) starteAbfrage(); else stoppeAbfrage();
  }

  function positionHtml(p) {
    var kopf = '<div class="pos-head"><div class="thumb">' + (p.bild ? '<img src="' + esc(p.bild) + '" alt="">' : 'Kein Bild') + '</div><div><h3>' + esc(p.name) + '</h3>' +
      '<div class="meta"><span>EAN <b>' + esc(p.ean || '–') + '</b></span><span>Variante <b>' + esc(p.varianteId) + '</b></span>' +
      (p.modell ? '<span>Modell <b>' + esc(p.modell) + '</b></span>' : '') + (p.menge > 1 ? '<span>Menge <b>' + esc(p.menge) + '</b></span>' : '') + '</div></div></div>';
    var unten = '';
    if (offen(p)) {
      var wahl = zustand.auswahl[p.positionId];
      if (p.status === 'abgelehnt') unten += '<div class="status err">Abgelehnt <small>' + esc(p.zustand) + '. Bitte neu entscheiden.</small></div>';
      if (p.status === 'fehler') unten += '<div class="status err">Fehler <small>' + esc(p.meldung) + '</small></div>';
      unten += '<div class="cond" role="group" aria-label="Zustand">' + ZUSTAENDE.map(function (z) {
        return '<button type="button" class="' + (OHNE_ARTIKEL.indexOf(z) >= 0 ? 'neg' : '') + '" data-pos="' + esc(p.positionId) + '" data-z="' + esc(z) + '" aria-pressed="' + (wahl === z) + '">' + esc(z) + '</button>';
      }).join('') + '</div>';
      if (wahl) unten += vorschauHtml(zustand.vorschau[p.positionId + '|' + wahl], wahl) + eingabeHtml(p, wahl);
    } else {
      unten = statusHtml(p);
    }
    return '<div class="pos">' + kopf + unten + '</div>';
  }

  function vorschauHtml(v, wahl) {
    if (!v) return '<div class="preview"><span class="info">Vorschau wird berechnet …</span></div>';
    if (v.fehler) return '<div class="preview err">' + esc(v.fehler) + '</div>';
    if (!v.artikel) return '<div class="preview"><span class="info">Kein Artikel. Kommentar in der Retoure: „' + esc(v.kommentar) + '“</span></div>';
    return '<div class="preview"><div class="row"><span class="info">Empfehlung</span><span class="price">' + eur.format(v.empfehlung) + '</span><span class="strike">' + eur.format(v.streichpreis) + '</span>' +
      '<span>' + (v.neu ? 'Neuer ZW-Artikel' : 'Bestand +1 auf <b>' + esc(v.bestehendeVarianteId) + '</b>' + (v.bestehendSimuliert ? ' (Probelauf)' : '')) + '</span></div>' +
      '<span class="info">Barcode ' + esc(v.barcode) + ' · ' + (v.fall === 'normal' ? 'Mindestpreis − ' + v.abschlag + ' %' : (v.fall === 'a' ? 'Mindestpreis erreicht' : 'Mindestpreis leer') + ', jetziger Preis − ' + v.abschlag + ' %') + '</span>' +
      (v.regelWarnungen || []).map(function (w) { return '<span class="warn">' + esc(w) + '</span>'; }).join('') +
      v.hinweise.map(function (w) { return '<span class="info">' + esc(w) + '</span>'; }).join('') +
      ((v.nichtUebernehmen || []).length ? '<span class="info">Wird beim ZW-Artikel nicht übernommen: ' + esc(v.nichtUebernehmen.join(', ')) + '</span>' : '') + '</div>';
  }

  // Grund (Pflicht bei Sehr gut, Gut, Nicht verkaufbar) und Preis (nur eine Empfehlung, das Lager darf ihn ändern)
  function eingabeHtml(p, wahl) {
    var pflicht = GRUND_PFLICHT.indexOf(wahl) >= 0;
    var grund = zustand.grund[p.positionId] || '';
    var h = '<div class="eingabe"><label><span>Grund' + (pflicht ? ' <span class="pflicht">*</span>' : ' (freiwillig)') + '</span>' +
      '<small>' + (OHNE_ARTIKEL.indexOf(wahl) >= 0 ? 'Geht ans Büro.' : 'Geht ans Büro und später in die Beschreibung des ZW-Artikels.') + '</small>' +
      '<textarea data-grund="' + esc(p.positionId) + '" maxlength="500" placeholder="z. B. Kratzer an der linken Seite, Verpackung fehlt"' +
      (pflicht && !grund.trim() ? ' class="fehlt"' : '') + '>' + esc(grund) + '</textarea></label>' + (wahl !== 'Kein ZW' ? bilderHtml(p.positionId) : '');
    var v = zustand.vorschau[p.positionId + '|' + wahl];
    if (v && v.artikel && !v.fehler) {
      var preis = zustand.preis[p.positionId];
      if (preis == null) preis = betrag(v.empfehlung);
      var pg = zustand.preisGrund[p.positionId] || '', braucht = preisBrauchtGrund(p.positionId, v);
      h += '<label><span>Verkaufspreis in €</span><small>Empfehlung ' + eur.format(v.empfehlung) + '. Du darfst ihn um bis zu ' + PREIS_ABWEICHUNG + ' € ändern, darüber nur mit Begründung.</small>' +
        '<input data-preis="' + esc(p.positionId) + '" inputmode="decimal" autocomplete="off" value="' + esc(preis) + '"' + (preisLesen(preis) === null ? ' class="fehlt"' : '') + '></label>' +
        '<div class="preiswarn" data-warn="' + esc(p.positionId) + '">' + preisWarnHtml(p.positionId, v) + '</div>' +
        '<label data-preisgrund-feld="' + esc(p.positionId) + '"' + (braucht ? '' : ' hidden') + '><span>Begründung für den Preis <span class="pflicht">*</span></span>' +
        '<small>Der Preis weicht mehr als ' + PREIS_ABWEICHUNG + ' € von der Empfehlung ab. Steht so in der Freigabe-Mail.</small>' +
        '<textarea data-preisgrund="' + esc(p.positionId) + '" maxlength="500" placeholder="z. B. Vergleichspreis bei Idealo, starke Gebrauchsspuren"' +
        (!pg.trim() ? ' class="fehlt"' : '') + '>' + esc(pg) + '</textarea></label>';
    }
    if (wahl === 'Nicht verkaufbar') h += '<span class="hint">Das Büro bekommt eine Mail mit dem Grund. Sind alle Positionen entschieden, geht die Retoure auf 9.1.3 (Reklamieren).</span>';
    return h + '</div>';
  }

  function bilderHtml(pos) {
    var liste = zustand.bilder[pos] || [], laden = zustand.bilderLaden[pos] || 0;
    var h = '<div class="eingabe-bilder"><span><b>Bilder</b> (freiwillig, bis ' + BILDER_MAX + ')</span> <small class="hint">Geht als Anhang in die Mail. Bei einem neuen ZW-Artikel nach der Freigabe als 2. Bild in Shopware.</small><div class="bilder">' +
      liste.map(function (b, i) {
        return '<figure><img src="' + esc(b.daten) + '" alt="Bild ' + (i + 1) + '"><button type="button" data-bild-weg="' + esc(pos) + '" data-i="' + i + '" aria-label="Bild ' + (i + 1) + ' entfernen">×</button></figure>';
      }).join('');
    if (laden) h += '<span class="info">Bild wird vorbereitet …</span>';
    else if (liste.length < BILDER_MAX) h += '<label class="datei">+ Bild hinzufügen<input type="file" accept="image/*" multiple data-bild="' + esc(pos) + '"></label>';
    return h + '</div></div>';
  }

  // Bild im Browser verkleinern und als JPEG (Data-URL) merken. So bleibt die Anfrage an n8n klein.
  function bildVerkleinern(datei) {
    return new Promise(function (ok, nein) {
      if (datei.type && !/^image\//.test(datei.type)) return nein(new Error('„' + datei.name + '“ ist kein Bild.'));
      var url = URL.createObjectURL(datei), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var f = Math.min(1, BILD_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight, 1));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * f));
        c.height = Math.max(1, Math.round(img.naturalHeight * f));
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var q = 0.82, daten = c.toDataURL('image/jpeg', q);
        while (daten.length > BILD_MAX_ZEICHEN && q > 0.4) { q -= 0.15; daten = c.toDataURL('image/jpeg', q); }
        if (daten.length > BILD_MAX_ZEICHEN) return nein(new Error('„' + datei.name + '“ ist zu groß.'));
        ok({ name: datei.name, daten: daten });
      };
      img.onerror = function () { URL.revokeObjectURL(url); nein(new Error('„' + datei.name + '“ lässt sich nicht öffnen. Bitte JPEG oder PNG nehmen.')); };
      img.src = url;
    });
  }

  $('pos-list').addEventListener('change', function (e) {
    var t = e.target, pos = t.dataset && t.dataset.bild;
    if (!pos || !t.files) return;
    var frei = BILDER_MAX - (zustand.bilder[pos] || []).length;
    var dateien = Array.prototype.slice.call(t.files, 0, Math.max(0, frei));
    if (t.files.length > dateien.length) fehler('ret-error', 'Höchstens ' + BILDER_MAX + ' Bilder pro Position.'); else fehler('ret-error');
    if (!dateien.length) return;
    zustand.bilderLaden[pos] = (zustand.bilderLaden[pos] || 0) + 1;
    zeigeRetoure();
    Promise.all(dateien.map(function (d) {
      return bildVerkleinern(d).catch(function (err) { fehler('ret-error', err.message); return null; });
    })).then(function (fertig) {
      zustand.bilderLaden[pos] -= 1;
      zustand.bilder[pos] = (zustand.bilder[pos] || []).concat(fertig.filter(Boolean)).slice(0, BILDER_MAX);
      zeigeRetoure();
    });
  });

  function betrag(z) { return z == null ? '' : z.toFixed(2).replace('.', ','); }

  // Wie auf dem Server: „1.234,56“, „1234,56“ oder „1234.56“. Ungültig = null.
  function preisLesen(t) {
    t = String(t == null ? '' : t).replace(/\s|€/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, '');
    t = t.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    var z = Math.round(Number(t) * 100) / 100;
    return z >= 1 && z <= 100000 ? z : null;
  }

  // Weicht der eingegebene Preis mehr als PREIS_ABWEICHUNG € von der Empfehlung ab?
  function preisBrauchtGrund(pos, v) {
    if (!v || !v.artikel || zustand.preis[pos] == null) return false;
    var z = preisLesen(zustand.preis[pos]);
    return z !== null && Math.abs(z - v.empfehlung) > PREIS_ABWEICHUNG + 0.001;
  }

  function preisWarnHtml(pos, v) {
    var z = preisLesen(zustand.preis[pos] == null ? betrag(v.empfehlung) : zustand.preis[pos]);
    if (z === null) return '<span>Bitte einen gültigen Preis eingeben, z. B. 1299,99.</span>';
    var w = [];
    if (v.einkaufspreis != null && z < v.einkaufspreis) w.push('Liegt unter dem Einkaufspreis ' + eur.format(v.einkaufspreis) + '.');
    if (z >= v.streichpreis) w.push('Nicht günstiger als der Streichpreis ' + eur.format(v.streichpreis) + '.');
    if (z !== v.empfehlung) w.push('Abweichend von der Empfehlung ' + eur.format(v.empfehlung) + '. Das steht so in der Freigabe-Mail.');
    if (preisBrauchtGrund(pos, v)) w.push('Mehr als ' + PREIS_ABWEICHUNG + ' € Abweichung: Bitte unten begründen.');
    return w.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
  }

  $('pos-list').addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.grund) {
      zustand.grund[t.dataset.grund] = t.value;
      t.classList.toggle('fehlt', GRUND_PFLICHT.indexOf(zustand.auswahl[t.dataset.grund]) >= 0 && !t.value.trim());
    } else if (t.dataset.preis) {
      var pos = t.dataset.preis;
      zustand.preis[pos] = t.value;
      t.classList.toggle('fehlt', preisLesen(t.value) === null);
      var v = zustand.vorschau[pos + '|' + zustand.auswahl[pos]], w = $('pos-list').querySelector('[data-warn="' + pos + '"]');
      if (v && w) w.innerHTML = preisWarnHtml(pos, v);
      var feld = $('pos-list').querySelector('[data-preisgrund-feld="' + pos + '"]');
      if (feld) feld.hidden = !preisBrauchtGrund(pos, v);
    } else if (t.dataset.preisgrund) {
      zustand.preisGrund[t.dataset.preisgrund] = t.value;
      t.classList.toggle('fehlt', !t.value.trim());
    } else return;
    aktualisiereAnlegen();
  });

  function statusHtml(p) {
    switch (p.status) {
      case 'wartet': return '<div class="status wartet">Wartet auf Freigabe <small>' + esc(p.zustand) + (p.vorschau && p.vorschau.preis ? ' · ' + eur.format(p.vorschau.preis) + (p.vorschau.preisVomLager ? ' (vom Lager)' : '') : '') + grundText(p) + '</small></div>';
      case 'angelegt': return '<div class="status ok">Angelegt: ' + esc(p.varianteId) + ' <small>' + esc(p.zustand) + ' · ' + eur.format(p.preis) + grundText(p) + '</small></div>';
      case 'plus1': return '<div class="status ok">Bestand +1 auf ' + esc(p.varianteId) + ' <small>' + esc(p.zustand) + grundText(p) + '</small></div>';
      case 'nicht_verkaufbar': return '<div class="status neutral">Nicht verkaufbar <small>an Büro' + grundText(p) + '</small></div>';
      case 'kein_zw': return '<div class="status neutral">Kein ZW<small>' + grundText(p) + '</small></div>';
      default: return '<div class="status neutral">' + esc(p.status) + '</div>';
    }
  }

  function grundText(p) {
    return (p.grund ? ' · Grund: ' + esc(p.grund) : '') + (p.bilder ? ' · ' + p.bilder + (p.bilder === 1 ? ' Bild' : ' Bilder') : '');
  }

  $('pos-list').addEventListener('click', function (e) {
    var weg = e.target.closest('[data-bild-weg]');
    if (weg) {
      (zustand.bilder[weg.dataset.bildWeg] || []).splice(Number(weg.dataset.i), 1);
      zeigeRetoure();
      return;
    }
    var b = e.target.closest('.cond button'); if (!b) return;
    var pos = b.dataset.pos, z = b.dataset.z;
    if (zustand.auswahl[pos] === z) delete zustand.auswahl[pos]; else zustand.auswahl[pos] = z;
    zeigeRetoure();
    if (zustand.auswahl[pos] && !zustand.vorschau[pos + '|' + z]) {
      api('vorschau', { body: { entscheidungen: [{ positionId: pos, zustand: z }] } }).then(function (d) {
        zustand.vorschau[pos + '|' + z] = d.vorschau[0];
      }).catch(function (err) {
        zustand.vorschau[pos + '|' + z] = { fehler: err.message };
      }).then(zeigeRetoure);
    }
  });

  function aktualisiereAnlegen() {
    var r = zustand.retoure;
    var gewaehlt = r.positionen.filter(function (p) { return offen(p) && zustand.auswahl[p.positionId]; });
    var nochOffen = r.positionen.filter(function (p) { return offen(p) && !zustand.auswahl[p.positionId]; }).length;
    var ohneGrund = gewaehlt.filter(function (p) {
      return GRUND_PFLICHT.indexOf(zustand.auswahl[p.positionId]) >= 0 && !String(zustand.grund[p.positionId] || '').trim();
    }).length;
    var falscherPreis = gewaehlt.filter(function (p) {
      return zustand.preis[p.positionId] != null && preisLesen(zustand.preis[p.positionId]) === null;
    }).length;
    var bilderLaden = gewaehlt.filter(function (p) { return zustand.bilderLaden[p.positionId] > 0; }).length;
    var ohnePreisGrund = gewaehlt.filter(function (p) {
      return preisBrauchtGrund(p.positionId, zustand.vorschau[p.positionId + '|' + zustand.auswahl[p.positionId]]) && !String(zustand.preisGrund[p.positionId] || '').trim();
    }).length;
    $('anlegen').disabled = gewaehlt.length === 0 || ohneGrund > 0 || falscherPreis > 0 || ohnePreisGrund > 0 || bilderLaden > 0;
    $('anlegen').textContent = gewaehlt.length > 1 ? gewaehlt.length + ' Positionen anlegen' : 'Anlegen';
    $('anlegen').hidden = !r.positionen.some(offen);
    $('anlegen-hint').textContent = !r.positionen.some(offen) ? 'Alle Positionen sind entschieden.'
      : [ohneGrund ? 'Bitte Grund eintragen (' + ohneGrund + ')' : '', bilderLaden ? 'Bilder werden vorbereitet' : '', falscherPreis ? 'Preis prüfen (' + falscherPreis + ')' : '',
        ohnePreisGrund ? 'Preis begründen (' + ohnePreisGrund + ')' : '',
        nochOffen ? nochOffen + ' Position(en) ohne Zustand' : ''].filter(Boolean).join(' · ');
  }

  $('anlegen').addEventListener('click', function () {
    var r = zustand.retoure;
    var liste = r.positionen.filter(function (p) { return offen(p) && zustand.auswahl[p.positionId]; })
      .map(function (p) {
        var z = zustand.auswahl[p.positionId];
        var v = zustand.vorschau[p.positionId + '|' + z];
        var preis = zustand.preis[p.positionId];
        return { positionId: p.positionId, zustand: z, grund: String(zustand.grund[p.positionId] || '').trim(),
          preis: v && v.artikel && preis != null ? preis : undefined,
          preisGrund: preisBrauchtGrund(p.positionId, v) ? String(zustand.preisGrund[p.positionId] || '').trim() : undefined,
          bilder: (z === 'Kein ZW' ? [] : zustand.bilder[p.positionId] || []).map(function (b) { return { name: b.name, daten: b.daten }; }) };
      });
    if (!liste.length) return;
    fehler('ret-error');
    $('anlegen').disabled = true;
    $('anlegen').textContent = 'Wird angelegt …';
    api('anlegen', { body: { retoureId: r.id, entscheidungen: liste } }).then(function (d) {
      liste.forEach(function (x) { delete zustand.auswahl[x.positionId]; delete zustand.grund[x.positionId]; delete zustand.preis[x.positionId]; delete zustand.preisGrund[x.positionId]; delete zustand.bilder[x.positionId]; });
      // Ergebnis direkt übernehmen: n8n speichert den Stand erst kurz nach der Antwort,
      // ein sofortiges Neuladen könnte noch den alten Stand liefern.
      d.ergebnisse.forEach(function (e) {
        zustand.retoure.positionen.forEach(function (p) {
          if (p.positionId === e.positionId && !e.hinweis) Object.keys(e).forEach(function (k) { p[k] = e[k]; });
        });
      });
      zeigeRetoure();
      listenEintragAktualisieren();
    }).catch(function (err) { fehler('ret-error', err.message); aktualisiereAnlegen(); });
  });

  function neuLaden() {
    if (!zustand.retoure) return Promise.resolve();
    return api('retoure', { query: { nr: zustand.retoure.id } }).then(function (d) {
      if (!$('s-ret').hidden && String(d.retoure.id) === String(zustand.retoure.id)) { zustand.retoure = d.retoure; zeigeRetoure(); listenEintragAktualisieren(); }
    });
  }
  function starteAbfrage() { if (!zustand.abfrage) zustand.abfrage = setInterval(function () { neuLaden().catch(function () {}); }, ABFRAGE_SEKUNDEN * 1000); }
  function stoppeAbfrage() { if (zustand.abfrage) { clearInterval(zustand.abfrage); zustand.abfrage = null; } }

  // ---------- ZW-Liste und Protokoll ----------
  // still = nur Zähler in der Seitenleiste auffrischen (beim Start), Fehler nicht anzeigen
  function ladeZwListe(still) {
    if (!still) fehler('zw-error');
    api('zw-liste').then(function (d) {
      zustand.zwListe = d.zwListe;
      zeigeZwListe();
      $('protokoll').innerHTML = d.protokoll.map(function (p) {
        return '<tr><td>' + esc(new Date(p.zeit).toLocaleString('de-DE')) + '</td><td>' + esc(p.benutzer) + '</td><td>' + esc(p.aktion) + '</td><td class="code">' + esc(p.retoureId || '') +
          '</td><td class="code">' + esc(p.positionId || '') + '</td><td>' + esc(p.zustand || '') + '</td><td>' + esc(p.ergebnis || '') + (p.meldung ? ': ' + esc(p.meldung) : '') + '</td></tr>';
      }).join('');
    }).catch(function (err) { if (!still) fehler('zw-error', err.message); });
  }

  // Seitenleiste der ZW-Artikel: Filter mit Anzahl
  var ZW_FILTER = [['offen', 'Bestand noch nicht gebucht'], ['gebucht', 'Bestand gebucht'], ['alle', 'Alle']];
  function zeigeZwFilter() {
    var l = zustand.zwListe, n = { offen: 0, gebucht: 0, alle: l.length };
    l.forEach(function (z) { n[z.bestandGebucht ? 'gebucht' : 'offen']++; });
    $('n-zw').textContent = n.offen ? ' ' + n.offen : '';
    $('zw-filter').innerHTML = ZW_FILTER.map(function (f) {
      return '<button type="button" class="side-item filter" data-filter="' + f[0] + '" aria-current="' + (zustand.zwFilter === f[0]) + '"><span>' + esc(f[1]) + '</span><span class="anzahl">' + n[f[0]] + '</span></button>';
    }).join('');
  }
  $('zw-filter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]'); if (!b) return;
    zustand.zwFilter = b.dataset.filter;
    zeigeZwListe();
  });

  function gefiltert() {
    var f = zustand.zwFilter;
    var such = $('zw-suche').value.trim().toLowerCase();
    return zustand.zwListe.filter(function (z) {
      if (f === 'offen' && z.bestandGebucht) return false;
      if (f === 'gebucht' && !z.bestandGebucht) return false;
      if (!such) return true;
      return [z.retoureId, z.zwVarianteId, z.originalVarianteId, z.barcode, z.name, z.zustand, z.grund].join(' ').toLowerCase().indexOf(such) >= 0;
    });
  }

  function zeigeZwListe() {
    zeigeZwFilter();
    var liste = gefiltert();
    $('zw-liste').innerHTML = liste.map(function (z) {
      var bestand = z.bestandGebucht
        ? '<span class="gebucht">✓ gebucht</span> <small>' + esc(z.gebuchtVon || '') + ' ' + esc(datum(z.gebuchtAm)) + '</small> <button type="button" class="linkbtn" data-id="' + esc(z.id) + '" data-g="0">zurücknehmen</button>'
        : '<button type="button" class="btn small" data-id="' + esc(z.id) + '" data-g="1">Bestand gebucht</button>';
      return '<tr><td>' + esc(datum(z.datum)) + '</td><td class="code">' + esc(z.retoureId) + '</td><td class="code">' + esc(z.zwVarianteId) + '</td><td class="code">' + esc(z.barcode) +
        '</td><td>' + esc(z.name) + '</td><td>' + esc(z.zustand) + '</td><td>' + esc(z.grund || '') + '</td><td>' + eur.format(z.preis) + (z.preisVomLager ? ' <small>(Lager' + (z.preisGrund ? ': ' + esc(z.preisGrund) : '') + ')</small>' : '') +
        '</td><td>' + eur.format(z.streichpreis) + '</td><td>' + esc(z.neuOderPlus1) + '</td><td>' + bestand + '</td></tr>';
    }).join('') || '<tr><td colspan="11">' + (zustand.zwListe.length ? 'Keine Einträge für diesen Filter.' : 'Noch keine Einträge.') + '</td></tr>';
  }
  $('zw-suche').addEventListener('input', zeigeZwListe);

  $('zw-liste').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]'); if (!b) return;
    b.disabled = true;
    fehler('zw-error');
    api('zw-liste-buchen', { body: { id: b.dataset.id, gebucht: b.dataset.g === '1' } }).then(function (d) {
      // Ergebnis direkt übernehmen (n8n speichert den Stand erst nach der Antwort)
      zustand.zwListe = zustand.zwListe.map(function (z) { return z.id === d.zeile.id ? d.zeile : z; });
      zeigeZwListe();
    }).catch(function (err) { b.disabled = false; fehler('zw-error', err.message); });
  });

  $('zw-csv').addEventListener('click', function () {
    var spalten = [['datum', 'Datum'], ['retoureId', 'Retoure'], ['originalVarianteId', 'Original-Variante'], ['zwVarianteId', 'ZW-Variante'], ['barcode', 'Barcode'],
      ['name', 'Name'], ['zustand', 'Zustand'], ['grund', 'Grund'], ['preis', 'Preis'], ['empfehlung', 'Empfehlung'], ['preisVomLager', 'Preis vom Lager'], ['preisGrund', 'Begründung Preis'], ['streichpreis', 'Streichpreis'], ['neuOderPlus1', 'neu/+1'], ['freigegebenVon', 'Freigegeben von'],
      ['bestandGebucht', 'Bestand gebucht'], ['gebuchtVon', 'Gebucht von'], ['gebuchtAm', 'Gebucht am']];
    function zelle(v) {
      if (typeof v === 'number') v = String(v).replace('.', ',');
      if (v === true) v = 'ja'; if (v === false) v = 'nein';
      v = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // keine Formeln in Excel
      return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    var zeilen = [spalten.map(function (s) { return s[1]; }).join(';')].concat(gefiltert().map(function (z) {
      return spalten.map(function (s) { return zelle(z[s[0]]); }).join(';');
    }));
    var blob = new Blob([String.fromCharCode(0xfeff) + zeilen.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zw-liste-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $('reset').addEventListener('click', function () {
    if (!confirm('Probelauf wirklich zurücksetzen? Entscheidungen, Protokoll und ZW-Liste werden geleert.')) return;
    api('zuruecksetzen', { body: {} }).then(function () { zustand.retoure = null; zeige(zustand.tab); setTimeout(function () { ladeListe(); ladeZwListe(); }, 1500); }).catch(function (err) { alert(err.message); });
  });

  // ---------- Start ----------
  zustand.schluessel = lesen('zw-schluessel');
  zustand.name = lesen('zw-name') || '';
  zustand.rolle = lesen('zw-rolle') || '';
  if (zustand.schluessel) start(); else abmelden();
})();
</script>
</body>
</html>
`;

// ZW-Logik: Preis, Barcode, Nummern und Kommentartexte.
// Reines JavaScript ohne Abhängigkeiten. Läuft in Node (Tests) und wird beim Bauen
// des n8n-Workflows in den Code-Baustein kopiert (siehe n8n/bauen.mjs).

/* Standardwerte. In n8n überschreibt der Baustein „Einstellungen“ diese Werte. */
const ZW_STANDARD = {
  abschlagNeuwertig: 0, // Prozent im Normalfall
  abschlagSehrGut: 5,
  abschlagGut: 10,
  abschlagNeuwertigSonderfall: 2, // Prozent bei Neuwertig, wenn Mindestpreis erreicht oder leer
};

const ZW_ZUSTAENDE = {
  'Neuwertig': { endung: 'ZW1', schluessel: 'abschlagNeuwertig' },
  'Sehr gut': { endung: 'ZW2', schluessel: 'abschlagSehrGut' },
  'Gut': { endung: 'ZW3', schluessel: 'abschlagGut' },
};

// Entscheidungen, die keinen Artikel erzeugen
const ZW_OHNE_ARTIKEL = ['Nicht verkaufbar', 'Kein ZW'];

// Bei diesen Entscheidungen muss das Lager einen Grund angeben. Er geht ans Büro
// und später in die Beschreibung des ZW-Artikels.
const ZW_GRUND_PFLICHT = ['Sehr gut', 'Gut', 'Nicht verkaufbar'];
const ZW_GRUND_MAX = 500;

function grundPflicht(zustand) {
  return ZW_GRUND_PFLICHT.includes(zustand);
}

function istZwZustand(zustand) {
  return Object.prototype.hasOwnProperty.call(ZW_ZUSTAENDE, zustand);
}

function istGueltigeEntscheidung(zustand) {
  return istZwZustand(zustand) || ZW_OHNE_ARTIKEL.includes(zustand);
}

// Größter Preis mit ,99 am Ende, der den Betrag nicht übersteigt.
// Gerechnet wird in Cent, damit keine Rundungsfehler entstehen.
function abrundenAuf99(betrag) {
  const cent = Math.round(betrag * 1e6) / 1e4; // Betrag in Cent, Fließkomma-Rauschen entfernt
  let kandidat = Math.floor(cent / 100) * 100 + 99;
  if (kandidat > cent) kandidat -= 100;
  if (kandidat < 99) throw new Error('Preis zu klein: ' + betrag);
  return kandidat / 100;
}

function zahlOderNull(wert) {
  if (wert === null || wert === undefined || wert === '') return null;
  const z = typeof wert === 'number' ? wert : Number(String(wert).replace(',', '.'));
  return Number.isFinite(z) ? z : null;
}

// Preisregel aus Abschnitt 5 der Projektseite.
// Normalfall: jetziger Preis > Mindestpreis → Mindestpreis − Abschlag.
// Sonderfall a: Mindestpreis erreicht (jetziger Preis ≤ Mindestpreis) → jetziger Preis − Abschlag.
// Sonderfall b: Mindestpreis leer oder 0 → jetziger Preis − Abschlag.
// In beiden Sonderfällen gilt bei Neuwertig der Sonderfall-Abschlag (−2 %).
function berechneZwPreis({ jetzigerPreis, mindestpreis, zustand, einkaufspreis }, einstellungen) {
  const e = Object.assign({}, ZW_STANDARD, einstellungen || {});
  if (!istZwZustand(zustand)) throw new Error('Unbekannter Zustand: ' + zustand);
  const jetzt = zahlOderNull(jetzigerPreis);
  if (jetzt === null || jetzt <= 0) throw new Error('Jetziger Preis fehlt');
  const minimum = zahlOderNull(mindestpreis);

  let fall, basis, abschlag;
  if (minimum !== null && minimum > 0 && jetzt > minimum) {
    fall = 'normal';
    basis = minimum;
    abschlag = Number(e[ZW_ZUSTAENDE[zustand].schluessel]);
  } else {
    fall = minimum !== null && minimum > 0 ? 'a' : 'b';
    basis = jetzt;
    abschlag = zustand === 'Neuwertig'
      ? Number(e.abschlagNeuwertigSonderfall)
      : Number(e[ZW_ZUSTAENDE[zustand].schluessel]);
  }

  const roh = basis * (100 - abschlag) / 100;
  const preis = abrundenAuf99(roh);
  const warnungen = [];
  if (fall === 'b') warnungen.push('Mindestpreis ist leer. Preis wurde vom jetzigen Preis berechnet.');
  warnungen.push(...zwPreisWarnungen(preis, { einkaufspreis, streichpreis: jetzt }));
  return { preis, streichpreis: jetzt, fall, basis, abschlag, warnungen };
}

// Warnungen zu einem ZW-Preis. Sie blockieren nicht.
function zwPreisWarnungen(preis, { einkaufspreis, streichpreis }) {
  const warnungen = [];
  const ek = zahlOderNull(einkaufspreis);
  if (ek !== null && preis < ek) warnungen.push('ZW-Preis ' + euro(preis) + ' liegt unter dem Einkaufspreis ' + euro(ek) + '.');
  const sp = zahlOderNull(streichpreis);
  if (sp !== null && preis >= sp) warnungen.push('ZW-Preis ' + euro(preis) + ' ist nicht günstiger als der Streichpreis ' + euro(sp) + '.');
  return warnungen;
}

// Preis, den das Lager eingetippt hat („1.234,56“, „1234,56“ oder „1234.56“). Leer = Empfehlung übernehmen.
function lagerPreisLesen(wert) {
  if (wert === null || wert === undefined || String(wert).trim() === '') return null;
  if (typeof wert === 'number') {
    if (!Number.isFinite(wert)) throw new Error('Preis ist keine Zahl.');
  }
  let t = String(wert).trim().replace(/\s|€/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) throw new Error('Preis „' + String(wert).slice(0, 20) + '“ ist keine gültige Zahl.');
  const preis = Math.round(Number(t) * 100) / 100;
  if (!(preis >= 1) || preis > 100000) throw new Error('Preis muss zwischen 1 € und 100.000 € liegen.');
  return preis;
}

function zwBarcode(ean, zustand) {
  const sauber = String(ean || '').trim();
  if (!/^\d{8,14}$/.test(sauber)) throw new Error('Ungültige EAN: ' + ean);
  if (!istZwZustand(zustand)) throw new Error('Unbekannter Zustand: ' + zustand);
  return sauber + ZW_ZUSTAENDE[zustand].endung;
}

function mitPraefix(praefix, text) {
  const t = String(text || '').trim();
  return t.startsWith(praefix) ? t : praefix + ' ' + t;
}

function zwVariantennummer(modell) {
  return mitPraefix('[ZW]', modell);
}

function zwName(name) {
  return mitPraefix('[Zweite Wahl]', name);
}

function zwKommentar({ zustand, varianteId, plus1, grund }) {
  const mitGrund = grund ? '. Grund: ' + grund : '';
  if (zustand === 'Nicht verkaufbar') return 'Nicht verkaufbar, an Büro' + mitGrund;
  if (zustand === 'Kein ZW') return 'Kein ZW' + mitGrund;
  return (plus1 ? 'ZW +1: ' : 'ZW angelegt: ') + varianteId + ' (' + zustand + ')' + mitGrund;
}

function euro(betrag) {
  return betrag.toFixed(2).replace('.', ',') + ' €';
}


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


// Abfragen an plenty und Shopware planen und ihre Antworten auslesen. Nur lesend.
// Die Abfragen führt n8n aus: plenty über den PlentyONE-Baustein (mehrere Abfragen auf einmal,
// Ergebnisse in derselben Reihenfolge), Shopware über einen HTTP-Baustein (eine Suche).

// Platzhalter, wenn in einer Runde nichts zu holen ist. Liefert leere Ergebnisse.
const LEER_PLENTY = { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: 'ZW-KEINE-ABFRAGE', itemsPerPage: 1 } };
const LEER_SHOPWARE = { limit: 1, filter: [{ type: 'equals', field: 'productNumber', value: 'ZW-KEINE-ABFRAGE' }], includes: { product: ['id'] } };
const SHOPWARE_FELDER = ['id', 'productNumber', 'name', 'ean', 'active', 'stock', 'isCloseout', 'price', 'purchasePrices', 'customFields', 'categoryIds', 'tagIds', 'description'];
// Was der Trockenlauf (6.0) vom plenty-Original braucht, um die Kopie nachzubauen
const PLENTY_ORIGINAL_MIT = 'variationSalesPrices,variationCategories,variationDefaultCategory,variationSuppliers,variationWarehouses,variationBarcodes,properties,tags,unit';
const POSITION_VERSANDKOSTEN = 6;

// Sale-Kategorien und -Tags des Originals bekommt der ZW-Artikel in Shopware nicht (von Tobias bestätigt am 07.10.2026).
// IDs per API gelesen am 07.10.2026. Neue Sale-Unterkategorien müssen hier ergänzt werden (Phase 6: dynamisch laden).
const SALE_KATEGORIEN = {
  '01920f7ac35c752a8113760414000306': 'Sale',
  '019c753f7c9a7bf8a5920e6c349456ea': 'Flash Sale',
  '019c8fca63057eacaa2ff83aaeeb3db4': 'Spring Sale',
  '019f13061667716a9525667c2acb4d56': 'Summer Sale',
  '019f1355481e7d639cb8f821bd02d6a9': '75 EUR Rabatt',
  '019f13556493703cb923c03d32ef347c': '250 EUR Rabatt',
  '01a037ed9aff7e0997523b5585f46a51': 'Autumn Sale',
};
const SALE_TAGS = { '019c75c6b03378f4bb6bb46085c38bdc': 'flash sale' };
const AUFTRAG_EIGENSCHAFT_EXTERNE_NR = 7; // Shop-Auftragsnummer, z. B. MK91001

// Status wie in plenty angezeigt („9.1.1“) in die interne Zahl umrechnen (9.11).
function plentyStatus(text) {
  const teile = String(text === undefined || text === null ? '' : text).trim().split('.');
  if (!teile[0]) return NaN;
  return Number(teile.length <= 2 ? teile.join('.') : teile[0] + '.' + teile.slice(1).join(''));
}

function retourenNummer(nr) {
  const id = String(nr || '').trim().replace(/^R-?/i, '');
  return /^\d{1,12}$/.test(id) ? id : null;
}

// ---------- Abfragen ----------

function anfrageRetourenListe(e) {
  const status = plentyStatus(e.statusOffen || '9.1.1');
  return [{
    method: 'GET', endpoint: '/rest/orders',
    query: { typeId: 3, statusFrom: status, statusTo: status, itemsPerPage: 250, sortBy: 'id', sortOrder: 'desc', 'with[]': 'orderItems' },
  }];
}

function anfrageRetoure(id) {
  return [
    { method: 'GET', endpoint: '/rest/orders/' + id, query: { 'with[]': 'orderItems' } },
    { method: 'GET', endpoint: '/rest/comments/order/' + id },
  ];
}

function anfrageVarianten(ids) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { id: ids.join(','), with: 'variationBarcodes', itemsPerPage: 100 } };
}

function anfrageBarcode(code) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { barcode: code, itemsPerPage: 5 } };
}

// Originale über die Produktnummer (= plenty-Varianten-ID). Mit EANs zusätzlich alle Artikel mit derselben EAN,
// darunter die vorhandenen ZW-Artikel (für Bestand +1 im Trockenlauf).
function shopwareSuche(varianteIds, eans) {
  const ids = [...new Set(varianteIds.map(String))];
  if (!ids.length) return LEER_SHOPWARE;
  const mitEan = [...new Set((eans || []).map(String))];
  const filter = mitEan.length
    ? [{ type: 'multi', operator: 'or', queries: [{ type: 'equalsAny', field: 'productNumber', value: ids }, { type: 'equalsAny', field: 'ean', value: mitEan }] }]
    : [{ type: 'equalsAny', field: 'productNumber', value: ids }];
  return { limit: mitEan.length ? 100 : ids.length, filter, includes: { product: SHOPWARE_FELDER } };
}

function anfrageOriginale(ids) {
  return { method: 'GET', endpoint: '/rest/items/variations', query: { id: ids.join(','), with: PLENTY_ORIGINAL_MIT, itemsPerPage: 100 } };
}

function anfrageArtikel(itemId) {
  return [
    { method: 'GET', endpoint: '/rest/items/' + itemId },
    { method: 'GET', endpoint: '/rest/items/' + itemId + '/item_shipping_profiles' },
  ];
}

// Artikel-IDs der Originale, in fester Reihenfolge (Runde B fragt sie in dieser Reihenfolge ab)
function artikelIdsAus(variantenAntwort) {
  return [...new Set(eintraege(variantenAntwort).map((v) => String(v.itemId)).filter((id) => /^\d+$/.test(id)))];
}

// ---------- Antworten auslesen ----------

function plentyFehler(antworten) {
  const f = (antworten || []).find((a) => a && !Array.isArray(a) && a.error);
  return f ? String(f.error) : null;
}

function eintraege(antwort) {
  if (Array.isArray(antwort)) return antwort;
  return (antwort && Array.isArray(antwort.entries)) ? antwort.entries : [];
}

// Rabatte wie „2 % Rabatt bei Vorkasse per Überweisung“ oder „Summer Sale - 75 EUR Rabatt“ stehen in plenty
// als normale Artikel-Positionen mit negativem Preis in der Retoure. Sie dürfen nicht zur Auswahl stehen.
function istRabatt(p) {
  const preis = ((p.amounts || [])[0] || {}).priceGross;
  return (typeof preis === 'number' && preis < 0) || /rabatt/i.test(String(p.orderItemName || ''));
}

function rabattPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN && istRabatt(p))
    .map((p) => ({ name: p.orderItemName || '', preis: zahl(((p.amounts || [])[0] || {}).priceGross) }));
}

function artikelPositionen(auftrag) {
  return (auftrag.orderItems || [])
    .filter((p) => Number(p.itemVariationId) > 0 && Number(p.typeId) !== POSITION_VERSANDKOSTEN && !istRabatt(p))
    .map((p) => ({ positionId: String(p.id), varianteId: String(p.itemVariationId), name: p.orderItemName || '', menge: Number(p.quantity) || 1 }));
}

function shopAuftrag(auftrag) {
  const p = (auftrag.properties || []).find((x) => Number(x.typeId) === AUFTRAG_EIGENSCHAFT_EXTERNE_NR);
  return p ? String(p.value) : '';
}

const IST_EAN = /^\d{8,14}$/;

function eanAusVariante(v) {
  const codes = (v.variationBarcodes || []).filter((b) => IST_EAN.test(String(b.code || '')));
  const eins = codes.find((b) => Number(b.barcodeId) === 1) || codes[0];
  if (eins) return String(eins.code);
  return IST_EAN.test(String(v.externalId || '')) ? String(v.externalId) : null;
}

function textOhneHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function zahl(x) {
  const n = typeof x === 'number' ? x : Number(String(x === undefined || x === null ? '' : x).replace(',', '.'));
  return x === null || x === undefined || x === '' || !Number.isFinite(n) ? null : n;
}

// Was die ZW-Logik aus einem Shopware-Produkt braucht.
function shopwareProdukt(p) {
  const preis = (p.price || [])[0] || {};
  const ek = (p.purchasePrices || [])[0] || {};
  const cf = p.customFields || {};
  const brutto = zahl(preis.gross);
  const netto = zahl(preis.net);
  return {
    id: p.id,
    produktnummer: String(p.productNumber),
    name: p.name || '',
    ean: p.ean || '',
    preis: zahl(preis.gross),
    streichpreisAktuell: preis.listPrice ? zahl(preis.listPrice.gross) : null,
    mindestpreis: zahl(cf.custom_price_minprice),
    einkaufspreis: zahl(ek.gross),
    zustand: cf.custom_secondhand_condition || null,
    nichtUebernehmen: nichtUebernehmen(p),
    // Für den Trockenlauf (Schreibbefehle)
    beschreibung: p.description || null,
    bestand: zahl(p.stock),
    abverkauf: !!p.isCloseout,
    waehrungId: preis.currencyId || null,
    nettoFaktor: brutto && netto ? netto / brutto : null,
    saleKategorieIds: (p.categoryIds || []).filter((id) => SALE_KATEGORIEN[id]),
    saleTagIds: (p.tagIds || []).filter((id) => SALE_TAGS[id]),
  };
}

// Sale-Kategorien und Sale-Tags des Originals, die der ZW-Artikel nicht bekommt.
function nichtUebernehmen(p) {
  return []
    .concat((p.categoryIds || []).filter((id) => SALE_KATEGORIEN[id]).map((id) => 'Kategorie ' + SALE_KATEGORIEN[id]))
    .concat((p.tagIds || []).filter((id) => SALE_TAGS[id]).map((id) => 'Tag ' + SALE_TAGS[id]));
}

function shopwareNachNummer(antwort) {
  const liste = (antwort && Array.isArray(antwort.data)) ? antwort.data : [];
  const karte = {};
  for (const p of liste) karte[String(p.productNumber)] = shopwareProdukt(p);
  return karte;
}


// Trockenlauf (Phase 6.0): alle Schreibbefehle für plenty und Shopware mit echten Daten bauen, aber NICHT senden.
// Die Liste steht auf der Freigabe-Seite. So sieht Tobias vor dem ersten echten Schreiben, was angelegt würde.
// IDs, die erst beim Anlegen entstehen, stehen als Platzhalter in spitzen Klammern, z. B. ‹neue Varianten-ID›.
// Endpunkte: Lesezugriff auf dieselben Adressen am 07.10.2026 geprüft (außer variation_suppliers: Lesezugang „Forbidden“).


const NEU_ARTIKEL = '‹neue Artikel-ID›';
const NEU_VARIANTE = '‹neue Varianten-ID›';
const NEU_PRODUKT = '‹neue Shopware-Produkt-ID›';
const BILD_ORDNER = '‹Ordner ZW-Retouren›';
const BILD_DATEI = '‹Bilddatei›';

// Feste Werte aus Abschnitt 5b/6 der Projektseite (per API gelesen am 07.10.2026)
const PLENTY_ZW = { zustand: 4, zustandApi: 5, typLagerware: 0, tagBWare: 32 };
const SHOPWARE_BWARE = { kategorie: '01920f841f897e6ab196fe9fd2af50a0', tag: '019745bc913a7554aef3d1634e45c2a7' };
const SHOPWARE_ZUSTAND = { 'Neuwertig': 'likenew', 'Sehr gut': 'verygood', 'Gut': 'good' };

function befehl(system, titel, method, endpoint, body, hinweis) {
  const b = { system, titel, method, endpoint };
  if (body !== undefined) b.body = body;
  if (hinweis) b.hinweis = hinweis;
  return b;
}

function heute(jetzt) {
  return new Date(jetzt).toISOString().slice(0, 10);
}

function escText(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gerundet(x, stellen) {
  const f = Math.pow(10, stellen);
  return Math.round(x * f) / f;
}

// Shopware-Preis: brutto aus der Preisregel, netto mit demselben Steuersatz wie beim Original
function shopwarePreis(sw, brutto, streichpreis) {
  const faktor = sw.nettoFaktor || 1 / 1.19;
  const preis = { currencyId: sw.waehrungId, gross: brutto, net: gerundet(brutto * faktor, 4), linked: true };
  if (streichpreis) preis.listPrice = { currencyId: sw.waehrungId, gross: streichpreis, net: gerundet(streichpreis * faktor, 4), linked: true };
  return [preis];
}

// Beschreibung im Shopware-Klon: Grund vom Lager oben, darunter die Beschreibung des Originals
function shopwareBeschreibung(zustand, grund, original) {
  if (!grund) return null;
  return '<p><strong>Zweite Wahl (' + escText(zustand) + '):</strong> ' + escText(grund) + '</p>' + (original || '');
}

function ohneLeere(obj) {
  const o = {};
  for (const k of Object.keys(obj)) if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') o[k] = obj[k];
  return o;
}

// ---------- plenty: Kopie des Originals nachbauen ----------

// Eigenschaft wie beim Original (plenty-Doku, geprüft 13.10.2026):
// Auswahl → POST /rest/properties/relations mit selectionRelationId (= ID der Auswahl).
// Andere Arten → Relation anlegen, danach je Wert POST /rest/properties/relations/values.
// Die Art (cast) steht nicht immer in den gelesenen Daten. Ohne cast gilt ein einzelner Zahlenwert ohne Sprache ('0') als Auswahl.
function istAuswahl(x) {
  const cast = (x.propertyRelation || x.property || {}).cast || x.cast;
  if (cast) return cast === 'selection';
  const werte = x.relationValues || [];
  return werte.length === 1 && String(werte[0].lang) === '0' && /^\d+$/.test(String(werte[0].value));
}

function eigenschaftBefehle(x) {
  const titel = 'Eigenschaft ' + x.propertyId + ' wie Original';
  const basis = { propertyId: x.propertyId, relationTypeIdentifier: x.relationTypeIdentifier || 'item', relationTargetId: NEU_VARIANTE };
  if (istAuswahl(x)) {
    return [befehl('plenty', titel, 'POST', '/rest/properties/relations',
      Object.assign(basis, { selectionRelationId: Number(x.relationValues[0].value) }))];
  }
  const relation = '‹Relation-ID Eigenschaft ' + x.propertyId + '›';
  return [befehl('plenty', titel, 'POST', '/rest/properties/relations', basis, 'Antwort liefert ' + relation + '.')]
    .concat((x.relationValues || []).map((r) => befehl('plenty', titel + ': Wert (' + r.lang + ')', 'POST', '/rest/properties/relations/values',
      { propertyRelationId: relation, lang: String(r.lang), value: String(r.value) })));
}

function plentyNeu(v, p, hinweise) {
  const va = p.variante;
  const art = p.artikel || {};
  const schritte = [];
  const pfad = '/rest/items/' + NEU_ARTIKEL + '/variations/' + NEU_VARIANTE;

  schritte.push(befehl('plenty', 'Artikel mit Hauptvariante anlegen', 'POST', '/rest/items', ohneLeere({
    stockType: PLENTY_ZW.typLagerware,
    condition: PLENTY_ZW.zustand,
    conditionApi: PLENTY_ZW.zustandApi,
    manufacturerId: art.manufacturerId,
    producingCountryId: art.producingCountryId,
    customsTariffNumber: art.customsTariffNumber,
    variations: [ohneLeere({
      number: v.variantennummer,
      model: va.model,
      externalId: va.externalId,
      isActive: false,
      availability: va.availability,
      mainWarehouseId: va.mainWarehouseId,
      purchasePrice: va.purchasePrice,
      vatId: va.vatId,
      weightG: va.weightG,
      weightNetG: va.weightNetG,
      widthMM: va.widthMM,
      lengthMM: va.lengthMM,
      heightMM: va.heightMM,
      unit: va.unit ? { unitId: va.unit.unitId, content: va.unit.content } : null,
      variationCategories: (va.variationCategories || []).map((c) => ({ categoryId: c.categoryId })),
    })],
  }), 'Antwort liefert ' + NEU_ARTIKEL + ' und ' + NEU_VARIANTE + '. Die Varianten-ID wird die Shopware-Produktnummer.'));

  const texte = (art.texts || []).map((t) => ohneLeere({
    lang: t.lang, name: zwName(t.name1), name2: t.name2, name3: t.name3, previewDescription: t.shortDescription,
    description: t.description, technicalData: t.technicalData, metaDescription: t.metaDescription, metaKeywords: t.keywords, title: t.title,
  }));
  if (!texte.length) hinweise.push('plenty: Texte des Originals fehlen, Name aus Shopware genommen.');
  for (const t of (texte.length ? texte : [{ lang: 'de', name: v.name }])) {
    schritte.push(befehl('plenty', 'Texte (' + t.lang + ')', 'POST', pfad + '/descriptions', t));
  }

  schritte.push(befehl('plenty', 'Barcode EAN1', 'POST', pfad + '/variation_barcodes', { barcodeId: 1, code: v.barcode }));

  const preise = (va.variationSalesPrices || []).filter((x) => Number(x.price) > 0);
  for (const x of preise) {
    schritte.push(befehl('plenty', 'Verkaufspreis ' + x.salesPriceId + ' wie Original', 'POST', pfad + '/variation_sales_prices', { salesPriceId: x.salesPriceId, price: x.price }));
  }

  for (const x of va.variationSuppliers || []) {
    schritte.push(befehl('plenty', 'Lieferant ' + x.supplierId + ' wie Original', 'POST', pfad + '/variation_suppliers', ohneLeere({
      supplierId: x.supplierId, purchasePrice: x.purchasePrice, minimumPurchase: x.minimumPurchase, itemNumber: x.itemNumber,
      deliveryTimeInDays: x.deliveryTimeInDays, packagingUnit: x.packagingUnit, discount: x.discount, isDiscountable: x.isDiscountable,
    })));
  }

  for (const x of va.variationWarehouses || []) {
    schritte.push(befehl('plenty', 'Lager ' + x.warehouseId, 'POST', pfad + '/variation_warehouses', { warehouseId: x.warehouseId }));
  }

  for (const x of va.variationDefaultCategory || []) {
    schritte.push(befehl('plenty', 'Standardkategorie', 'POST', pfad + '/variation_default_categories', { branchId: x.branchId, plentyId: x.plentyId }));
  }

  // Tags: ein Aufruf pro Tag (plenty-Doku: POST /rest/tags/relationships, geprüft 13.10.2026)
  const tagIds = [...new Set((va.tags || []).map((t) => Number(t.tagId)).concat([PLENTY_ZW.tagBWare]))];
  for (const tagId of tagIds) {
    schritte.push(befehl('plenty', 'Tag ' + tagId + (tagId === PLENTY_ZW.tagBWare ? ' (B-Ware)' : ' wie Original'), 'POST', '/rest/tags/relationships',
      { tagId, tagType: 'variation', relationshipValue: NEU_VARIANTE }));
  }

  for (const x of p.versandprofile || []) {
    schritte.push(befehl('plenty', 'Versandprofil ' + x.profileId, 'POST', '/rest/items/' + NEU_ARTIKEL + '/item_shipping_profiles', { profileId: x.profileId }));
  }
  if (!(p.versandprofile || []).length) hinweise.push('plenty: Original hat keine Versandprofile.');

  for (const x of va.properties || []) schritte.push(...eigenschaftBefehle(x));

  // Einkaufspreis: wie beim Original, in der Variante und beim Lieferanten (entschieden 12.10.2026)
  if (Number(va.purchasePrice) !== Number(((va.variationSuppliers || [])[0] || {}).purchasePrice)) {
    hinweise.push('Einkaufspreis wie beim Original: Variante ' + va.purchasePrice + ', Lieferant ' + ((va.variationSuppliers || [])[0] || {}).purchasePrice + '.');
  }
  return schritte;
}

// ---------- Shopware: Original klonen und anpassen ----------

function shopwareNeu(v, sw, jetzt, hinweise) {
  const schritte = [];
  const ueberschreiben = {
    productNumber: NEU_VARIANTE,
    name: v.name,
    active: false,
    stock: 1,
    isCloseout: true,
    releaseDate: heute(jetzt),
    price: shopwarePreis(sw, v.preis, v.streichpreis),
    customFields: { custom_secondhand_condition: SHOPWARE_ZUSTAND[v.zustand] },
  };
  const beschreibung = shopwareBeschreibung(v.zustand, v.grund, sw.beschreibung);
  if (beschreibung) ueberschreiben.description = beschreibung;
  schritte.push(befehl('shopware', 'Original ' + sw.produktnummer + ' klonen', 'POST', '/api/_action/clone/product/' + sw.id,
    { overwrites: ueberschreiben, cloneChildren: false },
    'Antwort liefert ' + NEU_PRODUKT + '. Beim ersten Test inaktiv. Bilder, Eigenschaften, Zusatzfelder, Einkaufspreis, Lieferzeit, GTIN kommen mit dem Klon.'));

  schritte.push(befehl('shopware', 'Kategorie und Tag B-Ware dazu', 'PATCH', '/api/product/' + NEU_PRODUKT,
    { categories: [{ id: SHOPWARE_BWARE.kategorie }], tags: [{ id: SHOPWARE_BWARE.tag }] }));
  for (const id of sw.saleKategorieIds || []) {
    schritte.push(befehl('shopware', 'Sale-Kategorie entfernen', 'DELETE', '/api/product/' + NEU_PRODUKT + '/categories/' + id));
  }
  for (const id of sw.saleTagIds || []) {
    schritte.push(befehl('shopware', 'Sale-Tag entfernen', 'DELETE', '/api/product/' + NEU_PRODUKT + '/tags/' + id));
  }

  // Bilder vom Lager: beim Anlegen schon in den Medienordner „ZW-Retouren“ hochgeladen (bilderHochladenBefehle),
  // jetzt direkt hinter das Hauptbild. Die Bilder des Klons ab Position 1 rücken nach hinten.
  const medien = v.bilderMedien || [];
  if (medien.length) {
    schritte.push(befehl('shopware', 'Lager-Bilder als 2. Bild einsortieren', 'PATCH', '/api/product/' + NEU_PRODUKT, {
      media: medien.map((m, i) => ({ id: m.produktMediaId, mediaId: m.mediaId, position: i + 1 })),
    }, 'Vorher GET /api/product/' + NEU_PRODUKT + '/media lesen und alle Bilder außer dem Hauptbild (kleinste position) um ' + medien.length +
      ' nach hinten schieben (position + ' + medien.length + '), z. B. im selben PATCH mit ihrer id. Hauptbild (coverId) bleibt.'));
  } else if (v.bilder > 0) {
    hinweise.push('Bilder vom Lager nur in der Mail: Die Position wurde vor dem Update vom 12.10.2026 angelegt.');
  }
  return schritte;
}

// Beim Anlegen (vor der Freigabe): Bilder vom Lager in den Shopware-Medienordner „ZW-Retouren“ hochladen, noch keinem Artikel
// zugeordnet. Die Medien-IDs stehen fest (bilderMedien in ablauf.js). Die Datei hängt am Item als binary „datei“
// (Baustein „Schreibbefehle aufteilen“), in der TMP-Tabelle steht dafür ‹Bilddatei›.
function bilderHochladenBefehle(v, bilder, versuch, ordnerId) {
  const schritte = [];
  (v.bilderMedien || []).forEach((m, i) => {
    const b = bilder[i] || {};
    const endung = String(m.name || '').split('.').pop() || 'jpg';
    const datei = 'zw-' + v.retoureId + '-' + v.positionId + '-' + versuch + '-' + (i + 1);
    schritte.push(befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager: Medium anlegen', 'POST', '/api/media',
      { id: m.mediaId, mediaFolderId: ordnerId || BILD_ORDNER },
      ordnerId ? 'Ordner ZW-Retouren aus Einstellungen (shopwareBilderOrdner).' : 'Ordner ZW-Retouren in Shopware anlegen und seine ID in Einstellungen → shopwareBilderOrdner eintragen.'));
    const hoch = befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager hochladen', 'POST',
      '/api/_action/media/' + m.mediaId + '/upload?extension=' + endung + '&fileName=' + datei, BILD_DATEI,
      'Datei = binary „datei“ dieses Items (' + m.mimeType + '), als Body senden mit Content-Type ' + m.mimeType + '. Bei Ablehnung wird das Medium wieder gelöscht.');
    hoch.datei = { daten: b.daten, mimeType: m.mimeType, name: datei + '.' + endung };
    schritte.push(hoch);
  });
  return schritte;
}

// Hochgeladene Bilder wieder löschen (abgelehnt, Mail nicht gesendet oder doch nur +1)
function bilderLoeschenBefehle(medien, grund) {
  return (medien || []).map((m, i) => befehl('shopware', 'Bild ' + (i + 1) + ' vom Lager löschen', 'DELETE', '/api/media/' + m.mediaId, undefined,
    'Grund: ' + grund + '. Das Bild wurde beim Anlegen hochgeladen und wird nicht gebraucht.'));
}

// Nach dem echten Anlegen: neue Varianten-ID in die Zeile der ZW-Liste (n8n Data Table ZW_LISTE, kein HTTP)
function zwListeBefehl(zeileId) {
  return befehl('n8n', 'ZW-Liste: neue Varianten-ID eintragen', 'UPDATE', 'Data Table ZW_LISTE, Zeile zeileId = ' + zeileId,
    { zwVarianteId: NEU_VARIANTE, probelauf: false },
    'Data-Table-Baustein „Update row(s)“, Filter zeileId = ' + zeileId + '. Im Probelauf steht dort SIM-….');
}

// ---------- Plan für eine Position ----------

// v: Vorschau der Position (mit grund, bilder, preis). o: { plenty: { variante, artikel, versandprofile }, shopware, shopwareZw }
function zwSchreibplan(v, o, jetzt) {
  const hinweise = [];
  const fehlt = [];
  let schritte = [];
  const sw = o.shopware;

  if (v.neu) {
    if (o.plenty && o.plenty.variante) schritte = schritte.concat(plentyNeu(v, o.plenty, hinweise));
    else fehlt.push('plenty-Daten des Originals ' + v.originalVarianteId);
    if (sw && sw.id) schritte = schritte.concat(shopwareNeu(v, sw, jetzt, hinweise));
    else fehlt.push('Shopware-Daten des Originals ' + v.originalVarianteId);
  } else if (v.bestehendSimuliert) {
    hinweise.push('+1 auf einen im Probelauf nachgestellten Artikel (' + v.bestehendeVarianteId + '). Im Echtbetrieb gäbe es ihn wirklich.');
    schritte.push(befehl('shopware', 'Bestand +1', 'PATCH', '/api/product/‹Shopware-ID von ' + v.bestehendeVarianteId + '›', { stock: '‹Bestand + 1›' }));
  } else if (o.shopwareZw && o.shopwareZw.id) {
    schritte.push(befehl('shopware', 'Bestand +1 auf ' + v.bestehendeVarianteId, 'PATCH', '/api/product/' + o.shopwareZw.id,
      { stock: (Number(o.shopwareZw.bestand) || 0) + 1 }, 'Bestand jetzt ' + (Number(o.shopwareZw.bestand) || 0) + '. Wird direkt vor dem Schreiben neu gelesen.'));
    if (!o.shopwareZw.abverkauf) schritte.push(befehl('shopware', 'Abverkauf an', 'PATCH', '/api/product/' + o.shopwareZw.id, { isCloseout: true }));
  } else {
    fehlt.push('ZW-Artikel ' + v.bestehendeVarianteId + ' in Shopware (gesucht über die EAN)');
  }
  if (!v.neu) hinweise.push('plenty: kein Schreibbefehl. Den Bestand bucht das Lager laut ZW-Liste.');
  return { erstellt: new Date(jetzt).toISOString(), schritte, hinweise, fehlt };
}

// Befehle an die Retoure: Kommentar und Status
function kommentarBefehl(retoureId, text) {
  return befehl('plenty', 'Kommentar in Retoure ' + retoureId, 'POST', '/rest/comments',
    { referenceType: 'order', referenceValue: Number(retoureId), text, isVisibleForContact: false });
}

// Status wie auf der Seite (9.1.3) → intern in plenty (9.13)
function statusBefehl(retoureId, status) {
  return befehl('plenty', 'Retoure ' + retoureId + ' auf Status ' + status, 'PUT', '/rest/orders/' + retoureId,
    { statusId: Number(String(status).replace(/^(\d+)\.(\d+)\.(\d+)$/, '$1.$2$3')) });
}

// Befehle an die Retoure, die bei der Entscheidung dazukommen
function retoureBefehle(retoureId, kommentar, neuerStatus) {
  const b = [kommentarBefehl(retoureId, kommentar)];
  if (neuerStatus) b.push(statusBefehl(retoureId, neuerStatus));
  return b;
}

// ---------- TMP-Tabelle: Schreibbefehle als Zeilen statt senden ----------
// Die IT ersetzt später den Baustein „TMP-Tabelle schreiben“ durch echte Schreib-Bausteine.
// Eine Zeile = ein Befehl. Zeilen eines Laufs (lauf) gehören zusammen und laufen in der Reihenfolge von nr.

// Platzhalter wie ‹neue Varianten-ID› in einem Befehl (Endpunkt und Inhalt)
function platzhalterIn(b) {
  const text = b.endpoint + ' ' + (b.body === undefined ? '' : (typeof b.body === 'string' ? b.body : JSON.stringify(b.body)));
  return [...new Set(text.match(/‹[^›]*›/g) || [])];
}

// Hinweis für die Prüfung, kein Schreibbefehl (system „info“, wird beim echten Schreiben übersprungen)
function infoZeile(titel, hinweis) {
  return { system: 'info', titel, method: '', endpoint: '', hinweis };
}

// datei (Bild vom Lager) wandert nicht in die Tabelle: „Schreibbefehle aufteilen“ macht daraus binary „datei“.
function tmpZeile(b, nr, lauf, zeit) {
  const zeile = {
    lauf, nr, zeit,
    aktion: b.aktion || '',
    retoureId: b.retoureId ? String(b.retoureId) : '',
    positionId: b.positionId ? String(b.positionId) : '',
    system: b.system,
    titel: b.titel,
    method: b.method || '',
    endpoint: b.endpoint || '',
    body: b.body === undefined ? '' : (typeof b.body === 'string' ? b.body : JSON.stringify(b.body, null, 2)),
    hinweis: b.hinweis || '',
    platzhalter: b.system === 'info' ? '' : platzhalterIn(b).join(', '),
    status: b.system === 'info' ? 'info' : 'offen',
  };
  if (b.datei) zeile.datei = b.datei;
  return zeile;
}

// Plan als HTML für die Freigabe-Seite
function schreibplanHtml(plan, extra) {
  if (!plan) return '';
  const schritte = plan.schritte.concat(extra || []);
  const titel = { plenty: 'plenty', shopware: 'Shopware', n8n: 'n8n' };
  return '<h2>Trockenlauf: ' + schritte.length + ' Schreibbefehle (nicht gesendet)</h2>' +
    '<p class="m">So würde n8n nach „Freigeben“ in plenty und Shopware schreiben. ‹…› sind IDs, die erst beim Anlegen entstehen.</p>' +
    (plan.fehlt.length ? '<div class="w">Fehlt für den Plan: ' + plan.fehlt.map(escText).join(', ') + '</div>' : '') +
    plan.hinweise.map((h) => '<div class="i">' + escText(h) + '</div>').join('') +
    '<ol class="plan">' + schritte.map((s) =>
      '<li><b>' + titel[s.system] + ':</b> ' + escText(s.titel) + '<br><code>' + s.method + ' ' + escText(s.endpoint) + '</code>' +
      (s.body !== undefined ? '<pre>' + escText(typeof s.body === 'string' ? s.body : JSON.stringify(s.body, null, 2)) + '</pre>' : '') +
      (s.hinweis ? '<span class="m">' + escText(s.hinweis) + '</span>' : '') + '</li>').join('') + '</ol>';
}


// Ablauf der ZW-Station: verteilt jede Anfrage an die passende Aktion.
// Stand Phase 6.0: Retouren, Artikel und Preise kommen echt aus plenty und Shopware (nur lesend).
// Anlegen wird nur nachgestellt: nichts wird in plenty oder Shopware geschrieben („Probelauf“).
// Trockenlauf: Beim Anlegen werden alle Schreibbefehle mit echten Daten gebaut und auf der Freigabe-Seite gezeigt, nicht gesendet.
// TMP-Tabelle: Alles, was im Echtbetrieb in plenty oder Shopware geschrieben würde (Kopie, Klon, +1, Kommentare, Status),
// hängt als „schreiben“ an der Antwort. n8n schreibt es in die Data Table ZW_TMP. Die IT ersetzt diesen Baustein
// später durch die echten Schreib-Bausteine.
// Protokoll und ZW-Liste liegen in den Data Tables ZW_PROTOKOLL und ZW_LISTE. Neue Zeilen hängen als „ablage“ an der Antwort,
// n8n schreibt sie am Ende. Gelesen werden sie nur für die ZW-Liste (Bausteine „ZW-Liste lesen“ und „Protokoll lesen“).
// Der übrige Zustand (offene Freigaben, Positionen, Zwischenspeicher) liegt im Speicher des Workflows.
// Beim Bauen des n8n-Workflows wird alles zwischen NUR-NODE-ANFANG und NUR-NODE-ENDE entfernt.
//
// Ablauf in n8n pro Anfrage:
//   Webhook → Einstellungen → Vorbereiten (zwVorbereiten) → [plenty Runde A → Runde B planen (zwRundeB)
//   → plenty Runde B → Shopware | ZW-Liste lesen → Protokoll lesen] → ZW-Logik (zwVerarbeiten) → [Mails]
//   → [TMP-Tabelle (zwNachTmp)] → Ablage → [Protokoll schreiben] → [ZW-Liste schreiben] → Antwort
// Die eckigen Klammern laufen nur, wenn sie gebraucht werden.


const ERLEDIGT = ['angelegt', 'plus1', 'nicht_verkaufbar', 'kein_zw'];
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MINUTEN = 15;
const MAX_ZWISCHENSPEICHER_RETOUREN = 300;
// Fertige Retouren stehen so lange im Ordner „Fertig“, danach räumt die Station sie weg.
const FERTIG_TAGE = 7;
const DATEN_AKTIONEN = ['retouren', 'retoure', 'vorschau', 'anlegen'];
// Diese Aktionen lesen die Data Tables ZW_LISTE (neueste 300 Zeilen) und ZW_PROTOKOLL (neueste 50)
const TABELLEN_AKTIONEN = ['zw-liste', 'zw-liste-buchen'];
const ZW_LISTE_MAX = 300;
const PROTOKOLL_MAX = 50;
// Bilder zum Grund: höchstens 3 pro Position. Die Seite verkleinert sie vorher (JPEG, etwa 300 KB).
const BILDER_MAX = 3;
const BILD_MAX_ZEICHEN = 2500000;
const BILD_TYPEN = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Trockenlauf: so viele Schreibpläne bleiben gespeichert (die ältesten fallen weg)
const MAX_SCHREIBPLAENE = 50;
// So weit darf das Lager vom Preisvorschlag abweichen, ohne den Preis zu begründen (entschieden 08.10.2026).
// Überschreibbar mit einstellungen.preisAbweichungMax.
const PREIS_ABWEICHUNG_OHNE_GRUND = 50;

// ---------- Einstieg ----------

// Welche Aktion? Aus der Webhook-Adresse. Ohne Adresse und ohne Kopfzeilen (Testlauf direkt in n8n,
// nicht von außen erreichbar) aus body.aktion oder query.aktion.
function zwRoute(anfrage) {
  const url = String(anfrage.url || '');
  const ueberWebhook = !!(anfrage.headers && (anfrage.headers.host || anfrage.headers.Host));
  if (!url && !ueberWebhook) {
    const a = (anfrage.body && anfrage.body.aktion) || (anfrage.query && anfrage.query.aktion) || '';
    return { aktion: String(a), testlauf: true };
  }
  const pfad = url.split('?')[0].replace(/\/+$/, '');
  return { aktion: pfad.slice(pfad.lastIndexOf('/') + 1), testlauf: false };
}

// Schritt 1 in n8n: Welche Daten braucht diese Anfrage? Liefert die Abfragen für plenty Runde A und Shopware.
function zwVorbereiten(anfrage, k) {
  try {
    const speicher = k.speicher;
    speicherVorbereiten(speicher);
    const e = k.einstellungen || {};
    const route = zwRoute(anfrage);
    const tabellen = TABELLEN_AKTIONEN.includes(route.aktion);
    if (!DATEN_AKTIONEN.includes(route.aktion) && !tabellen) return { weiter: 'logik' };
    if (!route.testlauf) {
      // Ohne gültige Anmeldung keine Abfragen an plenty und Shopware. Die Ablehnung schreibt die ZW-Logik.
      const g = String(e.geheimSchluessel || '').trim().length >= 32 ? String(e.geheimSchluessel).trim() : speicher.geheimnis;
      const kopf = String((anfrage.headers || {}).authorization || '');
      if (!g || !schluesselPruefen(g, kopf.replace(/^Bearer\s+/i, ''), k.jetzt)) return { weiter: 'logik' };
    }
    const q = anfrage.query || {};
    const body = anfrage.body || {};

    if (tabellen) return { weiter: 'tabellen', plan: { art: 'tabellen' } };
    if (route.aktion === 'retouren') {
      return { weiter: 'daten', plan: { art: 'retouren' }, plenty: anfrageRetourenListe(e), shopware: LEER_SHOPWARE };
    }
    if (route.aktion === 'retoure') {
      const id = retourenNummer(q.nr);
      if (!id) return { weiter: 'logik' };
      return { weiter: 'daten', plan: { art: 'retoure', id }, plenty: anfrageRetoure(id), shopware: LEER_SHOPWARE };
    }
    // vorschau und anlegen: Barcodes der möglichen ZW-Artikel in plenty suchen, Originale in Shopware lesen
    const entscheidungen = Array.isArray(body.entscheidungen) ? body.entscheidungen.slice(0, 50) : [];
    const barcodes = [];
    const varianten = [];
    const eans = [];
    for (const x of entscheidungen) {
      const pos = speicher.cache.positionen[String(x.positionId || '')];
      if (!pos || !pos.ean || !istZwZustand(String(x.zustand || ''))) continue;
      for (const code of [zwBarcode(pos.ean, x.zustand), pos.ean + 'ZW']) if (!barcodes.includes(code)) barcodes.push(code);
      varianten.push(pos.varianteId);
      eans.push(pos.ean);
    }
    if (!barcodes.length) return { weiter: 'logik' };
    if (route.aktion === 'vorschau') {
      return { weiter: 'daten', plan: { art: 'vorschau', barcodes }, plenty: barcodes.map(anfrageBarcode), shopware: shopwareSuche(varianten) };
    }
    // Anlegen: zusätzlich das plenty-Original mit allen Feldern (Runde B: Artikel und Versandprofile)
    // und in Shopware alle Artikel mit derselben EAN (vorhandene ZW-Artikel). Für den Trockenlauf.
    const ids = [...new Set(varianten)];
    return {
      weiter: 'daten', plan: { art: 'anlegen', barcodes, originale: true },
      plenty: barcodes.map(anfrageBarcode).concat([anfrageOriginale(ids)]), shopware: shopwareSuche(varianten, eans),
    };
  } catch (err) {
    return { weiter: 'logik' };
  }
}

// Schritt 2 in n8n: Abfragen für plenty Runde B, abhängig von den Ergebnissen aus Runde A.
function zwRundeB(plan, antwortenA) {
  if (plan && plan.art === 'retoure' && !plentyFehler(antwortenA) && antwortenA[0]) {
    const ids = [...new Set(artikelPositionen(antwortenA[0]).map((p) => p.varianteId))];
    if (ids.length) return [anfrageVarianten(ids)];
  }
  // Trockenlauf: Artikel und Versandprofile der Originale (je zwei Abfragen pro Artikel)
  if (plan && plan.art === 'anlegen' && plan.originale && !plentyFehler(antwortenA)) {
    const ids = artikelIdsAus(antwortenA[plan.barcodes.length]).slice(0, 25);
    if (ids.length) return [].concat(...ids.map(anfrageArtikel));
  }
  return [LEER_PLENTY];
}

// Schritt 3 in n8n: die eigentliche Aktion. k.daten = { plan, a, b, shopware } wenn Daten geholt wurden.
// Schreibbefehle dieser Anfrage hängen danach als „schreiben“ an der Antwort.
function zwVerarbeiten(anfrage, k) {
  let antwort;
  try {
    antwort = zwAktion(anfrage, k);
  } catch (e) {
    if (e && e.zwAntwort) antwort = e.zwAntwort;
    else antwort = json(500, { ok: false, fehler: 'Interner Fehler: ' + (e && e.message ? e.message : String(e)) });
  }
  return ausgabeAnhaengen(antwort, k.speicher, k.jetzt);
}

function zwAktion(anfrage, k) {
  const speicher = k.speicher;
  speicherVorbereiten(speicher);
  const e = Object.assign({}, k.einstellungen || {}, { geheimSchluessel: geheimSchluesselBestimmen(k.einstellungen || {}, speicher, k.zufall) });
  const route = zwRoute(anfrage);
  // Testläufe in n8n speichern den Speicher nicht. Der Umzug läuft deshalb nur bei echten Aufrufen, sonst käme er doppelt.
  const umgezogen = route.testlauf ? [] : altesUmziehen(speicher);
  const aktion = route.aktion;
  const q = anfrage.query || {};
  const body = anfrage.body || {};

  switch (aktion) {
    case 'zw-station':
      if (q.pruefen === 'version') {
        // Prüfsumme des Codes, der in n8n tatsächlich steht. Damit lässt sich ein Update überprüfen.
        // bausteine: dasselbe für alle Code-Bausteine (Name → SHA-256), zum Vergleich mit n8n/zw-pipeline-probelauf.json.
        const quelle = typeof k.eigenerCode === 'function' ? k.eigenerCode() : null;
        const codes = typeof k.alleCodes === 'function' ? k.alleCodes() : {};
        const bausteine = {};
        for (const name of Object.keys(codes || {})) bausteine[name] = codes[name] ? bytesZuHex(sha256(utf8(codes[name]))) : null;
        return json(200, { ok: true, codeSha256: quelle ? bytesZuHex(sha256(utf8(quelle))) : null, bausteine });
      }
      return { status: 200, contentType: 'text/html; charset=utf-8', body: k.seiteHtml };
    case 'anmelden':
      return anmelden(body, e, speicher, k.jetzt);
    case 'freigabe':
      return freigabeSeite(q, e, speicher);
    case 'freigabe-entscheiden':
      return freigabeEntscheiden(body, e, speicher, k.jetzt);
  }

  // Alle weiteren Aktionen nur mit gültigem Schlüssel. Testläufe direkt in n8n (ohne Webhook-Adresse) gelten als Admin.
  const person = route.testlauf
    ? { benutzer: 'test', name: 'Testlauf in n8n', rolle: 'admin' }
    : angemeldetePerson(anfrage.headers || {}, e, k.jetzt);
  switch (aktion) {
    case 'retouren':
      fertigAufraeumen(speicher, k.jetzt);
      return json(200, { ok: true, person, modus: 'probelauf-echtdaten', retouren: retourenListe(speicher, daten(k, 'retouren')), fertig: fertigListe(speicher) });
    case 'retoure':
      if (!retourenNummer(q.nr)) return json(404, { ok: false, fehler: 'Retoure „' + String(q.nr || '').slice(0, 40) + '“ nicht gefunden.' });
      return json(200, { ok: true, retoure: retoureDetail(speicher, q.nr, daten(k, 'retoure'), k.jetzt) });
    case 'vorschau':
      return json(200, { ok: true, vorschau: vorschauListe(speicher, body, e, quellenFuerVorschau(k)) });
    case 'anlegen':
      return anlegen(speicher, body, e, person, k.jetzt, anfrage.url, quellenFuerVorschau(k));
    case 'zw-liste': {
      const t = tabellenDaten(k, umgezogen);
      return json(200, { ok: true, zwListe: t.zwListe, protokoll: t.protokoll });
    }
    case 'zw-liste-buchen':
      return zwListeBuchen(speicher, tabellenDaten(k, umgezogen).zwListe, body, person, k.jetzt);
    case 'zuruecksetzen':
      // Setzt nur den Speicher des Workflows zurück. Die Data Tables ZW_LISTE und ZW_PROTOKOLL bleiben, wie sie sind.
      if (person.rolle !== 'admin') return json(403, { ok: false, fehler: 'Nur für Admins.' });
      for (const s of Object.keys(speicher)) if (s !== 'fehlversuche' && s !== 'geheimnis' && s !== 'ablageAusgang') delete speicher[s];
      speicherVorbereiten(speicher);
      return json(200, { ok: true });
  }
  return json(404, { ok: false, fehler: 'Unbekannte Aktion: ' + aktion });
}

// ---------- Hilfen ----------

function json(status, inhalt) {
  return { status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(inhalt) };
}

function abbrechen(status, fehler) {
  const err = new Error(fehler);
  err.zwAntwort = json(status, { ok: false, fehler });
  throw err;
}

function html(status, titel, inhalt) {
  return {
    status, contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(titel) + '</title><style>' +
      'body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#eef1f3;color:#16212b;margin:0;padding:24px 16px}' +
      '.k{max-width:760px;margin:0 auto;background:#fff;border:1px solid #d5dde3;border-radius:14px;padding:24px}' +
      'h1{font-size:1.3rem;margin:0 0 12px}table{border-collapse:collapse;width:100%;margin:12px 0}' +
      'td{padding:6px 8px;border-bottom:1px solid #d5dde3;vertical-align:top}td:first-child{color:#5b6b78;white-space:nowrap}' +
      '.w{background:#fdf0da;color:#9a5a00;padding:8px 12px;border-radius:8px;margin:8px 0}' +
      '.i{background:#e8f1fb;color:#1f4f7a;padding:8px 12px;border-radius:8px;margin:8px 0}.m{color:#5b6b78;font-size:.9rem}' +
      'h2{font-size:1.1rem;margin:28px 0 8px;padding-top:16px;border-top:1px solid #d5dde3}.plan{padding-left:22px}.plan li{margin:0 0 14px}' +
      'code{font:600 .85rem ui-monospace,Menlo,monospace;word-break:break-all}' +
      'pre{font:.78rem/1.4 ui-monospace,Menlo,monospace;background:#f4f6f8;border:1px solid #d5dde3;border-radius:8px;padding:8px;overflow-x:auto;margin:6px 0;white-space:pre-wrap;word-break:break-all}' +
      'form{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}button{font:600 1rem system-ui,sans-serif;padding:14px 22px;border-radius:10px;cursor:pointer}' +
      '.ja{background:#1d7a46;color:#fff;border:1px solid #1d7a46}.nein{background:#fff;color:#b3261e;border:1px solid #b3261e}' +
      '@media (prefers-color-scheme:dark){body{background:#0f161c;color:#e6edf2}.k{background:#172129;border-color:#2c3a45}td{border-color:#2c3a45}.nein{background:#172129}' +
      'pre{background:#0f161c;border-color:#2c3a45}.i{background:#16304a;color:#cfe3f7}h2{border-color:#2c3a45}}' +
      '</style></head><body><div class="k">' + inhalt + '</div></body></html>',
  };
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function speicherVorbereiten(speicher) {
  if (!speicher.positionen) speicher.positionen = {};
  if (!speicher.fehlversuche) speicher.fehlversuche = {};
  if (!speicher.cache) speicher.cache = { positionen: {}, retouren: {}, reihenfolge: [] };
  if (!speicher.kommentare) speicher.kommentare = {};
  if (!speicher.retourenFertig) speicher.retourenFertig = {};
  if (!speicher.sim) speicher.sim = { naechsteNr: 1, zwArtikel: {} };
}

// Geheimschlüssel: aus „Einstellungen“, falls dort gesetzt. Sonst einmalig zufällig erzeugen
// und im Speicher des Workflows behalten. So muss niemand einen Schlüssel von Hand kopieren.
function geheimSchluesselBestimmen(e, speicher, zufall) {
  const eingetragen = String(e.geheimSchluessel || '').trim();
  if (eingetragen.length >= 32) return eingetragen;
  if (!speicher.geheimnis) {
    const neu = (zufall || zufallsHex)();
    if (!neu || neu.length < 64) return '';
    speicher.geheimnis = neu;
  }
  return speicher.geheimnis;
}

// 32 zufällige Bytes als Hex, aus einer sicheren Quelle. Gibt null zurück, wenn keine da ist.
function zufallsHex() {
  try { return require('crypto').randomBytes(32).toString('hex'); } catch (err) { /* weiter */ }
  try {
    const b = new Uint8Array(32);
    globalThis.crypto.getRandomValues(b);
    return Array.from(b, (x) => (x < 16 ? '0' : '') + x.toString(16)).join('');
  } catch (err) { return null; }
}

function geheimnis(e) {
  const g = String(e.geheimSchluessel || '').trim();
  if (g.length < 32) abbrechen(500, 'Kein Geheimschlüssel: n8n liefert hier keine sicheren Zufallszahlen. Bitte in Einstellungen geheimSchluessel setzen (mindestens 32 Zeichen).');
  return g;
}

// Nachsichtig lesen: einzelner Eintrag ohne [ ], mehrere Einträge ohne [ ], Leerzeichen.
// Ist die Liste unbrauchbar, kommt eine klare Meldung statt „Passwort falsch“.
function benutzerListe(e) {
  let liste = e.benutzer;
  if (typeof liste === 'string') {
    const text = liste.trim();
    if (!text || text === '[]') abbrechen(500, 'Einstellungen: benutzer ist leer. Einträge aus „Zugang einrichten“ einfügen, speichern und Publish.');
    try {
      liste = JSON.parse(text);
    } catch (err) {
      try { liste = JSON.parse('[' + text + ']'); } catch (err2) {
        abbrechen(500, 'Einstellungen: benutzer ist kein gültiges JSON. Form: [{…},{…}] mit Komma zwischen den Einträgen.');
      }
    }
  }
  if (liste && !Array.isArray(liste) && typeof liste === 'object') liste = [liste];
  if (!Array.isArray(liste) || !liste.length) abbrechen(500, 'Einstellungen: benutzer ist leer.');
  const kaputt = liste.filter((b) => !b || !b.benutzer || !/^pbkdf2-sha256\$\d+\$[0-9a-f]+\$[0-9a-f]{64}$/i.test(String(b.hash || '').trim()));
  if (kaputt.length) {
    abbrechen(500, 'Einstellungen: ' + kaputt.length + ' Eintrag/Einträge in benutzer ohne gültigen Benutzernamen oder Hash. Eintrag neu erzeugen und komplett einfügen.');
  }
  return liste.map((b) => Object.assign({}, b, { benutzer: String(b.benutzer).trim(), hash: String(b.hash).trim() }));
}

// ---------- Protokoll und ZW-Liste (Data Tables) ----------
// Neue Zeilen sammeln sich während einer Anfrage in speicher.ablageAusgang und hängen am Ende als „ablage“ an der Antwort.
// n8n schreibt sie in ZW_PROTOKOLL (neue Zeile) bzw. ZW_LISTE (neu oder ändern, Schlüssel zeileId).

const PROTOKOLL_SPALTEN = ['zeit', 'benutzer', 'aktion', 'retoureId', 'positionId', 'zustand', 'preis', 'varianteId', 'ergebnis', 'meldung'];
const ZW_LISTE_SPALTEN = [
  'zeileId', 'datum', 'retoureId', 'positionId', 'originalVarianteId', 'zwVarianteId', 'barcode', 'name', 'zustand', 'grund', 'bilder',
  'preis', 'empfehlung', 'preisVomLager', 'preisGrund', 'streichpreis', 'neuOderPlus1', 'freigegebenVon', 'probelauf',
  'bestandGebucht', 'gebuchtVon', 'gebuchtAm', 'lauf',
];
const ZAHL_SPALTEN = ['preis', 'empfehlung', 'streichpreis', 'bilder'];
const JA_NEIN_SPALTEN = ['preisVomLager', 'probelauf', 'bestandGebucht'];

// Eine Zeile mit genau den Spalten der Tabelle: Texte nie leer (''), Zahlen oder null, Ja/Nein als true/false
function tabellenZeile(spalten, x) {
  const z = {};
  for (const s of spalten) {
    const w = x[s];
    if (ZAHL_SPALTEN.includes(s)) z[s] = typeof w === 'number' && Number.isFinite(w) ? w : (w === null || w === undefined || w === '' || !Number.isFinite(Number(w)) ? null : Number(w));
    else if (JA_NEIN_SPALTEN.includes(s)) z[s] = w === true || w === 'true';
    else z[s] = w === null || w === undefined ? '' : String(w);
  }
  return z;
}

function ablageMerken(speicher, tabelle, zeile) {
  if (!speicher.ablageAusgang) speicher.ablageAusgang = { protokoll: [], zwListe: [] };
  speicher.ablageAusgang[tabelle].push(zeile);
}

function protokollieren(speicher, jetzt, eintrag) {
  ablageMerken(speicher, 'protokoll', tabellenZeile(PROTOKOLL_SPALTEN, Object.assign({ zeit: new Date(jetzt).toISOString() }, eintrag)));
}

function zwListeMerken(speicher, zeile) {
  ablageMerken(speicher, 'zwListe', tabellenZeile(ZW_LISTE_SPALTEN, zeile));
}

// Für die Seite: zeileId heißt dort id
function zwListeFuerSeite(z) {
  const aus = tabellenZeile(ZW_LISTE_SPALTEN, z);
  aus.id = aus.zeileId;
  delete aus.zeileId;
  return aus;
}

// Einmaliger Umzug: Protokoll und ZW-Liste aus dem Speicher des Workflows (Stand bis 12.10.2026) in die Data Tables.
// Liefert die umgezogenen ZW-Listen-Zeilen, damit sie im selben Aufruf schon sichtbar sind.
function altesUmziehen(speicher) {
  const umgezogen = [];
  if (Array.isArray(speicher.protokoll)) {
    for (const p of speicher.protokoll) ablageMerken(speicher, 'protokoll', tabellenZeile(PROTOKOLL_SPALTEN, p));
    delete speicher.protokoll;
  }
  if (Array.isArray(speicher.zwListe)) {
    for (const z of speicher.zwListe) {
      const zeile = tabellenZeile(ZW_LISTE_SPALTEN, Object.assign({}, z, { zeileId: z.zeileId || z.id }));
      ablageMerken(speicher, 'zwListe', zeile);
      umgezogen.push(zeile);
    }
    delete speicher.zwListe;
  }
  return umgezogen;
}

// Zeilen aus „ZW-Liste lesen“ und „Protokoll lesen“ (neueste zuerst). Leere Items (Tabelle leer) fallen weg.
function tabellenDaten(k, umgezogen) {
  const d = k.daten;
  if (!d || !d.plan || d.plan.art !== 'tabellen') abbrechen(502, 'ZW-Liste konnte nicht gelesen werden. Bitte erneut versuchen.');
  const neu = (umgezogen || []).slice().reverse();
  const ausTabelle = (d.zwListe || []).filter((z) => z && z.zeileId && !neu.some((u) => u.zeileId === z.zeileId));
  return {
    zwListe: neu.concat(ausTabelle).slice(0, ZW_LISTE_MAX).map(zwListeFuerSeite),
    protokoll: (d.protokoll || []).filter((p) => p && p.zeit).slice(0, PROTOKOLL_MAX).map((p) => tabellenZeile(PROTOKOLL_SPALTEN, p)),
  };
}

// Kennung einer Zeile in der ZW-Liste: Datum, Position und Versuch. Bleibt auch nach „Zurücksetzen“ eindeutig genug.
function zeilenId(jetzt, positionId, versuch) {
  return 'Z' + new Date(jetzt).toISOString().slice(0, 10).replace(/-/g, '') + '-' + positionId + '-' + versuch;
}

// Die von n8n geholten Daten für diese Aktion. Fehlen sie, lief „Vorbereiten“ nicht wie erwartet.
function daten(k, art) {
  const d = k.daten;
  if (!d || !d.plan || d.plan.art !== art) abbrechen(502, 'Keine Daten aus plenty erhalten. Bitte erneut versuchen.');
  const fehler = plentyFehler(d.a) || plentyFehler(d.b);
  if (fehler && art === 'retoure' && /\b404\b|not found/i.test(fehler)) abbrechen(404, 'Retoure „' + d.plan.id + '“ nicht gefunden.');
  if (fehler) abbrechen(502, 'plenty meldet: ' + fehler);
  if (d.shopware && d.shopware.error) abbrechen(502, 'Shopware meldet: ' + (d.shopware.error.message || d.shopware.error));
  return d;
}

// Kommentar in der Retoure: im Probelauf nur im Speicher, dazu als Schreibbefehl für die TMP-Tabelle.
// extra: { aktion, positionId, echtText } – echtText ist der Text für plenty, falls er vom Probelauf-Text abweicht.
function kommentarSim(speicher, retoureId, zeit, text, extra) {
  if (!speicher.kommentare[retoureId]) speicher.kommentare[retoureId] = [];
  speicher.kommentare[retoureId].push({ zeit, text });
  const x = extra || {};
  ausgangMerken(speicher, { aktion: x.aktion, retoureId, positionId: x.positionId }, [kommentarBefehl(retoureId, x.echtText || text)]);
}

// ---------- Schreibbefehle für die TMP-Tabelle ----------
// Während einer Anfrage sammeln sich die Befehle in speicher.ausgang. Am Ende hängen sie als Zeilen an der Antwort
// und werden aus dem Speicher entfernt, sie bleiben also nie im Speicher des Workflows liegen.

function ausgangMerken(speicher, meta, befehle) {
  if (!speicher.ausgang) speicher.ausgang = [];
  for (const b of befehle) speicher.ausgang.push(Object.assign({}, b, meta));
}

// Schreibbefehle (TMP-Tabelle) und neue Zeilen für Protokoll und ZW-Liste an die Antwort hängen.
// Was schon an der Antwort hängt (aus einem früheren Baustein desselben Laufs), bleibt davor.
function ausgabeAnhaengen(antwort, speicher, jetzt) {
  const neu = (speicher && speicher.ausgang) || [];
  const ablage = (speicher && speicher.ablageAusgang) || { protokoll: [], zwListe: [] };
  if (speicher) { delete speicher.ausgang; delete speicher.ablageAusgang; }
  if (neu.length) {
    const bisher = antwort.schreiben || [];
    const lauf = bisher.length ? bisher[0].lauf : laufId(jetzt);
    const zeit = new Date(jetzt).toISOString();
    antwort.schreiben = bisher.concat(neu.map((b, i) => tmpZeile(b, bisher.length + i + 1, lauf, zeit)));
    // Neue Zeilen der ZW-Liste gehören zu diesem Lauf in ZW_TMP
    for (const z of ablage.zwListe) if (!z.lauf) z.lauf = lauf;
  }
  if (ablage.protokoll.length || ablage.zwListe.length || antwort.ablage) {
    const alt = antwort.ablage || { protokoll: [], zwListe: [] };
    // Ändert ein Aufruf dieselbe Zeile der ZW-Liste mehrmals, zählt die letzte Fassung
    const zwListe = alt.zwListe.concat(ablage.zwListe).filter((z, i, l) => !l.slice(i + 1).some((y) => y.zeileId === z.zeileId));
    antwort.ablage = { protokoll: alt.protokoll.concat(ablage.protokoll), zwListe };
  }
  return antwort;
}

// Kennung eines Laufs: Zeit plus Zufall, z. B. 20261007T100000-3fa9c1
function laufId(jetzt) {
  const z = zufallsHex();
  return new Date(jetzt).toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + (z ? z.slice(0, 6) : String(Math.random()).slice(2, 8));
}

// Nach „TMP-Tabelle schreiben“ (Baustein „TMP-Ergebnis“): Ergebnis ins Protokoll, Hinweis in die Antwort.
// ergebnisse ist die Ausgabe von „TMP-Tabelle schreiben“, eine Zeile pro Befehl.
function zwNachTmp(antwort, ergebnisse, speicher, jetzt) {
  speicherVorbereiten(speicher);
  const zeilen = antwort.schreiben || [];
  const lauf = zeilen.length ? zeilen[0].lauf : '';
  const fehlerItem = (ergebnisse || []).find((r) => r && r.error);
  let fehler = null;
  if (fehlerItem) fehler = String(fehlerItem.error.message || fehlerItem.error).slice(0, 300);
  else if ((ergebnisse || []).length < zeilen.length) fehler = 'nur ' + (ergebnisse || []).length + ' von ' + zeilen.length + ' Zeilen bestätigt';
  const ersteRetoure = (zeilen.find((z) => z.retoureId) || {}).retoureId;
  protokollieren(speicher, jetzt, {
    benutzer: 'automatisch', aktion: 'tmp-tabelle', retoureId: ersteRetoure || undefined,
    ergebnis: fehler ? 'fehler' : 'geschrieben', meldung: fehler || zeilen.length + ' Zeilen, Lauf ' + lauf,
  });
  const aus = { status: antwort.status, contentType: antwort.contentType, body: antwort.body, ablage: antwort.ablage };
  if (String(antwort.contentType || '').startsWith('text/html')) {
    const satz = fehler
      ? '<div class="w">TMP-Tabelle ZW_TMP: nicht geschrieben (' + esc(fehler) + ').</div>'
      : '<p class="m">' + zeilen.length + ' Schreibbefehle in die Tabelle ZW_TMP geschrieben (Lauf ' + esc(lauf) + ').</p>';
    aus.body = aus.body.includes('</div></body>') ? aus.body.replace('</div></body>', satz + '</div></body>') : aus.body + satz;
  } else {
    try {
      const inhalt = JSON.parse(aus.body);
      inhalt.tmp = { lauf, zeilen: zeilen.length, fehler };
      aus.body = JSON.stringify(inhalt);
    } catch (err) { /* Antwort unverändert lassen */ }
  }
  return ausgabeAnhaengen(aus, speicher, jetzt);
}

// ---------- Anmeldung ----------

function anmelden(body, e, speicher, jetzt) {
  const name = String(body.benutzer || '').trim().toLowerCase().slice(0, 100);
  const passwort = String(body.passwort || '');
  const g = geheimnis(e);
  if (!name || !passwort) return json(400, { ok: false, fehler: 'Benutzername und Passwort eingeben.' });

  const fv = speicher.fehlversuche[name];
  if (fv && fv.gesperrtBis && fv.gesperrtBis > jetzt) {
    return json(429, { ok: false, fehler: 'Zu viele Fehlversuche. Bitte in ' + Math.ceil((fv.gesperrtBis - jetzt) / 60000) + ' Minuten erneut versuchen.' });
  }

  const person = benutzerListe(e).find((b) => String(b.benutzer || '').toLowerCase() === name);
  const richtig = person && !person.gesperrt && passwortPruefen(passwort, person.hash);
  if (!richtig) {
    const sperreAbgelaufen = fv && fv.gesperrtBis && fv.gesperrtBis <= jetzt;
    const neu = { anzahl: (fv && !sperreAbgelaufen ? fv.anzahl : 0) + 1, gesperrtBis: 0 };
    if (neu.anzahl >= MAX_FEHLVERSUCHE) neu.gesperrtBis = jetzt + SPERRE_MINUTEN * 60000;
    // Speicher klein halten, falls jemand viele ausgedachte Namen durchprobiert
    if (Object.keys(speicher.fehlversuche).length > 500) speicher.fehlversuche = {};
    speicher.fehlversuche[name] = neu;
    protokollieren(speicher, jetzt, { benutzer: name, aktion: 'anmeldung', ergebnis: 'fehlgeschlagen' });
    return json(401, { ok: false, fehler: 'Benutzername oder Passwort falsch.' });
  }

  delete speicher.fehlversuche[name];
  const minuten = Number(e.anmeldungMinuten) > 0 ? Number(e.anmeldungMinuten) : 600;
  const schluessel = schluesselAusstellen(g, { benutzer: name }, minuten, jetzt);
  protokollieren(speicher, jetzt, { benutzer: name, aktion: 'anmeldung', ergebnis: 'ok' });
  return json(200, { ok: true, schluessel, name: person.name || name, rolle: person.rolle || 'lager', gueltigMinuten: minuten });
}

function angemeldetePerson(headers, e, jetzt) {
  const kopf = String(headers.authorization || headers.Authorization || '');
  const schluessel = kopf.replace(/^Bearer\s+/i, '');
  const inhalt = schluesselPruefen(geheimnis(e), schluessel, jetzt);
  if (!inhalt) abbrechen(401, 'Bitte neu anmelden.');
  // Gesperrte oder entfernte Personen verlieren den Zugriff sofort
  const person = benutzerListe(e).find((b) => String(b.benutzer || '').toLowerCase() === inhalt.benutzer);
  if (!person || person.gesperrt) abbrechen(401, 'Zugang gesperrt. Bitte an Tobias wenden.');
  return { benutzer: inhalt.benutzer, name: person.name || inhalt.benutzer, rolle: person.rolle || 'lager' };
}

// ---------- Retouren (echt aus plenty) ----------

function positionsStatus(speicher, positionId) {
  return speicher.positionen[positionId] || { status: 'offen' };
}

function zaehlen(speicher, positionIds) {
  const st = positionIds.map((id) => positionsStatus(speicher, id).status);
  return {
    erledigt: st.filter((s) => ERLEDIGT.includes(s)).length,
    wartet: st.filter((s) => s === 'wartet').length,
    fehler: st.filter((s) => s === 'fehler').length,
  };
}

// Offene Retouren. Fertige (alle Positionen entschieden) stehen im Ordner „Fertig“, nicht hier.
// Im Echtbetrieb verlassen sie 9.1.1 ohnehin, im Probelauf bleiben sie in plenty auf 9.1.1.
function retourenListe(speicher, d) {
  return eintraege(d.a[0]).map((auftrag) => {
    const positionen = artikelPositionen(auftrag);
    const id = String(auftrag.id);
    return Object.assign({
      id, datum: String(auftrag.createdAt || '').slice(0, 10), shopAuftrag: shopAuftrag(auftrag), anzahl: positionen.length,
      probelaufFertig: !!speicher.retourenFertig[id], probelaufStatus: fertigStatus(speicher, id),
    }, zaehlen(speicher, positionen.map((p) => p.positionId)));
  }).filter((r) => !r.probelaufFertig && !(r.anzahl > 0 && r.erledigt === r.anzahl));
}

function fertigZeit(f) {
  return Date.parse(f && typeof f === 'object' ? f.zeit : f);
}

// Ordner „Fertig“: zuletzt abgeschlossene Retouren zuerst
function fertigListe(speicher) {
  return Object.keys(speicher.retourenFertig).map((id) => {
    const t = fertigZeit(speicher.retourenFertig[id]);
    const r = speicher.cache.retouren[id] || {};
    return {
      id, status: fertigStatus(speicher, id), fertigAm: Number.isFinite(t) ? new Date(t).toISOString() : '',
      datum: r.datum || '', shopAuftrag: r.shopAuftrag || '', anzahl: (r.positionIds || []).length,
    };
  }).sort((a, b) => (a.fertigAm < b.fertigAm ? 1 : -1));
}

// Nach FERTIG_TAGE Tagen aus dem Ordner entfernen. Die Entscheidungen der Positionen bleiben gespeichert,
// damit eine Retoure, die im Probelauf noch auf 9.1.1 steht, nicht wieder als offen erscheint.
function fertigAufraeumen(speicher, jetzt) {
  const grenze = jetzt - FERTIG_TAGE * 86400000;
  for (const id of Object.keys(speicher.retourenFertig)) {
    if (!(fertigZeit(speicher.retourenFertig[id]) >= grenze)) {
      delete speicher.retourenFertig[id];
      delete speicher.kommentare[id];
    }
  }
}

// Status, auf den die Retoure im Echtbetrieb gesetzt würde (im Probelauf nur vermerkt).
function fertigStatus(speicher, id) {
  const f = speicher.retourenFertig[id];
  return f && typeof f === 'object' ? f.status : null;
}

function retoureMerken(speicher, id, eintrag) {
  const c = speicher.cache;
  if (!c.retouren[id]) c.reihenfolge.push(id);
  c.retouren[id] = eintrag;
  while (c.reihenfolge.length > MAX_ZWISCHENSPEICHER_RETOUREN) {
    const alt = c.reihenfolge.shift();
    for (const p of (c.retouren[alt] || {}).positionIds || []) delete c.positionen[p];
    delete c.retouren[alt];
  }
}

function retoureDetail(speicher, nr, d, jetzt) {
  const auftrag = d.a[0] || {};
  const id = String(auftrag.id || '');
  if (!id || Number(auftrag.typeId) !== 3) abbrechen(404, 'Retoure „' + (nr || '') + '“ nicht gefunden.');
  const varianten = {};
  for (const v of eintraege(d.b && d.b[0])) varianten[String(v.id)] = v;
  const positionen = artikelPositionen(auftrag).map((p) => {
    const v = varianten[p.varianteId] || {};
    const pos = Object.assign({}, p, { retoureId: id, ean: eanAusVariante(v), modell: v.model || '', variantennummer: v.number || '' });
    speicher.cache.positionen[p.positionId] = pos;
    return pos;
  });
  retoureMerken(speicher, id, { positionIds: positionen.map((p) => p.positionId), shopAuftrag: shopAuftrag(auftrag), datum: String(auftrag.createdAt || '').slice(0, 10), gemerkt: new Date(jetzt).toISOString() });
  return {
    id, shopAuftrag: shopAuftrag(auftrag), datum: String(auftrag.createdAt || '').slice(0, 10), status: auftrag.statusName || String(auftrag.statusId),
    probelaufFertig: !!speicher.retourenFertig[id], probelaufStatus: fertigStatus(speicher, id),
    plentyKommentare: eintraege(d.a[1]).map((c) => ({ zeit: c.createdAt, text: textOhneHtml(c.text) })).filter((c) => c.text),
    ausgeblendet: rabattPositionen(auftrag),
    kommentare: speicher.kommentare[id] || [],
    positionen: positionen.map((p) => Object.assign({
      positionId: p.positionId, varianteId: p.varianteId, ean: p.ean, modell: p.modell, name: p.name, menge: p.menge, bild: null,
    }, positionsStatus(speicher, p.positionId))),
  };
}

// ---------- Vorschau ----------

function quellenFuerVorschau(k) {
  const d = k.daten;
  if (!d || !d.plan || (d.plan.art !== 'vorschau' && d.plan.art !== 'anlegen')) return { barcodes: {}, shopware: {}, geholt: false };
  const fehler = plentyFehler(d.a);
  if (fehler) abbrechen(502, 'plenty meldet: ' + fehler);
  if (d.shopware && d.shopware.error) abbrechen(502, 'Shopware meldet: ' + (d.shopware.error.message || d.shopware.error));
  const barcodes = {};
  (d.plan.barcodes || []).forEach((code, i) => { barcodes[code] = eintraege(d.a[i]); });
  return { barcodes, shopware: shopwareNachNummer(d.shopware), originale: originaleLesen(d), geholt: true };
}

// Trockenlauf: plenty-Original pro Varianten-ID mit Artikel und Versandprofilen. Fehlt etwas, bleibt es leer
// (der Schreibplan zeigt dann, was fehlt). Anlegen wird dadurch nicht blockiert.
function originaleLesen(d) {
  const karte = {};
  if (!d.plan.originale) return karte;
  const antwort = d.a[d.plan.barcodes.length];
  const artikelIds = artikelIdsAus(antwort).slice(0, 25);
  const bOk = !plentyFehler(d.b);
  const artikel = {};
  artikelIds.forEach((id, i) => {
    const a = bOk ? (d.b || [])[2 * i] : null;
    const versand = bOk ? (d.b || [])[2 * i + 1] : null;
    if (a && String(a.id) === id) artikel[id] = { artikel: a, versandprofile: Array.isArray(versand) ? versand : eintraege(versand) };
  });
  for (const v of eintraege(antwort)) {
    const a = artikel[String(v.itemId)] || {};
    karte[String(v.id)] = { variante: v, artikel: a.artikel || null, versandprofile: a.versandprofile || [] };
  }
  return karte;
}

function vorschauPosition(speicher, positionId, zustand, e, quellen) {
  const pos = speicher.cache.positionen[positionId];
  if (!pos) return { positionId, zustand, fehler: 'Position unbekannt. Bitte die Retoure neu öffnen.' };
  if (!istGueltigeEntscheidung(zustand)) return { positionId, zustand, fehler: 'Unbekannter Zustand.' };
  const basis = { positionId, retoureId: pos.retoureId, zustand };
  if (!istZwZustand(zustand)) {
    return Object.assign(basis, { artikel: false, kommentar: zwKommentar({ zustand }) });
  }
  if (!pos.ean) return Object.assign(basis, { fehler: 'Variante ' + pos.varianteId + ' hat in plenty keine EAN. Bitte ans Büro geben.' });
  if (!quellen.geholt) return Object.assign(basis, { fehler: 'Daten aus plenty und Shopware fehlen. Bitte erneut versuchen.' });
  const sw = quellen.shopware[pos.varianteId];
  if (!sw) return Object.assign(basis, { fehler: 'Original ' + pos.varianteId + ' nicht in Shopware gefunden. Bitte ans Büro geben.' });

  let barcode, preis;
  try {
    barcode = zwBarcode(pos.ean, zustand);
    preis = berechneZwPreis({ jetzigerPreis: sw.preis, mindestpreis: sw.mindestpreis, zustand, einkaufspreis: sw.einkaufspreis }, e);
  } catch (err) {
    return Object.assign(basis, { fehler: err.message });
  }
  // Warnungen, die nicht vom Preis abhängen (bleiben, wenn das Lager den Preis ändert)
  const preisWarnungen = zwPreisWarnungen(preis.preis, { einkaufspreis: sw.einkaufspreis, streichpreis: preis.streichpreis });
  const regelWarnungen = preis.warnungen.filter((w) => !preisWarnungen.includes(w))
    .concat(pos.modell ? [] : ['Modell fehlt in plenty. Variantennummer wird aus dem Namen gebildet.']);
  // Gibt es den ZW-Artikel schon? Echt in plenty (Barcode) oder im Probelauf nachgestellt.
  const echt = (quellen.barcodes[barcode] || [])[0];
  const sim = speicher.sim.zwArtikel[barcode];
  const vorhanden = echt ? { varianteId: String(echt.id), simuliert: false } : (sim ? { varianteId: sim.varianteId, simuliert: true } : null);
  const hinweise = [];
  const alt = (quellen.barcodes[pos.ean + 'ZW'] || [])[0];
  if (alt) hinweise.push('Alter ZW-Artikel ' + alt.id + ' (Barcode ' + pos.ean + 'ZW) wird ignoriert.');
  return Object.assign(basis, {
    artikel: true,
    originalVarianteId: pos.varianteId,
    ean: pos.ean,
    barcode,
    name: zwName(sw.name),
    variantennummer: zwVariantennummer(pos.modell || sw.name),
    preis: preis.preis,
    empfehlung: preis.preis,
    preisVomLager: false,
    streichpreis: preis.streichpreis,
    mindestpreis: sw.mindestpreis,
    einkaufspreis: sw.einkaufspreis,
    fall: preis.fall,
    abschlag: preis.abschlag,
    neu: !vorhanden,
    bestehendeVarianteId: vorhanden ? vorhanden.varianteId : null,
    bestehendSimuliert: vorhanden ? vorhanden.simuliert : false,
    regelWarnungen,
    warnungen: regelWarnungen.concat(preisWarnungen),
    nichtUebernehmen: sw.nichtUebernehmen || [],
    hinweise,
  });
}

function preisGrenze(e) {
  const g = Number(e.preisAbweichungMax);
  return g > 0 ? g : PREIS_ABWEICHUNG_OHNE_GRUND;
}

// Mehr als die erlaubte Abweichung vom Vorschlag? Dann braucht der Preis eine Begründung.
function preisBrauchtGrund(preis, empfehlung, e) {
  return Math.abs(preis - empfehlung) > preisGrenze(e) + 0.001;
}

// Das Lager darf den Preis ändern. Die berechnete Empfehlung bleibt zum Vergleich erhalten.
function preisSetzen(v, preis) {
  if (preis === null || preis === undefined) return v;
  v.preis = preis;
  v.preisVomLager = preis !== v.empfehlung;
  v.warnungen = v.regelWarnungen.concat(zwPreisWarnungen(preis, { einkaufspreis: v.einkaufspreis, streichpreis: v.streichpreis }));
  return v;
}

function entscheidungenLesen(body) {
  const liste = Array.isArray(body.entscheidungen) ? body.entscheidungen : [];
  if (!liste.length) abbrechen(400, 'Keine Positionen übergeben.');
  if (liste.length > 50) abbrechen(400, 'Zu viele Positionen auf einmal.');
  return liste.map((x) => ({
    positionId: String(x.positionId || ''),
    zustand: String(x.zustand || ''),
    grund: String(x.grund || '').replace(/\s+/g, ' ').trim().slice(0, ZW_GRUND_MAX),
    preis: x.preis,
    preisGrund: String(x.preisGrund || '').replace(/\s+/g, ' ').trim().slice(0, ZW_GRUND_MAX),
    bilder: bilderLesen(x.bilder, String(x.positionId || '')),
  }));
}

// Bilder kommen als Data-URL (data:image/jpeg;base64,…). Sie gehen als Anhang in die Mails und werden nicht im Speicher
// des Workflows abgelegt. Bei einem neuen ZW-Artikel kommen sie zusätzlich als Schreibbefehle in die TMP-Tabelle:
// beim Anlegen in den Shopware-Medienordner „ZW-Retouren“ hochladen, nach der Freigabe als 2. Bild in den Artikel.
function bilderLesen(liste, positionId) {
  if (liste === undefined || liste === null) return [];
  if (!Array.isArray(liste)) abbrechen(400, 'Position ' + positionId + ': Bilder ungültig.');
  if (liste.length > BILDER_MAX) abbrechen(400, 'Position ' + positionId + ': höchstens ' + BILDER_MAX + ' Bilder.');
  return liste.map((b, i) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String((b && b.daten) || ''));
    if (!m) abbrechen(400, 'Position ' + positionId + ': Bild ' + (i + 1) + ' ist kein JPEG, PNG oder WebP.');
    if (m[2].length > BILD_MAX_ZEICHEN) abbrechen(400, 'Position ' + positionId + ': Bild ' + (i + 1) + ' ist zu groß.');
    const name = String((b && b.name) || '').replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'bild';
    return { name: 'retoure-pos' + positionId + '-' + (i + 1) + '-' + name + '.' + BILD_TYPEN[m[1]], mimeType: m[1], daten: m[2] };
  });
}

function bilderZeile(anzahl, inShopware) {
  if (!anzahl) return 'keine';
  return anzahl + (anzahl === 1 ? ' Bild' : ' Bilder') + ' im Anhang der Mail' + (inShopware ? ', nach der Freigabe als 2. Bild im Shopware-Artikel' : '');
}

// Shopware-Medien-IDs für die Bilder einer Position. Fest aus Position, Versuch und Zeit abgeleitet (32 Hex-Zeichen),
// so stehen sie schon in den Schreibbefehlen und brauchen keinen Platzhalter.
function bilderMedien(bilder, positionId, versuch, jetzt) {
  const id = (art, i) => bytesZuHex(sha256(utf8('zw-bild|' + art + '|' + positionId + '|' + versuch + '|' + i + '|' + jetzt))).slice(0, 32);
  return bilder.map((b, i) => ({ mediaId: id('medium', i), produktMediaId: id('produkt', i), name: b.name, mimeType: b.mimeType }));
}

function vorschauListe(speicher, body, e, quellen) {
  return entscheidungenLesen(body).map((x) => vorschauPosition(speicher, x.positionId, x.zustand, e, quellen));
}

// ---------- Anlegen (Probelauf: nichts wird geschrieben) ----------

function anlegen(speicher, body, e, person, jetzt, url, quellen) {
  const freigabeAn = String(e.freigabeAn || '').trim();
  if (!freigabeAn) abbrechen(500, 'Einstellungen: freigabeAn (E-Mail für die Freigabe) fehlt.');
  const g = geheimnis(e);
  const basisUrl = String(e.seitenAdresse || '').trim().replace(/\/+$/, '') ||
    String(url || '').split('?')[0].replace(/\/anlegen\/?$/, '');
  const bueroAn = String(e.bueroAn || '').trim() || freigabeAn;
  const ergebnisse = [];
  const mails = [];
  const liste = entscheidungenLesen(body);

  // Erst alles prüfen, dann ändern: fehlt ein Grund oder ist ein Preis ungültig, wird nichts angelegt.
  for (const x of liste) {
    const bisher = positionsStatus(speicher, x.positionId);
    if (bisher.status === 'wartet' || ERLEDIGT.includes(bisher.status)) continue;
    if (grundPflicht(x.zustand) && !x.grund) abbrechen(400, 'Bitte bei „' + x.zustand + '“ einen Grund angeben (Position ' + x.positionId + ').');
    try {
      x.lagerPreis = istZwZustand(x.zustand) ? lagerPreisLesen(x.preis) : null;
    } catch (err) {
      abbrechen(400, 'Position ' + x.positionId + ': ' + err.message);
    }
    if (x.lagerPreis !== null && !x.preisGrund) {
      const v = vorschauPosition(speicher, x.positionId, x.zustand, e, quellen);
      if (v.artikel && !v.fehler && preisBrauchtGrund(x.lagerPreis, v.empfehlung, e)) {
        abbrechen(400, 'Position ' + x.positionId + ': Der Preis weicht mehr als ' + preisGrenze(e) + ' € von der Empfehlung ' + euro(v.empfehlung) + ' ab. Bitte begründen.');
      }
    }
  }

  for (const x of liste) {
    const bisher = positionsStatus(speicher, x.positionId);
    if (bisher.status === 'wartet' || ERLEDIGT.includes(bisher.status)) {
      ergebnisse.push(Object.assign({ positionId: x.positionId, hinweis: 'Schon entschieden, nichts geändert.' }, bisher));
      continue;
    }
    const v = vorschauPosition(speicher, x.positionId, x.zustand, e, quellen);
    const pos = speicher.cache.positionen[x.positionId];
    const gemeinsam = { zustand: x.zustand, grund: x.grund, bilder: x.bilder.length, von: person.benutzer, retoureId: pos ? pos.retoureId : null, aktualisiert: new Date(jetzt).toISOString() };

    if (v.fehler) {
      if (!pos) { ergebnisse.push({ positionId: x.positionId, status: 'fehler', meldung: v.fehler }); continue; }
      const st = Object.assign({ status: 'fehler', meldung: v.fehler, versuch: (bisher.versuch || 0) }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      kommentarSim(speicher, pos.retoureId, gemeinsam.aktualisiert, 'ZW-Fehler (' + x.positionId + '): ' + v.fehler, { aktion: 'anlegen', positionId: x.positionId });
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'anlegen', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, ergebnis: 'fehler', meldung: v.fehler });
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    if (!v.artikel) {
      const status = x.zustand === 'Kein ZW' ? 'kein_zw' : 'nicht_verkaufbar';
      const kommentar = zwKommentar({ zustand: x.zustand, grund: x.grund });
      const st = Object.assign({ status, meldung: kommentar }, gemeinsam);
      speicher.positionen[x.positionId] = st;
      kommentarSim(speicher, pos.retoureId, gemeinsam.aktualisiert, kommentar + ' (' + x.positionId + ')', { aktion: 'anlegen', positionId: x.positionId });
      protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'entscheidung', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, ergebnis: status, meldung: x.grund || undefined });
      retoureAbschliessenWennFertig(speicher, pos.retoureId, jetzt, e);
      if (status === 'nicht_verkaufbar') mails.push(Object.assign(bueroMail(speicher, pos, x, person, e, bueroAn), { anhaenge: x.bilder }));
      ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
      continue;
    }

    v.grund = x.grund;
    v.bilder = x.bilder.length;
    preisSetzen(v, x.lagerPreis);
    v.preisGrund = v.preisVomLager ? x.preisGrund : '';
    const versuch = (bisher.versuch || 0) + 1;
    // Bilder vom Lager: nur bei einem neuen ZW-Artikel nach Shopware (bei +1 gehören die Bilder des Artikels zum ersten Stück)
    v.bilderMedien = v.neu ? bilderMedien(x.bilder, x.positionId, versuch, jetzt) : [];
    if (v.bilderMedien.length) {
      ausgangMerken(speicher, { aktion: 'anlegen', retoureId: pos.retoureId, positionId: x.positionId },
        bilderHochladenBefehle(v, x.bilder, versuch, String(e.shopwareBilderOrdner || '').trim()));
    }
    schreibplanMerken(speicher, x.positionId, versuch, zwSchreibplan(v, {
      plenty: (quellen.originale || {})[v.originalVarianteId] || null,
      shopware: quellen.shopware[v.originalVarianteId] || null,
      shopwareZw: v.bestehendeVarianteId ? quellen.shopware[v.bestehendeVarianteId] || null : null,
    }, jetzt));
    const st = Object.assign({ status: 'wartet', versuch, vorschau: v }, gemeinsam);
    speicher.positionen[x.positionId] = st;
    protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'freigabe-angefragt', retoureId: pos.retoureId, positionId: x.positionId, zustand: x.zustand, preis: v.preis, ergebnis: 'wartet' });
    mails.push(Object.assign(freigabeMail(speicher, v, person, versuch, basisUrl, g, e, freigabeAn), { anhaenge: x.bilder }));
    ergebnisse.push(Object.assign({ positionId: x.positionId }, st));
  }
  const antwort = json(200, { ok: true, ergebnisse });
  antwort.mails = mails;
  return antwort;
}

function freigabeSignatur(g, positionId, versuch) {
  return signatur(g, 'freigabe|' + positionId + '|' + versuch);
}

function retoureText(speicher, retoureId) {
  const r = speicher.cache.retouren[retoureId];
  return String(retoureId) + (r && r.shopAuftrag ? ' · ' + r.shopAuftrag : '');
}

function freigabeMail(speicher, v, person, versuch, basisUrl, g, e, an) {
  const link = basisUrl + '/freigabe?p=' + encodeURIComponent(v.positionId) + '&n=' + versuch + '&s=' + freigabeSignatur(g, v.positionId, versuch);
  return {
    positionId: v.positionId,
    an,
    von: String(e.absender || an),
    betreff: 'ZW-Freigabe: ' + v.name + ' · ' + v.zustand + ' · Retoure ' + v.retoureId,
    html: '<p>' + esc(person.name) + ' möchte einen ZW-Artikel anlegen. <b>Probelauf:</b> Daten sind echt, angelegt wird aber noch nichts in plenty oder Shopware.</p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + vorschauZeilen(speicher, v) + '</table>' +
      (v.warnungen.length ? '<p style="color:#9a5a00"><b>Warnung:</b> ' + v.warnungen.map(esc).join('<br>') + '</p>' : '') +
      '<p><b>Trockenlauf:</b> Die Schreibbefehle für plenty und Shopware stehen auf der Freigabe-Seite. Gesendet wird nichts.</p>' +
      '<p><a href="' + esc(link) + '" style="display:inline-block;background:#1f5f8b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Freigeben oder ablehnen</a></p>' +
      '<p style="color:#5b6b78;font-size:13px">Der Link öffnet eine Seite mit den Knöpfen Freigeben und Ablehnen. Erst der Klick dort zählt.</p>',
  };
}

// Info ans Büro bei „Nicht verkaufbar“. Keine Freigabe nötig.
function bueroMail(speicher, pos, x, person, e, an) {
  const z = [
    ['Retoure', retoureText(speicher, pos.retoureId)],
    ['Artikel', pos.name],
    ['Original', 'Variante ' + pos.varianteId + (pos.ean ? ' · EAN ' + pos.ean : '')],
    ['Entscheidung', 'Nicht verkaufbar'],
    ['Grund', x.grund],
    ['Bilder', bilderZeile(x.bilder.length)],
    ['Gemeldet von', person.name],
  ];
  return {
    positionId: x.positionId,
    art: 'info',
    an,
    von: String(e.absender || an),
    betreff: 'ZW: Nicht verkaufbar · ' + pos.name + ' · Retoure ' + pos.retoureId,
    html: '<p>Das Lager hat einen Artikel als <b>nicht verkaufbar</b> gemeldet. Bitte weiter bearbeiten.</p>' +
      '<table cellpadding="6" style="border-collapse:collapse">' + z.map((r) => '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</table>' +
      '<p>Sind alle Positionen der Retoure entschieden, geht sie auf Status ' + esc(String(e.statusNichtVerkaufbar || '9.1.3')) + ' (Reklamieren). <b>Probelauf:</b> In plenty wird noch nichts geändert.</p>',
  };
}

function vorschauZeilen(speicher, v) {
  const z = [
    ['Retoure', retoureText(speicher, v.retoureId)],
    ['Artikel', v.name],
    ['Original', 'Variante ' + v.originalVarianteId + ' · EAN ' + v.ean],
    ['Zustand', v.zustand],
    ['Grund', v.grund || '–'],
    ['Bilder', bilderZeile(v.bilder || 0, (v.bilderMedien || []).length > 0)],
    ['Barcode', v.barcode],
    ['Preis', euro(v.preis) + (v.preisVomLager ? ' (vom Lager geändert, Empfehlung ' + euro(v.empfehlung) + ')' : ' (Empfehlung)') + ', Streichpreis ' + euro(v.streichpreis)],
    ...(v.preisGrund ? [['Begründung Preis', v.preisGrund]] : []),
    ['Preisregel', v.fall === 'normal' ? 'Mindestpreis ' + euro(v.mindestpreis) + ' − ' + v.abschlag + ' %' : (v.fall === 'a' ? 'Mindestpreis erreicht' : 'Mindestpreis leer') + ': jetziger Preis − ' + v.abschlag + ' %'],
    ['Ergebnis', v.neu ? 'Neuer ZW-Artikel' : 'Bestand +1 auf ' + v.bestehendeVarianteId + (v.bestehendSimuliert ? ' (Probelauf)' : '')],
  ];
  if ((v.nichtUebernehmen || []).length) z.push(['Nicht übernehmen', v.nichtUebernehmen.join(', ')]);
  return z.map((r) => '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('');
}

// ---------- Freigabe ----------

function freigabePruefen(werte, e, speicher) {
  const positionId = String(werte.p || '');
  const versuch = parseInt(werte.n, 10);
  const st = speicher.positionen[positionId];
  if (!positionId || !versuch || !gleich(freigabeSignatur(geheimnis(e), positionId, versuch), String(werte.s || ''))) {
    return { fehler: html(403, 'Ungültiger Link', '<h1>Ungültiger Link</h1><p>Dieser Freigabe-Link ist ungültig.</p>') };
  }
  if (!st || st.versuch !== versuch || st.status !== 'wartet') {
    const text = st && st.versuch === versuch ? 'Status: ' + statusText(st.status) : 'Dieser Link ist veraltet.';
    return { fehler: html(200, 'Schon entschieden', '<h1>Schon entschieden</h1><p>' + esc(text) + '</p>') };
  }
  return { positionId, versuch, st };
}

function statusText(s) {
  return ({ wartet: 'Wartet auf Freigabe', angelegt: 'Angelegt', plus1: 'Bestand +1', abgelehnt: 'Abgelehnt', fehler: 'Fehler', nicht_verkaufbar: 'Nicht verkaufbar', kein_zw: 'Kein ZW' })[s] || s;
}

function freigabeSeite(q, e, speicher) {
  const f = freigabePruefen(q, e, speicher);
  if (f.fehler) return f.fehler;
  const v = f.st.vorschau;
  return html(200, 'ZW-Freigabe', '<h1>ZW-Freigabe</h1><p>Angefragt von <b>' + esc(f.st.von) + '</b>. Probelauf: Daten sind echt, angelegt wird noch nichts.</p>' +
    '<table>' + vorschauZeilen(speicher, v) + '</table>' +
    v.warnungen.map((w) => '<div class="w">' + esc(w) + '</div>').join('') +
    '<form method="post" action="freigabe-entscheiden">' +
    '<input type="hidden" name="p" value="' + esc(f.positionId) + '"><input type="hidden" name="n" value="' + f.versuch + '">' +
    '<input type="hidden" name="s" value="' + esc(q.s) + '">' +
    '<button class="ja" name="entscheidung" value="freigeben">Freigeben</button>' +
    '<button class="nein" name="entscheidung" value="ablehnen">Ablehnen</button></form>' +
    schreibplanHtml(schreibplan(speicher, f.positionId, f.versuch), retoureBefehle(v.retoureId,
      zwKommentar({ zustand: v.zustand, varianteId: v.neu ? NEU_VARIANTE : v.bestehendeVarianteId, plus1: !v.neu, grund: v.grund }),
      statusWennFertig(speicher, v.retoureId, f.positionId, e))));
}

// ---------- Trockenlauf: Schreibpläne ----------

function schreibplanMerken(speicher, positionId, versuch, plan) {
  if (!speicher.schreibplaene) speicher.schreibplaene = {};
  const sp = speicher.schreibplaene;
  delete sp[positionId];
  sp[positionId] = Object.assign({ versuch }, plan);
  const schluessel = Object.keys(sp);
  for (const k of schluessel.slice(0, Math.max(0, schluessel.length - MAX_SCHREIBPLAENE))) delete sp[k];
}

function schreibplan(speicher, positionId, versuch) {
  const p = (speicher.schreibplaene || {})[positionId];
  return p && p.versuch === versuch ? p : null;
}

// Status, auf den die Retoure ginge, wenn diese Position jetzt erledigt wird (sonst null)
function statusWennFertig(speicher, retoureId, positionId, e) {
  const r = speicher.cache.retouren[retoureId];
  if (!r || !r.positionIds.length) return null;
  const rest = r.positionIds.filter((p) => p !== positionId);
  if (!rest.every((p) => ERLEDIGT.includes(positionsStatus(speicher, p).status))) return null;
  const nichtVerkaufbar = rest.some((p) => positionsStatus(speicher, p).status === 'nicht_verkaufbar');
  return nichtVerkaufbar ? String(e.statusNichtVerkaufbar || '9.1.3') : String(e.statusFertig || '9.3');
}

function freigabeEntscheiden(body, e, speicher, jetzt) {
  const f = freigabePruefen(body, e, speicher);
  if (f.fehler) return f.fehler;
  const zeit = new Date(jetzt).toISOString();
  const v = f.st.vorschau;
  const retoureId = v.retoureId;
  const von = 'Freigabe-Mail (' + String(e.freigabeAn || '') + ')';

  if (body.entscheidung === 'ablehnen') {
    speicher.positionen[f.positionId] = Object.assign({}, f.st, { status: 'abgelehnt', meldung: 'Abgelehnt, nichts angelegt', aktualisiert: zeit });
    kommentarSim(speicher, retoureId, zeit, 'ZW abgelehnt: ' + v.zustand + ' (' + f.positionId + '), nichts angelegt', { aktion: 'freigabe', positionId: f.positionId });
    ausgangMerken(speicher, { aktion: 'freigabe', retoureId, positionId: f.positionId }, bilderLoeschenBefehle(v.bilderMedien, 'abgelehnt'));
    protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId, positionId: f.positionId, zustand: v.zustand, ergebnis: 'abgelehnt' });
    return html(200, 'Abgelehnt', '<h1>Abgelehnt</h1><p>Es wurde nichts angelegt. Das Lager sieht den Status auf der ZW-Station.</p>');
  }
  if (body.entscheidung !== 'freigeben') return html(400, 'Unklar', '<h1>Keine Entscheidung erkannt</h1>');

  // Probelauf: plenty-Kopie und Shopware-Klon werden nur nachgestellt (IDs mit „SIM-“).
  const sim = speicher.sim;
  const echtVorhanden = v.bestehendeVarianteId && !v.bestehendSimuliert;
  let zw = sim.zwArtikel[v.barcode];
  let plus1;
  let varianteId;
  if (echtVorhanden) {
    plus1 = true;
    varianteId = v.bestehendeVarianteId;
  } else if (zw) {
    plus1 = true;
    zw.bestand += 1;
    varianteId = zw.varianteId;
  } else {
    plus1 = false;
    zw = { varianteId: 'SIM-' + (sim.naechsteNr++), originalVarianteId: v.originalVarianteId, zustand: v.zustand, bestand: 1, preis: v.preis };
    sim.zwArtikel[v.barcode] = zw;
    varianteId = zw.varianteId;
  }
  const kommentar = zwKommentar({ zustand: v.zustand, varianteId, plus1, grund: v.grund });
  const neuerStatus = statusWennFertig(speicher, retoureId, f.positionId, e);
  const zeileId = zeilenId(jetzt, f.positionId, f.versuch);
  // TMP-Tabelle: erst Artikel anlegen bzw. +1, dann Kommentar (mit der neuen Varianten-ID als Platzhalter), dann Status
  const plan = schreibplan(speicher, f.positionId, f.versuch);
  const meta = { aktion: 'freigabe', retoureId, positionId: f.positionId };
  ausgangMerken(speicher, meta, freigabeBefehle(plan, v, plus1, varianteId, jetzt));
  // Wird aus „neu“ doch +1, kommen die schon hochgeladenen Bilder nicht in den Artikel
  if (plus1) ausgangMerken(speicher, meta, bilderLoeschenBefehle(v.bilderMedien, 'Bestand +1 statt neuer Artikel'));
  // Echtbetrieb: die neue Varianten-ID gehört in die ZW-Liste (dort steht im Probelauf SIM-…)
  if (!plus1) ausgangMerken(speicher, meta, [zwListeBefehl(zeileId)]);
  kommentarSim(speicher, retoureId, zeit, kommentar, {
    aktion: 'freigabe', positionId: f.positionId,
    echtText: plus1 ? kommentar : zwKommentar({ zustand: v.zustand, varianteId: NEU_VARIANTE, plus1: false, grund: v.grund }),
  });
  zwListeMerken(speicher, {
    zeileId, datum: zeit.slice(0, 10), retoureId, positionId: f.positionId, originalVarianteId: v.originalVarianteId,
    zwVarianteId: varianteId, barcode: v.barcode, name: v.name, zustand: v.zustand, grund: v.grund || '', bilder: v.bilder || 0,
    preis: v.preis, empfehlung: v.empfehlung, preisVomLager: !!v.preisVomLager, preisGrund: v.preisGrund || '', streichpreis: v.streichpreis,
    neuOderPlus1: plus1 ? '+1' : 'neu', freigegebenVon: von, probelauf: true, bestandGebucht: false, gebuchtVon: '', gebuchtAm: '',
  });
  speicher.positionen[f.positionId] = Object.assign({}, f.st, {
    status: plus1 ? 'plus1' : 'angelegt', varianteId, barcode: v.barcode, preis: v.preis, meldung: kommentar, aktualisiert: zeit,
  });
  protokollieren(speicher, jetzt, { benutzer: von, aktion: 'freigabe', retoureId, positionId: f.positionId, zustand: v.zustand, ergebnis: plus1 ? 'plus1' : 'angelegt', varianteId, preis: v.preis });
  retoureAbschliessenWennFertig(speicher, retoureId, jetzt, e);
  return html(200, 'Freigegeben', '<h1>Freigegeben</h1><p>' + esc(kommentar) + '</p><p>Probelauf: nachgestellt, nichts in plenty oder Shopware geändert.</p>' +
    schreibplanHtml(plan, retoureBefehle(retoureId, kommentar, neuerStatus)));
}

// Schreibbefehle nach „Freigeben“: der beim Anlegen gebaute Plan, davor seine Hinweise als Info-Zeilen.
// Gibt es den ZW-Artikel inzwischen im Probelauf (zweites Stück im selben Zustand), gilt +1 statt neu.
function freigabeBefehle(plan, v, plus1, varianteId, jetzt) {
  let p = plan;
  if (plus1 && v.neu) p = zwSchreibplan(Object.assign({}, v, { neu: false, bestehendSimuliert: true, bestehendeVarianteId: varianteId }), {}, jetzt);
  if (!p) return [infoZeile('Kein Schreibplan gespeichert', 'Der Plan zu dieser Freigabe fehlt (zu alt). Position neu anlegen.')];
  return p.fehlt.map((x) => infoZeile('Fehlt für den Plan', x))
    .concat(p.hinweise.map((x) => infoZeile('Hinweis', x)), p.schritte);
}

function retoureAbschliessenWennFertig(speicher, retoureId, jetzt, e) {
  const r = speicher.cache.retouren[retoureId];
  if (!r || !r.positionIds.length) return;
  const fertig = r.positionIds.every((p) => ERLEDIGT.includes(positionsStatus(speicher, p).status));
  if (fertig && !speicher.retourenFertig[retoureId]) {
    // Ist eine Position nicht verkaufbar, geht die Retoure auf 9.1.3 (Reklamieren), sonst auf 9.3.
    const nichtVerkaufbar = r.positionIds.some((p) => positionsStatus(speicher, p).status === 'nicht_verkaufbar');
    const status = nichtVerkaufbar ? String(e.statusNichtVerkaufbar || '9.1.3') : String(e.statusFertig || '9.3');
    speicher.retourenFertig[retoureId] = { zeit: new Date(jetzt).toISOString(), status };
    const text = 'Alle Positionen entschieden, Status ' + status + (nichtVerkaufbar ? ' (Reklamieren, weil nicht verkaufbar)' : '');
    kommentarSim(speicher, retoureId, new Date(jetzt).toISOString(), text + ' (Probelauf: nicht gesetzt)', { aktion: 'status', echtText: text });
    ausgangMerken(speicher, { aktion: 'status', retoureId }, [statusBefehl(retoureId, status)]);
    protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'status', retoureId, ergebnis: status + ' (Probelauf)' });
  }
}

// ---------- ZW-Liste ----------

// liste: die neuesten Zeilen aus ZW_LISTE (wie auf der Seite). Geändert wird die ganze Zeile (Schlüssel zeileId).
function zwListeBuchen(speicher, liste, body, person, jetzt) {
  const gefunden = liste.find((z) => z.id === String(body.id || ''));
  if (!gefunden) abbrechen(404, 'Zeile nicht gefunden.');
  const gebucht = body.gebucht !== false;
  const zeile = Object.assign({}, gefunden, {
    bestandGebucht: gebucht, gebuchtVon: gebucht ? person.benutzer : '', gebuchtAm: gebucht ? new Date(jetzt).toISOString() : '',
  });
  zwListeMerken(speicher, Object.assign({ zeileId: zeile.id }, zeile));
  protokollieren(speicher, jetzt, { benutzer: person.benutzer, aktion: 'bestand-gebucht', retoureId: zeile.retoureId, ergebnis: gebucht ? 'gebucht' : 'zurückgenommen', varianteId: zeile.zwVarianteId });
  return json(200, { ok: true, zeile });
}

// ---------- Mailversand ----------

// Nach dem Mailversand (Baustein „Mailergebnis“): Fehlgeschlagene Mails vermerken und die Antwort an die Seite anpassen.
// „gesendet“ ist die Ausgabe von „Freigabe-Mail senden“, in derselben Reihenfolge wie „mails“.
function zwNachMailversand(antwort, gesendet, speicher, jetzt) {
  const mails = antwort.mails || [];
  const inhalt = JSON.parse(antwort.body);
  mails.forEach((m, i) => {
    const r = gesendet[i];
    const fehler = !r ? 'keine Rückmeldung vom Mailversand' : (r.error ? (r.error.message || r.error) : null);
    if (!fehler) return;
    const eintrag = (inhalt.ergebnisse || []).find((x) => x.positionId === m.positionId);
    if (m.art === 'info') {
      // Info-Mail ans Büro: Die Entscheidung bleibt gültig, nur der Hinweis kommt nicht an.
      protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'buero-mail', positionId: m.positionId, ergebnis: 'fehler', meldung: String(fehler).slice(0, 300) });
      if (eintrag) eintrag.hinweis = 'Info-Mail ans Büro nicht gesendet. Bitte das Büro selbst informieren.';
      return;
    }
    zwMailfehler(speicher, m.positionId, String(fehler).slice(0, 300), jetzt);
    if (eintrag) Object.assign(eintrag, speicher.positionen[m.positionId]);
  });
  return ausgabeAnhaengen({ status: antwort.status, contentType: antwort.contentType, body: JSON.stringify(inhalt), schreiben: antwort.schreiben, ablage: antwort.ablage }, speicher, jetzt);
}

// Mail konnte nicht gesendet werden: Position auf Fehler setzen.
function zwMailfehler(speicher, positionId, meldung, jetzt) {
  const st = speicher.positionen && speicher.positionen[positionId];
  if (!st || st.status !== 'wartet') return;
  const zeit = new Date(jetzt).toISOString();
  speicher.positionen[positionId] = Object.assign({}, st, { status: 'fehler', meldung: 'Freigabe-Mail nicht gesendet: ' + meldung, aktualisiert: zeit });
  if (st.retoureId) kommentarSim(speicher, st.retoureId, zeit, 'ZW-Fehler (' + positionId + '): Freigabe-Mail nicht gesendet', { aktion: 'freigabe-mail', positionId });
  ausgangMerken(speicher, { aktion: 'freigabe-mail', retoureId: st.retoureId, positionId }, bilderLoeschenBefehle((st.vorschau || {}).bilderMedien, 'Freigabe-Mail nicht gesendet'));
  protokollieren(speicher, jetzt, { benutzer: 'automatisch', aktion: 'freigabe-mail', positionId, ergebnis: 'fehler', meldung });
}


// ---------- Aufruf durch n8n ----------
// Die Daten aus plenty und Shopware gibt es nur, wenn „Daten nötig?“ den oberen Weg genommen hat.
function ausgabe(name) { try { return $(name).all().map((i) => i.json); } catch (err) { return null; } }
function geholteDaten() {
  let v;
  try { v = $('Vorbereiten').first().json; } catch (err) { return null; }
  if (v && v.weiter === 'tabellen') return { plan: v.plan, zwListe: ausgabe('ZW-Liste lesen') || [], protokoll: ausgabe('Protokoll lesen') || [] };
  if (!v || v.weiter !== 'daten') return null;
  const sw = ausgabe('Shopware lesen');
  return { plan: v.plan, a: ausgabe('plenty A') || [], b: ausgabe('plenty B') || [], shopware: sw && sw[0] ? sw[0] : null };
}
const anfrage = $('Einstellungen').first().json;
const antwort = zwVerarbeiten({ url: anfrage.webhookUrl, query: anfrage.query, body: anfrage.body, headers: anfrage.headers }, {
  einstellungen: anfrage.einstellungen || {}, speicher: $getWorkflowStaticData('global'), jetzt: Date.now(),
  seiteHtml: SEITE_HTML, daten: geholteDaten(),
  eigenerCode: () => { try { return $('ZW-Logik').params.jsCode; } catch (err) { return null; } },
  alleCodes: () => Object.fromEntries(['Vorbereiten', 'Runde B planen', 'Freigabe-Mails aufteilen', 'Mailergebnis', 'Schreibbefehle aufteilen', 'TMP-Ergebnis', 'Ablage', 'Protokoll aufteilen', 'ZW-Liste aufteilen'].map((n) => {
    try { return [n, $(n).params.jsCode]; } catch (err) { return [n, null]; }
  })),
});
return [{ json: antwort }];
