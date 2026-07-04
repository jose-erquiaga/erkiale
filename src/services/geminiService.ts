import { GoogleGenAI, Type } from "@google/genai";

export interface ScannedExpenseComponent {
  concept: string;
  quantity: number;
  unitPrice: number;
  price: number;
}

export interface ScannedExpenseDocument {
  provider: string;
  date: string;
  components: ScannedExpenseComponent[];
}

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const isQuotaError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429') || msg.toLowerCase().includes('quota');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini(file: File, prompt: string, schema: object): Promise<any> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
  });
  reader.readAsDataURL(file);
  const base64Data = await base64Promise;

  // Retries absorb transient per-minute rate-limit spikes; a fully
  // exhausted free-tier quota still surfaces to the caller after these.
  const retryDelaysMs = [2000, 5000];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      if (!isQuotaError(error) || attempt === retryDelaysMs.length) {
        throw error;
      }
      await sleep(retryDelaysMs[attempt]);
    }
  }
}

// Extracts a single invoice/receipt as one provider + one date + every
// individual line-item component with its own quantity/unit price, so the
// user can review and correct each component before it becomes an expense.
export const scanExpenseInvoice = async (file: File): Promise<ScannedExpenseDocument> => {
  const prompt = "Extract this single invoice/receipt: it has one provider (issuing company/store name) " +
    "and one date. Return EVERY distinct line-item/component separately, each with its own concept " +
    "(what was bought), quantity (assume 1 if not stated), unit price, and line total (price). " +
    "Do NOT collapse multiple lines into a single total. Ignore summary rows like subtotal, IVA, or " +
    "grand total — those are derived from the components, not components themselves.";

  const schema = {
    type: Type.OBJECT,
    properties: {
      provider: { type: Type.STRING },
      date: { type: Type.STRING, description: "YYYY-MM-DD" },
      components: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unitPrice: { type: Type.NUMBER },
            price: { type: Type.NUMBER }
          },
          required: ["concept", "price"]
        }
      }
    },
    required: ["provider", "date", "components"]
  };

  return callGemini(file, prompt, schema);
};
