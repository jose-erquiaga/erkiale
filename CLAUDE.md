# ERKIALE — Codebase Documentation

## Visión General

**ERKIALE** es una aplicación web (Vite + React + TypeScript + Firebase) para gestión integral de proyectos de reforma/construcción. Centraliza presupuestos, facturas, gastos ejecutados, calendario de tareas, y un catálogo jerárquico de conceptos/materiales. Está diseñada para que los usuarios tracken presupuesto vs. ejecución, generen facturas desde presupuestos, y mantengan un archivo histórico por proyecto.

**Stack principal:**
- Frontend: React 18, TypeScript, Vite
- Styling: Tailwind CSS + Framer Motion (animaciones)
- Backend/datos: Firebase (Auth, Firestore, Hosting)
- Icons: Lucide React

---

## Estructura de Directorios

```
src/
├── components/
│   ├── BudgetView.tsx                    # Pantalla de Presupuesto (desglose + add partidas)
│   ├── BillingView.tsx                   # Pantalla de Facturación (invoice items + empresa)
│   ├── CalendarWidget.tsx                # Calendario Gantt-style (planificación/reuniones)
│   ├── Dashboard.tsx                     # Landing / resumen proyectos
│   ├── ProjectView.tsx                   # Gestión de proyecto + pestañas
│   ├── ExpensesView.tsx                  # Gastos ejecutados + captura de facturas
│   ├── CameraReceiptCapture.tsx          # Modal: captura foto → Gemini Vision → extrae items
│   └── modals/
│       ├── InvoicePreviewModal.tsx       # PDF/preview compartido Presupuesto + Factura
│       └── ProjectModal.tsx              # Crear/editar proyectos
├── hooks/
│   ├── useProjectSubcollections.ts  # CRUD: presupuestos, facturas, gastos
│   ├── useCatalogHierarchy.ts       # Catálogo jerárquico (gremios/estancias/subcategorías)
│   └── ...otros hooks
├── lib/
│   ├── groupBudgetItems.ts      # Helper: agrupa ítems por Gremio/Estancia/Subcategoría
│   ├── firebase.ts              # Config Firebase + operaciones base
│   └── ...utilities
├── types/
│   ├── index.ts                 # Interfaces principales (Project, BudgetItem, etc)
│   └── catalogHierarchy.ts      # Tipos del catálogo
├── styles/
│   └── ...estilos globales
└── App.tsx                      # Router principal + estado global
```

---

## Arquitectura de Datos

### Project
```typescript
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
```
Representa un proyecto de reforma. Se almacena en Firestore con subcollections: `budgetItems`, `invoiceItems`, `expenses`, `calendarEvents`.

### BudgetItem
```typescript
interface BudgetItem {
  id: number;
  firebaseId?: string;
  concept: string;
  description?: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  tipo?: 'tareas' | 'material';
  // Denormalized para sobrevivir cambios en el catálogo:
  guildId?: string;
  guildName?: string;
  roomId?: string;
  roomName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}
```
Ítem de presupuesto. Copia campos jerárquicos del catálogo al momento de agregar, así que renombres/borrados de Gremio/Estancia/Subcategoría no afectan ítems históricos.

### CompanyInfo
```typescript
interface CompanyInfo {
  name: string;
  cif: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}
```
Datos de la empresa del usuario, usados en facturas (PDF y preview). Se guardanEn Firestore en `settings/global`.

### CalendarEvent
```typescript
interface CalendarEvent {
  id: number;
  firebaseId?: string;
  projectId: string;  // firebaseId del proyecto, o 'erkiale' para eventos globales
  type: 'planning' | 'meeting';
  task: string;
  worker: string;
  status: 'pendiente' | 'urgente';
  startDate: string;   // YYYY-MM-DD
  endDate?: string;    // Solo para planning (rango)
  startTime?: string;  // HH:MM (solo meeting)
  endTime?: string;    // HH:MM (solo meeting)
}
```
Evento de calendario (tareas/reuniones). `type='planning'` es rango fechas, `type='meeting'` es evento puntual con horas.

### ExpenseItem
```typescript
interface ExpenseItem {
  id: number;
  firebaseId?: string;
  concept: string;
  date: string;
  provider: string;
  tipo: 'material' | 'trabajo';
  base?: number;       // Material: base imponible
  iva?: number;        // Material: cuota IVA
  amount?: number;     // Trabajo: importe directo (sin IVA desglosado)
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'a_cuenta';
  attachmentUrl?: string;
}
```
Gasto ejecutado (factura proveedor, ticket, nómina, etc.).

---

## Componentes Principales

### BudgetView.tsx
**Rol:** Pantalla de Presupuesto. Muestra desglose jerárquico de ítems por Tipo/Gremio/Estancia/Subcategoría, sumario financiero (presupuesto vs. gastos vs. margen), y formulario para añadir ítems (desde catálogo o manual).

**Patrón de agrupación:**
- Usa `groupItemsByGuildAndRoom()` para transformar array plano de `BudgetItem` en árbol `GuildGroup[]`.
- Cada `GuildGroup` contiene `rooms`, cada room contiene `subcategories`, cada subcategory contiene `items`.
- Renderiza encabezados (Tipo/Gremio/Estancia/Subcategoría) e `InvoiceItemRows` para los ítems.

**Props clave:**
- `budgets`: Record de proyecto ID → array de BudgetItem.
- `handleAddBudgetItemFromCatalog`: Agrega ítem copiando campos del catálogo.
- `handleAddAdHocBudgetItem`: Agrega ítem manual (sin catálogo).

**Tipografía:**
- Tipo: 12px, font-black, slate-600
- Gremio + total: 11px, font-black, blue-600
- Estancia: 10px, font-black, slate-500
- Subcategoría: 9px, font-black, slate-500
- Ítem concepto: 9px, font-medium, slate-900

### BillingView.tsx
**Rol:** Pantalla de Facturación. Similar a BudgetView pero:
- Renderiza `invoiceItems` (generados desde presupuesto vía "Pasar a Facturación").
- Incluye tarjeta de edición de datos de empresa (`CompanyInfoCard`).
- Botón "Vista Previa & PDF" abre modal de factura.

**Diferencias de estilo respecto a BudgetView:**
- Gremio en color `text-emerald-600` (verde, no azul).
- Título de Tipo: "Tareas realizadas" (no "Tareas a realizar").

**Patrón:** Idéntico a BudgetView en agrupación jerárquica.

### ExpensesView.tsx
**Rol:** Pantalla de Gastos del Proyecto. Muestra tabla de gastos registrados (material/trabajo), con botón de "Capturar Factura" que abre modal de captura + análisis con Gemini Vision.

**Props:**
- `project`, `selectedProjectId`, `expenses`: estado de gastos
- `handleSaveExpense`: callback para agregar nuevo gasto
- `isScanningExpense`, `expenseScanError`: estado de escaneo
- `handleExpenseScan`: handler heredado (deprecated, reemplazado por CameraReceiptCapture)

**Integración con CameraReceiptCapture:**
- Botón "Capturar Factura" abre modal
- Cuando se extraen items, auto-rellena el formulario de gastos a la derecha
- Usuario puede confirmar los datos extraídos o editarlos antes de guardar

### CameraReceiptCapture.tsx
**Rol:** Modal reutilizable para capturar fotos de facturas y extraer items automáticamente usando Gemini Vision API.

**Características:**
- Captura en tiempo real desde cámara del dispositivo (entorno trasero)
- Subida manual de archivos de imagen
- Llamada a Cloud Function que envía imagen a Gemini Vision API
- Extrae: concepto, cantidad, precio unitario, IVA por ítem
- Muestra resultados con total de factura y desglose de IVA
- Botón "Agregar a Gastos" para cada ítem

**Props:**
- `isOpen`: controla visibilidad del modal
- `onClose`: callback al cerrar
- `onItemsExtracted`: callback cuando se extraen items (recibe array de items)

**Estados internos:**
- `isCameraActive`: si la cámara está activa
- `isProcessing`: mientras se procesa con Gemini
- `extractedData`: datos extraídos de la factura
- `error`: mensajes de error

**Flujo:**
1. Usuario hace clic en "Capturar Factura"
2. Elige entre "Usar Cámara" o "Subir Archivo"
3. Captura/selecciona foto
4. Componente envía a Cloud Function con imagen en base64
5. Gemini Vision extrae items y totales
6. Muestra resultado con opción de agregar cada ítem a gastos

### InvoicePreviewModal.tsx
**Rol:** Modal compartido para PDF/preview de **Presupuesto** y **Factura**. Se abre desde BudgetView ("Vista Previa Presupuesto") o BillingView ("Vista Previa & PDF"), detectando `activeTab` para saber si es presupuesto (`activeTab !== 'billing'`) o factura (`activeTab === 'billing'`).

**Contenido:**
- Cabecera: Logo EH + datos empresa.
- Sección cliente + número/fecha de presupuesto/factura.
- Tabla de ítems (agrupación jerárquica igual a pantalla).
- Totales (base imponible, IVA, total).
- Métodos de pago.

**Tipografía en PDF:**
- Tipo: 12px, font-black, slate-600
- Gremio (azul) + total: 11px, font-black, blue-600
- Estancia: 10px, font-black, slate-500
- Subcategoría: 9px, font-black, slate-500
- Ítem concepto: 9px, font-medium, slate-900 (minúscula, no UPPERCASE)
- Cantidad/precio: 9px, font-medium (no bold)

**Diferencia presupuesto/factura:**
- Si `isInvoice`: título "Tareas realizadas", presupuesto "Tareas a realizar".
- Colores Gremio: azul en PDF (igual en presupuesto y factura; en pantalla facturación es verde, pero PDF siempre azul para coherencia visual).

---

## Helpers y Utilities

### groupItemsByGuildAndRoom() — src/lib/groupBudgetItems.ts

**Propósito:** Transforma array plano de `BudgetItem` en árbol jerárquico.

**Firma:**
```typescript
function groupItemsByGuildAndRoom(items: BudgetItem[]): GuildGroup[]
```

**Output:**
```typescript
interface GuildGroup {
  guildName: string;
  total: number;  // Suma de todos los item.total bajo este gremio
  rooms: RoomGroup[];
}

interface RoomGroup {
  roomName: string;
  subcategories: SubcategoryGroup[];
}

interface SubcategoryGroup {
  subcategoryName: string;
  items: BudgetItem[];
}
```

**Lógica:**
- Agrupa por `item.guildName || 'Sin gremio'` → `roomName || 'Sin estancia'` → `subcategoryName || 'Sin subcategoría'`.
- Preserva orden de primera aparición en cada nivel (usando arrays ordenados + Maps).
- Calcula `total` sumando todos los `item.total` del gremio en una sola pasada.

**Uso:** Consumida por BudgetView, BillingView, InvoicePreviewModal para renderizar agrupación sin duplicar lógica.

---

## Tipografía y Estilos de Agrupación (Ronda reciente)

### Jerarquía de tamaños
Descendente para transmitir estructura visual clara:

| Nivel | Tamaño | Peso | Color (Presupuesto) | Color (Facturación) |
|---|---|---|---|---|
| **Tipo** | 12px | font-black | slate-600 | slate-600 |
| **Gremio** | 11px | font-black | blue-600 | emerald-600 |
| **Estancia** | 10px | font-black | slate-500 | slate-500 |
| **Subcategoría** | 9px | font-black | slate-500 | slate-500 |
| **Ítem concepto** | 9px | font-medium | slate-900 | slate-900 |
| **Ítem (qty/price/total)** | — | font-medium | slate-700/900 | slate-700/900 |

**Notas:**
- Gremio + total comparten color → refuerza asociación visual.
- Ítem concepto y datos no están en negrita → transmite que son detalles, no estructura.
- En PDF, Ítem concepto aparece en minúscula (sin `uppercase`); en pantalla BudgetView/BillingView no tiene clase `uppercase` tampoco.
- Presupuesto muestra "Tareas a realizar", Facturación muestra "Tareas realizadas".

### Aplicación en archivos
- **BudgetView.tsx**: Gremio azul, Estancia/Subcategoría font-black.
- **BillingView.tsx**: Gremio verde (emerald-600), Estancia/Subcategoría font-black.
- **InvoicePreviewModal.tsx**: Gremio azul en PDF (tanto presupuesto como factura para coherencia visual).

---

## Firebase

### Estructura de Firestore

```
projects/
  {projectId}/
    (fields: Project)
    budgetItems/
      {itemId}: BudgetItem
    invoiceItems/
      {itemId}: BudgetItem
    expenses/
      {expenseId}: ExpenseItem
    calendarEvents/
      {eventId}: CalendarEvent

settings/
  global/
    companyInfo: CompanyInfo
    (otros settings globales)

catalogs/
  {guildId}/
    (fields: Guild)
    rooms/
      {roomId}/
        (fields: Room)
        subcategories/
          {subcategoryId}/
            (fields: Subcategory)
            items/
              {itemId}: HierarchicalCatalogItem
```

### firestore.rules
Valida estructura y permisos:
- `isValidProject(data)`: verifica campos requeridos de Project.
- `isValidBudgetItem(data)`, `isValidInvoiceItem(data)`: validan BudgetItem (permisivos en campos opcionales denormalizados).
- `isValidCalendarEvent(data)`: valida CalendarEvent (distintos campos según type='planning' vs 'meeting').
- `isValidExpenseItem(data)`: valida ExpenseItem.
- `isValidGuild`, `isValidRoom`, `isValidSubcategory`: validan catálogo jerárquico.

**Notas recientes:**
- CalendarEvent cambió de shape (de `date`/`time` a `type`/`startDate`/`endDate`/`startTime`/`endTime`); rules se actualizaron via `firebase deploy --only firestore:rules`.
- Campos denormalizados (guildId, guildName, roomId, roomName, subcategoryId, subcategoryName) en BudgetItem/InvoiceItem son opcionales y nunca requieren actualización de rules.

### Operaciones CRUD
Manejadas por `useProjectSubcollections` (ver Hooks).

---

## Captura de Facturas y Análisis con Gemini Vision

### Arquitectura General

**Flujo end-to-end:**
1. Usuario captura foto de factura desde ExpensesView → modal CameraReceiptCapture
2. Imagen se convierte a base64 en el navegador
3. Se envía a Cloud Function (endpoint HTTP autenticado)
4. Cloud Function recupera API key de Gemini desde Secret Manager
5. Gemini Vision API analiza imagen y extrae items, precios, IVA
6. Respuesta se retorna al navegador
7. Items se muestran en modal con opción de agregar a gastos

### Google Cloud Deployment

**Cloud Function: `analyzeReceipt`**
- Ubicación: `europe-west1`
- Runtime: Node.js 20 (2nd gen)
- Endpoint HTTP: `https://europe-west1-erkiale-9459d.cloudfunctions.net/analyzeReceipt`
- Entry point: `app` (Express.js)
- Autenticación: `--allow-unauthenticated` (cualquier usuario puede llamar)

**Dependencias:**
- `@google-cloud/functions-framework`: wrapper para Cloud Functions v2
- `@google-cloud/secret-manager`: acceder a Secret Manager
- `express`: framework HTTP
- `cors`: permitir requests cross-origin
- `axios`: hacer requests HTTP a Gemini API

**Lógica:**
```
POST /analyzeReceipt
{imageBase64: "..."}
  ↓
Recupera API key desde Secret Manager
  ↓
Llama Gemini Vision API con imagen
  ↓
Parsea JSON de respuesta (regex: /\{[\s\S]*\}/)
  ↓
Retorna {items: [...], totalBase, totalIVA, totalFactura}
```

**Respuesta esperada:**
```typescript
{
  items: [
    {
      concepto: string,
      cantidad: number,
      precioUnitario: number,
      iva?: number,
      total?: number
    }
  ],
  totalBase?: number,
  totalIVA?: number,
  totalFactura?: number
}
```

### Secret Manager

**Secret:** `gemini-api-key`
- Proyecto: `erkiale-9459d`
- Almacena API key de Google AI Studio (Gemini API)
- Acceso restringido a service account de Cloud Function
- Nunca expuesta en código fuente

### Flujo de Procesamiento en Frontend

**CameraReceiptCapture.tsx:**

1. **Captura de imagen:**
   - Canvas API para capturar desde video stream
   - FileReader para leer archivos subidos
   - Conversión a base64 JPEG

2. **Envío a Cloud Function:**
```typescript
fetch(GEMINI_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageBase64: base64Data })
})
```

3. **Procesamiento de respuesta:**
   - Valida que la respuesta sea JSON
   - Extrae campos: items, totalBase, totalIVA, totalFactura
   - Muestra error si Gemini no pudo procesar

4. **Auto-relleno de formulario:**
   - ExpensesView recibe array de items
   - Llena campos del formulario: concepto, proveedor, precio, IVA
   - Usuario puede editar antes de guardar

### Prompts de Gemini Vision

**Actual:**
```
"Extrae de esta factura: items (concepto, cantidad, precio unitario, IVA). 
Retorna SOLO JSON: {items: [{concepto, cantidad, precioUnitario, iva}], totalBase, totalIVA, totalFactura}"
```

Puede mejorarse según tipo de factura:
- Facturas europeas (IRPF, etc.)
- Tickets de tienda
- Nóminas
- Presupuestos de terceros

---

## Hooks Personalizados

### useProjectSubcollections.ts
**Propósito:** CRUD para presupuestos, facturas, gastos, eventos de calendario de un proyecto.

**Funciones principales:**
- `handleAddBudgetItemFromCatalog(catalogItem, qty, guildName?, roomName?, subcategoryName?)`: Agrega presupuesto desde catálogo, copia campos denormalizados.
- `handleAddAdHocBudgetItem(data: {...})`: Agrega presupuesto manual (sin catálogo), con campos opcionales guildId/guildName/etc.
- `handleEditBudgetItem`, `handleDeleteBudgetItem`: Edición/eliminación.
- `handleGenerateInvoice()`: Copia todos los presupuestos a invoiceItems (para facturación).
- Similar para gastos y eventos de calendario.

**Detalle importante:** Al copiar BudgetItem → InvoiceItem, se preservan guildId/guildName/roomId/roomName/subcategoryId/subcategoryName via spreads condicionales.

### useCatalogHierarchy.ts
**Propósito:** Lectura de catálogo jerárquico (Gremios → Estancias → Subcategorías → Ítems).

**Retorna:**
```typescript
{
  guilds: Guild[];
  rooms: Room[];
  subcategories: Subcategory[];
  items: HierarchicalCatalogItem[];
  addItem(guildId, roomId, type, subcategoryId, itemData);
  ...
}
```

**Uso:** En BudgetView, al seleccionar Gremio/Estancia/Tipo/Subcategoría, filtra dinámicamente la lista de ítems disponibles.

---

## Patrones Comunes

### Denormalización de Gremio/Estancia/Subcategoría
Cuando se agrega un ítem de presupuesto, se copia:
```typescript
{
  ...item,
  guildId: guild?.firebaseId,
  guildName: guild?.name,
  roomId: room?.firebaseId,
  roomName: room?.name,
  subcategoryId: subcategory?.firebaseId,
  subcategoryName: subcategory?.name,
}
```
Así, si luego se renombra "Albañilería" → "Obra", los ítems históricos mantienen "Albañilería" en su copia denormalizada.

### Agrupación sin duplicar lógica
`groupItemsByGuildAndRoom` es una única función reutilizada por 3 componentes (BudgetView, BillingView, InvoicePreviewModal), evitando que cambios en la jerarquía requieran tocar 3 archivos.

### Numeric input "stuck leading zero" fix
En BudgetView, inputs `type="number"` con `onFocus={e => e.target.select()}` evitan el bug de Tailwind/browser donde typing over "0" resulta en "03" (el select-all reemplaza en vez de concatenar).

---

## Próximos Pasos / Roadmap

### Completado ✅
- Captura de facturas con cámara + Gemini Vision
- Extracción automática de items, precios e IVA
- Auto-relleno de formulario de gastos

### Corto plazo
- Agregar items capturados opcionalmente al catálogo jerárquico (Gremio/Estancia/Subcategoría selector)
- Validación de formato de factura antes de enviar a Gemini (evitar fotos borrosas)
- Cacheo de resultados por hash de imagen (evitar duplicados)
- Soporte para múltiples idiomas en prompts de Gemini

### Mediano plazo
- Exportar presupuesto/factura a Excel/CSV
- Mejorar tabla de gastos (filtros, búsqueda, sorting)
- Notificaciones de eventos próximos
- Soporte multi-usuario/equipos
- Historial de versiones de presupuestos

### Largo plazo
- OCR mejorado para documentos más complejos (nóminas, IVA desglosado)
- Integración con proveedores (APIs de bancos, contabilidad)
- IA para predicción de costos/tiempos
- Mobile app nativa

---

## Notas de Implementación Recientes

### Migración de cuenta (julio 2026)
- Proyecto GCP trasladado de `jose.erquiaga@gmail.com` a `erkialesl@gmail.com`
- Firestore exportado y datos migrantes (Secret Manager + backup temporal en GCS)
- Firebase Hosting redeployed bajo nueva cuenta

### Arquitectura Gemini Vision (julio 2026)
- Cloud Function v2 (Node.js 20) como proxy seguro para API key
- API key almacenada en Secret Manager (nunca en código)
- Frontend envía imágenes en base64, backend gestiona autenticación
- CORS habilitado para requests desde navegador

---

**Última actualización:** Julio 2026 (Captura de facturas con Gemini Vision + migración de cuenta).
