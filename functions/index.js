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

const PROMPT_MULTI_SEKTOR = `Dieses Foto zeigt eine Führerbuch-Seite mit MEHREREN Kletter-Sektoren (Teilbereichen) desselben Gebiets, jeweils mit eigenem Namen (z. B. "Sektor A – Edelweiss") und eigener Routenliste. Erkenne JEDEN einzelnen Sektor auf dem Foto separat.\nFür jeden Sektor:\n- name: der Sektor-Name exakt wie abgedruckt (z. B. "A – Edelweiss"). Falls kein Name lesbar: "Sektor <laufende Nummer>".\n- routes: die zugehörige Routenliste, nach diesen Regeln:\n${ROUTE_RULES}\nGib NUR Sektoren zurück, die auf dem Foto tatsächlich zu erkennen sind — nichts erfinden. Ein Sektor ohne lesbare Routen bekommt eine leere routes-Liste.`;

const KLETTERGEBIET_SCHEMA = {
  type: 'object',
  properties: {
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
  required: ['sectors'],
  additionalProperties: false,
};

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

// HTTPS Cloud Functions (2. Generation) — nehmen ein Foto (Base64) entgegen, lassen Claude
// (Haiku 4.5, günstigstes Modell mit Bildverständnis) die Kletterrouten erkennen und geben
// sie strukturiert zurück. cors:true erlaubt den Aufruf direkt aus fixseil.html.
exports.scanKletterrouten = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Nur POST erlaubt.' }); return; }
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 fehlt im Request-Body.' });
      return;
    }
    try {
      const parsed = await callClaudeVision(ANTHROPIC_API_KEY.value(), imageBase64, mediaType, PROMPT_SINGLE_SEKTOR, KLETTERROUTEN_SCHEMA);
      if (!parsed) {
        res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden — bitte erneut versuchen.' });
        return;
      }
      res.json(parsed);
    } catch (err) {
      console.error('scanKletterrouten Fehler:', err);
      res.status(500).json({ error: (err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.' });
    }
  }
);

// Wie scanKletterrouten, aber für ein Foto, das MEHRERE Sektoren eines Klettergebiets auf
// einmal zeigt (z. B. eine ganze Führerbuch-Doppelseite mit Sektor A–G) — erkennt jeden
// Sektor samt eigener Routenliste separat.
exports.scanKlettergebiet = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'europe-west1', memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Nur POST erlaubt.' }); return; }
    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 fehlt im Request-Body.' });
      return;
    }
    try {
      const parsed = await callClaudeVision(ANTHROPIC_API_KEY.value(), imageBase64, mediaType, PROMPT_MULTI_SEKTOR, KLETTERGEBIET_SCHEMA);
      if (!parsed) {
        res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden — bitte erneut versuchen.' });
        return;
      }
      res.json(parsed);
    } catch (err) {
      console.error('scanKlettergebiet Fehler:', err);
      res.status(500).json({ error: (err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.' });
    }
  }
);
