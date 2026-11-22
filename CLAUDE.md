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
  dem Blatt (`fsCtxAcquire`/`fsCtxRelease`, Inhalte über `fsAreaForMap`). «Karte bearbeiten» leiht sie im Vollbild
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
  Keine Lawinenbeurteilung – so steht es in der Legende. Tour: «Berichte anderer» als Websuche auf gipfelbuch.ch (`fsGipfelbuchHtml`).
- Start (Profil-Menü «Start mit», Gerät `fs-start`: last|ski|hoch|klet|wand; zuletzt benutzt `fs-last-disc`): gilt beim Öffnen der
  installierten App (index.html ohne Angaben im Standalone-Modus oder `launch=1` von fixseil.html/wandern.html); gezielte Links gehen vor.
- «Route planen» (`fsPlannerOpen` → `fsPlanDraw`): dasselbe Zeichnen-Werkzeug wie im Tourformular auf der Startkarte (Felder in einem
  unsichtbaren Halter `fsplan-host`); dazu «Start beim Standort», «Umkehren», Suchtreffer «Hierhin zeichnen»; Vorgaben (Punkt «Route hierhin»,
  Link `?plan=`) über `_fsDrawApi.setAnchors`. Nach «Fertig» Blatt: als neue Tour speichern oder zu einer Tour in der Nähe (`fsAttachPlanToTour`:
  ohne gezeichnete Linie wird es diese, sonst eine weitere Route). Abschnitte bleiben gespeichert: `manualTrackPlan` bzw. `plan` an weiteren
  Routen ([[Art, Anzahl Punkte], …], `fsSegsToPlan`/`fsPlanToSegs`, Feld `<Linienfeld>-plan`); im Formular hat jede gezeichnete/weitere Route
  einen Stift «Linie auf der Karte bearbeiten» (`fsRouteEditLine`). Im Abschlussblatt auch «Teilen» (`fsPlanShare`: Link `?plan=` mit Ankern,
  `pm` = Art je Abschnitt s/w/g, übernommene Stücke als gerade Teile) und «GPX»; die Linie bleibt dabei auf der Karte sichtbar (`fsPlanPreview`).
- Rechnungen im Planer/Zeichnen: «Auf Wegen» rechnet über das swisstopo-Wegnetz (`fsrRoute`, sonst openrouteservice); «Skitour (weglos)»
  rechnet auf dem Gerät eine Aufstiegsspur mit Spitzkehren aus dem Höhenmodell (`fsSkiRoute`: Raster über `fsElevGrid` aus dem
  swisstopo-Gelände, Suche `fsSkiEngine` im Web Worker; Spur höchstens etwa 17° steil, Hänge bis 30° normal, 30–35° leicht, ab 35° stark gemieden, kleine Richtungswechsel kosten etwas; Linie geglättet (`fsSmoothTrack`); Linie nach
  Steilheit gefärbt, `FS_SKI_CLASSES`). Ein Vorschlag aus dem Gelände, keine Lawinenbeurteilung – so steht es auch im Planer.
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
- In der Tour zusätzlich: Faustregel nach Munter im Bulletin (`fsReductionHtml`), «Sonne auf der Abfahrt» (Skitour, `fsFirnHtml`:
  Sonnenstand + Schatten der Berge aus dem Höhenmodell), «Beste Zeit» (`bestMonths`, sonst aus Begehungen, `fsTourSeasonText`),
  Zeit nach SAC-Formel für Touren ohne Zeitbedarf (`fsTourTimeEstimate`, Höhenmeter sonst aus dem Höhenmodell, `fs-time`).
  Wetter/Bedingungen/Bulletin gelten am Gipfel (`fsTourWxHtml`), auch für Touren nur mit Linie.
  Eigene Touren: Webcam-Streifen unter den Kennzahlen (`fsTourCamsHtml`, drei Webcams, festgelegte zuerst: Feld `webcamPin`
  {id, name}, per Gedrückthalten); Schalter «Webcams in meinen Touren» im Profil-Menü (Gerät, `fs-theme`.cams).
  Webcam-Vollbild: seitlich durch alle Webcams derselben Stelle wischen (Streifen, Bedingungen, Karte im Ausschnitt), Beschriftung
  und «Diese Webcam zuerst zeigen» (eigene Touren). «Webcams meiner Touren» (`fsOpenCamWall`): Knopf «Webcams» über der Touren-Liste
  und im Profil-Menü (daneben Knopf «Wetter»: öffnet dieselbe Ansicht im Wetter); je Tour die Webcams zum Wischen, «Zur Tour →», nach dem Schliessen der Tour wieder die Liste. Umschalter
  «Wetter» (`fsWxWallLoad`/`fsWxWallDraw`): 5 Tage am Gipfel (Open-Meteo, ein Abruf für alle Touren, Symbole der Ortsprognose),
  Wind, Nullgrad, sortieren nach bestem Wetter an einem Tag.
  Routen im Formular (Touren und Hütten gleich): Liste der Routen, «Route zeichnen» fragt zuerst die Art (`fsAskRouteKind`), öffnet die
  Karte im Vollbild in «Linie» (`fsEdNext`), «Übernehmen» führt zurück; gespeichert wird einmal im Formular. Zustiege/Abstiege als Liste im Formular
  (`fsRlFieldHtml`/`fsRlWire`, `fsRlCfg`: Hütte Sommer/Winter, Hochtour-Tour und Sektor Zustieg/Abstieg, Angaben aufklappbar), keine eigenen
  Zustiegs-/Abstiegs-Formulare mehr; Stift halten öffnet direkt das Formular (kein Bearbeiten-Modus); Hütten- und Tourformular in Abschnitten; eine alte
  Linie der Hütte (`manualTrack`) wird beim Speichern ein Zustieg (`fsHutAdoptLine`). Tour: `fsTourDrawRoute`.
  Karten-Editor: Reiter «Zeichnen» und «Punkte» (Route ist in Zeichnen aufgegangen). Zeichnen verbindet je Abschnitt als Skispur
  (`fsSkiRoute`), Wanderweg (`fetchCalculatedRoute`) oder Gerade («Verbinden als», `drawConnect`, Gerät `fs-draw-connect`); Abschnitte
  `drawSegs` (Sitzung, am Formularfeld `_drawSegs`; eine geladene lange Linie bekommt wenige Anker, dazwischen Art `fest`, `drawSegsFromLine`), Ziehpunkte nur an Ankern, Kreis in der Mitte ziehen = Zwischenpunkt (`drawSplit`); Abschnitt antippen = nur diesen anders verbinden (`drawSegMenu`),
  Aussehen je Art `FS_DRAW_STYLE` (Skispur durchgezogen, Wanderweg gepunktet grün, Gerade gestrichelt, übernommen violett).
  Route anhängen: Tipp nahe einer vorhandenen Route rastet ein (`drawSnapFind`: weitere Routen, Zustiege, GPX, andere Touren
  bis 25 km), dann «Ab hier folgen bis zum Ende/Anfang» bzw. beim ersten Punkt «Vom Anfang/Ende bis hier übernehmen» (Art `folgen`).
  Reiter «Bereiche» (nur Tourformular): mit einem Finger eine Fläche umfahren, Pinsel Meiden/Bevorzugen/Radieren, antippen = Notiz
  oder löschen; Feld `routeAreas` [{id, kind: avoid|prefer, poly, note}] der Tour, sichtbar nur im Editor (blass, im Reiter kräftig),
  nicht auf der Tour-Karte. Die Skispur-Rechnung gewichtet je Rasterzelle (`fsAreaMul`: meiden ×12, bevorzugen ×0.55);
  «Skispur neu rechnen» (`drawAreasRecalc`). Ziehen von Kartenpunkten mit eigener Zeigerverfolgung (FL-Marker, Pointer Capture).
  Tour-Routen auf der Startkarte kräftig mit weissem Rand (`fs-home-routes-case`).
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
  In der Tour: Knopf «Hang-Scan in 3D» im Routen-Check (`fsScanTour`/`fsScanForRoute`): Rahmen entlang der Hauptrichtung der Route
  (300 m Rand, bis 12 km), Blick von der Seite (`viewBearing`), Route eingezeichnet (`s.route`). «Hänge über der Spur prüfen»
  (`fsRcAboveRun`/`fsRcAboveAnalyse`): Zellen ab 35° bis 250 m neben der Spur, ≥ 30 m höher, zur Spur hin abfallend; Ergebnis `fs-rc-above`.
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
- Tägliches verschlüsseltes Backup: `.github/workflows/backup.yml`.
- Wetter-Wertebilder (Niederschlag mit Art, Neuschnee, Temperatur, Böen, Bewölkung, Modellhöhe) aus MeteoSchweiz
  ICON-CH1: `tools/wetterbilder.py` (Kodierung dort), die App färbt sie ein und liest den Wert fürs Fadenkreuz;
  stündlich über `.github/workflows/wetterbilder.yml` in den Branch `wetterbilder` (ohne Verlauf). Radar und
  Satellitenbild lädt die App direkt (MeteoSchweiz-Radar als HDF5 mit jsfive, Meteosat über EUMETSAT, nachts
  Bewölkung des Modells). Kurzfristprognose 2 h rechnet das Gerät aus dem Radar (`fsWxNowcast*`, Bewegung + Verschieben).
- Wetter-Übersicht (Symbole je Tag und alle 3 h, dieselben Ortsprognosen wie die MeteoSchweiz-App): `tools/wetterorte.py`,
  stündlich über `.github/workflows/wetterorte.yml` in den Branch `wetterorte`.
