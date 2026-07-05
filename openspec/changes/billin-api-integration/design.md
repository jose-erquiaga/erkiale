## Context

Adquierele (ERKIALE) genera facturas (`invoiceItems`) por proyecto a partir de un presupuesto
(`handleGenerateInvoice` en `useProjectSubcollections`), pero hoy no existe ninguna integración con
un motor de facturación electrónica homologado (Veri-Factu/TicketBAI). Billin (TeamSystem Facturas
Billin) cumple ese rol: genera el número de factura oficial y los datos de verificación Veri-Factu,
pero exige introducir clientes/facturas manualmente salvo que se use su API.

El volumen actual es bajo (5 clientes), lo que hace atractivo el plan Básico de Billin por precio,
pero **el plan Básico no incluye acceso a la API** (confirmado): la API solo está disponible en el
plan Ilimitado (20 €/mes + IVA) o durante el periodo de prueba gratuito de 30 días. Este dato
cambia el análisis coste/complejidad que motivaba originalmente el patrón LRU de 5 huecos.

## Goals / Non-Goals

**Goals:**
- Automatizar la creación de clientes y el envío de facturas a Billin desde Adquierele, eliminando
  la doble entrada de datos.
- Mantener en Adquierele un archivo local propio y permanente de cada factura emitida (datos,
  número oficial, hash/QR Veri-Factu), independiente de que el cliente siga existiendo en Billin.
- Mantener la lógica de sincronización determinista en el backend (Firebase Functions), sin
  intervención de un LLM/MCP en la decisión de qué o cuándo sincronizar.

**Non-Goals:**
- No se decide todavía el plan de Billin a contratar (Básico vs. Ilimitado) — depende de resolver
  los pendientes de este documento.
- No se implementa en este change: solo queda documentado como propuesta futura, fuera del alcance
  de la reestructuración actual de catálogo/presupuestos/gastos.
- No se sustituye el archivo/PDF generado hoy por `InvoicePreviewModal`; ese seguiría existiendo,
  potencialmente incorporando los datos devueltos por Billin (número oficial, QR) una vez conocido
  el formato exacto de respuesta de la API.

## Decisions

- **API directa desde backend, no MCP**: la lógica de qué cliente crear/borrar y cuándo subir una
  factura es determinista (reglas de negocio: 1 factura generada → 1 llamada a Billin), no requiere
  que un LLM decida nada en tiempo real. Se implementará como Firebase Functions invocadas tras
  `handleGenerateInvoice` (o un evento equivalente), no como una integración MCP.
- **Patrón LRU para el límite de huecos de cliente** (si se mantiene el plan Básico/límite bajo):
  Firestore guarda el mapeo `clienteReal -> huecoBillin` + fecha de último uso. Si el cliente de la
  factura ya tiene hueco asignado, se reutiliza. Si no tiene hueco y no hay ninguno libre, se elige
  el hueco usado hace más tiempo, se borra ese cliente en Billin vía API, se crea el nuevo, y se
  actualiza el mapeo interno.
- **Archivo local de facturas independiente de Billin**: por cada factura enviada con éxito a
  Billin, se guarda en Firestore (colección propia, no dependiente de `invoiceItems` del proyecto)
  una copia con los datos completos de la factura, el número de factura devuelto por Billin, y el
  hash/huella + QR de Veri-Factu. Este registro debe sobrevivir al borrado LRU de un cliente en
  Billin — es la fuente de verdad para la obligación de conservación de registros de facturación,
  que recae sobre el emisor y no sobre Billin.

## Risks / Trade-offs

- **[Riesgo bloqueante]** No está confirmado si al borrar un cliente por API en Billin, las
  facturas ya emitidas a ese cliente siguen siendo consultables en el panel de Billin, o se
  pierden/desvinculan. Si se pierden, el patrón LRU podría entrar en conflicto con expectativas de
  Hacienda/Veri-Factu sobre trazabilidad en el proveedor homologado, aunque Adquierele mantenga su
  propio archivo. → Mitigación: confirmar con soporte de Billin antes de implementar; si la
  respuesta es negativa, evaluar si el archivo local de Adquierele es suficiente por sí solo o si
  hace falta evitar el borrado de clientes con facturas activas.
- **[Riesgo de coste/complejidad]** El plan Básico (6,6 €/mes) no da acceso a API — hace falta el
  plan Ilimitado (20 €/mes + IVA). La diferencia (13,4 €/mes) es pequeña en términos absolutos, pero
  cambia el argumento original de "justifica la complejidad del LRU para ahorrar plan". → Con solo
  5 clientes reales hoy, conviene reevaluar si el plan Ilimitado sin límite de clientes elimina la
  necesidad del patrón LRU por completo, simplificando el diseño.
- **[Pendiente]** No está confirmado en `api.billin.net/docs` si la API soporta CRUD completo de
  clientes (crear/editar/borrar) o solo creación de facturas.
- **[Pendiente]** No está confirmado el formato exacto de la respuesta de la API respecto a
  numeración de factura y datos Veri-Factu: si el hash/QR viene listo para insertar en un PDF propio
  (compatible con `InvoicePreviewModal`), o si se espera entregar al cliente el PDF que genera el
  propio Billin (lo que obligaría a repensar la UX de descarga/envío de factura en Adquierele).

## Migration Plan

No aplica todavía — este change no se implementa hasta resolver los Open Questions. Cuando se
desbloquee, el plan previsto (a validar en su momento) sería:
1. Confirmar en el trial gratuito de 30 días de Billin los 3 pendientes de la sección siguiente.
2. Diseñar el esquema Firestore del mapeo LRU y del archivo local de facturas.
3. Implementar la Firebase Function de sincronización (cliente + factura) contra el entorno de
   pruebas de Billin.
4. Integrar la llamada tras `handleGenerateInvoice`, con manejo de errores y reintentos.
5. Incorporar en `InvoicePreviewModal`/`BillingView` el número oficial y el QR/hash devueltos.

## Open Questions

- ¿El plan a contratar será Ilimitado (con API) desde el principio, o se seguirá evaluando el plan
  Básico y otra vía para generar el número oficial/Veri-Factu? — **Resuelto parcialmente**: el
  Básico no incluye API, así que si se quiere integración automática hace falta Ilimitado.
- ¿Al borrar un cliente por API en Billin, sus facturas ya emitidas siguen siendo consultables en el
  panel de Billin? (pendiente de confirmar con soporte de Billin)
- ¿La API de Billin soporta CRUD completo de clientes (no solo creación de facturas)? (pendiente de
  revisar en `api.billin.net/docs`)
- ¿Qué formato exacto devuelve la API para el número de factura y los datos Veri-Factu (hash/QR
  listos para un PDF propio, o solo el PDF generado por Billin)? (pendiente de confirmar en la
  documentación técnica)
