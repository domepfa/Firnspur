const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');

// Wird per `firebase functions:secrets:set ANTHROPIC_API_KEY` gesetzt (siehe README.md) —
// steht damit nur serverseitig zur Verfügung, nie im App-Code oder im Browser.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const KletterroutenSchema = z.object({
  routes: z.array(z.object({
    nr: z.number().nullable(),
    name: z.string(),
    grad: z.string(),
  })),
});

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
      const response = await client.messages.parse({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
        output_config: { format: zodOutputFormat(KletterroutenSchema) },
      });
      if (!response.parsed_output) {
        res.status(502).json({ error: 'Antwort konnte nicht ausgewertet werden — bitte erneut versuchen.' });
        return;
      }
      res.json(response.parsed_output);
    } catch (err) {
      console.error('scanKletterrouten Fehler:', err);
      res.status(500).json({ error: (err && err.message) || 'Unbekannter Fehler bei der Bilderkennung.' });
    }
  }
);
