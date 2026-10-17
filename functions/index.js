const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');

admin.initializeApp();

// Wird per `firebase functions:secrets:set ANTHROPIC_API_KEY` gesetzt (siehe README.md) —
// steht damit nur serverseitig zur Verfügung, nie im App-Code oder im Browser.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Diese Functions sind öffentliche HTTPS-URLs (nötig für den Aufruf per fetch() direkt aus dem
// Browser) — ohne diese Prüfung könnte JEDE Person, die die URL kennt (z. B. aus dem öffentlichen
// Repo), beliebig oft eigene Fotos einschicken und damit auf unsere Kosten die Anthropic-API
// aufrufen. Die App schickt hier denselben Firebase-Auth-Token mit, den sie ohnehin für die
// Datenbank-Zugriffe nutzt (siehe ensureValidAuthToken() in 0-shared.js) — wer den nicht hat (also
// sich nicht mit dem App-Passwort angemeldet hat), kommt hier nicht durch. Kein zusätzliches, im
// Client-Code fest hinterlegtes Geheimnis, weil das ohnehin für alle einsehbar wäre, die den
// Quellcode lesen — die echte Hürde ist das Anmelde-Passwort, nicht ein weiterer String im Code.
async function requireAppAuth(req){
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if(!match) return false;
  try{
    await admin.auth().verifyIdToken(match[1]);
    return true;
  }catch(e){
    return false;
  }
}

// Rohes JSON-Schema statt Zod-Helper (client.messages.parse) — braucht keine zusätzliche
// Abhängigkeit und funktioniert unabhängig von der installierten SDK-Version.
const KLETTERROUTEN_SCHEMA = {
  type: 'object',
  properties: {
    routes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nr: { type: ['number', 'null'] },
          name: { type: 'string' },
          grad: { type: 'string' },
        },
        required: ['nr', 'name', 'grad'],
        additionalProperties: false,
      },
    },
  },
  required: ['routes'],
  additionalProperties: false,
};

const ROUTE_RULES = `- Nr: die Nummer aus dem Topo-Bild. Falls keine erkennbar, fortlaufend weiternummerieren.
- Name: exakt wie im Führer abgedruckt. Nichts übersetzen oder erfinden. Falls kein Name lesbar: "Route <Nr>".
- Grad: französisches Sportkletter-Schema (z. B. 5c, 6a+). Falls ein anderes Schema abgebildet ist, den Originalwert übernehmen und ein "?" anhängen.
- Erfinde nichts. Ist ein Wert nicht lesbar, schreib "?" statt zu raten.
- Ist eine Route eindeutig eine lange Mehrseillängen-/Alpinroute (mehrere Seillängen, mit Erstbegeher/Jahr/Sterne-Bewertung statt einer einfachen Einzellänge), nimm sie NICHT in die Liste auf.`;

const PROMPT_SINGLE_SEKTOR = `Lies die Kletterrouten von diesem Foto einer Führerbuch-Topo-Seite ab.\n${ROUTE_RULES}\n- Zeigt das Foto mehrere Sektoren, lies nur den am deutlichsten im Vordergrund/Bildausschnitt stehenden Sektor ein.`;

const PROMPT_MULTI_SEKTOR = `Dieses Foto zeigt eine Führerbuch-Seite mit MEHREREN Kletter-Sektoren (Teilbereichen) desselben Gebiets, jeweils mit eigenem Namen (z. B. "Sektor A – Edelweiss") und eigener Routenliste. Erkenne JEDEN einzelnen Sektor auf dem Foto separat.\n- gebietName: der übergeordnete Name des gesamten Klettergebiets, falls auf dem Foto als Überschrift/Kapiteltitel über allen Sektoren erkennbar (z. B. "Sewen"). Falls nicht eindeutig erkennbar: leerer String "" — nichts erfinden oder aus Sektor-Namen ableiten.\nFür jeden Sektor:\n- name: der Sektor-Name exakt wie abgedruckt (z. B. "A – Edelweiss"). Falls kein Name lesbar: "Sektor <laufende Nummer>".\n- routes: die zugehörige Routenliste, nach diesen Regeln:\n${ROUTE_RULES}\nGib NUR Sektoren zurück, die auf dem Foto tatsächlich zu erkennen sind — nichts erfinden. Ein Sektor ohne lesbare Routen bekommt eine leere routes-Liste.\nWICHTIG bei unklarer Zuordnung: Ist bei einzelnen Routen nicht eindeutig erkennbar, zu welchem Sektor sie gehören (z. B. unklares Layout, überlappende Spalten, Topo-Zeichnung ohne klare Zuordnung) — rate NICHT, in welchen Sektor sie gehören. Sammle solche Routen stattdessen in einem eigenen, zusätzlichen Sektor mit dem EXAKTEN Namen "Unsortiert". Höchstens ein solcher Sektor pro Foto, nur falls tatsächlich unklare Routen vorhanden sind.`;

const KLETTERGEBIET_SCHEMA = {
  type: 'object',
  properties: {
    gebietName: { type: 'string' },
    sectors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          routes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nr: { type: ['number', 'null'] },
                name: { type: 'string' },
                grad: { type: 'string' },
              },
              required: ['nr', 'name', 'grad'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'routes'],
        additionalProperties: false,
      },
    },
  },
  required: ['gebietName', 'sectors'],
  additionalProperties: false,
};

const ZUSTIEG_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    elevation: { type: 'string' },
    elevationUp: { type: 'string' },
    duration: { type: 'string' },
    difficultyT: { type: 'string', enum: ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'] },
    description: { type: 'string' },
  },
  required: ['name', 'elevation', 'elevationUp', 'duration', 'difficultyT', 'description'],
  additionalProperties: false,
};

const PROMPT_ZUSTIEG = `Lies die Angaben zu EINEM Zustieg/Abstieg von diesem Foto einer Führerbuch-Seite ab (Wanderzugang zu einer Hütte/einem Sektor/einer Tour).
- name: kurzer Titel des Zustiegs/Abstiegs, wie im Führer benannt (z. B. "Ab Parkplatz XY"). Falls kein eigener Name vorhanden, kurz zusammenfassen (z. B. "Zustieg von Norden").
- elevation: Höhenmeter als reine Zahl (ohne "Hm" oder "m"), leer lassen falls nicht angegeben.
- elevationUp: NUR bei einem Abstieg mit Gegenanstieg relevant — Höhenmeter des Gegenanstiegs als reine Zahl, sonst leer lassen.
- duration: Zeitbedarf exakt wie angegeben (z. B. "1h30", "2 Std."), leer lassen falls nicht angegeben.
- difficultyT: NUR falls die SAC-Wanderskala T1–T6 explizit angegeben ist, sonst leerer String — nichts schätzen oder erfinden.
- description: eine kurze Zusammenfassung (1–3 Sätze) der Wegbeschreibung auf Deutsch, NUR basierend auf tatsächlich lesbarem Text im Foto.
Erfinde nichts. Ist ein Wert nicht lesbar oder nicht angegeben, lass das jeweilige Feld leer ("").`;

async function callClaudeVision(apiKey, imageBase64, mediaType, prompt, schema){
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) return null;
  return JSON.parse(textBlock.text);
}

// Gemeinsame Handler-Fabrik für alle Foto-Scan-Functions — nehmen ein Foto (Base64)
// entgegen, lassen Claude (Haiku 4.5, günstigstes Modell mit Bildverständnis) die jeweiligen
// Angaben erkennen und geben sie strukturiert zurück. cors:true erlaubt den Aufruf direkt
// aus fixseil.html/index.html.
function makeScanHandler(name, prompt, schema){
  return onRequest(
    { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60 },
    async (req, res) => {
      if (req.method !== 'POST') { res.status(405).json({ error: 'Nur POST erlaubt.' }); return; }
      if (!(await requireAppAuth(req))) { res.status(401).json({ error: 'Nicht angemeldet.' }); return; }
      const { imageBase64, mediaType } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'imageBase64 fehlt im Request-Body.' });
        return;
      }
      try {
        const parsed = await callClaudeVision(ANTHROPIC_API_KEY.value(), imageBase64, mediaType, prompt, schema);
        if (!parsed) {
          res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden — bitte erneut versuchen.' });
          return;
        }
        res.json(parsed);
      } catch (err) {
        console.error(name + ' Fehler:', err);
        res.status(500).json({ error: (err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.' });
      }
    }
  );
}

// Ein Sektor, eine Routenliste.
exports.scanKletterrouten = makeScanHandler('scanKletterrouten', PROMPT_SINGLE_SEKTOR, KLETTERROUTEN_SCHEMA);

// Ein Foto mit MEHREREN Sektoren eines Klettergebiets auf einmal (z. B. eine ganze
// Führerbuch-Doppelseite mit Sektor A–G) — erkennt jeden Sektor samt eigener Routenliste.
exports.scanKlettergebiet = makeScanHandler('scanKlettergebiet', PROMPT_MULTI_SEKTOR, KLETTERGEBIET_SCHEMA);

// Ein einzelner Zustieg/Abstieg (Hütte, Tour oder Sektor — gleiche Feldstruktur überall).
exports.scanZustieg = makeScanHandler('scanZustieg', PROMPT_ZUSTIEG, ZUSTIEG_SCHEMA);

// ===== Tour aus Foto (Skitour, Hochtour, Klettern-Mehrseillängen, Wandern) =====
// Bewusst ein stärkeres Modell als bei den Kletterrouten: Eine Führerseite ist dicht, und wichtig ist,
// das Richtige herauszulesen (Ausgangspunkt, Route, Schlüsselstelle), nicht nur Text abzuschreiben.
// Jedes Feld kommt mit dem Originalzitat zurück, damit man in der App sieht, woher ein Wert stammt,
// und nur Geprüftes übernimmt. Bis 4 Fotos (z. B. eine Doppelseite) und ein optionaler Hinweis
// («Nr. 112», «Nordflanke»), falls mehrere Touren auf der Seite stehen.
const SCAN_TOUR_MODEL = 'claude-opus-5-5';
const FELD = { type: 'object', properties: { wert: { type: 'string' }, zitat: { type: 'string' } }, required: ['wert', 'zitat'], additionalProperties: false };
const TOUR_FELDER = ['name', 'routeName', 'difficulty', 'climbGrade', 'mandatoryDifficulty', 'pitchCount', 'targetAltitude',
  'elevationGain', 'elevationLoss', 'duration', 'approach', 'ascent', 'descent', 'crux', 'special', 'quelle'];
const TOUR_SCHEMA = {
  type: 'object',
  properties: {
    felder: {
      type: 'object',
      properties: Object.fromEntries(TOUR_FELDER.map((k) => [k, FELD])),
      required: TOUR_FELDER,
      additionalProperties: false,
    },
    exposition: {
      type: 'object',
      properties: {
        werte: { type: 'array', items: { type: 'string', enum: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] } },
        zitat: { type: 'string' },
      },
      required: ['werte', 'zitat'],
      additionalProperties: false,
    },
    gletscher: { type: 'string', enum: ['', 'ja', 'nein'] },
    andereTouren: { type: 'array', items: { type: 'string' } },
    unklar: { type: 'string' },
  },
  required: ['felder', 'exposition', 'gletscher', 'andereTouren', 'unklar'],
  additionalProperties: false,
};
const TOUR_ART = {
  skitour: 'eine Skitour. Schwierigkeit nach SAC-Skitourenskala (L, WS-, WS, WS+, ZS-, ZS, ZS+, S-, S, S+, SS). elevationLoss = Abfahrt in Hm, nur falls vom Aufstieg abweichend angegeben. descent = Abfahrt.',
  hochtour: 'eine Hochtour. Schwierigkeit nach SAC-Hochtourenskala (L, WS-, WS, WS+, ZS-, ZS, ZS+, S-, S, S+, SS). climbGrade = höchste Felsschwierigkeit, französisch (z. B. 4a) oder UIAA (z. B. III+) genau wie abgedruckt. descent = Abstieg.',
  klettern: 'eine Mehrseillängen-Kletterroute. climbGrade = schwierigste Seillänge, mandatoryDifficulty = obligatorische Schwierigkeit, beide genau wie abgedruckt (z. B. 6a+). pitchCount = Anzahl Seillängen als Zahl. difficulty = Gesamtbewertung (z. B. SAC-Skala oder «ZS»), falls angegeben. ascent = Routenverlauf, descent = Abstieg/Abseilen.',
  wandern: 'eine Wanderung. Schwierigkeit nach SAC-Wanderskala T1–T6, nur falls angegeben. descent = Abstieg.',
};
function promptScanTour(art, hinweis){
  return `Diese Fotos zeigen eine Seite aus einem Tourenführer (z. B. SAC-Führer), einen Screenshot oder eine Notiz. Erfasse daraus ${TOUR_ART[art] || TOUR_ART.skitour}

Ziel: eine Tour so ablegen, dass man sie später planen kann. Wichtig sind Gipfel, Route, Ausgangspunkt, Schwierigkeit, Höhenmeter, Zeit, Exposition, Schlüsselstelle und Gefahren. Seitenzahlen, Kartenblätter, Werbung und allgemeine Einleitungen sind unwichtig.
${hinweis ? `Gesucht ist diese Tour: «${hinweis}». Stehen mehrere Touren auf den Fotos, nimm genau diese.` : 'Stehen mehrere Touren auf den Fotos, nimm die vollständigste bzw. die mit der grössten Überschrift.'}
Alle anderen Touren auf den Fotos nur mit Nummer und Name in andereTouren aufführen.

Für jedes Feld: wert = der Wert, zitat = die kurze Originalstelle, aus der er stammt (höchstens etwa 120 Zeichen, wörtlich). Ist etwas nicht angegeben, wert und zitat leer lassen. Nichts schätzen, nichts aus Allgemeinwissen ergänzen.
- name: Gipfel oder Ziel, ohne Nummer und ohne Höhe (z. B. «Piz Grialetsch»).
- routeName: kurzer Routenname, z. B. «von Dürrboden» oder «Nordflanke».
- difficulty: Bewertung genau in der Schreibweise der Skala, sonst leer.
- targetAltitude, elevationGain, elevationLoss: nur die Zahl in Metern, ohne «m» oder «Hm».
- duration: Zeit wie angegeben, z. B. «4–5 h».
- approach: Ausgangspunkt, Anfahrt, Parkplatz, ÖV, Hütte: 1–3 Sätze.
- ascent, descent: der Routenverlauf mit den Angaben, die man unterwegs braucht (Punkte wie «P. 2251», Richtungen, Steilheit in Grad, Abzweigungen). Knapp, aber nichts Wichtiges weglassen. Auf Deutsch.
- crux: die Schlüsselstelle mit Steilheit oder Grad.
- special: Gefahren (Lawinen, Spalten, Steinschlag), nötiges Material, beste Jahreszeit.
- quelle: Buchtitel, Auflage oder Webseite und Tournummer/Seite, falls erkennbar.
- exposition.werte: nur falls die Exposition angegeben ist.
- gletscher: «ja», wenn ein Gletscher begangen wird, «nein», wenn ausdrücklich ohne Gletscher, sonst leer.
- unklar: ein kurzer Satz, falls etwas schlecht lesbar oder widersprüchlich war, sonst leer.
Texte auf Deutsch (Schweizer Schreibweise mit «ss»), Namen genau wie abgedruckt.`;
}
exports.scanTour = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'europe-west1', memory: '512MiB', timeoutSeconds: 180 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Nur POST erlaubt.' }); return; }
    if (!(await requireAppAuth(req))) { res.status(401).json({ error: 'Nicht angemeldet.' }); return; }
    const { images, hinweis, art } = req.body || {};
    const list = Array.isArray(images) ? images.filter((x) => x && typeof x.imageBase64 === 'string' && x.imageBase64).slice(0, 4) : [];
    if (!list.length) { res.status(400).json({ error: 'Kein Foto im Request-Body.' }); return; }
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const response = await client.messages.create({
        model: SCAN_TOUR_MODEL,
        max_tokens: 16000,
        output_config: { effort: 'high', format: { type: 'json_schema', schema: TOUR_SCHEMA } },
        // Lehnt das Modell ab, übernimmt serverseitig ein passendes anderes Modell
        fallbacks: 'default',
        messages: [{
          role: 'user',
          content: [
            ...list.map((x) => ({ type: 'image', source: { type: 'base64', media_type: x.mediaType || 'image/jpeg', data: x.imageBase64 } })),
            { type: 'text', text: promptScanTour(art, String(hinweis || '').slice(0, 200).trim()) },
          ],
        }],
      }, { headers: { 'anthropic-beta': 'server-side-fallback-2026-07-01' } });
      if (response.stop_reason === 'refusal') { res.status(502).json({ error: 'Die Bilderkennung hat dieses Foto abgelehnt.' }); return; }
      if (response.stop_reason === 'max_tokens') { res.status(502).json({ error: 'Antwort zu lang – bitte weniger Fotos auf einmal.' }); return; }
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock) { res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden – bitte erneut versuchen.' }); return; }
      res.json(JSON.parse(textBlock.text));
    } catch (err) {
      console.error('scanTour Fehler:', err);
      const status = err instanceof Anthropic.RateLimitError ? 429 : 500;
      res.status(status).json({ error: status === 429 ? 'Gerade zu viele Anfragen – in einer Minute nochmals versuchen.' : ((err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.') });
    }
  }
);
