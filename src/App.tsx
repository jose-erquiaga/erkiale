/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Hammer, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  FileText, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Receipt, 
  Ticket, 
  Briefcase, 
  X, 
  Camera,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Key,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocFromServer,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import { scanDocument, ScanType } from './services/geminiService';

// --- FIREBASE INIT ---
let app;
let db;
let auth;
let isFirebaseConfigured = false;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseConfigured = true;

    // Validate connection to Firestore as per integration guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

// --- ERROR HANDLING ---
// --- HELPERS ---
const isAdmin = () => {
  return auth?.currentUser?.email === 'jose.erquiaga@gmail.com';
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!isFirebaseConfigured) {
    console.error("Firebase not configured. Error suppressed.");
    return;
  }
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show user-friendly alert for permission errors
  if (errMessage.includes('permission-denied') || errMessage.includes('insufficient permissions')) {
    alert(`Error de permisos en ${path} (${operationType}). Verifica si tu email tiene acceso.`);
  }

  throw new Error(JSON.stringify(errInfo));
}

/**
 * ReformasPro: A comprehensive management tool for renovation projects.
 */

// --- TYPES ---
interface Project {
  id: number;
  firebaseId?: string;
  name: string;
  clientName: string;
  clientCIF: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  status: 'En curso' | 'Pendiente' | 'Finalizado';
  category: string;
  color?: string;
  ownerId?: string;
}

interface CompanyInfo {
  name: string;
  cif: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Erkiale S.L',
  cif: 'B92898287',
  address: 'Avda Julio Iglesias 3',
  city: '29660 Nueva Andalucia, Málaga, España',
  phone: '647462631',
  email: '',
};

const DEFAULT_EXPENSE_CATEGORIES = ['Materiales', 'Mano de Obra', 'Herramientas', 'Varios'];

interface CatalogItem {
  id: number;
  firebaseId?: string;
  category: string;
  concept: string;
  unit: string;
  price: number;
}

interface CalendarEvent {
  id: number;
  firebaseId?: string;
  projectId: number;
  date: string;
  time: string;
  worker: string;
  task: string;
  status: 'pendiente' | 'urgente';
}

interface BudgetItem {
  id: number;
  firebaseId?: string;
  concept: string;
  description?: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

interface ExpenseItem {
  id: number;
  firebaseId?: string;
  concept: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  date: string;
  category: string;
  attachmentUrl?: string;
}

const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

const CATALOG_SEED: { category: string; concept: string; unit: string; price: number }[] = [
  // Pintura y Decoración
  { category:'Pintura y Decoración', concept:'Pintura plástica lisa (2 manos) blanca', unit:'m2', price:7.50 },
  { category:'Pintura y Decoración', concept:'Pintura plástica lisa (2 manos) color', unit:'m2', price:9.00 },
  { category:'Pintura y Decoración', concept:'Esmalte sintético en carpintería metálica', unit:'m2', price:14.00 },
  { category:'Pintura y Decoración', concept:'Quitar gotelé y tendido de plaste', unit:'m2', price:16.50 },
  { category:'Pintura y Decoración', concept:'Barnizado de puertas de madera', unit:'ud', price:55.00 },
  { category:'Pintura y Decoración', concept:'Papel pintado (mano de obra)', unit:'m2', price:12.00 },
  { category:'Pintura y Decoración', concept:'Pintura de fachadas (revestimiento acrílico)', unit:'m2', price:18.00 },
  { category:'Pintura y Decoración', concept:'Pintura epoxi en suelos', unit:'m2', price:22.00 },
  { category:'Pintura y Decoración', concept:'Tratamiento antimoho en techos de baño', unit:'m2', price:10.00 },
  { category:'Pintura y Decoración', concept:'Lacado de puertas en blanco (taller)', unit:'ud', price:110.00 },
  { category:'Pintura y Decoración', concept:'Pintura de radiadores', unit:'ud', price:25.00 },
  { category:'Pintura y Decoración', concept:'Pintura de barandillas metálicas', unit:'ml', price:12.00 },
  { category:'Pintura y Decoración', concept:'Estuco veneciano', unit:'m2', price:45.00 },
  { category:'Pintura y Decoración', concept:'Limpieza de manchas de humedad y fijador', unit:'m2', price:6.00 },
  { category:'Pintura y Decoración', concept:'Protección de mobiliario y suelos', unit:'global', price:120.00 },
  { category:'Pintura y Decoración', concept:'Pintura de bañera con resinas', unit:'ud', price:95.00 },
  { category:'Pintura y Decoración', concept:'Masillado de grietas y fisuras', unit:'ml', price:4.50 },
  { category:'Pintura y Decoración', concept:'Barnizado de vigas de madera vista', unit:'ml', price:15.00 },
  { category:'Pintura y Decoración', concept:'Pintura de garajes (señalización incluida)', unit:'m2', price:11.00 },
  { category:'Pintura y Decoración', concept:'Suministro y colocación de moldura escayola', unit:'ml', price:14.00 },
  // Electricidad e Iluminación
  { category:'Electricidad e Iluminación', concept:'Nuevo punto de luz sencillo', unit:'ud', price:50.00 },
  { category:'Electricidad e Iluminación', concept:'Punto de enchufe 16A', unit:'ud', price:55.00 },
  { category:'Electricidad e Iluminación', concept:'Punto de toma de TV o Teléfono', unit:'ud', price:60.00 },
  { category:'Electricidad e Iluminación', concept:'Cuadro eléctrico 12 elementos (montado)', unit:'ud', price:380.00 },
  { category:'Electricidad e Iluminación', concept:'Diferencial 2P 40A 30mA', unit:'ud', price:65.00 },
  { category:'Electricidad e Iluminación', concept:'Instalación de vitrocerámica/horno (toma)', unit:'ud', price:85.00 },
  { category:'Electricidad e Iluminación', concept:'Punto de red RJ45 Cat6', unit:'ud', price:75.00 },
  { category:'Electricidad e Iluminación', concept:'Instalación de ventilador de techo', unit:'ud', price:90.00 },
  { category:'Electricidad e Iluminación', concept:'Montaje de mecanismo (solo mano obra)', unit:'ud', price:8.00 },
  { category:'Electricidad e Iluminación', concept:'Pulsador con avisador acústico', unit:'ud', price:45.00 },
  { category:'Electricidad e Iluminación', concept:'Foco empotrable LED (suministro e inst.)', unit:'ud', price:35.00 },
  { category:'Electricidad e Iluminación', concept:'Tira LED en foseado (mano obra)', unit:'ml', price:18.00 },
  { category:'Electricidad e Iluminación', concept:'Boletín de enganche', unit:'ud', price:150.00 },
  { category:'Electricidad e Iluminación', concept:'Instalación de videoportero', unit:'ud', price:280.00 },
  { category:'Electricidad e Iluminación', concept:'Punto de luz conmutado (2 llaves)', unit:'ud', price:85.00 },
  { category:'Electricidad e Iluminación', concept:'Extractor de baño', unit:'ud', price:110.00 },
  { category:'Electricidad e Iluminación', concept:'Canaleta plástica para cables', unit:'ml', price:12.00 },
  { category:'Electricidad e Iluminación', concept:'Sensor de movimiento', unit:'ud', price:65.00 },
  { category:'Electricidad e Iluminación', concept:'Acometida general monofásica', unit:'ml', price:40.00 },
  { category:'Electricidad e Iluminación', concept:'Caja de registro (colocación)', unit:'ud', price:25.00 },
  // Baños y Fontanería
  { category:'Baños y Fontanería', concept:'Desmontaje de sanitarios viejos', unit:'ud', price:45.00 },
  { category:'Baños y Fontanería', concept:'Cambio de bañera por plato ducha (obra)', unit:'ud', price:750.00 },
  { category:'Baños y Fontanería', concept:'Instalación de inodoro (estándar)', unit:'ud', price:95.00 },
  { category:'Baños y Fontanería', concept:'Inodoro suspendido (con cisterna empotrada)', unit:'ud', price:320.00 },
  { category:'Baños y Fontanería', concept:'Grifería de lavabo (montaje)', unit:'ud', price:45.00 },
  { category:'Baños y Fontanería', concept:'Columna de ducha termostática', unit:'ud', price:180.00 },
  { category:'Baños y Fontanería', concept:'Mueble de baño y espejo (montaje)', unit:'ud', price:120.00 },
  { category:'Baños y Fontanería', concept:'Punto de agua (tubería multicapa)', unit:'ud', price:140.00 },
  { category:'Baños y Fontanería', concept:'Desagüe de PVC (hasta 50mm)', unit:'ml', price:35.00 },
  { category:'Baños y Fontanería', concept:'Sustitución de bajante comunitaria', unit:'ml', price:120.00 },
  { category:'Baños y Fontanería', concept:'Mampara de ducha (instalación)', unit:'ud', price:110.00 },
  { category:'Baños y Fontanería', concept:'Bidet (suministro e instalación)', unit:'ud', price:180.00 },
  { category:'Baños y Fontanería', concept:'Instalación de termo eléctrico 80L', unit:'ud', price:240.00 },
  { category:'Baños y Fontanería', concept:'Llave de escuadra (cambio)', unit:'ud', price:20.00 },
  { category:'Baños y Fontanería', concept:'Bote sifónico (colocación)', unit:'ud', price:65.00 },
  { category:'Baños y Fontanería', concept:'Radiador toallero (conexión)', unit:'ud', price:95.00 },
  { category:'Baños y Fontanería', concept:'Tratamiento de silicona en sanitarios', unit:'m', price:12.00 },
  { category:'Baños y Fontanería', concept:'Grupo de presión para vivienda', unit:'ud', price:450.00 },
  { category:'Baños y Fontanería', concept:'Fregadero de cocina (montaje)', unit:'ud', price:75.00 },
  { category:'Baños y Fontanería', concept:'Ducha higiénica junto inodoro', unit:'ud', price:130.00 },
  // Suelos y Pavimentos
  { category:'Suelos y Pavimentos', concept:'Laminado AC5 (incluye manta)', unit:'m2', price:32.00 },
  { category:'Suelos y Pavimentos', concept:'Suelo porcelánico (mano de obra)', unit:'m2', price:28.00 },
  { category:'Suelos y Pavimentos', concept:'Rodapié de madera lacado blanco', unit:'ml', price:10.50 },
  { category:'Suelos y Pavimentos', concept:'Rodapié cerámico (mano de obra)', unit:'ml', price:8.00 },
  { category:'Suelos y Pavimentos', concept:'Nivelación de suelo con mortero autonivelante', unit:'m2', price:14.00 },
  { category:'Suelos y Pavimentos', concept:'Suelo de vinilo click', unit:'m2', price:38.00 },
  { category:'Suelos y Pavimentos', concept:'Pulido y abrillantado de mármol', unit:'m2', price:18.00 },
  { category:'Suelos y Pavimentos', concept:'Acuchillado y barnizado de parquet', unit:'m2', price:26.00 },
  { category:'Suelos y Pavimentos', concept:'Microcemento en suelos (capas completas)', unit:'m2', price:75.00 },
  { category:'Suelos y Pavimentos', concept:'Césped artificial (suministro e inst.)', unit:'m2', price:42.00 },
  { category:'Suelos y Pavimentos', concept:'Tarifa de exterior de madera técnica', unit:'m2', price:85.00 },
  { category:'Suelos y Pavimentos', concept:'Baldosa hidráulica (colocación)', unit:'m2', price:45.00 },
  { category:'Suelos y Pavimentos', concept:'Alfombra de piedra/resina', unit:'m2', price:60.00 },
  { category:'Suelos y Pavimentos', concept:'Perfil de transición/pletina', unit:'ml', price:9.00 },
  { category:'Suelos y Pavimentos', concept:'Limpieza previa y desengrasado', unit:'m2', price:3.50 },
  { category:'Suelos y Pavimentos', concept:'Moqueta ferial (colocación)', unit:'m2', price:12.00 },
  { category:'Suelos y Pavimentos', concept:'Zócalo de acero inoxidable', unit:'ml', price:24.00 },
  { category:'Suelos y Pavimentos', concept:'Reparación de lamas de parquet', unit:'ud', price:40.00 },
  { category:'Suelos y Pavimentos', concept:'Frisado de peldaños (mano de obra)', unit:'ud', price:35.00 },
  { category:'Suelos y Pavimentos', concept:'Pavimento continuo de resina PU', unit:'m2', price:55.00 },
  // Tejados y Cubiertas
  { category:'Tejados y Cubiertas', concept:'Limpieza de canalones', unit:'ml', price:15.00 },
  { category:'Tejados y Cubiertas', concept:'Sustitución de teja cerámica rota', unit:'ud', price:12.00 },
  { category:'Tejados y Cubiertas', concept:'Impermeabilización con tela asfáltica', unit:'m2', price:28.00 },
  { category:'Tejados y Cubiertas', concept:'Cubierta de panel sándwich', unit:'m2', price:65.00 },
  { category:'Tejados y Cubiertas', concept:'Reparación de cumbrera', unit:'ml', price:45.00 },
  { category:'Tejados y Cubiertas', concept:'Aislamiento térmico bajo cubierta (lana roca)', unit:'m2', price:18.00 },
  { category:'Tejados y Cubiertas', concept:'Instalación de ventana tipo Velux', unit:'ud', price:420.00 },
  { category:'Tejados y Cubiertas', concept:'Tratamiento hidrófugo de tejas', unit:'m2', price:14.00 },
  { category:'Tejados y Cubiertas', concept:'Bajante exterior de aluminio/PVC', unit:'ml', price:38.00 },
  { category:'Tejados y Cubiertas', concept:'Cubierta de zinc (mano de obra)', unit:'m2', price:95.00 },
  { category:'Tejados y Cubiertas', concept:'Repaso de encuentros con chimeneas', unit:'ud', price:120.00 },
  { category:'Tejados y Cubiertas', concept:'Pintura clorocaucho con fibra de vidrio', unit:'m2', price:22.00 },
  { category:'Tejados y Cubiertas', concept:'Desmontaje de amianto (empresa autorizada)', unit:'m2', price:45.00 },
  { category:'Tejados y Cubiertas', concept:'Instalación de sombrerete de chimenea', unit:'ud', price:85.00 },
  { category:'Tejados y Cubiertas', concept:'Canalón de zinc (instalación)', unit:'ml', price:55.00 },
  { category:'Tejados y Cubiertas', concept:'Revestimiento de aleros', unit:'ml', price:30.00 },
  { category:'Tejados y Cubiertas', concept:'Limpieza de bajantes con manguera', unit:'ud', price:60.00 },
  { category:'Tejados y Cubiertas', concept:'Reparación de limahoya', unit:'ml', price:65.00 },
  { category:'Tejados y Cubiertas', concept:'Instalación de tela de protección antipájaros', unit:'ml', price:14.00 },
  { category:'Tejados y Cubiertas', concept:'Cubierta plana transitable (baldosín)', unit:'m2', price:55.00 },
  // Albañilería y Tabiquería
  { category:'Albañilería y Tabiquería', concept:'Tabique de ladrillo hueco doble (7cm)', unit:'m2', price:35.00 },
  { category:'Albañilería y Tabiquería', concept:'Tabique de pladur simple (70/48)', unit:'m2', price:28.00 },
  { category:'Albañilería y Tabiquería', concept:'Tabique de pladur doble placa (70/48)', unit:'m2', price:42.00 },
  { category:'Albañilería y Tabiquería', concept:'Enfoscado de cemento en paredes', unit:'m2', price:14.00 },
  { category:'Albañilería y Tabiquería', concept:'Guarnecido y enlucido de yeso', unit:'m2', price:12.00 },
  { category:'Albañilería y Tabiquería', concept:'Rozas para instalaciones', unit:'ml', price:8.00 },
  { category:'Albañilería y Tabiquería', concept:'Recibido de marcos y cercos', unit:'ud', price:25.00 },
  { category:'Albañilería y Tabiquería', concept:'Formación de peldaños de ladrillo', unit:'ud', price:45.00 },
  { category:'Albañilería y Tabiquería', concept:'Apertura de hueco en muro (hasta 1m)', unit:'ud', price:280.00 },
  { category:'Albañilería y Tabiquería', concept:'Cerramiento de hueco con ladrillo', unit:'m2', price:55.00 },
  { category:'Albañilería y Tabiquería', concept:'Falso techo de pladur (simple, pintura incl.)', unit:'m2', price:32.00 },
  { category:'Albañilería y Tabiquería', concept:'Falso techo de escayola lisa', unit:'m2', price:22.00 },
  { category:'Albañilería y Tabiquería', concept:'Revestimiento de piedra natural', unit:'m2', price:65.00 },
  { category:'Albañilería y Tabiquería', concept:'Impermeabilización de terraza con lámina', unit:'m2', price:38.00 },
  { category:'Albañilería y Tabiquería', concept:'Cata de reconocimiento en pared/suelo', unit:'ud', price:60.00 },
  { category:'Albañilería y Tabiquería', concept:'Vierteaguas de piedra artificial', unit:'ml', price:28.00 },
  { category:'Albañilería y Tabiquería', concept:'Sellado de juntas de dilatación', unit:'ml', price:6.00 },
  { category:'Albañilería y Tabiquería', concept:'Regatas y tapado con mortero', unit:'ml', price:9.00 },
  { category:'Albañilería y Tabiquería', concept:'Microcemento en paredes (capas completas)', unit:'m2', price:85.00 },
  { category:'Albañilería y Tabiquería', concept:'Trasdosado autoportante en medianera', unit:'m2', price:36.00 },
  // Carpintería y Puertas
  { category:'Carpintería y Puertas', concept:'Puerta de paso interior (block + montaje)', unit:'ud', price:180.00 },
  { category:'Carpintería y Puertas', concept:'Puerta blindada de seguridad (montaje)', unit:'ud', price:350.00 },
  { category:'Carpintería y Puertas', concept:'Ventana de aluminio corredera (montaje)', unit:'ud', price:280.00 },
  { category:'Carpintería y Puertas', concept:'Persiana de aluminio lama 40 (motorizable)', unit:'m2', price:95.00 },
  { category:'Carpintería y Puertas', concept:'Armario empotrado puertas correderas', unit:'m2', price:220.00 },
  { category:'Carpintería y Puertas', concept:'Puerta corredera de madera (obra)', unit:'ud', price:320.00 },
  { category:'Carpintería y Puertas', concept:'Barandilla de madera maciza (montaje)', unit:'ml', price:85.00 },
  { category:'Carpintería y Puertas', concept:'Mosquitera enrollable (montaje)', unit:'ud', price:95.00 },
  { category:'Carpintería y Puertas', concept:'Cerradura de seguridad (cambio)', unit:'ud', price:65.00 },
  { category:'Carpintería y Puertas', concept:'Zócalo de madera DM (colocación)', unit:'ml', price:8.00 },
  { category:'Carpintería y Puertas', concept:'Puerta de garaje seccional (montaje)', unit:'ud', price:1200.00 },
  { category:'Carpintería y Puertas', concept:'Montaje de muebles de cocina (IKEA/equiv.)', unit:'ud', price:35.00 },
  { category:'Carpintería y Puertas', concept:'Encimera de silestone (colocación/ml)', unit:'ml', price:65.00 },
  { category:'Carpintería y Puertas', concept:'Ventana de PVC doble acristalamiento', unit:'ud', price:320.00 },
  { category:'Carpintería y Puertas', concept:'Puerta de aluminio exterior (montaje)', unit:'ud', price:450.00 },
  // Demolición y Desescombro
  { category:'Demolición y Desescombro', concept:'Demolición de tabique de ladrillo', unit:'m2', price:18.00 },
  { category:'Demolición y Desescombro', concept:'Demolición de solado con medios manuales', unit:'m2', price:12.00 },
  { category:'Demolición y Desescombro', concept:'Levantado de alicatado', unit:'m2', price:10.00 },
  { category:'Demolición y Desescombro', concept:'Retirada y gestión de escombros', unit:'m3', price:45.00 },
  { category:'Demolición y Desescombro', concept:'Alquiler de contenedor de escombros', unit:'ud', price:180.00 },
  { category:'Demolición y Desescombro', concept:'Demolición de falso techo', unit:'m2', price:8.00 },
  { category:'Demolición y Desescombro', concept:'Desmontaje completo de cocina', unit:'global', price:150.00 },
  { category:'Demolición y Desescombro', concept:'Corte con radial en solado', unit:'ml', price:5.00 },
  { category:'Demolición y Desescombro', concept:'Desmontaje de escalera de madera', unit:'global', price:220.00 },
  { category:'Demolición y Desescombro', concept:'Levantado de carpintería exterior', unit:'ud', price:35.00 },
  { category:'Demolición y Desescombro', concept:'Limpieza final de obra', unit:'global', price:250.00 },
  // Climatización y Ventilación
  { category:'Climatización y Ventilación', concept:'Aire acondicionado split 1x1 2500W (inst.)', unit:'ud', price:380.00 },
  { category:'Climatización y Ventilación', concept:'Aire acondicionado 2x1 (inst.)', unit:'ud', price:650.00 },
  { category:'Climatización y Ventilación', concept:'Aire acondicionado 3x1 (inst.)', unit:'ud', price:950.00 },
  { category:'Climatización y Ventilación', concept:'Ventilación mecánica controlada (VMC)', unit:'ud', price:420.00 },
  { category:'Climatización y Ventilación', concept:'Bomba de calor aerotérmica (inst.)', unit:'ud', price:2800.00 },
  { category:'Climatización y Ventilación', concept:'Rejilla de ventilación (instalación)', unit:'ud', price:35.00 },
  { category:'Climatización y Ventilación', concept:'Tubo de cobre para climatización', unit:'ml', price:22.00 },
  { category:'Climatización y Ventilación', concept:'Aislamiento térmico de tuberías', unit:'ml', price:8.00 },
  { category:'Climatización y Ventilación', concept:'Termostato digital programable (inst.)', unit:'ud', price:85.00 },
  { category:'Climatización y Ventilación', concept:'Caldera de gas de condensación', unit:'ud', price:1800.00 },
  { category:'Climatización y Ventilación', concept:'Radiador de aluminio 10 elementos', unit:'ud', price:120.00 },
  { category:'Climatización y Ventilación', concept:'Suelo radiante (mano de obra, sin material)', unit:'m2', price:18.00 },
  // Azulejos y Alicatado
  { category:'Azulejos y Alicatado', concept:'Alicatado de baño (mano de obra)', unit:'m2', price:22.00 },
  { category:'Azulejos y Alicatado', concept:'Alicatado de cocina (mano de obra)', unit:'m2', price:20.00 },
  { category:'Azulejos y Alicatado', concept:'Gresite de piscina (colocación)', unit:'m2', price:55.00 },
  { category:'Azulejos y Alicatado', concept:'Rejuntado de azulejos/suelo', unit:'m2', price:8.00 },
  { category:'Azulejos y Alicatado', concept:'Cortado y colocación de piezas especiales', unit:'ud', price:3.50 },
  { category:'Azulejos y Alicatado', concept:'Mosaico de pasta de vidrio (colocación)', unit:'m2', price:35.00 },
  { category:'Azulejos y Alicatado', concept:'Baldosa rectificada gran formato (colocación)', unit:'m2', price:32.00 },
  { category:'Azulejos y Alicatado', concept:'Franja o cenefa decorativa', unit:'ml', price:12.00 },
  { category:'Azulejos y Alicatado', concept:'Plaqueta de ladrillo visto (fachada)', unit:'m2', price:48.00 },
  { category:'Azulejos y Alicatado', concept:'Despiece especial en diagonal', unit:'m2', price:28.00 },
  { category:'Azulejos y Alicatado', concept:'Preparación de superficie y tendido de cola', unit:'m2', price:6.00 },
];

const CATALOG_SEED_CATEGORIES = [
  'Pintura y Decoración','Electricidad e Iluminación','Baños y Fontanería',
  'Suelos y Pavimentos','Tejados y Cubiertas','Albañilería y Tabiquería',
  'Carpintería y Puertas','Demolición y Desescombro','Climatización y Ventilación',
  'Azulejos y Alicatado',
];
const CATALOG_SEED_UNITS = ['m2','ml','ud','m3','m','global','kg','litros'];

const App = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectSubTab, setProjectSubTab] = useState<'budget' | 'calendar'>('budget');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagingLists, setIsManagingLists] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad']);
  const [units, setUnits] = useState<string[]>(['m2', 'ml', 'ud', 'litros', 'm3', 'kg']);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [budgets, setBudgets] = useState<Record<number | string, BudgetItem[]>>({});
  const [invoices, setInvoices] = useState<Record<number | string, BudgetItem[]>>({});
  const [expenses, setExpenses] = useState<Record<number | string, ExpenseItem[]>>({});
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addingEventDate, setAddingEventDate] = useState<string | null>(null);
  const [isAddingBudgetItem, setIsAddingBudgetItem] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [tempCategory, setTempCategory] = useState('');
  const [tempUnit, setTempUnit] = useState('');
  const [isInvoiceVisible, setIsInvoiceVisible] = useState(false);
  const [isScanningCatalog, setIsScanningCatalog] = useState(false);
  const [catalogScanError, setCatalogScanError] = useState<string | null>(null);
  const [scannedCatalogPreview, setScannedCatalogPreview] = useState<Array<{concept:string;category:string;unit:string;price:number}> | null>(null);
  const [editingCatName, setEditingCatName] = useState<{old:string;val:string}|null>(null);
  const [editingUnitName, setEditingUnitName] = useState<{old:string;val:string}|null>(null);
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<BudgetItem | null>(null);
  const [editingExpenseItem, setEditingExpenseItem] = useState<ExpenseItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: any; type: string; label: string } | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSeedingCatalog, setIsSeedingCatalog] = useState(false);
  const [isConfirmingCatalog, setIsConfirmingCatalog] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<CompanyInfo>(DEFAULT_COMPANY);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true); // Still ready to show "Not Configured" state
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathSettings = 'settings/global';
    // Load Global Settings
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories) setCategories(data.categories);
        if (data.units) setUnits(data.units);
        if (data.companyInfo) setCompanyInfo(data.companyInfo);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, pathSettings));

    const pathCatalog = 'catalog';
    // Load Catalog
    const catalogUnsubscribe = onSnapshot(collection(db, 'catalog'), (snapshot) => {
      setCatalog(snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, firebaseId: doc.id, id: data.id || doc.id } as CatalogItem;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathCatalog));

    const pathProjects = 'projects';
    // Load Projects
    const projectsQuery = collection(db, 'projects');
    const projectsUnsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as Project));
      setProjects(projectsList);
      if (projectsList.length > 0 && (selectedProjectId === '' || !projectsList.map(p => p.firebaseId).includes(selectedProjectId))) {
        setSelectedProjectId(projectsList[0].firebaseId || '');
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathProjects));

    const pathCalendar = 'calendar_events';
    // Load Calendar Events
    const eventsUnsubscribe = onSnapshot(collection(db, 'calendar_events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as CalendarEvent)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathCalendar));

    return () => {
      settingsUnsubscribe();
      catalogUnsubscribe();
      projectsUnsubscribe();
      eventsUnsubscribe();
    };
  }, [user]);

  // Load project-specific data when selected project changes
  useEffect(() => {
    // CRITICAL: Don't listen for subcollections if no project is selected or if it's the initial "0"
    if (!user || !selectedProjectId) return;

    const projectIdStr = String(selectedProjectId);
    
    // Safety check: ensure project actually exists in projects list
    const projectExists = projects.some(p => p.firebaseId === selectedProjectId);
    if (!projectExists) return;

    const pathBudget = `projects/${projectIdStr}/budget_items`;
    // Budget items
    const budgetUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'budget_items'), (snapshot) => {
      setBudgets(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as BudgetItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathBudget));

    const pathInvoice = `projects/${projectIdStr}/invoice_items`;
    // Invoice items
    const invoiceUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'invoice_items'), (snapshot) => {
      setInvoices(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as BudgetItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathInvoice));

    const pathExpense = `projects/${projectIdStr}/expense_items`;
    // Expense items
    const expenseUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'expense_items'), (snapshot) => {
      setExpenses(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as ExpenseItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathExpense));

    return () => {
      budgetUnsubscribe();
      invoiceUnsubscribe();
      expenseUnsubscribe();
    };
  }, [user, selectedProjectId, projects]);

  const handleLogin = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      alert("Configuración de Firebase no detectada. Por favor, completa el proceso de configuración en el chat.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Error al entrar: " + (error.message || "Error desconocido"));
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  // --- HANDLERS ---
  const handleGenerateInvoice = async () => {
    const budgetItems = budgets[selectedProjectId] || [];
    if (budgetItems.length === 0) {
      alert("No hay partidas en el presupuesto activo para facturar.");
      return;
    }

    if (invoices[selectedProjectId] && invoices[selectedProjectId].length > 0) {
      if (!confirm("Ya existe una factura para este proyecto con cambios guardados. ¿Deseas SOBRESCRIBIRLA con los datos del presupuesto actual? Perderás los cambios específicos de facturación.")) {
        setActiveTab('billing');
        return;
      }
    }

    setIsGeneratingInvoice(true);
    try {
      const projectIdStr = String(selectedProjectId);
      const existingInvoices = invoices[selectedProjectId] || [];
      for (const item of existingInvoices) {
        if (item.firebaseId) {
          await deleteDoc(doc(db, 'projects', projectIdStr, 'invoice_items', item.firebaseId));
        }
      }

      for (const item of budgetItems) {
        await addDoc(collection(db, 'projects', projectIdStr, 'invoice_items'), {
          concept: item.concept,
          qty: item.qty,
          unit: item.unit,
          price: item.price,
          total: item.total
        });
      }
      setActiveTab('billing');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${selectedProjectId}/invoice_items`);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleUpdateInvoiceItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInvoiceItem || !editingInvoiceItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'invoice_items', editingInvoiceItem.firebaseId), {
        concept,
        qty,
        price,
        total: qty * price
      });
      setEditingInvoiceItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/invoice_items/${editingInvoiceItem.firebaseId}`);
    }
  };

  const handleUpdateExpenseItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpenseItem || !editingExpenseItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;
    const category = formData.get('category') as string;
    const date = formData.get('date') as string;
    const unit = formData.get('unit') as string;

    try {
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'expense_items', editingExpenseItem.firebaseId), {
        concept,
        qty,
        price,
        total: qty * price,
        category,
        date,
        unit
      });
      setEditingExpenseItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/expense_items/${editingExpenseItem.firebaseId}`);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;
    const data = {
      concept: formData.get('concept') as string,
      qty,
      price,
      total: qty * price,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      unit: formData.get('unit') as string,
      id: Date.now()
    };

    try {
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), data);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/expense_items`);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventData = {
      id: editingEvent?.id || Date.now(),
      projectId: editingEvent?.projectId || (addingEventDate ? selectedProjectId : (projects[0]?.firebaseId || '')),
      firebaseProjectId: String(selectedProjectId),
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      worker: formData.get('worker') as string,
      task: formData.get('task') as string,
      status: formData.get('status') as 'pendiente' | 'urgente'
    };

    try {
      if (editingEvent?.firebaseId) {
        await updateDoc(doc(db, 'calendar_events', editingEvent.firebaseId), eventData);
      } else {
        await addDoc(collection(db, 'calendar_events'), eventData);
      }
      setEditingEvent(null);
      setAddingEventDate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'calendar_events');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const eventFirebaseId = e.dataTransfer.getData('text/plain');
    if (!eventFirebaseId) return;

    const oldDate = events.find(ev => ev.firebaseId === eventFirebaseId)?.date;
    setEvents(prev => prev.map(ev => ev.firebaseId === eventFirebaseId ? { ...ev, date } : ev));
    try {
      await updateDoc(doc(db, 'calendar_events', eventFirebaseId), { date });
    } catch (error) {
      if (oldDate !== undefined) {
        setEvents(prev => prev.map(ev => ev.firebaseId === eventFirebaseId ? { ...ev, date: oldDate } : ev));
      }
      handleFirestoreError(error, OperationType.UPDATE, `calendar_events/${eventFirebaseId}`);
    }
  };

  const handleAddBudgetItem = async (catalogItemId: string, qty: number) => {
    const catalogItem = catalog.find(item => item.firebaseId === catalogItemId);
    if (!catalogItem) return;

    const newItem = {
      id: Date.now(),
      concept: catalogItem.concept,
      qty: qty,
      unit: catalogItem.unit,
      price: catalogItem.price,
      total: qty * catalogItem.price
    };

    try {
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'budget_items'), newItem);
      setIsAddingBudgetItem(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/budget_items`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { id, type } = deleteConfirmation;

    try {
      if (type === 'project') {
        const projectIdStr = String(id);
        await deleteDoc(doc(db, 'projects', projectIdStr));
        if (selectedProjectId === id) {
          const remainingProjects = projects.filter(p => p.firebaseId !== id);
          setSelectedProjectId(remainingProjects.length > 0 ? (remainingProjects[0].firebaseId || '') : '');
        }
      } else if (type === 'budget') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'budget_items', String(id)));
      } else if (type === 'invoice') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'invoice_items', String(id)));
      } else if (type === 'expense') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'expense_items', String(id)));
      } else if (type === 'event') {
        await deleteDoc(doc(db, 'calendar_events', String(id)));
      } else if (type === 'catalog') {
        await deleteDoc(doc(db, 'catalog', String(id)));
      } else if (type === 'category') {
        const newCats = categories.filter(c => c !== id);
        await setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true });
      } else if (type === 'unit') {
        const newUnits = units.filter(u => u !== id);
        await setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type}/${id}`);
    }

    setDeleteConfirmation(null);
  };

  const handleUpdateBudgetItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBudgetItem || !editingBudgetItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'budget_items', editingBudgetItem.firebaseId), {
        concept,
        qty,
        price,
        total: qty * price
      });
      setEditingBudgetItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/budget_items/${editingBudgetItem.firebaseId}`);
    }
  };

  const handleUpdateCatalogItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCatalogItem || !editingCatalogItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const unit = formData.get('unit') as string;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'catalog', editingCatalogItem.firebaseId), {
        concept,
        unit,
        price
      });
      setEditingCatalogItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `catalog/${editingCatalogItem.firebaseId}`);
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newItem = {
      category: formData.get('category') as string,
      concept: formData.get('concept') as string,
      unit: formData.get('unit') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      id: Date.now()
    };
    try {
      await addDoc(collection(db, 'catalog'), newItem);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    }
  };

  const handleCatalogScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsScanningCatalog(true);
    setCatalogScanError(null);
    try {
      const items = await scanDocument(file, ScanType.CATALOG);
      setScannedCatalogPreview(items.map((i: any) => ({
        concept: i.concept || '',
        category: i.category || categories[0] || '',
        unit: i.unit || units[0] || '',
        price: Number(i.price) || 0
      })));
    } catch (error) {
      console.error("Catalog Scan Error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        setCatalogScanError("Cuota de IA agotada. Has superado el límite gratuito de Gemini. Espera un momento o revisa tu plan en ai.google.dev.");
      } else {
        setCatalogScanError("Error al escanear. Verifica que el archivo sea una imagen o PDF legible.");
      }
    } finally {
      setIsScanningCatalog(false);
    }
  };

  const handleConfirmScannedCatalog = async () => {
    if (!scannedCatalogPreview) return;
    setIsConfirmingCatalog(true);
    try {
      for (const item of scannedCatalogPreview) {
        await addDoc(collection(db, 'catalog'), { ...item, id: Date.now() + Math.random() });
      }
      setScannedCatalogPreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    } finally {
      setIsConfirmingCatalog(false);
    }
  };

  const handleSeedCatalog = async () => {
    if (!isAdmin()) { alert("Solo el administrador puede realizar esta acción."); return; }
    if (!confirm(`¿Poblar el catálogo con ${CATALOG_SEED.length} partidas en ${CATALOG_SEED_CATEGORIES.length} categorías?\n\nSe añadirán a los items existentes (no se borrará nada).`)) return;
    setIsSeedingCatalog(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        categories: CATALOG_SEED_CATEGORIES,
        units: CATALOG_SEED_UNITS
      }, { merge: true });
      let count = 0;
      let errors = 0;
      for (const item of CATALOG_SEED) {
        try {
          await addDoc(collection(db, 'catalog'), { ...item, id: Date.now() + Math.random() });
          count++;
        } catch {
          errors++;
        }
      }
      if (errors > 0) {
        alert(`Catálogo poblado con ${count} partidas (${errors} fallaron). Revisa la conexión.`);
      } else {
        alert(`✓ Catálogo poblado: ${count} partidas en ${CATALOG_SEED_CATEGORIES.length} categorías.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    } finally {
      setIsSeedingCatalog(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!isAdmin()) {
      alert("Solo el administrador puede realizar esta acción.");
      return;
    }
    
    if (!confirm("¿ESTÁS SEGURO? Se eliminarán TODOS los proyectos, partidas, gastos y el catálogo de precios por completo. Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      // 1. Clear Catalog
      for (const item of catalog) {
        if (item.firebaseId) await deleteDoc(doc(db, 'catalog', item.firebaseId));
      }

      // 2. Clear Projects (and subcollections)
      for (const project of projects) {
        const projId = project.firebaseId || String(project.id);
        // Note: Subcollections need to be deleted manually if we want thorough cleaning
        // but for a "reset", deleting projects is the main part.
        // Usually you'd use a Cloud Function for recursive delete, 
        // but here we do a best effort from client.
        const budgetSnap = await getDocs(collection(db, 'projects', projId, 'budget_items'));
        for (const d of budgetSnap.docs) await deleteDoc(d.ref);
        
        const invoiceSnap = await getDocs(collection(db, 'projects', projId, 'invoice_items'));
        for (const d of invoiceSnap.docs) await deleteDoc(d.ref);

        const expenseSnap = await getDocs(collection(db, 'projects', projId, 'expense_items'));
        for (const d of expenseSnap.docs) await deleteDoc(d.ref);

        await deleteDoc(doc(db, 'projects', projId));
      }

      // 3. Clear Events
      for (const event of events) {
        if (event.firebaseId) await deleteDoc(doc(db, 'calendar_events', event.firebaseId));
      }

      // 4. Reset Settings
      await setDoc(doc(db, 'settings', 'global'), {
        categories: ['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad'],
        units: ['m2', 'ml', 'ud', 'litros', 'm3', 'kg']
      });

      alert("Base de datos reiniciada con éxito.");
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all');
    }
  };
  const saveNewCategory = async () => {
    if (!isFirebaseConfigured || !db) return;
    const trimmed = tempCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      const newCats = [...categories, trimmed];
      try {
        await setDoc(doc(db, 'settings', 'global'), { 
          categories: newCats,
          units: units.length > 0 ? units : ['m2', 'ml', 'ud', 'litros', 'm3', 'kg']
        }, { merge: true });
        setTempCategory('');
        setIsAddingCategory(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/global');
      }
    }
  };

  const saveNewUnit = async () => {
    if (!isFirebaseConfigured || !db) return;
    const trimmed = tempUnit.trim();
    if (trimmed && !units.includes(trimmed)) {
      const newUnits = [...units, trimmed];
      try {
        await setDoc(doc(db, 'settings', 'global'), { 
          categories: categories.length > 0 ? categories : ['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad'],
          units: newUnits 
        }, { merge: true });
        setTempUnit('');
        setIsAddingUnit(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/global');
      }
    }
  };

  const handleUpdateProjectStatus = async (projectId: string | number, status: 'En curso' | 'Pendiente' | 'Finalizado') => {
    try {
      const projectDoc = projects.find(p => p.firebaseId === projectId || p.id === projectId);
      if (projectDoc?.firebaseId) {
        await updateDoc(doc(db, 'projects', projectDoc.firebaseId), { status });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    // Pick next color not already used; fall back to cycling if all 8 are taken
    const usedColors = new Set(projects.map(p => p.color).filter(Boolean));
    const nextColor = PROJECT_COLORS.find(c => !usedColors.has(c)) || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const newProject = {
      id: Date.now(),
      name: formData.get('name') as string,
      clientName: formData.get('clientName') as string,
      clientCIF: formData.get('clientCIF') as string,
      clientAddress: formData.get('clientAddress') as string,
      clientEmail: formData.get('clientEmail') as string,
      clientPhone: formData.get('clientPhone') as string,
      status: 'Pendiente' as const,
      category: (formData.get('category') as string) || 'General',
      color: nextColor,
      ownerId: user.uid
    };
    try {
      await addDoc(collection(db, 'projects'), newProject);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const selectedProject = projects.find(p => p.firebaseId === selectedProjectId) || projects[0] || null;

  // Stable color per project: stored in Firestore; fallback uses project.id (stable timestamp) for old projects
  const projectColorOf = (p: Project) =>
    p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length];

  const activeColor = selectedProject ? projectColorOf(selectedProject) : PROJECT_COLORS[0];

  const getProjectColor = (projFirebaseId: string) => {
    const proj = projects.find(p => p.firebaseId === projFirebaseId || String(p.id) === projFirebaseId);
    return proj ? projectColorOf(proj) : PROJECT_COLORS[0];
  };

  // --- COMPONENTS ---

  const Sidebar = () => (
    <div className="w-64 bg-[#0F172A] h-screen text-white flex flex-col fixed left-0 top-0 z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
      {/* Logo */}
      <div className="p-6 pb-4 border-b border-slate-800 flex flex-col gap-1">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-white italic">
          <Hammer size={24} style={{color: activeColor}} /> ERKIALE<span style={{color: activeColor}}> S.L</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Gestión de Obras</p>
      </div>

      {/* Project selector — top */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Proyecto activo</p>
        <div className="relative rounded-2xl overflow-hidden" style={{boxShadow: `0 0 0 2px ${activeColor}50`}}>
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{background: activeColor}} />
          <select
            className="bg-slate-900 text-[11px] font-black w-full pl-4 pr-8 py-3.5 outline-none cursor-pointer appearance-none transition-colors"
            style={{color: activeColor}}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((p, i) => (
              <option key={p.firebaseId} value={p.firebaseId} className="bg-[#0F172A] text-white">{p.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{color: activeColor}}>
            <ChevronRight size={13} className="rotate-90" />
          </div>
        </div>
        {/* Color dots — one per project */}
        {projects.length > 1 && (
          <div className="flex gap-1.5 mt-2 px-1">
            {projects.map((p) => (
              <button
                key={p.firebaseId}
                title={p.name}
                onClick={() => setSelectedProjectId(p.firebaseId || '')}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  background: projectColorOf(p),
                  opacity: p.firebaseId === selectedProjectId ? 1 : 0.35,
                  transform: p.firebaseId === selectedProjectId ? 'scale(1.4)' : 'scale(1)'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 mt-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'projects', label: 'Proyectos', icon: Briefcase },
          { id: 'catalog', label: 'Catálogo Precios', icon: BookOpen },
          { id: 'budgets', label: 'Presupuesto Activo', icon: FileText },
          { id: 'global-calendar', label: 'Calendario Global', icon: CalendarIcon },
          { id: 'billing', label: 'Facturación', icon: Receipt },
          { id: 'expenses', label: 'Gastos', icon: Ticket },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 text-sm font-semibold group ${activeTab === item.id ? 'text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            style={activeTab === item.id ? {backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}50`} : {}}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
            {item.label}
          </button>
        ))}

        <div className="pt-8 mt-8 border-t border-slate-800 px-4">
          <div className="flex items-center gap-3 mb-6">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full border-2 border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center" style={{color: activeColor}}>
                <User size={20} />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-white truncate">{user.displayName || 'Usuario'}</p>
              <p className="text-[9px] font-bold text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
          {isAdmin() && (
            <>
              <button
                onClick={handleSeedCatalog}
                disabled={isSeedingCatalog}
                className="w-full mt-2 flex items-center gap-3 p-3 rounded-xl text-emerald-600 hover:text-white hover:bg-emerald-800/40 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookOpen size={16} /> {isSeedingCatalog ? 'Poblando...' : 'Poblar Catálogo'}
              </button>
              <button
                onClick={handleResetDatabase}
                className="w-full mt-1 flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-black uppercase tracking-widest"
              >
                <Database size={16} /> Reiniciar Datos
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );

  const ProjectsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {projects.map((project, idx) => {
        const projColor = projectColorOf(project);
        const isSelected = selectedProjectId === project.firebaseId;
        return (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          onClick={() => setSelectedProjectId(project.firebaseId || '')}
          className="group bg-white rounded-[2.5rem] border transition-all duration-500 p-8 flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:-translate-y-2"
          style={{
            borderColor: isSelected ? projColor : '#f1f5f9',
            boxShadow: isSelected ? `0 0 0 4px ${projColor}20, 0 20px 40px ${projColor}15` : undefined,
          }}
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div
                className="p-4 rounded-[1.5rem] transition-colors"
                style={{
                  backgroundColor: isSelected ? projColor : `${projColor}15`,
                  color: isSelected ? 'white' : projColor,
                }}
              >
                <Briefcase size={28} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <select
                  value={project.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value as any)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ring-1 outline-none cursor-pointer appearance-none text-center ${
                    project.status === 'En curso' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                    project.status === 'Pendiente' ? 'bg-slate-50 text-slate-600 ring-slate-100' :
                    'bg-slate-50 text-slate-400 ring-slate-100'
                  }`}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En curso">En curso</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmation({ id: project.firebaseId, type: 'project', label: project.name });
                  }}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <h3
              className="text-2xl font-black text-slate-900 mb-2 leading-tight transition-colors"
              style={isSelected ? {color: projColor} : {}}
            >
              {project.name}
            </h3>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-8">
              <User size={14} /> {project.clientName}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{background: projColor}} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{project.category}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProjectId(project.firebaseId || '');
                setActiveTab('budgets');
              }}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{color: projColor}}
            >
              Detalles <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
        );
      })}
    </div>
  );

  const CalendarWidget = ({ projectId = null }: { projectId?: string | null }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const filteredEvents = projectId
      ? events.filter(e => e.projectId === projectId)
      : events;

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 border border-slate-100/50"></div>);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter(e => e.date === dateStr);

      cells.push(
        <div 
          key={d} 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateStr)}
          onClick={() => setAddingEventDate(dateStr)}
          className="h-32 border border-slate-100 p-2 hover:bg-slate-50/60 transition-all relative group cursor-pointer"
        >
          <div className="flex justify-between items-center mb-1">
            {new Date().toISOString().split('T')[0] === dateStr ? (
              <span className="text-[10px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full" style={{background: activeColor}}>{d}</span>
            ) : (
              <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-600">{d}</span>
            )}
            <Plus size={10} className="text-slate-200 group-hover:text-slate-400" />
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayEvents.map(ev => {
              const evColor = getProjectColor(String(ev.projectId));
              return (
                <motion.div
                  key={ev.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', ev.id.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(ev);
                  }}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="text-[8px] p-1.5 rounded-lg truncate shadow-sm font-bold border-l-2 cursor-grab active:cursor-grabbing"
                  style={{
                    backgroundColor: `${evColor}18`,
                    color: evColor,
                    borderLeftColor: ev.status === 'urgente' ? '#EF4444' : evColor,
                  }}
                >
                  <div className="flex justify-between items-center mb-0.5 pointer-events-none">
                    <span className="truncate flex-1">{ev.worker}</span>
                    <span className="opacity-60 ml-1 shrink-0">{ev.time}</span>
                  </div>
                  <div className="opacity-90 truncate pointer-events-none">{ev.task}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b flex justify-between items-center bg-white">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{monthNames[month]} {year}</h3>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Planificación Operativa</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronLeft size={20}/></button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center bg-slate-50/50 border-b border-slate-100">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">{cells}</div>
      </div>
    );
  };

  const BudgetView = ({ project }: { project: Project }) => {
    if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
    const projectBudget = budgets[selectedProjectId] ?? [];
    const projectExpensesForBudget = expenses[selectedProjectId] ?? [];
    const totalPresupuesto = projectBudget.reduce((acc, curr) => acc + curr.total, 0);
    const totalGastos = projectExpensesForBudget.reduce((acc, curr) => acc + curr.total, 0);
    const margen = totalPresupuesto - totalGastos;
    const pctEjecucion = totalPresupuesto > 0 ? Math.min((totalGastos / totalPresupuesto) * 100, 100) : 0;
    const overBudget = totalGastos > totalPresupuesto;

    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
    const [addQty, setAddQty] = useState<number>(1);

    const filteredCatalog = React.useMemo(
      () => catalog.filter(i => i.category === selectedCategory),
      [catalog, selectedCategory]
    );

    React.useEffect(() => {
        setSelectedCatalogId(filteredCatalog.length > 0 ? (filteredCatalog[0].firebaseId || '') : '');
    }, [filteredCatalog]);

    return (
      <div className="space-y-8">
        {/* Financial summary: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Presupuesto */}
          <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign size={90} /></div>
            <div className="relative z-10">
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-2">Presupuesto</p>
              <p className="text-3xl font-black text-white tracking-tighter mb-1">{totalPresupuesto.toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Base imponible · IVA: {(totalPresupuesto * 0.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mt-1">Total c/IVA: {(totalPresupuesto * 1.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            </div>
          </div>

          {/* Gastos reales */}
          <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Receipt size={90} /></div>
            <div className="relative z-10">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Gastos Ejecutados</p>
              <p className={`text-3xl font-black tracking-tighter mb-1 ${overBudget ? 'text-rose-400' : 'text-white'}`}>{totalGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
              <div className="mt-3">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-1">
                  <span>Ejecución del presupuesto</span>
                  <span className={overBudget ? 'text-rose-400' : 'text-blue-400'}>{pctEjecucion.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
                    style={{ width: `${pctEjecucion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Margen */}
          <div className={`p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ${overBudget ? 'bg-rose-600 shadow-rose-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
            <div className="absolute top-0 right-0 p-6 opacity-10"><AlertCircle size={90} /></div>
            <div className="relative z-10">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${overBudget ? 'text-rose-100' : 'text-emerald-100'}`}>{overBudget ? 'Desviación (sobre presupuesto)' : 'Margen Disponible'}</p>
              <p className="text-3xl font-black text-white tracking-tighter mb-1">
                {overBudget ? '-' : '+'}{Math.abs(margen).toLocaleString('es-ES', {minimumFractionDigits:2})} €
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${overBudget ? 'text-rose-200' : 'text-emerald-200'}`}>
                {overBudget
                  ? `Excedido en ${(totalGastos - totalPresupuesto).toLocaleString('es-ES', {minimumFractionDigits:2})} €`
                  : `Quedan ${(totalPresupuesto > 0 ? (100 - pctEjecucion).toFixed(1) : '0')}% del presupuesto`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Desglose de Partidas</h4>
            {!isAddingBudgetItem ? (
              <button 
                onClick={() => setIsAddingBudgetItem(true)}
                className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-widest"
              >
                <Plus size={14} /> Añadir Partida
              </button>
            ) : (
              <button 
                onClick={() => setIsAddingBudgetItem(false)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors uppercase tracking-widest"
              >
                <X size={14} /> Cancelar
              </button>
            )}
          </div>

          <AnimatePresence>
            {isAddingBudgetItem && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-blue-50/30 border-b border-blue-100"
              >
                <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                   <div className="md:col-span-3 space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">1. Categoría</label>
                     <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px] appearance-none"
                     >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                   </div>
                   <div className="md:col-span-4 space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">2. Concepto</label>
                     <select 
                        value={selectedCatalogId}
                        onChange={(e) => setSelectedCatalogId(e.target.value)}
                        disabled={filteredCatalog.length === 0}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px] appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                     >
                        {filteredCatalog.length > 0 ? (
                            filteredCatalog.map(item => (
                                <option key={item.firebaseId} value={item.firebaseId}>{item.concept} ({item.price}€/{item.unit})</option>
                            ))
                        ) : (
                            <option>No hay items en esta categoría</option>
                        )}
                     </select>
                   </div>
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">3. Cantidad</label>
                     <input 
                        type="number" 
                        value={addQty}
                        onChange={(e) => setAddQty(parseFloat(e.target.value) || 1)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px]"
                     />
                   </div>
                   <div className="md:col-span-3">
                     <button 
                        onClick={() => handleAddBudgetItem(selectedCatalogId, addQty)}
                        disabled={!selectedCatalogId}
                        className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 h-[56px] disabled:bg-slate-300 disabled:shadow-none"
                     >
                       Añadir Partida
                     </button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto / Partida</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Ud.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {projectBudget.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <FileText size={48} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay partidas registradas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                projectBudget.map((item, idx) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-default group"
                  >
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Código: #{item.id}</span>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-slate-600 font-bold text-center">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.qty} {item.unit}</span>
                    </td>
                    <td className="p-6 text-sm text-slate-500 font-medium text-right">{item.price.toFixed(2)}€</td>
                    <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
                    <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingBudgetItem(item); }}
                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors bg-blue-50/50"
                            title="Editar Partida"
                          >
                            <Hammer size={14}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: item.firebaseId, type: 'budget', label: item.concept }); }}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors bg-rose-50/50"
                            title="Eliminar Partida"
                          >
                            <X size={14}/>
                          </button>
                        </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
             <button 
               onClick={() => setIsInvoiceVisible(true)}
               className="px-8 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all shadow-sm"
             >
               Vista Previa Presupuesto
             </button>
             <button
               onClick={handleGenerateInvoice}
               disabled={isGeneratingInvoice}
               className="px-8 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isGeneratingInvoice ? 'Generando...' : 'Pasar a Facturación'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const BillingView = ({ project }: { project: Project }) => {
    if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
    const invoiceItems = invoices[selectedProjectId] ?? [];
    const total = invoiceItems.reduce((acc, curr) => acc + curr.total, 0);

    return (
      <div className="space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Partidas a Facturar</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Importado de Presupuesto Activo</p>
            </div>
            <div className="text-right">
               <p className="text-[11px] font-black text-slate-400 uppercase">Total Base Imponible</p>
               <p className="text-xl font-black text-blue-600">{total.toLocaleString()} €</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Ud.</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Receipt size={48} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay datos importados para facturar</p>
                      <button onClick={() => setActiveTab('budgets')} className="text-blue-500 text-[10px] font-black uppercase underline">Ir a Presupuestos</button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoiceItems.map((item, idx) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-50 hover:bg-emerald-50/10 transition-all cursor-default group"
                  >
                    <td className="p-6">
                      <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                    </td>
                    <td className="p-6 text-sm text-slate-600 font-bold text-center">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.qty} {item.unit}</span>
                    </td>
                    <td className="p-6 text-sm text-slate-500 font-medium text-right">{item.price.toFixed(2)}€</td>
                    <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
                    <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingInvoiceItem(item)}
                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors bg-blue-50/50"
                          >
                            <Hammer size={14}/>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmation({ id: item.firebaseId, type: 'invoice', label: item.concept })}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors bg-rose-50/50"
                          >
                            <X size={14}/>
                          </button>
                        </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             <button 
               onClick={() => setIsInvoiceVisible(true)}
               disabled={invoiceItems.length === 0}
               className="px-8 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl disabled:bg-slate-300"
             >
               Vista Previa & PDF
             </button>
          </div>
        </div>
      </div>
    );
  };

  const ExpensesView = ({ project }: { project: Project }) => {
    if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado. Crea uno para empezar.</div>;
    const projectExpenses = expenses[selectedProjectId] ?? [];
    const totalExpenses = projectExpenses.reduce((acc, curr) => acc + curr.total, 0);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsScanning(true);
      setScanError(null);

      try {
        const extractedItems = await scanDocument(file, ScanType.EXPENSE);
        let saved = 0;
        for (const item of extractedItems) {
          try {
            await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), {
              ...item,
              id: Date.now() + Math.random()
            });
            saved++;
          } catch {
            // continue saving remaining items
          }
        }
        if (saved === 0 && extractedItems.length > 0) {
          setScanError("No se pudieron guardar los gastos. Comprueba tu conexión.");
        }
      } catch (error) {
        console.error("AI Scan Error:", error);
        setScanError("No se pudo analizar la factura. Inténtalo de nuevo o cárgala manualmente.");
      } finally {
        setIsScanning(false);
      }
    };

    const handleAddManualExpense = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);
      const qty = parseFloat(formData.get('qty') as string) || 0;
      const price = parseFloat(formData.get('price') as string) || 0;

      const newItem = {
        id: Date.now(),
        concept: formData.get('concept') as string,
        qty,
        unit: formData.get('unit') as string,
        price,
        total: qty * price,
        date: formData.get('date') as string,
        category: formData.get('category') as string
      };

      try {
        await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), newItem);
        form.reset();
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/expense_items`);
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gastos Registrados</h4>
              <div className="flex gap-2">
                <label className={`flex items-center gap-2 text-[10px] font-black cursor-pointer px-4 py-2 rounded-xl transition-all uppercase tracking-widest border border-blue-100 ${isScanning ? 'bg-blue-100' : 'bg-blue-50 text-blue-600'}`}>
                  {isScanning ? "Procesando..." : <><Camera size={14} /> Scanner IA / Foto</>}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    capture="environment"
                    onChange={handleFileUpload} 
                    disabled={isScanning} 
                  />
                </label>
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] uppercase text-slate-400">
                  <th className="p-6">Fecha/Concepto</th>
                  <th className="p-6">Categoría</th>
                  <th className="p-6 text-center">Cant.</th>
                  <th className="p-6 text-right">Total</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {projectExpenses.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No hay gastos registrados</td></tr>
                ) : (
                  projectExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td className="p-6">
                        <div className="font-black text-slate-300 text-[10px] mb-1">{exp.date}</div>
                        <div className="font-bold text-slate-800">{exp.concept}</div>
                      </td>
                      <td className="p-6 uppercase text-[10px] font-black text-slate-500">{exp.category}</td>
                      <td className="p-6 text-center font-bold text-slate-600">{exp.qty} {exp.unit}</td>
                      <td className="p-6 text-right font-black text-slate-900">{exp.total.toFixed(2)} €</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => setEditingExpenseItem(exp)}
                             className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                           >
                             <Hammer size={14} />
                           </button>
                           <button 
                             onClick={() => setDeleteConfirmation({ id: exp.firebaseId, type: 'expense', label: exp.concept })} 
                             className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                           >
                             <X size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl self-start sticky top-12">
          <h4 className="text-sm font-black uppercase tracking-widest mb-6 px-1">Registrar Nuevo Gasto</h4>
          <form onSubmit={handleAddManualExpense} className="space-y-4">
            <input name="concept" placeholder="Concepto" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            <div className="grid grid-cols-2 gap-4">
              <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none">
                {expenseCategories.map(c => <option key={c}>{c}</option>)}
              </select>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input name="qty" placeholder="Cant." type="number" step="0.01" min="0.01" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              <input name="unit" placeholder="Ud." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              <input name="price" placeholder="€/Ud." type="number" step="0.01" min="0" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Añadir Gasto</button>
          </form>
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="p-6 bg-white rounded-full shadow-xl shadow-blue-100 border border-slate-100">
            <Hammer className="text-blue-600 animate-pulse" size={48} />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Cargando ERKIALE...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/40 blur-[120px] rounded-full -ml-48 -mb-48"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-12 rounded-[3.5rem] shadow-2xl relative z-10 text-center"
        >
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-blue-50 rounded-[2.5rem] text-blue-600">
              <Key size={48} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight italic">ERKIALE<span className="text-blue-600"> S.L</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-12">Sistema de Gestión Industrial</p>
          
          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:translate-y-[-2px] transition-all"
          >
            <LogIn size={20} /> Entrar con Google
          </button>
          
          <p className="mt-8 text-slate-400 text-[10px] font-medium leading-relaxed">
            Acceso restringido para personal autorizado de ERKIALE. Para soporte técnico contacte con administración.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 selection:text-blue-700 flex">
      {/* MODAL: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmation(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="p-4 bg-rose-50 text-rose-500 rounded-full">
                  <AlertCircle size={48} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">¿Confirmar eliminación?</h3>
                  <p className="text-slate-500 text-sm font-medium italic">"{deleteConfirmation.label}"</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setDeleteConfirmation(null)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">Eliminar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT BUDGET ITEM */}
      <AnimatePresence>
        {editingBudgetItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBudgetItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Partida</h3>
                  <button onClick={() => setEditingBudgetItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateBudgetItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingBudgetItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad ({editingBudgetItem.unit})</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingBudgetItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingBudgetItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-2">Guardar Cambios</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD/EDIT CALENDAR EVENT */}
      <AnimatePresence>
        {(addingEventDate || editingEvent) && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">{editingEvent ? 'Editar Evento' : 'Añadir Evento'}</h3>
                  <button onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                       <input name="date" type="date" defaultValue={editingEvent?.date || addingEventDate || ''} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hora</label>
                         <input name="time" type="time" defaultValue={editingEvent?.time || '08:00'} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridad</label>
                         <select name="status" defaultValue={editingEvent?.status || 'pendiente'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                            <option value="pendiente">Pendiente</option>
                            <option value="urgente">Urgente</option>
                         </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Responsable / Operario</label>
                       <input name="worker" defaultValue={editingEvent?.worker || ''} placeholder="Ej: Pintor, Fontanero..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tarea / Descripción</label>
                       <textarea name="task" defaultValue={editingEvent?.task || ''} placeholder="Describe la tarea..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all min-h-[100px]" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    {editingEvent && (
                      <button 
                        type="button" 
                        onClick={() => { setDeleteConfirmation({ id: editingEvent.firebaseId, type: 'event', label: editingEvent.task }); setEditingEvent(null); }}
                        className="flex-1 border border-rose-200 text-rose-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all"
                      >
                        Eliminar
                      </button>
                    )}
                    <button type="submit" className="flex-[2] bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                      {editingEvent ? 'Guardar Cambios' : 'Añadir al Calendario'}
                    </button>
                  </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT EXPENSE ITEM */}
      <AnimatePresence>
        {editingExpenseItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingExpenseItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Gasto</h3>
                  <button onClick={() => setEditingExpenseItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateExpenseItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingExpenseItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                       <select name="category" defaultValue={editingExpenseItem.category} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                         {expenseCategories.map(c => <option key={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                       <input name="date" type="date" defaultValue={editingExpenseItem.date} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cant.</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingExpenseItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ud.</label>
                       <input name="unit" defaultValue={editingExpenseItem.unit} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio €/u</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingExpenseItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 mt-2">Guardar Cambios</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT INVOICE ITEM */}
      <AnimatePresence>
        {editingInvoiceItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingInvoiceItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Partida Factura</h3>
                  <button onClick={() => setEditingInvoiceItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateInvoiceItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingInvoiceItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad ({editingInvoiceItem.unit})</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingInvoiceItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingInvoiceItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 mt-2">Guardar Cambios Factura</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT CATALOG ITEM */}
      <AnimatePresence>
        {editingCatalogItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCatalogItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Catálogo</h3>
                  <button onClick={() => setEditingCatalogItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateCatalogItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingCatalogItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
                       <select name="unit" defaultValue={editingCatalogItem.unit} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingCatalogItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-2">Actualizar Maestro</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SCANNER CATALOG PREVIEW */}
      <AnimatePresence>
        {scannedCatalogPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revisar Items Escaneados</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{scannedCatalogPreview.length} ítems detectados — edita antes de guardar</p>
                </div>
                <button onClick={() => setScannedCatalogPreview(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"><X size={18}/></button>
              </div>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad</th>
                      <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio €</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {scannedCatalogPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <input value={item.concept} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, concept: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"/>
                        </td>
                        <td className="p-3">
                          <select value={item.category} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, category: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            {!categories.includes(item.category) && item.category && <option value={item.category}>{item.category} (nueva)</option>}
                          </select>
                        </td>
                        <td className="p-3">
                          <select value={item.unit} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, unit: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                            {!units.includes(item.unit) && item.unit && <option value={item.unit}>{item.unit} (nueva)</option>}
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="number" value={item.price} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, price: parseFloat(e.target.value)||0} : it))}
                            className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-right"/>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => setScannedCatalogPreview(prev => prev!.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><X size={14}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
                <button onClick={() => setScannedCatalogPreview(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button onClick={handleConfirmScannedCatalog} disabled={scannedCatalogPreview.length === 0 || isConfirmingCatalog}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300 disabled:cursor-not-allowed">
                  {isConfirmingCatalog ? 'Guardando...' : `Guardar ${scannedCatalogPreview.length} ítem${scannedCatalogPreview.length !== 1 ? 's' : ''} en Catálogo`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: INVOICE VIEW */}
      <AnimatePresence>
        {isInvoiceVisible && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-[#0F172A]/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white w-full max-w-4xl min-h-screen md:min-h-[auto] md:rounded-[2.5rem] shadow-2xl relative">
              <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur z-20 print:hidden md:rounded-t-[2.5rem]">
                <h3 className="text-sm font-black uppercase tracking-widest">Vista Previa de Factura</h3>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const content = document.getElementById('invoice-content');
                    if (!content) return;
                    const pw = window.open('', '_blank', 'width=900,height=700');
                    if (!pw) return;
                    const pdoc = pw.document;
                    pdoc.open();
                    pdoc.write('<!DOCTYPE html>');
                    pdoc.close();
                    pdoc.documentElement.lang = 'es';
                    const head = pdoc.head;
                    const meta = pdoc.createElement('meta'); meta.setAttribute('charset', 'UTF-8'); head.appendChild(meta);
                    const title = pdoc.createElement('title'); title.textContent = 'Erkiale'; head.appendChild(title);
                    const tw = pdoc.createElement('script'); tw.src = 'https://cdn.tailwindcss.com'; head.appendChild(tw);
                    const style = pdoc.createElement('style'); style.textContent = '@page{size:A4 portrait;margin:12mm 14mm;}body{font-family:sans-serif;background:white;}'; head.appendChild(style);
                    pdoc.body.appendChild(content.cloneNode(true));
                    const trigger = pdoc.createElement('script');
                    trigger.textContent = 'window.onload=function(){setTimeout(function(){window.print();},1200);};';
                    pdoc.body.appendChild(trigger);
                  }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100">
                    <FileText size={14}/> Imprimir / PDF
                  </button>
                  <button onClick={() => setIsInvoiceVisible(false)} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
                    <X size={20}/>
                  </button>
                </div>
              </div>
              
              {(() => {
                const isInvoice = activeTab === 'billing';
                const docItems = (isInvoice ? invoices : budgets)[selectedProjectId] || [];
                const baseImponible = docItems.reduce((acc, curr) => acc + curr.total, 0);
                const iva = baseImponible * 0.21;
                const total = baseImponible * 1.21;
                const docYear = new Date().getFullYear();
                const docNum = String(selectedProject?.id || 0).slice(-4);
                const docDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                <div id="invoice-content" className="p-12 text-slate-900 bg-white min-h-[29.7cm] font-sans">

                  {/* Header: Logo + Company */}
                  <div className="flex justify-between items-start mb-8">
                    {/* EH Logo SVG - recreated from corporate identity */}
                    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" style={{width:'112px',height:'80px',display:'block'}}>
                      {/* Grey left panel */}
                      <rect x="12" y="6" width="82" height="128" fill="#cccccc"/>
                      {/* Navy blue right panel */}
                      <rect x="94" y="6" width="94" height="128" fill="#1e3a8a"/>

                      {/* E letter — left panel, white fill with dark stroke (outline effect) */}
                      {/* Vertical bar */}
                      <rect x="18" y="18" width="13" height="104" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Top horizontal */}
                      <rect x="18" y="18" width="58" height="13" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Middle horizontal (shorter) */}
                      <rect x="18" y="62" width="44" height="11" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Bottom horizontal */}
                      <rect x="18" y="109" width="58" height="13" fill="white" stroke="#1a1a1a" strokeWidth="1"/>

                      {/* H letter — right panel, white on blue */}
                      {/* Left vertical */}
                      <rect x="104" y="18" width="13" height="104" fill="white"/>
                      {/* Right vertical */}
                      <rect x="165" y="18" width="13" height="104" fill="white"/>
                      {/* Crossbar */}
                      <rect x="104" y="62" width="74" height="11" fill="white"/>

                      {/* Corner brackets — outer decorative frame */}
                      <polyline points="2,22 2,2 22,2" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="2,118 2,138 22,138" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="198,22 198,2 178,2" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="198,118 198,138 178,138" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                    </svg>
                    <div className="text-right text-[11px] leading-relaxed text-slate-700">
                      <p className="text-sm font-bold text-slate-900 mb-0.5">{companyInfo.name}</p>
                      {companyInfo.cif && <p>{companyInfo.cif}</p>}
                      {companyInfo.address && <p>{companyInfo.address}</p>}
                      {companyInfo.city && <p>{companyInfo.city}</p>}
                      {companyInfo.phone && <p>Telf. {companyInfo.phone}</p>}
                      {companyInfo.email && <p>{companyInfo.email}</p>}
                    </div>
                  </div>

                  {/* Thin separator */}
                  <div className="border-t border-slate-300 mb-8" />

                  {/* Cliente + Factura/Presupuesto */}
                  <div className="grid grid-cols-2 gap-12 mb-8">
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3 uppercase">Cliente</p>
                      <p className="text-[12px] font-black text-slate-900 uppercase mb-1">{selectedProject?.clientName || '—'}</p>
                      <div className="text-[11px] leading-snug text-slate-700 space-y-0.5">
                        <p>{selectedProject?.clientCIF || ''}</p>
                        <p>{selectedProject?.clientAddress || ''}</p>
                        {selectedProject?.clientEmail && <p className="lowercase">{selectedProject.clientEmail}</p>}
                        {selectedProject?.clientPhone && <p>{selectedProject.clientPhone}</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3 uppercase">{isInvoice ? 'Factura' : 'Presupuesto'}</p>
                      <table className="text-[11px] w-full">
                        <tbody>
                          <tr>
                            <td className="text-slate-600 py-0.5 pr-4">Nº de {isInvoice ? 'factura' : 'presupuesto'}</td>
                            <td className="font-bold text-right">{docYear}/{docNum}</td>
                          </tr>
                          <tr>
                            <td className="text-slate-600 py-0.5 pr-4">Fecha {isInvoice ? 'factura' : 'presupuesto'}</td>
                            <td className="font-bold text-right">{docDate}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Blue separator line */}
                  <div className="h-0.5 bg-blue-500 mb-0" />

                  {/* Items table */}
                  <table className="w-full text-[11px] mb-8">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 text-left font-semibold text-slate-600">Conceptos</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-16">Cant.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-28">Precio uni.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-16">Imp.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docItems.map(item => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-4 pr-4">
                            <p className="font-bold text-slate-900 uppercase">{item.concept}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-600 mt-1 leading-snug whitespace-pre-line">{item.description}</p>
                            )}
                          </td>
                          <td className="py-4 text-right text-slate-700">{item.qty.toFixed(2)}</td>
                          <td className="py-4 text-right text-slate-700">{item.price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                          <td className="py-4 text-right text-slate-700">21%</td>
                          <td className="py-4 text-right font-bold text-slate-900">{(item.price * item.qty * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Blue separator line */}
                  <div className="h-0.5 bg-blue-500 mb-6" />

                  {/* Totals */}
                  <div className="flex justify-end mb-12">
                    <div className="w-72 text-[12px] space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base Imponible</span>
                        <span className="font-medium">{baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-slate-200">
                        <span className="text-slate-600">IVA 21%</span>
                        <span className="font-medium">{iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="font-bold text-slate-900">{total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment methods */}
                  <div className="mb-12 text-[11px]">
                    <p className="font-semibold text-slate-700 mb-1">Métodos de pago</p>
                    <p className="text-slate-600">Transferencia bancaria al número de cuenta <span className="font-bold text-slate-900">ES38 0182 1078 8602 0152 6785</span></p>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
                    <span>B92898287</span>
                    <span>1 / 1</span>
                  </div>
                </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Sidebar />
      
      <main className="ml-64 p-12 max-w-[1600px]">
        {/* Page Header */}
        <header className="mb-12 flex justify-between items-end">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl font-black text-[#0F172A] tracking-tighter leading-none mb-3">
              {activeTab === 'catalog' && "Catálogo Precios"}
              {activeTab === 'budgets' && "Presupuesto Obra"}
              {activeTab === 'global-calendar' && "Agenda de Empresa"}
              {activeTab === 'dashboard' && "Panel General"}
              {activeTab === 'billing' && "Módulo Facturación"}
              {activeTab === 'expenses' && "Tickets y Gastos"}
              {activeTab === 'projects' && "Listado Proyectos"}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
                <div className="h-1 w-12 rounded-full" style={{background: activeColor}}></div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                  Sistema de Gestión ERKIALE
                </p>
                {selectedProject && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{background: `${activeColor}18`, color: activeColor}}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{background: activeColor}} />
                    {selectedProject.name}
                  </span>
                )}
            </div>
          </motion.div>
          
          {(activeTab === 'projects' || activeTab === 'dashboard') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="text-white px-10 py-5 rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 transition-all"
              style={{
                background: activeColor,
                boxShadow: `0 8px 30px ${activeColor}50`,
                borderBottom: `4px solid ${activeColor}cc`
              }}
            >
              <Plus size={22} className="stroke-[3]" /> Crear Proyecto
            </motion.button>
          )}
        </header>

        {/* Tab Content Wrapper */}
        <div className="min-h-[70vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + selectedProjectId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'projects' && <ProjectsView />}
              
              {activeTab === 'catalog' && (
                <div className="space-y-8 max-w-6xl mx-auto">
                   <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100/50">
                     <div className="flex justify-between items-center mb-8">
                       <div>
                         <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro Maestro de Precios</h2>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Añadir nueva referencia al catálogo</p>
                       </div>
                       <div className="flex gap-2">
                          <label className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-blue-100 cursor-pointer ${isScanningCatalog ? 'bg-blue-200' : 'bg-blue-50 text-blue-600'}`}>
                            {isScanningCatalog ? "Escaneando..." : <><Camera size={12}/> Scanner IA</>}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf" 
                              onChange={handleCatalogScan} 
                              disabled={isScanningCatalog} 
                            />
                          </label>
                          <button 
                            onClick={() => setIsManagingLists(!isManagingLists)} 
                            className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${isManagingLists ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                          >
                            <LayoutDashboard size={12}/> {isManagingLists ? 'Cerrar Gestión' : 'Gestionar Listas'}
                          </button>
                          {!isManagingLists && (
                            <>
                              {isAddingCategory ? (
                                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="flex gap-1">
                                  <input 
                                    autoFocus
                                    value={tempCategory}
                                    onChange={(e) => setTempCategory(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()}
                                    placeholder="Nueva Cat..."
                                    className="text-[10px] p-2 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold"
                                  />
                                  <button onClick={saveNewCategory} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                                    <CheckCircle2 size={12}/>
                                  </button>
                                  <button onClick={() => setIsAddingCategory(false)} className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                                    <X size={12}/>
                                  </button>
                                </motion.div>
                              ) : (
                                <button onClick={() => setIsAddingCategory(true)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                                  <Plus size={12}/> Cat.
                                </button>
                              )}

                              {isAddingUnit ? (
                                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="flex gap-1">
                                  <input 
                                    autoFocus
                                    value={tempUnit}
                                    onChange={(e) => setTempUnit(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveNewUnit()}
                                    placeholder="Nueva Ud..."
                                    className="text-[10px] p-2 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold"
                                  />
                                  <button onClick={saveNewUnit} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                                    <CheckCircle2 size={12}/>
                                  </button>
                                  <button onClick={() => setIsAddingUnit(false)} className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                                    <X size={12}/>
                                  </button>
                                </motion.div>
                              ) : (
                                <button onClick={() => setIsAddingUnit(true)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                                  <Plus size={12}/> Ud.
                                </button>
                              )}
                            </>
                          )}
                       </div>
                     </div>

                     {catalogScanError && (
                       <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                         className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 mb-6 text-rose-700 text-[11px] font-bold">
                         <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                         <span>{catalogScanError}</span>
                         <button onClick={() => setCatalogScanError(null)} className="ml-auto text-rose-400 hover:text-rose-600"><X size={14}/></button>
                       </motion.div>
                     )}

                     <AnimatePresence>
                       {isManagingLists && (
                         <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mb-8 border-t border-slate-100 pt-8"
                         >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gestionar Categorías</h4>
                                <div className="flex flex-wrap gap-2">
                                  {categories.map(cat => (
                                    <div key={cat} className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                      {editingCatName?.old === cat ? (
                                        <>
                                          <input autoFocus value={editingCatName.val}
                                            onChange={e => setEditingCatName({old: cat, val: e.target.value})}
                                            onKeyDown={async e => {
                                              if (e.key === 'Enter') {
                                                const v = editingCatName.val.trim();
                                                if (v && v !== cat && !categories.includes(v)) {
                                                  const newCats = categories.map(c => c === cat ? v : c);
                                                  try {
                                                    await Promise.all([
                                                      setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true }),
                                                      ...catalog.filter(i => i.category === cat && i.firebaseId).map(i =>
                                                        updateDoc(doc(db, 'catalog', i.firebaseId!), { category: v }))
                                                    ]);
                                                  } catch (err) {
                                                    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                                  }
                                                }
                                                setEditingCatName(null);
                                              }
                                              if (e.key === 'Escape') setEditingCatName(null);
                                            }}
                                            className="text-[11px] font-bold bg-white border border-blue-300 rounded-lg px-2 py-0.5 outline-none w-24"/>
                                          <button onClick={async () => {
                                            const v = editingCatName.val.trim();
                                            if (v && v !== cat && !categories.includes(v)) {
                                              const newCats = categories.map(c => c === cat ? v : c);
                                              try {
                                                await Promise.all([
                                                  setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true }),
                                                  ...catalog.filter(i => i.category === cat && i.firebaseId).map(i =>
                                                    updateDoc(doc(db, 'catalog', i.firebaseId!), { category: v }))
                                                ]);
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                              }
                                            }
                                            setEditingCatName(null);
                                          }} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={10}/></button>
                                          <button onClick={() => setEditingCatName(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={10}/></button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-[11px] font-bold text-slate-700">{cat}</span>
                                          <button onClick={() => setEditingCatName({old: cat, val: cat})} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg ml-1"><Hammer size={10}/></button>
                                          <button onClick={() => setDeleteConfirmation({ id: cat, type: 'category', label: cat })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={10}/></button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gestionar Unidades</h4>
                                <div className="flex flex-wrap gap-2">
                                  {units.map(u => (
                                    <div key={u} className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                      {editingUnitName?.old === u ? (
                                        <>
                                          <input autoFocus value={editingUnitName.val}
                                            onChange={e => setEditingUnitName({old: u, val: e.target.value})}
                                            onKeyDown={async e => {
                                              if (e.key === 'Enter') {
                                                const v = editingUnitName.val.trim();
                                                if (v && v !== u && !units.includes(v)) {
                                                  const newUnits = units.map(un => un === u ? v : un);
                                                  try {
                                                    await Promise.all([
                                                      setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true }),
                                                      ...catalog.filter(i => i.unit === u && i.firebaseId).map(i =>
                                                        updateDoc(doc(db, 'catalog', i.firebaseId!), { unit: v }))
                                                    ]);
                                                  } catch (err) {
                                                    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                                  }
                                                }
                                                setEditingUnitName(null);
                                              }
                                              if (e.key === 'Escape') setEditingUnitName(null);
                                            }}
                                            className="text-[11px] font-bold bg-white border border-blue-300 rounded-lg px-2 py-0.5 outline-none w-24"/>
                                          <button onClick={async () => {
                                            const v = editingUnitName.val.trim();
                                            if (v && v !== u && !units.includes(v)) {
                                              const newUnits = units.map(un => un === u ? v : un);
                                              try {
                                                await Promise.all([
                                                  setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true }),
                                                  ...catalog.filter(i => i.unit === u && i.firebaseId).map(i =>
                                                    updateDoc(doc(db, 'catalog', i.firebaseId!), { unit: v }))
                                                ]);
                                              } catch (err) {
                                                handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                              }
                                            }
                                            setEditingUnitName(null);
                                          }} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={10}/></button>
                                          <button onClick={() => setEditingUnitName(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={10}/></button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-[11px] font-bold text-slate-700">{u}</span>
                                          <button onClick={() => setEditingUnitName({old: u, val: u})} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg ml-1"><Hammer size={10}/></button>
                                          <button onClick={() => setDeleteConfirmation({ id: u, type: 'unit', label: u })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={10}/></button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     {/* ── Datos de Empresa ── */}
                     <div className="border-t border-slate-100 pt-8 mb-8">
                       <div className="flex items-center justify-between mb-5">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos de Empresa (Facturas)</h4>
                         <button
                           type="button"
                           onClick={() => { setCompanyDraft(companyInfo); setIsEditingCompany(!isEditingCompany); }}
                           className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${isEditingCompany ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                         >
                           <Hammer size={11}/> {isEditingCompany ? 'Cancelar' : 'Editar'}
                         </button>
                       </div>
                       <AnimatePresence>
                         {isEditingCompany ? (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                             <form onSubmit={async (e) => {
                               e.preventDefault();
                               try {
                                 await setDoc(doc(db, 'settings', 'global'), { companyInfo: companyDraft }, { merge: true });
                                 setIsEditingCompany(false);
                               } catch (err) {
                                 handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                               }
                             }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                               {([
                                 { field: 'name', label: 'Nombre / Razón social' },
                                 { field: 'cif', label: 'CIF / NIF' },
                                 { field: 'address', label: 'Dirección' },
                                 { field: 'city', label: 'Población y CP' },
                                 { field: 'phone', label: 'Teléfono' },
                                 { field: 'email', label: 'Email' },
                               ] as { field: keyof CompanyInfo; label: string }[]).map(({ field, label }) => (
                                 <div key={field} className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
                                   <input
                                     value={companyDraft[field]}
                                     onChange={e => setCompanyDraft(prev => ({ ...prev, [field]: e.target.value }))}
                                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                   />
                                 </div>
                               ))}
                               <div className="md:col-span-2 flex gap-3 pt-2">
                                 <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                   Guardar Datos
                                 </button>
                                 <button type="button" onClick={() => setIsEditingCompany(false)} className="px-6 py-2.5 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                                   Cancelar
                                 </button>
                               </div>
                             </form>
                           </motion.div>
                         ) : (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] leading-relaxed text-slate-600 space-y-0.5">
                             <p className="font-black text-slate-800">{companyInfo.name}</p>
                             {companyInfo.cif && <p>{companyInfo.cif}</p>}
                             {companyInfo.address && <p>{companyInfo.address}</p>}
                             {companyInfo.city && <p>{companyInfo.city}</p>}
                             {companyInfo.phone && <p>Telf. {companyInfo.phone}</p>}
                             {companyInfo.email && <p>{companyInfo.email}</p>}
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>

                     {/* ── Categorías de Gasto ── */}
                     <div className="border-t border-slate-100 pt-8 mb-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Categorías de Gasto</h4>
                       <div className="flex flex-wrap gap-2 mb-3">
                         {expenseCategories.map(cat => (
                           <div key={cat} className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                             <span className="text-[11px] font-bold text-slate-700">{cat}</span>
                             {expenseCategories.length > 1 && (
                               <button onClick={async () => {
                                 const updated = expenseCategories.filter(c => c !== cat);
                                 try {
                                   await setDoc(doc(db, 'settings', 'global'), { expenseCategories: updated }, { merge: true });
                                 } catch (err) {
                                   handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                 }
                               }} className="p-1 text-rose-400 hover:bg-rose-50 rounded-lg ml-1"><X size={10}/></button>
                             )}
                           </div>
                         ))}
                         <form onSubmit={async (e) => {
                           e.preventDefault();
                           const fd = new FormData(e.currentTarget);
                           const val = (fd.get('newExpCat') as string).trim();
                           if (!val || expenseCategories.includes(val)) return;
                           const updated = [...expenseCategories, val];
                           try {
                             await setDoc(doc(db, 'settings', 'global'), { expenseCategories: updated }, { merge: true });
                             (e.currentTarget as HTMLFormElement).reset();
                           } catch (err) {
                             handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                           }
                         }} className="flex items-center gap-1">
                           <input name="newExpCat" placeholder="Nueva..." className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-100 w-24" />
                           <button type="submit" className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={14}/></button>
                         </form>
                       </div>
                     </div>

                     <form onSubmit={handleAddCatalogItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                       <div className="md:col-span-3 space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                         <select name="category" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm appearance-none">
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                         </select>
                       </div>
                       <div className="md:col-span-4 space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto / Partida</label>
                         <input name="concept" required type="text" placeholder="Ej: Alicatado baño..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm" />
                       </div>
                       <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
                         <select name="unit" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm appearance-none">
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                         </select>
                       </div>
                       <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">P. Unitario (€)</label>
                         <input name="price" required type="number" step="0.01" min="0" placeholder="0.00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm" />
                       </div>
                       <div className="md:col-span-1">
                         <button type="submit" className="bg-blue-600 text-white p-4 h-[60px] w-full rounded-2xl font-black flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                           <Plus size={24} />
                         </button>
                       </div>
                     </form>
                   </div>

                   <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-900 border-b border-slate-800">
                         <tr>
                           <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                           <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                           <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ud.</th>
                           <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio / Ud.</th>
                         </tr>
                       </thead>
                       <tbody>
                         {catalog.map((item, idx) => (
                           <motion.tr 
                            key={item.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-slate-50 hover:bg-blue-50/20 transition-all group"
                           >
                             <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {item.id}</span>
                                </div>
                             </td>
                             <td className="p-6"><span className="text-[9px] font-black bg-blue-50 text-blue-500 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">{item.category}</span></td>
                             <td className="p-6 text-xs font-bold text-slate-400 text-right">{item.unit}</td>
                             <td className="p-6 text-sm font-black text-slate-900 text-right">{item.price.toFixed(2)}€</td>
                             <td className="p-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingCatalogItem(item); }} 
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors bg-blue-50/30"
                                    title="Editar Concepto"
                                  >
                                    <Hammer size={14}/>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: item.firebaseId, type: 'catalog', label: item.concept }); }}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors bg-rose-50/30"
                                    title="Eliminar Concepto"
                                  >
                                    <X size={14}/>
                                  </button>
                                </div>
                             </td>
                           </motion.tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {activeTab === 'budgets' && (
                <div>
                  <div className="flex gap-10 mb-10 border-b border-slate-200">
                    <button 
                      onClick={() => setProjectSubTab('budget')}
                      className={`pb-5 px-1 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${projectSubTab === 'budget' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Control Financiero
                      {projectSubTab === 'budget' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setProjectSubTab('calendar')}
                      className={`pb-5 px-1 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${projectSubTab === 'calendar' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Cronograma Obra
                      {projectSubTab === 'calendar' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                  </div>
                  {projectSubTab === 'budget' ? <BudgetView project={selectedProject} /> : <CalendarWidget projectId={selectedProjectId} />}
                </div>
              )}

              {activeTab === 'global-calendar' && <CalendarWidget />}

              {activeTab === 'billing' && <BillingView project={selectedProject} />}

              {activeTab === 'expenses' && <ExpensesView project={selectedProject} />}

              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 flex flex-col justify-between h-64 group hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Proyectos Activos</p>
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Briefcase size={20}/></div>
                      </div>
                      <h4 className="text-7xl font-black text-slate-900 tracking-tighter">{projects.length}</h4>
                      <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">↑ Central de Control</p>
                   </div>
                   <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-slate-200 h-64 flex flex-col justify-between group">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Volumen Negocio</p>
                        <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><Receipt size={20}/></div>
                      </div>
                      <h4 className="text-6xl font-black text-white tracking-tighter">
                        {Object.values(budgets).flat().reduce((acc, curr: any) => acc + (curr.total || 0), 0).toLocaleString()}
                        <span className="text-2xl text-blue-500 ml-1">€</span>
                      </h4>
                      <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Base Imponible Total</p>
                   </div>
                   <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 h-64 flex flex-col justify-between group hover:border-rose-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hitos Críticos</p>
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors"><Clock size={20}/></div>
                      </div>
                      <h4 className="text-7xl font-black text-slate-900 tracking-tighter">
                        {String(events.filter(e => e.status === 'urgente').length).padStart(2, '0')}
                      </h4>
                      <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Tareas Urgentes</p>
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL: NEW PROJECT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Expediente</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Apertura de ficha de obra</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-900 transition-all border border-slate-100"
                >
                    <X size={24}/>
                </button>
              </div>
              <form onSubmit={handleAddProject} className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Título del Proyecto</label>
                  <input name="name" required type="text" placeholder="Ej: Reforma Planta 3 Calle Serrano" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Cliente / Empresa</label>
                    <input name="clientName" required type="text" placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">CIF / NIF</label>
                    <input name="clientCIF" required type="text" placeholder="Ej: 12345678Z" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dirección Fiscal / Obra</label>
                  <input name="clientAddress" required type="text" placeholder="Calle, Número, CP, Ciudad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email de Contacto</label>
                    <input name="clientEmail" required type="email" placeholder="cliente@ejemplo.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Teléfono</label>
                    <input name="clientPhone" required type="tel" placeholder="Ej: 600000000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Categoría Obra</label>
                  <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm">
                    <option value="Vivienda">Vivienda</option>
                    <option value="Cocina">Cocina</option>
                    <option value="Baño">Baño</option>
                    <option value="Local">Local Comercial</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white p-6 rounded-[1.75rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-blue-200 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all mt-4">
                  Confirmar Apertura
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .print\:hidden { display: none !important; }
          body { background: white !important; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
