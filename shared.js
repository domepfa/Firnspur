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
