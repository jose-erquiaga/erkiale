const functions = require('@google-cloud/functions-framework');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const PROJECT_NUMBER = '876350107462';
const MODEL = 'gemini-2.0-flash';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const secretClient = new SecretManagerServiceClient();
let cachedApiKey = null;

async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const name = `projects/${PROJECT_NUMBER}/secrets/gemini-api-key/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  cachedApiKey = version.payload.data.toString('utf8');
  return cachedApiKey;
}

// Matches ScannedExpenseDocument in src/services/geminiService.ts: one
// provider + one date + every individual line-item component, so the user
// can review/correct each component before it becomes an expense.
const PROMPT =
  'Extract this single invoice/receipt: it has one provider (issuing company/store name) ' +
  'and one date. Return EVERY distinct line-item/component separately, each with its own concept ' +
  '(what was bought), quantity (assume 1 if not stated), unit price, and line total (price). ' +
  'Do NOT collapse multiple lines into a single total. Ignore summary rows like subtotal, IVA, or ' +
  'grand total — those are derived from the components, not components themselves. ' +
  'Respond with ONLY a JSON object: {"provider": string, "date": "YYYY-MM-DD", ' +
  '"components": [{"concept": string, "quantity": number, "unitPrice": number, "price": number}]}';

// Cloud Functions v2 forwards the request to the container root ("/"),
// not to a path matching the function name in the cloudfunctions.net URL.
app.post('/', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const apiKey = await getApiKey();

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json' },
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'No se pudo parsear la respuesta de Gemini' };

    res.json(parsed);
  } catch (error) {
    console.error(error);
    const status = error?.response?.status === 429 ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
});

functions.http('app', app);
