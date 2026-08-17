<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fixseil — Hochtouren gemeinsam planen</title>
<link rel="manifest" href="./manifest-fixseil.json">
<link rel="icon" href="./IMG-20260816-WA0023.jpg">
<link rel="apple-touch-icon" href="./IMG-20260816-WA0023.jpg">
<meta name="theme-color" content="#4A3524">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:#F1EAE0;
    --paper:#FFFFFF;
    --ink:#2B2019;
    --ink-soft:#6B5B4C;
    --ink-faint:#9C8C7B;
    --ice:#7C5B3E;
    --ice-deep:#4A3524;
    --ice-light:#E6DAC5;
    --signal:#D9A441;
    --signal-deep:#A87A1F;
    --line:#DED0B8;
    --danger:#B0392C;
    --ok:#3C7A52;
    --shadow: 0 2px 10px rgba(43,32,25,0.10);
    --shadow-lg: 0 12px 32px rgba(43,32,25,0.20);
    --radius: 3px;

    --d-L:#6C93AC;
    --d-WS:#4E7A93;
    --d-ZS:#C9A227;
    --d-S:#D97B3E;
    --d-SS:#C2452D;
    --d-AS:#8A2E2E;
    --d-EX:#2B1416;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    background:var(--cream);
    color:var(--ink);
    font-family:'Source Sans 3', system-ui, sans-serif;
    -webkit-font-smoothing:antialiased;
    min-height:100vh;
  }
  h1,h2,h3,.display{
    font-family:'Oswald', sans-serif;
    text-transform:uppercase;
    letter-spacing:0.03em;
    font-weight:600;
    margin:0;
  }
  .mono{font-family:'JetBrains Mono', monospace;}
  button{font-family:inherit; cursor:pointer;}
  a{color:var(--ice-deep);}

  /* ===== App-Umschalter ===== */
  .app-switch-bar{
    background:var(--ink); text-align:center; padding:7px 12px;
  }
  .app-switch-bar a{
    color:#fff; text-decoration:none; font-size:12.5px; font-weight:600;
    letter-spacing:0.03em; display:inline-flex; align-items:center; gap:6px;
  }
  .app-switch-bar a:hover{text-decoration:underline;}

  /* ===== Fels-Hero ===== */
  .hero{
    color:#fff;
    padding:28px 20px 34px 20px;
    position:relative;
    overflow:hidden;
  }
  .hero::before{
    content:'';
    position:absolute; inset:0;
    background-image: url('IMG_20260811_073051812_HDR.jpg');
    background-size: 115%;
    background-position: center 55%;
    filter: brightness(1.15) contrast(1.05);
    z-index:0;
  }
  .hero::after{
    content:'';
    position:absolute; inset:0;
    background:linear-gradient(180deg, rgba(74,53,36,0.62) 0%, rgba(124,91,62,0.40) 55%, rgba(159,131,101,0.24) 100%);
    z-index:0;
  }
  .hero-top, .hero .tabs{ position:relative; z-index:1; }
  .hero-top{
    display:flex; justify-content:space-between; align-items:flex-start;
    max-width:1000px; margin:0 auto; gap:16px; flex-wrap:wrap;
  }
  .brand{display:flex; align-items:baseline; gap:10px;}
  .brand h1{font-size:44px; color:#fff; letter-spacing:1px; font-weight:800;}
  .brand .tag{font-family:'Source Sans 3'; text-transform:none; letter-spacing:0; font-size:13px; color:var(--ice-light); font-style:italic;}
  .who{
    font-size:13px; color:var(--ice-light); text-align:right;
  }
  .who-row{display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end;}
  .who button{
    background:none; border:1px solid rgba(255,255,255,0.4); color:#fff;
    padding:3px 9px; border-radius:20px; font-size:12px; margin-left:6px;
  }
  .who button:hover{background:rgba(255,255,255,0.15);}

  /* ===== Wegweiser-Tabs ===== */
  .tabs{
    max-width:1000px; margin:0 auto; padding:0 20px;
    display:flex; gap:14px; transform:translateY(20px);
    position:relative; z-index:2;
  }
  .tab{
    background:var(--signal);
    color:var(--ink);
    font-family:'Oswald'; text-transform:uppercase; letter-spacing:0.04em; font-weight:600;
    font-size:14px;
    border:2px solid var(--ink);
    padding:10px 22px 10px 18px;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
    box-shadow: var(--shadow);
    opacity:0.72;
  }
  .tab.active{opacity:1; background:#fff;}
  .tab:hover{opacity:1;}

  main{max-width:1000px; margin:0 auto; padding:40px 20px 80px 20px;}

  /* ===== Toolbar ===== */
  .toolbar{
    display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:22px;
  }
  .search-input{
    flex:1; min-width:180px;
    padding:10px 14px; border:1px solid var(--line); border-radius:var(--radius);
    background:var(--paper); font-size:14px; color:var(--ink);
  }
  .search-input:focus{outline:2px solid var(--ice); outline-offset:1px;}
  .btn{
    padding:10px 18px; border-radius:var(--radius); border:1px solid var(--ice-deep);
    background:var(--ice-deep); color:#fff; font-weight:600; font-size:14px;
    white-space:nowrap;
  }
  .btn:hover{background:var(--ice);}
  .btn.secondary{background:#fff; color:var(--ink);}
  .btn.secondary:hover{background:var(--ice-light);}
  .btn:focus-visible, .tab:focus-visible, .chip:focus-visible, .card:focus-visible{outline:2px solid var(--ice-deep); outline-offset:2px;}

  .chips{display:flex; gap:7px; flex-wrap:wrap;}
  .chip{
    padding:5px 12px; border-radius:20px; border:1px solid var(--line);
    background:#fff; font-size:12.5px; font-weight:600; color:var(--ink-soft);
  }
  .chip.on{color:#fff; border-color:transparent;}

  /* ===== Karten ===== */
  .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:16px;}
  .card{
    background:var(--paper); border:1px solid var(--line); border-left:3px solid var(--ice-light); border-radius:var(--radius);
    padding:18px; box-shadow:var(--shadow); text-align:left; width:100%;
    display:flex; flex-direction:column; gap:10px; position:relative;
    transition:transform .12s ease, box-shadow .12s ease, border-left-color .12s ease;
  }
  .card:hover{transform:translateY(-2px); box-shadow:var(--shadow-lg); cursor:pointer; border-left-color:var(--ice);}
  .card-top{display:flex; justify-content:space-between; align-items:flex-start; gap:10px;}
  .card h3{font-size:17px; color:var(--ink); line-height:1.25;}
  .badge{
    flex-shrink:0; font-family:'JetBrains Mono'; font-weight:700; font-size:12px;
    color:#fff; padding:3px 8px; border-radius:2px; letter-spacing:0.02em;
  }
  .badge-row{display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0;}
  .badge.climb{background:var(--ice-deep);}
  .stat-row{display:flex; gap:16px; font-size:13px; color:var(--ink-soft); flex-wrap:wrap;}
  .stat-row .mono{color:var(--ink); font-weight:600;}
  .card p.excerpt{font-size:13.5px; color:var(--ink-soft); line-height:1.5; margin:0;}
  .hut-link-chip{
    align-self:flex-start; font-size:12px; background:var(--ice-light); color:var(--ice-deep);
    padding:3px 9px; border-radius:20px; font-weight:600;
  }
  .conditions-note{
    font-size:12.5px; background:#F6E9C9; border-left:3px solid var(--signal-deep);
    padding:6px 9px; color:#5B4200; border-radius:2px;
  }
  .meta-line{font-size:11.5px; color:var(--ink-faint); margin-top:auto;}

  .empty{
    text-align:center; padding:60px 20px; color:var(--ink-soft);
  }
  .empty h3{color:var(--ink); font-size:18px; margin-bottom:8px;}
  .empty .btn{margin-top:16px;}

  /* ===== Legende ===== */
  .legend{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;}
  .legend .chip{cursor:default; display:flex; align-items:center; gap:6px;}
  .dot{width:9px; height:9px; border-radius:50%; display:inline-block; margin-right:5px;}

  /* ===== Modal ===== */
  .overlay{
    position:fixed; inset:0; background:rgba(30,22,16,0.55); z-index:50;
    display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto;
  }
  .modal{
    background:var(--paper); width:100%; max-width:620px; border-radius:var(--radius);
    box-shadow:var(--shadow-lg); padding:28px; margin:auto;
  }
  .modal-head{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; gap:12px;}
  .modal-head h2{font-size:22px;}
  .x-btn{background:none; border:none; font-size:22px; color:var(--ink-soft); line-height:1; padding:2px 6px;}
  .x-btn:hover{color:var(--ink);}

  .field{margin-bottom:14px;}
  .field label{display:block; font-size:12.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.03em; color:var(--ink-soft); margin-bottom:5px;}
  .field input, .field select, .field textarea{
    width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:var(--radius);
    font-family:inherit; font-size:14px; color:var(--ink); background:#fff;
  }
  .field textarea{resize:vertical; min-height:56px;}
  .field input:focus, .field select:focus, .field textarea:focus{outline:2px solid var(--ice); outline-offset:1px;}
  .field .hint{font-size:11.5px; color:var(--ink-faint); margin-top:4px;}
  .row2{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
  .form-actions{display:flex; justify-content:flex-end; gap:10px; margin-top:20px;}

  /* ===== Detailansicht ===== */
  .detail-badge-row{display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;}
  .detail-section{margin-top:18px;}
  .detail-section h4{
    font-family:'Oswald'; text-transform:uppercase; font-size:13px; letter-spacing:0.05em;
    color:var(--ice-deep); border-bottom:1px solid var(--line); padding-bottom:5px; margin-bottom:8px;
  }
  .detail-section p{font-size:14px; line-height:1.6; color:var(--ink); white-space:pre-wrap; margin:0;}
  .detail-stats{display:flex; gap:22px; flex-wrap:wrap; margin:14px 0;}
  .detail-stat .num{font-family:'JetBrains Mono'; font-size:20px; font-weight:700; color:var(--ink);}
  .detail-stat .lbl{font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-faint);}
  .detail-actions{display:flex; gap:10px; margin-top:22px; flex-wrap:wrap;}
  .btn.danger{background:#fff; color:var(--danger); border-color:var(--danger);}
  .btn.danger:hover{background:#FBEAE7;}

  .cond-box{background:var(--ice-light); border-radius:var(--radius); padding:12px; margin-top:14px;}
  .cond-box textarea{width:100%; border:1px solid var(--line); border-radius:var(--radius); padding:8px; font-family:inherit; font-size:13.5px; min-height:44px;}
  .cond-box .meta-line{margin-top:6px;}

  .loading{text-align:center; padding:60px; color:var(--ink-soft); font-family:'Oswald'; letter-spacing:0.05em; text-transform:uppercase; font-size:13px;}

  .form-error{
    background:#FBEAE7; border:1px solid var(--danger); color:#7A2A1F;
    padding:10px 12px; border-radius:var(--radius); font-size:13px; margin-bottom:14px;
  }
  .toast{
    position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
    background:var(--ice-deep); color:#fff; padding:11px 20px; border-radius:20px;
    font-size:13.5px; box-shadow:var(--shadow-lg); z-index:100; max-width:90%; text-align:center;
  }
  .toast.error{background:var(--danger);}
  .btn[disabled]{opacity:0.6; cursor:default;}

  .backup-banner{
    background:#B0392C; color:#fff; padding:12px 20px; text-align:center;
    font-size:13.5px; display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
    position:sticky; top:0; z-index:80;
  }
  .backup-banner button{
    background:#fff; color:#B0392C; border:none; border-radius:20px; padding:6px 16px;
    font-weight:700; font-size:13px;
  }

  .debug-toggle{
    position:fixed; bottom:16px; right:16px; z-index:90;
    background:var(--ink); color:#fff; border:none; border-radius:20px;
    padding:8px 14px; font-size:12px; font-family:'JetBrains Mono'; opacity:0.55;
    box-shadow:var(--shadow);
  }
  .debug-panel{
    position:fixed; bottom:60px; right:16px; left:16px; max-width:520px; margin:0 auto;
    max-height:50vh; overflow-y:auto; background:#1C1510; color:#E9DFCF;
    border-radius:var(--radius); padding:12px; font-family:'JetBrains Mono'; font-size:11.5px;
    z-index:91; box-shadow:var(--shadow-lg); line-height:1.5;
  }
  .debug-panel .row{border-bottom:1px solid #3A2E22; padding:4px 0;}
  .debug-panel .row.err{color:#FF8A75;}
  .debug-panel .row.ok{color:#8FD9A8;}
  .debug-panel .head{display:flex; justify-content:space-between; margin-bottom:6px;}
  .debug-panel .head button{background:none; border:1px solid #554435; color:#E9DFCF; border-radius:4px; padding:2px 8px; font-size:11px;}

  @media (max-width:520px){
    .row2{grid-template-columns:1fr;}
    .brand h1{font-size:32px;}
    .hero{padding-bottom:30px;}
    .tabs{transform:translateY(16px);}
    .tab{padding:8px 16px 8px 14px; font-size:12.5px;}
  }
</style>
</head>
<body>
<div class="app-switch-bar"><a href="./index.html">🎿 Zu Firnspur wechseln</a></div>
<div id="app"></div>
<button class="debug-toggle" id="debug-toggle-btn" onclick="toggleDebugPanel()">Diagnose v1</button>
<div id="debug-panel-root"></div>

<script>
/* ================= Debug log (in-app, browser-independent) ================= */
const APP_VERSION = 'v1-fixseil-firebase';
let debugLog = [];
let debugPanelOpen = false;
function dlog(message, kind){
  const entry = {t: new Date().toLocaleTimeString('de-CH'), message, kind: kind||'info'};
  debugLog.push(entry);
  if(debugLog.length > 60) debugLog.shift();
  if(kind==='err') console.error(message); else console.log(message);
  if(debugPanelOpen) renderDebugPanel();
}
function toggleDebugPanel(){
  debugPanelOpen = !debugPanelOpen;
  renderDebugPanel();
}
function renderDebugPanel(){
  const root = document.getElementById('debug-panel-root');
  if(!debugPanelOpen){ root.innerHTML = ''; return; }
  const rows = debugLog.slice().reverse().map(e=>
    `<div class="row ${e.kind==='err'?'err':(e.kind==='ok'?'ok':'')}">[${e.t}] ${esc(e.message)}</div>`
  ).join('') || '<div class="row">Noch keine Einträge.</div>';
  root.innerHTML = `<div class="debug-panel">
    <div class="head"><strong>Diagnose-Log</strong><button onclick="debugLog=[];renderDebugPanel();">leeren</button></div>
    ${rows}
  </div>`;
}

/* =================================================================
   Speicherung: Diese Version läuft als eigenständige Webseite (nicht
   im Claude-Artefakt), daher funktioniert echter Netzwerkzugriff zu
   Firebase. Alle Touren/Hütten werden live in Firebase Realtime
   Database gespeichert und zwischen allen Nutzern synchronisiert.
   Fixseil nutzt einen eigenen, vollständig getrennten Datenpfad
   (fixseil/tours, fixseil/huts), sodass die Daten in keiner Weise
   mit Firnspur vermischt werden. Als Sicherheitsnetz bei fehlender
   Internetverbindung bleibt der Export/Import weiterhin verfügbar.
   ================================================================= */
const FIREBASE_URL = 'https://firnspur-default-rtdb.europe-west1.firebasedatabase.app';
const TOURS_PATH = 'fixseil/tours';
const HUTS_PATH = 'fixseil/huts';

async function fbGet(path){
  try{
    const res = await fetch(FIREBASE_URL + '/' + path + '.json');
    if(!res.ok){ dlog('Firebase GET fehlgeschlagen ('+res.status+'): '+path, 'err'); return null; }
    const data = await res.json();
    return data;
  }catch(e){
    dlog('Firebase GET Fehler für "'+path+'": '+(e && e.message ? e.message : e), 'err');
    return null;
  }
}
async function fbSet(path, value){
  try{
    const res = await fetch(FIREBASE_URL + '/' + path + '.json', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(value)
    });
    if(!res.ok){ dlog('Firebase PUT fehlgeschlagen ('+res.status+'): '+path, 'err'); return false; }
    return true;
  }catch(e){
    dlog('Firebase PUT Fehler für "'+path+'": '+(e && e.message ? e.message : e), 'err');
    return false;
  }
}
async function fbDelete(path){
  try{
    const res = await fetch(FIREBASE_URL + '/' + path + '.json', {method:'DELETE'});
    if(!res.ok){ dlog('Firebase DELETE fehlgeschlagen ('+res.status+'): '+path, 'err'); return false; }
    return true;
  }catch(e){
    dlog('Firebase DELETE Fehler für "'+path+'": '+(e && e.message ? e.message : e), 'err');
    return false;
  }
}

/* ================= Fachliche Daten ================= */
const DIFF = {
  'L':   {label:'Leicht',  color:'var(--d-L)',  desc:'Einfaches Gehgelände, Gletscher ohne grössere Spalten, kein Kletterbedarf.'},
  'WS-': {label:'Wenig schwierig −', color:'var(--d-WS)', desc:'Leichte Kletterstellen (I), einfache Firn- und Gletscherpassagen.'},
  'WS':  {label:'Wenig schwierig', color:'var(--d-WS)', desc:'Kletterstellen bis II, mässig steile Firn- und Eishänge.'},
  'WS+': {label:'Wenig schwierig +', color:'var(--d-WS)', desc:'Kletterstellen bis II+, anspruchsvollere Gletscherpassagen, kurze Grate.'},
  'ZS-': {label:'Ziemlich schwierig −', color:'var(--d-ZS)', desc:'Kletterstellen bis III−, steile Firn-/Eishänge, ausgesetzte Gratstücke.'},
  'ZS':  {label:'Ziemlich schwierig', color:'var(--d-ZS)', desc:'Kletterstellen bis III, längere ausgesetzte Passagen, gute Orientierung nötig.'},
  'ZS+': {label:'Ziemlich schwierig +', color:'var(--d-ZS)', desc:'Kletterstellen bis III+, anhaltend steiles, kombiniertes Gelände.'},
  'S-':  {label:'Schwierig −', color:'var(--d-S)', desc:'Kletterstellen bis IV−, steile Eis-/Firnflanken über 45°.'},
  'S':   {label:'Schwierig', color:'var(--d-S)', desc:'Kletterstellen bis IV, anhaltend schwierige Kletterei kombiniert mit Eis.'},
  'S+':  {label:'Schwierig +', color:'var(--d-S)', desc:'Kletterstellen bis IV+, hohe konditionelle und technische Anforderungen.'},
  'SS':  {label:'Sehr schwierig', color:'var(--d-SS)', desc:'Kletterstellen bis V, äusserst anspruchsvolle, lange und ausgesetzte Touren.'}
};
const DIFF_ORDER = ['L','WS-','WS','WS+','ZS-','ZS','ZS+','S-','S','S+','SS'];

const CLIMB_ORDER = ['1','2a-','2a','2a+','2b-','2b','2b+','2c-','2c','2c+',
  '3a-','3a','3a+','3b-','3b','3b+','3c-','3c','3c+',
  '4a-','4a','4a+','4b-','4b','4b+','4c-','4c','4c+',
  '5a-','5a','5a+','5b-','5b','5b+','5c-','5c','5c+',
  '6a-','6a','6a+','6b-','6b','6b+','6c-','6c','6c+','7a'];

/* ================= State ================= */
let state = {
  view: 'touren',
  loading: true,
  tours: [],
  huts: [],
  myName: null,
  search: '',
  activeDiffFilters: new Set(),
  hasUnsavedChanges: false,
  modal: null
};

function markUnsaved(){ state.hasUnsavedChanges = true; }
function markSaved(){ state.hasUnsavedChanges = false; }

function showToast(message, isError){
  const old = document.querySelector('.toast');
  if(old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, isError ? 5000 : 2500);
}

function uid(prefix){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
function esc(s){
  if(s===undefined||s===null) return '';
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', {day:'2-digit', month:'2-digit', year:'numeric'}) + ' ' + d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
}
function fmtDateOnly(isoDate){
  if(!isoDate) return '';
  const d = new Date(isoDate+'T00:00:00');
  return d.toLocaleDateString('de-CH', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function latestCompletion(arr){
  if(!arr || !arr.length) return null;
  return arr.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''))[0];
}

/* ================= Data loading ================= */
async function loadAll(){
  state.loading = true; render();
  const [toursObj, hutsObj] = await Promise.all([ fbGet(TOURS_PATH), fbGet(HUTS_PATH) ]);
  const tours = toursObj ? Object.values(toursObj) : [];
  const huts = hutsObj ? Object.values(hutsObj) : [];
  tours.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  huts.sort((a,b)=> a.name.localeCompare(b.name, 'de'));

  const unsyncedTours = state.tours.filter(x=>x._unsynced && !tours.find(y=>y.id===x.id));
  const unsyncedHuts = state.huts.filter(x=>x._unsynced && !huts.find(y=>y.id===x.id));

  state.tours = [...unsyncedTours, ...tours];
  state.huts = [...unsyncedHuts, ...huts];
  state.loading = false;
  if(!toursObj && !hutsObj){
    showToast('Konnte nicht mit der Datenbank verbinden. Prüfe deine Internetverbindung.', true);
  }
  render();
}

async function saveTourCloud(tour){ return await fbSet(TOURS_PATH+'/'+tour.id, tour); }
async function saveHutCloud(hut){ return await fbSet(HUTS_PATH+'/'+hut.id, hut); }

function removeTour(id){
  state.tours = state.tours.filter(x=>x.id!==id);
  fbDelete(TOURS_PATH+'/'+id).catch(()=>{});
}
function removeHut(id){
  state.huts = state.huts.filter(x=>x.id!==id);
  fbDelete(HUTS_PATH+'/'+id).catch(()=>{});
}

/* ================= Name handling ================= */
function ensureName(after){
  if(state.myName){ after(); return; }
  state.modal = {type:'name', after};
  render();
}
async function submitName(nameVal){
  const n = (nameVal||'').trim();
  if(!n) return;
  state.myName = n;
  const after = state.modal && state.modal.after;
  state.modal = null;
  render();
  if(after) after();
}

/* ================= Actions ================= */
function openAddTour(){ dlog('Klick auf "+ Neue Tour"'); ensureName(()=>{ state.modal = {type:'edit-tour', payload:null}; render(); }); }
function openEditTour(id){ ensureName(()=>{ const t = state.tours.find(x=>x.id===id); state.modal = {type:'edit-tour', payload:t}; render(); }); }
function openTourDetail(id){ state.modal = {type:'tour-detail', payload:id}; render(); }
function openAddHut(){ ensureName(()=>{ state.modal = {type:'edit-hut', payload:null}; render(); }); }
function openEditHut(id){ ensureName(()=>{ const h = state.huts.find(x=>x.id===id); state.modal = {type:'edit-hut', payload:h}; render(); }); }
function openHutDetail(id){ state.modal = {type:'hut-detail', payload:id}; render(); }
function closeModal(){ state.modal = null; render(); }
function openExport(){ state.modal = {type:'export'}; render(); }
function openImport(){ ensureName(()=>{ state.modal = {type:'import'}; render(); }); }

function mergeImportedData(json){
  let data;
  try{ data = JSON.parse(json); }
  catch(e){ throw new Error('Das eingefügte Format ist kein gültiges JSON.'); }
  const importedTours = Array.isArray(data.tours) ? data.tours : [];
  const importedHuts = Array.isArray(data.huts) ? data.huts : [];
  let addedTours = 0, updatedTours = 0, addedHuts = 0, updatedHuts = 0;
  importedTours.forEach(t=>{
    if(!t || !t.id || !t.name) return;
    const idx = state.tours.findIndex(x=>x.id===t.id);
    if(idx>=0){ state.tours[idx] = t; updatedTours++; }
    else { state.tours.unshift(t); addedTours++; }
  });
  importedHuts.forEach(h=>{
    if(!h || !h.id || !h.name) return;
    const idx = state.huts.findIndex(x=>x.id===h.id);
    if(idx>=0){ state.huts[idx] = h; updatedHuts++; }
    else { state.huts.push(h); addedHuts++; }
  });
  importedTours.forEach(t=> saveTourCloud(t).catch(()=>markUnsaved()));
  importedHuts.forEach(h=> saveHutCloud(h).catch(()=>markUnsaved()));
  return {addedTours, updatedTours, addedHuts, updatedHuts};
}

async function submitTourForm(form, existing){
  const t = existing ? {...existing} : {id: uid('t'), createdBy: state.myName, createdAt: new Date().toISOString(), conditions:null};
  t.name = form.name.trim();
  t.difficulty = form.difficulty;
  t.climbGrade = form.climbGrade || '';
  t.elevationGain = form.elevationGain;
  t.elevationLoss = form.elevationLoss;
  t.duration = form.duration;
  t.region = form.region;
  t.hutId = form.hutId || '';
  t.requirements = form.requirements;
  t.special = form.special;
  t.approach = form.approach;
  t.ascent = form.ascent;
  t.descent = form.descent;
  t.updatedAt = new Date().toISOString();
  t.updatedBy = state.myName;

  const idx = state.tours.findIndex(x=>x.id===t.id);
  if(idx>=0) state.tours[idx] = t; else state.tours.unshift(t);
  closeModal();
  state.modal = {type:'tour-detail', payload:t.id};
  render();

  const ok = await saveTourCloud(t).catch(()=>false);
  t._unsynced = !ok;
  if(!ok){
    markUnsaved();
    showToast('Tour ist lokal gespeichert, konnte aber nicht synchronisiert werden. Prüfe deine Internetverbindung.', true);
  }else{
    showToast('Tour gespeichert und synchronisiert.');
  }
  render();
}

async function submitHutForm(form, existing){
  const h = existing ? {...existing} : {id: uid('h'), createdBy: state.myName, createdAt: new Date().toISOString()};
  h.name = form.name.trim();
  h.region = form.region;
  h.altitude = form.altitude;
  h.capacity = form.capacity;
  h.openingPeriod = form.openingPeriod;
  h.staffedPeriod = form.staffedPeriod;
  h.winterraum = form.winterraum;
  h.approach = form.approach;
  h.accessElevation = form.accessElevation;
  h.accessDuration = form.accessDuration;
  h.accessDifficulty = form.accessDifficulty;
  h.access = form.access;
  h.contact = form.contact;
  h.notes = form.notes;
  h.updatedAt = new Date().toISOString();
  h.updatedBy = state.myName;

  const idx = state.huts.findIndex(x=>x.id===h.id);
  if(idx>=0) state.huts[idx] = h; else state.huts.push(h);
  closeModal();
  state.modal = {type:'hut-detail', payload:h.id};
  render();

  const ok = await saveHutCloud(h).catch(()=>false);
  h._unsynced = !ok;
  if(!ok){
    markUnsaved();
    showToast('Hütte ist lokal gespeichert, konnte aber nicht synchronisiert werden. Prüfe deine Internetverbindung.', true);
  }else{
    showToast('Hütte gespeichert und synchronisiert.');
  }
  render();
}

function setFormBusy(formId, busy){
  const form = document.getElementById(formId);
  if(!form) return;
  const btnId = formId==='tour-form' ? 'tour-save-btn' : 'hut-save-btn';
  const btn = document.getElementById(btnId);
  if(btn){
    btn.disabled = busy;
    if(busy){ btn.dataset.origText = btn.textContent; btn.textContent = 'Speichert…'; }
    else if(btn.dataset.origText){ btn.textContent = btn.dataset.origText; }
  }
}

function showFormError(formId, message){
  const form = document.getElementById(formId);
  if(!form) return;
  let box = form.querySelector('.form-error');
  if(!box){
    box = document.createElement('div');
    box.className = 'form-error';
    const actions = form.querySelector('.form-actions');
    if(actions) form.insertBefore(box, actions);
    else form.appendChild(box);
  }
  box.textContent = message;
  box.scrollIntoView({behavior:'smooth', block:'center'});
}

async function submitConditions(tourId, text){
  const t = state.tours.find(x=>x.id===tourId);
  if(!t) return;
  t.conditions = {text: text.trim(), updatedBy: state.myName, updatedAt: new Date().toISOString()};
  state.modal = {type:'tour-detail', payload:tourId};
  render();
  const ok = await saveTourCloud(t).catch(()=>false);
  t._unsynced = !ok;
  if(!ok){
    markUnsaved();
    showToast('Bedingungen lokal gespeichert, aber nicht synchronisiert.', true);
  }else{
    showToast('Bedingungen aktualisiert und synchronisiert.');
  }
  render();
}

function toggleDiffFilter(code){
  if(state.activeDiffFilters.has(code)) state.activeDiffFilters.delete(code);
  else state.activeDiffFilters.add(code);
  render();
}
function setSearch(v){ state.search = v; render(); }
function setView(v){ state.view = v; state.modal = null; render(); }

/* ================= Render: shell ================= */
function render(){
  const app = document.getElementById('app');
  app.innerHTML = shellHtml();
  wireGlobalHandlers();
  if(state.modal) renderModal();
}

function shellHtml(){
  return `
  ${state.hasUnsavedChanges ? `
  <div class="backup-banner">
    ⚠ Änderungen konnten nicht mit der Cloud synchronisiert werden (Internetverbindung prüfen) — exportiere zur Sicherheit eine Datei.
    <button data-act="export-data">Jetzt exportieren</button>
  </div>` : ''}
  <div class="hero">
    <div class="hero-top">
      <div class="brand">
        <h1>Fixseil</h1>
      </div>
      <div class="who">
        <div class="who-row">
          ${state.myName ? `<span>Angemeldet als <strong>${esc(state.myName)}</strong></span><button data-act="change-name">ändern</button>` : `<button data-act="change-name">Namen setzen</button>`}
          <button data-act="export-data">Exportieren</button>
          <button data-act="import-data">Importieren</button>
        </div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${state.view==='touren'?'active':''}" data-act="view-touren">Touren</button>
      <button class="tab ${state.view==='huetten'?'active':''}" data-act="view-huetten">Hütten</button>
      <button class="tab ${state.view==='abgeschlossen'?'active':''}" data-act="view-abgeschlossen">✓ Done</button>
    </div>
  </div>
  <main>
    ${state.loading ? `<div class="loading">Lade Touren &amp; Hütten…</div>` : (state.view==='touren' ? tourenViewHtml() : state.view==='huetten' ? huettenViewHtml() : abgeschlossenViewHtml())}
  </main>
  <div id="modal-root"></div>
  `;
}

/* ================= Touren view ================= */
function filteredTours(){
  let list = state.tours;
  if(state.activeDiffFilters.size){
    list = list.filter(t=>state.activeDiffFilters.has(t.difficulty));
  }
  if(state.search.trim()){
    const q = state.search.trim().toLowerCase();
    list = list.filter(t=> (t.name||'').toLowerCase().includes(q) || (t.region||'').toLowerCase().includes(q));
  }
  return list;
}

function tourenViewHtml(){
  const list = filteredTours();
  return `
    <div class="toolbar">
      <input class="search-input" type="text" placeholder="Tour oder Region suchen…" value="${esc(state.search)}" data-act="search"/>
      <button class="btn" data-act="add-tour">+ Neue Tour</button>
    </div>
    <div class="chips" style="margin-bottom:18px;">
      ${DIFF_ORDER.map(c=>`<button class="chip ${state.activeDiffFilters.has(c)?'on':''}" style="${state.activeDiffFilters.has(c)?`background:${DIFF[c].color}`:''}" title="${esc(DIFF[c].desc)}" data-act="filter-diff" data-code="${c}"><span class="dot" style="background:${state.activeDiffFilters.has(c)?'#fff':DIFF[c].color}"></span>${c}</button>`).join('')}
    </div>
    ${list.length ? `<div class="grid">${list.map(tourCardHtml).join('')}</div>` : emptyTouren()}
  `;
}

function emptyTouren(){
  const hasAny = state.tours.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Keine Tour passt zu diesem Filter' : 'Noch keine Tour erfasst'}</h3>
    <p>${hasAny ? 'Filter anpassen oder eine neue Tour hinzufügen.' : 'Trag die erste Hochtour ein — Name, Schwierigkeit, Höhenmeter und ein paar Zeilen zu Zustieg, Auf- und Abstieg reichen.'}</p>
    <button class="btn" data-act="add-tour">+ Neue Tour</button>
  </div>`;
}

function tourCardHtml(t){
  const d = DIFF[t.difficulty] || DIFF.L;
  const hut = t.hutId ? state.huts.find(h=>h.id===t.hutId) : null;
  const done = (t.completions && t.completions.length) || t.completed;
  const last = latestCompletion(t.completions);
  return `
  <div class="card" data-act="open-tour" data-id="${t.id}" tabindex="0" role="button">
    <div class="card-top">
      <h3>${done ? '✓ ' : ''}${esc(t.name)}</h3>
      <div class="badge-row">
        <span class="badge" style="background:${d.color}">${t.difficulty}</span>
        ${t.climbGrade ? `<span class="badge climb">🧗 ${esc(t.climbGrade)}</span>` : ''}
      </div>
    </div>
    <div class="stat-row">
      <span>↑ <span class="mono">${esc(t.elevationGain||'–')}</span> Hm</span>
      ${t.elevationLoss ? `<span>↓ <span class="mono">${esc(t.elevationLoss)}</span> Hm</span>` : ''}
      ${t.duration ? `<span>⏱ <span class="mono">${esc(t.duration)}</span></span>` : ''}
    </div>
    ${t.region ? `<p class="excerpt">${esc(t.region)}</p>` : ''}
    ${hut ? `<span class="hut-link-chip">🛖 ${esc(hut.name)}</span>` : ''}
    ${last ? `<span class="hut-link-chip" style="background:#E3EFE6; color:#2F6B44;">✓ ${esc(last.by)} · ${esc(fmtDateOnly(last.date))}${t.completions.length>1 ? ` (+${t.completions.length-1})` : ''}</span>` : ''}
    ${t.conditions && t.conditions.text ? `<div class="conditions-note">❄ ${esc(t.conditions.text)}</div>` : ''}
    ${t._unsynced ? `<span class="hut-link-chip" style="background:#FBEAE7; color:#B0392C;">⚠ nicht synchronisiert</span>` : ''}
    <div class="meta-line">von ${esc(t.createdBy||'?')} · ${fmtDate(t.createdAt)}</div>
  </div>`;
}

/* ================= Hütten view ================= */
function filteredHuts(){
  let list = state.huts;
  if(state.search.trim()){
    const q = state.search.trim().toLowerCase();
    list = list.filter(h=> (h.name||'').toLowerCase().includes(q) || (h.region||'').toLowerCase().includes(q));
  }
  return list;
}

function huettenViewHtml(){
  const list = filteredHuts();
  return `
    <div class="toolbar">
      <input class="search-input" type="text" placeholder="Hütte oder Region suchen…" value="${esc(state.search)}" data-act="search"/>
      <button class="btn" data-act="add-hut">+ Neue Hütte</button>
    </div>
    ${list.length ? `<div class="grid">${list.map(hutCardHtml).join('')}</div>` : emptyHuts()}
  `;
}

function emptyHuts(){
  const hasAny = state.huts.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Keine Hütte passt zu diesem Filter' : 'Noch keine Hütte erfasst'}</h3>
    <p>${hasAny ? 'Suche anpassen oder eine neue Hütte hinzufügen.' : 'Trag eine Hütte ein — Zustieg, Öffnungszeitraum und ob und wann sie bewartet ist.'}</p>
    <button class="btn" data-act="add-hut">+ Neue Hütte</button>
  </div>`;
}

function hutCardHtml(h){
  const linkedCount = state.tours.filter(t=>t.hutId===h.id).length;
  const ad = h.accessDifficulty ? (DIFF[h.accessDifficulty] || DIFF.L) : null;
  const done = (h.completions && h.completions.length) || h.completed;
  const last = latestCompletion(h.completions);
  return `
  <div class="card" data-act="open-hut" data-id="${h.id}" tabindex="0" role="button">
    <div class="card-top">
      <h3>🛖 ${done ? '✓ ' : ''}${esc(h.name)}</h3>
      ${h.altitude ? `<span class="badge" style="background:var(--ice-deep)">${esc(h.altitude)} m</span>` : ''}
    </div>
    ${h.region ? `<p class="excerpt">${esc(h.region)}</p>` : ''}
    ${(h.accessElevation || h.accessDuration || ad) ? `<div class="stat-row">
      ${h.accessElevation ? `<span>↑ <span class="mono">${esc(h.accessElevation)}</span> Hm Zustieg</span>` : ''}
      ${h.accessDuration ? `<span>⏱ <span class="mono">${esc(h.accessDuration)}</span></span>` : ''}
      ${ad ? `<span class="badge" style="background:${ad.color}">${h.accessDifficulty}</span>` : ''}
    </div>` : ''}
    <div class="stat-row">
      ${h.openingPeriod ? `<span>📅 ${esc(h.openingPeriod)}</span>` : ''}
    </div>
    ${h.staffedPeriod ? `<div class="stat-row"><span>👤 bewartet: ${esc(h.staffedPeriod)}</span></div>` : `<div class="stat-row"><span>👤 unbewartet</span></div>`}
    <span class="hut-link-chip">${linkedCount} Tour${linkedCount===1?'':'en'} ab hier</span>
    ${last ? `<span class="hut-link-chip" style="background:#E3EFE6; color:#2F6B44;">✓ ${esc(last.by)} · ${esc(fmtDateOnly(last.date))}${h.completions.length>1 ? ` (+${h.completions.length-1})` : ''}</span>` : ''}
    ${h._unsynced ? `<span class="hut-link-chip" style="background:#FBEAE7; color:#B0392C;">⚠ nicht synchronisiert</span>` : ''}
    <div class="meta-line">von ${esc(h.createdBy||'?')} · ${fmtDate(h.createdAt)}</div>
  </div>`;
}

/* ================= Modal rendering ================= */
function renderModal(){
  const root = document.getElementById('modal-root');
  const m = state.modal;
  let inner = '';
  if(m.type==='name') inner = nameModalHtml();
  else if(m.type==='edit-tour') inner = tourFormHtml(m.payload);
  else if(m.type==='tour-detail') inner = tourDetailHtml(m.payload);
  else if(m.type==='edit-hut') inner = hutFormHtml(m.payload);
  else if(m.type==='hut-detail') inner = hutDetailHtml(m.payload);
  else if(m.type==='export') inner = exportModalHtml();
  else if(m.type==='import') inner = importModalHtml();
  else if(m.type==='add-completion') inner = completionModalHtml(m.payload);
  root.innerHTML = `<div class="overlay" data-act="overlay-close">${inner}</div>`;
  wireModalHandlers();
}

function exportModalHtml(){
  const data = {tours: state.tours, huts: state.huts};
  const json = JSON.stringify(data, null, 2);
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Exportieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Lade eine Datei herunter und teile sie mit deinen Freunden (z. B. per WhatsApp/E-Mail) — oder kopiere den Text. Sie importieren die Datei/den Text, um eure Sammlungen zusammenzuführen.</p>
    <div class="form-actions" style="margin-bottom:12px;">
      <button class="btn" data-act="download-export">📥 Als Datei herunterladen</button>
      <button class="btn secondary" data-act="copy-export">In Zwischenablage kopieren</button>
    </div>
    <textarea readonly style="width:100%; min-height:180px; font-family:'JetBrains Mono'; font-size:11.5px;" id="export-text">${esc(json)}</textarea>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Schliessen</button>
    </div>
  </div>`;
}

function importModalHtml(){
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Importieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Wähle eine Datei, die dir jemand geschickt hat, oder füge den Text ein. Bestehende Einträge mit gleicher ID werden aktualisiert, neue werden hinzugefügt.</p>
    <div class="field">
      <label>Datei wählen</label>
      <input type="file" id="import-file" accept="application/json,.json,.txt"/>
    </div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:10px 0 6px 0;">— oder Text einfügen —</p>
    <textarea placeholder="{ &quot;tours&quot;: [...], &quot;huts&quot;: [...] }" style="width:100%; min-height:160px; font-family:'JetBrains Mono'; font-size:11.5px;" id="import-text"></textarea>
    <div class="form-error" id="import-error" style="display:none;"></div>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Abbrechen</button>
      <button class="btn" data-act="do-import">Importieren</button>
    </div>
  </div>`;
}

function completionModalHtml(payload){
  const today = new Date().toISOString().slice(0,10);
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Als erledigt markieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 14px 0;">Trag ein, wer die Tour/Hütte wann erledigt hat. Das lässt sich beliebig oft wiederholen, z. B. wenn mehrere Leute sie machen.</p>
    <div class="field"><label>Name</label><input type="text" id="completion-name" value="${esc(state.myName||'')}" placeholder="z. B. Simone" autofocus/></div>
    <div class="field"><label>Datum</label><input type="date" id="completion-date" value="${today}"/></div>
    <div class="form-error" id="completion-error" style="display:none;"></div>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Abbrechen</button>
      <button class="btn" data-act="submit-completion" data-kind="${payload.kind}" data-id="${payload.id}">Eintragen</button>
    </div>
  </div>`;
}

function nameModalHtml(){
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Wie heisst du?</h2></div>
    <p style="font-size:14px; color:var(--ink-soft); margin:0 0 14px 0;">Dein Name wird bei Touren und Hütten angezeigt, die du hinzufügst oder bearbeitest. Er wird nur auf diesem Gerät gespeichert.</p>
    <div class="field"><label>Name</label><input type="text" id="name-input" placeholder="z. B. Simone" autofocus/></div>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Abbrechen</button>
      <button class="btn" data-act="submit-name">Weiter</button>
    </div>
  </div>`;
}

function tourFormHtml(existing){
  const t = existing || {};
  const hutOptions = state.huts.map(h=>`<option value="${h.id}" ${t.hutId===h.id?'selected':''}>${esc(h.name)}</option>`).join('');
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${existing?'Tour bearbeiten':'Neue Hochtour'}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <form id="tour-form" novalidate>
      <div class="field"><label>Name der Tour *</label><input required name="name" value="${esc(t.name||'')}" placeholder="z. B. Dom von der Domhütte"/></div>
      <div class="row2">
        <div class="field"><label>Schwierigkeit (SAC)</label>
          <select name="difficulty">${DIFF_ORDER.map(c=>`<option value="${c}" ${(t.difficulty||'WS')===c?'selected':''}>${c} — ${DIFF[c].label}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Kletterschwierigkeit (franz.)</label>
          <select name="climbGrade">
            <option value="" ${!t.climbGrade?'selected':''}>— keine —</option>
            ${CLIMB_ORDER.map(c=>`<option value="${c}" ${t.climbGrade===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <div class="hint">Höchste Felsschwierigkeit auf der Route, falls vorhanden.</div>
        </div>
      </div>
      <div class="field"><label>Region</label><input name="region" value="${esc(t.region||'')}" placeholder="z. B. Walliser Alpen"/></div>
      <div class="row2">
        <div class="field"><label>Aufstieg (Hm)</label><input name="elevationGain" value="${esc(t.elevationGain||'')}" placeholder="z. B. 1200"/></div>
        <div class="field"><label>Abstieg (Hm, falls abweichend)</label><input name="elevationLoss" value="${esc(t.elevationLoss||'')}" placeholder="z. B. 1600"/></div>
      </div>
      <div class="field"><label>Zeitbedarf</label><input name="duration" value="${esc(t.duration||'')}" placeholder="z. B. 6–8 Std."/></div>
      <div class="field"><label>Anforderungen</label><textarea name="requirements" placeholder="Kondition, Seiltechnik, Steigeisen, Pickel, Klettergurt …">${esc(t.requirements||'')}</textarea></div>
      <div class="field"><label>Spezielles</label><textarea name="special" placeholder="Spaltenrisiko, Steinschlag, beste Jahreszeit …">${esc(t.special||'')}</textarea></div>
      <div class="field"><label>Anfahrt</label><textarea name="approach" placeholder="Ausgangspunkt, Parkplatz, ÖV …">${esc(t.approach||'')}</textarea></div>
      <div class="field"><label>Aufstieg</label><textarea name="ascent" placeholder="Route, Orientierungspunkte, Gefahrenstellen …">${esc(t.ascent||'')}</textarea></div>
      <div class="field"><label>Abstieg</label><textarea name="descent" placeholder="Abstiegsroute, Varianten, Abseilstellen …">${esc(t.descent||'')}</textarea></div>
      <div class="field"><label>Zustieg über Hütte</label>
        <select name="hutId"><option value="">— keine —</option>${hutOptions}</select>
        <div class="hint">Fehlt die Hütte? Erst unter „Hütten" anlegen, dann hier verlinken.</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-act="close-modal">Abbrechen</button>
        <button type="button" id="tour-save-btn" class="btn">${existing?'Speichern':'Tour anlegen'}</button>
      </div>
    </form>
  </div>`;
}

function tourDetailHtml(id){
  const t = state.tours.find(x=>x.id===id);
  if(!t) return `<div class="modal" data-stop="1"><p>Tour nicht gefunden.</p></div>`;
  const d = DIFF[t.difficulty] || DIFF.L;
  const hut = t.hutId ? state.huts.find(h=>h.id===t.hutId) : null;
  return `<div class="modal" data-stop="1">
    <div class="modal-head">
      <div>
        <div class="detail-badge-row">
          <span class="badge" style="background:${d.color}">${t.difficulty} · ${d.label}</span>
          ${t.climbGrade ? `<span class="badge climb">🧗 ${esc(t.climbGrade)}</span>` : ''}
        </div>
        <h2>${esc(t.name)}</h2>
      </div>
      <button class="x-btn" data-act="close-modal">×</button>
    </div>
    ${t.region ? `<p style="color:var(--ink-soft); font-size:14px; margin:0 0 6px 0;">${esc(t.region)}</p>` : ''}
    <div class="detail-stats">
      <div class="detail-stat"><div class="num">${esc(t.elevationGain||'–')}</div><div class="lbl">Hm Aufstieg</div></div>
      ${t.elevationLoss ? `<div class="detail-stat"><div class="num">${esc(t.elevationLoss)}</div><div class="lbl">Hm Abstieg</div></div>` : ''}
      ${t.duration ? `<div class="detail-stat"><div class="num">${esc(t.duration)}</div><div class="lbl">Zeitbedarf</div></div>` : ''}
    </div>
    ${hut ? `<button class="hut-link-chip" style="border:none; cursor:pointer;" data-act="open-hut" data-id="${hut.id}">🛖 Zustieg über: ${esc(hut.name)}</button>` : ''}

    ${t.requirements ? `<div class="detail-section"><h4>Anforderungen</h4><p>${esc(t.requirements)}</p></div>` : ''}
    ${t.special ? `<div class="detail-section"><h4>Spezielles</h4><p>${esc(t.special)}</p></div>` : ''}
    ${t.approach ? `<div class="detail-section"><h4>Anfahrt</h4><p>${esc(t.approach)}</p></div>` : ''}
    ${t.ascent ? `<div class="detail-section"><h4>Aufstieg</h4><p>${esc(t.ascent)}</p></div>` : ''}
    ${t.descent ? `<div class="detail-section"><h4>Abstieg</h4><p>${esc(t.descent)}</p></div>` : ''}

    <div class="detail-section">
      <h4>Aktuelle Bedingungen</h4>
      <div class="cond-box">
        ${t.conditions && t.conditions.text ? `<p style="margin:0 0 8px 0; font-size:14px;">❄ ${esc(t.conditions.text)}</p><div class="meta-line">gemeldet von ${esc(t.conditions.updatedBy||'?')} · ${fmtDate(t.conditions.updatedAt)}</div>` : `<p style="margin:0 0 8px 0; font-size:13px; color:var(--ink-soft);">Noch keine Meldung.</p>`}
        <textarea id="cond-input" placeholder="z. B. Spalten offen oberhalb 3000m, Fels trocken, Steinschlag am Nachmittag…" style="margin-top:8px;"></textarea>
        <div style="margin-top:8px;"><button class="btn secondary" data-act="submit-conditions" data-id="${t.id}">Bedingungen aktualisieren</button></div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Erledigt (${(t.completions||[]).length})</h4>
      ${(t.completions && t.completions.length) ? t.completions.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||'')).map(c=>`<p style="margin:0 0 4px 0; font-size:14px;">✓ ${esc(c.by)} — ${esc(fmtDateOnly(c.date))}</p>`).join('') : `<p style="font-size:13.5px; color:var(--ink-soft);">Noch nicht erledigt.</p>`}
    </div>

    <div class="meta-line" style="margin-top:16px;">Angelegt von ${esc(t.createdBy||'?')} · ${fmtDate(t.createdAt)}${t.updatedAt && t.updatedAt!==t.createdAt ? ` · zuletzt bearbeitet von ${esc(t.updatedBy||'?')} · ${fmtDate(t.updatedAt)}` : ''}</div>

    <div class="detail-actions">
      <button class="btn secondary" data-act="mark-done" data-kind="tour" data-id="${t.id}">✓ Als erledigt markieren</button>
      <button class="btn secondary" data-act="edit-tour" data-id="${t.id}">Bearbeiten</button>
    </div>
  </div>`;
}

function hutFormHtml(existing){
  const h = existing || {};
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${existing?'Hütte bearbeiten':'Neue Hütte'}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <form id="hut-form" novalidate>
      <div class="field"><label>Name der Hütte *</label><input required name="name" value="${esc(h.name||'')}" placeholder="z. B. Domhütte"/></div>
      <div class="row2">
        <div class="field"><label>Region</label><input name="region" value="${esc(h.region||'')}" placeholder="z. B. Walliser Alpen"/></div>
        <div class="field"><label>Höhe (m ü. M.)</label><input name="altitude" value="${esc(h.altitude||'')}" placeholder="z. B. 2940"/></div>
      </div>
      <div class="row2">
        <div class="field"><label>Öffnungszeitraum</label><input name="openingPeriod" value="${esc(h.openingPeriod||'')}" placeholder="z. B. Mitte März – Ende September"/></div>
        <div class="field"><label>Bewartet (Zeitraum)</label><input name="staffedPeriod" value="${esc(h.staffedPeriod||'')}" placeholder="z. B. Ende Juni – Mitte September, leer lassen wenn unbewartet"/></div>
      </div>
      <div class="field"><label>Winterraum / Schutzraum</label><textarea name="winterraum" placeholder="Vorhanden? Anzahl Plätze, Zugang, Ausstattung …">${esc(h.winterraum||'')}</textarea></div>
      <div class="field"><label>Betten / Kapazität</label><input name="capacity" value="${esc(h.capacity||'')}" placeholder="z. B. 60 Betten"/></div>
      <div class="field"><label>Anfahrt</label><textarea name="approach" placeholder="Ausgangspunkt, Parkplatz, ÖV, Seilbahn …">${esc(h.approach||'')}</textarea></div>
      <div class="row2">
        <div class="field"><label>Zustieg – Höhenmeter (Hm)</label><input name="accessElevation" value="${esc(h.accessElevation||'')}" placeholder="z. B. 1400"/></div>
        <div class="field"><label>Zustieg – Zeitbedarf</label><input name="accessDuration" value="${esc(h.accessDuration||'')}" placeholder="z. B. 3–4 Std."/></div>
      </div>
      <div class="field"><label>Zustieg – Schwierigkeit (SAC)</label>
        <select name="accessDifficulty">
          <option value="">— keine Angabe —</option>
          ${DIFF_ORDER.map(c=>`<option value="${c}" ${(h.accessDifficulty||'')===c?'selected':''}>${c} — ${DIFF[c].label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Zustieg – Beschreibung</label><textarea name="access" placeholder="Route, Orientierungspunkte, Gefahrenstellen, Gletscherquerung …">${esc(h.access||'')}</textarea></div>
      <div class="field"><label>Kontakt / Reservation</label><input name="contact" value="${esc(h.contact||'')}" placeholder="Telefon, Website, Sektion …"/></div>
      <div class="field"><label>Notizen</label><textarea name="notes" placeholder="Sonstiges …">${esc(h.notes||'')}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-act="close-modal">Abbrechen</button>
        <button type="button" id="hut-save-btn" class="btn">${existing?'Speichern':'Hütte anlegen'}</button>
      </div>
    </form>
  </div>`;
}

function hutDetailHtml(id){
  const h = state.huts.find(x=>x.id===id);
  if(!h) return `<div class="modal" data-stop="1"><p>Hütte nicht gefunden.</p></div>`;
  const linked = state.tours.filter(t=>t.hutId===h.id);
  return `<div class="modal" data-stop="1">
    <div class="modal-head">
      <div><h2>🛖 ${esc(h.name)}</h2>${h.region ? `<p style="color:var(--ink-soft); font-size:14px; margin:4px 0 0 0;">${esc(h.region)}</p>` : ''}</div>
      <button class="x-btn" data-act="close-modal">×</button>
    </div>
    <div class="detail-stats">
      ${h.altitude ? `<div class="detail-stat"><div class="num">${esc(h.altitude)}</div><div class="lbl">m ü. M.</div></div>` : ''}
      ${h.capacity ? `<div class="detail-stat"><div class="num">${esc(h.capacity)}</div><div class="lbl">Kapazität</div></div>` : ''}
      ${h.accessElevation ? `<div class="detail-stat"><div class="num">${esc(h.accessElevation)}</div><div class="lbl">Hm Zustieg</div></div>` : ''}
      ${h.accessDuration ? `<div class="detail-stat"><div class="num">${esc(h.accessDuration)}</div><div class="lbl">Zeitbedarf</div></div>` : ''}
    </div>
    ${h.accessDifficulty ? `<div class="detail-badge-row"><span class="badge" style="background:${(DIFF[h.accessDifficulty]||DIFF.L).color}">${h.accessDifficulty} · Zustieg (SAC)</span></div>` : ''}
    ${h.openingPeriod ? `<div class="detail-section"><h4>Öffnungszeitraum</h4><p>${esc(h.openingPeriod)}</p></div>` : ''}
    <div class="detail-section"><h4>Bewartung</h4><p>${h.staffedPeriod ? esc(h.staffedPeriod) : 'Unbewartet'}</p></div>
    ${h.winterraum ? `<div class="detail-section"><h4>Winterraum / Schutzraum</h4><p>${esc(h.winterraum)}</p></div>` : ''}
    ${h.approach ? `<div class="detail-section"><h4>Anfahrt</h4><p>${esc(h.approach)}</p></div>` : ''}
    ${h.access ? `<div class="detail-section"><h4>Zustieg – Beschreibung</h4><p>${esc(h.access)}</p></div>` : ''}
    ${h.contact ? `<div class="detail-section"><h4>Kontakt</h4><p>${esc(h.contact)}</p></div>` : ''}
    ${h.notes ? `<div class="detail-section"><h4>Notizen</h4><p>${esc(h.notes)}</p></div>` : ''}

    <div class="detail-section">
      <h4>Touren ab dieser Hütte (${linked.length})</h4>
      ${linked.length ? `<div class="grid" style="margin-top:6px;">${linked.map(tourCardHtml).join('')}</div>` : `<p style="font-size:13.5px; color:var(--ink-soft);">Noch keine Tour mit dieser Hütte verknüpft. Beim Anlegen oder Bearbeiten einer Tour kann die Hütte als Zustieg ausgewählt werden.</p>`}
    </div>

    <div class="detail-section">
      <h4>Erledigt (${(h.completions||[]).length})</h4>
      ${(h.completions && h.completions.length) ? h.completions.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||'')).map(c=>`<p style="margin:0 0 4px 0; font-size:14px;">✓ ${esc(c.by)} — ${esc(fmtDateOnly(c.date))}</p>`).join('') : `<p style="font-size:13.5px; color:var(--ink-soft);">Noch nicht erledigt.</p>`}
    </div>

    <div class="meta-line" style="margin-top:16px;">Angelegt von ${esc(h.createdBy||'?')} · ${fmtDate(h.createdAt)}${h.updatedAt && h.updatedAt!==h.createdAt ? ` · zuletzt bearbeitet von ${esc(h.updatedBy||'?')} · ${fmtDate(h.updatedAt)}` : ''}</div>

    <div class="detail-actions">
      <button class="btn secondary" data-act="mark-done" data-kind="hut" data-id="${h.id}">✓ Als erledigt markieren</button>
      <button class="btn secondary" data-act="edit-hut" data-id="${h.id}">Bearbeiten</button>
    </div>
  </div>`;
}

/* ================= Abgeschlossen view ================= */
function abgeschlossenViewHtml(){
  const doneTours = state.tours.filter(t=> (t.completions && t.completions.length) || t.completed);
  const doneHuts = state.huts.filter(h=> (h.completions && h.completions.length) || h.completed);
  if(!doneTours.length && !doneHuts.length){
    return `<div class="empty">
      <h3>Noch nichts als erledigt markiert</h3>
      <p>Öffne eine Tour oder Hütte und tippe auf "Als erledigt markieren", um Name und Datum einzutragen.</p>
    </div>`;
  }
  return `
    ${doneTours.length ? `<div class="detail-section"><h4>Touren (${doneTours.length})</h4><div class="grid" style="margin-top:6px;">${doneTours.map(tourCardHtml).join('')}</div></div>` : ''}
    ${doneHuts.length ? `<div class="detail-section" style="margin-top:22px;"><h4>Hütten (${doneHuts.length})</h4><div class="grid" style="margin-top:6px;">${doneHuts.map(hutCardHtml).join('')}</div></div>` : ''}
  `;
}

function openMarkDone(kind, id){
  state.modal = {type:'add-completion', payload:{kind, id}};
  render();
}

async function submitCompletion(kind, id, name, date){
  const n = (name||'').trim();
  if(!n){
    const box = document.getElementById('completion-error');
    if(box){ box.style.display='block'; box.textContent = 'Bitte einen Namen eingeben.'; }
    return;
  }
  const entry = {by:n, date: date || new Date().toISOString().slice(0,10), addedAt: new Date().toISOString()};
  if(kind==='tour'){
    const t = state.tours.find(x=>x.id===id);
    if(!t) return;
    t.completions = t.completions || [];
    t.completions.push(entry);
    closeModal();
    state.modal = {type:'tour-detail', payload:id};
    render();
    const ok = await saveTourCloud(t).catch(()=>false);
    t._unsynced = !ok;
    if(!ok){ markUnsaved(); showToast('Eintrag lokal gespeichert, aber nicht synchronisiert.', true); }
    else{ showToast('Als erledigt eingetragen.'); }
    render();
  }else{
    const h = state.huts.find(x=>x.id===id);
    if(!h) return;
    h.completions = h.completions || [];
    h.completions.push(entry);
    closeModal();
    state.modal = {type:'hut-detail', payload:id};
    render();
    const ok = await saveHutCloud(h).catch(()=>false);
    h._unsynced = !ok;
    if(!ok){ markUnsaved(); showToast('Eintrag lokal gespeichert, aber nicht synchronisiert.', true); }
    else{ showToast('Als erledigt eingetragen.'); }
    render();
  }
}

/* ================= Event wiring ================= */
function wireGlobalHandlers(){
  const app = document.getElementById('app');
  app.querySelectorAll('[data-act]').forEach(el=>{
    const act = el.getAttribute('data-act');
    if(act==='view-touren') el.onclick = ()=>setView('touren');
    else if(act==='view-huetten') el.onclick = ()=>setView('huetten');
    else if(act==='view-abgeschlossen') el.onclick = ()=>setView('abgeschlossen');
    else if(act==='change-name') el.onclick = ()=>{ state.modal = {type:'name'}; render(); };
    else if(act==='export-data') el.onclick = openExport;
    else if(act==='import-data') el.onclick = openImport;
    else if(act==='add-tour') el.onclick = openAddTour;
    else if(act==='add-hut') el.onclick = openAddHut;
    else if(act==='open-tour') { el.onclick = ()=>openTourDetail(el.getAttribute('data-id')); el.onkeydown=(e)=>{if(e.key==='Enter')openTourDetail(el.getAttribute('data-id'));}; }
    else if(act==='open-hut') { el.onclick = ()=>openHutDetail(el.getAttribute('data-id')); el.onkeydown=(e)=>{if(e.key==='Enter')openHutDetail(el.getAttribute('data-id'));}; }
    else if(act==='filter-diff') el.onclick = ()=>toggleDiffFilter(el.getAttribute('data-code'));
    else if(act==='search') el.oninput = (e)=>{ state.search = e.target.value; renderListOnly(); };
  });
}

function renderListOnly(){
  const main = document.querySelector('main');
  if(!main) return;
  main.innerHTML = state.loading ? `<div class="loading">Lade…</div>` : (state.view==='touren' ? tourenViewHtml() : state.view==='huetten' ? huettenViewHtml() : abgeschlossenViewHtml());
  wireGlobalHandlers();
  const input = main.querySelector('.search-input');
  if(input){ input.focus(); input.selectionStart = input.selectionEnd = input.value.length; }
}

function wireModalHandlers(){
  const root = document.getElementById('modal-root');
  dlog('Modal gerendert: ' + (state.modal ? state.modal.type : 'keins'));
  const overlay = root.querySelector('.overlay');
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeModal(); });
  root.querySelectorAll('[data-stop]').forEach(el=> el.addEventListener('click', e=>e.stopPropagation()));

  root.querySelectorAll('[data-act="close-modal"]').forEach(el=> el.onclick = closeModal);

  const markDoneBtn = root.querySelector('[data-act="mark-done"]');
  if(markDoneBtn) markDoneBtn.onclick = ()=> openMarkDone(markDoneBtn.getAttribute('data-kind'), markDoneBtn.getAttribute('data-id'));

  const submitCompletionBtn = root.querySelector('[data-act="submit-completion"]');
  if(submitCompletionBtn) submitCompletionBtn.onclick = ()=>{
    const name = document.getElementById('completion-name').value;
    const date = document.getElementById('completion-date').value;
    submitCompletion(submitCompletionBtn.getAttribute('data-kind'), submitCompletionBtn.getAttribute('data-id'), name, date);
  };

  const copyExportBtn = root.querySelector('[data-act="copy-export"]');
  if(copyExportBtn) copyExportBtn.onclick = async ()=>{
    const ta = document.getElementById('export-text');
    try{
      await navigator.clipboard.writeText(ta.value);
      showToast('In Zwischenablage kopiert.');
    }catch(e){
      ta.select();
      showToast('Automatisches Kopieren nicht möglich — Text ist markiert, bitte manuell kopieren.', true);
    }
  };

  const downloadExportBtn = root.querySelector('[data-act="download-export"]');
  if(downloadExportBtn) downloadExportBtn.onclick = ()=>{
    try{
      const ta = document.getElementById('export-text');
      const blob = new Blob([ta.value], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `fixseil-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 2000);
      markSaved();
      render();
      showToast('Datei heruntergeladen. Jetzt mit deinen Freunden teilen!');
    }catch(e){
      showToast('Download fehlgeschlagen: '+(e&&e.message?e.message:e), true);
    }
  };

  const importFileInput = root.querySelector('#import-file');
  if(importFileInput) importFileInput.addEventListener('change', ()=>{
    const file = importFileInput.files && importFileInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{ document.getElementById('import-text').value = reader.result; };
    reader.onerror = ()=>{ showToast('Datei konnte nicht gelesen werden.', true); };
    reader.readAsText(file);
  });

  const doImportBtn = root.querySelector('[data-act="do-import"]');
  if(doImportBtn) doImportBtn.onclick = ()=>{
    const val = document.getElementById('import-text').value;
    const errBox = document.getElementById('import-error');
    try{
      const res = mergeImportedData(val);
      closeModal();
      render();
      showToast(`Importiert: ${res.addedTours} neue Touren, ${res.updatedTours} aktualisiert, ${res.addedHuts} neue Hütten, ${res.updatedHuts} aktualisiert.`);
    }catch(e){
      errBox.style.display = 'block';
      errBox.textContent = e.message || 'Import fehlgeschlagen.';
    }
  };
  const submitNameBtn = root.querySelector('[data-act="submit-name"]');
  if(submitNameBtn) submitNameBtn.onclick = ()=>{
    const val = document.getElementById('name-input').value;
    submitName(val);
  };
  const nameInput = document.getElementById('name-input');
  if(nameInput) nameInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); submitName(nameInput.value); } });

  const tourForm = document.getElementById('tour-form');
  dlog('tour-form im DOM gefunden: ' + !!tourForm);
  if(tourForm){
    const tourSaveBtn = document.getElementById('tour-save-btn');
    if(tourSaveBtn){
      tourSaveBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        dlog('Klick auf Tour-Speichern-Button registriert — speichere direkt (ohne Formular-Submit)');
        try{
          const fd = new FormData(tourForm);
          const data = Object.fromEntries(fd.entries());
          if(!data.name || !data.name.trim()){
            dlog('Validierung fehlgeschlagen: Name fehlt', 'err');
            showFormError('tour-form', 'Bitte einen Namen für die Tour eingeben (ganz oben im Formular).');
            return;
          }
          dlog('Validierung ok, rufe submitTourForm auf für "'+data.name+'"');
          submitTourForm(data, state.modal.payload);
        }catch(err){
          dlog('Unerwarteter Fehler beim Speichern: '+(err && err.message ? err.message : err), 'err');
          showFormError('tour-form', 'Unerwarteter Fehler: ' + (err.message || err));
        }
      });
    }
  }

  const hutForm = document.getElementById('hut-form');
  if(hutForm){
    const hutSaveBtn = document.getElementById('hut-save-btn');
    if(hutSaveBtn){
      hutSaveBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        dlog('Klick auf Hütte-Speichern-Button registriert — speichere direkt (ohne Formular-Submit)');
        try{
          const fd = new FormData(hutForm);
          const data = Object.fromEntries(fd.entries());
          if(!data.name || !data.name.trim()){
            dlog('Validierung fehlgeschlagen: Name fehlt', 'err');
            showFormError('hut-form', 'Bitte einen Namen für die Hütte eingeben (ganz oben im Formular).');
            return;
          }
          dlog('Validierung ok, rufe submitHutForm auf für "'+data.name+'"');
          submitHutForm(data, state.modal.payload);
        }catch(err){
          dlog('Unerwarteter Fehler beim Speichern: '+(err && err.message ? err.message : err), 'err');
          showFormError('hut-form', 'Unerwarteter Fehler: ' + (err.message || err));
        }
      });
    }
  }

  root.querySelectorAll('[data-act="edit-tour"]').forEach(el=> el.onclick = ()=>openEditTour(el.getAttribute('data-id')));
  root.querySelectorAll('[data-act="edit-hut"]').forEach(el=> el.onclick = ()=>openEditHut(el.getAttribute('data-id')));
  root.querySelectorAll('[data-act="open-hut"]').forEach(el=> el.onclick = ()=>openHutDetail(el.getAttribute('data-id')));
  root.querySelectorAll('[data-act="open-tour"]').forEach(el=> el.onclick = ()=>openTourDetail(el.getAttribute('data-id')));
  const condBtn = root.querySelector('[data-act="submit-conditions"]');
  if(condBtn) condBtn.onclick = ()=>{
    const val = document.getElementById('cond-input').value;
    if(!val.trim()) return;
    ensureName(()=> submitConditions(condBtn.getAttribute('data-id'), val));
  };
}

/* ================= Global error safety net ================= */
window.addEventListener('error', function(e){
  console.error('Unhandled error', e.error || e.message);
  showToast('Es gab ein unerwartetes Problem: ' + (e.message || 'unbekannter Fehler') + '. Bitte nochmal versuchen.', true);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('Unhandled rejection', e.reason);
  showToast('Es gab ein unerwartetes Problem beim Speichern. Bitte nochmal versuchen.', true);
});
window.addEventListener('beforeunload', function(e){
  if(state.hasUnsavedChanges){
    e.preventDefault();
    e.returnValue = '';
  }
});

/* ================= Init ================= */
dlog('App gestartet — Version ' + APP_VERSION);
loadAll();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{
      dlog('Service Worker konnte nicht registriert werden.', 'err');
    });
  });
}
</script>
</body>
</html>
