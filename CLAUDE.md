# Firnspur – Regeln für die Arbeit an diesem Repository

## Ablauf
- Neues zuerst in `beta/` bauen und im Browser testen; in die Haupt-App erst nach Freigabe
  (`bash tools/promote-beta.sh`).
- Vor dem Bauen Rückfragen stellen; Antworten kurz halten; auf Deutsch (Schweizer Schreibweise, «ss»).

## Design
- **Keine Emojis.** Weder in der App (Knöpfe, Überschriften, Dialoge, Hinweise, Toasts),
  noch auf dem Tourenzettel, noch in Texten an die Nutzer (Chat, PR-Beschreibungen, Commits).
  - Symbole immer als Strich-Icons: `fsIconHtml('name')` mit Pfaden aus `FS_ICON_PATHS`
    (`0-shared.js`). Fehlt ein Icon, einen neuen Pfad im selben Stil ergänzen
    (24×24, nur Linien, keine Füllung).
  - Die automatische Umwandlung (`FS_EMOJI_ICONS`) ist nur ein Sicherheitsnetz für ältere Stellen,
    kein Freipass für neue Emojis. Eigene Fenster (z. B. Tourenzettel) laufen über `fsNoEmojiHtml()`.
  - Erlaubt sind typografische Zeichen wie → ↑ ↓ · – ✓ ☐.
- Charakter: Tageslicht, Firn und Gletscher – hell, ruhig, elegant (siehe Kopf von `look.css`).
  Eine Akzentfarbe pro Disziplin (Skitour Gletscherblau, Hochtour Eis-Violett, Klettern Fels-Ocker,
  Wandern Alpweiden-Grün), sonst alles gleich. Farben nur über die Variablen in `look.css`.
- Knöpfe und Bedienelemente in einem Raster ausrichten (gleiche Grösse, gleiche Abstände).
- Notfall-Informationen sachlich, ohne Alarm-Rhetorik.

## Daten
- Nie eine ganze Sammlung schreiben oder löschen; jeder Pfad endet mit einer gültigen ID
  (`fbPathOk`). Vor jedem Überschreiben sichert `fbSet` die alte Fassung unter `versions/`.
- Import ergänzt, ersetzt nie (`fsImportMerge`).
- Datenbank-Regeln stehen in `database.rules.json` (in der Firebase-Konsole einfügen).
