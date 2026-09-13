# Foto-Scan für Kletterrouten — Einrichtung

Diese Cloud Function ist **fertig geschrieben, aber noch nicht ausgerollt**. Solange sie
nicht deployt ist, zeigt der "📷 Foto scannen"-Knopf in der App eine Fehlermeldung statt
zu funktionieren — das ist erwartet und harmlos, nichts anderes in der App ist davon
betroffen.

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

Nach erfolgreichem Deploy zeigt die Konsole die URL der Funktion, z. B.:

```
https://europe-west1-firnspur.cloudfunctions.net/scanKletterrouten
```

## Letzter Schritt: URL in die App eintragen

Diese URL in `0-shared.js` eintragen — suche nach `SCAN_KLETTERROUTEN_URL` (ganz am
Anfang der Datei) und trage sie dort ein, z. B.:

```js
const SCAN_KLETTERROUTEN_URL = 'https://europe-west1-firnspur.cloudfunctions.net/scanKletterrouten';
```

Danach committen/pushen wie gewohnt — der "📷 Foto scannen"-Knopf funktioniert dann.

## Kosten-Kontrolle

- **Anthropic:** reines Prepaid-Guthaben, kein automatisches Nachladen (solange du das nicht
  explizit aktivierst). Ein Scan kostet ca. 0.004–0.005 US$ (Claude Haiku 4.5).
- **Firebase Cloud Functions:** nur bei tatsächlichem Aufruf abgerechnet, mit grosser
  kostenloser Grundmenge pro Monat — bei normaler Nutzung faktisch 0 Fr.
