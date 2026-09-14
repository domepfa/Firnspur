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

const PROMPT = `Lies die Kletterrouten von diesem Foto einer Führerbuch-Topo-Seite ab.
- Nr: die Nummer aus dem Topo-Bild. Falls keine erkennbar, fortlaufend weiternummerieren.
- Name: exakt wie im Führer abgedruckt. Nichts übersetzen oder erfinden. Falls kein Name lesbar: "Route <Nr>".
- Grad: französisches Sportkletter-Schema (z. B. 5c, 6a+). Falls ein anderes Schema abgebildet ist, den Originalwert übernehmen und ein "?" anhängen.
- Erfinde nichts. Ist ein Wert nicht lesbar, schreib "?" statt zu raten.
- Ist eine Route eindeutig eine lange Mehrseillängen-/Alpinroute (mehrere Seillängen, mit Erstbegeher/Jahr/Sterne-Bewertung statt einer einfachen Einzellänge), nimm sie NICHT in die Liste auf.
- Zeigt das Foto mehrere Sektoren, lies nur den am deutlichsten im Vordergrund/Bildausschnitt stehenden Sektor ein.`;

// HTTPS Cloud Function (2. Generation) — nimmt ein Foto (Base64) entgegen, lässt Claude
// (Haiku 4.5, günstigstes Modell mit Bildverständnis) die Kletterrouten-Liste erkennen und
// gibt sie strukturiert zurück. cors:true erlaubt den Aufruf direkt aus fixseil.html.
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
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
        output_config: { format: { type: 'json_schema', schema: KLETTERROUTEN_SCHEMA } },
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock) {
        res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden — bitte erneut versuchen.' });
        return;
      }
      const parsed = JSON.parse(textBlock.text);
      res.json(parsed);
    } catch (err) {
      console.error('scanKletterrouten Fehler:', err);
      res.status(500).json({ error: (err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.' });
    }
  }
);
