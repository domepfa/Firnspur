const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk');

// Wird per `firebase functions:secrets:set ANTHROPIC_API_KEY` gesetzt (siehe README.md) —
// steht damit nur serverseitig zur Verfügung, nie im App-Code oder im Browser.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

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

const PROMPT_MULTI_SEKTOR = `Dieses Foto zeigt eine Führerbuch-Seite mit MEHREREN Kletter-Sektoren (Teilbereichen) desselben Gebiets, jeweils mit eigenem Namen (z. B. "Sektor A – Edelweiss") und eigener Routenliste. Erkenne JEDEN einzelnen Sektor auf dem Foto separat.\n- gebietName: der übergeordnete Name des gesamten Klettergebiets, falls auf dem Foto als Überschrift/Kapiteltitel über allen Sektoren erkennbar (z. B. "Sewen"). Falls nicht eindeutig erkennbar: leerer String "" — nichts erfinden oder aus Sektor-Namen ableiten.\nFür jeden Sektor:\n- name: der Sektor-Name exakt wie abgedruckt (z. B. "A – Edelweiss"). Falls kein Name lesbar: "Sektor <laufende Nummer>".\n- routes: die zugehörige Routenliste, nach diesen Regeln:\n${ROUTE_RULES}\nGib NUR Sektoren zurück, die auf dem Foto tatsächlich zu erkennen sind — nichts erfinden. Ein Sektor ohne lesbare Routen bekommt eine leere routes-Liste.`;

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
