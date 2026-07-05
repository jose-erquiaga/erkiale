## Why

Hoy, cuando se genera una factura en Adquierele (ERKIALE) desde una obra, los datos del cliente y
de la factura se introducen manualmente en Billin (TeamSystem Facturas Billin) para obtener el
número de factura oficial y el reporte fiscal Veri-Factu/TicketBAI. Con integración directa vía
API, Adquierele podría crear/actualizar clientes y enviar facturas a Billin automáticamente,
eliminando la doble entrada de datos y el riesgo de discrepancias entre lo que ve el cliente en
Adquierele y lo que queda registrado en Billin.

Este change queda documentado como propuesta a **futuro**: no forma parte de la reestructuración
actual de catálogo/presupuestos/gastos, y tiene dependencias externas (plan de Billin, comportamiento
de su API) que deben confirmarse antes de poder estimar o empezar el desarrollo.

## What Changes

- Crear/editar/borrar clientes en Billin vía API desde Adquierele, a partir de los datos de cliente
  ya existentes en `Project` (`clientName`, `clientCIF`, `clientAddress`, `clientEmail`,
  `clientPhone`).
- Enviar/crear facturas en Billin vía API a partir de los `invoiceItems` generados en Adquierele
  (pantalla de Facturación), en lugar de introducirlos manualmente en el panel de Billin.
- Integración API directa desde el backend (Firebase Functions), no vía MCP: la lógica de qué
  cliente crear/borrar y cuándo subir una factura es determinista (reglas de negocio), no requiere
  que un LLM decida nada en tiempo real.
- Gestión del límite de 5 "huecos" de cliente en Billin (patrón LRU): Firebase Functions mantiene en
  Firestore el mapeo cliente-real ↔ hueco-Billin + fecha de último uso; reutiliza el hueco si el
  cliente ya lo tiene, o libera el hueco usado hace más tiempo (borra ese cliente en Billin, crea el
  nuevo) si no hay ninguno libre.
- Archivo local de facturas independiente de Billin: por cada factura enviada, Adquierele guarda en
  su propia base de datos los datos completos de la factura, el número de factura devuelto por
  Billin, y el hash/huella + QR de Veri-Factu devueltos por Billin. Este archivo debe sobrevivir
  aunque el cliente correspondiente sea borrado en Billin por el patrón LRU, ya que la obligación de
  conservación de registros de facturación recae sobre el emisor (Adquierele/su usuario), no sobre
  Billin.
- Es Billin quien genera el número de factura oficial (folio/serie) al recibir los datos vía API,
  no Adquierele; la respuesta de la API se incorpora al documento que ve el cliente desde Adquierele.

## Capabilities

### New Capabilities

- `billing-integration`: sincronización de clientes y facturas de Adquierele hacia Billin vía API,
  incluyendo gestión del límite de clientes (LRU) y archivo local de trazabilidad fiscal.

### Modified Capabilities

(ninguna todavía — este change no toca `budgets`, `billing` (vista actual) ni `expenses`; cuando se
implemente, `BillingView`/`useProjectSubcollections` incorporarán la llamada a la nueva integración,
pero eso se especificará en el momento de iniciar el desarrollo real)

## Impact

- Afecta (a futuro): nuevas Firebase Functions (backend), nueva colección Firestore para el mapeo
  cliente↔hueco-Billin y el archivo local de facturas emitidas, y cambios en
  `useProjectSubcollections`/`BillingView` para disparar el envío a Billin tras generar/editar una
  factura.
- No afecta: estructura actual de `budgetItems`, catálogo jerárquico, calendario, ni gastos.
- Coste: requiere plan Ilimitado de Billin (20 €/mes + IVA) para acceso a API en producción — el
  plan Básico (6,6 €/mes) **no** incluye acceso a API (confirmado en la documentación oficial de
  Billin). El periodo de prueba gratuito de 30 días sí da acceso completo a la API.
- Riesgo principal: no está confirmado si borrar un cliente en Billin (patrón LRU) desvincula o
  hace inconsultables desde el panel de Billin las facturas ya emitidas a ese cliente. Esto es
  bloqueante para el diseño final del patrón LRU y debe resolverse con soporte de Billin antes de
  implementar.
- Este change permanece en estado `future`/bloqueado hasta que se resuelvan los "Open Questions" en
  `design.md`. No se debe iniciar implementación (`/opsx:apply`) hasta entonces.
