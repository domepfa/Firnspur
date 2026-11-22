/* ================================================================
   0-ski-wandern.js – gemeinsamer Code von Skitour (index.html) und Wandern (wandern.html).
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

async function saveHutCloud__sw(hut){ return await fbSet('huts/'+hut.id, hut); }


function removeGebiet(id){
  moveToTrash(id, state.gebiete, state.trashedGebiete, saveGebietCloud);
}

async function submitName__sw(nameVal, pinVal){
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

function openAddTour__sw(){ dlog('Klick auf "+ Neue Tour"'); ensureName(()=>{ state.modal = {type:'edit-tour', payload:null}; render(); }); }

function openAddTourWithPoint__sw(lat, lon){ ensureName(()=>{ state.modal = {type:'edit-tour', payload:{points:[{label:'', lat, lon}]}}; render(); }); }

function openEditTour__sw(id){ ensureName(()=>{ const t = state.tours.find(x=>x.id===id); navigateToModal({type:'edit-tour', payload:t}); }); }

function navigateToModal__sw(newModal){
  // Ungespeicherte Änderungen (Formular, «Karte bearbeiten») nicht still verlassen
  if(modalIsDirty && modalDirtyTrackingKey() && !confirmDiscardIfDirty()) return;
  if(state.modal){
    state.modalBackStack.push({ forType: newModal.type, modal: state.modal });
    // Jede zusätzliche Cross-Link-Ebene bekommt ihren EIGENEN Browser-History-Eintrag, statt sich
    // (wie früher) auf den einen, für die ganze Sitzung geteilten Eintrag zu verlassen – sonst
    // fehlte beim Zurückschliessen mehrerer Ebenen irgendwann ein Eintrag, und ein weiteres
    // Zurückwischen "leckte" in die davorliegende Seite durch (z. B. in die andere App). Sicher,
    // weil dies eine direkte Nutzeraktion ist (kein synchrones back()+pushState() wie bei der
    // Historie-Warnung weiter unten in closeModal() – dort geht es um einen anderen Fall).
    try{ history.pushState({fsLayer:'modal'}, '', location.href); }catch(e){}
  }else{
    state.modalBackStack = [];
  }
  state.modal = newModal;
  render();
}

function openTourDetail__sw(id){ navigateToModal({type:'tour-detail', payload:id}); }

function openAddGebiet(){ ensureName(()=>{ state.modal = {type:'edit-gebiet', payload:null}; render(); }); }

function openEditGebiet(id){ ensureName(()=>{ const g = state.gebiete.find(x=>x.id===id); navigateToModal({type:'edit-gebiet', payload:g}); }); }

function openGebietDetail(id){ navigateToModal({type:'gebiet-detail', payload:id}); }

function closeModal__sw(fromPopstate, skipDirtyCheck, keepHistoryLayer){
  if(!skipDirtyCheck && !confirmDiscardIfDirty()){
    // Nutzer will weiter bearbeiten – nichts schliessen, und explizit NICHT render() aufrufen:
    // das würde die Maske komplett neu aus dem gespeicherten Ausgangszustand aufbauen und damit
    // genau die unges­icherten Eingaben verwerfen, die der Nutzer gerade bewusst behalten wollte.
    // Bei der Hardware-/Browser-Zurück-Taste wurde der History-Eintrag bereits konsumiert (siehe
    // popstate-Handler) – den stellen wir hier gezielt wieder her, ohne die Maske neu zu rendern.
    // Der Eintrag ist verbraucht, auch wenn modalHistoryPushed noch true sagt: neu anlegen
    if(fromPopstate){ modalHistoryPushed = false; pushModalHistoryIfNeeded(); }
    return;
  }
  // Nach dem Speichern geschlossen: Formular gilt als erledigt, sein Entwurf ist überflüssig
  if(skipDirtyCheck && keepHistoryLayer && typeof resetModalDirty === 'function' && modalDirtyTrackingKey()) resetModalDirty();
  // Verlassen = wieder gesperrt (Karte in der Detailansicht nicht mehr im Bearbeiten-Modus).
  state.quickEditOpenId = null;
  stopLiveGpsOnMap();
  // Zustiege sind "verschachtelt" unter einer Hütte – beim Schliessen zurück zur
  // Hütten-Detailansicht statt ganz zur Übersicht, damit man nicht jedes Mal neu
  // hinein navigieren muss. Ein Klick auf X/Zurück (oder die Hardware-Zurück-Taste)
  // schliesst dadurch immer nur die zuoberst offene Ebene.
  // Zurück führt IMMER dorthin, wo man vorher war (Verlauf aus navigateToModal) – erst wenn es
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
  // konsumiert – landen wir dadurch bei einer übergeordneten Ansicht (state.modal noch gesetzt,
  // z. B. eine Cross-Link-Ebene aus navigateToModal()), hat deren EIGENER History-Eintrag genau
  // diesen Schritt repräsentiert; modalHistoryPushed bleibt also true, kein erneutes Pushen nötig.
  // Erst wenn wirklich alles geschlossen ist (state.modal===null), ist auch der zugehörige
  // History-Eintrag "aufgebraucht".
  if(fromPopstate && !state.modal) modalHistoryPushed = false;
  render();
  // keepHistoryLayer: der Aufrufer öffnet direkt im Anschluss ein neues Modal (z. B. nach dem
  // Speichern zur Detailansicht) – dann ist die Modal-"Ebene" aus Sicht der Browser-Historie nie
  // wirklich geschlossen worden, also darf hier kein history.back() ausgelöst werden. Das wäre
  // sonst ein synchrones history.back() gefolgt von einem sofortigen history.pushState() (beim
  // Öffnen des neuen Modals) – genau diese Kombination verhält sich browserübergreifend
  // inkonsistent und kann die Historie verwirren, sodass eine spätere Zurück-Aktion zu weit
  // zurückspringt (bis auf die andere App).
  if(!state.modal && modalHistoryPushed && !keepHistoryLayer){
    modalHistoryPushed = false;
    if(!fromPopstate) consumeHistoryEntry();
  }
}

async function submitHutForm__sw(form, existing){
  // Stand vor dem Speichern – für "Rückgängig" im Hinweis danach.
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
  if(form.accessRoutes != null){ try{ const ar = JSON.parse(form.accessRoutes || '[]'); if(Array.isArray(ar)) h.accessRoutes = ar; }catch(e){} } // Routenliste im Formular
  h.gebietId = form.gebietId || '';
  migrateHutAccessRoutes(h);
  const newAr = fsHutAdoptLine(h); // gezeichnete Linie wird ein Zustieg
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
    fsToastLocalSaved('Hütte ist');
  }else{
    offerUndoAfterSave('Hütte gespeichert.', state.huts, undoPrev, saveHutCloud);
  }
  render();
  if(newAr) setTimeout(()=> fsHutAskSeason(h.id, newAr.id), 300); // Jahreszeit des neuen Zustiegs
}

async function submitGebietForm(form, existing){
  // Stand vor dem Speichern – für "Rückgängig" im Hinweis danach.
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
    fsToastLocalSaved('Gebiet ist');
  }else{
    offerUndoAfterSave('Gebiet gespeichert.', state.gebiete, undoPrev, saveGebietCloud);
  }
  render();
}

function setView__sw(v){ state.view = v; state.modal = null; modalOpenedFromStandaloneMap = false; render(); }


function render__sw(){
  const app = document.getElementById('app');
  const kept = fsTakeKeptModal(); // «Karte bearbeiten» offen: Ansicht behalten
  // Seite nur neu aufbauen, wenn sich etwas geändert hat: Tour öffnen/schliessen ändert nur das Fenster,
  // die Liste und die Startkarte darunter bleiben dann stehen (ruckelte sonst bei jedem Öffnen)
  const html = shellHtml();
  if(html !== app._fsShell || !app.firstElementChild || app.firstElementChild !== app._fsShellEl){ app.innerHTML = html; app._fsShell = html; app._fsShellEl = app.firstElementChild; wireGlobalHandlers(); }
  else{ const mr = document.getElementById('modal-root'); if(mr && !state.modal) mr.innerHTML = ''; }
  if(!fsRestoreKeptModal(kept) && state.modal) renderModal();
  if(!state.loading) cacheLocalSnapshot();
  syncAgendaTabButton();
}

function syncAgendaTabButton(){
  const btn = document.getElementById('agenda-tab-btn');
  if(btn) btn.classList.toggle('active', state.view==='agenda');
}

function emptyHuts__sw(){
  const hasAny = state.huts.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Keine Hütte passt zu diesem Filter' : 'Noch keine Hütte erfasst'}</h3>
    <p>${hasAny ? 'Suche anpassen oder eine neue Hütte hinzufügen.' : 'Trag eine Hütte ein – Anfahrt, Zustieg, und ob und wann sie bewartet ist.'}</p>
    <button class="btn" data-act="add-hut">+ Neue Hütte</button>
  </div>`;
}

function hutCardHtml__sw(h){ return fsHutCardHtml(h); }

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
    </div>
    ${gebietListControlsHtml(listAll, {scan:false})}
    <button type="button" class="btn secondary fs-geb-add" data-act="add-gebiet">${fsIconHtml('mountain')}Gebiet auf der Karte umfahren</button>
    ${fsGebSugHtml()}
    ${list.length ? `<div class="grid">${list.map(gebietCardHtml).join('')}</div>` : emptyGebiete()}
  `);
}

function emptyGebiete(){
  const hasAny = state.gebiete.length>0;
  return `<div class="empty">
    <h3>${hasAny ? 'Kein Gebiet passt zu diesem Filter' : 'Noch kein Gebiet erfasst'}</h3>
    <p>${hasAny ? 'Suche anpassen oder ein neues Gebiet hinzufügen.' : 'Ein Gebiet fasst Touren und Hütten derselben Region zusammen (z. B. ein Tal oder Massiv) – leg es an und verlinke dann Touren/Hütten damit.'}</p>
  </div>`;
}

function gebietTouren(geb){ return state.tours.filter(t=>t.gebietId===geb.id); }

// Gebiet als Blatt über der Karte: Inhalte für die Karte dahinter (siehe fsShowAreaContextMap)
function fsAreaForMap__sw(modal){
  if(modal && modal.type === 'hut-detail') return fsHutArea(state.huts.find(x=> x.id === modal.payload));
  if(!modal || modal.type !== 'gebiet-detail') return null;
  const geb = state.gebiete.find(x=>x.id===modal.payload);
  if(!geb) return null;
  const extraPoints = (geb.points || []).filter(p=> p && isFinite(p.lat) && isFinite(p.lon)).map(p=> ({lat:+p.lat, lon:+p.lon, category:p.category || '', label:p.label || '', owner: geb.name}));
  return {key: geb.id, name: geb.name, tours: gebietTouren(geb), huts: gebietHuetten(geb), points: geb.points || [], extraPoints};
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
      el2.innerHTML = '<p style="font-size:13px; color:var(--ink-soft);">Noch keine Kartendaten – weder beim Gebiet noch bei den Touren/Hütten.</p>';
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
          const m = FL.marker([p.lat, p.lon], {icon: makeCategoryIcon(p.category)}).addTo(map).bindPopup(`<strong>${fsIconHtml('hut')} ${esc(h.name)}</strong><br/>${esc(p.label||'Punkt')}`);
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

function renderModal__sw(){
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

function buildExportData__sw(){
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

function exportModalHtml__sw(payload){
  const singleTour = payload && payload.tourId ? state.tours.find(t=>t.id===payload.tourId) : null;
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Exportieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    ${singleTour
      ? `<p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Nur diese Tour: <strong>${esc(singleTour.name)}</strong>. Lade sie herunter oder kopiere den Text, um sie mit jemandem zu teilen.</p>`
      : `<p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Lade eine Datei herunter und teile sie mit deinen Freunden (z. B. per WhatsApp/E-Mail) – oder kopiere den Text. Sie importieren die Datei/den Text, um eure Sammlungen zusammenzuführen.</p>
    <div class="field">
      <label>Was exportieren?</label>
      <div class="chips" id="export-filter-chips">
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="tours" data-act="toggle-export-filter">${fsIconHtml('mountain')} Touren</button>
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="huts" data-act="toggle-export-filter">${fsIconHtml('hut')} Hütten</button>
        <button type="button" class="chip on" style="background:var(--ice-deep)" data-export-key="agenda" data-act="toggle-export-filter">${fsIconHtml('calendar')} Agenda</button>
      </div>
    </div>`
    }
    <div class="form-actions" style="margin-bottom:12px; flex-wrap:wrap;">
      <button class="btn" data-act="download-export">${fsIconHtml('download')} Als Datei herunterladen</button>
      <button class="btn secondary" data-act="copy-export">In Zwischenablage kopieren</button>
    </div>
    <textarea readonly style="width:100%; min-height:180px; font-family:'Manrope'; font-size:11.5px;" id="export-text"></textarea>
    <div class="form-actions">
      <button class="btn secondary" data-act="close-modal">Schliessen</button>
    </div>
  </div>`;
}

function importModalHtml__sw(){
  return `<div class="modal" data-stop="1">
    <div class="modal-head"><h2>Importieren</h2><button class="x-btn" data-act="close-modal">×</button></div>
    <p style="font-size:13.5px; color:var(--ink-soft); margin:0 0 12px 0;">Wähle eine Datei, die dir jemand geschickt hat, oder füge den Text ein. Bestehende Einträge mit gleicher ID werden aktualisiert, neue werden hinzugefügt.</p>
    <p style="font-size:13px; margin:0 0 12px 0;"><button type="button" class="btn secondary" style="font-size:12.5px; padding:6px 12px;" data-act="open-vorlagen">${fsIconHtml('note')} Ressourcen &amp; Vorlagen</button> – Bedienungsanleitung, JSON-Vorlage &amp; KI-Anleitung, zum Weitergeben an Kolleg:innen.</p>
    <div class="field">
      <label>Datei wählen</label>
      <label class="btn secondary fs-file-btn">${fsIconHtml('upload')}Datei wählen<input type="file" id="import-file" accept="application/json,.json,.txt" hidden/></label><span class="fs-file-picked"></span>
    </div>
    <p style="font-size:12.5px; color:var(--ink-soft); margin:10px 0 6px 0;">– oder Text einfügen –</p>
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
    ${item ? `<p style="font-size:14px; color:var(--ink-soft); margin:0 0 14px 0;">${escL(item.name)}</p>` : ''}
    <div class="field"><label>Name</label><input type="text" id="complete-name-input" value="${esc(state.myName||'')}" placeholder="z. B. Simone" autofocus/></div>
    <div class="field"><label>Datum</label><input type="date" id="complete-date-input" value="${today}"/></div>
    ${kind==='tour' ? fsCompletionNoteFieldHtml() : ''}
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

function hutFormHtml__sw(existing){
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
        <select name="gebietId"><option value="">– keins –</option>${state.gebiete.map(g=>`<option value="${g.id}" ${h.gebietId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}${h.gebietId && !state.gebiete.some(g=> g.id === h.gebietId) ? `<option value="${esc(h.gebietId)}" selected>Gebiet aus der anderen App (bleibt)</option>` : ''}</select>
        <div class="hint">Fasst Touren &amp; Hütten derselben Region zusammen. Fehlt das Gebiet? Erst unter „Gebiete" anlegen.</div>
      </div>
      <div class="field"><label>Höhe (m ü. M.)</label><input name="altitude" value="${esc(h.altitude||'')}" placeholder="z. B. 1834"/></div>
      <div class="field"><label>Hütte bewartet</label>
        <div class="chips" id="staffed-months-chips">${monthChipsRowHtml('staffed-month-chip', h.staffedMonths, h.staffedMonthsPartial)}</div>
        <div class="hint">Antippen: ${fsIconHtml('dot', '#3C8A55', true)} ganzen Monat offen. Nochmal antippen: ${fsIconHtml('dot', '#E0A91B', true)} nur teilweise offen. Nochmal: wieder aus.</div>
      </div>
      <div class="field"><label>Bewartung – Zusatzinfo</label><textarea name="staffedNote">${esc(h.staffedNote||'')}</textarea></div>
      <div class="field"><label>Winterraum / Schutzraum</label><textarea name="winterraum" placeholder="Vorhanden? Anzahl Plätze, Zugang, Ausstattung …">${esc(h.winterraum||'')}</textarea></div>
      <div class="field"><label>Schutzraum offen</label>
        <div class="chips" id="winterraum-months-chips">${monthChipsRowHtml('winterraum-month-chip', h.winterraumMonths, h.winterraumMonthsPartial)}</div>
      </div>
      <div class="field"><label>Schutzraum – Zusatzinfo</label><textarea name="winterraumNote">${esc(h.winterraumNote||'')}</textarea></div>
      <div class="field"><label>Betten / Kapazität</label><input name="capacity" value="${esc(h.capacity||'')}" placeholder="z. B. 40 Betten"/></div>
      <div class="field"><label>Art der Anfahrt</label>
        <div class="chips" id="approach-type-chips">
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('auto')?'on':''}" style="${(h.approachTypes||[]).includes('auto')?'background:var(--ice-deep)':''}" data-value="auto">${fsIconHtml('car')} Auto</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('oev')?'on':''}" style="${(h.approachTypes||[]).includes('oev')?'background:var(--ice-deep)':''}" data-value="oev">${fsIconHtml('bus')} ÖV</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('seilbahn')?'on':''}" style="${(h.approachTypes||[]).includes('seilbahn')?'background:var(--ice-deep)':''}" data-value="seilbahn">${fsIconHtml('cable')} Seilbahn</button>
          <button type="button" class="chip approach-type-chip ${(h.approachTypes||[]).includes('zufuss')?'on':''}" style="${(h.approachTypes||[]).includes('zufuss')?'background:var(--ice-deep)':''}" data-value="zufuss">${fsIconHtml('walk')} Zu Fuss</button>
        </div>
      </div>
      <div class="field"><label>Anfahrt – Details</label><textarea name="approach" placeholder="Ausgangspunkt, Parkplatz, ÖV …">${esc(h.approach||'')}</textarea></div>
      <div class="field"><label>Punkte auf der Karte (Hütte, Parkplatz, Haltestelle …)</label>
        <button type="button" class="btn secondary" id="points-map-toggle-btn">${fsIconHtml('map')} Auf der Karte bearbeiten</button>
        <div class="hint">${fsIconHtml('pin')} Punkt setzen: antippen, Kategorie &amp; Bezeichnung eintragen, speichern. Zustiege zeichnest du unten unter «Zustiege».</div>
        <div id="points-map" style="margin-top:10px; display:none;"></div>
        <div id="points-list"></div>
        <input type="hidden" name="points" id="points-hidden" value='${esc(JSON.stringify(h.points || (h.lat && h.lon ? [{label:"Hütte", lat:h.lat, lon:h.lon}] : [])))}'/>
        <input type="hidden" name="manualTrack" id="manual-track-hidden" value='${esc(JSON.stringify(h.manualTrack || []))}'/>
      </div>
      <input type="hidden" name="hutIdForTrack" id="hut-id-for-track" value="${esc(h.id||'')}"/>
      ${fsHutRoutesFieldHtml(h)}


      <div class="field" style="margin-top:16px;"><label>Link zur Hütte</label><input type="url" name="hutLink" value="${esc(h.hutLink||'')}"/></div>
      <div class="field"><label>Kontakt / Reservation</label><input name="contact" value="${esc(h.contact||'')}" placeholder="Telefon, Website, SAC-Sektion …"/></div>
      <div class="field"><label>Notizen</label><textarea name="notes" placeholder="Sonstiges …">${esc(h.notes||'')}</textarea></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="entwurf" ${(!h.status || h.status==='entwurf')?'selected':''}>Entwurf</option>
          <option value="vollstaendig" ${h.status==='vollstaendig'?'selected':''}>Vollständig</option>
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
          <button type="button" id="delete-hut-yes" data-id="${h.id}" class="btn danger">Ja, löschen</button>
          <button type="button" id="delete-hut-no" class="btn secondary fs-del-keep">Behalten</button>
        </div>
      </div>` : ''}
    </form>
  </div>`;
}

function hutDetailHtml__sw(id){
  const h = state.huts.find(x=>x.id===id);
  if(!h) return `<div class="modal" data-stop="1"><p>Hütte nicht gefunden.</p></div>`;
  const linked = state.tours.filter(t=>t.hutId===h.id);
  const gebiet = h.gebietId ? state.gebiete.find(g=>g.id===h.gebietId) : null;
  migrateHutAccessRoutes(h);
  const routes = h.accessRoutes || [];
  const rangeText = accessRouteDifficultyRangeHtml(routes);
  const legend = accessRouteLegendHtml(routes);
  const hasMapData = (h.points && h.points.length) || (h.manualTrack && h.manualTrack.length) || routes.length;
  return `<div class="modal td gd fs-onroute fs-hut-sheet" data-stop="1">
    <div class="modal-head">
      <div><h2>${fsIconHtml('hut')} ${esc(h.name)}</h2>${h.region ? `<p style="color:var(--ink-soft); font-size:14px; margin:4px 0 0 0;">${escL(h.region)}</p>` : ''}</div>
      <div style="display:flex; align-items:flex-start; gap:4px;">${editIconButtonHtml('edit-hut', h.id)}<button class="x-btn" data-act="close-modal">×</button></div>
    </div>
    <p class="fs-status-line" style="font-size:13px; color:var(--ink-soft); margin:0 0 10px 0;">${hutStatusLabel(h)}</p>
    ${gebiet ? `<button class="hut-link-chip" style="border:none; cursor:pointer;" data-act="open-gebiet" data-id="${gebiet.id}">${fsIconHtml('mountain')} Zum Gebiet: ${esc(gebiet.name)}</button>` : ''}
    <div class="detail-stats">
      ${h.altitude ? `<div class="detail-stat"><div class="num">${esc(h.altitude)}</div><div class="lbl">m ü. M.</div></div>` : ''}
      ${h.capacity ? `<div class="detail-stat"><div class="num">${esc(h.capacity)}</div><div class="lbl">Kapazität</div></div>` : ''}
    </div>
    <div class="detail-section">
      <h4>Bewartung</h4>
      <div class="chips">${monthChipsReadonlyHtml(h.staffedMonths, h.staffedMonthsPartial, 'var(--ok)')}</div>
      ${!(h.staffedMonths && h.staffedMonths.length) ? `<p style="margin-top:6px;">Unbewartet</p>` : ''}
      ${h.staffedNote ? `<p style="margin-top:8px;">${escL(h.staffedNote)}</p>` : ''}
    </div>
    <div class="detail-section">
      <h4>Winterraum / Schutzraum</h4>
      <div class="chips">${monthChipsReadonlyHtml(h.winterraumMonths, h.winterraumMonthsPartial, 'var(--ice-deep)')}</div>
      ${h.winterraum ? `<p style="margin-top:8px;">${escL(h.winterraum)}</p>` : ''}
      ${h.winterraumNote ? `<p style="margin-top:8px;">${escL(h.winterraumNote)}</p>` : ''}
    </div>
    ${h.hutLink ? `<div class="detail-section"><h4>Link zur Hütte</h4><p><a href="${esc(h.hutLink)}" target="_blank" rel="noopener noreferrer">${esc(h.hutLink)}</a></p></div>` : ''}
    ${((h.approachTypes && h.approachTypes.length) || h.approach) ? `<div class="detail-section">
      <h4>Anfahrt</h4>
      ${(h.approachTypes && h.approachTypes.length) ? `<div class="chips" style="margin-bottom:8px;">${h.approachTypes.map(v=>`<span class="chip" style="background:var(--ice-light); border-color:transparent;">${fsTypeLabel(APPROACH_TYPE_LABELS, v)}</span>`).join('')}</div>` : ''}
      ${h.approach ? `<p>${escL(h.approach)}</p>` : ''}
    </div>` : ''}
    ${(h.points && h.points.length) ? `<div class="detail-section">
      <h4>Standort${h.points.length>1?'e':''}</h4>
      <div class="chips" style="margin-bottom:8px;">${h.points.map(p=>`<span class="chip" data-act="fs-point-goto" data-lat="${p.lat}" data-lon="${p.lon}" data-label="${esc(p.label||'Punkt')}" role="button" tabindex="0" style="cursor:pointer;">${fsIco((MAP_POINT_CATEGORIES[p.category || ''] || {}).icon || 'pin')} ${esc(p.label||'Punkt')}</span>`).join('')}</div>
    </div>` : ''}


    <div class="detail-section">
      <h4>Zustiege${routes.length ? ` (${routes.length})` : ''}</h4>
      ${fsHutRoutesBodyHtml(h, routes, rangeText, legend)}
      <button type="button" class="btn secondary" style="margin-top:10px;" data-act="add-access-route" data-hut-id="${h.id}">+ Zustieg hinzufügen</button>
    </div>

    ${h.contact ? `<div class="detail-section"><h4>Kontakt</h4><p>${escL(h.contact)}</p></div>` : ''}
    ${h.notes ? `<div class="detail-section"><h4>Notizen</h4><p>${escL(h.notes)}</p></div>` : ''}

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
    </div>
  </div>`;
}

function abgeschlossenViewHtml__sw(){
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
      <h4>${isMe ? (fsIconHtml('star', '#D99A1E', true) + ' Meine Liste') : esc(name)} (${total})</h4>
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
  resetModalDirty(); // gespeichert: kein Entwurf
  if(!Array.isArray(t.completions)) t.completions = [];
  t.completions.push({by: (name||'').trim() || state.myName, date: date});
  fsCompletionNoteTake(t, (name||'').trim() || state.myName, date);
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
  resetModalDirty(); // gespeichert: kein Entwurf
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

function renderListOnly__sw(){
  const main = document.querySelector('main');
  if(!main) return;
  const hadFocus = !!(document.activeElement && document.activeElement.matches && document.activeElement.matches('main .search-input'));
  main.innerHTML = state.loading ? fsLoadingStageHtml() : (state.view==='gebiete' ? gebieteViewHtml() : state.view==='touren' ? tourenViewHtml() : state.view==='huetten' ? huettenViewHtml() : state.view==='agenda' ? agendaViewHtml() : state.view==='papierkorb' ? papierkorbPageHtml() : abgeschlossenViewHtml());
  const app = document.getElementById('app'); if(app) app._fsShell = null; // render() baut danach wieder ganz neu
  wireGlobalHandlers();
  // Fokus nur zurück ins Suchfeld der Liste, wenn dort getippt wurde (nicht bei der Suchleiste oben)
  const input = main.querySelector('.search-input');
  if(input && hadFocus){ input.focus(); input.selectionStart = input.selectionEnd = input.value.length; }
}

/* ===== Gebiete schnell anlegen: Bereich umfahren und Vorschläge ===== */
// Lage einer Tour/Hütte für die Zuordnung (erster Kartenpunkt, sonst Anfang der Linie)
function fsGebItemPt(x){ const p = tourMapPoint(x); return p && isFinite(+p.lat) && isFinite(+p.lon) ? {lat: +p.lat, lon: +p.lon} : null; }
function fsGebOf(x){ return x && x.gebietId ? state.gebiete.find(g=> g.id === x.gebietId) : null; }
function fsGebItems(){
  const out = [];
  (state.tours || []).forEach(t=>{ const p = fsGebItemPt(t); if(p && t.name) out.push({kind: 'tour', x: t, lat: p.lat, lon: p.lon}); });
  (state.huts || []).forEach(h=>{ const p = fsGebItemPt(h); if(p && h.name) out.push({kind: 'hut', x: h, lat: p.lat, lon: p.lon}); });
  return out;
}
function fsGebMajor(items, f){
  const c = {};
  items.forEach(i=>{ const v = (i.x[f] || '').trim(); if(v) c[v] = (c[v] || 0) + 1; });
  return Object.keys(c).sort((a, b)=> c[b] - c[a])[0] || '';
}
function fsGebNameFor(items){
  const sub = fsGebMajor(items, 'subregion');
  if(sub) return sub;
  const hut = items.find(i=> i.kind === 'hut');
  const t = hut || items[0];
  return t ? 'Rund um ' + t.x.name : '';
}
function fsGebSugHidden(){ try{ return JSON.parse(localStorage.getItem('fs-geb-sug-hide-' + DISC) || '[]'); }catch(e){ return []; } }
// Touren und Hütten ohne Gebiet, die nah beieinander liegen (Kette bis 6 km), ab 3 Einträgen
function fsGebSuggestions(){
  const hidden0 = fsGebSugHidden(), inGeb = [];
  let free = fsGebItems().filter(i=> !fsGebOf(i.x));
  // Liegt im umfahrenen Bereich eines Gebiets: dort dazunehmen
  state.gebiete.forEach(g=>{
    if(!(g.outline || []).length) return;
    const its = free.filter(i=> fsGebInOutline(g, i) && (g.skipIds || []).indexOf(i.x.id) < 0);
    if(!its.length) return;
    free = free.filter(i=> its.indexOf(i) < 0);
    const key = 'in:' + g.id + ':' + its.map(i=> i.x.id).sort().join(',');
    if(hidden0.indexOf(key) < 0) inGeb.push({key, items: its, geb: g, title: g.name});
  });
  const par = free.map((_, i)=> i), find = i=> par[i] === i ? i : (par[i] = find(par[i]));
  for(let i = 0; i < free.length; i++) for(let j = i + 1; j < free.length; j++){
    if(fsGeoDist(free[i].lat, free[i].lon, free[j].lat, free[j].lon) <= 6000) par[find(i)] = find(j);
  }
  const groups = {};
  free.forEach((it, i)=>{ (groups[find(i)] = groups[find(i)] || []).push(it); });
  const hidden = fsGebSugHidden();
  return Object.values(groups).filter(g=> g.length >= 3).map(items=>{
    const key = items.map(i=> i.x.id).sort().join(',');
    let span = 0;
    items.forEach(a=> items.forEach(b=>{ span = Math.max(span, fsGeoDist(a.lat, a.lon, b.lat, b.lon)); }));
    const reg = fsGebMajor(items, 'region'), name = fsGebNameFor(items);
    return {key, items, span, name, title: reg && reg !== name ? reg + ' · ' + name : name};
  }).filter(s=> hidden.indexOf(s.key) < 0).sort((a, b)=> b.items.length - a.items.length).slice(0, 3).reduce((a, s)=> a.concat([s]), inGeb.slice(0, 3));
}
function fsGebSugHtml(){
  if(state.search.trim()) return '';
  const sug = fsGebSuggestions();
  state._gebSug = sug;
  if(!sug.length) return '';
  const cnt = s=>{
    const t = s.items.filter(i=> i.kind === 'tour').length, h = s.items.length - t;
    return [t ? t + (t === 1 ? ' Tour' : ' Touren') : '', h ? h + (h === 1 ? ' Hütte' : ' Hütten') : ''].filter(Boolean).join(' und ');
  };
  return `<div class="fs-geb-sug"><div class="fs-geb-sug-lbl">Vorschläge</div>
    ${sug.map((s, i)=> s.geb ? `<div class="fs-geb-sug-card"><b>${esc(s.title)}</b>
      <p>${cnt(s)} ohne Gebiet ${s.items.length === 1 ? 'liegt' : 'liegen'} in diesem Gebiet</p>
      <div class="fs-geb-sug-btns"><button type="button" class="btn secondary" data-act="geb-sug-hide" data-i="${i}">Ausblenden</button><button type="button" class="btn" data-act="geb-sug-make" data-i="${i}">Ansehen und dazunehmen</button></div></div>` : `<div class="fs-geb-sug-card"><b>${esc(s.title)}</b>
      <p>${cnt(s)} ohne Gebiet, bis ${Math.max(1, Math.round(s.span / 1000))} km auseinander</p>
      <div class="fs-geb-sug-btns"><button type="button" class="btn secondary" data-act="geb-sug-hide" data-i="${i}">Ausblenden</button><button type="button" class="btn" data-act="geb-sug-make" data-i="${i}">Ansehen und anlegen</button></div></div>`).join('')}
    ${state.gebiete.length ? '<div class="fs-geb-sug-lbl">Meine Gebiete</div>' : ''}</div>`;
}
function fsGebSugHide(i){
  const s = (state._gebSug || [])[i]; if(!s) return;
  const h = fsGebSugHidden(); h.push(s.key);
  try{ localStorage.setItem('fs-geb-sug-hide-' + DISC, JSON.stringify(h.slice(-50))); }catch(e){}
  render();
}
function fsGebSugMake(i){
  const s = (state._gebSug || [])[i]; if(!s) return;
  if(s.geb) fsGebStart({geb: s.geb, items: fsGebMembers(s.geb).concat(s.items)});
  else fsGebStart({items: s.items, name: s.name});
}

let fsGebSt = null;
// Neues Gebiet: ohne Angaben zuerst umfahren; mit {items} direkt die Auswahl (Vorschlag)
function fsGebStart(o){
  o = o || {};
  const ml = typeof fsHomeMap !== 'undefined' ? fsHomeMap : null;
  if(!ml || !ml._fsmLoaded){ openAddGebiet(); return; }
  if(fsGebSt) fsGebEnd();
  ensureName(()=>{
    if(state.modal){ state.modal = null; render(); }
    if(typeof fsHomeDetent !== 'undefined' && fsHomeDetent !== 'karte') fsHomeSetDetent('karte');
    const st = fsGebSt = {ml, markers: [], sel: {}};
    document.documentElement.classList.add('fs-scanning', 'fs-geb-mode');
    const panel = st.panel = document.createElement('div');
    panel.className = 'fs-scan-aim fs-geb-panel';
    document.body.appendChild(panel);
    ['click', 'pointerdown', 'touchstart', 'wheel'].forEach(ev=> panel.addEventListener(ev, e=> e.stopPropagation()));
    pushOverlayLayer(fsGebEnd);
    st.geb = o.geb || null;
    if(o.items) fsGebPick(o.items, o.name, false);
    else fsGebLasso();
  });
}
function fsGebEnd(){
  const st = fsGebSt; if(!st) return;
  fsGebSt = null;
  document.documentElement.classList.remove('fs-scanning', 'fs-geb-mode');
  if(st.panel) st.panel.remove();
  if(st.svg) st.svg.remove();
  if(st.unwire) st.unwire();
  st.markers.forEach(m=> m.remove());
  fsGebPoly(null);
  const ml = typeof fsHomeMap !== 'undefined' ? fsHomeMap : null;
  if(ml) try{ ['fs-geb-old-f', 'fs-geb-old-l'].forEach(id=>{ if(ml.getLayer(id)) ml.removeLayer(id); }); if(ml.getSource('fs-geb-old')) ml.removeSource('fs-geb-old'); }catch(e){}
  // Abgebrochen: zurück zum Gebiet
  if(st.geb && !st.done) setTimeout(()=>{ if(!state.modal){ state.modal = {type: 'gebiet-detail', payload: st.geb.id}; render(); } }, 60);
}
function fsGebClose(){ if(fsGebSt) closeTopOverlayLayer(); }
function fsGebPoly(ring){
  const ml = typeof fsHomeMap !== 'undefined' ? fsHomeMap : null; if(!ml) return;
  const ac = getComputedStyle(document.documentElement).getPropertyValue('--ice-deep').trim() || '#1E6AA0';
  try{
    if(!ring){ ['fs-geb-poly-f', 'fs-geb-poly-l'].forEach(id=>{ if(ml.getLayer(id)) ml.removeLayer(id); }); if(ml.getSource('fs-geb-poly')) ml.removeSource('fs-geb-poly'); return; }
    const data = {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [ring.concat([ring[0]])]}};
    const src = ml.getSource('fs-geb-poly');
    if(src){ src.setData(data); return; }
    ml.addSource('fs-geb-poly', {type: 'geojson', data});
    ml.addLayer({id: 'fs-geb-poly-f', type: 'fill', source: 'fs-geb-poly', paint: {'fill-color': ac, 'fill-opacity': 0.14}});
    ml.addLayer({id: 'fs-geb-poly-l', type: 'line', source: 'fs-geb-poly', paint: {'line-color': ac, 'line-width': 3, 'line-dasharray': [2, 1.5]}});
  }catch(e){}
}
// Schritt 1: mit einem Finger umfahren (zwei Finger verschieben und zoomen die Karte)
function fsGebLasso(){
  const st = fsGebSt, ml = st.ml;
  st.markers.forEach(m=> m.remove()); st.markers = [];
  fsGebPoly(null);
  if(st.unwire) st.unwire();
  const geb = st.geb;
  st.panel.innerHTML = `<div class="fs-scan-aim-head"><b>${fsIconHtml('mountain')}${geb ? esc(geb.name) : 'Neues Gebiet'}</b><button type="button" class="x-btn" data-x aria-label="Schliessen">×</button></div>
    <p class="fs-scan-aim-hint">${geb ? 'Bereich mit weiteren Touren und Hütten mit einem Finger umfahren.' : 'Tal oder Massiv mit einem Finger umfahren – Touren und Hütten darin werden gefunden.'} Mit zwei Fingern Karte verschieben und zoomen.</p>
    <div class="fs-scan-aim-btns">${geb ? '<button type="button" class="btn secondary" data-x>Abbrechen</button><button type="button" class="btn secondary" data-list>Nur Liste bearbeiten</button>' : '<button type="button" class="btn secondary" data-x>Abbrechen</button><button type="button" class="btn secondary" data-form>Ohne Karte anlegen</button>'}</div>`;
  st.panel.querySelectorAll('[data-x]').forEach(b=> b.addEventListener('click', fsGebClose));
  const fb = st.panel.querySelector('[data-form]');
  if(fb) fb.addEventListener('click', ()=>{ fsGebClose(); openAddGebiet(); });
  const lb = st.panel.querySelector('[data-list]');
  if(lb) lb.addEventListener('click', ()=>{ if(st.unwire){ st.unwire(); st.unwire = null; } if(st.svg){ st.svg.remove(); st.svg = null; } fsGebPick(fsGebMembers(geb), geb.name, true); });
  if(geb){
    // Bisherige Touren/Hütten und Fläche des Gebiets zeigen
    const mem = fsGebMembers(geb);
    (geb.outline || []).length && fsGebOutlineShow(geb);
    mem.forEach(it=>{
      const el = document.createElement('div'); el.className = 'fs-geb-pin';
      el.innerHTML = fsIconHtml(it.kind === 'hut' ? 'hut' : DISC === 'wand' ? 'walk' : 'snow') + '<span>' + esc(it.x.name) + '</span>';
      st.markers.push(new maplibregl.Marker({element: el, anchor: 'center'}).setLngLat([it.lon, it.lat]).addTo(ml));
    });
    if(mem.length){
      const lons = mem.map(i=> i.lon), lats = mem.map(i=> i.lat);
      const pad = fsLandscape() ? {top: 60, bottom: 60, left: st.panel.offsetWidth + 50, right: 70} : {top: 90, left: 60, right: 60, bottom: st.panel.offsetHeight + 40};
      try{ ml.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {padding: pad, maxZoom: 13, duration: 500}); }catch(e){}
    }
  }
  const NS = 'http://www.w3.org/2000/svg';
  const svg = st.svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'fs-geb-draft');
  const path = document.createElementNS(NS, 'path');
  svg.appendChild(path); document.body.appendChild(svg);
  const cc = ml.getCanvasContainer();
  let pt = null;
  const down = (e)=>{
    if(!e.isPrimary){ pt = null; path.setAttribute('d', ''); try{ ml.dragPan.enable(); }catch(err){} return; }
    if(e.target.closest && e.target.closest('.maplibregl-marker, .maplibregl-popup, .fsm-ctlbox, .fsm-panel')) return;
    pt = {id: e.pointerId, pts: [[e.clientX, e.clientY]]};
    try{ ml.dragPan.disable(); }catch(err){}
  };
  const move = (e)=>{
    if(!pt || e.pointerId !== pt.id) return;
    const l = pt.pts[pt.pts.length - 1];
    if(Math.hypot(e.clientX - l[0], e.clientY - l[1]) < 5) return;
    pt.pts.push([e.clientX, e.clientY]);
    path.setAttribute('d', 'M' + pt.pts.map(q=> q[0] + ',' + q[1]).join('L'));
  };
  const up = (e)=>{
    if(!pt || e.pointerId !== pt.id) return;
    const pts = pt.pts; pt = null; path.setAttribute('d', '');
    try{ ml.dragPan.enable(); }catch(err){}
    if(pts.length < 8) return; // nur angetippt
    const r = cc.getBoundingClientRect();
    const ring = pts.map(q=>{ const ll = ml.unproject([q[0] - r.left, q[1] - r.top]); return [ll.lng, ll.lat]; });
    const inside = fsGebItems().filter(i=> fsPointInPoly(i.lon, i.lat, ring));
    const mem = geb ? fsGebMembers(geb) : [];
    const items = mem.concat(inside.filter(i=> !mem.some(m=> m.x === i.x)));
    if(!inside.some(i=> !mem.some(m=> m.x === i.x))){ showToast(geb ? 'Darin liegt keine weitere Tour oder Hütte – etwas grösser umfahren.' : 'Darin liegt keine Tour oder Hütte – etwas grösser umfahren.'); return; }
    st.unwire(); st.unwire = null; svg.remove(); st.svg = null;
    st.markers.forEach(m=> m.remove()); st.markers = [];
    st.ring = ring;
    fsGebPoly(ring);
    fsGebPick(items, geb ? geb.name : (fsGebNameFor(items.filter(i=> !fsGebOf(i.x))) || fsGebNameFor(items)), true);
  };
  cc.addEventListener('pointerdown', down, true); cc.addEventListener('pointermove', move, true); cc.addEventListener('pointerup', up, true); cc.addEventListener('pointercancel', up, true);
  st.unwire = ()=>{ cc.removeEventListener('pointerdown', down, true); cc.removeEventListener('pointermove', move, true); cc.removeEventListener('pointerup', up, true); cc.removeEventListener('pointercancel', up, true); try{ ml.dragPan.enable(); }catch(err){} };
}
// Schritt 2: Auswahl mit Namen; Einträge mit Gebiet sind zuerst abgewählt
function fsGebPick(items, name, fromLasso){
  const st = fsGebSt, ml = st.ml;
  items = items.slice().sort((a, b)=> (a.kind === b.kind ? 0 : a.kind === 'hut' ? 1 : -1) || (a.x.name || '').localeCompare(b.x.name || '', 'de'));
  st.items = items; st.sel = {};
  const geb = st.geb;
  items.forEach((it, i)=>{ const g = fsGebOf(it.x); st.sel[i] = !g || (geb && g.id === geb.id); });
  const meta = it=>{
    const g = fsGebOf(it.x);
    if(g && geb && g.id === geb.id) return 'schon dabei';
    if(g) return 'in ' + esc(g.name);
    if(it.kind === 'hut') return 'Hütte';
    return [DISC === 'wand' ? 'Wanderung' : 'Skitour', it.x.difficulty].filter(Boolean).map(esc).join(' · ');
  };
  st.panel.innerHTML = `<div class="fs-scan-aim-head"><b>${fsIconHtml('mountain')}${geb ? 'Touren und Hütten' : 'Neues Gebiet'}</b><button type="button" class="x-btn" data-x aria-label="Schliessen">×</button></div>
    <label class="fs-geb-name"${geb ? ' hidden' : ''}><span>Name</span><input type="text" value="${esc(name || '')}" placeholder="z. B. Engelberger Tal"></label>
    <div class="fs-geb-list">${items.map((it, i)=> `<label class="fs-geb-it"><input type="checkbox" data-i="${i}" ${st.sel[i] ? 'checked' : ''}><span>${esc(it.x.name)}</span><small>${meta(it)}</small></label>`).join('')}</div>
    <div class="fs-scan-aim-btns"><button type="button" class="btn secondary" data-back>${fromLasso ? 'Neu umfahren' : 'Abbrechen'}</button><button type="button" class="btn" data-go></button></div>`;
  const inp = st.panel.querySelector('.fs-geb-name input'), go = st.panel.querySelector('[data-go]');
  const sync = ()=>{
    const n = items.filter((_, i)=> st.sel[i]).length;
    go.textContent = geb ? 'Übernehmen (' + n + ')' : 'Gebiet anlegen' + (n ? ' (' + n + ')' : '');
    st.markers.forEach((m, i)=> m.getElement().classList.toggle('off', !st.sel[i]));
    st.panel.querySelectorAll('.fs-geb-it input').forEach(c=>{ c.checked = !!st.sel[+c.dataset.i]; });
  };
  st.panel.querySelectorAll('.fs-geb-it input').forEach(c=> c.addEventListener('change', ()=>{ st.sel[+c.dataset.i] = c.checked; sync(); }));
  st.panel.querySelectorAll('[data-x]').forEach(b=> b.addEventListener('click', fsGebClose));
  st.panel.querySelector('[data-back]').addEventListener('click', ()=> fromLasso ? fsGebLasso() : fsGebClose());
  go.addEventListener('click', ()=>{
    const nm = inp.value.trim();
    if(!nm){ showToast('Bitte einen Namen eingeben.', true); inp.focus(); return; }
    const chosen = items.filter((_, i)=> st.sel[i]);
    const ring = st.ring;
    st.done = true;
    fsGebClose();
    if(geb) fsGebApply(geb, items, chosen, ring);
    else fsGebCreate(nm, chosen, ring);
  });
  // Markierungen auf der Karte; antippen = an-/abwählen
  st.markers.forEach(m=> m.remove()); st.markers = [];
  items.forEach((it, i)=>{
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'fs-geb-pin';
    el.innerHTML = fsIconHtml(it.kind === 'hut' ? 'hut' : DISC === 'wand' ? 'walk' : 'snow') + '<span>' + esc(it.x.name) + '</span>';
    el.addEventListener('click', e=>{ e.stopPropagation(); st.sel[i] = !st.sel[i]; sync(); });
    st.markers.push(new maplibregl.Marker({element: el, anchor: 'center'}).setLngLat([it.lon, it.lat]).addTo(ml));
  });
  sync();
  if(!fromLasso){
    const lons = items.map(i=> i.lon), lats = items.map(i=> i.lat);
    const pad = fsLandscape() ? {top: 60, bottom: 60, left: st.panel.offsetWidth + 50, right: 70} : {top: 90, left: 60, right: 60, bottom: st.panel.offsetHeight + 40};
    try{ ml.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {padding: pad, maxZoom: 13, duration: 600}); }catch(e){}
  }
}
// Gebiet anlegen und die gewählten Touren/Hütten zuordnen (je Eintrag sicher gespeichert)
async function fsGebCreate(name, chosen, ring){
  const g = {id: uid('geb'), name, region: fsGebMajor(chosen, 'region'), subregion: fsGebMajor(chosen, 'subregion'), description: '', points: [], manualTrack: [],
    outline: ring ? [fsGebRingStore(ring)] : [],
    createdBy: state.myName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: state.myName};
  state.gebiete.unshift(g);
  state.view = 'gebiete';
  state.modal = {type: 'gebiet-detail', payload: g.id};
  chosen.forEach(it=>{ it.x.gebietId = g.id; it.x.updatedAt = new Date().toISOString(); it.x.updatedBy = state.myName; });
  render();
  let ok = await saveGebietCloud(g).catch(()=> false);
  g._unsynced = !ok;
  for(const it of chosen){
    const r = await (it.kind === 'hut' ? saveHutCloud(it.x) : saveTourCloud(it.x)).catch(()=> false);
    if(!r){ it.x._unsynced = true; ok = false; }
  }
  if(!ok){ markUnsaved(); fsToastLocalSaved('Gebiet ist'); }
  else showToast('Gebiet «' + name + '» angelegt' + (chosen.length ? ' mit ' + chosen.length + (chosen.length === 1 ? ' Eintrag.' : ' Einträgen.') : '.'));
  render();
}

// Umfahrene Fläche fürs Gebiet merken (vereinfacht, gerundet) – für Vorschläge «liegt im Gebiet»
function fsGebRingStore(ring){
  let r = ring.map(q=> [q[1], q[0]]);
  try{ r = fsSimplifyLine(r, 60); }catch(e){}
  return r.map(q=> [Math.round(q[1] * 1e5) / 1e5, Math.round(q[0] * 1e5) / 1e5]);
}
function fsGebInOutline(geb, it){ return (geb.outline || []).some(r=> Array.isArray(r) && r.length > 2 && fsPointInPoly(it.lon, it.lat, r)); }
function fsGebOutlineShow(geb){
  const ml = typeof fsHomeMap !== 'undefined' ? fsHomeMap : null; if(!ml) return;
  const rings = (geb.outline || []).filter(r=> Array.isArray(r) && r.length > 2);
  const ac = getComputedStyle(document.documentElement).getPropertyValue('--ice-deep').trim() || '#1E6AA0';
  try{
    const data = {type: 'FeatureCollection', features: rings.map(r=> ({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [r.concat([r[0]])]}}))};
    const src = ml.getSource('fs-geb-old');
    if(src){ src.setData(data); return; }
    ml.addSource('fs-geb-old', {type: 'geojson', data});
    ml.addLayer({id: 'fs-geb-old-f', type: 'fill', source: 'fs-geb-old', paint: {'fill-color': ac, 'fill-opacity': 0.08}});
    ml.addLayer({id: 'fs-geb-old-l', type: 'line', source: 'fs-geb-old', paint: {'line-color': ac, 'line-width': 2, 'line-opacity': 0.6}});
  }catch(e){}
}
function fsGebMembers(geb){ return fsGebItems().filter(i=> i.x.gebietId === geb.id); }
// Gebiet bearbeiten: neu angehakte dazu, abgehakte heraus (gebietId leer), Fläche ergänzen
async function fsGebApply(geb, items, chosen, ring){
  const now = new Date().toISOString(), changed = [];
  items.forEach(it=>{
    const want = chosen.indexOf(it) >= 0, has = it.x.gebietId === geb.id;
    if(want === has) return;
    it.x.gebietId = want ? geb.id : '';
    it.x.updatedAt = now; it.x.updatedBy = state.myName;
    changed.push(it);
  });
  let gebChanged = false;
  // Bewusst entfernt: nicht wieder als «liegt im Gebiet» vorschlagen
  const rem0 = changed.filter(i=> i.x.gebietId !== geb.id).map(i=> i.x.id), add0 = changed.filter(i=> i.x.gebietId === geb.id).map(i=> i.x.id);
  if(rem0.length || (geb.skipIds || []).some(id=> add0.indexOf(id) >= 0)){
    geb.skipIds = (geb.skipIds || []).filter(id=> add0.indexOf(id) < 0).concat(rem0).slice(-200); gebChanged = true;
  }
  if(ring){ geb.outline = (geb.outline || []).concat([fsGebRingStore(ring)]).slice(-12); gebChanged = true; }
  if(gebChanged){ geb.updatedAt = now; geb.updatedBy = state.myName; }
  state.modal = {type: 'gebiet-detail', payload: geb.id};
  render();
  let ok = true;
  if(gebChanged){ const r = await saveGebietCloud(geb).catch(()=> false); geb._unsynced = !r; if(!r) ok = false; }
  for(const it of changed){
    const r = await (it.kind === 'hut' ? saveHutCloud(it.x) : saveTourCloud(it.x)).catch(()=> false);
    if(!r){ it.x._unsynced = true; ok = false; }
  }
  const add = changed.filter(i=> i.x.gebietId === geb.id).length, rem = changed.length - add;
  if(!ok){ markUnsaved(); fsToastLocalSaved('Gebiet ist'); }
  else showToast(changed.length ? [add ? add + ' dazugenommen' : '', rem ? rem + ' entfernt' : ''].filter(Boolean).join(', ') + '.' : 'Nichts geändert.');
  render();
}
function fsGebAddItems(id){ const geb = state.gebiete.find(g=> g.id === id); if(geb) fsGebStart({geb}); }
