import { GoogleGenAI, Type } from "@google/genai";

export enum ScanType {
  EXPENSE = 'expense',
  CATALOG = 'catalog'
}

export interface ScannedCatalogItem {
  concept: string;
  category: string;
  unit: string;
  price: number;
}

export interface ScannedExpenseItem {
  concept: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  date: string;
  category: string;
}

const API_KEY = process.env.GEMINI_API_KEY;

export const scanDocument = async (file: File, type: ScanType): Promise<any[]> => {
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

  const prompt = type === ScanType.EXPENSE 
    ? "Extract items from this receipt/invoice. Items should have concept, quantity, unit, unit price, total, date, and category (Materiales, Mano de Obra, Herramientas, Varios)."
    : "Extract items for a price catalog from this document or photo. Identify the concept (product/service), unit of measure (m2, ml, ud, kg, etc.), and unit price. Also categorize them.";

  const schema = type === ScanType.EXPENSE 
    ? {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            qty: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            price: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            category: { type: Type.STRING }
          },
          required: ["concept", "qty", "unit", "price", "total", "date", "category"]
        }
      }
    : {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            category: { type: Type.STRING },
            unit: { type: Type.STRING },
            price: { type: Type.NUMBER }
          },
          required: ["concept", "category", "unit", "price"]
        }
      };

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
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
};
