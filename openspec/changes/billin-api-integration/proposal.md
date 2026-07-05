## Why

Hoy, cuando se genera una factura en Adquierele (ERKIALE) desde una obra, no existe ningún motor de
facturación electrónica homologado (Veri-Factu/TicketBAI) conectado a la app. Se planteó
originalmente integrar con Billin (TeamSystem Facturas Billin) vía API para automatizar
cliente/factura, pero la investigación de mercado mostró que **ningún proveedor SaaS ofrece acceso
a API por debajo de ~15 €/mes** (Billin Ilimitado: 20 €/mes; BeeL.es Developer: 15,90 €/mes) — el
presupuesto objetivo de este change es no superar 7 €/mes, lo que descarta la vía SaaS+API.

Alternativa viable dentro de presupuesto: **implementar el cumplimiento VERI*FACTU directamente en
Adquierele**. La normativa (RD 1007/2023, RRSIF) no exige certificación externa de la AEAT — el
cumplimiento se acredita con una declaración responsable emitida por el propio productor del
software. Esto elimina la cuota mensual de un tercero a cambio de implementar correctamente el
registro de facturación encadenado, firma electrónica, QR y (opcionalmente) el envío a la AEAT.

Este change queda documentado como propuesta a **futuro**: no forma parte de la reestructuración
actual de catálogo/presupuestos/gastos, y su dirección preferente (auto-implementación VERI*FACTU
frente a integración con un proveedor) se detalla en `design.md`, junto con los pendientes de
validación (idealmente con una asesoría fiscal) antes de poder estimar o empezar el desarrollo.

## What Changes

**Dirección preferente (Opción B — ver `design.md`):**
- Adquierele implementa su propio motor de cumplimiento VERI*FACTU: registro de facturación
  encadenado (hash del registro anterior + UUID), firma electrónica de cada registro, código QR en
  la factura, y registro de eventos inmutable.
- Se elige modalidad VERI*FACTU (envío en tiempo real a la AEAT vía su API) o no-VERI*FACTU (cadena
  local sin envío inmediato).
- Archivo local de facturas: por cada factura emitida, Adquierele guarda en su propia base de datos
  los datos completos de la factura, el hash/huella y el QR generados por el propio sistema. Esta
  pieza no depende de ningún proveedor tercero ni de un límite de clientes.
- Sin coste recurrente de proveedor externo — el coste es el desarrollo inicial y, recomendado,
  una validación con asesoría fiscal del diseño técnico antes de ponerlo en producción.

**Alternativa descartada por presupuesto (integración con Billin vía API), documentada por si se
retoma en el futuro:**
- Crear/editar/borrar clientes en Billin vía API desde Adquierele, a partir de los datos de cliente
  ya existentes en `Project` (`clientName`, `clientCIF`, `clientAddress`, `clientEmail`,
  `clientPhone`).
- Enviar/crear facturas en Billin vía API a partir de los `invoiceItems` generados en Adquierele.
- Gestión del límite de 5 "huecos" de cliente en Billin (patrón LRU) — necesaria solo si se
  contratase un plan con límite de clientes.
- Requiere el plan Ilimitado de Billin (20 €/mes + IVA); el plan Básico (6,6 €/mes) no da acceso a
  API. Por eso queda descartada frente al presupuesto de ≤7 €/mes.

## Capabilities

### New Capabilities

- `billing-integration`: cumplimiento VERI*FACTU (registro encadenado, firma, QR, archivo local) y,
  como alternativa documentada, sincronización de clientes/facturas con Billin vía API.

### Modified Capabilities

(ninguna todavía — este change no toca `budgets`, `billing` (vista actual) ni `expenses`; cuando se
implemente, `BillingView`/`useProjectSubcollections` incorporarán la llamada a la nueva integración,
pero eso se especificará en el momento de iniciar el desarrollo real)

## Impact

- Afecta (a futuro): nuevas Firebase Functions (backend) para generar el registro encadenado,
  firma y QR; nueva colección Firestore para el archivo local de facturas emitidas y la cadena de
  hashes; cambios en `useProjectSubcollections`/`BillingView`/`InvoicePreviewModal` para incorporar
  el QR y los datos de verificación en el documento que ve el cliente.
- No afecta: estructura actual de `budgetItems`, catálogo jerárquico, calendario, ni gastos.
- Coste: 0 €/mes de proveedor externo con la Opción B (solo desarrollo inicial); la alternativa de
  integrar con Billin costaría 20 €/mes + IVA (plan Ilimitado, único con acceso a API), por lo que
  queda descartada frente al presupuesto de ≤7 €/mes.
- Riesgo principal: la autodeclaración de cumplimiento VERI*FACTU es responsabilidad propia — un
  fallo en el encadenado de hashes, la firma o el registro de eventos invalidaría esa declaración.
  Se recomienda validar el diseño técnico con una asesoría fiscal familiarizada con el RRSIF antes
  de darlo por operativo.
- Este change permanece en estado `future`/bloqueado hasta que se resuelvan los "Open Questions" en
  `design.md`. No se debe iniciar implementación (`/opsx:apply`) hasta entonces.
