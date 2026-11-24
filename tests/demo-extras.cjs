// Vidéo de démonstration des décors de saison et des réactions de Lexou (pas un test : sert à valider le rendu).
// NODE_PATH=$(npm root -g) node tests/demo-extras.cjs  -> tests/captures/demo-extras/*.webm
const { chromium, devices } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const RACINE = path.join(__dirname, '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer((q, r) => {
  let f = path.join(RACINE, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(8199);
const URL = 'http://localhost:8199/';
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', serviceWorkers: 'block', recordVideo: { dir: path.join(__dirname, 'captures/demo-extras'), size: { width: 390, height: 844 } } });
  const p = await c.newPage();
  const accueil = async (jour, heure, forcer) => {
    await p.goto(`${URL}?test&anim&jour=${jour}&heure=${heure}`); await p.waitForSelector('.tribune');
    if (forcer) await p.evaluate((n) => { Math.random = () => (n === 'echarpe' ? 0.1 : 0.9); window.__app.accueil(); }, forcer);
    await pause(5500);
  };
  await accueil('2026-12-10', '14', 'echarpe'); // décembre, journée : guirlande, neige, écharpe
  await accueil('2026-12-10', '21'); // décembre, le soir : bureau
  await accueil('2026-11-25', '14', 'autre'); // aujourd'hui : rien ne change
  const fin = async (scores, parfaites, reussi) => {
    await p.evaluate(([sc, pf, ok]) => { const e = window.__app.etat(); e.serie.dernier = null; window.__app.resultats({ scores: sc, rounds: sc.map(() => ({})), parfaites: pf, xp: 50, jetons: 5, comboMax: 3, touches: new Map() }, ok); }, [scores, parfaites, reussi]);
    await pause(6500);
  };
  await fin([1, 1, 1], 3, true); // sans faute : tampon + feu d'artifice
  for (const r of [0.1, 0.5, 0.9]) { await p.evaluate((x) => { Math.random = () => x; }, r); await fin([0.9, 0.8, 0.85], 0, true); }
  await fin([0.2, 0.3, 0.1], 0, false); // à revoir : se gratte la tête
  await c.close(); await b.close(); serveur.close();
})();
