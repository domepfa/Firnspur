#!/usr/bin/env node
// Test «sicher speichern»: drei Fassungen zusammenführen, Versionskennung (ETag), offline.
// 1. Einheitentests der Zusammenführung (fsMerge3) direkt aus 0-shared.js.
// 2. Szenarien im Browser (Skitour-App, Handygrösse): Firebase wird simuliert, inkl. ETag und
//    «if-match» (412, wenn sich der Stand inzwischen geändert hat). Ein zweites «Gerät» schreibt
//    direkt in die simulierte Datenbank.
// Aufruf: node tools/sync-test.mjs [beta|main] [-v]   Ausgabe: «N von N ok» oder die Fehler.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const which = process.argv.includes('main') ? '' : 'beta/';
const verbose = process.argv.includes('-v');
const results = [];
const ok = (name, cond, info) => { results.push({ name, ok: !!cond, info }); if (verbose) console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond || !info ? '' : ' – ' + info)); };

/* ---------- 1. Einheitentests ---------- */
const src = fs.readFileSync(path.join(root, which, '0-shared.js'), 'utf8');
const grab = n => { const i = src.indexOf('function ' + n + '('); if (i < 0) throw new Error('fehlt: ' + n);
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}' && !--d) return src.slice(i, k + 1); } };
const M = new Function(['fsImportKey', 'fsCanon', 'fsEq', 'fsIsPlainObj', 'fsIsCoordList', 'fsMergeList', 'fsMergeField', 'fsMerge3'].map(grab).join('\n') + '\nreturn fsMerge3;')();
const merge = (b, m, t) => { const c = []; const r = M(b, m, t, '', c); return { r, c }; };
{
  const b = { name: 'A', notes: 'x', completions: [{ by: 'P', date: '1' }], points: [{ lat: 1, lon: 1, label: 'P1' }], trackSimplified: [[1, 1], [2, 2]] };
  let x = merge(b, { ...b, name: 'B' }, { ...b, notes: 'y' });
  ok('Merge: verschiedene Felder', x.r.name === 'B' && x.r.notes === 'y' && !x.c.length, JSON.stringify(x));
  x = merge(b, { ...b, completions: [...b.completions, { by: 'Q', date: '2' }] }, { ...b, completions: [...b.completions, { by: 'R', date: '3' }] });
  ok('Merge: Begehungen beider bleiben', x.r.completions.length === 3 && !x.c.length, JSON.stringify(x.r.completions));
  x = merge(b, { ...b, completions: [] }, b);
  ok('Merge: bewusst entfernte Begehung bleibt entfernt', x.r.completions.length === 0, JSON.stringify(x.r.completions));
  x = merge(b, { ...b, completions: [] }, { ...b, completions: [...b.completions, { by: 'R', date: '3' }] });
  ok('Merge: entfernen + anderswo neu', x.r.completions.length === 1 && x.r.completions[0].by === 'R', JSON.stringify(x.r.completions));
  x = merge(b, { ...b, name: 'B' }, { ...b, name: 'C' });
  ok('Merge: gleiches Feld → Rückfrage', x.c.length === 1 && x.c[0].path === 'name', JSON.stringify(x.c));
  x = merge(b, { ...b, trackSimplified: [[5, 5]] }, { ...b, trackSimplified: [[6, 6]] });
  ok('Merge: Linien werden nie gemischt → Rückfrage', x.c.length === 1 && x.c[0].path === 'trackSimplified', JSON.stringify(x.c));
  const m = { ...b }; delete m.notes;
  x = merge(b, m, { ...b, notes: 'y' });
  ok('Merge: fehlendes Feld gilt als unverändert', x.r.notes === 'y', JSON.stringify(x.r));
  x = merge(b, { ...b, points: [{ lat: 1, lon: 1, label: 'neu' }] }, { ...b, points: [...b.points, { lat: 3, lon: 3 }] });
  ok('Merge: Punkt umbenannt + anderswo Punkt dazu', x.r.points.length === 2 && x.r.points[0].label === 'neu', JSON.stringify(x.r.points));
  x = merge({ phones: { A: '1' } }, { phones: { A: '1', B: '2' } }, { phones: { A: '1', C: '3' } });
  ok('Merge: verschachtelte Objekte', x.r.phones.B === '2' && x.r.phones.C === '3', JSON.stringify(x.r));
  x = merge({ ...b, material: [] }, { ...b, material: ['Pickel'] }, { ...b });
  ok('Merge: leere Liste = fehlendes Feld (wie Firebase)', x.r.material && x.r.material[0] === 'Pickel' && !x.c.length, JSON.stringify(x.c));
  x = merge({ ...b, notes: '' }, { ...b, notes: 'neu' }, { ...b, notes: undefined });
  ok('Merge: leerer Text = fehlendes Feld', x.r.notes === 'neu' && !x.c.length, JSON.stringify(x.c));
  x = merge({ points: [{ lat: 1, lon: 1, label: 'P' }] }, { points: [{ label: 'P', lon: 1, lat: 1 }] }, { points: [{ lat: 1, lon: 1, label: 'P' }, { lat: 2, lon: 2 }] });
  ok('Merge: Reihenfolge der Felder egal', x.r.points.length === 2 && !x.c.length, JSON.stringify(x.r.points));
  x = merge(b, { ...b, name: 'B', _unsynced: true }, { ...b, updatedAt: 'T2', updatedBy: 'Q' });
  ok('Merge: Stempel von dort, lokale Felder von hier', x.r.updatedBy === 'Q' && x.r._unsynced === true && x.r.name === 'B', JSON.stringify(x.r));
}

/* ---------- 2. Szenarien im Browser ---------- */
const vorlage = JSON.parse(fs.readFileSync(path.join(root, 'vorlage', 'firnspur-vorlage.json'), 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const browser = await chromium.launch();
const tour0 = vorlage.tours.find(t => t.name);
const TP = 'tours/' + tour0.id;

async function scenario(name, fn, me = 'Dome') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(n => { try { if (!localStorage.getItem('bergtouren-auth')) localStorage.setItem('bergtouren-auth', JSON.stringify({ idToken: 't', refreshToken: 't', expiresAt: Date.now() + 36e5 })); localStorage.setItem('firnspurbeta-myname', n); localStorage.setItem('firnspur-myname', n); } catch (e) {} }, me);
  const db = { tours: Object.fromEntries(vorlage.tours.map(t => [t.id, JSON.parse(JSON.stringify(t))])), huts: Object.fromEntries((vorlage.huts || []).map(h => [h.id, h])) };
  const getK = k => k.split('/').reduce((o, s) => (o == null ? undefined : o[s]), db);
  // Wie Firebase: leere Listen/Objekte und null werden nicht gespeichert
  const fbNorm = v => { if (v === null || v === undefined) return undefined; if (Array.isArray(v)) { const a = v.map(fbNorm).filter(x => x !== undefined); return a.length ? a : undefined; }
    if (typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { const c = fbNorm(x); if (c !== undefined) o[k] = c; } return Object.keys(o).length ? o : undefined; } return v; };
  const setK = (k, v) => { const s = k.split('/'); let o = db; s.slice(0, -1).forEach(x => { o = o[x] ||= {}; }); const n = fbNorm(v); if (n === undefined) delete o[s[s.length - 1]]; else o[s[s.length - 1]] = n; };
  const etag = v => '"' + crypto.createHash('md5').update(JSON.stringify(v ?? null)).digest('hex') + '"';
  const env = { online: true, beforePut: null, dialogs: [], answer: true, puts: [] };
  await ctx.route('**/*', route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(base)) return route.continue();
    if (!u.includes('firebasedatabase.app')) return route.abort();
    if (!env.online) return route.abort();
    if (env.failGet && req.method() === 'GET' && env.failGet(new URL(u).pathname)) return route.abort();
    if (env.failPut && req.method() === 'PUT' && env.failPut(new URL(u).pathname)) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"test"}' });
    const key = new URL(u).pathname.replace(/^\//, '').replace(/\.json$/, '');
    const h = { 'Access-Control-Expose-Headers': 'ETag', ETag: etag(getK(key)) };
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(getK(key) ?? null) });
    if (req.method() === 'PUT') {
      if (env.beforePut && !key.startsWith('versions/')) { const f = env.beforePut; env.beforePut = null; f(getK, setK); }
      const im = req.headers()['if-match'];
      if (im && im !== etag(getK(key))) return route.fulfill({ status: 412, contentType: 'application/json', body: '{"error":"etag mismatch"}' });
      const v = JSON.parse(req.postData() || 'null'); setK(key, v); env.puts.push(key);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => { if (d.type() === 'beforeunload') return d.accept(); env.dialogs.push(d.message()); env.answer ? d.accept() : d.dismiss(); });
  await page.goto(base + which + 'index.html'); await page.waitForTimeout(2500);
  await page.evaluate(n => { state.myName = n; }, me);
  const saveVia = async (mut) => page.evaluate(async ([id, m]) => { const t = state.tours.find(x => x.id === id); new Function('t', m)(t); return await saveTourCloud(t); }, [tour0.id, mut]);
  try { await fn({ page, db: { get: getK, set: setK }, env, saveVia }); }
  catch (e) { ok(name + ' (Ablauf)', false, e.message.split('\n')[0]); }
  if (errs.length) ok(name + ': keine JS-Fehler', false, errs.join(' | '));
  await ctx.close();
}

await scenario('Andere Felder', async ({ db, env, saveVia }) => {
  const cur = db.get(TP); db.set(TP, { ...cur, notes: 'von B', completions: [...(cur.completions || []), { by: 'B', date: '2026-01-01' }], updatedAt: '2026-10-11T00:00:00Z', updatedBy: 'B' });
  const r = await saveVia("t.name = 'Neu von mir';");
  const d = db.get(TP);
  ok('Andere Felder: gespeichert ohne Rückfrage', r && !env.dialogs.length, env.dialogs.join(' | '));
  ok('Andere Felder: mein Name + deren Notiz + deren Begehung', d.name === 'Neu von mir' && d.notes === 'von B' && d.completions.some(c => c.by === 'B'), JSON.stringify({ n: d.name, no: d.notes, c: d.completions }));
});
await scenario('Zweimal speichern', async ({ db, env, saveVia }) => {
  await saveVia("t.stayTypes = [];");
  await saveVia("t.stayTypes = ['huette']; t.notes = '';");
  await saveVia("t.notes = 'Notiz';");
  const d = db.get(TP);
  ok('Zweimal speichern: keine Rückfrage mit sich selbst', !env.dialogs.length, env.dialogs.join(' | '));
  ok('Zweimal speichern: Werte richtig', d.stayTypes && d.stayTypes[0] === 'huette' && d.notes === 'Notiz', JSON.stringify({ m: d.stayTypes, n: d.notes }));
});
await scenario('Gleiches Feld', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), name: 'Name von B', updatedBy: 'B', updatedAt: '2026-10-11T00:00:00Z' });
  env.answer = true;
  await saveVia("t.name = 'Name von mir';");
  ok('Gleiches Feld: Rückfrage erscheint', env.dialogs.length === 1 && /Name/.test(env.dialogs[0]), env.dialogs.join(' | '));
  ok('Gleiches Feld: «deine behalten» gilt', db.get(TP).name === 'Name von mir', db.get(TP).name);
});
await scenario('Gleiches Feld, andere übernehmen', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), name: 'Name von B', updatedBy: 'B', updatedAt: '2026-10-11T00:00:00Z' });
  env.answer = false;
  await saveVia("t.name = 'Name von mir'; t.notes = 'Notiz von mir';");
  const d = db.get(TP);
  ok('Andere übernehmen: deren Name, meine Notiz', d.name === 'Name von B' && d.notes === 'Notiz von mir', JSON.stringify({ n: d.name, no: d.notes }));
});
await scenario('Wettlauf (ETag)', async ({ db, env, saveVia }) => {
  env.beforePut = (get, set) => { const c = get(TP); set(TP, { ...c, notes: 'dazwischen von B', updatedAt: '2026-10-11T01:00:00Z', updatedBy: 'B' }); };
  const r = await saveVia("t.name = 'Neu von mir';");
  const d = db.get(TP);
  ok('Wettlauf: nichts überschrieben', r && d.name === 'Neu von mir' && d.notes === 'dazwischen von B', JSON.stringify({ r, n: d.name, no: d.notes }));
});
await scenario('Listen', async ({ db, saveVia }) => {
  const cur = db.get(TP); db.set(TP, { ...cur, points: [...(cur.points || []), { lat: 46.9, lon: 8.1, label: 'Punkt B' }] });
  await saveVia("t.points = [...(t.points||[]), {lat:46.8, lon:8.2, label:'Punkt ich'}];");
  const p = db.get(TP).points.map(x => x.label);
  ok('Listen: Punkte beider bleiben', p.includes('Punkt B') && p.includes('Punkt ich'), JSON.stringify(p));
});
await scenario('Offline', async ({ page, db, env, saveVia }) => {
  env.online = false;
  const r = await saveVia("t.name = 'Offline von mir'; t._unsynced = true;");
  ok('Offline: Speichern scheitert sauber', r === false, String(r));
  await page.evaluate(() => { try { cacheLocalSnapshot(); } catch (e) {} });
  const pinned = await page.evaluate(p => localStorage.getItem('fs-base:' + p) != null, TP);
  ok('Offline: Ausgangsstand im Gerät festgehalten', pinned);
  db.set(TP, { ...db.get(TP), notes: 'online von B', updatedAt: '2026-10-11T02:00:00Z', updatedBy: 'B' });
  env.online = true;
  await page.reload(); await page.waitForTimeout(4000);
  const d = db.get(TP);
  ok('Offline: nach dem Neuladen zusammengeführt', d.name === 'Offline von mir' && d.notes === 'online von B', JSON.stringify({ n: d.name, no: d.notes, dlg: env.dialogs }));
});

await scenario('Offline gestartet', async ({ page, db, env, saveVia }) => {
  env.online = false;
  await page.reload(); await page.waitForTimeout(3000); // App startet ohne Netz aus der Gerätekopie
  await page.evaluate(n => { state.myName = n; }, 'Dome');
  const r = await saveVia("t.name = 'Offline gestartet von mir';");
  db.set(TP, { ...db.get(TP), notes: 'inzwischen von B', updatedAt: '2026-10-11T03:00:00Z', updatedBy: 'B' });
  env.online = true;
  await page.reload(); await page.waitForTimeout(4000);
  const d = db.get(TP);
  ok('Offline gestartet: eigene Änderung und die von B bleiben', r === false && d.name === 'Offline gestartet von mir' && d.notes === 'inzwischen von B', JSON.stringify({ r, n: d.name, no: d.notes, dlg: env.dialogs }));
});
await scenario('Ohne Ausgangsstand', async ({ page, db, env }) => {
  // Alte, ungesicherte Kopie im Gerät ohne festgehaltenen Ausgangsstand (z. B. aus einer älteren App-Fassung)
  await page.evaluate(id => {
    const k = Object.keys(localStorage).find(x => /^firnspur(beta)?-cache$/.test(x));
    const c = JSON.parse(localStorage.getItem(k)); const t = c.tours.find(x => x.id === id);
    t.name = 'Alte Kopie'; t.notes = ''; t._unsynced = true; localStorage.setItem(k, JSON.stringify(c));
    Object.keys(localStorage).filter(x => x.startsWith('fs-base:')).forEach(x => localStorage.removeItem(x));
  }, TP.split('/')[1]);
  db.set(TP, { ...db.get(TP), notes: 'neu von B', updatedAt: '2026-10-12T03:00:00Z', updatedBy: 'B' });
  env.answer = false;
  await page.reload(); await page.waitForTimeout(4000);
  const d = db.get(TP);
  ok('Ohne Ausgangsstand: fragt nach statt still zu überschreiben, B bleibt', env.dialogs.length >= 1 && d.notes === 'neu von B', JSON.stringify({ n: d.name, no: d.notes, dlg: env.dialogs }));
});
await scenario('Vorschlag scheitert', async ({ db, env, saveVia }) => {
  env.failPut = p => p.includes('/suggestions/');
  const r = await saveVia("t.name = 'Anders benannt';");
  const d = db.get(TP);
  ok('Vorschlag scheitert: nicht gespeichert, Änderung bleibt auf dem Gerät', r === false && d.name === tour0.name, JSON.stringify({ r, n: d.name }));
}, 'Anna');
await scenario('Teilweise geladen', async ({ page, db, env }) => {
  const before = await page.evaluate(() => state.tours.length);
  env.failGet = p => p === '/tours.json'; // nur die Touren kommen nicht an
  db.set(TP, { ...db.get(TP), notes: 'neu von B', updatedAt: '2026-10-12T04:00:00Z', updatedBy: 'B' });
  await page.reload(); await page.waitForTimeout(4000);
  const r = await page.evaluate(() => ({ n: state.tours.length, rescue: !!document.querySelector('.fs-rescue') }));
  env.failGet = null;
  const writes = env.puts.filter(k => k.startsWith('tours/'));
  ok('Teilweise geladen: Touren aus der Gerätekopie, nichts überschrieben, keine Rettung angeboten', r.n === before && !r.rescue && !writes.length && db.get(TP).notes === 'neu von B', JSON.stringify({ before, r, writes }));
});
await scenario('Entwurf Formular', async ({ page, db, env }) => {
  await page.evaluate(id => { const t = state.tours.find(x => x.id === id); state.modal = { type: 'edit-tour', payload: t }; render(); }, TP.split('/')[1]);
  await page.waitForTimeout(500);
  await page.fill('#tour-form [name="special"]', 'Lange Notiz, die nicht verloren gehen darf');
  await page.waitForTimeout(1200);
  await page.reload(); await page.waitForTimeout(4000); // so, als hätte der Browser den Tab beendet
  const offered = await page.evaluate(() => !!document.querySelector('#fs-draft-offer [data-restore]'));
  if (offered) await page.click('#fs-draft-offer [data-restore]');
  await page.waitForTimeout(1000);
  const val = await page.evaluate(() => (document.querySelector('#tour-form [name="special"]') || {}).value);
  if (offered) { await page.click('#tour-save-btn'); await page.waitForTimeout(2000); }
  ok('Entwurf Formular: nach beendetem Tab angeboten, wiederhergestellt und gespeichert', offered && val === 'Lange Notiz, die nicht verloren gehen darf' && db.get(TP).special === val, JSON.stringify({ offered, val, saved: db.get(TP).special }));
});
await scenario('Entwurf Karte bearbeiten', async ({ page, db, env }) => {
  const id = TP.split('/')[1];
  await page.evaluate(id => { state.modal = { type: 'tour-detail', payload: id }; render(); }, id);
  await page.waitForTimeout(800);
  await page.evaluate(id => { fsEnterEditMode(); document.getElementById('quick-edit-toggle-' + id).click(); }, id);
  await page.waitForTimeout(2500);
  await page.evaluate(id => { const el = document.getElementById('quick-points-hidden-' + id); const a = JSON.parse(el.value || '[]'); a.push({ lat: 46.7, lon: 8.4, label: 'Abseilstelle' }); el.value = JSON.stringify(a); markModalDirty(); }, id);
  await page.waitForTimeout(1200);
  await page.reload(); await page.waitForTimeout(4000);
  const offered = await page.evaluate(() => !!document.querySelector('#fs-draft-offer [data-restore]'));
  if (offered) await page.click('#fs-draft-offer [data-restore]');
  await page.waitForTimeout(3000);
  const has = await page.evaluate(id => (document.getElementById('quick-points-hidden-' + id) || {}).value || '', id);
  if (offered) { await page.evaluate(id => document.querySelector('[data-act="quick-save"][data-id="' + id + '"]').click(), id); await page.waitForTimeout(2000); }
  const pts = (db.get(TP).points || []).map(p => p.label);
  ok('Entwurf Karte bearbeiten: neuer Punkt nach beendetem Tab zurück und gespeichert', offered && has.includes('Abseilstelle') && pts.includes('Abseilstelle'), JSON.stringify({ offered, has: has.slice(0, 80), pts }));
});
await scenario('Notbremse: Liste leer', async ({ db, env, saveVia }) => {
  env.answer = false; // «Abbrechen»: Änderungen speichern, Verlorenes behalten
  await saveVia("t.material = []; t.name = 'Neu';");
  const d = db.get(TP);
  ok('Notbremse: Rückfrage bei mehreren entfernten Einträgen', env.dialogs.length === 1 && /Material/.test(env.dialogs[0]), env.dialogs.join(' | '));
  ok('Notbremse: Abbrechen behält Liste, speichert Rest', d.name === 'Neu' && d.material && d.material.length === 2, JSON.stringify({ n: d.name, m: d.material }));
});
await scenario('Notbremse: Text gekürzt', async ({ db, env, saveVia }) => {
  await saveVia("t.ascent = 'Ein langer Aufstiegsbeschrieb mit vielen Details zur Route, Spalten und Varianten.';");
  await saveVia("t.ascent = 'kurz';");
  ok('Notbremse: Rückfrage bei stark gekürztem Text', env.dialogs.length === 1 && /gekürzt/.test(env.dialogs[0]), env.dialogs.join(' | '));
  ok('Notbremse: OK speichert gekürzt', db.get(TP).ascent === 'kurz');
});
await scenario('Notbremse: einzelner Eintrag', async ({ db, env, saveVia }) => {
  await saveVia("t.gefahren = ['Lawinenhang'];");
  ok('Notbremse: einzeln entfernt ohne Rückfrage', !env.dialogs.length && db.get(TP).gefahren.length === 1, env.dialogs.join(' | '));
});
await scenario('Notbremse: ein Punkt', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), points: [{ lat: 46.1, lon: 7.1, label: 'Gipfel' }, { lat: 46.2, lon: 7.2, label: 'Abseilstelle' }] });
  await saveVia("t.points = [{lat:46.1, lon:7.1, label:'Gipfel'}, {lat:46.2, lon:7.2, label:'Abseilstelle'}];");
  env.answer = false;
  await saveVia("t.points = [{lat:46.1, lon:7.1, label:'Gipfel'}];");
  const d = db.get(TP);
  ok('Notbremse: ein Punkt weg fragt nach, Abbrechen behält ihn', env.dialogs.length === 1 && /Abseilstelle/.test(env.dialogs[0]) && d.points.length === 2, JSON.stringify({ dlg: env.dialogs, p: d.points }));
});
await scenario('Notbremse: Feld geleert', async ({ db, env, saveVia }) => {
  env.answer = false;
  await saveVia("t.crux = '';");
  ok('Notbremse: geleertes Feld wird nachgefragt und bleibt', env.dialogs.length === 1 && db.get(TP).crux === tour0.crux, env.dialogs.join(' | '));
});

// Eigentümer und Vorschläge: Tour gehört «Dome» (Vorlage ohne echten Ersteller)
const SUGP = 'suggestions/tours/' + tour0.id;
await scenario('Vorschlag statt Änderung', async ({ db, env, saveVia }) => {
  const r = await saveVia("t.name = 'Anders benannt'; t.crux = 'Neue Schlüsselstelle';");
  const d = db.get(TP), sug = Object.values(db.get(SUGP) || {});
  ok('Vorschlag: Tour bleibt unverändert', d.name === tour0.name && d.crux === tour0.crux, JSON.stringify({ n: d.name, c: d.crux }));
  ok('Vorschlag: gespeichert mit beiden Feldern', sug.length === 1 && sug[0].by === 'Anna' && sug[0].changes.name === 'Anders benannt' && sug[0].changes.crux && sug[0].status === 'offen', JSON.stringify(sug));
  ok('Vorschlag: keine Rückfrage', !env.dialogs.length, env.dialogs.join(' | '));
}, 'Anna');
await scenario('Ergänzen direkt', async ({ db, saveVia }) => {
  await saveVia("t.notes = 'Neue Notiz'; t.completions = [{by:'Anna', date:'2026-10-01'}]; t.stayTypes = [...(t.stayTypes||[]), 'huette'];");
  const d = db.get(TP), sug = db.get(SUGP);
  ok('Ergänzen: leeres Feld, Begehung und Listeneintrag direkt', d.notes === 'Neue Notiz' && d.completions.length === 1 && d.stayTypes.includes('huette') && !sug, JSON.stringify({ n: d.notes, c: d.completions, st: d.stayTypes, sug }));
}, 'Anna');
await scenario('Lokale Merker', async ({ db, saveVia }) => {
  await saveVia("t._unsynced = true; t._tmp = 1; t.notes = 'mit Merker';");
  const d = db.get(TP);
  ok('Lokale Merker: _-Felder landen nicht in der Datenbank', d.notes === 'mit Merker' && !Object.keys(d).some(k => k[0] === '_'), JSON.stringify(Object.keys(d).filter(k => k[0] === '_')));
});
await scenario('Tab beendet beim Speichern', async ({ page, env }) => {
  env.online = false; // Antwort kommt nie zurück wie gewünscht: Speichern scheitert
  const r = await page.evaluate(async (id) => {
    const t = state.tours.find(x => x.id === id);
    t.notes = 'Unterwegs geschrieben';
    const pr = saveTourCloud(t); // nicht abwarten: so, als würde der Tab jetzt beendet
    await new Promise(res => setTimeout(res, 0));
    const key = Object.keys(localStorage).find(k => /-cache$/.test(k) && k.startsWith('firnspur'));
    const c = JSON.parse(localStorage.getItem(key) || '{}');
    const ct = (c.tours || []).find(x => x.id === id) || {};
    const ok = await pr;
    return { during: { notes: ct.notes, uns: ct._unsynced }, ok, after: t._unsynced };
  }, TP.split('/')[1]);
  ok('Tab beendet: Änderung schon vor der Antwort auf dem Gerät, als nicht hochgeladen', r.during.notes === 'Unterwegs geschrieben' && r.during.uns === true && r.ok === false && r.after === true, JSON.stringify(r));
});
await scenario('Erfahrungen', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), erfahrungen: [{ id: 'e_dome', by: 'Dome', date: '2026-01-01', text: 'Von Dome' }] });
  await saveVia("t.erfahrungen = [...(t.erfahrungen||[]), {id:'e_a1', by:'Anna', date:'2026-10-01', text:'Erste'}];");
  await saveVia("t.erfahrungen = [...(t.erfahrungen||[]), {id:'e_a2', by:'Anna', date:'2026-10-02', text:'Zweite'}];");
  let d = db.get(TP), ids = (d.erfahrungen || []).map(e => e.id).join(',');
  ok('Erfahrungen: zwei neue direkt, alte bleibt', ids === 'e_dome,e_a1,e_a2' && !db.get(SUGP), ids);
  await saveVia("t.erfahrungen = t.erfahrungen.filter(e => e.id !== 'e_a1');");
  d = db.get(TP); ids = (d.erfahrungen || []).map(e => e.id).join(',');
  ok('Erfahrungen: eigene entfernen direkt', ids === 'e_dome,e_a2' && !db.get(SUGP), ids);
  await saveVia("t.erfahrungen = t.erfahrungen.filter(e => e.id !== 'e_dome');");
  d = db.get(TP); ids = (d.erfahrungen || []).map(e => e.id).join(',');
  const sug = Object.values(db.get(SUGP) || {});
  ok('Erfahrungen: fremde entfernen wird Vorschlag', ids === 'e_dome,e_a2' && sug.length === 1, JSON.stringify({ ids, sug, dlg: env.dialogs }));
}, 'Anna');
await scenario('Admin', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), owner: 'Anna' });
  await saveVia("t.name = 'Vom Admin geändert'; t.material = [];");
  const d = db.get(TP);
  ok('Admin: fremde Tour direkt geändert, kein Vorschlag', d.name === 'Vom Admin geändert' && !d.material && !db.get(SUGP), JSON.stringify({ n: d.name, m: d.material, sug: db.get(SUGP), dlg: env.dialogs }));
});
await scenario('Entfernen fremder Einträge', async ({ db, env, saveVia }) => {
  await saveVia("t.material = [];");
  const d = db.get(TP), sug = Object.values(db.get(SUGP) || {});
  ok('Entfernen: Liste bleibt, Vorschlag entsteht', d.material.length === 2 && sug.length === 1 && sug[0].changes && 'material' in sug[0].changes, JSON.stringify({ m: d.material, sug, dlg: env.dialogs }));
}, 'Anna');
await scenario('Löschen als Vorschlag', async ({ db, saveVia }) => {
  await saveVia("t.deletedAt = new Date().toISOString(); t.deletedBy = 'Anna';");
  const d = db.get(TP), sug = Object.values(db.get(SUGP) || {});
  ok('Löschen: Tour bleibt, Vorschlag «löschen»', !d.deletedAt && sug.length === 1 && sug[0].changes.deletedAt, JSON.stringify({ del: d.deletedAt, sug }));
}, 'Anna');
await scenario('Eigentümer übernimmt', async ({ page, db, env }) => {
  db.set(SUGP + '/s_test', { id: 's_test', by: 'Anna', at: '2026-10-13T08:00:00Z', changes: { name: 'Vorschlag Name', crux: 'Vorschlag Crux' }, before: { name: tour0.name, crux: tour0.crux }, status: 'offen' });
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(() => { state.myName = 'Dome'; });
  await page.evaluate(async id => { await fsSugDecide(id, 's_test', 'name', true); }, tour0.id);
  env.answer = true;
  await page.evaluate(async id => { await fsSugDecide(id, 's_test', 'crux', false); }, tour0.id);
  const d = db.get(TP), s = db.get(SUGP + '/s_test');
  ok('Übernehmen: Name übernommen, Crux abgelehnt', d.name === 'Vorschlag Name' && d.crux === tour0.crux, JSON.stringify({ n: d.name, c: d.crux }));
  ok('Übernehmen: Vorschlag erledigt', s && s.status === 'abgelehnt' && !s.changes, JSON.stringify(s));
});
await scenario('Vorschlag Liste', async ({ page, db, env }) => {
  const base = db.get(TP).material || [];
  // Anna schlug vor, das erste Material zu entfernen; seither hat jemand «Helm» ergänzt
  db.set(SUGP + '/s_list', { id: 's_list', by: 'Anna', at: '2026-10-13T08:00:00Z', changes: { material: base.slice(1) }, before: { material: base }, status: 'offen' });
  db.set(TP, { ...db.get(TP), material: [...base, 'Helm (neu)'] });
  await page.reload(); await page.waitForTimeout(3000);
  await page.evaluate(() => { state.myName = 'Dome'; });
  env.answer = true;
  await page.evaluate(async id => { await fsSugDecide(id, 's_list', 'material', true); }, tour0.id);
  const m = db.get(TP).material || [];
  ok('Vorschlag Liste: Entfernen übernommen, seither Ergänztes bleibt', !m.includes(base[0]) && m.includes('Helm (neu)') && m.length === base.length, JSON.stringify({ base, m }));
});
await scenario('Mitbearbeiter und offen', async ({ db, saveVia }) => {
  db.set(TP, { ...db.get(TP), editors: ['Beat'] });
  await saveVia("t.name = 'Von Beat';");
  ok('Mitbearbeiter ändert direkt', db.get(TP).name === 'Von Beat' && !db.get(SUGP), JSON.stringify(db.get(SUGP)));
}, 'Beat');
await scenario('Eigentümerfelder geschützt', async ({ db, saveVia }) => {
  await saveVia("t.open = true; t.editors = ['Anna'];");
  const d = db.get(TP);
  ok('Nur der Eigentümer stellt Rechte ein', d.open !== true && !(d.editors || []).length, JSON.stringify({ o: d.open, e: d.editors }));
}, 'Anna');

await scenario('Frühere Fassung zurückholen', async ({ page, db, env, saveVia }) => {
  const old = { ...db.get(TP), name: 'Alter Name', _versionAt: '2026-10-10T08:00:00Z' };
  db.set('versions/tours/' + tour0.id + '/2026-10-10T08-00-00-000Z', old);
  await saveVia("t.name = 'Neuer Name'; t.notes = 'Später ergänzt';");
  await page.evaluate(async id => { fsOpenVersions(id, 'tours/' + id, null); await new Promise(r => setTimeout(r, 800)); [...document.querySelectorAll('.fs-ver-row')].find(r => r.textContent.includes('Alter Name')).querySelector('[data-ver]').click(); await new Promise(r => setTimeout(r, 1500)); }, tour0.id);
  const d = db.get(TP);
  ok('Zurückholen: alter Name zurück, später Ergänztes bleibt (nichts geht verloren)', d.name === 'Alter Name' && d.notes === 'Später ergänzt', JSON.stringify({ n: d.name, no: d.notes, dlg: env.dialogs.map(x => x.slice(0, 60)) }));
});

await scenario('Konflikt andere übernehmen', async ({ db, env, saveVia }) => {
  db.set(TP, { ...db.get(TP), name: 'Name von B', updatedBy: 'B', updatedAt: '2026-10-11T00:00:00Z' });
  env.answer = false;
  await saveVia("t.name = 'Name von mir';");
  const vers = Object.values(db.get('versions/tours/' + tour0.id) || {});
  ok('Konflikt «andere übernehmen»: andere gilt, eigene Fassung liegt unter Versionen', db.get(TP).name === 'Name von B' && vers.some(x => x.name === 'Name von mir'), JSON.stringify({ n: db.get(TP).name, v: vers.map(x => x.name) }));
});
await scenario('Papierkorb wiederherstellen', async ({ page, db }) => {
  db.set(TP, { ...db.get(TP), deletedAt: '2026-10-01T00:00:00Z', deletedBy: 'Dome' });
  await page.reload(); await page.waitForTimeout(2500);
  await page.evaluate(id => { restoreTrashItem('tour', id); }, tour0.id);
  await page.waitForTimeout(1500);
  ok('Papierkorb: wiederhergestellt ist auch in der Datenbank nicht mehr gelöscht', !db.get(TP).deletedAt, JSON.stringify(db.get(TP).deletedAt));
});

await browser.close(); server.close();
const bad = results.filter(r => !r.ok);
if (!verbose) bad.forEach(r => console.log('FAIL ' + r.name + (r.info ? ' – ' + r.info : '')));
console.log((results.length - bad.length) + ' von ' + results.length + ' ok');
process.exit(bad.length ? 1 : 0);
