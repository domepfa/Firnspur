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
  - Die automatische Umwandlung (`FS_EMOJI_ICONS`) ist nur ein Sicherheitsnetz für alte Stellen.
    Eigene Fenster wie der Tourenzettel laufen über `fsNoEmojiHtml()`.
  - Erlaubt sind typografische Zeichen wie → ↑ ↓ · – ✓ ☐.
- **Bedienung:** grosse Knöpfe, in einem Raster ausgerichtet (gleiche Grösse, gleiche Abstände).
  Was gerade nicht geht, ausblenden statt ausgrauen. Farbe nie als einziges Merkmal.
- **Bearbeiten** nur nach Gedrückthalten; Löschen immer mit Rückfrage.
- **Notfall-Informationen** sachlich, ohne Alarm-Rhetorik.

## Daten
- Offline nutzbar: lokale Kopie pro Gerät, Rettung fehlender Einträge beim Laden.
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
- Geteilte Punkte (alle Apps, intern «Orte»): `orte/<id>` mit Art, Notiz, Foto, Stand-Datum. Entstehen beim
  Speichern einer Tour aus ihren Infrastruktur-Punkten (Parkplatz, Haltestelle, Wasser, Toilette, Biwak;
  `fsShareTourPoints`, abschaltbar pro Punkt mit `share: false`), die Tour selbst bleibt dabei unverändert
  (`fromTour` am Ort). Touren zeigen geteilte Punkte im Umkreis von 5 km («In der Nähe»). Alte Verweise
  `orte: [id]` gelten weiter. Ohne Eigentümer, frei änderbar.
- Erfahrungen (Logbuch): Liste `erfahrungen` in der Tour (`id, by, date, at, text, photos`), Baustein
  «Erfahrungen» in `0-shared.js` (`fsErf*`). Neue und eigene Einträge direkt, Übernehmen in die
  Beschreibung beim Eigentümer direkt, sonst als Vorschlag.
- Datenprüfung (Menü, `fsOpenDataCheck`): entschlüsselt die täglichen Sicherungen nur auf dem Gerät,
  vergleicht sie und die Gerätekopie mit dem heutigen Stand und holt Fehlendes ergänzend zurück.
  Die Notbremse fragt bei Punkten, Routen, Fotos, Erfahrungen und Orten schon bei einem Eintrag.
- Import ergänzt, ersetzt nie (`fsImportMerge`).
- Datenbank-Regeln stehen in `database.rules.json` und müssen zu den Pfaden passen
  (Änderungen in der Firebase-Konsole einfügen).
- Tägliches verschlüsseltes Backup: `.github/workflows/backup.yml`.
