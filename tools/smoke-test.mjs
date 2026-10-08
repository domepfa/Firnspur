#!/usr/bin/env node
// Rauchtest: öffnet alle drei Apps (Haupt-App und Beta) in Chromium in Handygrösse und prüft,
// dass sie ohne JS-Fehler starten, die Touren (Klettern: Sektoren) aus vorlage/*.json anzeigen, die lokale Kopie
// unter dem richtigen Schlüssel ablegen und offline (Firebase nicht erreichbar) aus dieser
// Kopie weiterlaufen. Dazu wird die erste Tour über das Formular bearbeitet und gespeichert:
// Die neue Fassung muss an Firebase gehen (ohne dass andere Felder verloren gehen), die alte
// unter versions/ gesichert werden und die Änderung auch offline sichtbar bleiben.
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
const fixFirst = (path, list) => { for (const x of list) if (x.name) return { path, tour: x }; };
const APPS = [
  { file: 'index.html', cache: 'firnspur-cache', names: ski.tours.map(t => t.name), edit: fixFirst('tours', ski.tours) },
  { file: 'fixseil.html', cache: 'fixseil-cache', names: fix.tours.filter(t => t.tourCategory !== 'msl').map(t => t.name),
    edit: fixFirst('fixseil/tours', fix.tours.filter(t => t.tourCategory !== 'msl')) },
  { file: 'fixseil.html', query: '?view=msl', cache: 'fixseil-cache', names: fix.sektoren.map(s => s.name) }, // startet in «Gebiete»
  { file: 'wandern.html', cache: 'wandern-cache', names: wan.tours.map(t => t.name), edit: fixFirst('wandern/tours', wan.tours) },
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
  // Simulierte Datenbank pro Durchgang: merkt sich Schreibzugriffe wie das echte Firebase
  const db = JSON.parse(JSON.stringify(FIXTURE));
  const dbGet = key => { const i = key.lastIndexOf('/');
    return key in db ? db[key] : (db[key.slice(0, i)] || {})[key.slice(i + 1)]; };
  const dbPut = (key, val) => { const i = key.lastIndexOf('/');
    if (i > 0) (db[key.slice(0, i)] ||= {})[key.slice(i + 1)] = val; };
  const puts = []; // {key, body}
  await ctx.route('**/*', route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(base)) return route.continue();
    if (u.includes('firebasedatabase.app')) {
      const key = new URL(u).pathname.replace(/^\//, '').replace(/\.json$/, '');
      if (req.method() !== 'GET') {
        if (req.method() === 'DELETE' || key.split('/').length < 2 || key in FIXTURE || /^versions\/[^/]+$/.test(key)) problems.push('gefährlicher Schreibzugriff: ' + req.method() + ' ' + key);
        else { writes.add(req.method() + ' ' + key.replace(/[^/]+$/, '…')); puts.push({ key, body: req.postData() }); }
        if (online && req.method() === 'PUT') { try { dbPut(key, JSON.parse(req.postData() || 'null')); } catch (e) {} }
        return online ? route.fulfill({ status: 200, contentType: 'application/json', body: req.postData() || 'null' }) : route.abort();
      }
      if (!online) return route.abort();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dbGet(key) ?? null) });
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('JS-Fehler: ' + e.message));
  page.on('dialog', d => { if (d.type() === 'beforeunload') return d.accept(); // Warnung «nicht synchronisiert» beim Neuladen
    problems.push('unerwartete Rückfrage: ' + d.message().split('\n')[0]); d.dismiss(); });

  const check = async (phase) => {
    try { await page.goto(base + t.url); }
    catch (e) { // z. B. wenn die Seite sich selbst neu lädt — einmal nachladen
      await page.waitForTimeout(1000);
      try { await page.goto(base + t.url); } catch (e2) { problems.push(phase + ': Seite lädt nicht (' + e2.message.split('\n')[0] + ')'); return; }
    }
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body.innerText);
    for (const n of t.names) if (!text.includes(n)) problems.push(phase + ': Tour «' + n + '» nicht sichtbar');
    await page.screenshot({ path: path.join(outDir, t.label.replace(/[/?=]/g, '-') + '-' + phase + '.png') });
  };
  const editAndSave = async () => {
    const { path: coll, tour } = t.edit, newName = tour.name + ' geprüft';
    puts.length = 0;
    const opened = await page.evaluate(id => {
      state.myName = state.myName || 'Rauchtest';
      const tour = state.tours.find(x => x.id === id);
      if (!tour) return false;
      state.modal = { type: 'edit-tour', payload: tour }; render();
      return !!document.getElementById('tour-save-btn');
    }, tour.id);
    if (!opened) { problems.push('Bearbeiten: Formular für «' + tour.name + '» geht nicht auf'); return; }
    await page.fill('#tour-form [name="name"]', newName);
    await page.click('#tour-save-btn');
    await page.waitForTimeout(1500);
    const saved = puts.find(p => p.key === coll + '/' + tour.id);
    if (!saved) { problems.push('Speichern: nichts an ' + coll + '/' + tour.id + ' geschickt' + (puts.length ? ' (nur: ' + puts.map(p => p.key).join(', ') + ')' : '') + ' – ' + await page.evaluate(() => (document.querySelector('.form-error, .toast') || {}).textContent || '')); return; }
    const body = JSON.parse(saved.body);
    if (body.name !== newName) problems.push('Speichern: Name nicht übernommen (' + body.name + ')');
    for (const [k, v] of Object.entries(tour)) {
      if (['name', 'updatedAt', 'updatedBy'].includes(k) || v === '' || v == null || (Array.isArray(v) && !v.length)) continue;
      if (JSON.stringify(body[k]) !== JSON.stringify(v)) problems.push('Speichern: Feld «' + k + '» verändert: ' + JSON.stringify(v) + ' → ' + JSON.stringify(body[k]));
    }
    if (!puts.some(p => p.key.startsWith('versions/') && p.key.includes(tour.id))) problems.push('Speichern: alte Fassung nicht unter versions/ gesichert');
    const cached = await page.evaluate(k => localStorage.getItem(k) || '', t.cache);
    if (!cached.includes(newName)) problems.push('Speichern: Änderung fehlt in der lokalen Kopie');
    t.names = t.names.map(n => n === tour.name ? newName : n);
  };
  try { await check('online'); } catch (e) { problems.push('Test abgebrochen: ' + e.message.split('\n')[0]); }
  const keys = await page.evaluate(() => Object.keys(localStorage));
  if (!keys.includes(t.cache)) problems.push('lokale Kopie fehlt: ' + t.cache + ' (vorhanden: ' + keys.join(', ') + ')');
  try {
    if (t.edit) await editAndSave();
    online = false;
    await check('offline');
  } catch (e) { problems.push('Test abgebrochen: ' + e.message.split('\n')[0]); }

  await ctx.close();
  if (problems.length) { failed++; console.log('FEHLER ' + t.label); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('ok     ' + t.label);
  if (writes.size) console.log('         Schreibzugriffe (simuliert): ' + [...writes].join(', '));
}
await browser.close();
server.close();
console.log('Screenshots: ' + outDir);
process.exit(failed ? 1 : 0);
