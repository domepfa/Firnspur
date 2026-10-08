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

## Dateien
- `index.html` (Skitour), `fixseil.html` (Hochtour/Klettern), `wandern.html` (Wandern):
  je eine App mit eigenem Code für Listen, Formulare und Laden.
- `0-shared.js`: gemeinsamer Code aller drei Apps (Karten, Firebase, Rettung/Versionen,
  Tourenzettel, Icons …). Gross, gezielt suchen statt ganz lesen.
- `0-ski-wandern.js`: Code, den nur Skitour und Wandern teilen (Ansichten, Formulare für Hütten
  und Gebiete, Abgeschlossen, Export/Import, render). Fixseil lädt diese Datei nicht.
- `look.css`: gemeinsamer Look. `0-geo-ch.js`: statische Geodaten für den Kartenstreifen.
- `beta/` enthält dieselben Dateien; `promote-beta.sh` kopiert sie in die Wurzel und zählt die
  Cache-Version in `sw.js` hoch.

## Code finden (statt ganze Dateien lesen)
- Alle Dateien sind in Abschnitte mit `/* ===== Titel ===== */` gegliedert. Inhaltsverzeichnis
  mit Zeilennummern: `grep -n '^\s*/\* ===' beta/0-shared.js` (genauso für die HTML-Dateien
  und `look.css`). Danach nur den passenden Abschnitt lesen.
- Wichtige Bereiche in `0-shared.js`: Firebase (`fbGet`, `fbSet`, `fbPathOk`), Rettung aus dem
  Gerätespeicher, Versionen, GPX, Agenda, Notfallkarte, Karten (MapLibre `fsm*`, Leaflet-Ersatz
  `FL`, Routen `fsr*`, 3D), Login, Bearbeiten/Gedrückthalten, Topo-Bilder, Offline-Download,
  Anreise `fsTravel*`, Dunkelmodus, Icons (`FS_ICON_PATHS`), Tourenbriefing/Tourenzettel.
- In den App-Dateien: Laden/Offline-Cache, Actions, Ansichten (Touren, Hütten, Gebiete),
  Modal rendering (Formulare), Event wiring, Init.

## Testen
- `node tools/smoke-test.mjs` (oder `… beta`): öffnet alle Apps in Handygrösse in Chromium,
  ohne Internet (Firebase wird mit `vorlage/*.json` simuliert, nichts wird geschrieben). Prüft:
  keine JS-Fehler, Touren sichtbar, lokale Kopie unter dem richtigen Schlüssel, Tour über das
  Formular bearbeiten und speichern (kein Feld geht verloren, alte Fassung unter `versions/`),
  danach offline weiter nutzbar mit der Änderung. Ausgabe: «8 von 8 ok» oder nur die Fehler
  (`-v` für Details).
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
  - Die automatische Umwandlung (`FS_EMOJI_ICONS`) ist nur ein Sicherheitsnetz für alte Stellen.
    Eigene Fenster wie der Tourenzettel laufen über `fsNoEmojiHtml()`.
  - Erlaubt sind typografische Zeichen wie → ↑ ↓ · – ✓ ☐.
- **Bedienung:** grosse Knöpfe, in einem Raster ausgerichtet (gleiche Grösse, gleiche Abstände).
  Was gerade nicht geht, ausblenden statt ausgrauen. Farbe nie als einziges Merkmal.
- **Bearbeiten** nur nach Gedrückthalten; Löschen immer mit Rückfrage.
- **Notfall-Informationen** sachlich, ohne Alarm-Rhetorik.

## Daten
- Offline nutzbar: lokale Kopie pro Gerät, Rettung fehlender Einträge beim Laden.
- Nie eine ganze Sammlung schreiben oder löschen; jeder Pfad endet mit einer gültigen ID
  (`fbPathOk`). Vor jedem Überschreiben sichert `fbSet` die alte Fassung unter `versions/`.
- Import ergänzt, ersetzt nie (`fsImportMerge`).
- Datenbank-Regeln stehen in `database.rules.json` und müssen zu den Pfaden passen
  (Änderungen in der Firebase-Konsole einfügen).
- Tägliches verschlüsseltes Backup: `.github/workflows/backup.yml`.
