/* ================================================================
   shared.js — gemeinsamer Code für Firnspur (Skitour) & Fixseil
   (Hochtour/MSL). Wird von beiden Apps eingebunden, damit Agenda,
   Sortierung, Regionen und Basis-Hilfsfunktionen nur an einer
   Stelle gepflegt werden müssen.
   ================================================================= */

/* ================= Debug-Log ================= */
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

/* ================= Firebase ================= */
const FIREBASE_URL = 'https://firnspur-default-rtdb.europe-west1.firebasedatabase.app';
const STORAGE_BUCKET = 'firnspur.firebasestorage.app'; // Cloud Storage, appübergreifend geteilt
async function fbGet(path){
  try{
    await ensureValidAuthToken();
    const authParam = authState.idToken ? ('?auth=' + authState.idToken) : '';
    const res = await fetch(FIREBASE_URL + '/' + path + '.json' + authParam);
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
    await ensureValidAuthToken();
    const authParam = authState.idToken ? ('?auth=' + authState.idToken) : '';
    const res = await fetch(FIREBASE_URL + '/' + path + '.json' + authParam, {
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
    await ensureValidAuthToken();
    const authParam = authState.idToken ? ('?auth=' + authState.idToken) : '';
    const res = await fetch(FIREBASE_URL + '/' + path + '.json' + authParam, {method:'DELETE'});
    if(!res.ok){ dlog('Firebase DELETE fehlgeschlagen ('+res.status+'): '+path, 'err'); return false; }
    return true;
  }catch(e){
    dlog('Firebase DELETE Fehler für "'+path+'": '+(e && e.message ? e.message : e), 'err');
    return false;
  }
}

/* ================= Basis-Hilfsfunktionen ================= */
function uid(prefix){ return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
function dedupeById(arr){
  const map = new Map();
  arr.forEach(x=>{ if(x && x.id) map.set(x.id, x); });
  return Array.from(map.values());
}
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
  if(isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('de-CH', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function fmtDateShort(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr+'T00:00:00');
  if(isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-CH', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function fmtWeekday(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr+'T00:00:00');
  if(isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-CH', {weekday:'short'});
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function isPastAgendaItem(item){
  const ref = item.endDate || item.startDate;
  if(!ref) return false;
  return ref < todayStr();
}
function showToast(message, isError){
  const old = document.querySelector('.toast');
  if(old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, isError ? 5000 : 2500);
}
function markUnsaved(){ state.hasUnsavedChanges = true; }
function markSaved(){ state.hasUnsavedChanges = false; }

/* ================= Region / Exposition ================= */
const EXPOSITIONS = ['N','NE','E','SE','S','SW','W','NW'];
const APPROACH_TYPE_LABELS = { auto:'🚗 Auto', oev:'🚌 ÖV', seilbahn:'🚡 Seilbahn', zufuss:'🥾 Zu Fuss' };
const STAY_TYPE_LABELS = { tagestour:'☀️ Tagestour', huette:'🛖 Hütte', biwak:'⛺ Biwak', zelt:'🏕️ Zelt' };
const MAP_POINT_CATEGORIES = {
  '': {icon:'📍', label:'Punkt', color:'#4A3524'},
  'gefahr': {icon:'⚠️', label:'Gefahrenstelle', color:'#B0392C'},
  'rueckzug': {icon:'↩️', label:'Rückzugspunkt', color:'#8B2E22'},
  'wasser': {icon:'💧', label:'Wasserstelle', color:'#2E6E8E'},
  'rast': {icon:'🍽️', label:'Rastplatz', color:'#4C8C6B'},
  'biwak': {icon:'⛺', label:'Biwak / Übernachtung', color:'#7A5C9E'},
  'parkplatz': {icon:'🅿️', label:'Parkplatz', color:'#5B5B5B'},
  'toilette': {icon:'🚻', label:'Toilette', color:'#5B5B5B'},
  'haltestelle': {icon:'🚏', label:'Haltestelle ÖV', color:'#5B5B5B'},
  'abzweigung': {icon:'🔀', label:'Abzweigung / Orientierung', color:'#D9A441'},
};
function makeCategoryIcon(category){
  const meta = MAP_POINT_CATEGORIES[category] || MAP_POINT_CATEGORIES[''];
  return L.divIcon({
    html: `<div style="background:${meta.color}; width:30px; height:30px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.4); border:2px solid white;"><span style="transform:rotate(45deg); font-size:14px;">${meta.icon}</span></div>`,
    className: '',
    iconSize: [30,30],
    iconAnchor: [15,30],
    popupAnchor: [0,-28]
  });
}
const REGIONS = ['Wallis','Berner Oberland','Simmental','Graubünden','Tessin','Zentralschweiz','Jura','Freiburger Alpen','Waadtländer Alpen'];
const REGION_SUBAREAS = {
  'Wallis': ['Nikolaital/Zermatt','Saastal','Val d\'Anniviers','Lötschental','Goms','Unterwallis','Nufenenpass','Grimselpass','Furkapass','Simplonpass','Grosser St. Bernhard'],
  'Berner Oberland': ['Lauterbrunnental','Haslital','Kandertal','Simmental','Diemtigtal','Justistal','Saanenland/Gstaad','Grimselpass','Sustenpass','Jochpass','Grosse Scheidegg'],
  'Graubünden': ['Engadin','Prättigau','Albula','Surselva','Bergell','Puschlav','Julierpass','Albulapass','Flüelapass','Ofenpass','Splügenpass','Berninapass'],
  'Tessin': ['Bedretto','Maggiatal','Blenio','Leventina','San Bernardino','Nufenenpass','Gotthardpass','Lukmanierpass'],
  'Zentralschweiz': ['Urner Alpen','Glarner Alpen','Nidwalden','Schwyz','Sustenpass','Klausenpass','Gotthardpass','Jochpass'],
  'Jura': ['Solothurner Jura','Waadtländer Jura','Baselbieter Jura','Neuenburger Jura','Passwang','Col de Pierre Pertuis','Balmberg'],
  'Freiburger Alpen': ['Gantrischgebiet','Vanil-Noir-Gebiet','Jaunpass'],
  'Waadtländer Alpen': ['Diablerets-Gebiet','Villars/Leysin-Gebiet','Col des Mosses','Col du Pillon','Col de la Croix']
};
function renderSubregionChipsHtml(region, selectedSub){
  const subs = REGION_SUBAREAS[region] || [];
  if(!subs.length) return '';
  return subs.map(s=>`<button type="button" class="chip subregion-chip ${selectedSub===s?'on':''}" style="${selectedSub===s?'background:var(--ice-deep); color:#fff; border-color:transparent;':''}" data-subregion="${s}">${s}</button>`).join('');
}

/* ================= Sortierung ================= */
function compareValues(a, b, dir){
  const aEmpty = (a===null || a===undefined || a==='');
  const bEmpty = (b===null || b===undefined || b==='');
  if(aEmpty && bEmpty) return 0;
  if(aEmpty) return 1;
  if(bEmpty) return -1;
  let cmp;
  if(typeof a === 'string' && typeof b === 'string') cmp = a.localeCompare(b, 'de');
  else cmp = a - b;
  return dir==='asc' ? cmp : -cmp;
}
function parseDurationHours(s){
  if(!s) return null;
  const hm = String(s).match(/(\d+):(\d{2})/);
  if(hm) return parseInt(hm[1],10) + parseInt(hm[2],10)/60;
  const num = String(s).match(/[\d.]+/);
  return num ? parseFloat(num[0]) : null;
}
function tourSortKey(t, by){
  if(by==='date') return t.createdAt || '';
  if(by==='name') return (t.name||'').toLowerCase();
  if(by==='region') return (t.region||'').toLowerCase();
  if(by==='difficulty'){ const i = t.difficulty ? DIFF_ORDER.indexOf(t.difficulty) : -1; return i>=0 ? i : null; }
  if(by==='crux'){ const i = t.cruxDifficulty ? CLIMB_ORDER.indexOf(t.cruxDifficulty) : -1; return i>=0 ? i : null; }
  if(by==='elevation'){ const n = parseFloat(t.elevationGain); return isNaN(n) ? null : n; }
  if(by==='duration') return parseDurationHours(t.duration);
  return '';
}
function sortTours(list, sortBy, sortDir){
  const by = sortBy || state.tourSortBy, dir = sortDir || state.tourSortDir;
  return [...list].sort((a,b)=> compareValues(tourSortKey(a,by), tourSortKey(b,by), dir));
}
function hutSortKey(h, by){
  if(by==='date') return h.createdAt || '';
  if(by==='name') return (h.name||'').toLowerCase();
  if(by==='region') return (h.region||'').toLowerCase();
  if(by==='altitude'){ const n = parseFloat(h.altitude); return isNaN(n) ? null : n; }
  return '';
}
function sortHuts(list){
  const by = state.hutSortBy, dir = state.hutSortDir;
  return [...list].sort((a,b)=> compareValues(hutSortKey(a,by), hutSortKey(b,by), dir));
}
const TOUR_SORT_OPTIONS = [
  {value:'date', label:'Datum'},
  {value:'name', label:'A–Z'},
  {value:'region', label:'Region'},
  {value:'difficulty', label:'Schwierigkeit'},
  {value:'elevation', label:'Höhenmeter'},
  {value:'duration', label:'Zeitbedarf'},
];
const HUT_SORT_OPTIONS = [
  {value:'date', label:'Datum'},
  {value:'name', label:'A–Z'},
  {value:'region', label:'Region'},
  {value:'altitude', label:'Höhe'},
];
function sortControlHtml(kind, options, sortBy, sortDir){
  return `<div class="sort-control">
    <select data-act="sort-by" data-kind="${kind}">
      ${options.map(o=>`<option value="${o.value}" ${sortBy===o.value?'selected':''}>${o.label}</option>`).join('')}
    </select>
    <button type="button" class="sort-dir-btn" data-act="sort-dir" data-kind="${kind}" title="Richtung umkehren">${sortDir==='asc'?'↑':'↓'}</button>
  </div>`;
}

/* ================= Agenda (app-übergreifend geteilt) ================= */
const AGENDA_PATH = 'agenda';
const AGENDA_STATUS_ORDER = ['idee','termin-gesucht','geplant','bestaetigt','abgesagt','durchgefuehrt'];
const AGENDA_STATUS_LABELS = {
  'idee':'Idee', 'termin-gesucht':'Termin gesucht', 'geplant':'Geplant',
  'bestaetigt':'Bestätigt', 'abgesagt':'Abgesagt', 'durchgefuehrt':'Durchgeführt'
};
function migrateAgendaStatus(a){
  if(!a.status){
    a.status = a.cancelled ? 'abgesagt' : (isPastAgendaItem(a) ? 'durchgefuehrt' : 'geplant');
  }
  return a;
}
async function saveAgendaCloud(item){ return await fbSet(AGENDA_PATH+'/'+item.id, item); }
function removeAgendaItem(id){
  state.agenda = state.agenda.filter(x=>x.id!==id);
  fbDelete(AGENDA_PATH+'/'+id).catch(()=>{});
}
function agendaTypeLabel(type){
  if(type==='hochtour') return '🏔️ Hochtour';
  if(type==='msl') return '🧗 Mehrseillängen';
  return '🎿 Skitour';
}
function agendaTypeColor(type){
  if(type==='hochtour') return 'var(--ice-deep)';
  if(type==='msl') return 'var(--signal-deep, #A87A1F)';
  return 'var(--ice)';
}
function agendaViewHtml(){
  const groups = {};
  AGENDA_STATUS_ORDER.forEach(s=> groups[s] = []);
  state.agenda.forEach(a=>{ (groups[a.status] || groups['geplant']).push(a); });
  const descStatuses = ['abgesagt','durchgefuehrt'];
  AGENDA_STATUS_ORDER.forEach(s=>{
    groups[s].sort((a,b)=> descStatuses.includes(s)
      ? (b.startDate||'').localeCompare(a.startDate||'')
      : (a.startDate||'').localeCompare(b.startDate||''));
  });
  return `
    <div class="toolbar">
      <div></div>
      <button class="btn" data-act="add-agenda">+ Neuer Termin</button>
    </div>
    ${state.agenda.length===0 ? `<div class="empty">
      <h3>Noch keine Termine geplant</h3>
      <p>Schlag einen Zeitraum und eine Tour vor — andere können sich direkt eintragen.</p>
      <button class="btn" data-act="add-agenda">+ Neuer Termin</button>
    </div>` : AGENDA_STATUS_ORDER.map(s=>`
    <div class="detail-section" style="margin-bottom:24px;">
      <h4>${AGENDA_STATUS_LABELS[s]} (${groups[s].length})</h4>
      ${groups[s].length ? `<div class="grid" style="margin-top:6px;">${groups[s].map(agendaCardHtml).join('')}</div>` : `<p style="font-size:13px; color:var(--ink-faint); margin:4px 0 0 0;">—</p>`}
    </div>`).join('')}
  `;
}
function agendaStatusSelectHtml(a){
  return `<select class="agenda-status-select" data-id="${a.id}" style="margin-top:8px; width:auto; padding:6px 10px; font-size:13px;">
    ${AGENDA_STATUS_ORDER.map(s=>`<option value="${s}" ${a.status===s?'selected':''}>${AGENDA_STATUS_LABELS[s]}</option>`).join('')}
  </select>`;
}
function agendaCardHtml(a){
  const dateLabel = a.endDate && a.endDate!==a.startDate
    ? `${fmtWeekday(a.startDate)}, ${fmtDateShort(a.startDate)} – ${fmtWeekday(a.endDate)}, ${fmtDateShort(a.endDate)}`
    : `${fmtWeekday(a.startDate)}, ${fmtDateShort(a.startDate)}`;
  const dim = (a.status==='abgesagt') ? 'opacity:0.55;' : '';
  return `
  <div class="card" data-id="${a.id}" style="${dim}">
    <div class="agenda-date-row" data-act="open-agenda" data-id="${a.id}" style="cursor:pointer;">📅 ${dateLabel}</div>
    <div class="card-top" data-act="open-agenda" data-id="${a.id}" style="cursor:pointer;">
      <h3>${a.status==='abgesagt' ? '❌ ' : ''}${esc(a.tourName || 'Termin')}</h3>
      <span class="badge" style="background:${agendaTypeColor(a.type)}">${agendaTypeLabel(a.type)}</span>
    </div>
    ${a.meetingPoint ? `<div class="stat-row"><span>📍 ${esc(a.meetingPoint)}</span></div>` : ''}
    ${a.note ? `<p class="excerpt">${esc(a.note)}</p>` : ''}
    <span class="hut-link-chip">${(a.participants||[]).length} dabei${(a.participants||[]).length ? ': ' + (a.participants||[]).map(p=>esc(p.by)).join(', ') : ''}</span>
    ${a._unsynced ? `<span class="hut-link-chip" style="background:#FBEAE7; color:#B0392C;">⚠ nicht synchronisiert</span>` : ''}
    <div class="meta-line">von ${esc(a.createdBy||'?')} · ${fmtDate(a.createdAt)}</div>
    ${agendaStatusSelectHtml(a)}
  </div>`;
}
function agendaDetailHtml(id){
  const a = state.agenda.find(x=>x.id===id);
  if(!a) return `<div class="modal" data-stop="1"><p>Termin nicht gefunden.</p></div>`;
  const dateLabel = a.endDate && a.endDate!==a.startDate
    ? `${fmtWeekday(a.startDate)}, ${fmtDateShort(a.startDate)} – ${fmtWeekday(a.endDate)}, ${fmtDateShort(a.endDate)}`
    : `${fmtWeekday(a.startDate)}, ${fmtDateShort(a.startDate)}`;
  const joined = state.myName && (a.participants||[]).some(p=>p.by===state.myName);
  return `<div class="modal" data-stop="1">
    <div class="modal-head">
      <div>
        <div class="detail-badge-row">
          <span class="badge" style="background:${agendaTypeColor(a.type)}">${agendaTypeLabel(a.type)}</span>
        </div>
        <h2>${esc(a.tourName || 'Termin')}</h2>
      </div>
      <button class="x-btn" data-act="close-modal">×</button>
    </div>
    <div class="detail-stats">
      <div class="detail-stat"><div class="num">${dateLabel}</div><div class="lbl">Zeitraum</div></div>
    </div>
    ${a.meetingPoint ? `<div class="detail-section"><h4>Treffpunkt</h4><p>${esc(a.meetingPoint)}</p></div>` : ''}
    <div class="field"><label>Status</label>${agendaStatusSelectHtml(a)}</div>
    ${a.note ? `<div class="detail-section"><h4>Notiz</h4><p>${esc(a.note)}</p></div>` : ''}
    <div class="detail-section">
      <h4>Teilnehmer (${(a.participants||[]).length})</h4>
      ${(a.participants||[]).length ? (a.participants||[]).map(p=>`<p style="margin:0 0 4px 0; font-size:14px;">✓ ${esc(p.by)}</p>`).join('') : `<p style="font-size:13.5px; color:var(--ink-soft);">Noch niemand dabei.</p>`}
    </div>
    <div class="meta-line" style="margin-top:16px;">Vorgeschlagen von ${esc(a.createdBy||'?')} · ${fmtDate(a.createdAt)}</div>
    <div class="detail-actions">
      <button class="btn secondary" data-act="toggle-participation" data-id="${a.id}">${joined ? '↺ Absagen (nicht mehr dabei)' : '✓ Ich bin dabei'}</button>
    </div>
    <div id="delete-agenda-zone" style="margin-top:22px; padding-top:16px; border-top:1px solid var(--line); text-align:right;">
      <button type="button" id="delete-agenda-trigger" data-id="${a.id}" style="background:none; border:none; color:var(--ink-faint); font-size:12.5px; text-decoration:underline; cursor:pointer;">Termin löschen</button>
      <div id="delete-agenda-confirm" style="display:none; margin-top:10px; font-size:13px; color:var(--danger);">
        Wirklich unwiderruflich löschen?
        <button type="button" id="delete-agenda-yes" data-id="${a.id}" class="btn danger" style="padding:5px 12px; font-size:12.5px; margin-left:8px;">Ja, löschen</button>
        <button type="button" id="delete-agenda-no" style="background:none; border:none; color:var(--ink-soft); font-size:12.5px; text-decoration:underline; cursor:pointer; margin-left:6px;">Abbrechen</button>
      </div>
    </div>
  </div>`;
}
function openAddAgenda(){
  ensureName(async ()=>{
    if(!state.otherAppTours.length) await loadOtherAppTours();
    state.modal = {type:'add-agenda'};
    render();
  });
}
function agendaFormHtml(){
  const today = todayStr();
  const ownOptions = state.tours.map(t=>`<option value="own:${t.id}">${OWN_APP_LABEL} — ${esc(t.name)}</option>`).join('');
  const otherOptions = state.otherAppTours.map(t=>`<option value="other:${t.id}">${OTHER_APP_LABEL} — ${esc(t.name)}</option>`).join('');
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Neuer Termin</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <form id="agenda-form" novalidate>
      <div class="row2">
        <div class="field"><label>Startdatum *</label><input required type="date" name="startDate" value="${today}"/></div>
        <div class="field"><label>Enddatum (optional)</label><input type="date" name="endDate"/></div>
      </div>
      <div class="field"><label>Art</label>
        <select name="type">
          <option value="ski">🎿 Skitour</option>
          <option value="hochtour">🏔️ Hochtour</option>
          <option value="msl">🧗 Mehrseillängen</option>
        </select>
      </div>
      <div class="field"><label>Tour</label>
        <select name="tourChoice" id="agenda-tour-select">
          <option value="custom">— Neuer Vorschlag (Freitext) —</option>
          ${ownOptions}
          ${otherOptions}
        </select>
      </div>
      <div class="field" id="agenda-custom-field"><label>Geplante Tour</label><input name="customName" placeholder="z. B. Wildspitze über Vent"/></div>
      <div class="field"><label>Treffpunkt</label><input name="meetingPoint" placeholder="z. B. 06:30 Bahnhof"/></div>
      <div class="field"><label>Notiz (optional)</label><textarea name="note" placeholder="z. B. Ausrüstung, offene Fragen …"></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-act="close-modal">Abbrechen</button>
        <button type="button" id="agenda-save-btn" class="btn">Termin vorschlagen</button>
      </div>
    </form>
  </div>`;
}
async function submitAgendaForm(form){
  const startDate = form.startDate;
  if(!startDate){ showFormError('agenda-form', 'Bitte ein Startdatum wählen.'); return; }
  let tourName = '';
  if(form.tourChoice && form.tourChoice!=='custom'){
    const [src, refId] = form.tourChoice.split(':');
    const list = src==='own' ? state.tours : state.otherAppTours;
    const ref = list.find(t=>t.id===refId);
    tourName = ref ? ref.name : (form.customName||'').trim();
  }else{
    tourName = (form.customName||'').trim();
  }
  if(!tourName){ showFormError('agenda-form', 'Bitte eine Tour auswählen oder einen Vorschlag eintragen.'); return; }

  const a = {
    id: uid('a'), createdBy: state.myName, createdAt: new Date().toISOString(),
    type: form.type||'ski', startDate, endDate: form.endDate||'',
    tourName, meetingPoint: form.meetingPoint||'', note: form.note||'',
    participants: [{by: state.myName, joinedAt: new Date().toISOString()}],
    status: 'geplant'
  };
  state.agenda.unshift(a);
  closeModal();
  state.modal = {type:'agenda-detail', payload:a.id};
  render();
  const ok = await saveAgendaCloud(a).catch(()=>false);
  a._unsynced = !ok;
  if(!ok){ markUnsaved(); showToast('Termin lokal gespeichert, aber nicht synchronisiert.', true); }
  else{ showToast('Termin vorgeschlagen.'); }
  render();
}
async function toggleParticipation(id){
  ensureName(async ()=>{
    const a = state.agenda.find(x=>x.id===id);
    if(!a) return;
    a.participants = a.participants || [];
    const idx = a.participants.findIndex(p=>p.by===state.myName);
    if(idx>=0) a.participants.splice(idx,1);
    else a.participants.push({by: state.myName, joinedAt: new Date().toISOString()});
    render();
    const ok = await saveAgendaCloud(a).catch(()=>false);
    a._unsynced = !ok;
    if(!ok) markUnsaved();
    render();
  });
}
async function setAgendaStatus(id, status){
  const a = state.agenda.find(x=>x.id===id);
  if(!a || !AGENDA_STATUS_ORDER.includes(status)) return;
  a.status = status;
  render();
  const ok = await saveAgendaCloud(a).catch(()=>false);
  a._unsynced = !ok;
  if(!ok) markUnsaved();
  render();
}

/* ================= Notfallkarte (app-übergreifend geteilt) ================= */
function wgs84ToLV95(lat, lon){
  const latSec = lat * 3600;
  const lonSec = lon * 3600;
  const latAux = (latSec - 169028.66) / 10000;
  const lonAux = (lonSec - 26782.5) / 10000;
  const E = 2600072.37
    + 211455.93 * lonAux
    - 10938.51 * lonAux * latAux
    - 0.36 * lonAux * latAux * latAux
    - 44.54 * lonAux * lonAux * lonAux;
  const N = 1200147.07
    + 308807.95 * latAux
    - 3745.25 * lonAux * lonAux
    - 76.63 * latAux * latAux
    - 194.56 * lonAux * lonAux * latAux
    + 119.79 * latAux * latAux * latAux;
  return { E: Math.round(E), N: Math.round(N) };
}

function emergencyCardHtml(){
  return `<div class="modal" data-stop="1" style="max-width:520px;">
    <div class="modal-head"><h2>🆘 Notfallkarte</h2><button class="x-btn" data-act="close-modal">×</button></div>

    <div class="detail-section" style="margin-top:0;">
      <h4>Alarmierung</h4>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="tel:1414" style="display:flex; justify-content:space-between; align-items:center; background:var(--danger); color:#fff; padding:12px 16px; border-radius:var(--radius); text-decoration:none; font-weight:700;">
          <span>🚁 Rega (Gebirgsnotfall)</span><span class="mono">1414</span>
        </a>
        <a href="tel:112" style="display:flex; justify-content:space-between; align-items:center; background:var(--ice-deep); color:#fff; padding:12px 16px; border-radius:var(--radius); text-decoration:none; font-weight:700;">
          <span>🆘 Europäischer Notruf</span><span class="mono">112</span>
        </a>
        <a href="tel:117" style="display:flex; justify-content:space-between; align-items:center; background:var(--ink-soft); color:#fff; padding:12px 16px; border-radius:var(--radius); text-decoration:none; font-weight:700;">
          <span>👮 Polizei</span><span class="mono">117</span>
        </a>
      </div>
    </div>

    <div class="detail-section">
      <h4>Notruf — die 5 W</h4>
      <p style="line-height:1.9; margin:0;">
        <strong>Wer</strong> meldet den Unfall?<br>
        <strong>Was</strong> ist passiert?<br>
        <strong>Wo</strong> — Ort/Koordinaten (siehe unten)?<br>
        <strong>Wie viele</strong> Verletzte, welcher Zustand?<br>
        <strong>Wetter</strong> — Sicht, Wind, Wolken vor Ort?
      </p>
      <p style="font-size:12.5px; color:var(--ink-faint); margin:8px 0 0 0;">Nicht auflegen, bis die Zentrale das Gespräch beendet.</p>
    </div>

    <div class="detail-section">
      <h4>📍 Aktueller Standort</h4>
      <button type="button" class="btn secondary" id="gps-fetch-btn">Standort abrufen</button>
      <p id="gps-status" style="font-size:13px; color:var(--ink-soft); margin-top:8px;"></p>
      <div id="gps-result" style="display:none; margin-top:10px;"></div>
    </div>

    <div class="detail-section">
      <h4>❄️ Lawinen-Notfall (Kameradenrettung)</h4>
      <ol style="padding-left:18px; line-height:2; margin:0;">
        <li>Ruhe bewahren, eigene Sicherheit prüfen (Nachlawine?)</li>
        <li>Verschwindepunkt der/des Verschütteten merken</li>
        <li>Notruf absetzen (1414 / 112) — wenn möglich jemand anderen damit beauftragen</li>
        <li>LVS auf Suchen schalten, Suchstreifen abgehen (Grobsuche)</li>
        <li>Feinsuche: LVS nah am Schnee, kreuzweise absuchen</li>
        <li>Sondieren am Signalpunkt, spiralförmig</li>
        <li>Zügig ausschaufeln — Kopf/Atemwege zuerst freilegen</li>
        <li>Erste Hilfe, vor Auskühlung schützen, auf Rettung warten</li>
      </ol>
      <p style="font-size:12.5px; color:var(--ink-faint); margin-top:8px;">Die Überlebenschance sinkt mit der Verschüttungsdauer rasch — schnelles, strukturiertes Handeln zählt.</p>
    </div>
  </div>`;
}

function startGpsLookup(){
  const statusEl = document.getElementById('gps-status');
  const resultEl = document.getElementById('gps-result');
  if(!navigator.geolocation){
    if(statusEl) statusEl.textContent = 'Geolokalisierung wird von diesem Gerät/Browser nicht unterstützt.';
    return;
  }
  if(statusEl) statusEl.textContent = 'Standort wird ermittelt…';
  if(resultEl) resultEl.style.display = 'none';
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude, lon = pos.coords.longitude, acc = pos.coords.accuracy;
      const lv95 = wgs84ToLV95(lat, lon);
      const wgsText = lat.toFixed(6) + ', ' + lon.toFixed(6);
      const lv95Text = lv95.E + ' / ' + lv95.N;
      if(statusEl) statusEl.textContent = '';
      if(resultEl){
        resultEl.style.display = '';
        resultEl.innerHTML = `
          <div class="field"><label>WGS84 (Breite, Länge)</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <input readonly value="${esc(wgsText)}" id="gps-wgs84-value" style="flex:1;"/>
              <button type="button" class="btn secondary" data-copy-target="gps-wgs84-value">Kopieren</button>
            </div>
          </div>
          <div class="field"><label>Schweizer Landeskoordinaten (LV95)</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <input readonly value="${esc(lv95Text)}" id="gps-lv95-value" style="flex:1;"/>
              <button type="button" class="btn secondary" data-copy-target="gps-lv95-value">Kopieren</button>
            </div>
          </div>
          <p style="font-size:12.5px; color:var(--ink-faint); margin:6px 0 0 0;">Genauigkeit: ±${Math.round(acc)} m</p>
          <button type="button" class="btn secondary" style="margin-top:10px;" onclick="renderMiniMap('emergency-map', ${lat}, ${lon}, 'Aktueller Standort')">🗺️ Karte anzeigen</button>
          <div id="emergency-map" style="margin-top:10px;"></div>
        `;
        resultEl.querySelectorAll('[data-copy-target]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const input = document.getElementById(btn.getAttribute('data-copy-target'));
            if(input){
              input.select();
              try{ navigator.clipboard.writeText(input.value); showToast('Kopiert.'); }
              catch(e){ showToast('Kopieren nicht möglich — bitte manuell markieren.', true); }
            }
          });
        });
      }
    },
    (err)=>{
      if(statusEl) statusEl.textContent = 'Standort konnte nicht ermittelt werden: ' + (err && err.message ? err.message : 'Zugriff verweigert oder kein Signal.');
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

/* ================= Karte (app-übergreifend geteilt, nur bei Bedarf geladen) ================= */
let leafletLoadPromise = null;
function ensureLeafletLoaded(){
  if(window.L) return Promise.resolve();
  if(leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject)=>{
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kartenbibliothek konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
  return leafletLoadPromise;
}
/* ================= Vollbild-Karte (generisch, für alle Kartenansichten) ================= */
function ensureFullscreenMapOverlay(){
  let overlay = document.getElementById('fullscreen-map-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'fullscreen-map-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; z-index:200; background:#000; display:none;';
    overlay.innerHTML = `
      <button id="fullscreen-map-close" style="position:absolute; top:14px; right:14px; z-index:210; background:#fff; color:#2B2019; border:2px solid rgba(0,0,0,0.15); border-radius:24px; padding:0 18px; height:46px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(0,0,0,0.5); display:flex; align-items:center; gap:6px;">✕ Schliessen</button>
      <div id="fullscreen-map-container" style="width:100%; height:100%;"></div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('fullscreen-map-close').addEventListener('click', closeTopOverlayLayer);
  }
  return overlay;
}
function openFullscreenMap(renderFn, onCloseCallback){
  const overlay = ensureFullscreenMapOverlay();
  overlay.style.display = 'block';
  overlay._onClose = onCloseCallback || null;
  renderFn('fullscreen-map-container');
  pushOverlayLayer(closeFullscreenMap);
}
function closeFullscreenMap(){
  const overlay = document.getElementById('fullscreen-map-overlay');
  if(!overlay) return;
  overlay.style.display = 'none';
  const container = document.getElementById('fullscreen-map-container');
  if(container) container.innerHTML = '';
  if(overlay._onClose){ overlay._onClose(); overlay._onClose = null; }
}
function destroyExistingMap(leafletContainerId){
  window.__activeLeafletMaps = window.__activeLeafletMaps || {};
  if(window.__activeLeafletMaps[leafletContainerId]){
    try{ window.__activeLeafletMaps[leafletContainerId].remove(); }catch(e){}
    delete window.__activeLeafletMaps[leafletContainerId];
  }
}
function registerMap(leafletContainerId, map){
  window.__activeLeafletMaps = window.__activeLeafletMaps || {};
  window.__activeLeafletMaps[leafletContainerId] = map;
}
function makeFullscreenButton(renderFn, onCloseCallback){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn secondary';
  btn.style.cssText = 'margin-top:8px; font-size:12.5px; padding:6px 12px;';
  btn.textContent = '⛶ Vollbild';
  btn.addEventListener('click', ()=> openFullscreenMap(renderFn, onCloseCallback||null));
  return btn;
}

/* ================= Kartenebenen: Landeskarte + Satellit (zum Wechseln) ================= */
function addBaseLayerSwitcher(map){
  const streetLayer = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
    maxZoom: 18,
    attribution: '© swisstopo'
  });
  const satelliteLayer = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', {
    maxZoom: 18,
    attribution: '© swisstopo'
  });
  // Zuschaltbare Overlays (zusätzlich zur Karte/Satellit-Auswahl, standardmässig aus) — offizielle
  // swisstopo-Routen-Ebenen, gerendert als Kacheln über der jeweils gewählten Grundkarte.
  const skitourenLayer = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo-karto.skitouren/default/current/3857/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© swisstopo'
  });
  streetLayer.addTo(map);
  L.control.layers(
    { '🗺️ Karte': streetLayer, '🛰️ Satellit': satelliteLayer },
    { '⛷️ Skitouren': skitourenLayer },
    { position: 'bottomleft', collapsed: true }
  ).addTo(map);
  return { streetLayer, satelliteLayer, skitourenLayer };
}

function renderMiniMap(containerId, lat, lon, label){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    mapDiv.style.cssText = isFullscreen
      ? 'height:100%; border-radius:0; overflow:hidden;'
      : 'height:220px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const map = L.map(mapDivId, {attributionControl:true}).setView([lat, lon], isFullscreen ? 15 : 14);
    registerMap(mapDivId, map);
    addBaseLayerSwitcher(map);
    L.marker([lat, lon]).addTo(map).bindPopup(label || '').openPopup();
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderMiniMap(id, lat, lon, label); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

function fetchLocationIntoForm(latInputId, lonInputId, statusId){
  const statusEl = document.getElementById(statusId);
  if(!navigator.geolocation){
    if(statusEl) statusEl.textContent = 'Geolokalisierung wird von diesem Gerät/Browser nicht unterstützt.';
    return;
  }
  if(statusEl) statusEl.textContent = 'Standort wird ermittelt…';
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const latInput = document.getElementById(latInputId);
      const lonInput = document.getElementById(lonInputId);
      if(latInput) latInput.value = lat;
      if(lonInput) lonInput.value = lon;
      if(statusEl) statusEl.textContent = '📍 Gespeichert: ' + lat.toFixed(5) + ', ' + lon.toFixed(5);
    },
    (err)=>{
      if(statusEl) statusEl.textContent = 'Standort konnte nicht ermittelt werden: ' + (err && err.message ? err.message : 'Zugriff verweigert oder kein Signal.');
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

/* ================= Interaktive Punkte-Karte (mehrere Stecknadeln, manuell setzbar) ================= */
function renderPointsEditorMap(containerId, hiddenInputId, listContainerId, manualTrackHiddenId, refTracks){
  // refTracks: Array von {coords, color, label} — beliebig viele statische Referenzlinien (z. B. hochgeladene GPX-Tracks), nur zur Orientierung, hier nicht bearbeitbar
  refTracks = Array.isArray(refTracks) ? refTracks.filter(rt=>rt && rt.coords && rt.coords.length) : [];
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const listEl = document.getElementById(listContainerId);
    const manualTrackHidden = manualTrackHiddenId ? document.getElementById(manualTrackHiddenId) : null;
    if(!el2 || !hiddenInput) return;
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';

    const wrapDiv = document.createElement('div');
    if(isFullscreen){
      wrapDiv.style.cssText = 'height:100%; display:flex; flex-direction:column; box-sizing:border-box; padding:56px 12px 12px 12px;';
    }
    const modeRow = document.createElement('div');
    modeRow.className = 'chips';
    modeRow.style.marginBottom = '8px';
    const pointModeBtn = document.createElement('button');
    pointModeBtn.type = 'button'; pointModeBtn.className = 'chip on'; pointModeBtn.style.background = 'var(--ice-deep)';
    pointModeBtn.textContent = '📍 Punkt setzen';
    const lineModeBtn = document.createElement('button');
    lineModeBtn.type = 'button'; lineModeBtn.className = 'chip';
    lineModeBtn.textContent = '✏️ Linie zeichnen';
    const routeModeBtn = document.createElement('button');
    routeModeBtn.type = 'button'; routeModeBtn.className = 'chip';
    routeModeBtn.textContent = '🧭 Route berechnen';
    modeRow.appendChild(pointModeBtn);
    modeRow.appendChild(lineModeBtn);
    modeRow.appendChild(routeModeBtn);
    wrapDiv.appendChild(modeRow);

    refTracks.forEach(rt=>{
      const refHint = document.createElement('p');
      refHint.className = 'hint';
      refHint.style.marginBottom = '4px';
      refHint.textContent = `${rt.label || 'Referenz-Track'} (zur Orientierung, nicht bearbeitbar hier).`;
      wrapDiv.appendChild(refHint);
    });

    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    if(isFullscreen){
      mapDiv.style.cssText = 'flex:1 1 auto; min-height:0; border-radius:0; overflow:hidden; border:none;';
    }else{
      mapDiv.style.cssText = 'height:260px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    }
    wrapDiv.appendChild(mapDiv);

    const lineActionsRow = document.createElement('div');
    lineActionsRow.style.cssText = 'display:none; gap:8px; margin-top:8px; flex-wrap:wrap;';
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button'; undoBtn.className = 'btn secondary'; undoBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    undoBtn.textContent = '↺ Letzten Punkt entfernen';
    const clearLineBtn = document.createElement('button');
    clearLineBtn.type = 'button'; clearLineBtn.className = 'btn secondary'; clearLineBtn.style.cssText = 'font-size:12.5px; padding:6px 12px; color:#B0392C;';
    clearLineBtn.textContent = '🗑️ Linie löschen';
    const finishBtn = document.createElement('button');
    finishBtn.type = 'button'; finishBtn.className = 'btn secondary'; finishBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    finishBtn.textContent = '✓ Linie fertig';
    lineActionsRow.appendChild(undoBtn);
    lineActionsRow.appendChild(clearLineBtn);
    lineActionsRow.appendChild(finishBtn);
    wrapDiv.appendChild(lineActionsRow);

    const routeActionsRow = document.createElement('div');
    routeActionsRow.style.cssText = 'display:none; gap:8px; margin-top:8px; flex-wrap:wrap; align-items:center;';
    const routeHint = document.createElement('p');
    routeHint.className = 'hint';
    routeHint.style.cssText = 'width:100%; margin:0 0 2px 0;';
    routeHint.textContent = 'Start, ggf. Zwischenziele und Ziel antippen — dann "Route berechnen". Die App sucht dann einen echten Wanderweg zwischen den Punkten.';
    const routeUndoBtn = document.createElement('button');
    routeUndoBtn.type = 'button'; routeUndoBtn.className = 'btn secondary'; routeUndoBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    routeUndoBtn.textContent = '↺ Letzten Wegpunkt entfernen';
    const clearRouteBtn = document.createElement('button');
    clearRouteBtn.type = 'button'; clearRouteBtn.className = 'btn secondary'; clearRouteBtn.style.cssText = 'font-size:12.5px; padding:6px 12px; color:#B0392C;';
    clearRouteBtn.textContent = '🗑️ Wegpunkte löschen';
    const calcRouteBtn = document.createElement('button');
    calcRouteBtn.type = 'button'; calcRouteBtn.className = 'btn'; calcRouteBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    calcRouteBtn.textContent = '🧭 Route berechnen';
    const routeStatus = document.createElement('p');
    routeStatus.style.cssText = 'width:100%; margin:4px 0 0 0; font-size:12.5px; color:var(--ink-soft);';
    routeActionsRow.appendChild(routeHint);
    routeActionsRow.appendChild(routeUndoBtn);
    routeActionsRow.appendChild(clearRouteBtn);
    routeActionsRow.appendChild(calcRouteBtn);
    routeActionsRow.appendChild(routeStatus);
    wrapDiv.appendChild(routeActionsRow);

    el2.appendChild(wrapDiv);

    let points = [];
    try{ points = JSON.parse(hiddenInput.value || '[]'); }catch(e){ points = []; }
    let manualTrack = [];
    if(manualTrackHidden){
      try{ manualTrack = JSON.parse(manualTrackHidden.value || '[]'); }catch(e){ manualTrack = []; }
    }
    let mode = 'point';

    const firstRefTrack = refTracks.length ? refTracks[0].coords : null;
    const center = points.length ? [points[0].lat, points[0].lon] : (manualTrack.length ? manualTrack[0] : (firstRefTrack ? firstRefTrack[0] : [46.8182, 8.2275]));
    const zoom = (points.length || manualTrack.length || firstRefTrack) ? 13 : 8;
    const map = L.map(mapDivId).setView(center, zoom);
    registerMap(mapDivId, map);
    addBaseLayerSwitcher(map);

    refTracks.forEach(rt=>{
      L.polyline(rt.coords, {color:'#ffffff', weight:6, opacity:0.6}).addTo(map);
      L.polyline(rt.coords, {color: rt.color || '#E8384F', weight:3, opacity:0.8}).addTo(map);
    });

    const markerLayer = L.layerGroup().addTo(map);
    let lineLayer = L.layerGroup().addTo(map);
    let routeLayer = L.layerGroup().addTo(map);
    let routeWaypoints = [];

    function persist(){
      hiddenInput.value = JSON.stringify(points);
      renderList();
    }
    function persistTrack(){
      if(manualTrackHidden) manualTrackHidden.value = JSON.stringify(manualTrack);
    }
    function renderList(){
      if(!listEl) return;
      if(!points.length){
        listEl.innerHTML = '<p style="font-size:12.5px; color:var(--ink-faint); margin:8px 0 0 0;">Noch keine Punkte gesetzt.</p>';
        return;
      }
      listEl.innerHTML = '<div class="chips" style="margin-top:8px;">' +
        points.map((p,i)=>`<span class="chip" style="background:var(--ice-light); border-color:transparent;">${(MAP_POINT_CATEGORIES[p.category||'']||MAP_POINT_CATEGORIES['']).icon} ${esc(p.label||'Punkt')}</span>`).join('') +
        '</div>';
    }

    function buildPopupContent(point){
      const wrap = document.createElement('div');
      wrap.style.minWidth = '190px';
      const select = document.createElement('select');
      select.style.cssText = 'width:100%; margin-bottom:6px; padding:6px 8px; border:1px solid #ccc; border-radius:3px; font-size:13px; box-sizing:border-box;';
      Object.keys(MAP_POINT_CATEGORIES).forEach(key=>{
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = MAP_POINT_CATEGORIES[key].icon + ' ' + MAP_POINT_CATEGORIES[key].label;
        if((point.category||'') === key) opt.selected = true;
        select.appendChild(opt);
      });
      wrap.appendChild(select);
      const input = document.createElement('input');
      input.type = 'text';
      input.value = point.label || '';
      input.placeholder = 'z. B. Parkplatz, Haltestelle …';
      input.style.cssText = 'width:100%; margin-bottom:6px; padding:6px 8px; border:1px solid #ccc; border-radius:3px; font-size:13px; box-sizing:border-box;';
      wrap.appendChild(input);
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; gap:6px;';
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Speichern';
      saveBtn.style.cssText = 'flex:1; background:#4A3524; color:#fff; border:none; border-radius:3px; padding:6px 10px; font-size:12.5px; cursor:pointer;';
      saveBtn.addEventListener('click', ()=>{
        point.label = input.value.trim() || 'Punkt';
        point.category = select.value;
        persist();
        redraw();
        map.closePopup();
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Entfernen';
      delBtn.style.cssText = 'background:#fff; color:#B0392C; border:1px solid #B0392C; border-radius:3px; padding:6px 10px; font-size:12.5px; cursor:pointer;';
      delBtn.addEventListener('click', ()=>{
        points = points.filter(p=>p!==point);
        persist();
        redraw();
        map.closePopup();
      });
      btnRow.appendChild(saveBtn);
      btnRow.appendChild(delBtn);
      wrap.appendChild(btnRow);
      return wrap;
    }

    function redraw(){
      markerLayer.clearLayers();
      points.forEach(point=>{
        const marker = L.marker([point.lat, point.lon], {icon: makeCategoryIcon(point.category)}).addTo(markerLayer);
        marker.bindPopup(buildPopupContent(point));
        if(point._justAdded){ delete point._justAdded; marker.openPopup(); }
      });
    }
    function redrawLine(){
      lineLayer.clearLayers();
      if(manualTrack.length){
        L.polyline(manualTrack, {color:'#ffffff', weight:7, opacity:0.7}).addTo(lineLayer);
        L.polyline(manualTrack, {color:'#1565C0', weight:4, opacity:1}).addTo(lineLayer);
      }
    }
    redrawLine();

    function redrawRoute(){
      routeLayer.clearLayers();
      routeWaypoints.forEach((wp, i)=>{
        L.circleMarker(wp, {radius:8, color:'#fff', weight:2, fillColor:'#2F6B44', fillOpacity:1}).addTo(routeLayer)
          .bindTooltip(String(i+1), {permanent:true, direction:'center', className:'route-waypoint-label'});
      });
      if(routeWaypoints.length > 1){
        L.polyline(routeWaypoints, {color:'#2F6B44', weight:2, opacity:0.6, dashArray:'6,6'}).addTo(routeLayer);
      }
    }

    function setMode(newMode){
      mode = newMode;
      pointModeBtn.className = mode==='point' ? 'chip on' : 'chip';
      pointModeBtn.style.background = mode==='point' ? 'var(--ice-deep)' : '';
      lineModeBtn.className = mode==='line' ? 'chip on' : 'chip';
      lineModeBtn.style.background = mode==='line' ? 'var(--ice-deep)' : '';
      routeModeBtn.className = mode==='route' ? 'chip on' : 'chip';
      routeModeBtn.style.background = mode==='route' ? 'var(--ice-deep)' : '';
      lineActionsRow.style.display = mode==='line' ? 'flex' : 'none';
      routeActionsRow.style.display = mode==='route' ? 'flex' : 'none';
    }
    pointModeBtn.addEventListener('click', ()=> setMode('point'));
    lineModeBtn.addEventListener('click', ()=> setMode('line'));
    routeModeBtn.addEventListener('click', ()=> setMode('route'));
    undoBtn.addEventListener('click', ()=>{
      manualTrack.pop();
      redrawLine();
      persistTrack();
    });
    clearLineBtn.addEventListener('click', ()=>{
      manualTrack.length = 0;
      redrawLine();
      persistTrack();
    });
    finishBtn.addEventListener('click', ()=> setMode('point'));

    routeUndoBtn.addEventListener('click', ()=>{
      routeWaypoints.pop();
      redrawRoute();
    });
    clearRouteBtn.addEventListener('click', ()=>{
      routeWaypoints.length = 0;
      redrawRoute();
      routeStatus.textContent = '';
    });
    calcRouteBtn.addEventListener('click', async ()=>{
      routeStatus.textContent = 'Route wird berechnet…';
      calcRouteBtn.disabled = true;
      try{
        const calculated = await fetchCalculatedRoute(routeWaypoints);
        manualTrack = calculated;
        redrawLine();
        persistTrack();
        routeWaypoints = [];
        redrawRoute();
        routeStatus.textContent = '';
        setMode('point');
        showToast('Route berechnet und als Linie übernommen.');
      }catch(err){
        routeStatus.textContent = '⚠ ' + (err && err.message ? err.message : 'Route konnte nicht berechnet werden.');
      }
      calcRouteBtn.disabled = false;
    });

    map.on('click', (e)=>{
      if(mode==='line'){
        manualTrack.push([e.latlng.lat, e.latlng.lng]);
        redrawLine();
        persistTrack();
      }else if(mode==='route'){
        routeWaypoints.push([e.latlng.lat, e.latlng.lng]);
        redrawRoute();
      }else{
        points.push({ label:'', lat: e.latlng.lat, lon: e.latlng.lng, _justAdded:true });
        redraw();
        persist();
      }
    });

    redraw();
    renderList();
    if(!isFullscreen){
      const btn = makeFullscreenButton(
        function(id){ renderPointsEditorMap(id, hiddenInputId, null, manualTrackHiddenId, refTracks); },
        function(){ renderPointsEditorMap(containerId, hiddenInputId, listContainerId, manualTrackHiddenId, refTracks); }
      );
      wrapDiv.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

function renderPointsDisplayMap(containerId, points){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2 || !points.length) return;
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    mapDiv.style.cssText = isFullscreen
      ? 'height:100%; border-radius:0; overflow:hidden;'
      : 'height:240px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const map = L.map(mapDivId).setView([points[0].lat, points[0].lon], isFullscreen ? 14 : 13);
    registerMap(mapDivId, map);
    addBaseLayerSwitcher(map);
    const group = [];
    points.forEach(p=>{
      const m = L.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(esc(p.label||'Punkt'));
      group.push(m);
    });
    if(group.length > 1){
      map.fitBounds(L.featureGroup(group).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderPointsDisplayMap(id, points); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

/* ================= GPX-Tracks: automatische Vereinfachung + separater Volldownload ================= */
function douglasPeucker(points, tolerance){
  if(points.length < 3) return points;
  function perpendicularDistance(pt, lineStart, lineEnd){
    const dx = lineEnd.lat - lineStart.lat;
    const dy = lineEnd.lon - lineStart.lon;
    if(dx===0 && dy===0){
      return Math.sqrt(Math.pow(pt.lat-lineStart.lat,2)+Math.pow(pt.lon-lineStart.lon,2));
    }
    const t = ((pt.lat-lineStart.lat)*dx + (pt.lon-lineStart.lon)*dy) / (dx*dx+dy*dy);
    const closestLat = lineStart.lat + t*dx;
    const closestLon = lineStart.lon + t*dy;
    return Math.sqrt(Math.pow(pt.lat-closestLat,2)+Math.pow(pt.lon-closestLon,2));
  }
  function rdp(pts){
    if(pts.length < 3) return pts;
    let maxDist = 0, index = 0;
    for(let i=1;i<pts.length-1;i++){
      const d = perpendicularDistance(pts[i], pts[0], pts[pts.length-1]);
      if(d > maxDist){ maxDist = d; index = i; }
    }
    if(maxDist > tolerance){
      const left = rdp(pts.slice(0, index+1));
      const right = rdp(pts.slice(index));
      return left.slice(0,-1).concat(right);
    }
    return [pts[0], pts[pts.length-1]];
  }
  return rdp(points);
}

function simplifyTrackForStorage(points, targetCount){
  targetCount = targetCount || 200;
  if(points.length <= targetCount) return points;
  let tolerance = 0.00005;
  let simplified = points;
  let iterations = 0;
  while(simplified.length > targetCount && iterations < 20){
    simplified = douglasPeucker(points, tolerance);
    tolerance *= 1.6;
    iterations++;
  }
  return simplified;
}

function parseGpxTrackPoints(gpxText){
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, 'text/xml');
  const trkpts = Array.from(doc.getElementsByTagName('trkpt'));
  if(trkpts.length){
    return trkpts.map(pt=>({lat: parseFloat(pt.getAttribute('lat')), lon: parseFloat(pt.getAttribute('lon'))})).filter(p=>!isNaN(p.lat) && !isNaN(p.lon));
  }
  const rtepts = Array.from(doc.getElementsByTagName('rtept'));
  return rtepts.map(pt=>({lat: parseFloat(pt.getAttribute('lat')), lon: parseFloat(pt.getAttribute('lon'))})).filter(p=>!isNaN(p.lat) && !isNaN(p.lon));
}

function handleGpxFileUpload(fileInputEl, trackPathPrefix, tourIdHiddenId, simplifiedHiddenId, statusId){
  const file = fileInputEl.files && fileInputEl.files[0];
  if(!file) return;
  const statusEl = document.getElementById(statusId);
  if(statusEl) statusEl.textContent = 'GPX-Datei wird gelesen…';
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const gpxText = reader.result;
      const points = parseGpxTrackPoints(gpxText);
      if(!points.length){
        if(statusEl) statusEl.textContent = 'Keine Track-Punkte in dieser Datei gefunden.';
        return;
      }
      const simplified = simplifyTrackForStorage(points, 200);
      const simplifiedInput = document.getElementById(simplifiedHiddenId);
      if(simplifiedInput) simplifiedInput.value = JSON.stringify(simplified.map(p=>[Math.round(p.lat*1e6)/1e6, Math.round(p.lon*1e6)/1e6]));

      const tourIdInput = document.getElementById(tourIdHiddenId);
      let trackId = tourIdInput.value;
      if(!trackId){ trackId = uid('t'); tourIdInput.value = trackId; }

      if(statusEl) statusEl.textContent = 'Original wird hochgeladen…';
      const ok = await fbSet(trackPathPrefix + '/' + trackId, { gpx: gpxText, uploadedAt: new Date().toISOString(), fileName: file.name }).catch(()=>false);
      if(statusEl){
        statusEl.textContent = ok
          ? `✓ GPX übernommen: ${points.length} Punkte aufgezeichnet, für die Karte auf ${simplified.length} Punkte vereinfacht. Original bleibt zum Download verfügbar.`
          : 'Vereinfachte Linie übernommen, Original konnte aber nicht hochgeladen werden (Internetverbindung prüfen).';
      }
    }catch(err){
      if(statusEl) statusEl.textContent = 'Fehler beim Verarbeiten der GPX-Datei: ' + (err && err.message ? err.message : err);
    }
  };
  reader.onerror = ()=>{ if(statusEl) statusEl.textContent = 'Datei konnte nicht gelesen werden.'; };
  reader.readAsText(file);
}

/* ================= Routenplaner (OpenRouteService) =================
   Kostenlosen API-Key holen: https://openrouteservice.org/dev/#/signup
   (Free-Plan, kein Kreditkarte nötig). Key hier eintragen, um die
   Routenberechnung zu aktivieren — ohne Key gibt's nur eine klare
   Fehlermeldung im UI, der Rest der App funktioniert unabhängig davon. */
const OPENROUTESERVICE_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImMzNGNmZWNmY2Q3YzRjODlhNGJkNzVjOThlZjkyMjg4IiwiaCI6Im11cm11cjY0In0=';

async function fetchCalculatedRoute(waypoints){
  // waypoints: Array von [lat, lon], mindestens 2 Punkte.
  if(!OPENROUTESERVICE_API_KEY){
    throw new Error('Noch kein API-Key für die Routenberechnung hinterlegt.');
  }
  if(!waypoints || waypoints.length < 2){
    throw new Error('Mindestens zwei Punkte (Start und Ziel) nötig.');
  }
  const coordinates = waypoints.map(w=> [w[1], w[0]]); // ORS erwartet [lon, lat]
  let res;
  try{
    res = await fetch('https://api.openrouteservice.org/v2/directions/foot-hiking/geojson', {
      method: 'POST',
      headers: { 'Authorization': OPENROUTESERVICE_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates })
    });
  }catch(e){
    throw new Error('Route konnte nicht berechnet werden (keine Internetverbindung?).');
  }
  if(!res.ok){
    let msg = 'Route konnte nicht berechnet werden.';
    try{ const err = await res.json(); if(err && err.error && err.error.message) msg = err.error.message; }catch(e){}
    throw new Error(msg);
  }
  const data = await res.json();
  const coords = (data.features && data.features[0] && data.features[0].geometry.coordinates) || [];
  return coords.map(c=> [c[1], c[0]]); // zurück zu [lat, lon]
}

// Baut aus einer Koordinatenliste eine GPX-Datei und löst den Download aus —
// für manuell gezeichnete oder berechnete Tracks (kein Original-Upload nötig).
function downloadTrackAsGpx(coords, name){
  if(!coords || !coords.length){ showToast('Kein Track zum Exportieren vorhanden.', true); return; }
  const points = coords.map(c=> `    <trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Firnspur" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk>\n    <name>${esc(name || 'Track')}</name>\n    <trkseg>\n${points}\n    </trkseg>\n  </trk>\n</gpx>`;
  const blob = new Blob([gpx], {type:'application/gpx+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (name || 'track').replace(/[^a-z0-9äöüÄÖÜ_\- ]/gi,'').trim() + '.gpx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

async function downloadFullGpx(trackPathPrefix, tourId, tourName){
  try{
    const data = await fbGet(trackPathPrefix + '/' + tourId);
    if(!data || !data.gpx){ showToast('Keine hochgeladene GPX-Datei für diese Tour gefunden.', true); return; }
    const blob = new Blob([data.gpx], {type:'application/gpx+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (tourName || 'tour').replace(/[^a-z0-9äöüÄÖÜ_\- ]/gi,'').trim() + '.gpx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }catch(err){
    showToast('GPX-Datei konnte nicht heruntergeladen werden.', true);
  }
}

function renderTrackDisplayMap(containerId, points, trackCoords, manualTrackCoords, offlineId){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const hasTrack = trackCoords && trackCoords.length;
    const hasManualTrack = manualTrackCoords && manualTrackCoords.length;
    const hasPoints = points && points.length;
    if(!hasTrack && !hasManualTrack && !hasPoints) return;
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    mapDiv.style.cssText = isFullscreen
      ? 'height:100%; border-radius:0; overflow:hidden;'
      : 'height:240px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const startView = hasTrack ? trackCoords[0] : (hasManualTrack ? manualTrackCoords[0] : [points[0].lat, points[0].lon]);
    const map = L.map(mapDivId).setView(startView, isFullscreen ? 14 : 13);
    registerMap(mapDivId, map);
    if(offlineId){
      createOfflineAwareTileLayer(offlineId).addTo(map); // Offline-Kacheln nur für die Landeskarte zwischengespeichert — kein Ebenen-Wechsel hier
    }else{
      addBaseLayerSwitcher(map);
    }
    if(offlineId && gpsActiveOfflineId === offlineId){
      startLiveGpsOnMap(map, offlineId); // GPS lief bereits für diese Tour — auf die neue Karte (z. B. Vollbild) mitnehmen
    }
    const boundsItems = [];
    if(hasTrack){
      L.polyline(trackCoords, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
      const line = L.polyline(trackCoords, {color:'#E8384F', weight:4, opacity:1}).addTo(map);
      boundsItems.push(line);
    }
    if(hasManualTrack){
      L.polyline(manualTrackCoords, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
      const line2 = L.polyline(manualTrackCoords, {color:'#1565C0', weight:4, opacity:1}).addTo(map);
      boundsItems.push(line2);
    }
    if(hasPoints){
      points.forEach(p=>{
        const m = L.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(esc(p.label||'Punkt'));
        boundsItems.push(m);
      });
    }
    if(boundsItems.length){
      map.fitBounds(L.featureGroup(boundsItems).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderTrackDisplayMap(id, points||[], trackCoords||[], manualTrackCoords||[], offlineId); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

/* ================= Hütten-Karte: Sommer-GPX (gelb) + Winter-GPX (blau) + selbst eingezeichnet (rot) ================= */
function renderHutTrackDisplayMap(containerId, points, summerTrack, winterTrack, manualTrack){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const hasSummer = summerTrack && summerTrack.length;
    const hasWinter = winterTrack && winterTrack.length;
    const hasManual = manualTrack && manualTrack.length;
    const hasPoints = points && points.length;
    if(!hasSummer && !hasWinter && !hasManual && !hasPoints) return;
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    mapDiv.style.cssText = isFullscreen
      ? 'height:100%; border-radius:0; overflow:hidden;'
      : 'height:240px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const startView = hasSummer ? summerTrack[0] : (hasWinter ? winterTrack[0] : (hasManual ? manualTrack[0] : [points[0].lat, points[0].lon]));
    const map = L.map(mapDivId).setView(startView, isFullscreen ? 14 : 13);
    registerMap(mapDivId, map);
    addBaseLayerSwitcher(map);
    const boundsItems = [];
    if(hasSummer){
      L.polyline(summerTrack, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
      const line = L.polyline(summerTrack, {color:'#E8B93E', weight:4, opacity:1}).addTo(map);
      boundsItems.push(line);
    }
    if(hasWinter){
      L.polyline(winterTrack, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
      const line = L.polyline(winterTrack, {color:'#1565C0', weight:4, opacity:1}).addTo(map);
      boundsItems.push(line);
    }
    if(hasManual){
      L.polyline(manualTrack, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
      const line = L.polyline(manualTrack, {color:'#E8384F', weight:4, opacity:1}).addTo(map);
      boundsItems.push(line);
    }
    if(hasPoints){
      points.forEach(p=>{
        const m = L.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(esc(p.label||'Punkt'));
        boundsItems.push(m);
      });
    }
    if(boundsItems.length){
      map.fitBounds(L.featureGroup(boundsItems).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderHutTrackDisplayMap(id, points||[], summerTrack||[], winterTrack||[], manualTrack||[]); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

/* ================= Touren mit gemeinsamem Ausgangspunkt verknüpfen ================= */
function haversineMeters(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}
function findToursSharingPoints(currentTour, allTours, maxMeters){
  maxMeters = maxMeters || 300;
  const myPoints = currentTour.points || [];
  if(!myPoints.length) return [];
  return allTours.filter(t=>{
    if(t.id === currentTour.id) return false;
    const otherPoints = t.points || [];
    return otherPoints.some(op => myPoints.some(mp => haversineMeters(mp.lat, mp.lon, op.lat, op.lon) <= maxMeters));
  });
}

/* ================= Schnell-Bearbeitung von Punkten/Linie direkt aus der Detailansicht ================= */
async function quickSaveMapEdits(kind, id, pointsHiddenId, manualTrackHiddenId){
  let points = [], manualTrack = [];
  try{ const pEl = document.getElementById(pointsHiddenId); points = pEl && pEl.value ? JSON.parse(pEl.value) : []; }catch(e){ points = []; }
  try{ const mEl = document.getElementById(manualTrackHiddenId); manualTrack = mEl && mEl.value ? JSON.parse(mEl.value) : []; }catch(e){ manualTrack = []; }
  const list = kind==='tour' ? state.tours : state.huts;
  const item = list.find(x=>x.id===id);
  if(!item) return;
  item.points = points;
  item.manualTrack = manualTrack;
  item.updatedAt = new Date().toISOString();
  item.updatedBy = state.myName;
  const saveFn = kind==='tour' ? saveTourCloud : saveHutCloud;
  const ok = await saveFn(item).catch(()=>false);
  item._unsynced = !ok;
  closeModal();
  state.modal = {type: kind==='tour' ? 'tour-detail' : 'hut-detail', payload:id};
  render();
  showToast(ok ? 'Punkte/Linie gespeichert.' : 'Lokal gespeichert, aber nicht synchronisiert.', !ok);
}
/* ================= Login (Firebase Authentication, einmalig pro Gerät) ================= */
const FIREBASE_API_KEY = 'AIzaSyDKHMUoOL5aosFU7OhCt22REbyOvXqAXmU';
const AUTH_EMAIL = 'firn@spur.so'; // gemeinsames Gruppen-Login — das Passwort ist das eigentliche Geheimnis
let authState = { idToken: null, refreshToken: null, expiresAt: 0 };

function loadAuthFromStorage(){
  try{
    const raw = localStorage.getItem('bergtouren-auth');
    if(raw) authState = JSON.parse(raw);
  }catch(e){ authState = { idToken: null, refreshToken: null, expiresAt: 0 }; }
}
function saveAuthToStorage(){
  try{ localStorage.setItem('bergtouren-auth', JSON.stringify(authState)); }catch(e){}
}
function clearAuth(){
  authState = { idToken: null, refreshToken: null, expiresAt: 0 };
  try{ localStorage.removeItem('bergtouren-auth'); }catch(e){}
}
function isLoggedIn(){
  return !!(authState.idToken && authState.refreshToken);
}

async function signInWithPassword(password){
  try{
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_API_KEY, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: AUTH_EMAIL, password: password, returnSecureToken: true })
    });
    if(!res.ok) return false;
    const data = await res.json();
    authState = {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (parseInt(data.expiresIn, 10) * 1000) - 60000
    };
    saveAuthToStorage();
    return true;
  }catch(e){ return false; }
}

async function refreshAuthToken(){
  if(!authState.refreshToken) return false;
  try{
    const res = await fetch('https://securetoken.googleapis.com/v1/token?key=' + FIREBASE_API_KEY, {
      method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(authState.refreshToken)
    });
    if(!res.ok){ clearAuth(); return false; }
    const data = await res.json();
    authState = {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (parseInt(data.expires_in, 10) * 1000) - 60000
    };
    saveAuthToStorage();
    return true;
  }catch(e){ return false; }
}

async function ensureValidAuthToken(){
  if(authState.idToken && Date.now() < authState.expiresAt) return true;
  if(authState.refreshToken) return await refreshAuthToken();
  return false;
}

function loginScreenHtml(){
  return `<div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;">
    <div style="max-width:340px; width:100%; text-align:center;">
      <div style="font-size:40px; margin-bottom:8px;">🔒</div>
      <h2 style="margin:0 0 20px 0;">Anmelden</h2>
      <input type="password" id="login-password-input" placeholder="Passwort" autofocus
        style="width:100%; padding:13px 14px; border:1px solid var(--line); border-radius:var(--radius); font-size:16px; margin-bottom:12px; box-sizing:border-box; font-family:inherit;"/>
      <button type="button" id="login-submit-btn" class="btn" style="width:100%;">Anmelden</button>
      <p id="login-error" style="color:var(--danger); font-size:13px; margin-top:14px; display:none;">Falsches Passwort — bitte nochmal versuchen.</p>
    </div>
  </div>`;
}

function wireLoginScreen(){
  const btn = document.getElementById('login-submit-btn');
  const input = document.getElementById('login-password-input');
  const errorEl = document.getElementById('login-error');
  if(!btn || !input) return;
  async function attemptLogin(){
    const pw = input.value;
    if(!pw) return;
    btn.disabled = true; btn.textContent = 'Prüfe…';
    if(errorEl) errorEl.style.display = 'none';
    const ok = await signInWithPassword(pw);
    if(ok){
      location.reload();
    }else{
      if(errorEl) errorEl.style.display = '';
      btn.disabled = false; btn.textContent = 'Anmelden';
      input.value = '';
      input.focus();
    }
  }
  btn.addEventListener('click', attemptLogin);
  input.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') attemptLogin(); });
}

/* ================= Tour-Status: Entwurf / Vollständig ================= */
async function toggleTourStatus(id){
  const t = state.tours.find(x=>x.id===id);
  if(!t) return;
  t.status = (t.status === 'vollstaendig') ? 'entwurf' : 'vollstaendig';
  t.updatedAt = new Date().toISOString();
  t.updatedBy = state.myName;
  const ok = await saveTourCloud(t).catch(()=>false);
  t._unsynced = !ok;
  render();
  showToast(t.status === 'vollstaendig' ? '✅ Als vollständig markiert.' : '📝 Als Entwurf markiert.', !ok);
}
function tourStatusLabel(t){
  return (!t.status || t.status==='entwurf') ? '📝 Entwurf' : '✅ Vollständig';
}
async function toggleHutStatus(id){
  const h = state.huts.find(x=>x.id===id);
  if(!h) return;
  h.status = (h.status === 'vollstaendig') ? 'entwurf' : 'vollstaendig';
  h.updatedAt = new Date().toISOString();
  h.updatedBy = state.myName;
  const ok = await saveHutCloud(h).catch(()=>false);
  h._unsynced = !ok;
  render();
  showToast(h.status === 'vollstaendig' ? '✅ Als vollständig markiert.' : '📝 Als Entwurf markiert.', !ok);
}
function hutStatusLabel(h){
  return (!h.status || h.status==='entwurf') ? '📝 Entwurf' : '✅ Vollständig';
}

/* ================= Zurück-Taste/X schliesst immer nur die zuoberst offene Ebene =================
   Es gibt zwei Arten von "Ebenen":
   - das Modal-System (state.modal) — verschachtelte Fenster (z. B. Zustieg-Detail über Hütten-Detail)
     schliessen sich dort Schritt für Schritt zur jeweiligen Elternebene (siehe closeModal()); dafür
     wird EIN History-Eintrag "offen gehalten", solange irgendein Modal sichtbar ist, und erst beim
     endgültigen Schliessen (state.modal wird null) konsumiert.
   - "Overlay-Ebenen" (Vollbild-Karte, Bild-Vollbildansicht) liegen visuell über dem Modal-System und
     sind komplett unabhängig davon; jede pusht ihren eigenen History-Eintrag, damit Zurück/Hardware-
     Zurück erst diese schliesst, bevor je wieder das Modal darunter betroffen ist. */
let modalHistoryPushed = false;
let overlayLayers = []; // Stack von Close-Callbacks, zuletzt geöffnete Overlay-Ebene zuoberst
let suppressNextPopstateHandling = false;

function pushModalHistoryIfNeeded(){
  if(!modalHistoryPushed){
    try{ history.pushState({fsLayer:'modal'}, '', location.href); }catch(e){}
    modalHistoryPushed = true;
  }
}

// Von uns selbst ausgelöstes "Zurück" (X-Button o. Ä.): konsumiert den zugehörigen History-Eintrag,
// ohne dass der popstate-Handler die Ebene ein zweites Mal schliesst.
function consumeHistoryEntry(){
  suppressNextPopstateHandling = true;
  try{ history.back(); }catch(e){ suppressNextPopstateHandling = false; }
}

// Registriert eine neue Overlay-Ebene (Vollbild-Karte, Bild-Vollbildansicht) über dem Modal-System.
// closeFn schliesst die Ebene rein visuell (DOM ausblenden/entfernen) und wird genau einmal aufgerufen —
// egal ob über einen Schliessen-Button (closeTopOverlayLayer) oder die Hardware-Zurück-Taste (popstate).
function pushOverlayLayer(closeFn){
  overlayLayers.push(closeFn);
  try{ history.pushState({fsLayer:'overlay'}, '', location.href); }catch(e){}
}
// Manuelles Schliessen der obersten Overlay-Ebene (Schliessen-Button/X).
function closeTopOverlayLayer(){
  if(!overlayLayers.length) return;
  const closeFn = overlayLayers.pop();
  if(closeFn){ try{ closeFn(); }catch(e){} }
  consumeHistoryEntry();
}

window.addEventListener('popstate', ()=>{
  if(suppressNextPopstateHandling){ suppressNextPopstateHandling = false; return; }
  // Oberste Ebene zuerst: offene Vollbild-Karte / Bild-Vollbildansicht schliesst nur sich selbst.
  if(overlayLayers.length){
    const closeFn = overlayLayers.pop();
    if(closeFn){ try{ closeFn(); }catch(e){} }
    return;
  }
  if(typeof state !== 'undefined' && state.modal){
    modalHistoryPushed = false;
    if(typeof closeModal === 'function'){ closeModal(true); }
    else{ state.modal = null; if(typeof render === 'function') render(); }
  }else{
    modalHistoryPushed = false;
  }
});

/* ================= Wischgeste zwischen den Apps (nur auf der oberen Umschalt-Leiste) ================= */
function wireAppSwitchSwipe(otherAppUrl){
  const bar = document.querySelector('.app-switch-bar');
  if(!bar) return;
  let startX = null, startY = null;
  bar.addEventListener('touchstart', (e)=>{
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive:true});
  bar.addEventListener('touchend', (e)=>{
    if(startX===null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = null; startY = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)){
      window.location.href = otherAppUrl;
    }
  });
}

/* ================= Vorlagen fuer ChatGPT/Gemini + Bedienungsanleitung (direkt in der App) ================= */
const VORLAGE_ANLEITUNG_TEXT = `# Anleitung für ChatGPT/Gemini: Touren-Daten im richtigen Format erstellen

Ziel: Erstelle eine gültige JSON-Datei nach dem Muster der Vorlage, mit einem oder
mehreren Touren-/Hütten-Einträgen. Diese Datei wird danach über die
"Importieren"-Funktion der App eingefügt.

## Wichtigste Regel: keine Halluzinationen

**Nur Fakten, niemals erfinden oder schätzen.** Trage ausschliesslich Informationen
ein, die aus der gegebenen Quelle (Screenshot, Text, Link) tatsächlich
hervorgehen. Wenn eine Information nicht eindeutig vorliegt, bleibt das
entsprechende Feld leer — auch wenn ein plausibler Wert naheliegend erscheint.
Das gilt für alle Felder gleichermassen, ganz besonders aber für Koordinaten
(siehe unten): Ein erfundener Standort ist schlimmer als ein fehlender.

## Wichtigste Regeln

- Struktur exakt beibehalten: \`{"tours": [...], "huts": [...]}\`
- **id**: IMMER eine neue, eindeutige Zeichenfolge pro Tour/Hütte (z. B. \`t_\` +
  zufällige Buchstaben/Zahlen, bzw. \`h_\` für Hütten). Niemals zwei Einträge mit
  gleicher id, ausser man will einen bestehenden Eintrag bewusst überschreiben.
- Alle Textfelder auf Deutsch.
- Felder, für die keine Information vorliegt, als leerer String \`""\` bzw. leeres
  Array \`[]\` lassen — NIEMALS raten oder erfinden.
- \`"conditions"\`: immer \`null\`, \`"completions"\`: immer \`[]\`
- \`"status"\`: neue Touren immer \`"entwurf"\` (bedeutet: noch nicht fertig
  ausgearbeitet/verifiziert)
- \`"createdAt"\`/\`"updatedAt"\`: aktuelles Datum im Format
  \`"2026-08-25T00:00:00.000Z"\` (Uhrzeit kann immer 00:00:00 sein)

## Standort-Punkte (points)

Sowohl Touren als auch Hütten haben ein Feld \`"points"\`: eine Liste von
Kartenpunkten, z. B. Parkplatz, Bushaltestelle, Ausgangspunkt, Hütte selbst.

\`\`\`json
"points": [
  {"label": "Parkplatz XY", "lat": 46.5, "lon": 7.9}
]
\`\`\`

- \`label\`: kurze Bezeichnung, was der Punkt ist
- \`lat\`/\`lon\`: WGS84-Koordinaten (Dezimalgrad, mit Punkt statt Komma)
- Mehrere Punkte pro Eintrag möglich
- **Koordinaten nur bei eindeutigen GPS-Daten eintragen.** Steht in der Quelle keine
  klare, konkrete Koordinate (z. B. ein GPS-Wert, ein exakter Kartenpunkt) — auch
  keine ungefähre Ortsangabe wie ein Ortsname oder eine grobe Beschreibung —
  bleibt \`"points": []\`. Kein Schätzen anhand von Ortsnamen, keine Koordinaten
  aus dem eigenen Wissen ergänzen, auch wenn der Ort bekannt vorkommt.
- \`"manualTrack"\`: immer \`[]\` lassen (wird nur direkt in der App per Hand
  gezeichnet, nicht per JSON-Import befüllt)

## Felder-Erklärung (Firnspur = Skitour)

- \`name\`: Gipfel/Bergmassiv (Pflichtfeld, Hauptname der Tour)
- \`routeName\`: Name der Route (optional, z. B. "Nordwand")
- \`difficulty\`: SAC-Skala: L, WS-, WS, WS+, ZS-, ZS, ZS+, S-, S, S+, SS (oder leer)
- \`targetAltitude\`: Gipfelhöhe in Metern (nur Zahl, als Text)
- \`elevationGain\`/\`elevationLoss\`: Höhenmeter Aufstieg / Abfahrt
- \`duration\`: Zeitbedarf, z. B. "4-5" oder "1:45-2:45"
- \`region\`: Wallis, Berner Oberland, Graubünden, Tessin, Zentralschweiz, Jura,
  Freiburger Alpen, Waadtländer Alpen (oder eigener Text)
- \`subregion\`: Teilgebiet/Pass innerhalb der Region (optional). Gültige Werte:
  - **Wallis**: Nikolaital/Zermatt, Saastal, Val d'Anniviers, Lötschental, Goms,
    Unterwallis, Nufenenpass, Grimselpass, Furkapass, Simplonpass,
    Grosser St. Bernhard
  - **Berner Oberland**: Lauterbrunnental, Haslital, Kandertal, Simmental,
    Diemtigtal, Justistal, Saanenland/Gstaad, Grimselpass, Sustenpass, Jochpass,
    Grosse Scheidegg
  - **Graubünden**: Engadin, Prättigau, Albula, Surselva, Bergell, Puschlav,
    Julierpass, Albulapass, Flüelapass, Ofenpass, Splügenpass, Berninapass
  - **Tessin**: Bedretto, Maggiatal, Blenio, Leventina, San Bernardino,
    Nufenenpass, Gotthardpass, Lukmanierpass
  - **Zentralschweiz**: Urner Alpen, Glarner Alpen, Nidwalden, Schwyz,
    Sustenpass, Klausenpass, Gotthardpass, Jochpass
  - **Jura**: Solothurner Jura, Waadtländer Jura, Baselbieter Jura,
    Neuenburger Jura, Passwang, Col de Pierre Pertuis, Balmberg
  - **Freiburger Alpen**: Gantrischgebiet, Vanil-Noir-Gebiet, Jaunpass
  - **Waadtländer Alpen**: Diablerets-Gebiet, Villars/Leysin-Gebiet,
    Col des Mosses, Col du Pillon, Col de la Croix

  Bei eigener/anderer region bleibt subregion leer.
- \`material\`: Liste aus: Steigeisen, Pickel, Gurt, Spaltenrettungsset
- \`exposition\`: Liste aus: N, NE, E, SE, S, SW, W, NW
- \`gefahren\`: Liste aus: Lawinenhang, Triebschnee, Steilhänge über 40°,
  Absturzgelände, Engpass, vereiste Passage, Gletscher/Spalten, schwierige
  Orientierung, Waldpassagen, Wechten
- \`glacier\`: "ja" oder "nein"
- \`ropeType\`: Gletscherseil, Einfachseil, Halbseilstrang, Zwillingsseil (oder leer)
- \`ropeLength\`: 30m, 40m, 50m, 60m, 70m (oder leer)
- \`crux\`: kurze Beschreibung der Schlüsselstelle
- \`tourLink\`: Link zur Quelle (falls vorhanden), sonst leer
- \`gpxLink\`: Link zu einer externen GPX-Datei (falls vorhanden), sonst leer
- \`approachTypes\`: Liste (mehrere möglich) aus: "auto", "oev", "seilbahn", "zufuss"
- \`stayTypes\`: Liste (mehrere möglich) aus: "tagestour", "huette", "biwak", "zelt"

## Felder-Erklärung (Fixseil = Hochtour/MSL) — zusätzlich zu obigem

- \`region\`/\`subregion\`/\`points\`: identisch zu Firnspur
- \`tourCategory\`: "hochtour" ODER "msl" — bestimmt, welche Feldgruppe ausgefüllt
  wird (die jeweils andere bleibt leer):

  **Falls tourCategory = "hochtour":**
  - \`difficulty\`: SAC-Skala wie oben (inkl. S+)
  - \`climbGrade\`: max. Felsschwierigkeit, franz. Skala (z. B. "3a")
  - \`glacier\`: "ja"/"nein"
  - \`crevasseRisk\`: "nein", "moeglich", "ausgepraegt"

  **Falls tourCategory = "msl" (Mehrseillängen-Klettertour):**
  - \`mandatoryDifficulty\`: obligatorische Schwierigkeit, franz. Skala
  - \`cruxDifficulty\`: Schlüsselstelle, franz. Skala
  - \`pitchCount\`: Anzahl Seillängen (Zahl als Text)
  - \`longestPitch\`: längste Seillänge (z. B. "35m")
  - \`protection\`: "sehr-gut", "gut", "alpin", oder "ernst"
  - \`descentType\`: "Fussabstieg", "Abseilen", oder "Kombination"

  Franz. Kletterskala: 1, 2a-, 2a, 2a+, 2b-, 2b, 2b+, 2c-, 2c, 2c+, 3a-, 3a, 3a+,
  3b-, 3b, 3b+, 3c-, 3c, 3c+, 4a- ... bis 7a (jeweils mit -/+ Abstufungen)

  - \`material\`: zusätzlich möglich: Helm, Eisschrauben, Schraubkarabiner, Prusik,
    Bandschlingen, Friends, Keile, Biwaksack, Stirnlampe
  - \`quickdrawCount\`: Anzahl Expressschlingen (Zahl als Text)
  - \`gefahren\` (Hochtour): Spalten, Steinschlag, Eispassage, Firngrat, Wechte,
    Absturzgelände, schwierige Wegfindung, brüchiger Fels, schwieriger Rückzug
  - \`gefahren\` (MSL): Steinschlag, brüchiger Fels, Runout, schwieriger Rückzug,
    nasser Fels, komplexer Abstieg, Abseilstellen, ausgesetzter Zustieg
  - \`ropeType\`: zusätzlich "Gletscherseil" möglich

## Felder-Erklärung (Hütten — identisch in Firnspur & Fixseil)

- \`name\`: Name der Hütte (Pflichtfeld)
- \`region\`/\`subregion\`: wie oben bei Touren
- \`altitude\`: Höhe der Hütte in Metern (nur Zahl, als Text)
- \`capacity\`: Betten/Kapazität, z. B. "60 Betten"
- \`staffedMonths\`: Liste der Monate, in denen die Hütte bewartet ist. Werte:
  "jan", "feb", "maer", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov",
  "dez". Leeres Array \`[]\`, falls unbewartet.
- \`staffedNote\`: Freitext-Präzisierung zur Bewartung (z. B. "nur an
  Wochenenden", "ab 20. Juni"), optional
- \`winterraum\`: Beschreibung Winterraum/Schutzraum (Kapazität, Zugang,
  Ausstattung)
- \`winterraumMonths\`: Liste der Monate, in denen der Winterraum/Schutzraum
  offen ist — gleiche Werte wie \`staffedMonths\`
- \`winterraumNote\`: Freitext-Präzisierung zum Schutzraum (z. B. "nur wenn
  unbewartet zugänglich"), optional
- \`hutLink\`: Link zur Hütten-Website, SAC-Seite o. Ä. (falls vorhanden), sonst
  leer
- \`approach\`: Anfahrt (Ausgangspunkt, Parkplatz, ÖV, Seilbahn)
- \`points\`: siehe oben — z. B. Hütte selbst + Parkplatz als zwei Punkte
- \`approachTypes\`: wie oben bei Touren (mehrere möglich) — bezieht sich hier auf die Anfahrt zum Ausgangspunkt/Zustieg zur Hütte
- \`accessElevationSummer\`/\`accessElevationWinter\`: Höhenmeter Zustieg, getrennt
  nach Sommer und Winter (nur Zahl, als Text)
- \`accessDurationSummer\`/\`accessDurationWinter\`: Zeitbedarf Zustieg, getrennt
  nach Sommer und Winter
- \`accessDifficultySummer\`/\`accessDifficultyWinter\`: SAC-Skala wie bei Touren,
  oder leer — getrennt nach Jahreszeit, da sich der Zustieg oft stark
  unterscheidet. Im Winter ist praktisch immer nur die SAC-Skala relevant.
- \`accessDifficultySummerT\`: Schweizer Wanderskala für den Sommerzustieg,
  falls es sich um einen reinen Wanderweg ohne Firn/Schnee-Querung handelt.
  Werte: "T1" (Wandern) bis "T6" (Schwieriges Alpinwandern). Nur beim
  Sommerzustieg relevant, nicht beim Winterzustieg. SAC-Skala und T-Skala
  schliessen sich nicht aus — je nach Charakter des Zustiegs kann auch nur
  eine der beiden ausgefüllt sein.
- \`accessSummer\`/\`accessWinter\`: Beschreibung der Zustiegsroute, getrennt nach
  Jahreszeit
- \`contact\`: Telefon/Website/Sektion
- \`notes\`: Sonstiges (z. B. Reservationshinweise)
- \`completions\`: immer \`[]\` (wird von der App selbst befüllt)

## Auftrag an ChatGPT/Gemini

Erstelle nach diesem Muster einen oder mehrere Touren-/Hütten-Einträge basierend
auf den Informationen, die ich dir gebe (z. B. Screenshot, Text, Link). Prüfe
zuerst, ob es sich um eine Tour (Gipfel, Route) oder eine Hütte
(Übernachtungsmöglichkeit) handelt, und trage den Eintrag entsprechend im
richtigen Feld ("tours" bzw. "huts") ein. Gib mir am Ende NUR die vollständige,
gültige JSON-Datei zurück, bereit zum Kopieren.
`;
const BEDIENUNGSANLEITUNG_TEXT = `# Firnspur & Fixseil — Bedienungsanleitung

Kurze Einführung für neue Nutzer:innen, mit Tipps und Tricks, die man beim ersten Mal leicht übersieht.

## Die zwei Apps

- **🎿 Firnspur** — für Skitouren (Winter)
- **🧗 Fixseil** — für Hochtouren & Mehrseillängen-Klettertouren (Sommer)

Beide teilen sich **Hütten** und **Agenda** — was du in der einen App an Hütten oder Terminen anlegst, siehst du auch in der anderen. Touren selbst sind pro App getrennt, weil Winter und Sommer inhaltlich zu unterschiedlich sind.

**Zwischen den Apps wechseln:** Entweder oben auf "🎿 Skitour" / "🧗 Hochtour/MSL" tippen, oder auf der oberen Leiste **nach links/rechts wischen**.

## Erstmaliges Einloggen

Beim ersten Öffnen erscheint ein Passwort-Feld. Einmal eingeben — danach bleibst du auf dem Gerät dauerhaft angemeldet, bis du den Browser-Speicher löschst.

## Grundlegende Navigation

Vier Reiter ganz oben in jeder App:
- **Touren** — alle erfassten Skitouren bzw. Hochtouren/MSL-Touren
- **Hütten** — appübergreifend geteilt
- **Agenda** — appübergreifend geteilte Terminplanung
- **Done** — eigene und fremde abgeschlossene Touren/Hütten, nach Person gruppiert

## Touren anlegen & bearbeiten

- **"+ Neue Tour"** oben im Touren-Reiter
- Felder sind grösstenteils **Kästchen zum Antippen** statt Freitext (Region, Schwierigkeit, Material, Gefahren, Anfahrt-Art, usw.) — schnelleres Erfassen, einheitlichere Daten
- **Tipp:** Ein bereits ausgewähltes Kästchen lässt sich durch **erneutes Antippen wieder abwählen** — falls man aus Versehen daneben tippt, muss man nicht zwingend eine andere Option wählen
- **Region wählen** → passende Teilgebiete/Pässe erscheinen automatisch darunter
- **Speichern-Button** bleibt beim Bearbeiten immer unten rechts sichtbar — kein Scrollen zum Speichern nötig

### Status "Entwurf" / "Vollständig"

Jede neue Tour startet als **📝 Entwurf** — das kennzeichnet: "Angaben evtl. noch nicht vollständig geprüft". Erst wenn die Tour wirklich fertig ausgearbeitet ist, in der Detailansicht auf den Status-Knopf tippen und auf **✅ Vollständig** umstellen. So sieht man auf einen Blick, welche Touren noch in Arbeit sind.

## Karte & Standortpunkte

Beim Bearbeiten einer Tour: **"🗺️ Karte öffnen"**

- **📍 Punkt setzen**: antippen → auf die Karte tippen → Kategorie wählen (Parkplatz, Wasserstelle, Gefahrenstelle, Rastplatz, Biwak, Toilette, Haltestelle, Abzweigung, Rückzugspunkt) → Bezeichnung eintragen → Speichern. Jede Kategorie hat ein eigenes farbiges Symbol auf der Karte.
- **✏️ Linie zeichnen**: antippen → jeder weitere Kartenklick fügt einen Wegpunkt zur blauen Linie hinzu. "↺ Letzten Punkt entfernen" bei Fehltipp, "✓ Linie fertig" zum Abschliessen.
- **⛶ Vollbild**: für genaueres Zoomen/Suchen — auf jeder Karte verfügbar
- **Tipp:** Direkt aus der Tour-**Detailansicht** lassen sich Punkte/Linie auch bearbeiten, ohne den Umweg über "Tour bearbeiten" zu gehen — Knopf "✏️ Punkte/Linie direkt bearbeiten"

### GPX-Tracks

- **Link zu einer GPX-Datei im Internet** eintragen, oder
- **Eigene GPX-Datei hochladen** — wird automatisch für die Kartenanzeige vereinfacht (spart Datenvolumen), die Originaldatei bleibt separat gespeichert und lässt sich jederzeit als Volldownload wieder herunterladen
- 🔴 Rot = aufgezeichneter GPX-Track, 🔵 Blau = selbst gezeichnete Linie — beide können gleichzeitig angezeigt werden

## Filtern & Sortieren

Im Touren-Reiter: **"🔍 Filter"** antippen, um nach Region und Schwierigkeit einzugrenzen (bei Fixseil zusätzlich getrennt für Hochtour/MSL). Die Zahl neben "Filter" zeigt, wie viele Filter gerade aktiv sind. Sortierung (nach Datum, Name, Schwierigkeit, usw.) daneben.

## Hütten

Wie Touren mit Region/Teilgebiet-Auswahl. Da sich der Zustieg je nach Jahreszeit stark unterscheiden kann, gibt's **getrennte Felder für Sommer- und Winter-Zustieg** (Höhenmeter, Zeitbedarf, Schwierigkeit, Beschreibung).

## Agenda

Termine appübergreifend sichtbar. Wählst du beim Erstellen eine bestehende Tour aus, stellt sich "Art" (Skitour/Hochtour/Mehrseillängen) automatisch passend ein. Status-Ablauf: Idee → Termin gesucht → Geplant → Bestätigt → Durchgeführt (oder Abgesagt).

## Notfallkarte

Roter **"SOS"**-Streifen am linken Bildschirmrand — immer erreichbar, auch ohne Login. Antippen **oder** nach rechts/unten wegziehen öffnet sie. Enthält:
- Direktwahl-Nummern (Rega 1414, Europanotruf 112, Polizei 117)
- Notruf-Checkliste ("5 W")
- **Standort abrufen** — zeigt aktuelle GPS-Koordinaten (WGS84 + Schweizer Landeskoordinaten) mit Kopieren-Knopf, plus Kartenanzeige
- Lawinen-Notfallblatt (Kameradenrettung-Ablauf)

## Daten importieren/exportieren

Oben in der App: **"Exportieren"** (eigene Sicherung) und **"Importieren"** (Daten von anderen einfügen). Beim Importieren findest du auch den Link zu den **Vorlagen für ChatGPT/Gemini** — damit können Kolleg:innen ihre KI Touren-Daten im richtigen Format ausgeben lassen, ohne die App-Struktur selbst kennen zu müssen.

## Tipps & Tricks im Überblick

- **Zurück-Taste** des Handys schliesst offene Fenster/Karten, statt die App zu verlassen
- **Wischen** auf der oberen App-Wechsel-Leiste wechselt zwischen Firnspur/Fixseil
- Jedes **Kästchen-Feld** (Region, Material, Gefahren, usw.) lässt sich durch erneutes Antippen wieder abwählen
- **Automatische Sicherung:** Offline erfasste Touren werden lokal gespeichert und synchronisieren sich automatisch, sobald wieder Internet da ist — auch nach einem Seiten-Neuladen
- **Wöchentliches Backup:** Jeden Montag wird der gesamte Datenbestand automatisch als Sicherung im GitHub-Repo abgelegt (Ordner \`backups/\`)
- Bei Fragen zum Dateiformat für den Import: Anleitung im \`vorlagen/\`-Ordner des Repos, direkt aus der App verlinkt

---
*Bei technischen Problemen oder Wünschen für neue Funktionen: an den App-Verantwortlichen wenden.*
`;

function escMd(s){
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`(.+?)`/g, '<code style="background:var(--ice-light); padding:1px 4px; border-radius:2px; font-family:\'JetBrains Mono\';">$1</code>');
  return out;
}
function renderMarkdownBasic(text){
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  lines.forEach(line=>{
    const l = line;
    if(/^### /.test(l)){
      if(inList){ html += '</ul>'; inList=false; }
      html += `<h4 style="margin-top:16px;">${escMd(l.slice(4))}</h4>`;
    }else if(/^## /.test(l)){
      if(inList){ html += '</ul>'; inList=false; }
      html += `<h3 style="margin-top:22px; font-size:17px;">${escMd(l.slice(3))}</h3>`;
    }else if(/^# /.test(l)){
      if(inList){ html += '</ul>'; inList=false; }
      html += `<h2 style="margin-top:4px;">${escMd(l.slice(2))}</h2>`;
    }else if(/^- /.test(l)){
      if(!inList){ html += '<ul style="margin:8px 0; padding-left:22px;">'; inList=true; }
      html += `<li style="margin-bottom:5px; line-height:1.5;">${escMd(l.slice(2))}</li>`;
    }else if(/^---\s*$/.test(l)){
      if(inList){ html += '</ul>'; inList=false; }
      html += '<hr style="border:none; border-top:1px solid var(--line); margin:18px 0;"/>';
    }else if(l.trim()===''){
      if(inList){ html += '</ul>'; inList=false; }
    }else{
      if(inList){ html += '</ul>'; inList=false; }
      html += `<p style="margin:8px 0; line-height:1.6;">${escMd(l)}</p>`;
    }
  });
  if(inList) html += '</ul>';
  return html;
}
function vorlagenModalHtml(tourVorlageJson){
  return `<div class="modal" data-stop="1" style="max-width:560px;">
    <div class="modal-head"><h2>📋 Ressourcen &amp; Vorlagen</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 16px 0;">Zum Weitergeben an Kolleg:innen — Bedienungsanleitung für neue Nutzer:innen, sowie JSON-Vorlage &amp; Anleitung für ChatGPT/Gemini, um Touren effizient per KI zu erfassen.</p>

    <div class="detail-section" style="margin-top:0;">
      <h4>📖 Bedienungsanleitung für neue Nutzer:innen</h4>
      <button type="button" class="btn secondary" data-act="open-bedienungsanleitung">📖 In Vollbild anzeigen</button>
    </div>

    <div class="detail-section">
      <h4>JSON-Vorlage (Beispiel-Tour &amp; -Hütte)</h4>
      <textarea readonly id="vorlage-json-text" style="width:100%; min-height:140px; font-family:'JetBrains Mono'; font-size:11px;">${tourVorlageJson}</textarea>
      <button type="button" class="btn secondary" style="margin-top:8px;" data-act="copy-vorlage" data-target="vorlage-json-text">📋 Vorlage kopieren</button>
    </div>

    <div class="detail-section">
      <h4>Anleitung für die KI (ChatGPT/Gemini)</h4>
      <textarea readonly id="vorlage-anleitung-text" style="width:100%; min-height:140px; font-family:'JetBrains Mono'; font-size:11px;">${VORLAGE_ANLEITUNG_TEXT}</textarea>
      <button type="button" class="btn secondary" style="margin-top:8px;" data-act="copy-vorlage" data-target="vorlage-anleitung-text">📋 Anleitung kopieren</button>
    </div>
  </div>`;
}

function bedienungsanleitungModalHtml(){
  return `<div class="modal" data-stop="1" style="max-width:640px;">
    <div class="modal-head"><h2>📖 Bedienungsanleitung</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <div style="max-height:72vh; overflow-y:auto; padding-right:4px;">${renderMarkdownBasic(BEDIENUNGSANLEITUNG_TEXT)}</div>
  </div>`;
}

function copyTextareaContent(textareaId){
  const el = document.getElementById(textareaId);
  if(!el) return;
  el.select();
  el.setSelectionRange(0, 999999);
  try{
    navigator.clipboard.writeText(el.value);
    showToast('Kopiert.');
  }catch(e){
    try{ document.execCommand('copy'); showToast('Kopiert.'); }
    catch(e2){ showToast('Kopieren nicht möglich — bitte manuell markieren und kopieren.', true); }
  }
}

const HIKE_SCALE = {
  'T1': {label:'Wandern', color:'#5FA8D3', desc:'Weg gut gebahnt, keine Absturzgefahr.'},
  'T2': {label:'Bergwandern', color:'#2E7EB0', desc:'Weg mit durchgehendem Trassee, kann steil sein.'},
  'T3': {label:'Anspruchsvolles Bergwandern', color:'#C9A227', desc:'Weg nicht immer sichtbar, exponierte Stellen teils gesichert.'},
  'T4': {label:'Alpinwandern', color:'#D97B3E', desc:'Weglos oder spärlich markiert, anspruchsvolles Gelände, Hände nötig.'},
  'T5': {label:'Anspruchsvolles Alpinwandern', color:'#C2452D', desc:'Exponiert, weglos, evtl. Firn/Blockgletscher.'},
  'T6': {label:'Schwieriges Alpinwandern', color:'#8A2E2E', desc:'Sehr exponiert, Gletscher/Firn, Kletterstellen bis II.'}
};
const HIKE_SCALE_ORDER = ['T1','T2','T3','T4','T5','T6'];

const MONTHS = [
  {key:'jan', label:'Jan.'}, {key:'feb', label:'Feb.'}, {key:'maer', label:'März'},
  {key:'apr', label:'Apr.'}, {key:'mai', label:'Mai'}, {key:'jun', label:'Juni'},
  {key:'jul', label:'Juli'}, {key:'aug', label:'Aug.'}, {key:'sep', label:'Sept.'},
  {key:'okt', label:'Okt.'}, {key:'nov', label:'Nov.'}, {key:'dez', label:'Dez.'}
];
function monthChipsRowHtml(fieldClass, fullMonths, partialMonths){
  const full = Array.isArray(fullMonths) ? fullMonths : [];
  const partial = Array.isArray(partialMonths) ? partialMonths : [];
  return MONTHS.map(m=>{
    const state = full.includes(m.key) ? 'full' : (partial.includes(m.key) ? 'partial' : 'off');
    const style = state==='full' ? 'background:var(--ok); border-color:transparent; color:#fff;'
      : state==='partial' ? 'background:#E8B93E; border-color:transparent; color:#3D2E12;'
      : '';
    return `<button type="button" class="chip ${fieldClass}" data-month="${m.key}" data-state="${state}" style="${style}">${m.label}</button>`;
  }).join('');
}
function monthChipsReadonlyHtml(fullMonths, partialMonths, fullColorVar){
  const full = Array.isArray(fullMonths) ? fullMonths : [];
  const partial = Array.isArray(partialMonths) ? partialMonths : [];
  return MONTHS.map(m=>{
    if(full.includes(m.key)) return `<span class="chip" style="background:${fullColorVar||'var(--ok)'}; border-color:transparent; color:#fff;">${m.label}</span>`;
    if(partial.includes(m.key)) return `<span class="chip" style="background:#E8B93E; border-color:transparent; color:#3D2E12;">${m.label}</span>`;
    return `<span class="chip" style="opacity:0.45;">${m.label}</span>`;
  }).join('');
}
function wireMonthCycleChips(root, selector){
  root.querySelectorAll(selector).forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const cur = chip.getAttribute('data-state') || 'off';
      const next = cur==='off' ? 'full' : (cur==='full' ? 'partial' : 'off');
      chip.setAttribute('data-state', next);
      chip.style.cssText = next==='full' ? 'background:var(--ok); border-color:transparent; color:#fff;'
        : next==='partial' ? 'background:#E8B93E; border-color:transparent; color:#3D2E12;'
        : '';
    });
  });
}

/* ================= Hütten-Zustiege: mehrere Varianten pro Hütte ================= */
const ACCESS_ROUTE_COLORS = ['#E8B93E','#1565C0','#E8384F','#2E7EB0','#8A2E2E','#3C7A52'];

function migrateHutAccessRoutes(h){
  if(Array.isArray(h.accessRoutes)) return h;
  h.accessRoutes = [];
  const hasSummer = h.accessElevationSummer || h.accessDurationSummer || h.accessDifficultySummer || h.accessDifficultySummerT || h.accessSummer || h.gpxLinkSummer || h.trackSimplifiedSummer;
  const hasWinter = h.accessElevationWinter || h.accessDurationWinter || h.accessDifficultyWinter || h.accessWinter || h.gpxLinkWinter || h.trackSimplifiedWinter;
  if(hasSummer){
    h.accessRoutes.push({
      id: uid('ar'), name:'Sommer', season:'sommer',
      elevation: h.accessElevationSummer||'', duration: h.accessDurationSummer||'',
      difficulty: h.accessDifficultySummer||'', difficultyT: h.accessDifficultySummerT||'',
      description: h.accessSummer||'', gpxLink: h.gpxLinkSummer||'',
      trackSimplified: h.trackSimplifiedSummer||null, manualTrack: (h.manualTrack||[])
    });
  }
  if(hasWinter){
    h.accessRoutes.push({
      id: uid('ar'), name:'Winter', season:'winter',
      elevation: h.accessElevationWinter||'', duration: h.accessDurationWinter||'',
      difficulty: h.accessDifficultyWinter||'', difficultyT:'',
      description: h.accessWinter||'', gpxLink: h.gpxLinkWinter||'',
      trackSimplified: h.trackSimplifiedWinter||null, manualTrack: []
    });
  }
  return h;
}

function accessRouteDifficultyRangeHtml(routes){
  if(!routes || !routes.length) return '';
  const sacCodes = routes.map(r=>r.difficulty).filter(Boolean);
  const tCodes = routes.map(r=>r.difficultyT).filter(Boolean);
  const parts = [];
  if(sacCodes.length){
    const idxs = sacCodes.map(c=>DIFF_ORDER.indexOf(c)).filter(i=>i>=0);
    if(idxs.length){
      const lo = DIFF_ORDER[Math.min(...idxs)], hi = DIFF_ORDER[Math.max(...idxs)];
      parts.push(lo===hi ? `SAC ${lo}` : `SAC ${lo}–${hi}`);
    }
  }
  if(tCodes.length){
    const idxs = tCodes.map(c=>HIKE_SCALE_ORDER.indexOf(c)).filter(i=>i>=0);
    if(idxs.length){
      const lo = HIKE_SCALE_ORDER[Math.min(...idxs)], hi = HIKE_SCALE_ORDER[Math.max(...idxs)];
      parts.push(lo===hi ? lo : `${lo}–${hi}`);
    }
  }
  return parts.join(' · ');
}
function accessRouteLegendHtml(routes){
  return routes.map((r,i)=>{
    const color = ACCESS_ROUTE_COLORS[i % ACCESS_ROUTE_COLORS.length];
    const hasTrack = (r.trackSimplified && r.trackSimplified.length) || (r.manualTrack && r.manualTrack.length);
    if(!hasTrack) return '';
    return `<span class="hint" style="display:inline-flex; align-items:center; gap:4px; margin-right:10px;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>${esc(r.name)}</span>`;
  }).filter(Boolean).join('');
}

function renderHutAccessRoutesMap(containerId, points, routes){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const tracks = (routes||[]).map((r,i)=>({
      coords: (r.trackSimplified && r.trackSimplified.length) ? r.trackSimplified : (r.manualTrack && r.manualTrack.length ? r.manualTrack : null),
      color: ACCESS_ROUTE_COLORS[i % ACCESS_ROUTE_COLORS.length]
    })).filter(t=>t.coords);
    const hasPoints = points && points.length;
    if(!tracks.length && !hasPoints){
      if(el2) el2.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Keine Kartendaten vorhanden — noch kein Zustieg hat eine Linie oder einen GPX-Track.</p>';
      return;
    }
    const mapDivId = containerId + '-inner';
    destroyExistingMap(mapDivId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    mapDiv.style.cssText = isFullscreen
      ? 'height:100%; border-radius:0; overflow:hidden;'
      : 'height:240px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const startView = tracks.length ? tracks[0].coords[0] : [points[0].lat, points[0].lon];
    const map = L.map(mapDivId).setView(startView, isFullscreen ? 14 : 13);
    registerMap(mapDivId, map);
    addBaseLayerSwitcher(map);
    const boundsItems = [];
    tracks.forEach(t=>{
      try{
        L.polyline(t.coords, {color:'#ffffff', weight:7, opacity:0.7}).addTo(map);
        const line = L.polyline(t.coords, {color:t.color, weight:4, opacity:1}).addTo(map);
        boundsItems.push(line);
      }catch(e){ /* einzelne fehlerhafte Linie überspringen, Rest der Karte trotzdem zeigen */ }
    });
    if(hasPoints){
      points.forEach(p=>{
        try{
          const m = L.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(esc(p.label||'Punkt'));
          boundsItems.push(m);
        }catch(e){ /* einzelner fehlerhafter Punkt überspringen */ }
      });
    }
    if(boundsItems.length){
      map.fitBounds(L.featureGroup(boundsItems).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderHutAccessRoutesMap(id, points||[], routes||[]); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

function accessRouteFormHtml(hutId, route){
  const r = route || {};
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${route?'Zustieg bearbeiten':'Neuer Zustieg'}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <form id="access-route-form" novalidate>
      <input type="hidden" name="hutId" value="${esc(hutId)}"/>
      <input type="hidden" name="routeId" value="${esc(r.id||'')}"/>
      <div class="field"><label>Name des Zustiegs *</label><input required name="name" value="${esc(r.name||'')}" placeholder="z. B. Ab Randa"/></div>
      <div class="field"><label>Jahreszeit</label>
        <div class="chips">
          <button type="button" class="chip season-chip ${r.season==='sommer'?'on':''}" style="${r.season==='sommer'?'background:var(--ice-deep)':''}" data-value="sommer">🌞 Sommer</button>
          <button type="button" class="chip season-chip ${r.season==='winter'?'on':''}" style="${r.season==='winter'?'background:var(--ice-deep)':''}" data-value="winter">❄️ Winter</button>
        </div>
        <input type="hidden" name="season" id="access-route-season-hidden" value="${esc(r.season||'')}"/>
      </div>
      <div class="row2">
        <div class="field"><label>Höhenmeter (Hm)</label><input name="elevation" value="${esc(r.elevation||'')}"/></div>
        <div class="field"><label>Zeitbedarf</label><input name="duration" value="${esc(r.duration||'')}"/></div>
      </div>
      <div class="field"><label>Schwierigkeit (SAC)</label>
        <select name="difficulty">
          <option value="">— keine Angabe —</option>
          ${DIFF_ORDER.map(c=>`<option value="${c}" ${r.difficulty===c?'selected':''}>${c} — ${DIFF[c].label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Wanderskala (T)</label>
        <select name="difficultyT">
          <option value="">— keine Angabe —</option>
          ${HIKE_SCALE_ORDER.map(c=>`<option value="${c}" ${r.difficultyT===c?'selected':''}>${c} — ${HIKE_SCALE[c].label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Beschreibung</label><textarea name="description">${esc(r.description||'')}</textarea></div>
      <div class="field"><label>Link zu einer GPX-Datei</label><input type="url" name="gpxLink" value="${esc(r.gpxLink||'')}"/></div>
      <div class="field"><label>Eigenen GPX-Track hochladen</label>
        <input type="file" id="access-route-gpx-input" accept=".gpx,application/gpx+xml"/>
        <p id="access-route-gpx-status" style="font-size:12.5px; color:var(--ink-soft); margin-top:6px;">${r.trackSimplified ? '✓ GPX-Track bereits hochgeladen.' : 'Noch kein Track hochgeladen.'}</p>
        <input type="hidden" name="trackSimplified" id="access-route-track-hidden" value='${esc(r.trackSimplified ? JSON.stringify(r.trackSimplified) : "")}'/>
        <input type="hidden" name="routeIdForTrack" id="access-route-id-for-track" value="${esc(r.id||'')}"/>
      </div>
      <div class="field"><label>Route auf der Karte einzeichnen (falls kein GPX vorhanden)</label>
        <button type="button" class="btn secondary" id="access-route-map-toggle-btn">🗺️ Karte öffnen</button>
        <div class="hint">✏️ Linie zeichnen: antippen fügt Wegpunkte hinzu.</div>
        <div id="access-route-map" style="margin-top:10px; display:none;"></div>
        <input type="hidden" name="manualTrack" id="access-route-manual-track-hidden" value='${esc(JSON.stringify(r.manualTrack || []))}'/>
      </div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-act="close-modal">Abbrechen</button>
        ${route ? `<button type="button" class="btn danger" data-act="delete-access-route" data-hut-id="${esc(hutId)}" data-route-id="${esc(r.id)}" style="margin-right:auto;">Löschen</button>` : ''}
        <button type="button" id="access-route-save-btn" class="btn">${route?'Speichern':'Zustieg hinzufügen'}</button>
      </div>
    </form>
  </div>`;
}

function accessRouteRowHtml(r, index, hutId){
  const color = ACCESS_ROUTE_COLORS[index % ACCESS_ROUTE_COLORS.length];
  const seasonIcon = r.season==='sommer' ? '🌞' : (r.season==='winter' ? '❄️' : '📍');
  const diffBadges = [];
  if(r.difficulty) diffBadges.push(`<span class="badge" style="background:${(DIFF[r.difficulty]||DIFF.L).color}">SAC ${r.difficulty}</span>`);
  if(r.difficultyT) diffBadges.push(`<span class="badge" style="background:${(HIKE_SCALE[r.difficultyT]||HIKE_SCALE.T1).color}">${r.difficultyT}</span>`);
  return `<div class="card" style="border-left-color:${color}; cursor:pointer; padding:14px;" data-act="open-access-route" data-hut-id="${hutId}" data-route-id="${r.id}" tabindex="0" role="button">
    <div class="card-top">
      <h3 style="font-size:15px;">${seasonIcon} ${esc(r.name)}</h3>
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; margin-top:4px;"></span>
    </div>
    ${(r.elevation || r.duration) ? `<div class="stat-row">
      ${r.elevation ? `<span>↑ <span class="mono">${esc(r.elevation)}</span> Hm</span>` : ''}
      ${r.duration ? `<span>⏱ <span class="mono">${esc(r.duration)}</span></span>` : ''}
    </div>` : ''}
    ${diffBadges.length ? `<div class="badge-row">${diffBadges.join(' ')}</div>` : ''}
    ${r.description ? `<p class="excerpt">${esc(r.description)}</p>` : ''}
  </div>`;
}

function accessRouteDetailHtml(hutId, route){
  const r = route;
  const seasonIcon = r.season==='sommer' ? '🌞' : (r.season==='winter' ? '❄️' : '📍');
  const seasonLabel = r.season==='sommer' ? 'Sommer' : (r.season==='winter' ? 'Winter' : '');
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${seasonIcon} ${esc(r.name)}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    ${seasonLabel ? `<span class="badge" style="background:var(--ice-deep); margin-bottom:10px; display:inline-block;">${seasonLabel}</span>` : ''}
    ${(r.elevation || r.duration) ? `<div class="detail-stats">
      ${r.elevation ? `<div class="detail-stat"><div class="num">${esc(r.elevation)}</div><div class="lbl">Hm</div></div>` : ''}
      ${r.duration ? `<div class="detail-stat"><div class="num">${esc(r.duration)}</div><div class="lbl">Zeitbedarf</div></div>` : ''}
    </div>` : ''}
    ${(r.difficulty || r.difficultyT) ? `<div style="margin:10px 0;">
      ${r.difficulty ? `<span class="badge" style="background:${(DIFF[r.difficulty]||DIFF.L).color}">SAC ${r.difficulty}</span> ` : ''}
      ${r.difficultyT ? `<span class="badge" style="background:${(HIKE_SCALE[r.difficultyT]||HIKE_SCALE.T1).color}">${r.difficultyT}</span>` : ''}
    </div>` : ''}
    ${r.description ? `<div class="detail-section"><h4>Beschreibung</h4><p>${esc(r.description)}</p></div>` : ''}
    ${r.gpxLink ? `<div class="detail-section"><h4>GPX-Link</h4><p><a href="${esc(r.gpxLink)}" target="_blank" rel="noopener noreferrer">${esc(r.gpxLink)}</a></p></div>` : ''}
    ${(r.trackSimplified || (r.manualTrack && r.manualTrack.length)) ? `<div class="detail-section">
      <h4>Karte</h4>
      <button type="button" class="btn secondary" data-act="show-access-route-map" data-track='${esc(JSON.stringify(r.trackSimplified||[]))}' data-manual-track='${esc(JSON.stringify(r.manualTrack||[]))}' data-target="map-access-route-${r.id}">🗺️ Karte anzeigen</button>
      <div id="map-access-route-${r.id}" style="margin-top:10px;"></div>
    </div>` : ''}
    <div class="form-actions">
      <button type="button" class="btn secondary" data-act="close-modal">Schliessen</button>
      <button type="button" class="btn" data-act="edit-access-route" data-hut-id="${esc(hutId)}" data-route-id="${esc(r.id)}">✏️ Bearbeiten</button>
    </div>
  </div>`;
}

/* ================= Topo-Bilder (MSL/Hochtour) — Cloud Storage ================= */
const TOPO_IMAGES_PATH = 'topoImages';
const TOPO_IMAGE_MAX_COUNT = 10;

function compressImageFile(file, maxWidth, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxWidth){ h = Math.round(h * (maxWidth / w)); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob)=>{
          if(blob) resolve(blob); else reject(new Error('Komprimierung fehlgeschlagen.'));
        }, 'image/jpeg', quality);
      };
      img.onerror = ()=> reject(new Error('Bild konnte nicht gelesen werden — ist es eine gültige Bilddatei?'));
      img.src = reader.result;
    };
    reader.onerror = ()=> reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

async function uploadTopoImageBlob(blob, storagePath){
  await ensureValidAuthToken();
  const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + authState.idToken, 'Content-Type': 'image/jpeg' },
    body: blob
  });
  if(!res.ok) throw new Error('Upload fehlgeschlagen (Status ' + res.status + ')');
  const data = await res.json();
  const token = data.downloadTokens;
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function deleteTopoImageFile(storagePath){
  try{
    await ensureValidAuthToken();
    const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}`;
    const res = await fetch(url, { method:'DELETE', headers:{ 'Authorization': 'Bearer ' + authState.idToken } });
    return res.ok;
  }catch(e){ return false; }
}

function topoImageThumbsHtml(hiddenListId){
  const hiddenInput = document.getElementById(hiddenListId);
  let images = [];
  try{ images = hiddenInput && hiddenInput.value ? JSON.parse(hiddenInput.value) : []; }catch(e){ images = []; }
  if(!images.length) return '';
  const imagesJson = esc(JSON.stringify(images.map(img=>({id:img.id, url:img.url}))));
  return `<div class="chips" style="margin-top:8px;">${images.map((img,i)=>
    `<span class="chip" style="background:var(--ice-light); border-color:transparent; padding:3px 8px 3px 3px; display:inline-flex; align-items:center; gap:6px;">
      <img src="${esc(img.url)}" data-act="view-topo-image" data-images='${imagesJson}' data-index="${i}" style="width:32px; height:32px; object-fit:cover; border-radius:2px; cursor:pointer;"/>
      Bild ${i+1}
      <button type="button" data-act="remove-topo-image-local" data-hidden-id="${hiddenListId}" data-image-id="${esc(img.id)}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; line-height:1; padding:0 2px;">×</button>
    </span>`
  ).join('')}</div>`;
}

function removeTopoImageLocal(hiddenListId, imageId){
  const hiddenInput = document.getElementById(hiddenListId);
  let images = [];
  try{ images = hiddenInput && hiddenInput.value ? JSON.parse(hiddenInput.value) : []; }catch(e){ images = []; }
  const removed = images.find(img=>img.id===imageId);
  images = images.filter(img=>img.id!==imageId);
  if(hiddenInput) hiddenInput.value = JSON.stringify(images);
  if(removed && removed.storagePath) deleteTopoImageFile(removed.storagePath).catch(()=>{});
  const thumbContainer = document.getElementById(hiddenListId + '-thumbs');
  if(thumbContainer) thumbContainer.innerHTML = topoImageThumbsHtml(hiddenListId);
}

function handleTopoImageUpload(fileInputEl, tourIdHiddenId, hiddenListId, statusId){
  const files = fileInputEl.files;
  if(!files || !files.length) return;
  const statusEl = document.getElementById(statusId);
  const hiddenInput = document.getElementById(hiddenListId);
  const tourIdInput = document.getElementById(tourIdHiddenId);
  let images = [];
  try{ images = hiddenInput && hiddenInput.value ? JSON.parse(hiddenInput.value) : []; }catch(e){ images = []; }
  let tourId = tourIdInput ? tourIdInput.value : '';
  if(!tourId){ tourId = uid('t'); if(tourIdInput) tourIdInput.value = tourId; }
  const filesToAdd = Array.from(files).slice(0, Math.max(0, TOPO_IMAGE_MAX_COUNT - images.length));
  if(!filesToAdd.length){
    if(statusEl) statusEl.textContent = `Maximal ${TOPO_IMAGE_MAX_COUNT} Bilder pro Tour — zuerst eins entfernen.`;
    fileInputEl.value = '';
    return;
  }
  (async ()=>{
    for(let i=0; i<filesToAdd.length; i++){
      const file = filesToAdd[i];
      if(statusEl) statusEl.textContent = `Bild ${images.length+1}/${TOPO_IMAGE_MAX_COUNT} wird komprimiert…`;
      try{
        const blob = await compressImageFile(file, 1200, 0.78);
        const imgId = uid('img');
        const storagePath = `${TOPO_IMAGES_PATH}/${tourId}/${imgId}.jpg`;
        if(statusEl) statusEl.textContent = `Bild ${images.length+1}/${TOPO_IMAGE_MAX_COUNT} wird hochgeladen…`;
        const url = await uploadTopoImageBlob(blob, storagePath);
        images.push({id: imgId, url, storagePath});
        if(hiddenInput) hiddenInput.value = JSON.stringify(images);
        const thumbContainer = document.getElementById(hiddenListId + '-thumbs');
        if(thumbContainer) thumbContainer.innerHTML = topoImageThumbsHtml(hiddenListId);
      }catch(err){
        if(statusEl) statusEl.textContent = 'Fehler beim Hochladen: ' + (err && err.message ? err.message : err);
        fileInputEl.value = '';
        return;
      }
    }
    if(statusEl) statusEl.textContent = `✓ ${images.length}/${TOPO_IMAGE_MAX_COUNT} Bilder hochgeladen.`;
    fileInputEl.value = '';
  })();
}

function topoImagesGalleryHtml(images){
  if(!images || !images.length) return '';
  const imagesJson = esc(JSON.stringify(images.map(img=>({id:img.id, url:img.url}))));
  return `<div class="chips topo-gallery" style="margin-top:6px;">${images.map((img,i)=>
    `<img src="${esc(img.url)}" data-act="view-topo-image" data-images='${imagesJson}' data-index="${i}" style="width:70px; height:70px; object-fit:cover; border-radius:var(--radius); border:1px solid var(--line); cursor:pointer;"/>`
  ).join('')}</div>`;
}

function showTopoImageLightbox(images, startIndex, offlineId){
  if(!images || !images.length) return;
  let idx = startIndex || 0;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; touch-action:pan-y;';

  const imgEl = document.createElement('img');
  imgEl.style.cssText = 'max-width:100%; max-height:100%; object-fit:contain; border-radius:4px; touch-action:none; transform-origin:center center;';
  overlay.appendChild(imgEl);

  // ===== Zoom (Pinch, Doppeltipp, Mausrad) & Verschieben im gezoomten Zustand =====
  const ZOOM_MIN = 1, ZOOM_MAX = 4;
  let scale = 1, panX = 0, panY = 0;
  function applyTransform(withTransition){
    imgEl.style.transition = withTransition ? 'transform 0.18s ease-out' : 'none';
    imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  function clampPan(){
    // Grobe Begrenzung, damit das Bild beim Verschieben nicht zu weit aus dem Bild verschwindet.
    const maxOffset = (scale - 1) * (imgEl.clientWidth || overlay.clientWidth) * 0.6;
    panX = Math.max(-maxOffset, Math.min(maxOffset, panX));
    const maxOffsetY = (scale - 1) * (imgEl.clientHeight || overlay.clientHeight) * 0.6;
    panY = Math.max(-maxOffsetY, Math.min(maxOffsetY, panY));
  }
  function resetZoom(withTransition){
    scale = 1; panX = 0; panY = 0;
    applyTransform(withTransition);
  }

  function closeLightbox(){ overlay.remove(); }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button'; closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:50%; width:40px; height:40px; font-size:22px; line-height:1;';
  closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closeTopOverlayLayer(); });
  overlay.appendChild(closeBtn);

  let counterEl = null;
  function goTo(n){ idx = (n + images.length) % images.length; resetZoom(false); updateImage(); }
  if(images.length > 1){
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button'; prevBtn.textContent = '‹';
    prevBtn.style.cssText = 'position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:50%; width:44px; height:44px; font-size:24px;';
    prevBtn.addEventListener('click', (e)=>{ e.stopPropagation(); goTo(idx-1); });
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button'; nextBtn.textContent = '›';
    nextBtn.style.cssText = 'position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.15); color:#fff; border:none; border-radius:50%; width:44px; height:44px; font-size:24px;';
    nextBtn.addEventListener('click', (e)=>{ e.stopPropagation(); goTo(idx+1); });
    counterEl = document.createElement('div');
    counterEl.style.cssText = 'position:absolute; bottom:16px; left:50%; transform:translateX(-50%); color:#fff; font-size:13px; background:rgba(0,0,0,0.5); padding:4px 12px; border-radius:12px;';
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(counterEl);
  }

  function updateImage(){
    const item = images[idx];
    // Bild sofort anzeigen — nicht auf die Offline-Prüfung warten, damit im
    // Zweifel (z. B. hängender IndexedDB-Zugriff) trotzdem etwas erscheint.
    imgEl.src = item.url;
    if(counterEl) counterEl.textContent = `${idx+1} / ${images.length}`;
    if(offlineId && item.id){
      const myIdx = idx;
      idbGet('images', offlineId + '_' + item.id).then(blob=>{
        if(blob && idx===myIdx){ imgEl.src = URL.createObjectURL(blob); } // nur ersetzen, falls zwischenzeitlich nicht weitergeblättert wurde
      }).catch(()=>{ /* kein Offline-Bild vorhanden — angezeigte URL bleibt bestehen */ });
    }
  }
  updateImage();

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay && scale===1) closeTopOverlayLayer(); });

  function touchDist(touches){
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  let touchStartX = null;
  let pinchStartDist = null, pinchStartScale = 1;
  let panStartX = null, panStartY = null, panOriginX = 0, panOriginY = 0;
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0;

  overlay.addEventListener('touchstart', (e)=>{
    if(e.touches.length === 2){
      touchStartX = null;
      pinchStartDist = touchDist(e.touches);
      pinchStartScale = scale;
    }else if(e.touches.length === 1){
      pinchStartDist = null;
      if(scale > 1){
        panStartX = e.touches[0].clientX; panStartY = e.touches[0].clientY;
        panOriginX = panX; panOriginY = panY;
      }else{
        touchStartX = e.touches[0].clientX;
      }
    }
  }, {passive:true});

  overlay.addEventListener('touchmove', (e)=>{
    if(e.touches.length === 2 && pinchStartDist){
      e.preventDefault();
      const newDist = touchDist(e.touches);
      scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartScale * (newDist / pinchStartDist)));
      clampPan();
      applyTransform(false);
    }else if(e.touches.length === 1 && panStartX !== null){
      e.preventDefault();
      panX = panOriginX + (e.touches[0].clientX - panStartX);
      panY = panOriginY + (e.touches[0].clientY - panStartY);
      clampPan();
      applyTransform(false);
    }
  }, {passive:false});

  overlay.addEventListener('touchend', (e)=>{
    if(e.touches.length > 0) return; // erst reagieren, wenn wirklich alle Finger weg sind
    if(pinchStartDist){
      pinchStartDist = null;
      if(scale < 1.05) resetZoom(true);
      return;
    }
    if(panStartX !== null){
      panStartX = null; panStartY = null;
      return;
    }
    if(touchStartX !== null){
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      touchStartX = null;
      if(Math.abs(dx) > 50){ goTo(dx>0 ? idx-1 : idx+1); return; }
      // Doppeltipp erkennen (zwei kurz aufeinanderfolgende Taps am gleichen Ort) → rein-/rauszoomen
      const now = Date.now();
      const closeToLastTap = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY) < 40;
      if(now - lastTapTime < 300 && closeToLastTap){
        if(scale > 1) resetZoom(true);
        else{ scale = 2.5; applyTransform(true); }
        lastTapTime = 0;
      }else{
        lastTapTime = now; lastTapX = touch.clientX; lastTapY = touch.clientY;
      }
    }
  }, {passive:true});

  // Doppelklick (Desktop/Maus) zoomt rein/raus
  imgEl.addEventListener('dblclick', (e)=>{
    e.stopPropagation();
    if(scale > 1) resetZoom(true);
    else{ scale = 2.5; applyTransform(true); }
  });
  // Mausrad zoomt rein/raus (Desktop)
  overlay.addEventListener('wheel', (e)=>{
    e.preventDefault();
    scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale - e.deltaY * 0.0025));
    if(scale <= 1.01){ resetZoom(false); }else{ clampPan(); applyTransform(false); }
  }, {passive:false});

  document.body.appendChild(overlay);
  pushOverlayLayer(closeLightbox);
}

/* ================= Offline-Download für unterwegs (Kartenkacheln + Bilder, 7 Tage) ================= */
const OFFLINE_DB_NAME = 'bergtouren-offline';
const OFFLINE_DAYS = 7;
const OFFLINE_ZOOMS = [13, 14, 15, 16];
const OFFLINE_MAX_TILES = 500;

function openOfflineDB(){
  return new Promise((resolve, reject)=>{
    if(!window.indexedDB){ reject(new Error('Offline-Speicher wird von diesem Browser nicht unterstützt.')); return; }
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains('tiles')) db.createObjectStore('tiles');
      if(!db.objectStoreNames.contains('images')) db.createObjectStore('images');
      if(!db.objectStoreNames.contains('downloads')) db.createObjectStore('downloads');
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error || new Error('Offline-Datenbank konnte nicht geöffnet werden.'));
  });
}
async function idbPut(storeName, key, value){
  const db = await openOfflineDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbGet(storeName, key){
  const db = await openOfflineDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbGetAllEntries(storeName){
  const db = await openOfflineDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    let keys=null, vals=null;
    keysReq.onsuccess = ()=> keys = keysReq.result;
    valsReq.onsuccess = ()=> vals = valsReq.result;
    tx.oncomplete = ()=> resolve((keys||[]).map((k,i)=>({key:k, value:(vals||[])[i]})));
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbDeleteByPrefix(storeName, prefix){
  const db = await openOfflineDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.openCursor();
    req.onsuccess = (e)=>{
      const cursor = e.target.result;
      if(cursor){
        if(String(cursor.key).indexOf(prefix)===0) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function idbDeleteKey(storeName, key){
  const db = await openOfflineDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

function lonToTileX(lon, z){ return Math.floor((lon+180)/360*Math.pow(2,z)); }
function latToTileY(lat, z){
  const rad = lat*Math.PI/180;
  return Math.floor((1 - Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2 * Math.pow(2,z));
}

function computeOfflineTileList(allCoords){
  if(!allCoords.length) return [];
  let minLat=90, maxLat=-90, minLon=180, maxLon=-180;
  allCoords.forEach(([lat,lon])=>{
    if(lat<minLat) minLat=lat; if(lat>maxLat) maxLat=lat;
    if(lon<minLon) minLon=lon; if(lon>maxLon) maxLon=lon;
  });
  const buf = 0.01; // grober Puffer rund um die Route
  minLat-=buf; maxLat+=buf; minLon-=buf; maxLon+=buf;
  const tiles = [];
  OFFLINE_ZOOMS.forEach(z=>{
    const xMin = lonToTileX(minLon,z), xMax = lonToTileX(maxLon,z);
    const yMin = latToTileY(maxLat,z), yMax = latToTileY(minLat,z);
    for(let x=xMin; x<=xMax; x++){
      for(let y=yMin; y<=yMax; y++){
        tiles.push({z,x,y});
      }
    }
  });
  return tiles;
}

async function deleteTourOfflineData(offlineId){
  await idbDeleteByPrefix('tiles', offlineId + '_');
  await idbDeleteByPrefix('images', offlineId + '_');
  await idbDeleteKey('downloads', offlineId);
}

async function getTourOfflineStatus(offlineId){
  try{
    const record = await idbGet('downloads', offlineId);
    if(!record) return null;
    if(Date.now() > record.expiresAt){
      await deleteTourOfflineData(offlineId);
      return null;
    }
    return record;
  }catch(e){ return null; }
}

async function cleanupExpiredOfflineDownloads(){
  try{
    const all = await idbGetAllEntries('downloads');
    const now = Date.now();
    for(const entry of all){
      if(entry.value && entry.value.expiresAt < now){
        await deleteTourOfflineData(entry.key);
      }
    }
  }catch(e){ /* Offline-Speicher evtl. nicht verfügbar — kein Problem, still ignorieren */ }
}

async function downloadTourOffline(offlineId, tourName, allCoords, images, onProgress){
  await deleteTourOfflineData(offlineId);
  const tileList = computeOfflineTileList(allCoords || []);
  if(!tileList.length && (!images || !images.length)) throw new Error('Weder Standortdaten noch Topo-Bilder zum Herunterladen vorhanden.');
  if(tileList.length > OFFLINE_MAX_TILES) throw new Error('Das abgedeckte Gebiet ist zu gross für den Offline-Download (mehr als ' + OFFLINE_MAX_TILES + ' Kartenkacheln).');
  const totalSteps = tileList.length + (images ? images.length : 0);
  let done = 0;
  for(const {z,x,y} of tileList){
    try{
      const url = `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/${z}/${x}/${y}.jpeg`;
      const res = await fetch(url);
      if(res.ok){
        const blob = await res.blob();
        await idbPut('tiles', `${offlineId}_${z}_${x}_${y}`, blob);
      }
    }catch(e){ /* einzelne Kachel überspringen, Rest weiter versuchen */ }
    done++;
    if(onProgress) onProgress(done, totalSteps);
  }
  if(images && images.length){
    for(const img of images){
      try{
        const res = await fetch(img.url);
        if(res.ok){
          const blob = await res.blob();
          await idbPut('images', `${offlineId}_${img.id}`, blob);
        }
      }catch(e){}
      done++;
      if(onProgress) onProgress(done, totalSteps);
    }
  }
  const now = Date.now();
  const expiresAt = now + OFFLINE_DAYS*24*60*60*1000;
  await idbPut('downloads', offlineId, { offlineId, tourName, downloadedAt: now, expiresAt, tileCount: tileList.length, imageCount: (images?images.length:0) });
  return true;
}

function formatOfflineRemaining(expiresAt){
  const msLeft = expiresAt - Date.now();
  if(msLeft <= 0) return 'abgelaufen';
  const daysLeft = Math.floor(msLeft / (24*60*60*1000));
  const hoursLeft = Math.floor((msLeft % (24*60*60*1000)) / (60*60*1000));
  if(daysLeft >= 1) return `noch ${daysLeft} Tag${daysLeft===1?'':'e'} offline verfügbar`;
  return `noch ${hoursLeft} Std. offline verfügbar`;
}

function createOfflineAwareTileLayer(offlineId){
  const OfflineTileLayer = L.TileLayer.extend({
    createTile: function(coords, done){
      const tile = document.createElement('img');
      const z = coords.z, x = coords.x, y = coords.y;
      const networkUrl = `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/${z}/${x}/${y}.jpeg`;
      idbGet('tiles', `${offlineId}_${z}_${x}_${y}`).then(blob=>{
        if(blob){
          tile.src = URL.createObjectURL(blob);
          done(null, tile);
        }else{
          tile.onload = ()=> done(null, tile);
          tile.onerror = ()=> done(new Error('Kachel nicht verfügbar'), tile);
          tile.src = networkUrl;
        }
      }).catch(()=>{
        tile.onload = ()=> done(null, tile);
        tile.onerror = ()=> done(new Error('Kachel nicht verfügbar'), tile);
        tile.src = networkUrl;
      });
      return tile;
    }
  });
  return new OfflineTileLayer('', { maxZoom: 18, attribution: '© swisstopo' });
}

/* ================= Live-GPS-Standort auf der Karte ================= */
let gpsWatchId = null;
let gpsMarker = null;
let gpsActiveOfflineId = null; // für welche Tour GPS aktuell läuft — überlebt einen Kartenwechsel (z. B. beim Öffnen der Vollbildansicht)
function startLiveGpsOnMap(map, offlineId){
  if(!navigator.geolocation) return;
  stopLiveGpsOnMap();
  gpsActiveOfflineId = offlineId || null;
  gpsWatchId = navigator.geolocation.watchPosition((pos)=>{
    const latlng = [pos.coords.latitude, pos.coords.longitude];
    if(!gpsMarker){
      gpsMarker = L.circleMarker(latlng, {radius:8, color:'#fff', weight:3, fillColor:'#1565C0', fillOpacity:1, pane:'markerPane'}).addTo(map);
    }else{
      gpsMarker.setLatLng(latlng);
    }
  }, (err)=>{
    dlog('GPS-Standort nicht verfügbar: ' + (err && err.message ? err.message : err), 'err');
  }, { enableHighAccuracy:true, maximumAge:5000 });
}
function stopLiveGpsOnMap(){
  gpsActiveOfflineId = null;
  if(gpsWatchId !== null){ try{ navigator.geolocation.clearWatch(gpsWatchId); }catch(e){} gpsWatchId = null; }
  if(gpsMarker){ try{ gpsMarker.remove(); }catch(e){} gpsMarker = null; }
}

/* ================= Offline-Bereich: Anzeige in der Detailansicht ================= */
function offlineSectionHtml(offlineId){
  return `<div class="detail-section" id="offline-section-${offlineId}">
    <h4>Für unterwegs</h4>
    <div id="offline-body-${offlineId}"><p style="font-size:13px; color:var(--ink-soft);">Lädt…</p></div>
  </div>`;
}

async function refreshOfflineSectionUI(offlineId){
  const bodyEl = document.getElementById('offline-body-' + offlineId);
  if(!bodyEl) return;
  const status = await getTourOfflineStatus(offlineId);
  if(status){
    bodyEl.innerHTML = `
      <p style="font-size:13px; color:var(--ok); margin:0 0 8px 0;">✓ ${formatOfflineRemaining(status.expiresAt)}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn secondary" id="gps-toggle-${offlineId}" data-act="toggle-live-gps" data-offline-id="${offlineId}">📍 Standort auf Karte zeigen</button>
        <button type="button" class="btn secondary" data-act="delete-offline" data-offline-id="${offlineId}" style="color:var(--danger);">🗑️ Offline-Daten löschen</button>
      </div>
    `;
  }else{
    bodyEl.innerHTML = `
      <p style="font-size:13px; color:var(--ink-soft); margin:0 0 8px 0;">Lädt Kartenausschnitt und Bilder herunter, ${OFFLINE_DAYS} Tage offline verfügbar — praktisch, bevor's losgeht.</p>
      <button type="button" class="btn secondary" id="download-offline-btn-${offlineId}" data-act="download-offline" data-offline-id="${offlineId}">🔽 Für unterwegs herunterladen</button>
    `;
  }
}

