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

function renderMiniMap(containerId, lat, lon, label){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    el2.innerHTML = '';
    el2.style.height = '220px';
    el2.style.borderRadius = 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = '1px solid var(--line)';
    const map = L.map(containerId, {attributionControl:true}).setView([lat, lon], 14);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup(label || '').openPopup();
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
function renderPointsEditorMap(containerId, hiddenInputId, listContainerId){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  ensureLeafletLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const listEl = document.getElementById(listContainerId);
    if(!el2 || !hiddenInput) return;
    el2.innerHTML = '';
    el2.style.height = '260px';
    el2.style.borderRadius = 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = '1px solid var(--line)';

    let points = [];
    try{ points = JSON.parse(hiddenInput.value || '[]'); }catch(e){ points = []; }

    const center = points.length ? [points[0].lat, points[0].lon] : [46.8182, 8.2275];
    const zoom = points.length ? 13 : 8;
    const map = L.map(containerId).setView(center, zoom);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    function persist(){
      hiddenInput.value = JSON.stringify(points);
      renderList();
    }
    function renderList(){
      if(!listEl) return;
      if(!points.length){
        listEl.innerHTML = '<p style="font-size:12.5px; color:var(--ink-faint); margin:8px 0 0 0;">Noch keine Punkte gesetzt — auf die Karte tippen, um einen zu setzen.</p>';
        return;
      }
      listEl.innerHTML = '<div class="chips" style="margin-top:8px;">' +
        points.map((p,i)=>`<span class="chip" style="background:var(--ice-light); border-color:transparent;">📍 ${esc(p.label||'Punkt')}</span>`).join('') +
        '</div>';
    }

    function buildPopupContent(point){
      const wrap = document.createElement('div');
      wrap.style.minWidth = '170px';
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
        persist();
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
        const marker = L.marker([point.lat, point.lon]).addTo(markerLayer);
        marker.bindPopup(buildPopupContent(point));
        if(point._justAdded){ delete point._justAdded; marker.openPopup(); }
      });
    }

    map.on('click', (e)=>{
      points.push({ label:'', lat: e.latlng.lat, lon: e.latlng.lng, _justAdded:true });
      redraw();
      persist();
    });

    redraw();
    renderList();
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
    el2.innerHTML = '';
    el2.style.height = '240px';
    el2.style.borderRadius = 'var(--radius)';
    el2.style.overflow = 'hidden';
    el2.style.border = '1px solid var(--line)';
    const map = L.map(containerId).setView([points[0].lat, points[0].lon], 13);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      maxZoom: 18,
      attribution: '© swisstopo'
    }).addTo(map);
    const group = [];
    points.forEach(p=>{
      const m = L.marker([p.lat, p.lon]).addTo(map).bindPopup(esc(p.label||'Punkt'));
      group.push(m);
    });
    if(group.length > 1){
      map.fitBounds(L.featureGroup(group).getBounds(), {padding:[30,30]});
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}
