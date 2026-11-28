# Firnspur – Regeln für die Arbeit an diesem Repository

Touren-App (PWA) für Skitour, Hochtour/Klettern und Wandern. Vanilla JS, kein Build-Schritt,
läuft auf GitHub Pages, Daten in Firebase (REST). Eigenständig: keine Regeln oder Vorlagen
aus anderen Apps übernehmen.

## Arbeitsweise
- Erst kurz nachfragen, dann bauen. Kurze Antworten, auf Deutsch (Schweizer Schreibweise, «ss»).
  Lieber eine Empfehlung als lange Optionslisten.
- Neues zuerst in `beta/` bauen und im Browser testen (Handygrösse, Screenshot anschauen).
  In die Haupt-App erst nach Freigabe: `bash tools/promote-beta.sh`.
- Jeder Schritt ein eigener PR mit Squash-Merge.
- Zweck und Umbau-Plan der App stehen in `docs/konzept.md` – neue Funktionen daran ausrichten.

## Dateien
- `index.html`: die App für alle vier Disziplinen (`?d=wand|hoch|klet`, ohne = Skitour; Wechsel ohne
  Neuladen über `fsSwitchDisc`; `DISC`, `fsDiscVars` stellen Pfade und Gerätekopie um). Zwei Teile:
  Skitour/Wandern (Skript in index.html + `0-ski-wandern.js`; was sich unterscheidet als `…Ski`/`…Wand`)
  und Hochtour/Klettern (Block «Hochtour / Klettern» am Ende von index.html, früher fixseil.html).
  Namen, die beide Teile haben (state, render, loadAll …), heissen `Name__sw` / `Name__fix`; `fsModeSet`
  schaltet um (Liste im Vorspann oben in index.html).
  Diese umgeschalteten Namen sind `let` und liegen nicht auf `window`: aus 0-shared.js nie `window[name]`,
  sondern direkt aufrufen oder `fsFn(name)` (Speichern, Rettung, «Punkt hier»).
- `fixseil.html` (→ `?d=hoch`, mit `?view=msl` → `?d=klet`) und `wandern.html` (→ `?d=wand`) leiten nur
  weiter – für installierte Apps und Lesezeichen.
- `0-shared.js`: gemeinsamer Code aller Disziplinen (Karten, Firebase, Rettung/Versionen,
  Tourenzettel, Icons …). Gross, gezielt suchen statt ganz lesen.
- `0-ski-wandern.js`: Code, den nur Skitour und Wandern brauchen (Ansichten, Formulare für Hütten
  und Gebiete, Abgeschlossen, Export/Import, render).
- `look.css`: gemeinsamer Look. `0-geo-ch.js`: statische Geodaten für den Kartenstreifen.
- `sw.js`: Offline-Speicher (Netz zuerst, offline gilt jede Adresse der Seite).
- `beta/` enthält dieselben Dateien; `promote-beta.sh` kopiert sie in die Wurzel und zählt die
  Cache-Version in `sw.js` hoch (`sw.js` selbst wird nicht kopiert).

## Code finden (statt ganze Dateien lesen)
- Alle Dateien sind in Abschnitte mit `/* ===== Titel ===== */` gegliedert. Inhaltsverzeichnis
  mit Zeilennummern: `grep -n '^\s*/\* ===' beta/0-shared.js` (genauso für die HTML-Dateien
  und `look.css`). Danach nur den passenden Abschnitt lesen.
- Wichtige Bereiche in `0-shared.js`: Firebase (`fbGet`, `fbSet`, `fbPathOk`), Rettung aus dem
  Gerätespeicher, Versionen, GPX, Agenda, Notfallkarte, Karten (MapLibre `fsm*`, Leaflet-Ersatz
  `FL`, Routen `fsr*`, 3D), Login, Bearbeiten/Gedrückthalten, Topo-Bilder, Offline-Download,
  Anreise `fsTravel*`, Dunkelmodus, Icons (`FS_ICON_PATHS`), Tourenbriefing/Tourenzettel.
- **Eine Karte für alles:** die Startkarte `fsHomeMap`. Tour, Hütte (`fsHutArea`), Gebiet, Klettergebiet und Sektor zeigen sie hinter
  dem Blatt (`fsCtxAcquire`/`fsCtxRelease`, Inhalte über `fsAreaForMap`; beim Schliessen zurück zum vorherigen Ausschnitt, ausser man hat die Karte
  inzwischen selbst verschoben: `_fsCtxMoved`). «Karte bearbeiten» leiht sie im Vollbild
  aus (`fsEdAcquire`/`fsEdRelease`, Werkzeuge als FL-Hülle aus `renderPointsEditorMap`); Formular und Blatt zeigen
  nur eine Übersicht (`fsEdCompact`). 3D ist dieselbe Karte, geneigt mit Gelände (`fsmTerrainToggle`; Hoch =
  swisstopo-Gelände, Spar = Terrarium, Wahl im Ebenen-Fenster; Zurück macht sie flach; nach dem Einschalten lädt
  `fsmRasterReload` die Rasterkacheln neu, sonst flackern in 2D geladene Kacheln beim Verschieben). Eigene Ansichten nur noch
  für Überflug/«Bearbeiten in 3D» (`fs3dMlOpen`), «Gipfel ringsum» (Cesium) und Hang-Scan.
- Grundkarten (`FSM_BASES`): Karte, Winter (Landeskarte Winterausgabe), Luftbild, Luftbild + Namen, Luftbild Winter
  (Luftbild mit Schnee, auf dem Gerät aus Höhenmodell und Luftbild gerechnet: Protokoll `fssnow://`, Schneegrenze `FS_SNOW_LINE`: aktuell aus den SLF-Stationen
  um die Kartenmitte geschätzt, `fsSnowLineUpdate`; ohne Schnee an den Stationen Winterbild mit 1500 m).
- Kartenebenen (`FSM_OVERLAYS`): Hangexposition rechnet das Gerät aus dem Höhenmodell (Protokoll `fsaspect://`);
  Skipisten/Lifte (`fsmPisten`), Parkplätze und Wasser/Unterstände (`fsmOsmPoints`, `FS_OSM_CFG`) kommen aus
  OpenStreetMap über Overpass, je Kachel ab Zoom 11. Legenden stehen im Ebenen-Fenster (`legend`). Ebenen-Fenster (`fsmSyncPanel`): Grundkarten als Vorschaubild,
  Ebenen als Kacheln, oben «Meine Ebenen» in eigener Reihenfolge (Gerät je App, `fsmFavs`, «Anpassen», Halten und Ziehen `fsmFavDrag`).
  Punkt-Ebenen (Webcams, Messstationen, Parkplätze, Wasser, geteilte Punkte) laufen über `fsmClAdd`/`fsmClSet`: nur Punkte
  im Ausschnitt hängen an der Karte, nahe werden zu einem Kreis mit Anzahl gebündelt (ab Zoom 15 einzeln). SAC-Skitouren
  und Wanderwege erst ab Zoom 11.
  Triebschnee (Modell, `fsDrift*`, Protokoll `fsdrift://`): Wind der letzten 72 h aus Open-Meteo (700 hPa) für die Kartenmitte,
  Windschatten aus dem Höhenmodell (Winstral-Sx bis 300 m, stärker knapp unter Kämmen und in Mulden); leer ohne Neuschnee.
  Keine Lawinenbeurteilung – so steht es in der Legende. Tour: «Berichte anderer» als Websuche auf gipfelbuch.ch (`fsGipfelbuchHtml`: ganze Seite ohne Zeitfilter, zweiter Link letztes Jahr).
- Start (Profil-Menü «Start mit», Gerät `fs-start`: last|ski|hoch|klet|wand; zuletzt benutzt `fs-last-disc`): gilt beim Öffnen der
  installierten App (index.html ohne Angaben im Standalone-Modus oder `launch=1` von fixseil.html/wandern.html); gezielte Links gehen vor.
- «Route planen» (`fsPlannerOpen` → `fsPlanDraw`): dasselbe Zeichnen-Werkzeug wie im Tourformular auf der Startkarte (Felder in einem
  unsichtbaren Halter `fsplan-host`; Ausschnitt bleibt wie auf der Startkarte, «Route von hier planen» aus «Punkt hier» beginnt an dieser Stelle); dazu «Start beim Standort», «Umkehren», Suchtreffer «Hierhin zeichnen»; Vorgaben (Punkt «Route hierhin»,
  Link `?plan=`) über `_fsDrawApi.setAnchors`. Nach «Fertig» Blatt: als neue Tour speichern oder zu einer Tour in der Nähe (`fsAttachPlanToTour`:
  ohne gezeichnete Linie wird es diese, sonst eine weitere Route). Abschnitte bleiben gespeichert: `manualTrackPlan` bzw. `plan` an weiteren
  Routen ([[Art, Anzahl Punkte], …], `fsSegsToPlan`/`fsPlanToSegs`, Feld `<Linienfeld>-plan`); im Formular hat jede gezeichnete/weitere Route
  einen Stift «Linie auf der Karte bearbeiten» (`fsRouteEditLine`). Im Abschlussblatt auch «Teilen» (`fsPlanShare`: Link `?plan=` mit Ankern,
  `pm` = Art je Abschnitt s/w/g, übernommene Stücke als gerade Teile) und «GPX»; die Linie bleibt dabei auf der Karte sichtbar (`fsPlanPreview`).
- Rechnungen im Planer/Zeichnen: «Auf Wegen» rechnet über das swisstopo-Wegnetz (`fsrRoute`, sonst openrouteservice); «Skitour (weglos)»
  rechnet auf dem Gerät eine Aufstiegsspur mit Spitzkehren aus dem Höhenmodell (`fsSkiRoute`: Raster über `fsElevGrid` aus dem
  swisstopo-Gelände, Suche `fsSkiEngine` im Web Worker; Spur höchstens etwa 17° steil, Hänge bis 30° normal, 30–35° leicht, ab 35° stark gemieden, kleine Richtungswechsel kosten etwas; Linie geglättet (`fsSmoothTrack`); Linie nach
  Steilheit gefärbt, `FS_SKI_CLASSES`). Ein Vorschlag aus dem Gelände, keine Lawinenbeurteilung – so steht es auch im Planer.
  Abfahrt (Route der Art Abfahrt/Abstieg, «Skispur ↓», pro Abschnitt umstellbar `sg.dir`): «Direkt» sofort, danach Moderat/Flach im Hintergrund als Schilder auf der Karte
  (`drawDescentAlts`, `FS_DL_VARIANTS`, antippen = übernehmen, ✕ = behalten): Direkt (Steiles bleibt), Moderat (meidet über 35°), Flach (meidet über 30°); Felsabbrüche (≥ 48°, Linie > 45°) immer tabu; ohne Spitzkehren
  (`job.down`, Zustand ohne Richtung, stärker geglättet). Gewählte Art bleibt am Abschnitt (`sg.variant`), Anpassen rechnet ohne neue Frage; «Andere Abfahrtslinie wählen» im Abschnitt-Menü.
  Steile Stellen über 35° auf berechneten Skispuren markiert (`sg.slopes`) und gemeldet, nie automatisch umfahren. Suche: Verbesserung nur bei echtem Unterschied (Float32).
- Auf- und Abstieg einer Tourlinie (`fsUpDownSplit`): Routen der Art Aufstieg bzw. Auf- & Abfahrt, die auch wieder hinunterführen,
  zeichnet die Tour-Karte zweiteilig (Abstieg/Abfahrt gestrichelt in der Farbe dieser Routenart, Zeichen am höchsten Punkt). Höhen vom
  swisstopo-Höhendienst, nur auf dem Gerät gemerkt (`fs-updown`); an der Tour ändert sich nichts.
- Ebene «Lawinengefahr (SLF)» wie die SLF-Karte: Stufe mit Zusatz (+/=/−, `customData.CH.subdivision`), «+» schraffiert in der Farbe
  der nächsthöheren Stufe (`fsmSlfHatch`), ab Zoom 8.3 Kärtchen je Region mit Windrose, Höhe, Problem-Zeichen `av-*` (`fsmSlfCards`,
  ohne Überlappung), antippen: Text (`fsSlfRegionPopupHtml`). In der Tour zusätzlich aus dem Bulletin: Gefahrenbeschreibung
  (beim SLF im Feld `tendency`, `fsSlfDescrHtml`, aufklappbar), Entwicklung der Gefahr inkl. Ausblick (`customData.CH.dangerRatingEvolution`,
  `fsSlfEvoHtml`) und Wetter laut Bulletin je 24 h (`customData.CH.weather`: Wind, Neuschnee, Temperatur 2000 m; `fsSlfWeatherHtml`).
- Lawinen in der Liste (`fsCardSlfHtml`, `fsTourSlfHit`): Stufe der Region und «Problem», wenn steile Stellen der Route (Routen-Check,
  im Hintergrund gerechnet, Kurzfassung auf dem Gerät `fs-rc-sum`) in Exposition und Höhe eines Lawinenproblems liegen; sonst nach
  Exposition/Gipfelhöhe; Kurzkalender gestern · heute → Ausblick aus `bul.evo`. Zusatzfilter «Am Tag X» (`fsExtraFilterHtml`): Problembereich ausblenden, passt zur Jahreszeit.
- In der Tour zusätzlich: Faustregel nach Munter im Bulletin (`fsReductionHtml`), Grafische Reduktionsmethode SLF/SAC (`fsGrmHtml`/`fsGrmModel`:
  steile Abschnitte aus dem Routen-Check in 5°-Klassen, Richtwert 45/40/35/30° je Stufe, Zwischenstufen ±⅓, ausserhalb der Kernzone eine Stufe tiefer;
  Diagramm, Liste antippen = Stelle auf der Karte),
  3×3-Filter nach Munter (`FS_3X3`): im Bulletin der Tour Knopf «Check vor Ort» (Blatt mit vor Ort/Einzelhang, nichts gespeichert,
  `fs3x3Open`); im Termin Reiter «3×3» (nicht bei Wanderungen) mit allen drei Stufen, Haken für die Gruppe im Feld `check3x3` {id: Name, '' = abgehakt
  entfernt}, Auto-Hinweise aus Bulletin/Reduktionsmethode (`fs3x3Auto`); auf dem Tourenzettel im Winter als Liste. «Sonne auf der Abfahrt» (Skitour, `fsFirnHtml`:
  Sonnenstand + Schatten der Berge aus dem Höhenmodell), «Beste Zeit» (`bestMonths`, sonst aus Begehungen, `fsTourSeasonText`),
  Zeit nach SAC-Formel für Touren ohne Zeitbedarf (`fsTourTimeEstimate`, Höhenmeter sonst aus dem Höhenmodell, `fs-time`).
  Wetter/Bedingungen/Bulletin gelten am Gipfel (`fsTourWxHtml`), auch für Touren nur mit Linie.
  Eigene Touren: Webcam-Streifen unter den Kennzahlen (`fsTourCamsHtml`, bis 6 Webcams entlang der ganzen Tour – gesucht um Gipfel und Start,
  sortiert nach Abstand zur nächsten Stelle der Tour, `fsTourWebcams`; auch in «Webcams meiner Touren» –, festgelegte zuerst: Feld `webcamPin`
  {id, name}, per Gedrückthalten); Schalter «Webcams in meinen Touren» im Profil-Menü (Gerät, `fs-theme`.cams).
  Webcam-Vollbild: seitlich durch alle Webcams derselben Stelle wischen (Streifen, Bedingungen, Karte im Ausschnitt), Beschriftung
  und «Diese Webcam zuerst zeigen» (eigene Touren). «Webcams meiner Touren» (`fsOpenCamWall`): Reiter «Lage» neben Gebiete/Touren/Hütten (Symbol `cam-wx`, zuletzt gewählte Ansicht Gerät `fs-camw-view`)
  und im Profil-Menü (daneben Knopf «Wetter»: öffnet dieselbe Ansicht im Wetter); je Tour die Webcams zum Wischen, «Zur Tour →», nach dem Schliessen der Tour wieder die Liste. Umschalter
  «Wetter» (`fsWxWallLoad`/`fsWxWallDraw`): 5 Tage am Gipfel (Open-Meteo, ein Abruf für alle Touren, Symbole der Ortsprognose),
  Wind, Nullgrad, sortieren nach bestem Wetter an einem Tag.
  Routen im Formular (Touren und Hütten gleich): Liste der Routen, «Route zeichnen» fragt zuerst die Art (`fsAskRouteKind`), öffnet die
  Karte im Vollbild in «Linie» (`fsEdNext`), «Übernehmen» führt zurück; gespeichert wird einmal im Formular. Zustiege/Abstiege als Liste im Formular
  (`fsRlFieldHtml`/`fsRlWire`, `fsRlCfg`: Hütte Sommer/Winter, Hochtour-Tour und Sektor Zustieg/Abstieg, Angaben aufklappbar), keine eigenen
  Zustiegs-/Abstiegs-Formulare mehr; Stift halten öffnet direkt das Formular (kein Bearbeiten-Modus); Hütten- und Tourformular in Abschnitten; eine alte
  Linie der Hütte (`manualTrack`) wird beim Speichern ein Zustieg (`fsHutAdoptLine`). Tour: `fsTourDrawRoute`.
  Tourformular: Abschnitt «Routen» (Karten je Route mit Name, Art, Stift «Linie bearbeiten» auch für den GPX-Track `fsEdNext.gpx`,
  Entfernen; GPX-Link klein aufklappbar); im Vollbild-Editor oben Name und Art der gerade bearbeiteten Route (`fsEdNext.meta` = Schlüssel, `fsEdMetaRowEl`/`fsRouteMetaSet`) und getrennt «Punkte» («Punkte auf der Karte setzen» öffnet nur den Punkte-Modus,
  `fsEdNext.pointsOnly`). «Route zeichnen» mit Art Abfahrt/Abstieg beginnt am Ende des Aufstiegs; weitere Routen sind im Editor
  zur Orientierung und zum Einrasten sichtbar.
  «Karte bearbeiten» (Tourformular, Knopf statt «Punkte auf der Karte setzen»; `fsEdNext.pick`, `edPickCtx`): Übersicht mit allen Routen und Punkten,
  ohne Reiter; Route antippen = bearbeiten (eigene Linie oder GPX direkt, weitere Route über `fsEdSwitchRoute` → `fsRouteEditLine`), «‹ Alle Routen» zurück;
  gedrückt halten = Blase (`offerHereMenu`): «Neue Route hier starten» (`fsTourDrawRoute(startPt)`), Parkplatz/Haltestelle/Wasser/Biwak/Gipfel/anderer Punkt,
  «Bereich meiden / lieber»; Punkt antippen = sein Formular. Beim Zeichnen auf eine andere Route: Einrast-Blase mit «Stattdessen … bearbeiten».
  «Verbinden als»: «Aufstiegsspur» bzw. «Abfahrtslinie» nach der Art oben (`drawRouteTypeKnown`, neu gezeichnet bei Art-Wechsel), sonst «Skispur».
  Vollbild-Editor unten kompakte Leiste (`fs-line-bar`): km · ↑ · ↓ · Zeit (`drawStatsUpdate`, Höhen vom swisstopo-Höhendienst), Schalter Hangneigung ab 30° (Ebene `hangneigung` der Startkarte), ↺ letzter Punkt, «Mehr» (Name, Umkehren, Löschen,
  GPX; Gerät `fs-ed-bar-open`), Art Aufstieg/Abfahrt, Gelände/Gerade, «Fertig». Abschnitte im Rechnen gestrichelt mit Schild «… wird gerechnet» (`sg._calc`), Fehler mit Grund am Abschnitt (`sg._err`).
  Karten-Editor: Reiter «Zeichnen», «Punkte», «Bereiche». Zeichnen verbindet je Abschnitt als Skispur
  (`fsSkiRoute`), Wanderweg (`fetchCalculatedRoute`, nicht in der Skitour-App) oder Gerade («Verbinden als», `drawConnect`, Gerät `fs-draw-connect`); Abschnitte
  `drawSegs` (Sitzung, am Formularfeld `_drawSegs`; eine geladene lange Linie bekommt wenige Anker, dazwischen Art `fest`, `drawSegsFromLine`), Ziehpunkte an Ankern, Kreis in der Mitte ziehen = Zwischenpunkt (`drawSplit`); Abschnitt antippen = nur diesen anders verbinden (`drawSegMenu`); Tippen setzt immer den nächsten Punkt,
  Aussehen je Art `FS_DRAW_STYLE` (Skispur durchgezogen, Wanderweg gepunktet grün, Gerade gestrichelt, übernommen violett).
  Route anhängen: Tipp nahe einer vorhandenen Route (auch zwischen ihren Punkten, `drawProjLine`/`drawSplitAt`) rastet ein (immer, kein Schalter);
  Ziele sind alle Routen der Tour aus dem Formular ausser der gerade bearbeiteten (`drawEditAltId`), beim Bearbeiten einer weiteren Route auch Hauptlinie und GPX-Track (auch sichtbar);
  beim Zeichnen gehen Tipps auf abgelegte Routen an die eigene Linie, nicht an deren Menü; erster Punkt auf einer Route: «Hier beginnen (abzweigen)» (`drawSnapFind`: weitere Routen, Zustiege, GPX, andere Touren
  bis 25 km), dann «Ab hier folgen bis …» (Weiche: nächster Tipp auf derselben Route = Ende des Stücks, `drawFollowPend`/`drawFollowTo`) oder «… bis zum Ende/Anfang» bzw. beim ersten Punkt «Vom Anfang/Ende bis hier übernehmen» (Art `folgen`).
  Reiter «Bereiche» (nur Tourformular): mit einem Finger eine Fläche umfahren, Pinsel Meiden/Bevorzugen/Radieren, antippen = Notiz
  oder löschen; Feld `routeAreas` [{id, kind: avoid|prefer, poly, note}] der Tour, sichtbar nur im Editor (blass, im Reiter kräftig),
  nicht auf der Tour-Karte. Die Skispur-Rechnung gewichtet je Rasterzelle (`fsAreaMul`: meiden ×12, bevorzugen ×0.55);
  «Skispur neu rechnen» (`drawAreasRecalc`). Ziehen von Kartenpunkten mit eigener Zeigerverfolgung (FL-Marker, Pointer Capture).
  Tour-Routen auf der Startkarte kräftig mit weissem Rand (`fs-home-routes-case`); Ebene an = in jeder Ansicht sichtbar (Touren: die der Liste, sonst alle;
  Linie antippen öffnet dort die Tour).
- Richtung der Routen im Tourformular (`fsRoutesDirCheck`, nach jedem Neuzeichnen der Routenliste): Aufstieg/Zustieg bergauf, Abfahrt/Abstieg bergab
  (Höhe Anfang/Ende `fsPointHeight`, gemerkt `fs-hpt`, mehr als 30 m falsch); verkehrt gezeichnete Route wird samt Abschnitten umgedreht (`fsRouteReverseInForm`)
  mit Hinweis; selbst wieder umgekehrt bleibt sie so (gleiche Linie wird nicht nochmals geprüft).
- Tour teilen (`fsShareOpen`, Knopf im Tourkopf): «Als Bild teilen» (1080×1350, swisstopo-Karte mit Routen und Kennzahlen, `fsShareImage`),
  «GPX-Datei» (eine Spur je Route, `fsShareGpxXml`), «Link» `?tour=<id>` (öffnet die Tour nach dem Laden). Ohne Teilen-Menü wird heruntergeladen.
- SAC-Routen sind oft mehrteilig (MultiLineString, Teile zeigen Richtung Gipfel): `fsMultiLineRoutes` macht daraus zusammenhängende
  Routen (von jedem Anfang bis zum Gipfel-Knoten, sonst gierig verkettet), `fsSacRoutes` setzt die Art (andere Abfahrt als Aufstieg:
  zweite Route umgedreht als «Abfahrt»). Neue Tour aus SAC: Zeit (`fsSacDuration`), Auf-/Abstieg Hm, Routenname, weitere Routen.
  Bearbeiten-Karte ohne Punkte/Linie passt sich auf den GPX-Track ein.
- SAC-Skitour/Wanderroute auf der Startkarte antippen → «Zu einer Tour in der Nähe» (`fsTrackAttachUi`): Touren nach Abstand zur Linie
  (bis 15 km mit Abstand, sonst «Weiter weg» alphabetisch), nächste vorgewählt. Ersetzt nie: ohne Linie wird es die Route, sonst eine
  weitere Route (SAC als Aufstieg); ersetzen nur im Tourformular.
- Gebiete schnell anlegen (`fsGeb*` in `0-ski-wandern.js`): «+ Neues Gebiet» = auf der Startkarte mit einem Finger umfahren
  (zwei Finger verschieben), danach Blatt mit Namensvorschlag (häufigstes Teilgebiet) und Liste der Touren/Hütten darin (mit Gebiet
  zuerst abgewählt; Pins auf der Karte antippen = an/ab); «Ohne Karte anlegen» öffnet das alte Formular. Unter «Gebiete» Vorschläge
  (`fsGebSuggestions`: Touren/Hütten ohne Gebiet, Kette bis 6 km, ab 3), «Ausblenden» merkt das Gerät (`fs-geb-sug-hide-<disc>`).
  Zuordnung über `gebietId`, je Eintrag über `saveTourCloud`/`saveHutCloud` gespeichert.
  Im Gebiet «Touren dazunehmen» (nach Halten, `fsGebAddItems`): weiteren Bereich umfahren oder «Nur Liste bearbeiten»; angehakt =
  im Gebiet, abhaken = `gebietId` leer (`fsGebApply`). Umfahrene Flächen merkt das Gebiet (`outline`, Liste von Ringen [lon, lat]);
  Touren/Hütten ohne Gebiet darin erscheinen als Vorschlag «liegt in diesem Gebiet», bewusst entfernte nicht (`skipIds`).
- Hang-Scan (`fsScan*` in `0-shared.js`): Zielen mit festem Rahmen auf der Startkarte (Menü oder Gedrückthalten),
  Rechnung auf dem Gerät, eigene 3D-Ansicht mit den Ebenen Steilheit, Lawine, Klippen, Sonne (Zeitraffer).
  Neigung ab 30° aus der swisstopo-Karte «Hangneigung über 30°» (wie der Routen-Check `fsRc*`), sonst
  Höhenmodell `FS3D_DEM`; Lawine gleicht Exposition und Höhe mit dem SLF-Bulletin ab. Die Einfärbung kommt
  als Kacheln über das Protokoll `fsscan://` (ein einzelnes Bild wurde auf dem 3D-Gelände nur teilweise gezeichnet).
  Im Ergebnis: Griffe in der Mitte jeder Seite und in der Mitte (`fsScanWireFrame`, Rahmen 300 m–12 km × 200 m–6 km), danach «Neu scannen»;
  Antippen im Rahmen zeigt Höhe · Neigung · Exposition der Stelle (`fsScanWireReadout`, aus der gerechneten Fläche).
  Auf der Startkarte ebenso: freie Stelle antippen (nichts offen, keine Ebenen-Info) = Schild mit Höhe (swisstopo-Höhendienst), Neigung
  (ab 30° aus «Hangneigung über 30°», sonst «< 30°») und Exposition (Höhenmodell) – `fsHeightTap`, Schild antippen schliesst; dazu Kreis 20 m
  und, wenn steiler, «im Umkreis 20 m bis …» mit rotem Punkt an der steilsten Stelle.
  In der Tour: Knopf «Hang-Scan in 3D» im Routen-Check (`fsScanTour`/`fsScanForRoute`): Rahmen entlang der Hauptrichtung der Route
  (300 m Rand, bis 12 km), Blick von der Seite (`viewBearing`), Route eingezeichnet (`s.route`). «Hänge über der Spur prüfen»
  (`fsRcAboveRun`/`fsRcAboveAnalyse`): Zellen ab 35° bis 250 m neben der Spur, ≥ 30 m höher, zur Spur hin abfallend; Ergebnis `fs-rc-above`.
- Offline-Karten (Menü, `fsOffListOpen`): Liste der gespeicherten Karten (Ausschnitte und «Für unterwegs» geladene Touren), Ausschnitt zeigen,
  aktualisieren (holt Fehlendes), löschen mit Rückfrage. «Ausschnitt speichern» (`fsOffAreaOpen`/`fsOffAreaSave`): fester Rahmen auf der Startkarte,
  Landeskarte und/oder Winterkarte bis Zoom 16 («Sehr genau» aus = bis 15), Grösse geschätzt (`FS_OFF_KB`, höchstens `FS_OFF_MAX_TILES`), Topo-Bilder der
  Touren darin. Kacheln in IndexedDB `<Id>_z_x_y` bzw. `<Id>_w_z_x_y`, Eintrag in `downloads` (kind 'area'). Protokoll `fsoff://karte|winter/…`:
  zuerst gespeicherte Kacheln, sonst Netz, ohne Netz gröbere Kachel vergrössert.
- In den App-Dateien: Laden/Offline-Cache, Actions, Ansichten (Touren, Hütten, Gebiete),
  Modal rendering (Formulare), Event wiring, Init.

## Testen
- `node tools/smoke-test.mjs` (oder `… beta`): öffnet alle Disziplinen in Handygrösse in Chromium,
  ohne Internet (Firebase wird mit `vorlage/*.json` simuliert, nichts wird geschrieben). Prüft:
  keine JS-Fehler, Touren sichtbar, lokale Kopie unter dem richtigen Schlüssel, Tour über das
  Formular bearbeiten und speichern (kein Feld geht verloren, alte Fassung unter `versions/`),
  danach offline weiter nutzbar mit der Änderung. Ausgabe: «8 von 8 ok» oder nur die Fehler
  (`-v` für Details).
- `node tools/sync-test.mjs` (oder `… main`): sicheres Speichern (`fsSafeSet` in `0-shared.js`):
  Zusammenführen der drei Fassungen, Rückfrage bei gleichem Feld, Versionskennung (412), Listen,
  offline und neu laden. Ausgabe «N von N ok». Bei jeder Änderung an Speichern/Laden laufen lassen.
- Bei jeder Code-Änderung laufen lassen; bei reinen Text- oder CSS-Änderungen nicht nötig.
- Screenshots (`SMOKE_OUT=<Ordner>`) nur machen und anschauen, wenn sich das Aussehen ändert –
  Bilder kosten viele Token.

## Design
- **Charakter:** Tageslicht, Firn und Gletscher – hell, ruhig, elegant. Gebraucht wird die App
  draussen, oft mit kalten Fingern oder Handschuhen.
- **Farben** nur über die Variablen in `look.css`. Eine Akzentfarbe pro Disziplin, sonst alles
  gleich: Skitour Gletscherblau, Hochtour Eis-Violett, Klettern Fels-Ocker, Wandern Alpweiden-Grün.
  Dunkelmodus und hoher Kontrast über dieselben Variablen.
- **Schrift:** Manrope für Text, Instrument Serif für Titel.
- **Keine Emojis.** Weder in der App (Knöpfe, Überschriften, Dialoge, Hinweise), noch auf dem
  Tourenzettel, noch in Texten an die Nutzer (Chat, PR-Beschreibungen, Commits).
  - Symbole als Strich-Icons: `fsIconHtml('name')` mit Pfaden aus `FS_ICON_PATHS`
    (`0-shared.js`). Fehlt eines, einen neuen Pfad im selben Stil ergänzen (24×24, nur Linien).
  - Wettersymbole mehrfarbig: `fsIconHtml('wx-…')` aus `FS_WX_ICONS` (Nacht `wx-n-…`), Farben über `--wxi-*` in `look.css`;
    Zuordnung MeteoSchweiz-Nummern `FS_WX_SYM`/`fsWxSym`, Open-Meteo `weatherCodeInfo`. Tagessymbole in Liste und Tour aus der
    nächsten Ortsprognose (`fsWxOrteDayCode`).
  - Die automatische Umwandlung (`FS_EMOJI_ICONS`) ist nur ein Sicherheitsnetz für alte Stellen.
    Eigene Fenster wie der Tourenzettel laufen über `fsNoEmojiHtml()`.
  - Erlaubt sind typografische Zeichen wie → ↑ ↓ · – ✓ ☐.
- **Bedienung:** grosse Knöpfe, in einem Raster ausgerichtet (gleiche Grösse, gleiche Abstände).
  Querformat (ab 760 px breit, `fsLandscape()` und dieselbe Media-Query in `look.css`): Werkzeuge des Karten-Editors, Abschlussblatt
  der Planung und Gebiet-Blatt als Spalte links, Karte daneben (Einpassen mit Rand links).
  Was gerade nicht geht, ausblenden statt ausgrauen. Farbe nie als einziges Merkmal.
- **Bearbeiten** nur nach Gedrückthalten; Löschen immer mit Rückfrage.
- **Notfall-Informationen** sachlich, ohne Alarm-Rhetorik.

## Daten
- Offline nutzbar: lokale Kopie pro Gerät, Rettung fehlender Einträge beim Laden.
  «Dieses Gerät hat mehr Daten» (`fsBetterCollect`): bietet Felder an, die in der Datenbank leer sind, ausser sie wurden dort
  bewusst geleert (Vermerk `clearedFields` {Feld: Datum}, setzt `fsSafeSet`) nach dem Stand dieses Geräts, oder hier abgelehnt
  («Nicht wiederherstellen», `fs-better-skip-<app>`).
  «GPX-Dateien gefunden» (`fsGpxRepairCheck`): bietet Linien/Routen aus noch gespeicherten GPX-Dateien an, ausser bewusst gelöscht
  (`clearedFields.trackSimplified`, entfernte weitere Routen in `clearedAlts` {id: Datum}, setzt `fsSafeSet`) oder hier abgelehnt
  («Nicht wiederherstellen», `fs-gpx-ignore-<app>`).
- Gespeichert wird über `fbSet` → `fsSafeSet`: Ausgangsstand (beim Laden) + eigene Fassung + aktueller
  Stand werden zusammengeführt, nur eigene Änderungen kommen dazu. Fehlt ein Feld ganz, gilt es als
  unverändert; bewusstes Leeren setzt `''` bzw. `[]`. Nie direkt an `fbSet` vorbei schreiben.
- Notbremse (`fsDetectLosses`): würde beim Speichern Grösseres verschwinden (Feld leer, Linie weg,
  mehrere Listeneinträge, Text stark gekürzt), fragt die App; «Abbrechen» speichert ohne den Verlust.
  Touren und Hütten ohne Namen lehnen App und Datenbank-Regel ab.
- Eigentümer (Touren): `owner` (sonst `createdBy`, sonst `FS_DEFAULT_OWNER`), `editors`, `open`.
  Andere dürfen ergänzen (leere Felder, neue Listeneinträge, eigene Einträge entfernen); Ändern,
  Entfernen und Löschen wird in `fsSafeSet` zum Vorschlag unter `suggestions/<Sammlung>/<TourId>/<Id>`
  (`fsSplitForSuggestion`). Annehmen/Ablehnen pro Feld nur durch den Eigentümer (`fsSugDecide`).
- Admins (`FS_ADMINS` in `0-shared.js`, erkannt am Namen): ändern und löschen jede Tour direkt und
  entscheiden Vorschläge bei allen Touren.
- Nie eine ganze Sammlung schreiben oder löschen; jeder Pfad endet mit einer gültigen ID
  (`fbPathOk`). Vor jedem Überschreiben sichert `fbSet` die alte Fassung unter `versions/`.
- Geteilte Punkte (alle Disziplinen, intern «Orte»): `orte/<id>` mit Art, Notiz, Foto, Stand-Datum. Entstehen beim
  Speichern einer Tour aus ihren Infrastruktur-Punkten (Parkplatz, Haltestelle, Wasser, Toilette, Biwak;
  `fsShareTourPoints`, abschaltbar pro Punkt mit `share: false`), die Tour selbst bleibt dabei unverändert
  (`fromTour` am Ort), oder einzeln über «Punkt hier» → «Als geteilten Punkt speichern» (`fsOpenOrtForm`). Touren zeigen geteilte Punkte im Umkreis von 5 km («In der Nähe»). Alte Verweise
  `orte: [id]` gelten weiter. Ohne Eigentümer, frei änderbar.
- Erfahrungen (Logbuch): Liste `erfahrungen` in der Tour (`id, by, date, at, text, photos`), Baustein
  «Erfahrungen» in `0-shared.js` (`fsErf*`). Neue und eigene Einträge direkt, Übernehmen in die
  Beschreibung beim Eigentümer direkt, sonst als Vorschlag.
- Datenprüfung (Menü, `fsOpenDataCheck`): entschlüsselt die täglichen Sicherungen nur auf dem Gerät,
  vergleicht sie und die Gerätekopie mit dem heutigen Stand und holt Fehlendes ergänzend zurück.
  Die Notbremse fragt bei Punkten, Routen, Fotos, Erfahrungen und Orten schon bei einem Eintrag.
- Import ergänzt, ersetzt nie (`fsImportMerge`).
- Datenbank-Regeln stehen in `database.rules.json` und müssen zu den Pfaden passen
  (`firebase deploy --only database` oder in der Firebase-Konsole einfügen). Zugriff nur für das Gruppenkonto
  (`auth.token.email === 'firn@spur.so'`); die Cloud Functions prüfen dasselbe (`requireAppAuth`), die Registrierung
  neuer Konten ist in der Konsole abgeschaltet. Die App und die Sicherung melden sich mit diesem Konto an.
- Agenda: in jeder Gruppe nach Termindatum, spätestes zuoberst (`agendaViewHtml`).
- Agenda-Knopf unten links (`fsAgendaBtnSync`): Kalender öffnet die Agenda, in der Agenda wird er zu «Schliessen» (✕) zurück zur vorherigen Ansicht.
- Termin an einem Tag mit mehreren Touren (Rundtour über zwei Gipfel): «+ Weitere Tour» im Formular, Feld `extraTours` [{tourRef, tourName}]
  neben `tourName`/`tourRef`; Titel überall über `fsAgendaTitle` («A + B»), auf Tourenzettel und im Ablauf je Tour eine Zeile.
  «Routen auf dem Tourenzettel» im Termin-Formular: alle Routen der Touren des Termins (`fsAgendaRouteList`, Id `<TourId>|<Schlüssel>`), abgewählte in
  `mapRoutesOff`, eigene GPX-Dateien nur für den Termin in `ownRoutes` [{id, name, coords}]; die Karte des Tourenzettels zeigt sie (`fsAgendaMapData`).
  Im Formular kleine Karte (`agendaMapRoutesMap`, Route antippen = Haken an/ab, abgewählte blass) und Summe der angehakten Routen
  (`fsAgendaTotals`: km aus der Linie, Hm über `fsrElevation`, gemerkt `fs-agenda-elev`, Zeit SAC-Formel, Skitour nur Aufstieg); auf dem Tourenzettel «Total des Tages».
  Je Route «↑ Auf» / «↓ Ab» nur für den Termin (`mapRoutesDir` {Id: up|down}, Vorgabe aus der Routenart, Auf- & Abfahrt/eigene GPX wie gezeichnet;
  `fsAgendaOrient`: Abfahrt zählt bergab, Aufstieg bergauf – nichts doppelt; altes `mapRoutesRev` gilt nicht mehr), Reihenfolge des Tages (↑, `mapRoutesOrder`), Höhenprofil des Tages (`fsAgendaProfileSvg`, Profil im Cache) im Formular und auf dem Tourenzettel.
- Termin-Ansicht «Lage am Tourtag» (`loadAgendaLage`, oben im Reiter Ablauf): je Gipfel des Termins (`fsAgendaLageItems`: erste und weitere Touren,
  Tagesplan mit Datum je Tag) Wetter am Gipfel (`fetchTourDayDetail`) und Lawinenstufe mit Problemen aus dem Bulletin für genau diesen Tag
  (`fsSlfForDate`, sonst Ausblick aus `evo`); Unterschiede zum letzten Öffnen als «Geändert seit …» (Gerät `fs-lage-seen`). Nicht bei Wanderungen (Lawinen).
  Wetter je Höhe (`fsLageLevelPoints`: Start = Parkplatz/Haltestelle/Anfang der Route, Hütte der Tour, Gipfel; `fsWxPointDay` je Punkt auf
  seiner Höhe, ohne Höhe nimmt Open-Meteo die Geländehöhe; Schnee/Regen getrennt), Nullgrad und Höhenwind einmal darunter.
  Letzter Stand auf dem Gerät (`fs-lage-last`, 30 Tage) wird ohne Netz gezeigt («Ohne Netz – Stand vom …»). Der alte Wetterblock darunter hat nur noch
  «MeteoSchweiz öffnen» und «Für unterwegs speichern» (`weatherSnapshot` im Termin, für alle und den Tourenzettel).
- Treffpunkte im Termin: Liste `meets` [{id, time, place, who, lat, lon}] (Formular `fsMeetsFieldHtml`/`fsMeetsCollect`, je Treffpunkt Zeit, Ort, Wer,
  Ort suchen/auf Karte, «+ Weiterer Treffpunkt»); lesen immer über `fsAgendaMeets` (alte Termine: aus `meetingPoint`/`meetingLat/Lon`).
  Die alten Felder spiegeln beim Speichern den ersten Treffpunkt (Anfahrt-Route, ältere Geräte).
- Tourenzettel als Ansicht in der App (`fsTzOverlay`: Rahmen über allem mit «‹ Zurück», kein leeres Fenster «about:blank» mehr; geteilt wird über das
  App-Fenster). «Link teilen» (`fsTzLink`: `?zettel=<Termin-Id>`, öffnet den Zettel nach dem Laden). «Das braucht es» im Tourenbriefing: leer oder
  unverändert vorausgefüllt folgt es den Kennzahlen des Tages und der Schwierigkeit (`fsBriefReqText`/`fsBriefReqAuto`), Knopf «Aus den Routen».
- Tourenzettel «Als PDF teilen» (`fsTzPdf`): unsichtbare Kopie des Zettels im App-Fenster (iframe, 720 px breit; html2canvas hing im Zettel-Fenster),
  html2canvas + jsPDF von unpkg (`fsPdfLibs`), A4 mit Umbruch am Abschnittsanfang (`fsTzPdfPages`). Handy: erster Tipp erstellt, zweiter teilt
  (Teilen braucht einen frischen Tipp); ohne Teilen-Menü Download; schlägt es fehl, Text wie bisher.
- Tägliches verschlüsseltes Backup: `.github/workflows/backup.yml`.
- Wetter-Wertebilder (Niederschlag mit Art, Neuschnee, Temperatur, Böen, Bewölkung, Modellhöhe) aus MeteoSchweiz
  ICON-CH1: `tools/wetterbilder.py` (Kodierung dort), die App färbt sie ein und liest den Wert fürs Fadenkreuz;
  stündlich über `.github/workflows/wetterbilder.yml` in den Branch `wetterbilder` (ohne Verlauf). Radar und
  Satellitenbild lädt die App direkt (MeteoSchweiz-Radar als HDF5 mit jsfive, Meteosat über EUMETSAT, nachts
  Bewölkung des Modells). Kurzfristprognose 2 h rechnet das Gerät aus dem Radar (`fsWxNowcast*`, Bewegung + Verschieben).
- Wetter-Übersicht (Symbole je Tag und alle 3 h, dieselben Ortsprognosen wie die MeteoSchweiz-App): `tools/wetterorte.py`,
  stündlich über `.github/workflows/wetterorte.yml` in den Branch `wetterorte`.
