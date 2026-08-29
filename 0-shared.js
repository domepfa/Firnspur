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
const REGION_SUBAREAS = {
  'Wallis': ['Nikolaital/Zermatt','Saastal','Val d\'Anniviers','Lötschental','Goms','Unterwallis','Nufenenpass','Grimselpass','Furkapass','Simplonpass','Grosser St. Bernhard'],
  'Berner Oberland': ['Lauterbrunnental','Haslital','Kandertal','Diemtigtal','Justistal','Saanenland/Gstaad','Grimselpass','Sustenpass','Jochpass','Grosse Scheidegg'],
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
    document.getElementById('fullscreen-map-close').addEventListener('click', closeFullscreenMap);
  }
  return overlay;
}
function openFullscreenMap(renderFn, onCloseCallback){
  const overlay = ensureFullscreenMapOverlay();
  overlay.style.display = 'block';
  overlay._onClose = onCloseCallback || null;
  renderFn('fullscreen-map-container');
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

function renderMiniMap(containerId, lat, lon, label){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    destroyExistingMap(containerId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    el2.style.height = isFullscreen ? '100%' : '220px';
    el2.style.borderRadius = isFullscreen ? '0' : 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = isFullscreen ? 'none' : '1px solid var(--line)';
    const map = L.map(containerId, {attributionControl:true}).setView([lat, lon], isFullscreen ? 15 : 14);
    registerMap(containerId, map);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);
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
function renderPointsEditorMap(containerId, hiddenInputId, listContainerId, manualTrackHiddenId, gpxReferenceTrack){
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
    modeRow.appendChild(pointModeBtn);
    modeRow.appendChild(lineModeBtn);
    wrapDiv.appendChild(modeRow);

    if(gpxReferenceTrack && gpxReferenceTrack.length){
      const refHint = document.createElement('p');
      refHint.className = 'hint';
      refHint.style.marginBottom = '6px';
      refHint.textContent = '🔴 Roter Track = hochgeladene GPX-Aufzeichnung (zur Orientierung, nicht bearbeitbar hier).';
      wrapDiv.appendChild(refHint);
    }

    const mapDiv = document.createElement('div');
    mapDiv.id = mapDivId;
    if(isFullscreen){
      mapDiv.style.cssText = 'flex:1 1 auto; min-height:0; border-radius:0; overflow:hidden; border:none;';
    }else{
      mapDiv.style.cssText = 'height:260px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    }
    wrapDiv.appendChild(mapDiv);

    const lineActionsRow = document.createElement('div');
    lineActionsRow.style.cssText = 'display:none; gap:8px; margin-top:8px;';
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button'; undoBtn.className = 'btn secondary'; undoBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    undoBtn.textContent = '↺ Letzten Punkt entfernen';
    const finishBtn = document.createElement('button');
    finishBtn.type = 'button'; finishBtn.className = 'btn secondary'; finishBtn.style.cssText = 'font-size:12.5px; padding:6px 12px;';
    finishBtn.textContent = '✓ Linie fertig';
    lineActionsRow.appendChild(undoBtn);
    lineActionsRow.appendChild(finishBtn);
    wrapDiv.appendChild(lineActionsRow);

    el2.appendChild(wrapDiv);

    let points = [];
    try{ points = JSON.parse(hiddenInput.value || '[]'); }catch(e){ points = []; }
    let manualTrack = [];
    if(manualTrackHidden){
      try{ manualTrack = JSON.parse(manualTrackHidden.value || '[]'); }catch(e){ manualTrack = []; }
    }
    let mode = 'point';

    const center = points.length ? [points[0].lat, points[0].lon] : (manualTrack.length ? manualTrack[0] : ((gpxReferenceTrack && gpxReferenceTrack.length) ? gpxReferenceTrack[0] : [46.8182, 8.2275]));
    const zoom = (points.length || manualTrack.length || (gpxReferenceTrack && gpxReferenceTrack.length)) ? 13 : 8;
    const map = L.map(mapDivId).setView(center, zoom);
    registerMap(mapDivId, map);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);

    if(gpxReferenceTrack && gpxReferenceTrack.length){
      L.polyline(gpxReferenceTrack, {color:'#ffffff', weight:6, opacity:0.6}).addTo(map);
      L.polyline(gpxReferenceTrack, {color:'#E8384F', weight:3, opacity:0.8}).addTo(map);
    }

    const markerLayer = L.layerGroup().addTo(map);
    let lineLayer = L.layerGroup().addTo(map);

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

    function setMode(newMode){
      mode = newMode;
      pointModeBtn.className = mode==='point' ? 'chip on' : 'chip';
      pointModeBtn.style.background = mode==='point' ? 'var(--ice-deep)' : '';
      lineModeBtn.className = mode==='line' ? 'chip on' : 'chip';
      lineModeBtn.style.background = mode==='line' ? 'var(--ice-deep)' : '';
      lineActionsRow.style.display = mode==='line' ? 'flex' : 'none';
    }
    pointModeBtn.addEventListener('click', ()=> setMode('point'));
    lineModeBtn.addEventListener('click', ()=> setMode('line'));
    undoBtn.addEventListener('click', ()=>{
      manualTrack.pop();
      redrawLine();
      persistTrack();
    });
    finishBtn.addEventListener('click', ()=> setMode('point'));

    map.on('click', (e)=>{
      if(mode==='line'){
        manualTrack.push([e.latlng.lat, e.latlng.lng]);
        redrawLine();
        persistTrack();
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
        function(id){ renderPointsEditorMap(id, hiddenInputId, null, manualTrackHiddenId, gpxReferenceTrack); },
        function(){ renderPointsEditorMap(containerId, hiddenInputId, listContainerId, manualTrackHiddenId, gpxReferenceTrack); }
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
    destroyExistingMap(containerId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    el2.style.height = isFullscreen ? '100%' : '240px';
    el2.style.borderRadius = isFullscreen ? '0' : 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = isFullscreen ? 'none' : '1px solid var(--line)';
    const map = L.map(containerId).setView([points[0].lat, points[0].lon], isFullscreen ? 14 : 13);
    registerMap(containerId, map);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);
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

function renderTrackDisplayMap(containerId, points, trackCoords, manualTrackCoords){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const hasTrack = trackCoords && trackCoords.length;
    const hasManualTrack = manualTrackCoords && manualTrackCoords.length;
    const hasPoints = points && points.length;
    if(!hasTrack && !hasManualTrack && !hasPoints) return;
    destroyExistingMap(containerId);
    el2.innerHTML = '';
    const isFullscreen = containerId === 'fullscreen-map-container';
    el2.style.height = isFullscreen ? '100%' : '240px';
    el2.style.borderRadius = isFullscreen ? '0' : 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = isFullscreen ? 'none' : '1px solid var(--line)';
    const startView = hasTrack ? trackCoords[0] : (hasManualTrack ? manualTrackCoords[0] : [points[0].lat, points[0].lon]);
    const map = L.map(containerId).setView(startView, isFullscreen ? 14 : 13);
    registerMap(containerId, map);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);
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
      const btn = makeFullscreenButton(function(id){ renderTrackDisplayMap(id, points||[], trackCoords||[], manualTrackCoords||[]); });
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

/* ================= Zurück-Taste schliesst offene Fenster (statt App zu verlassen) ================= */
let modalHistoryPushed = false;
function pushModalHistoryIfNeeded(){
  if(!modalHistoryPushed){
    try{ history.pushState({modalOpen:true}, '', location.href); }catch(e){}
    modalHistoryPushed = true;
  }
}
window.addEventListener('popstate', ()=>{
  if(typeof state !== 'undefined' && state.modal){
    state.modal = null;
    modalHistoryPushed = false;
    render();
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

/* ================= Vorlagen fuer ChatGPT/Gemini (direkt in der App, immer aktuell) ================= */
const VORLAGE_ANLEITUNG_TEXT = `# Anleitung für ChatGPT/Gemini: Touren-Daten im richtigen Format erstellen

Ziel: Erstelle eine gültige JSON-Datei nach dem Muster der Vorlage, mit einem oder
mehreren Touren-/Hütten-Einträgen. Diese Datei wird danach über die
"Importieren"-Funktion der App eingefügt.

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
- Nur echte, bekannte Koordinaten eintragen — falls keine bekannt sind, \`"points": []\`
  lassen, NICHT schätzen oder erfinden
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
  - **Berner Oberland**: Lauterbrunnental, Haslital, Kandertal, Diemtigtal,
    Justistal, Saanenland/Gstaad, Grimselpass, Sustenpass, Jochpass,
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
  - \`descentType\`: "Fussabstieg", "Abseilen", oder "Fussabstieg und Abseilen"

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
- \`openingPeriod\`: Öffnungszeitraum, z. B. "Mitte März – Ende September"
- \`staffedPeriod\`: Zeitraum bewartet (leer lassen, falls unbewartet)
- \`winterraum\`: Beschreibung Winterraum/Schutzraum
- \`approach\`: Anfahrt (Ausgangspunkt, Parkplatz, ÖV, Seilbahn)
- \`points\`: siehe oben — z. B. Hütte selbst + Parkplatz als zwei Punkte
- \`accessElevationSummer\`/\`accessElevationWinter\`: Höhenmeter Zustieg, getrennt
  nach Sommer und Winter (nur Zahl, als Text)
- \`accessDurationSummer\`/\`accessDurationWinter\`: Zeitbedarf Zustieg, getrennt
  nach Sommer und Winter
- \`accessDifficultySummer\`/\`accessDifficultyWinter\`: SAC-Skala wie bei Touren,
  oder leer — getrennt nach Jahreszeit, da sich der Zustieg oft stark
  unterscheidet
- \`accessSummer\`/\`accessWinter\`: Beschreibung der Zustiegsroute, getrennt nach
  Jahreszeit
- \`contact\`: Telefon/Website/Sektion
- \`notes\`: Sonstiges (z. B. Reservationshinweise)
- \`completions\`: immer \`[]\` (wird von der App selbst befüllt)

## Auftrag an ChatGPT/Gemini

Erstelle nach diesem Muster einen oder mehrere Touren-/Hütten-Einträge basierend
auf den Informationen, die ich dir gebe (z. B. Screenshot, Text, Link). Gib mir
am Ende NUR die vollständige, gültige JSON-Datei zurück, bereit zum Kopieren.
`;

function vorlagenModalHtml(tourVorlageJson){
  return `<div class="modal" data-stop="1" style="max-width:560px;">
    <div class="modal-head"><h2>📋 Vorlagen für ChatGPT/Gemini</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 16px 0;">Zum Weitergeben an Kolleg:innen: JSON-Vorlage in die eigene KI (ChatGPT, Gemini, usw.) einfügen, zusammen mit der Anleitung — die KI kann dann Touren-Daten im richtigen Format ausgeben, die hier importiert werden können.</p>

    <div class="detail-section" style="margin-top:0;">
      <h4>JSON-Vorlage (Beispiel-Tour &amp; -Hütte)</h4>
      <textarea readonly id="vorlage-json-text" style="width:100%; min-height:140px; font-family:'JetBrains Mono'; font-size:11px;">${tourVorlageJson}</textarea>
      <button type="button" class="btn secondary" style="margin-top:8px;" data-act="copy-vorlage" data-target="vorlage-json-text">📋 Vorlage kopieren</button>
    </div>

    <div class="detail-section">
      <h4>Anleitung für die KI</h4>
      <textarea readonly id="vorlage-anleitung-text" style="width:100%; min-height:140px; font-family:'JetBrains Mono'; font-size:11px;">${VORLAGE_ANLEITUNG_TEXT}</textarea>
      <button type="button" class="btn secondary" style="margin-top:8px;" data-act="copy-vorlage" data-target="vorlage-anleitung-text">📋 Anleitung kopieren</button>
    </div>
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


