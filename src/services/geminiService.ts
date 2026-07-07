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

// Cloud Function proxy: keeps the Gemini API key in Secret Manager instead
// of shipping it inside the client bundle (Vite `define` would otherwise
// expose it to anyone who opens devtools).
const ANALYZE_RECEIPT_URL = 'https://europe-west1-erkiale-9459d.cloudfunctions.net/analyzeReceipt';

const fileToBase64 = (file: File): Promise<string> => {
  const reader = new FileReader();
  const promise = new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
  });
  reader.readAsDataURL(file);
  return promise;
};

// Extracts a single invoice/receipt as one provider + one date + every
// individual line-item component with its own quantity/unit price, so the
// user can review and correct each component before it becomes an expense.
export const scanExpenseInvoice = async (file: File): Promise<ScannedExpenseDocument> => {
  const imageBase64 = await fileToBase64(file);

  const response = await fetch(ANALYZE_RECEIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType: file.type }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('429: Cuota de IA agotada.');
    }
    throw new Error(`Error al analizar la factura: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    provider: data.provider || '',
    date: data.date || '',
    components: Array.isArray(data.components) ? data.components : [],
  };
};
