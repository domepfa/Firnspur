# Firnspur – Konzept (Stand Oktober 2026)

Firnspur ist ein **gemeinsames Tourenbuch mit Wissensspeicher** für einen Kreis von Freunden:
Touren aus Büchern, anderen Apps und eigener Recherche sammeln, so vollständig machen, dass sie
«bereit» sind, am Tag X passend zu Region und Bedingungen auswählen, danach mit GPX, Fotos und
Erfahrungen ergänzen. Kein Navigationswerkzeug.

## Ablauf
1. **Sammeln (zuhause):** Tour erfassen, Recherche ergänzen (Text, Route auf der Karte zeichnen,
   Orte wie Parkplatz oder Biwak), ablegen. Freunde tragen ebenfalls bei.
2. **Auswählen (Tag X):** Region wählen (auf der Karte zoomen, Region aus der Liste oder Anfahrtszeit
   ab Wohnort), sehen, welche Touren, Hütten und Orte dort sind, Bedingungen prüfen, eine wählen.
3. **Machen:** unterwegs wenig nötig (Tourenzettel, offline).
4. **Nachtragen (zuhause):** GPX, Fotos, was nicht stimmte oder fehlte – als Erfahrung mit Datum.

## Grundsätze
- **Karte ist die Hauptansicht** zur Orientierung; die Liste zeigt, was im Kartenausschnitt liegt.
- **Eine einzige Karte:** Startkarte, Tour hinter dem Blatt, Bearbeiten und 3D sind dieselbe Karte mit
  demselben Ausschnitt, denselben Ebenen und denselben Werkzeugen (Gedrückthalten, Planer, Hang-Scan).
  Keine kleinen Zusatzkarten in Formularen oder Detailseiten.
- Vier Disziplinen bleiben getrennt (Skitour, Hochtour, Klettern, Wandern), je etwa 100 Touren.
- **Status selbst gesetzt:** Idee · in Recherche · bereit. «Erledigt» ist ein Filter, kein Bereich.
- **Bilder** sind zentral: Topos (Klettern), Routen, Schlüsselstellen; Titelbild nachträglich.
- **Orte** (Parkplatz, Mautstelle/Fahrverbot, Biwak, Wasser, Toilette, Haltestelle, Einstieg,
  Ausstieg, Gipfel, Gefahr, Rast, Abzweigung, Rückzug) mit Notiz, Foto und **Stand-Datum**; an einer
  Tour oder eigenständig und von mehreren Touren genutzt.
- **Erfahrungen** statt Überschreiben: Logbuch pro Tour mit Name und Datum; Freunde schreiben direkt.
  Aus einer Erfahrung wird mit einem Tippen ein Vorschlag zur Beschreibung (Eigentümer übernimmt).
- **Eigentümer und Vorschläge** (siehe CLAUDE.md, Daten): Ergänzen frei, Ändern als Vorschlag.
- Planen/Termine und «Tour starten» sind Nebenfunktionen (unter «Mehr»).
- **Hang-Scan** ist Orientierung für die Planung (Steilheit, Lawine, Klippen, Sonne), kein Entscheid am Hang.
  Grenzen stehen in der App beim Ergebnis; die Lawinen-Schraffur im Winter mit echtem Bulletin an bekannten
  Hängen prüfen.
- **Wetter auf der Karte** dient dem Auswählen am Tag X (Region, Zeitfenster), nicht der Navigation.
  Ruhig statt vollgestellt: Bedienung unten in der Daumenzone, oben bleibt die Karte frei.
  - *Übersicht:* Wettersymbole der Ortsprognosen von MeteoSchweiz je Tag, ein Tag aufgeklappt alle 3 Stunden.
  - *Grössen* (Temperatur, Niederschlag, Wind, Wolken, Schnee): weiche Farbflächen statt Zahlen-Etiketten,
    den genauen Wert zeigt ein Fadenkreuz in der Mitte (Tippen schiebt die Stelle darunter); Messstationen
    nur bei «Jetzt» als kleine Punkte.
  - *Zeit:* Niederschlag vom Radar (2 Stunden zurück, alle 5 Minuten) über die eigene Kurzfristprognose
    (2 Stunden) zum Modell ICON-CH1 (stündlich, 1 km); Zeitraffer weich überblendet.
  - Quellen nur offen und gratis (MeteoSchweiz, EUMETSAT); grosse Rohdaten wandelt eine GitHub-Aktion in kleine
    Bilder/Dateien, Firebase bleibt unberührt. Grenzen offen nennen (Kurzfristprognose sieht neue Schauer nicht).

## Umbau-Reihenfolge
1. Startansicht: echte Karte und Liste gekoppelt (Liste = Kartenausschnitt), Filter in einer Zeile,
   kompakte Einträge mit Vorschaubild, «Done» als Filter.
2. Tourenansicht: Bilder · Kennzahlen/Status · Beschreibung · Erfahrungen · Orte · Bedingungen ·
   Anreise · Mehr; leere Abschnitte ausblenden.
3. Orte: neue Arten, Stand-Datum, gemeinsame Orte, Ebene «Orte».
4. Erfahrungen mit Zeitstempel, als Vorschlag übernehmbar.
5. Formular in aufklappbaren Abschnitten; Karten-Knöpfe in einer ruhigen Leiste.
