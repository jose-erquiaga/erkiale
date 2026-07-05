## 1. Validación externa (bloqueante — hacer antes de cualquier código)

- [x] 1.1 Confirmar si el plan Básico de Billin incluye acceso a la API — **confirmado: no la
      incluye**; la API requiere el plan Ilimitado (20 €/mes + IVA) o el periodo de prueba gratuito
      de 30 días.
- [ ] 1.2 Revisar `api.billin.net/docs` para confirmar soporte de CRUD completo de clientes
      (crear/editar/borrar), no solo creación de facturas.
- [ ] 1.3 Confirmar con soporte de Billin si al borrar un cliente por API, las facturas ya emitidas
      a ese cliente siguen siendo consultables en el panel de Billin, o se pierden/desvinculan.
- [ ] 1.4 Confirmar el formato exacto de la respuesta de la API respecto a numeración de factura y
      datos Veri-Factu (hash/QR listos para insertar en PDF propio, o PDF generado por el propio
      Billin).
- [ ] 1.5 Con los 3 puntos anteriores resueltos, decidir el plan definitivo a contratar (Ilimitado
      vs. mantener Básico sin API) y si el patrón LRU sigue siendo necesario.

## 2. Diseño técnico (no empezar hasta cerrar la sección 1)

- [ ] 2.1 Diseñar el esquema Firestore para el mapeo `clienteReal ↔ huecoBillin` + fecha de último
      uso (o descartarlo si el plan Ilimitado no impone límite de clientes).
- [ ] 2.2 Diseñar el esquema Firestore del archivo local permanente de facturas emitidas (datos
      completos, número oficial, hash/QR Veri-Factu), independiente del ciclo de vida del cliente
      en Billin.
- [ ] 2.3 Definir el punto de disparo de la sincronización (p. ej. tras `handleGenerateInvoice` en
      `useProjectSubcollections`) y la estrategia de reintentos/errores si la llamada a Billin falla.

## 3. Implementación (fuera de alcance hasta que las secciones 1 y 2 estén cerradas)

- [ ] 3.1 Firebase Function: crear/editar/borrar cliente en Billin vía API (con lógica LRU si
      aplica).
- [ ] 3.2 Firebase Function: enviar factura a Billin vía API a partir de `invoiceItems` + datos de
      `Project`, y persistir el archivo local (número oficial, hash/QR).
- [ ] 3.3 Integrar la llamada en `useProjectSubcollections`/`BillingView` tras generar/editar una
      factura.
- [ ] 3.4 Incorporar el número oficial y el QR/hash de Veri-Factu en `InvoicePreviewModal`.
- [ ] 3.5 Pruebas manuales end-to-end contra el entorno de pruebas de Billin (trial de 30 días)
      antes de pasar a producción.

Nota: este change queda en estado `future`. No ejecutar `/opsx:apply` hasta marcar completos todos
los ítems de la sección 1.
