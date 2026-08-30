# Anleitung für ChatGPT/Gemini: Touren-Daten im richtigen Format erstellen

Ziel: Erstelle eine gültige JSON-Datei nach dem Muster der Vorlage, mit einem oder
mehreren Touren-/Hütten-Einträgen. Diese Datei wird danach über die
"Importieren"-Funktion der App eingefügt.

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
- Nur echte, bekannte Koordinaten eintragen — falls keine bekannt sind, `"points": []`
  lassen, NICHT schätzen oder erfinden
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

## Felder-Erklärung (Hütten — identisch in Firnspur & Fixseil)

- `name`: Name der Hütte (Pflichtfeld)
- `region`/`subregion`: wie oben bei Touren
- `altitude`: Höhe der Hütte in Metern (nur Zahl, als Text)
- `capacity`: Betten/Kapazität, z. B. "60 Betten"
- `staffedMonths`: Liste der Monate, in denen die Hütte bewartet ist. Werte:
  "jan", "feb", "maer", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov",
  "dez". Leeres Array `[]`, falls unbewartet.
- `staffedNote`: Freitext-Präzisierung zur Bewartung (z. B. "nur an
  Wochenenden", "ab 20. Juni"), optional
- `winterraum`: Beschreibung Winterraum/Schutzraum (Kapazität, Zugang,
  Ausstattung)
- `winterraumMonths`: Liste der Monate, in denen der Winterraum/Schutzraum
  offen ist — gleiche Werte wie `staffedMonths`
- `winterraumNote`: Freitext-Präzisierung zum Schutzraum (z. B. "nur wenn
  unbewartet zugänglich"), optional
- `hutLink`: Link zur Hütten-Website, SAC-Seite o. Ä. (falls vorhanden), sonst
  leer
- `approach`: Anfahrt (Ausgangspunkt, Parkplatz, ÖV, Seilbahn)
- `points`: siehe oben — z. B. Hütte selbst + Parkplatz als zwei Punkte
- `approachTypes`: wie oben bei Touren (mehrere möglich) — bezieht sich hier auf die Anfahrt zum Ausgangspunkt/Zustieg zur Hütte
- `accessElevationSummer`/`accessElevationWinter`: Höhenmeter Zustieg, getrennt
  nach Sommer und Winter (nur Zahl, als Text)
- `accessDurationSummer`/`accessDurationWinter`: Zeitbedarf Zustieg, getrennt
  nach Sommer und Winter
- `accessDifficultySummer`/`accessDifficultyWinter`: SAC-Skala wie bei Touren,
  oder leer — getrennt nach Jahreszeit, da sich der Zustieg oft stark
  unterscheidet. Im Winter ist praktisch immer nur die SAC-Skala relevant.
- `accessDifficultySummerT`: Schweizer Wanderskala für den Sommerzustieg,
  falls es sich um einen reinen Wanderweg ohne Firn/Schnee-Querung handelt.
  Werte: "T1" (Wandern) bis "T6" (Schwieriges Alpinwandern). Nur beim
  Sommerzustieg relevant, nicht beim Winterzustieg. SAC-Skala und T-Skala
  schliessen sich nicht aus — je nach Charakter des Zustiegs kann auch nur
  eine der beiden ausgefüllt sein.
- `accessSummer`/`accessWinter`: Beschreibung der Zustiegsroute, getrennt nach
  Jahreszeit
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
