# Anleitung für ChatGPT/Gemini: Touren-Daten im richtigen Format erstellen

Ziel: Erstelle eine gültige JSON-Datei nach dem Muster der Vorlage, mit einem oder
mehreren Touren-/Hütten-Einträgen. Diese Datei wird danach über die
"Importieren"-Funktion der App eingefügt.

## Wichtigste Regel: keine Halluzinationen

**Nur Fakten, niemals erfinden oder schätzen.** Trage ausschliesslich Informationen
ein, die aus der gegebenen Quelle (Screenshot, Text, Link) tatsächlich
hervorgehen. Wenn eine Information nicht eindeutig vorliegt, bleibt das
entsprechende Feld leer — auch wenn ein plausibler Wert naheliegend erscheint.
Das gilt für alle Felder gleichermassen, ganz besonders aber für Koordinaten
(siehe unten): Ein erfundener Standort ist schlimmer als ein fehlender.

## Wichtigste Regeln

- Struktur exakt beibehalten: `{"tours": [...], "huts": [...]}`
- **id**: IMMER eine neue, eindeutige Zeichenfolge pro Tour/Hütte (z. B. `t_` +
  zufällige Buchstaben/Zahlen, bzw. `h_` für Hütten). Niemals zwei Einträge mit
  gleicher id, ausser man will einen bestehenden Eintrag bewusst überschreiben.
- Alle Textfelder auf Deutsch.
- Felder, für die keine Information vorliegt, als leerer String `""` bzw. leeres
  Array `[]` lassen — NIEMALS raten oder erfinden.
- `"conditions"`: immer `null`, `"completions"`: immer `[]`
- `"status"`: neue Touren immer `"entwurf"` (bedeutet: noch nicht fertig
  ausgearbeitet/verifiziert)
- `"createdAt"`/`"updatedAt"`: aktuelles Datum im Format
  `"2026-08-25T00:00:00.000Z"` (Uhrzeit kann immer 00:00:00 sein)

## Standort-Punkte (points)

Sowohl Touren als auch Hütten haben ein Feld `"points"`: eine Liste von
Kartenpunkten, z. B. Parkplatz, Bushaltestelle, Ausgangspunkt, Hütte selbst.

```json
"points": [
  {"label": "Parkplatz XY", "lat": 46.5, "lon": 7.9}
]
```

- `label`: kurze Bezeichnung, was der Punkt ist
- `lat`/`lon`: WGS84-Koordinaten (Dezimalgrad, mit Punkt statt Komma)
- Mehrere Punkte pro Eintrag möglich
- **Koordinaten nur bei eindeutigen GPS-Daten eintragen.** Steht in der Quelle keine
  klare, konkrete Koordinate (z. B. ein GPS-Wert, ein exakter Kartenpunkt) — auch
  keine ungefähre Ortsangabe wie ein Ortsname oder eine grobe Beschreibung —
  bleibt `"points": []`. Kein Schätzen anhand von Ortsnamen, keine Koordinaten
  aus dem eigenen Wissen ergänzen, auch wenn der Ort bekannt vorkommt.
- `"manualTrack"`: immer `[]` lassen (wird nur direkt in der App per Hand
  gezeichnet, nicht per JSON-Import befüllt)

## Felder-Erklärung (Firnspur = Skitour)

- `name`: Gipfel/Bergmassiv (Pflichtfeld, Hauptname der Tour)
- `routeName`: Name der Route (optional, z. B. "Nordwand")
- `difficulty`: SAC-Skala: L, WS-, WS, WS+, ZS-, ZS, ZS+, S-, S, S+, SS (oder leer)
- `targetAltitude`: Gipfelhöhe in Metern (nur Zahl, als Text)
- `elevationGain`/`elevationLoss`: Höhenmeter Aufstieg / Abfahrt
- `duration`: Zeitbedarf, z. B. "4-5" oder "1:45-2:45"
- `region`: Wallis, Berner Oberland, Graubünden, Tessin, Zentralschweiz, Jura,
  Freiburger Alpen, Waadtländer Alpen (oder eigener Text)
- `subregion`: Teilgebiet/Pass innerhalb der Region (optional). Gültige Werte:
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
- `material`: Liste aus: Steigeisen, Pickel, Gurt, Spaltenrettungsset
- `exposition`: Liste aus: N, NE, E, SE, S, SW, W, NW
- `gefahren`: Liste aus: Lawinenhang, Triebschnee, Steilhänge über 40°,
  Absturzgelände, Engpass, vereiste Passage, Gletscher/Spalten, schwierige
  Orientierung, Waldpassagen, Wechten
- `glacier`: "ja" oder "nein"
- `ropeType`: Gletscherseil, Einfachseil, Halbseilstrang, Zwillingsseil (oder leer)
- `ropeLength`: 30m, 40m, 50m, 60m, 70m (oder leer)
- `crux`: kurze Beschreibung der Schlüsselstelle
- `tourLink`: Link zur Quelle (falls vorhanden), sonst leer
- `gpxLink`: Link zu einer externen GPX-Datei (falls vorhanden), sonst leer
- `approachTypes`: Liste (mehrere möglich) aus: "auto", "oev", "seilbahn", "zufuss"
- `stayTypes`: Liste (mehrere möglich) aus: "tagestour", "huette", "biwak", "zelt"

## Felder-Erklärung (Fixseil = Hochtour/MSL) — zusätzlich zu obigem

- `region`/`subregion`/`points`: identisch zu Firnspur
- `tourCategory`: "hochtour" ODER "msl" — bestimmt, welche Feldgruppe ausgefüllt
  wird (die jeweils andere bleibt leer):

  **Falls tourCategory = "hochtour":**
  - `difficulty`: SAC-Skala wie oben (inkl. S+)
  - `climbGrade`: max. Felsschwierigkeit, franz. Skala (z. B. "3a")
  - `glacier`: "ja"/"nein"
  - `crevasseRisk`: "nein", "moeglich", "ausgepraegt"

  **Falls tourCategory = "msl" (Mehrseillängen-Klettertour):**
  - `mandatoryDifficulty`: obligatorische Schwierigkeit, franz. Skala
  - `cruxDifficulty`: Schlüsselstelle, franz. Skala
  - `pitchCount`: Anzahl Seillängen (Zahl als Text)
  - `longestPitch`: längste Seillänge (z. B. "35m")
  - `protection`: "sehr-gut", "gut", "alpin", oder "ernst"
  - `descentType`: "Fussabstieg", "Abseilen", oder "Fussabstieg und Abseilen"

  Franz. Kletterskala: 1, 2a-, 2a, 2a+, 2b-, 2b, 2b+, 2c-, 2c, 2c+, 3a-, 3a, 3a+,
  3b-, 3b, 3b+, 3c-, 3c, 3c+, 4a- ... bis 7a (jeweils mit -/+ Abstufungen)

  - `material`: zusätzlich möglich: Helm, Eisschrauben, Schraubkarabiner, Prusik,
    Bandschlingen, Friends, Keile, Biwaksack, Stirnlampe
  - `quickdrawCount`: Anzahl Expressschlingen (Zahl als Text)
  - `gefahren` (Hochtour): Spalten, Steinschlag, Eispassage, Firngrat, Wechte,
    Absturzgelände, schwierige Wegfindung, brüchiger Fels, schwieriger Rückzug
  - `gefahren` (MSL): Steinschlag, brüchiger Fels, Runout, schwieriger Rückzug,
    nasser Fels, komplexer Abstieg, Abseilstellen, ausgesetzter Zustieg
  - `ropeType`: zusätzlich "Gletscherseil" möglich
  - `topoImages`: IMMER leeres Array `[]` — Foto-Scans von Topo-Kletterführern
    werden ausschliesslich manuell in der App hochgeladen (Copyright-Gründe),
    niemals von ChatGPT/Gemini befüllen oder Bild-URLs erfinden.

## Felder-Erklärung (Hütten — identisch in Firnspur & Fixseil)

- `name`: Name der Hütte (Pflichtfeld)
- `region`/`subregion`: wie oben bei Touren
- `altitude`: Höhe der Hütte in Metern (nur Zahl, als Text)
- `capacity`: Betten/Kapazität, z. B. "60 Betten"
- `staffedMonths`: Liste der Monate, in denen die Hütte VOLL bewartet ist.
  Werte: "jan", "feb", "maer", "apr", "mai", "jun", "jul", "aug", "sep", "okt",
  "nov", "dez". Leeres Array `[]`, falls unbewartet.
- `staffedMonthsPartial`: Liste der Monate mit TEILWEISER Bewartung (z. B. nur
  an Wochenenden) — gleiche Werte wie `staffedMonths`, eigene separate Liste.
- `staffedNote`: Freitext-Präzisierung zur Bewartung (z. B. "nur an
  Wochenenden", "ab 20. Juni"), optional
- `winterraum`: Beschreibung Winterraum/Schutzraum (Kapazität, Zugang,
  Ausstattung)
- `winterraumMonths`/`winterraumMonthsPartial`: wie bei `staffedMonths` oben,
  aber für den Winterraum/Schutzraum (voll bzw. teilweise offen)
- `winterraumNote`: Freitext-Präzisierung zum Schutzraum (z. B. "nur wenn
  unbewartet zugänglich"), optional
- `hutLink`: Link zur Hütten-Website, SAC-Seite o. Ä. (falls vorhanden), sonst
  leer
- `approach`: Anfahrt zum Ausgangspunkt (Parkplatz, ÖV, Seilbahn) — NICHT der
  Zustieg zur Hütte selbst, das gehört zu `accessRoutes` (siehe unten)
- `points`: siehe oben — z. B. Hütte selbst + Parkplatz als zwei Punkte
- `manualTrack`: IMMER leeres Array `[]` — nur für eine allgemeine, in der App
  von Hand eingezeichnete Linie zur Hütte, nicht von ChatGPT/Gemini befüllen.
- `approachTypes`: wie oben bei Touren (mehrere möglich) — bezieht sich hier
  auf die Anfahrt zum Ausgangspunkt/Zustieg zur Hütte
- `accessRoutes`: Liste der Zustiege zur Hütte — beliebig viele möglich (z. B.
  "Sommer ab Randa", "Winter ab Randa", weitere Varianten). JEDER Eintrag in
  dieser Liste hat folgende Felder:
  - `id`: eindeutige Kennung, Format `ar_` + zufällige Buchstaben/Zahlen
    (z. B. `ar_x7k2m9`)
  - `name`: Bezeichnung des Zustiegs (Pflichtfeld) — z. B. "Sommer", "Winter",
    oder bei mehreren Varianten pro Jahreszeit z. B. "Ab Randa", "Ab
    Bergstation"
  - `season`: "sommer", "winter", oder leer `""` falls nicht eindeutig
    zuordenbar
  - `elevation`: Höhenmeter Zustieg (nur Zahl, als Text)
  - `duration`: Zeitbedarf, z. B. "3-4"
  - `difficulty`: SAC-Skala wie bei Touren, oder leer
  - `difficultyT`: Schweizer Wanderskala ("T1" bis "T6"), nur falls reiner
    Wanderweg ohne Firn/Schnee-Querung, sonst leer. SAC-Skala und T-Skala
    schliessen sich nicht aus.
  - `description`: Beschreibung der Zustiegsroute für diesen Eintrag
  - `gpxLink`: IMMER leer `""` — kein Link erfinden
  - `trackSimplified`: IMMER `null` — nur von der App selbst befüllt (eigener
    GPX-Upload)
  - `manualTrack`: IMMER leeres Array `[]` — nur von der App selbst befüllt
    (von Hand gezeichnete Linie)

  Falls keine Zustiegsinformationen vorliegen, `accessRoutes` als leeres Array
  `[]` lassen statt Einträge zu erfinden.
- `contact`: Telefon/Website/Sektion
- `notes`: Sonstiges (z. B. Reservationshinweise)
- `completions`: immer `[]` (wird von der App selbst befüllt)

## Auftrag an ChatGPT/Gemini

Erstelle nach diesem Muster einen oder mehrere Touren-/Hütten-Einträge basierend
auf den Informationen, die ich dir gebe (z. B. Screenshot, Text, Link). Prüfe
zuerst, ob es sich um eine Tour (Gipfel, Route) oder eine Hütte
(Übernachtungsmöglichkeit) handelt, und trage den Eintrag entsprechend im
richtigen Feld ("tours" bzw. "huts") ein. Gib mir am Ende NUR die vollständige,
gültige JSON-Datei zurück, bereit zum Kopieren.
