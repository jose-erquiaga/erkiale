import React, { useRef, useState } from 'react';
import { Camera, X, Plus, AlertCircle } from 'lucide-react';

interface ExtractedItem {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  iva?: number;
  total?: number;
}

interface ReceiptData {
  items: ExtractedItem[];
  totalBase?: number;
  totalIVA?: number;
  totalFactura?: number;
}

interface CameraReceiptCaptureProps {
  onItemsExtracted: (items: ExtractedItem[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const GEMINI_API_URL = 'https://europe-west1-erkiale-9459d.cloudfunctions.net/analyzeReceipt';

export const CameraReceiptCapture: React.FC<CameraReceiptCaptureProps> = ({
  onItemsExtracted,
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvasRef.current.toDataURL('image/jpeg');
    processImage(imageData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageBase64: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Extraer base64 sin el prefijo
      const base64Data = imageBase64.split(',')[1];

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.statusText}`);
      }

      const data: ReceiptData = await response.json();
      setExtractedData(data);

      if (data.error) {
        setError(`Error al procesar: ${data.error}`);
      }
    } catch (err) {
      setError(`Error al procesar la imagen: ${err instanceof Error ? err.message : 'Desconocido'}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addItem = (item: ExtractedItem) => {
    onItemsExtracted([item]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-blue-600 px-8 py-6 flex justify-between items-center">
          <h2 className="text-lg font-black text-white">Capturar Factura</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-2 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Camera Preview */}
          {isCameraActive && !extractedData && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-96 object-cover"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Camera size={18} /> Capturar
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-black py-3 rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Upload buttons */}
          {!isCameraActive && !extractedData && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex flex-col items-center gap-2"
              >
                <Camera size={24} />
                Usar Cámara
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-black py-4 rounded-xl flex flex-col items-center gap-2"
              >
                <Plus size={24} />
                Subir Archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <Camera className="text-blue-600" size={32} />
              </div>
              <p className="mt-4 text-slate-600 font-semibold">Procesando factura...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="text-rose-600 flex-shrink-0" size={20} />
              <p className="text-rose-700 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Extracted Items */}
          {extractedData && !isProcessing && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900">
                  Total Factura: <span className="text-lg font-black">${extractedData.totalFactura?.toFixed(2) || '0.00'}</span>
                </p>
                {extractedData.totalIVA && (
                  <p className="text-xs text-blue-700 mt-1">IVA: ${extractedData.totalIVA.toFixed(2)}</p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">Ítems Detectados</h3>
                {extractedData.items?.map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">{item.concepto}</p>
                        <p className="text-xs text-slate-500">
                          {item.cantidad} × ${item.precioUnitario?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <p className="font-black text-slate-900">${item.total?.toFixed(2) || (item.cantidad * item.precioUnitario).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => addItem(item)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Agregar a Gastos
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setExtractedData(null);
                  setError(null);
                }}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-900 font-black py-3 rounded-xl"
              >
                Capturar Otra Factura
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
