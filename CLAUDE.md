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
│   ├── BudgetView.tsx               # Pantalla de Presupuesto (desglose + add partidas)
│   ├── BillingView.tsx              # Pantalla de Facturación (invoice items + empresa)
│   ├── CalendarWidget.tsx           # Calendario Gantt-style (planificación/reuniones)
│   ├── DashboardView.tsx            # Landing / resumen proyectos
│   ├── ExpensesView.tsx             # Gastos ejecutados de proyecto + escaneo de facturas
│   ├── CompanyExpensesView.tsx      # Gastos ejecutados de la empresa + escaneo de facturas
│   └── modals/
│       ├── InvoicePreviewModal.tsx        # PDF/preview compartido Presupuesto + Factura
│       ├── ScannedExpensePreviewModal.tsx # Revisión de factura escaneada antes de guardar
│       └── ProjectModal.tsx               # Crear/editar proyectos
├── hooks/
│   ├── useProjectSubcollections.ts  # CRUD: presupuestos, facturas, gastos (incl. handleExpenseScan)
│   ├── useCompanyExpenses.ts        # CRUD: gastos de empresa (incl. handleExpenseScan)
│   ├── useCatalogHierarchy.ts       # Catálogo jerárquico (gremios/estancias/subcategorías)
│   └── ...otros hooks
├── services/
│   └── geminiService.ts         # scanExpenseInvoice(): llama a Cloud Function analyzeReceipt
├── lib/
│   ├── groupBudgetItems.ts      # Helper: agrupa ítems por Gremio/Estancia/Subcategoría
│   ├── firebase.ts              # Config Firebase + operaciones base
│   └── ...utilities
├── types/
│   ├── index.ts                 # Interfaces principales (Project, BudgetItem, etc)
│   └── catalogHierarchy.ts      # Tipos del catálogo
└── App.tsx                      # Router principal + estado global

functions/
├── index.js       # Cloud Function `analyzeReceipt`: proxy seguro a Gemini Vision (Secret Manager)
└── package.json
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

### ExpensesView.tsx / CompanyExpensesView.tsx
**Rol:** Gastos ejecutados de un proyecto (`ExpensesView`) o de la empresa (`CompanyExpensesView`). Tabla de gastos + formulario manual + botón de escaneo de factura ("Tomar Foto" / "Subir Archivo") que dispara `handleExpenseScan`.

**Flujo de escaneo:** ver sección "Escaneo de Facturas con Gemini Vision" más abajo. El resultado se revisa en `ScannedExpensePreviewModal` antes de guardarse como `ExpenseItem`(s).

### ScannedExpensePreviewModal.tsx
**Rol:** Modal de revisión tras escanear una factura con Gemini. Muestra proveedor, fecha, y cada componente/línea detectado (editable) antes de confirmar el guardado. Se usa tanto desde `ExpensesView` como desde `CompanyExpensesView` (mismo componente, distinto hook de origen).

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

## Escaneo de Facturas con Gemini Vision

### Flujo end-to-end
1. Usuario sube foto/archivo de factura desde `ExpensesView` (gastos de proyecto) o `CompanyExpensesView` (gastos de Erkiale), mediante el input con `handleExpenseScan`.
2. `handleExpenseScan` (en `useProjectSubcollections.ts` / `useCompanyExpenses.ts`) llama a `scanExpenseInvoice(file)` de `src/services/geminiService.ts`.
3. `scanExpenseInvoice` convierte el archivo a base64 y llama a la **Cloud Function `analyzeReceipt`** (no llama a Gemini directamente desde el cliente).
4. La Cloud Function recupera la API key de Gemini desde **Secret Manager** (nunca se expone en el bundle del cliente) y llama a Gemini Vision.
5. Gemini devuelve `{provider, date, components: [{concept, quantity, unitPrice, price}]}`.
6. El resultado se guarda en `scannedExpensePreview` (estado del hook) y se muestra en `ScannedExpensePreviewModal.tsx` para que el usuario revise/corrija cada componente antes de confirmar.
7. Al confirmar (`handleConfirmScannedExpense`), cada componente se guarda como un `ExpenseItem` independiente en Firestore.

### Por qué Cloud Function y no llamada directa desde el cliente
Antes, `geminiService.ts` instanciaba `GoogleGenAI` con una API key inyectada vía `vite.config.ts` (`process.env.GEMINI_API_KEY`) — esto la exponía en el bundle JS, visible para cualquiera en devtools. Se migró a un proxy server-side:
- **Cloud Function `analyzeReceipt`** (`functions/index.js`), Node.js 20, 2ª gen, región `europe-west1`.
- Endpoint: `https://europe-west1-erkiale-9459d.cloudfunctions.net/analyzeReceipt`
- La API key vive en Secret Manager (`gemini-api-key`, proyecto `erkiale-9459d`), solo accesible por la service account de la función.
- El cliente nunca ve la key; solo envía `{imageBase64, mimeType}` y recibe el JSON estructurado.

### geminiService.ts
**Contrato (sin cambios respecto al diseño original, solo cambió la implementación interna):**
```typescript
interface ScannedExpenseDocument {
  provider: string;
  date: string;
  components: { concept: string; quantity: number; unitPrice: number; price: number }[];
}
scanExpenseInvoice(file: File): Promise<ScannedExpenseDocument>
```
Esto permite que los hooks (`useProjectSubcollections`, `useCompanyExpenses`) y el modal de preview no necesiten saber si el análisis ocurre en el cliente o en un backend.

### functions/index.js (Cloud Function)
- Usa `@google-cloud/functions-framework` (requerido en Cloud Functions v2/gen2; exportar un Express app directamente sin registrar con `functions.http()` falla el healthcheck).
- Usa `@google-cloud/secret-manager` para leer la API key.
- Prompt idéntico al usado anteriormente en el cliente (extrae proveedor + fecha + cada línea de la factura, ignorando subtotales/IVA/gran total como líneas).
- Deploy:
```bash
gcloud functions deploy analyzeReceipt \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=app \
  --source=functions \
  --project=erkiale-9459d \
  --region=europe-west1
```

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

### Completado
- Escaneo de facturas con Gemini Vision (proxy vía Cloud Function + Secret Manager, sin exponer API key en cliente).

### Pendiente
- Opción de agregar ítems escaneados directamente al catálogo jerárquico (selector Gremio/Estancia/Subcategoría con precio/unidades prerellenados).
- Exportar presupuesto a Excel/CSV.
- Mejorar tabla de gastos (filtros, búsqueda).
- Notificaciones de eventos próximos.
- Soporte multi-usuario/equipos.
- Historial de versiones de presupuestos.

---

**Última actualización:** Migración de cuenta a `erkialesl@gmail.com` + escaneo de facturas movido a Cloud Function segura (Secret Manager) en vez de API key expuesta en cliente.
