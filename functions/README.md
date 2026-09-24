# Foto-Scan für Kletterrouten — Einrichtung

Drei Cloud Functions in dieser Datei, **alle drei deployt und live**:
- `scanKletterrouten` — ein Sektor, eine Routenliste.
- `scanKlettergebiet` — ein Foto mit MEHREREN Sektoren gleichzeitig (z. B. eine ganze
  Führerbuch-Seite mit Sektor A–G), erkennt jeden Sektor samt eigener Routenliste sowie,
  falls auf dem Foto als Überschrift erkennbar, den Namen des übergeordneten Klettergebiets.
  Nutzbar sowohl von der Detailseite eines bestehenden Klettergebiets aus (Sektoren werden
  dort angehängt) als auch direkt von der Klettergebiete-Übersicht aus ("📷 Gebiet per Foto(s)
  scannen") — dabei wird das Klettergebiet inkl. Name UND alle Sektoren in einem Schritt neu
  angelegt, ganz ohne vorheriges manuelles Anlegen eines leeren Gebiets. In beiden Fällen lassen
  sich mehrere Fotos gleichzeitig auswählen (z. B. wenn das Gebiet über mehrere Führerbuch-Seiten
  geht) — jedes Foto wird einzeln ausgewertet, alle erkannten Sektoren landen zusammengeführt in
  einer gemeinsamen Übersicht. Ein zweiter Knopf ("📸 Direkt fotografieren") öffnet auf dem Handy
  garantiert die Kamera statt der Foto-Auswahl.
- `scanZustieg` — ein einzelner Zustieg/Abstieg (Hütte, Tour oder Sektor — gleiche
  Feldstruktur überall: Name/Höhenmeter/Zeit/Wanderskala/Beschreibung).

Falls künftig eine neue Function dazukommt, zeigt ihr "📷 Foto scannen"-Knopf in der App
bis zum nächsten Deploy eine Fehlermeldung statt zu funktionieren — das ist erwartet und
harmlos, nichts anderes in der App ist davon betroffen.

**Zugriffsschutz:** Alle drei Functions sind öffentliche HTTPS-URLs (nötig für den Aufruf
direkt aus dem Browser) und prüfen deshalb serverseitig einen gültigen Firebase-Auth-Token
im `Authorization: Bearer …`-Header — denselben Token, den die App ohnehin fürs Anmelden mit
dem App-Passwort bekommt. Ohne gültige Anmeldung liefern sie `401`. Damit kann nicht mehr
jede Person, die die URL kennt (z. B. aus diesem — öffentlichen — Repo), beliebig oft eigene
Fotos einschicken und damit auf unsere Kosten die Anthropic-API aufrufen.

## Was du brauchst

1. Ein **Anthropic-Konto** mit Guthaben: https://console.anthropic.com — dort einen API-Key
   erzeugen (Settings → API Keys). Auto-Reload lieber **ausgeschaltet lassen**, dann
   funktioniert es einfach nicht mehr, wenn das Guthaben aufgebraucht ist, statt automatisch
   nachzuladen.
2. Der **Firebase-Blaze-Plan** (Pay-as-you-go) für das Projekt `firnspur` — im
   [Firebase-Konsolen](https://console.firebase.google.com/project/firnspur/usage/details)
   unter "Upgrade" wechseln. Braucht eine Kreditkarte, kostet bei dieser Nutzung aber
   voraussichtlich 0 Fr./Monat (weit innerhalb der kostenlosen Grundmenge). Empfehlung:
   dort gleich ein Budget-Alert einrichten (E-Mail-Warnung ab z. B. 5 Fr.).
3. Die [Firebase CLI](https://firebase.google.com/docs/cli) lokal installiert
   (`npm install -g firebase-tools`).

## Deployment

```bash
cd /pfad/zu/Firnspur
firebase login
firebase use firnspur
firebase functions:secrets:set ANTHROPIC_API_KEY
# (Key aus console.anthropic.com hier einfügen, wenn gefragt)
cd functions && npm install && cd ..
firebase deploy --only functions
```

`firebase deploy --only functions` deployt automatisch ALLE Functions aus `functions/index.js`.
Nach erfolgreichem Deploy zeigt die Konsole die URLs, z. B.:

```
Function URL (scanKletterrouten(europe-west1)): https://europe-west1-firnspur.cloudfunctions.net/scanKletterrouten
Function URL (scanKlettergebiet(europe-west1)): https://europe-west1-firnspur.cloudfunctions.net/scanKlettergebiet
Function URL (scanZustieg(europe-west1)): https://europe-west1-firnspur.cloudfunctions.net/scanZustieg
```

## Letzter Schritt: URL(s) in die App eintragen

In `0-shared.js` (ganz am Anfang der Datei) eintragen, z. B.:

```js
var SCAN_KLETTERROUTEN_URL = 'https://europe-west1-firnspur.cloudfunctions.net/scanKletterrouten';
var SCAN_KLETTERGEBIET_URL = 'https://europe-west1-firnspur.cloudfunctions.net/scanKlettergebiet';
var SCAN_ZUSTIEG_URL = 'https://europe-west1-firnspur.cloudfunctions.net/scanZustieg';
```

Danach committen/pushen wie gewohnt — die jeweiligen "📷 Foto scannen"-Knöpfe funktionieren dann.

## Kosten-Kontrolle

- **Anthropic:** reines Prepaid-Guthaben, kein automatisches Nachladen (solange du das nicht
  explizit aktivierst). Ein Scan kostet ca. 0.004–0.005 US$ (Claude Haiku 4.5).
- **Firebase Cloud Functions:** nur bei tatsächlichem Aufruf abgerechnet, mit grosser
  kostenloser Grundmenge pro Monat — bei normaler Nutzung faktisch 0 Fr.
