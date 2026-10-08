#!/usr/bin/env node
// Rauchtest: öffnet alle drei Apps (Haupt-App und Beta) in Chromium in Handygrösse und prüft,
// dass sie ohne JS-Fehler starten, die Touren (Klettern: Sektoren) aus vorlage/*.json anzeigen, die lokale Kopie
// unter dem richtigen Schlüssel ablegen und offline (Firebase nicht erreichbar) aus dieser
// Kopie weiterlaufen.
// Kein Zugriff aufs Internet: Firebase wird mit den Vorlagen simuliert, alles andere blockiert.
// Schreibzugriffe an Firebase werden nur simuliert und aufgelistet (Fixseil legt z. B. beim
// Start fehlende Gipfel an). Löschen beim Start oder Schreiben auf eine ganze Sammlung
// lassen den Test fehlschlagen.
//
// Aufruf:  node tools/smoke-test.mjs            (alles)
//          node tools/smoke-test.mjs beta       (nur Beta)
//          node tools/smoke-test.mjs main       (nur Haupt-App)
// Screenshots landen in $SMOKE_OUT (Standard: Temp-Ordner).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const vorlage = n => JSON.parse(fs.readFileSync(path.join(root, 'vorlage', n + '-vorlage.json'), 'utf8'));
const byId = list => Object.fromEntries((list || []).map(x => [x.id, x]));
const ski = vorlage('firnspur'), fix = vorlage('fixseil'), wan = vorlage('wandern');
// Firebase-Pfad -> Antwort (alles andere: null = leer)
const FIXTURE = {
  'tours': byId(ski.tours), 'huts': byId(ski.huts),
  'fixseil/tours': byId(fix.tours), 'fixseil/sektoren': byId(fix.sektoren), 'fixseil/huts': byId(fix.huts),
  'wandern/tours': byId(wan.tours),
};
const APPS = [
  { file: 'index.html', cache: 'firnspur-cache', names: ski.tours.map(t => t.name) },
  { file: 'fixseil.html', cache: 'fixseil-cache', names: fix.tours.filter(t => t.tourCategory !== 'msl').map(t => t.name) },
  { file: 'fixseil.html', query: '?view=msl', cache: 'fixseil-cache', names: fix.sektoren.map(s => s.name) }, // startet in «Gebiete»
  { file: 'wandern.html', cache: 'wandern-cache', names: wan.tours.map(t => t.name) },
];

const mode = process.argv[2] || 'all';
const targets = [];
for (const a of APPS) {
  const q = a.query || '';
  if (mode !== 'beta') targets.push({ ...a, url: a.file + q, label: a.file + q });
  if (mode !== 'main') targets.push({ ...a, url: 'beta/' + a.file + q, label: 'beta/' + a.file + q,
    cache: a.cache.replace('-cache', 'beta-cache') });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const outDir = process.env.SMOKE_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'firnspur-smoke-'));

const browser = await chromium.launch();
let failed = 0;
for (const t of targets) {
  const problems = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    serviceWorkers: 'block' });
  // Angemeldet starten (Token wird nie geprüft, Firebase ist simuliert)
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('bergtouren-auth'))
    localStorage.setItem('bergtouren-auth', JSON.stringify({ idToken: 'test', refreshToken: 'test', expiresAt: Date.now() + 36e5 })); } catch (e) {} });
  let online = true;
  const writes = new Set();
  await ctx.route('**/*', route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(base)) return route.continue();
    if (u.includes('firebasedatabase.app')) {
      const key = new URL(u).pathname.replace(/^\//, '').replace(/\.json$/, '');
      if (req.method() !== 'GET') {
        if (req.method() === 'DELETE' || key.split('/').length < 2 || key in FIXTURE) problems.push('gefährlicher Schreibzugriff: ' + req.method() + ' ' + key);
        else writes.add(req.method() + ' ' + key.replace(/[^/]+$/, '…'));
        return online ? route.fulfill({ status: 200, contentType: 'application/json', body: req.postData() || 'null' }) : route.abort();
      }
      if (!online) return route.abort();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE[key] ?? null) });
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('JS-Fehler: ' + e.message));

  const check = async (phase) => {
    await page.goto(base + t.url);
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body.innerText);
    for (const n of t.names) if (!text.includes(n)) problems.push(phase + ': Tour «' + n + '» nicht sichtbar');
    await page.screenshot({ path: path.join(outDir, t.label.replace(/[/?=]/g, '-') + '-' + phase + '.png') });
  };
  await check('online');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  if (!keys.includes(t.cache)) problems.push('lokale Kopie fehlt: ' + t.cache + ' (vorhanden: ' + keys.join(', ') + ')');
  online = false;
  await check('offline');

  await ctx.close();
  if (problems.length) { failed++; console.log('FEHLER ' + t.label); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('ok     ' + t.label);
  if (writes.size) console.log('         schreibt beim Start: ' + [...writes].join(', '));
}
await browser.close();
server.close();
console.log('Screenshots: ' + outDir);
process.exit(failed ? 1 : 0);
