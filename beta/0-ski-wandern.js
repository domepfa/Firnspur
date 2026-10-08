/* ================================================================
   0-ski-wandern.js — gemeinsamer Code von Skitour (index.html) und Wandern (wandern.html).
   Fixseil lädt diese Datei nicht. Was alle drei Apps brauchen, gehört in 0-shared.js.
   Die Funktionen greifen auf state, render() usw. der jeweiligen App zu.
   ================================================================= */

function migrateCompletions(item){
  if(!Array.isArray(item.completions)){
    item.completions = (item.completed && (item.completedBy || item.completedDate))
      ? [{by: item.completedBy || '?', date: item.completedDate || null}]
      : [];
  }
  return item;
}

async function saveHutCloud(hut){ return await fbSet('huts/'+hut.id, hut); }


function removeGebiet(id){
  moveToTrash(id, state.gebiete, state.trashedGebiete, saveGebietCloud);
}

async function submitName(nameVal, pinVal){
  const n = (nameVal||'').trim();
  if(!n) return;
  const after = state.modal && state.modal.after;
  const submitBtn = document.querySelector('[data-act="submit-name"]');
  if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Prüfe…'; }
  const result = await claimOrVerifyName(n, pinVal||'');
  if(!result.ok){
    state.modal = { type:'name', after, error: result.reason==='wrong-pin' ? 'Falsches Passwort für diesen Namen.' : 'Bitte ein Passwort eingeben.' };
    render();
    return;
  }
  state.myName = n;
  try{ localStorage.setItem('firnspur-myname', n); }catch(e){}
  state.modal = null;
  render();
  loadFavorites();
  if(after) after();
}

function openAddTour(){ dlog('Klick auf "+ Neue Tour"'); ensureName(()=>{ state.modal = {type:'edit-tour', payload:null}; render(); }); }

function openAddTourWithPoint(lat, lon){ ensureName(()=>{ state.modal = {type:'edit-tour', payload:{points:[{label:'', lat, lon}]}}; render(); }); }

function openEditTour(id){ ensureName(()=>{ const t = state.tours.find(x=>x.id===id); navigateToModal({type:'edit-tour', payload:t}); }); }

function navigateToModal(newModal){
  if(state.modal){
    state.modalBackStack.push({ forType: newModal.type, modal: state.modal });
    // Jede zusätzliche Cross-Link-Ebene bekommt ihren EIGENEN Browser-History-Eintrag, statt sich
    // (wie früher) auf den einen, für die ganze Sitzung geteilten Eintrag zu verlassen — sonst
    // fehlte beim Zurückschliessen mehrerer Ebenen irgendwann ein Eintrag, und ein weiteres
    // Zurückwischen "leckte" in die davorliegende Seite durch (z. B. in die andere App). Sicher,
    // weil dies eine direkte Nutzeraktion ist (kein synchrones back()+pushState() wie bei der
    // Historie-Warnung weiter unten in closeModal() — dort geht es um einen anderen Fall).
    try{ history.pushState({fsLayer:'modal'}, '', location.href); }catch(e){}
  }else{
    state.modalBackStack = [];
  }
  state.modal = newModal;
  render();
}

function openTourDetail(id){ navigateToModal({type:'tour-detail', payload:id}); }

function openAddGebiet(){ ensureName(()=>{ state.modal = {type:'edit-gebiet', payload:null}; render(); }); }

function openEditGebiet(id){ ensureName(()=>{ const g = state.gebiete.find(x=>x.id===id); navigateToModal({type:'edit-gebiet', payload:g}); }); }

function openGebietDetail(id){ navigateToModal({type:'gebiet-detail', payload:id}); }

function closeModal(fromPopstate, skipDirtyCheck, keepHistoryLayer){
  if(!skipDirtyCheck && !confirmDiscardIfDirty()){
    // Nutzer will weiter bearbeiten — nichts schliessen, und explizit NICHT render() aufrufen:
    // das würde die Maske komplett neu aus dem gespeicherten Ausgangszustand aufbauen und damit
    // genau die unges­icherten Eingaben verwerfen, die der Nutzer gerade bewusst behalten wollte.
    // Bei der Hardware-/Browser-Zurück-Taste wurde der History-Eintrag bereits konsumiert (siehe
    // popstate-Handler) — den stellen wir hier gezielt wieder her, ohne die Maske neu zu rendern.
    if(fromPopstate) pushModalHistoryIfNeeded();
    return;
  }
  // Verlassen = wieder gesperrt (Karte in der Detailansicht nicht mehr im Bearbeiten-Modus).
  state.quickEditOpenId = null;
  stopLiveGpsOnMap();
  // Zustiege sind "verschachtelt" unter einer Hütte — beim Schliessen zurück zur
  // Hütten-Detailansicht statt ganz zur Übersicht, damit man nicht jedes Mal neu
  // hinein navigieren muss. Ein Klick auf X/Zurück (oder die Hardware-Zurück-Taste)
  // schliesst dadurch immer nur die zuoberst offene Ebene.
  // Zurück führt IMMER dorthin, wo man vorher war (Verlauf aus navigateToModal) — erst wenn es
  // keinen Verlauf gibt (z. B. direkt von der grossen Karte geöffnet), greifen die festen
  // Rückfall-Ziele darunter.
  const backTop = (state.modalBackStack && state.modalBackStack.length) ? state.modalBackStack[state.modalBackStack.length-1] : null;
  if(backTop && state.modal && backTop.forType === state.modal.type){
    state.modalBackStack.pop();
    state.modal = backTop.modal;
  }else if(state.modal && (state.modal.type==='access-route-detail' || state.modal.type==='edit-access-route') && state.modal.payload && state.modal.payload.hutId){
    state.modal = {type:'hut-detail', payload: state.modal.payload.hutId};
  }else{
    // Wurde die aktuelle Ansicht per Cross-Link aus einer anderen Detailansicht heraus geöffnet
    // (siehe navigateToModal), fällt man hier genau eine Ebene zurück statt ganz auf die Übersicht.
    const top = state.modalBackStack.length ? state.modalBackStack[state.modalBackStack.length-1] : null;
    if(top && state.modal && top.forType === state.modal.type){
      state.modalBackStack.pop();
      state.modal = top.modal;
    }else{
      state.modal = null;
    }
  }
  // Per Zurückwischen/Zurück-Taste (popstate) wurde bereits genau EIN Browser-History-Eintrag
  // konsumiert — landen wir dadurch bei einer übergeordneten Ansicht (state.modal noch gesetzt,
  // z. B. eine Cross-Link-Ebene aus navigateToModal()), hat deren EIGENER History-Eintrag genau
  // diesen Schritt repräsentiert; modalHistoryPushed bleibt also true, kein erneutes Pushen nötig.
  // Erst wenn wirklich alles geschlossen ist (state.modal===null), ist auch der zugehörige
  // History-Eintrag "aufgebraucht".
  if(fromPopstate && !state.modal) modalHistoryPushed = false;
  render();
  // keepHistoryLayer: der Aufrufer öffnet direkt im Anschluss ein neues Modal (z. B. nach dem
  // Speichern zur Detailansicht) — dann ist die Modal-"Ebene" aus Sicht der Browser-Historie nie
  // wirklich geschlossen worden, also darf hier kein history.back() ausgelöst werden. Das wäre
  // sonst ein synchrones history.back() gefolgt von einem sofortigen history.pushState() (beim
  // Öffnen des neuen Modals) — genau diese Kombination verhält sich browserübergreifend
  // inkonsistent und kann die Historie verwirren, sodass eine spätere Zurück-Aktion zu weit
  // zurückspringt (bis auf die andere App).
  // Wurde diese Detailansicht von der Vollbild-Übersichtskarte aus geöffnet (siehe
  // openTourFromMap() etc. in 0-shared.js), landet man beim endgültigen Schliessen wieder auf der
  // Karte statt auf der normalen Übersicht darunter. Wichtig: hier NICHT zusätzlich
  // consumeHistoryEntry() (history.back()) aufrufen, bevor openStandaloneMap() gleich seinerseits
  // einen neuen History-Eintrag pusht — genau dieses synchrone back()+pushState() ist der Fehler,
  // der oben bei keepHistoryLayer bereits vermieden wird.
  if(!state.modal && !keepHistoryLayer && modalOpenedFromStandaloneMap){
    modalOpenedFromStandaloneMap = false;
    modalHistoryPushed = false;
    openStandaloneMap();
  }else if(!state.modal && modalHistoryPushed && !keepHistoryLayer){
    modalHistoryPushed = false;
    if(!fromPopstate) consumeHistoryEntry();
  }
}

async function submitHutForm(form, existing){
  // Stand vor dem Speichern — für "Rückgängig" im Hinweis danach.
  const undoPrev = snapshotForUndo(existing && existing.id ? state.huts.find(x=>x.id===existing.id) : null);
  const h = (existing && existing.id) ? {...existing} : {id: (form.hutIdForTrack || uid('h')), createdBy: state.myName, createdAt: new Date().toISOString(), status:'entwurf'};
  h.name = form.name.trim();
  h.region = form.region;
  h.subregion = form.subregion || '';
  h.altitude = form.altitude;
  h.capacity = form.capacity;
  h.staffedMonths = Array.isArray(form.staffedMonths) ? form.staffedMonths : [];
  h.staffedMonthsPartial = Array.isArray(form.staffedMonthsPartial) ? form.staffedMonthsPartial : [];
  h.winterraum = form.winterraum;
  h.winterraumMonths = Array.isArray(form.winterraumMonths) ? form.winterraumMonths : [];
  h.winterraumMonthsPartial = Array.isArray(form.winterraumMonthsPartial) ? form.winterraumMonthsPartial : [];
  h.staffedNote = form.staffedNote;
  h.winterraumNote = form.winterraumNote;
  h.hutLink = form.hutLink;
  h.approach = form.approach;
  h.approachTypes = Array.isArray(form.approachTypes) ? form.approachTypes : [];
  try{ h.points = form.points ? JSON.parse(form.points) : []; }catch(e){ h.points = []; }
  try{ h.manualTrack = form.manualTrack ? JSON.parse(form.manualTrack) : []; }catch(e){ h.manualTrack = []; }
  h.gebietId = form.gebietId || '';
  migrateHutAccessRoutes(h);
  h.contact = form.contact;
  h.notes = form.notes;
  if(form.status==='entwurf' || form.status==='vollstaendig') h.status = form.status;
  h.updatedAt = new Date().toISOString();
  h.updatedBy = state.myName;

  const idx = state.huts.findIndex(x=>x.id===h.id);
  if(idx>=0) state.huts[idx] = h; else state.huts.push(h);
  closeModal(false, true, true);
  state.modal = {type:'hut-detail', payload:h.id};
  render();

  const ok = await saveHutCloud(h).catch(()=>false);
  h._unsynced = !ok;
  if(!ok){
    markUnsaved();
    showToast('Hütte ist lokal gespeichert, konnte aber nicht synchronisiert werden. Prüfe deine Internetverbindung.', true);
  }else{
    offerUndoAfterSave('Hütte gespeichert.', state.huts, undoPrev, saveHutCloud);
  }
  render();
}

async function submitGebietForm(form, existing){
  // Stand vor dem Speichern — für "Rückgängig" im Hinweis danach.
  const undoPrev = snapshotForUndo(existing && existing.id ? state.gebiete.find(x=>x.id===existing.id) : null);
  const g = (existing && existing.id) ? {...existing} : {id: (form.gebietIdForTrack || uid('geb')), createdBy: state.myName, createdAt: new Date().toISOString()};
  g.name = form.name.trim();
  g.region = form.region || '';
  g.subregion = form.subregion || '';
  g.description = form.description || '';
  try{ g.points = form.points ? JSON.parse(form.points) : []; }catch(e){ g.points = []; }
  try{ g.manualTrack = form.manualTrack ? JSON.parse(form.manualTrack) : []; }catch(e){ g.manualTrack = []; }
  g.updatedAt = new Date().toISOString();
  g.updatedBy = state.myName;

  const idx = state.gebiete.findIndex(x=>x.id===g.id);
  if(idx>=0) state.gebiete[idx] = g; else state.gebiete.unshift(g);
  closeModal(false, true, true);
  state.modal = {type:'gebiet-detail', payload:g.id};
  render();

  const ok = await saveGebietCloud(g).catch(()=>false);
  g._unsynced = !ok;
  if(!ok){
    markUnsaved();
    showToast('Gebiet ist lokal gespeichert, konnte aber nicht synchronisiert werden. Prüfe deine Internetverbindung.', true);
  }else{
    offerUndoAfterSave('Gebiet gespeichert.', state.gebiete, undoPrev, saveGebietCloud);
  }
  render();
}

function setView(v){ state.view = v; state.modal = null; modalOpenedFromStandaloneMap = false; render(); }


function render(){
  const app = document.getElementById('app');
  app.innerHTML = shellHtml();
  wireGlobalHandlers();
  if(state.modal) renderModal();
  if(!state.loading) cacheLocalSnapshot();
  syncAgendaTabButton();
}

function syncAgendaTabButton(){
  const btn = document.getElementById('agenda-tab-btn');
  if(btn) btn.classList.toggle('active', state.view==='agenda');
}

function emptyHuts(){
  const hasAny = state.huts.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Keine Hütte passt zu diesem Filter' : 'Noch keine Hütte erfasst'}</h3>
    <p>${hasAny ? 'Suche anpassen oder eine neue Hütte hinzufügen.' : 'Trag eine Hütte ein — Anfahrt, Zustieg, und ob und wann sie bewartet ist.'}</p>
    <button class="btn" data-act="add-hut">+ Neue Hütte</button>
  </div>`;
}

function hutCardHtml(h){
  migrateHutAccessRoutes(h);
  const linkedCount = state.tours.filter(t=>t.hutId===h.id).length;
  const routes = h.accessRoutes || [];
  const rangeText = accessRouteDifficultyRangeHtml(routes);
  const gebiet = h.gebietId ? state.gebiete.find(g=>g.id===h.gebietId) : null;
  return `
  <div class="card" data-act="open-hut" data-id="${h.id}" tabindex="0" role="button">
    <div class="card-top">
      <h3>🛖 ${h.completed ? '✓ ' : ''}${esc(h.name)}</h3>
      ${h.altitude ? `<span class="badge" style="background:var(--ice-deep)">${esc(h.altitude)} m</span>` : ''}
    </div>
    ${h.region ? `<p class="excerpt">${esc(h.region)}${h.subregion ? ' – ' + esc(h.subregion) : ''}</p>` : ''}
    ${routes.length ? `<div class="stat-row"><span>🚶 ${routes.length} Zustieg${routes.length===1?'':'e'}${rangeText ? ' · ' + rangeText : ''}</span></div>` : ''}
    ${((h.staffedMonths && h.staffedMonths.length) || (h.staffedMonthsPartial && h.staffedMonthsPartial.length)) ? `<div class="stat-row"><span>👤 bewartet: ${(h.staffedMonths||[]).length + (h.staffedMonthsPartial||[]).length} Mte.</span></div>` : `<div class="stat-row"><span>👤 unbewartet</span></div>`}
    <span class="hut-link-chip">${linkedCount} Tour${linkedCount===1?'':'en'} ab hier</span>
    ${gebiet ? `<span class="hut-link-chip">⛰️ ${esc(gebiet.name)}</span>` : ''}
    ${(h.completions && h.completions.length) ? `<div class="stat-row"><span>✓ ${h.completions.length===1 ? esc(h.completions[0].by||'?') + (h.completions[0].date ? ' · ' + fmtDateOnly(h.completions[0].date) : '') : h.completions.length + ' Einträge'}</span></div>` : ''}
    ${h._unsynced ? `<span class="hut-link-chip" style="background:#FBEAE7; color:#B0392C;">⚠ nicht synchronisiert</span>` : ''}
    <div class="meta-line" style="display:flex; justify-content:space-between; align-items:center;">
      <span>von ${esc(h.createdBy||'?')} · ${fmtDate(h.createdAt)}</span>
      <span style="color:var(--ink-faint);">${hutStatusLabel(h)}</span>
    </div>
  </div>`;
}

function filteredGebiete(){
  let list = state.gebiete;
  if(state.search.trim()){
    const q = state.search.trim().toLowerCase();
    list = list.filter(g=> (g.name||'').toLowerCase().includes(q) || (g.region||'').toLowerCase().includes(q));
  }
  return list.slice().sort((a,b)=> (a.name||'').localeCompare(b.name||'', 'de'));
}

function gebieteViewHtml(){
  const listAll = filteredGebiete();
  const list = applyGebietListControls(listAll);
  return stageLayoutHtml(mapStripHtml({label:'Gebiete auf der Karte', kind:'gebiet', points: list.filter(g=>g.points&&g.points.length).map(g=>({id:g.id, lat:g.points[0].lat, lon:g.points[0].lon, label:g.name})), emptyText:'Noch kein Gebiet mit Kartenpunkt erfasst.', openPinId: state._mapStripOpenPinId}), `
    <div class="toolbar">
      <input class="search-input" type="text" placeholder="Gebiet oder Region suchen…" value="${esc(state.search)}" data-act="search"/>
      <button class="btn fs-fab" data-act="add-gebiet">+ Neues Gebiet</button>
      <button class="btn secondary" data-act="open-standalone-map">🗺️ Karte</button>
    </div>
    ${gebietListControlsHtml(listAll, {scan:false})}
    ${list.length ? `<div class="grid">${list.map(gebietCardHtml).join('')}</div>` : emptyGebiete()}
  `);
}

function emptyGebiete(){
  const hasAny = state.gebiete.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Kein Gebiet passt zu diesem Filter' : 'Noch kein Gebiet erfasst'}</h3>
    <p>${hasAny ? 'Suche anpassen oder ein neues Gebiet hinzufügen.' : 'Ein Gebiet fasst Touren und Hütten derselben Region zusammen (z. B. ein Tal oder Massiv) — leg es an und verlinke dann Touren/Hütten damit.'}</p>
    <button class="btn" data-act="add-gebiet">+ Neues Gebiet</button>
  </div>`;
}

function gebietTouren(geb){ return state.tours.filter(t=>t.gebietId===geb.id); }

// Gebiet als Blatt über der Karte: Inhalte für die Karte dahinter (siehe fsShowAreaContextMap)
function fsAreaForMap(modal){
  if(!modal || modal.type !== 'gebiet-detail') return null;
  const geb = state.gebiete.find(x=>x.id===modal.payload);
  if(!geb) return null;
  return {key: geb.id, name: geb.name, tours: gebietTouren(geb), huts: gebietHuetten(geb), points: geb.points || []};
}

function gebietHuetten(geb){ return state.huts.filter(h=>h.gebietId===geb.id); }


function renderGebietOverviewMap(containerId, gebId){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  fsmEnsureLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const geb = state.gebiete.find(x=>x.id===gebId);
    if(!geb) { el2.innerHTML = ''; return; }
    const touren = gebietTouren(geb);
    const huetten = gebietHuetten(geb);
    const hasOwnPoints = geb.points && geb.points.length;
    const hasAny = hasOwnPoints || huetten.some(h=> h.points && h.points.length) || touren.some(t=> (t.points && t.points.length) || (t.trackSimplified && t.trackSimplified.length) || (t.manualTrack && t.manualTrack.length));
    if(!hasAny){
      el2.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Noch keine Kartendaten — weder beim Gebiet noch bei den Touren/Hütten.</p>';
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
      : 'height:280px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const firstHutPoint = huetten.map(h=> h.points && h.points.length ? h.points[0] : null).find(Boolean);
    const startPoint = hasOwnPoints ? geb.points[0] : firstHutPoint;
    const map = fsmCreateFlMap(mapDivId).setView(startPoint ? [startPoint.lat, startPoint.lon] : [46.8182, 8.2275], startPoint ? 12 : 8);
    registerMap(mapDivId, map);
    const boundsItems = [];
    if(hasOwnPoints){
      geb.points.forEach(p=>{
        try{
          const m = FL.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(`<strong>${esc(geb.name)}</strong><br/>${esc(p.label||'Punkt')}`);
          boundsItems.push(m);
        }catch(e){ /* einzelnen fehlerhaften Punkt überspringen */ }
      });
    }
    huetten.forEach(h=>{
      (h.points||[]).forEach(p=>{
        try{
          const m = FL.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(`<strong>🛖 ${esc(h.name)}</strong><br/>${esc(p.label||'Punkt')}`);
          boundsItems.push(m);
        }catch(e){ /* einzelnen fehlerhaften Punkt überspringen */ }
      });
    });
    touren.forEach((t,i)=>{
      const color = ACCESS_ROUTE_COLORS[i % ACCESS_ROUTE_COLORS.length];
      const track = (t.trackSimplified && t.trackSimplified.length) ? t.trackSimplified : (t.manualTrack && t.manualTrack.length ? t.manualTrack : null);
      if(track){
        try{
          FL.polyline(track, {color:'#ffffff', weight:6, opacity:0.7}).addTo(map);
          const line = FL.polyline(track, {color, weight:3.5, opacity:1}).addTo(map);
          boundsItems.push(line);
        }catch(e){ /* einzelnen fehlerhaften Track überspringen */ }
      }
      (t.points||[]).forEach(p=>{
        try{
          const m = FL.circleMarker([p.lat, p.lon], {radius:8, color:'#fff', weight:2, fillColor:color, fillOpacity:1}).addTo(map)
            .bindPopup(`<strong>${esc(t.name)}</strong>${t.routeName ? ' – '+esc(t.routeName) : ''}<br/>${esc(p.label||'Punkt')}`);
          boundsItems.push(m);
        }catch(e){ /* einzelnen fehlerhaften Punkt überspringen */ }
      });
    });
    if(boundsItems.length){
      map.fitBounds(FL.featureGroup(boundsItems).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderGebietOverviewMap(id, gebId); });
      el2.appendChild(btn);
    }
  }).catch(err=>{
    const el3 = document.getElementById(containerId);
    if(el3) el3.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte konnte nicht geladen werden (keine Internetverbindung?).</p>';
  });
}

function renderModal(){
  pushModalHistoryIfNeeded();
  const root = document.getElementById('modal-root');
  const m = state.modal;
  let inner = '';
  if(m.type==='name') inner = nameModalHtml();
  else if(m.type==='edit-tour') inner = tourFormHtml(m.payload);
  else if(m.type==='tour-detail') inner = tourDetailHtml(m.payload);
  else if(m.type==='edit-hut') inner = hutFormHtml(m.payload);
  else if(m.type==='edit-access-route') inner = accessRouteFormHtml(m.payload.hutId, m.payload.route);
  else if(m.type==='access-route-detail') inner = accessRouteDetailHtml(m.payload.hutId, m.payload.route);
  else if(m.type==='hut-detail') inner = hutDetailHtml(m.payload);
  else if(m.type==='edit-gebiet') inner = gebietFormHtml(m.payload);
  else if(m.type==='gebiet-detail') inner = gebietDetailHtml(m.payload);
  else if(m.type==='complete-tour') inner = completeFormHtml('tour', m.payload);
  else if(m.type==='complete-hut') inner = completeFormHtml('hut', m.payload);
  else if(m.type==='export') inner = exportModalHtml(m.payload);
  else if(m.type==='import') inner = importModalHtml();
  else if(m.type==='vorlagen') inner = vorlagenModalHtml(TOUR_VORLAGE_JSON);
  else if(m.type==='bedienungsanleitung') inner = bedienungsanleitungModalHtml();
  else if(m.type==='add-agenda') inner = agendaFormHtml();
  else if(m.type==='edit-agenda') inner = agendaFormHtml(m.payload);
  else if(m.type==='agenda-detail') inner = agendaDetailHtml(m.payload);
  else if(m.type==='emergency') inner = emergencyCardHtml();
  else if(m.type==='share-import') inner = shareImportModalHtml(m.payload);
  root.innerHTML = `<div class="overlay" data-act="overlay-close">${inner}</div>`;
  wireModalHandlers();
}

function buildExportData(){
  const singleTourId = state.modal && state.modal.type==='export' && state.modal.payload && state.modal.payload.tourId;
  if(singleTourId){
    const tour = state.tours.find(t=>t.id===singleTourId);
    return tour ? {tours:[tour]} : {};
  }
  const chips = document.querySelectorAll('#export-filter-chips .chip');
  const selected = new Set();
  chips.forEach(c=>{ if(c.classList.contains('on')) selected.add(c.getAttribute('data-export-key')); });
  const data = {};
  if(selected.has('tours')) data.tours = state.tours;
  if(selected.has('huts')) data.huts = state.huts;
  if(selected.has('agenda')) data.agenda = state.agenda;
  return data;
}

function exportModalHtml(payload){
  const singleTour = payload && payload.tourId ? state.tours.find(t=>t.id===payload.tourId) : null;
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Exportieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    ${singleTour
      ? `<p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Nur diese Tour: <strong>${esc(singleTour.name)}</strong>. Lade sie herunter oder kopiere den Text, um sie mit jemandem zu teilen.</p>`
      : `<p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Lade eine Datei herunter und teile sie mit deinen Freunden (z. B. per WhatsApp/E-Mail) — oder kopiere den Text. Sie importieren die Datei/den Text, um eure Sammlungen zusammenzuführen.</p>
    <div class="field">
      <label>Was exportieren?</label>
      <div class="chips" id="export-filter-chips">
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="tours" data-act="toggle-export-filter">🏔️ Touren</button>
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="huts" data-act="toggle-export-filter">🛖 Hütten</button>
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="agenda" data-act="toggle-export-filter">📅 Agenda</button>
      </div>
    </div>`
    }
    <div class="form-actions" style="margin-bottom:12px;">
      <button class="btn" data-act="download-export">📥 Als Datei herunterladen</button>
      <button class="btn secondary" data-act="copy-export">In Zwischenablage kopieren</button>
    </div>
    <textarea readonly style="width:100%; min-height:180px; font-family:'Manrope'; font-size:11.5px;" id="export-text"></textarea>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Schliessen</button>
    </div>
  </div>`;
}

function importModalHtml(){
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Importieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Wähle eine Datei, die dir jemand geschickt hat, oder füge den Text ein. Bestehende Einträge mit gleicher ID werden aktualisiert, neue werden hinzugefügt.</p>
    <p style="font-size:13px; margin:0 0 12px 0;"><button type="button" class="btn secondary" style="font-size:12.5px; padding:6px 12px;" data-act="open-vorlagen">📋 Ressourcen &amp; Vorlagen</button> — Bedienungsanleitung, JSON-Vorlage &amp; KI-Anleitung, zum Weitergeben an Kolleg:innen.</p>
    <div class="field">
      <label>Datei wählen</label>
      <input type="file" id="import-file" accept="application/json,.json,.txt"/>
    </div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:10px 0 6px 0;">— oder Text einfügen —</p>
    <textarea placeholder="{ &quot;tours&quot;: [...], &quot;huts&quot;: [...] }" style="width:100%; min-height:160px; font-family:'Manrope'; font-size:11.5px;" id="import-text"></textarea>
    <div class="form-error" id="import-error" style="display:none;"></div>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Abbrechen</button>
      <button class="btn" data-act="do-import">Importieren</button>
    </div>
  </div>`;
}

function completeFormHtml(kind, id){
  const item = kind==='tour' ? state.tours.find(x=>x.id===id) : state.huts.find(x=>x.id===id);
  const title = kind==='tour' ? 'Tour als abgeschlossen markieren' : 'Hütte als besucht markieren';
  const today = new Date().toISOString().slice(0,10);
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${title}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    ${item ? `<p style="font-size:14px; color:var(--ink-soft); margin:0 0 14px 0;">${esc(item.name)}</p>` : ''}
    <div class="field"><label>Name</label><input type="text" id="complete-name-input" value="${esc(state.myName||'')}" placeholder="z. B. Simone" autofocus/></div>
    <div class="field"><label>Datum</label><input type="date" id="complete-date-input" value="${today}"/></div>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Abbrechen</button>
      <button class="btn" data-act="submit-complete" data-kind="${kind}" data-id="${id}">Bestätigen</button>
    </div>
  </div>`;
}

function gipfelzielKey(name){ return (name||'').trim().toLowerCase(); }


function gipfelzielLegendHtml(gipfelName){
  const key = gipfelzielKey(gipfelName);
  const tours = state.tours.filter(t=> gipfelzielKey(t.name)===key);
  return tours.map((t,i)=>{
    const color = ACCESS_ROUTE_COLORS[i % ACCESS_ROUTE_COLORS.length];
    return `<span class="hint" style="display:inline-flex; align-items:center; gap:4px; margin-right:10px;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>${esc(t.name)}${t.routeName ? ' – '+esc(t.routeName) : ''}</span>`;
  }).join('');
}

function renderGipfelzielOverviewMap(containerId, gipfelName){
  const el = document.getElementById(containerId);
  if(el){ el.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Karte wird geladen…</p>'; }
  fsmEnsureLoaded().then(()=>{
    const el2 = document.getElementById(containerId);
    if(!el2) return;
    const key = gipfelzielKey(gipfelName);
    const tours = state.tours.filter(t=> gipfelzielKey(t.name)===key);
    const tourEntries = tours.map((t,i)=>({ tour:t, color: ACCESS_ROUTE_COLORS[i % ACCESS_ROUTE_COLORS.length] }));
    const hasAny = tourEntries.some(e=> (e.tour.points && e.tour.points.length) || (e.tour.trackSimplified && e.tour.trackSimplified.length) || (e.tour.manualTrack && e.tour.manualTrack.length));
    if(!hasAny){
      el2.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Noch keine Kartendaten bei diesen Touren.</p>';
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
      : 'height:280px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--line);';
    el2.appendChild(mapDiv);
    const firstPoint = tourEntries.map(e=> e.tour.points && e.tour.points.length ? e.tour.points[0] : null).find(Boolean);
    const map = fsmCreateFlMap(mapDivId).setView(firstPoint ? [firstPoint.lat, firstPoint.lon] : [46.8182, 8.2275], firstPoint ? 13 : 8);
    registerMap(mapDivId, map);
    const boundsItems = [];
    tourEntries.forEach(({tour:t, color})=>{
      const track = (t.trackSimplified && t.trackSimplified.length) ? t.trackSimplified : (t.manualTrack && t.manualTrack.length ? t.manualTrack : null);
      if(track){
        try{
          FL.polyline(track, {color:'#ffffff', weight:6, opacity:0.7}).addTo(map);
          const line = FL.polyline(track, {color, weight:3.5, opacity:1}).addTo(map);
          boundsItems.push(line);
        }catch(e){ /* einzelnen fehlerhaften Track überspringen */ }
      }
      (t.points||[]).forEach(p=>{
        try{
          const m = FL.circleMarker([p.lat, p.lon], {radius:8, color:'#fff', weight:2, fillColor:color, fillOpacity:1}).addTo(map)
            .bindPopup(`<strong>${esc(t.name)}</strong>${t.routeName ? ' – '+esc(t.routeName) : ''}<br/>${esc(p.label||'Punkt')}`);
          boundsItems.push(m);
        }catch(e){ /* einzelnen fehlerhaften Punkt überspringen */ }
      });
    });
    if(boundsItems.length){
      map.fitBounds(FL.featureGroup(boundsItems).getBounds(), {padding:[30,30]});
    }
    if(!isFullscreen){
      const btn = makeFullscreenButton(function(id){ renderGipfelzielOverviewMap(id, gipfelName); });
      el2.appendChild(btn);
    }
  });
}

function hutFormHtml(existing){
  const h = existing || {};
  const isEditing = !!(existing && existing.id);
  const isKnownRegion = REGIONS.includes(h.region);
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>${isEditing?'Hütte bearbeiten':'Neue Hütte'}</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <form id="hut-form" novalidate>
      <div class="field"><label>Name der Hütte *</label><input required name="name" value="${esc(h.name||'')}" placeholder="z. B. Engstlenalp-Hütte"/></div>
      <div class="field"><label>Region</label>
        <div class="chips" id="region-chips">
          ${REGIONS.map(r=>`<button type="button" class="chip region-chip ${h.region===r?'on':''}" style="${h.region===r?'background:var(--ice-deep)':''}" data-region="${r}">${r}</button>`).join('')}
          <button type="button" class="chip region-chip ${h.region && !isKnownRegion?'on':''}" style="${h.region && !isKnownRegion?'background:var(--ice-deep)':''}" data-region="__other__">Anderes</button>
        </div>
        <input type="text" id="region-other-input" value="${!isKnownRegion?esc(h.region||''):''}" placeholder="eigene Region eintragen" style="margin-top:8px; ${h.region && !isKnownRegion?'':'display:none;'}"/>
        <input type="hidden" name="region" id="region-hidden-input" value="${esc(h.region||'')}"/>
      </div>
      <div class="field" id="subregion-field" style="${(isKnownRegion && REGION_SUBAREAS[h.region])?'':'display:none;'}">
        <label>Teilgebiet / Pass (optional)</label>
        <div class="chips" id="subregion-chips">${renderSubregionChipsHtml(h.region, h.subregion)}</div>
        <input type="hidden" name="subregion" id="subregion-hidden" value="${esc(h.subregion||'')}"/>
      </div>
      <div class="field"><label>Gebiet (optional)</label>
        <select name="gebietId"><option value="">— keins —</option>${state.gebiete.map(g=>`<option value="${g.id}" ${h.gebietId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select>
        <div class="hint">Fasst Touren &amp; Hütten derselben Region zusammen. Fehlt das Gebiet? Erst unter „Gebiete" anlegen.</div>
      </div>
      <div class="field"><label>Höhe (m ü. M.)</label><input name="altitude" value="${esc(h.altitude||'')}" placeholder="z. B. 1834"/></div>
      <div class="field"><label>Hütte bewartet</label>
        <div class="chips" id="staffed-months-chips">${monthChipsRowHtml('staffed-month-chip', h.staffedMonths, h.staffedMonthsPartial)}</div>
        <div class="hint">Antippen: 🟢 ganzen Monat offen. Nochmal antippen: 🟡 nur teilweise offen. Nochmal: wieder aus.</div>
      </div>
      <div class="field"><label>Bewartung — Zusatzinfo</label><textarea name="staffedNote">${esc(h.staffedNote||'')}</textarea></div>
      <div class="field"><label>Winterraum / Schutzraum</label><textarea name="winterraum" placeholder="Vorhanden? Anzahl Plätze, Zugang, Ausstattung …">${esc(h.winterraum||'')}</textarea></div>
      <div class="field"><label>Schutzraum offen</label>
        <div class="chips" id="winterraum-months-chips">${monthChipsRowHtml('winterraum-month-chip', h.winterraumMonths, h.winterraumMonthsPartial)}</div>
      </div>
      <div class="field"><label>Schutzraum — Zusatzinfo</label><textarea name="winterraumNote">${esc(h.winterraumNote||'')}</textarea></div>
      <div class="field"><label>Betten / Kapazität</label><input name="capacity" value="${esc(h.capacity||'')}" placeholder="z. B. 40 Betten"/></div>
      <div class="field"><label>Art der Anfahrt</label>
        <div class="chips" id="approach-type-chips">
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('auto')?'on':''}" style="${(h.approachTypes||[]).includes('auto')?'background:var(--ice-deep)':''}" data-value="auto">🚗 Auto</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('oev')?'on':''}" style="${(h.approachTypes||[]).includes('oev')?'background:var(--ice-deep)':''}" data-value="oev">🚌 ÖV</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('seilbahn')?'on':''}" style="${(h.approachTypes||[]).includes('seilbahn')?'background:var(--ice-deep)':''}" data-value="seilbahn">🚡 Seilbahn</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('zufuss')?'on':''}" style="${(h.approachTypes||[]).includes('zufuss')?'background:var(--ice-deep)':''}" data-value="zufuss">🥾 Zu Fuss</button>
        </div>
      </div>
      <div class="field"><label>Anfahrt — Details</label><textarea name="approach" placeholder="Ausgangspunkt, Parkplatz, ÖV …">${esc(h.approach||'')}</textarea></div>
      <div class="field"><label>Punkte auf der Karte (Hütte, Parkplatz, Haltestelle …)</label>
        <button type="button" class="btn secondary" id="points-map-toggle-btn">🗺️ Karte zum Setzen von Punkten öffnen</button>
        <div class="hint">📍 Punkt setzen: antippen, Kategorie &amp; Bezeichnung eintragen, speichern. ✏️ Linie zeichnen: eigenen Zustieg einzeichnen, falls kein GPX-Track vorhanden — antippen fügt Wegpunkte hinzu.</div>
        <div id="points-map" style="margin-top:10px; display:none;"></div>
        <div id="points-list"></div>
        <input type="hidden" name="points" id="points-hidden" value='${esc(JSON.stringify(h.points || (h.lat && h.lon ? [{label:"Hütte", lat:h.lat, lon:h.lon}] : [])))}'/>
        <input type="hidden" name="manualTrack" id="manual-track-hidden" value='${esc(JSON.stringify(h.manualTrack || []))}'/>
      </div>
      <input type="hidden" name="hutIdForTrack" id="hut-id-for-track" value="${esc(h.id||'')}"/>

      <div class="field" style="background:var(--ice-light); border-radius:var(--radius); padding:12px;">
        <label style="margin-bottom:4px;">Zustiege (Sommer/Winter, beliebig viele)</label>
        <p style="font-size:13px; color:var(--ink-soft); margin:0;">${isEditing ? 'Zustiege werden in der Detailansicht der Hütte verwaltet (nach dem Speichern über "✓ Speichern" erreichbar).' : 'Nach dem Anlegen kannst du in der Detailansicht beliebig viele Zustiege hinzufügen.'}</p>
      </div>

      <div class="field" style="margin-top:16px;"><label>Link zur Hütte</label><input type="url" name="hutLink" value="${esc(h.hutLink||'')}"/></div>
      <div class="field"><label>Kontakt / Reservation</label><input name="contact" value="${esc(h.contact||'')}" placeholder="Telefon, Website, SAC-Sektion …"/></div>
      <div class="field"><label>Notizen</label><textarea name="notes" placeholder="Sonstiges …">${esc(h.notes||'')}</textarea></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="entwurf" ${(!h.status || h.status==='entwurf')?'selected':''}>📝 Entwurf</option>
          <option value="vollstaendig" ${h.status==='vollstaendig'?'selected':''}>✅ Vollständig</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-act="close-modal">Abbrechen</button>
        <button type="button" id="hut-save-btn" class="btn">${isEditing?'Speichern':'Hütte anlegen'}</button>
      </div>
      <button type="button" id="hut-fab-save-btn" class="fab-save">✓ Speichern</button>
      ${isEditing ? `
      <div id="delete-hut-zone" style="margin-top:22px; padding-top:16px; border-top:1px solid var(--line); text-align:right;">
        <button type="button" id="delete-hut-trigger" data-id="${h.id}" style="background:none; border:none; color:var(--ink-faint); font-size:12.5px; text-decoration:underline; cursor:pointer;">Hütte löschen</button>
        <div id="delete-hut-confirm" style="display:none; margin-top:10px; font-size:13px; color:var(--danger);">
          In den Papierkorb verschieben (${TRASH_RETENTION_DAYS} Tage wiederherstellbar)?
          <button type="button" id="delete-hut-yes" data-id="${h.id}" class="btn danger" style="padding:5px 12px; font-size:12.5px; margin-left:8px;">Ja, löschen</button>
          <button type="button" id="delete-hut-no" style="background:none; border:none; color:var(--ink-soft); font-size:12.5px; text-decoration:underline; cursor:pointer; margin-left:6px;">Abbrechen</button>
        </div>
      </div>` : ''}
    </form>
  </div>`;
}

function hutDetailHtml(id){
  const h = state.huts.find(x=>x.id===id);
  if(!h) return `<div class="modal" data-stop="1"><p>Hütte nicht gefunden.</p></div>`;
  const linked = state.tours.filter(t=>t.hutId===h.id);
  const gebiet = h.gebietId ? state.gebiete.find(g=>g.id===h.gebietId) : null;
  migrateHutAccessRoutes(h);
  const routes = h.accessRoutes || [];
  const rangeText = accessRouteDifficultyRangeHtml(routes);
  const legend = accessRouteLegendHtml(routes);
  const hasMapData = (h.points && h.points.length) || (h.manualTrack && h.manualTrack.length) || routes.length;
  return `<div class="modal fs-onroute" data-stop="1">
    <div class="modal-head">
      <div><h2>🛖 ${esc(h.name)}</h2>${h.region ? `<p style="color:var(--ink-soft); font-size:14px; margin:4px 0 0 0;">${esc(h.region)}</p>` : ''}</div>
      <button class="x-btn" data-act="close-modal">×</button>
    </div>
    <p class="fs-status-line" style="font-size:13px; color:var(--ink-soft); margin:0 0 10px 0;">${hutStatusLabel(h)}</p>
    ${gebiet ? `<button class="hut-link-chip" style="border:none; cursor:pointer;" data-act="open-gebiet" data-id="${gebiet.id}">⛰️ Zum Gebiet: ${esc(gebiet.name)}</button>` : ''}
    <div class="detail-stats">
      ${h.altitude ? `<div class="detail-stat"><div class="num">${esc(h.altitude)}</div><div class="lbl">m ü. M.</div></div>` : ''}
      ${h.capacity ? `<div class="detail-stat"><div class="num">${esc(h.capacity)}</div><div class="lbl">Kapazität</div></div>` : ''}
    </div>
    <div class="detail-section">
      <h4>Bewartung</h4>
      <div class="chips">${monthChipsReadonlyHtml(h.staffedMonths, h.staffedMonthsPartial, 'var(--ok)')}</div>
      ${!(h.staffedMonths && h.staffedMonths.length) ? `<p style="margin-top:6px;">Unbewartet</p>` : ''}
      ${h.staffedNote ? `<p style="margin-top:8px;">${esc(h.staffedNote)}</p>` : ''}
    </div>
    <div class="detail-section">
      <h4>Winterraum / Schutzraum</h4>
      <div class="chips">${monthChipsReadonlyHtml(h.winterraumMonths, h.winterraumMonthsPartial, 'var(--ice-deep)')}</div>
      ${h.winterraum ? `<p style="margin-top:8px;">${esc(h.winterraum)}</p>` : ''}
      ${h.winterraumNote ? `<p style="margin-top:8px;">${esc(h.winterraumNote)}</p>` : ''}
    </div>
    ${h.hutLink ? `<div class="detail-section"><h4>Link zur Hütte</h4><p><a href="${esc(h.hutLink)}" target="_blank" rel="noopener noreferrer">${esc(h.hutLink)}</a></p></div>` : ''}
    ${((h.approachTypes && h.approachTypes.length) || h.approach) ? `<div class="detail-section">
      <h4>Anfahrt</h4>
      ${(h.approachTypes && h.approachTypes.length) ? `<div class="chips" style="margin-bottom:8px;">${h.approachTypes.map(v=>`<span class="chip" style="background:var(--ice-light); border-color:transparent;">${APPROACH_TYPE_LABELS[v]}</span>`).join('')}</div>` : ''}
      ${h.approach ? `<p>${esc(h.approach)}</p>` : ''}
    </div>` : ''}
    ${(h.points && h.points.length || (h.manualTrack && h.manualTrack.length)) ? `<div class="detail-section">
      <h4>Standort${h.points && h.points.length>1?'e':''}${(h.manualTrack && h.manualTrack.length) ? ' & Linie' : ''}</h4>
      <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 8px 0;">Allgemeine Punkte/Linie zur Hütte (z. B. Parkplatz).</p>
      ${(h.points && h.points.length) ? `<div class="chips" style="margin-bottom:8px;">${h.points.map(p=>`<span class="chip" style="background:var(--ice-light); border-color:transparent;">${(MAP_POINT_CATEGORIES[p.category||'']||MAP_POINT_CATEGORIES['']).icon} ${esc(p.label||'Punkt')}</span>`).join('')}</div>` : ''}
      ${(h.manualTrack && h.manualTrack.length) ? `<span class="hint">🔴 Rot: selbst eingezeichnet</span>` : ''}
      ${(h.manualTrack && h.manualTrack.length) ? `<button type="button" class="btn secondary" style="margin-top:8px;" data-act="download-manual-gpx" data-track='${esc(JSON.stringify(h.manualTrack))}' data-name="${esc(h.name)}">📥 Route als GPX exportieren</button>` : ''}
      <button type="button" class="btn secondary" style="margin-top:8px;" id="quick-edit-toggle-${h.id}" data-act="quick-edit-toggle" data-id="${h.id}" data-kind="hut" title="Gedrückt halten, um die Karte zu bearbeiten">Karte bearbeiten</button>
      <div id="quick-edit-map-${h.id}" style="margin-top:10px; display:none;"></div>
      <div id="quick-edit-list-${h.id}"></div>
      <input type="hidden" id="quick-points-hidden-${h.id}" value='${esc(JSON.stringify(h.points||[]))}'/>
      <input type="hidden" id="quick-manual-track-hidden-${h.id}" value='${esc(JSON.stringify(h.manualTrack||[]))}'/>
      <div class="fs-quick-bar" style="display:none;" id="quick-save-btn-${h.id}">
        <button type="button" class="btn secondary" data-act="quick-discard" data-id="${h.id}">Verwerfen</button>
        <button type="button" class="btn" data-act="quick-save" data-id="${h.id}" data-kind="hut">Speichern</button>
      </div>
    </div>` : ''}

    ${hasMapData ? `<div class="detail-section">
      <h4>🗺️ Karte</h4>
      <p style="font-size:12.5px; color:var(--ink-soft); margin:0 0 8px 0;">Standorte, selbst eingezeichnete Linie und alle Zustiege zusammen auf einer Karte.</p>
      <button type="button" class="btn secondary" style="margin-bottom:10px;" data-act="show-access-routes-map" data-points='${esc(JSON.stringify(h.points||[]))}' data-routes='${esc(JSON.stringify(routes))}' data-manual-track='${esc(JSON.stringify(h.manualTrack||[]))}' data-hut-id="${h.id}" data-target="map-hut-${h.id}">🗺️ Karte anzeigen</button>
      <div id="map-hut-${h.id}" style="margin-bottom:10px;"></div>
    </div>` : ''}

    <div class="detail-section">
      <h4>Zustiege${routes.length ? ` (${routes.length})` : ''}</h4>
      ${routes.length ? `
        ${rangeText ? `<p style="font-size:13px; color:var(--ink-soft); margin:0 0 8px 0;">${rangeText}</p>` : ''}
        ${legend ? `<div style="margin-bottom:8px;">${legend}</div>` : ''}
        <div class="grid">${routes.map((r,i)=>accessRouteRowHtml(r,i,h.id)).join('')}</div>
      ` : `<p class="fs-empty" style="font-size:13px; color:var(--ink-soft);">Noch kein Zustieg erfasst.</p>`}
      <button type="button" class="btn secondary" style="margin-top:10px;" data-act="add-access-route" data-hut-id="${h.id}">+ Zustieg hinzufügen</button>
    </div>

    ${h.contact ? `<div class="detail-section"><h4>Kontakt</h4><p>${esc(h.contact)}</p></div>` : ''}
    ${h.notes ? `<div class="detail-section"><h4>Notizen</h4><p>${esc(h.notes)}</p></div>` : ''}

    <div class="detail-section">
      <h4>Touren ab dieser Hütte (${linked.length})</h4>
      ${linked.length ? `<div class="grid" style="margin-top:6px;">${linked.map(tourCardHtml).join('')}</div>` : `<p style="font-size:13.5px; color:var(--ink-soft);">Noch keine Tour mit dieser Hütte verknüpft. Beim Anlegen oder Bearbeiten einer Tour kann die Hütte ausgewählt werden.</p>`}
    </div>

    <div class="detail-section">
      <h4>Abgeschlossen von</h4>
      ${(h.completions && h.completions.length) ? `<div class="cond-box" style="display:flex; flex-direction:column; gap:6px;">
        ${h.completions.map((c,idx)=>`<div style="display:flex; justify-content:space-between; align-items:center; font-size:13.5px;">
          <span>✓ ${esc(c.by||'?')}${c.date ? ' · ' + fmtDateOnly(c.date) : ''}</span>
          <button data-act="remove-completion" data-kind="hut" data-id="${h.id}" data-idx="${idx}" style="background:none; border:none; color:var(--danger); font-size:12px; cursor:pointer;">entfernen</button>
        </div>`).join('')}
      </div>` : `<p class="fs-empty" style="margin:0; font-size:13px; color:var(--ink-soft);">Noch niemand hat diese Hütte als besucht markiert.</p>`}
    </div>

    <div class="meta-line" style="margin-top:16px;">Angelegt von ${esc(h.createdBy||'?')} · ${fmtDate(h.createdAt)}${h.updatedAt && h.updatedAt!==h.createdAt ? ` · zuletzt bearbeitet von ${esc(h.updatedBy||'?')} · ${fmtDate(h.updatedAt)}` : ''}</div>

    <div class="detail-actions">
      <button class="btn secondary" data-act="open-complete-hut" data-id="${h.id}">✓ Als abgeschlossen markieren</button>
      <button class="btn secondary" data-act="edit-hut" data-id="${h.id}">Bearbeiten</button>
    </div>
  </div>`;
}

function abgeschlossenViewHtml(){
  const groups = buildPersonGroups();
  const names = Object.keys(groups);
  if(!names.length){
    return `<div class="empty">
      <h3>Noch nichts als abgeschlossen markiert</h3>
      <p>Öffne eine Tour oder Hütte und tippe auf "Als abgeschlossen markieren", um sie hier zu sammeln.</p>
    </div>`;
  }
  names.sort((a,b)=>{
    if(state.myName){
      if(a===state.myName) return -1;
      if(b===state.myName) return 1;
    }
    return a.localeCompare(b, 'de');
  });
  return names.map(name=>{
    const g = groups[name];
    const isMe = state.myName && name===state.myName;
    const total = g.tours.length + g.huts.length;
    return `<div class="detail-section" style="margin-bottom:28px;">
      <h4>${isMe ? '⭐ Meine Liste' : esc(name)} (${total})</h4>
      ${g.tours.length ? `<div class="grid" style="margin-top:6px;">${g.tours.map(tourCardHtml).join('')}</div>` : ''}
      ${g.huts.length ? `<div class="grid" style="margin-top:${g.tours.length?12:6}px;">${g.huts.map(hutCardHtml).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function openCompleteTour(id){
  state.modal = {type:'complete-tour', payload:id};
  render();
}

function openCompleteHut(id){
  state.modal = {type:'complete-hut', payload:id};
  render();
}

async function submitCompleteTour(id, name, date){
  const t = state.tours.find(x=>x.id===id);
  if(!t) return;
  if(!Array.isArray(t.completions)) t.completions = [];
  t.completions.push({by: (name||'').trim() || state.myName, date: date});
  t.completed = true;
  t.updatedAt = new Date().toISOString();
  t.updatedBy = state.myName;
  state.modal = {type:'tour-detail', payload:id};
  render();
  const ok = await saveTourCloud(t).catch(()=>false);
  t._unsynced = !ok;
  if(!ok) markUnsaved();
  render();
}

async function submitCompleteHut(id, name, date){
  const h = state.huts.find(x=>x.id===id);
  if(!h) return;
  if(!Array.isArray(h.completions)) h.completions = [];
  h.completions.push({by: (name||'').trim() || state.myName, date: date});
  h.completed = true;
  h.updatedAt = new Date().toISOString();
  h.updatedBy = state.myName;
  state.modal = {type:'hut-detail', payload:id};
  render();
  const ok = await saveHutCloud(h).catch(()=>false);
  h._unsynced = !ok;
  if(!ok) markUnsaved();
  render();
}

async function removeCompletion(kind, id, idx){
  const item = kind==='tour' ? state.tours.find(x=>x.id===id) : state.huts.find(x=>x.id===id);
  if(!item || !Array.isArray(item.completions)) return;
  item.completions.splice(idx, 1);
  item.completed = item.completions.length > 0;
  item.updatedAt = new Date().toISOString();
  item.updatedBy = state.myName;
  render();
  const saveFn = kind==='tour' ? saveTourCloud : saveHutCloud;
  const ok = await saveFn(item).catch(()=>false);
  item._unsynced = !ok;
  if(!ok) markUnsaved();
  render();
}

function renderListOnly(){
  const main = document.querySelector('main');
  if(!main) return;
  main.innerHTML = state.loading ? `<div class="loading">Lade…</div>` : (state.view==='gebiete' ? gebieteViewHtml() : state.view==='touren' ? tourenViewHtml() : state.view==='huetten' ? huettenViewHtml() : state.view==='agenda' ? agendaViewHtml() : state.view==='papierkorb' ? papierkorbPageHtml() : abgeschlossenViewHtml());
  wireGlobalHandlers();
  const input = main.querySelector('.search-input');
  if(input){ input.focus(); input.selectionStart = input.selectionEnd = input.value.length; }
}
