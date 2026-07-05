## 1. Decisión de dirección e investigación (bloqueante — hacer antes de cualquier código)

- [x] 1.1 Confirmar si el plan Básico de Billin incluye acceso a la API — **confirmado: no la
      incluye**; la API requiere el plan Ilimitado (20 €/mes + IVA) o el periodo de prueba gratuito
      de 30 días.
- [x] 1.2 Investigar alternativas de mercado dentro del presupuesto de ≤7 €/mes con API —
      **confirmado: ningún proveedor SaaS (Billin, BeeL.es, etc.) ofrece API por debajo de
      ~15 €/mes**; el plan barato es siempre solo panel manual.
- [x] 1.3 Investigar si es legal implementar VERI*FACTU en software propio sin certificación
      externa — **confirmado: sí**; el RD 1007/2023 no exige certificación de la AEAT, se acredita
      con una declaración responsable emitida por el propio productor del software.
- [x] 1.4 Decidir dirección del change dado el presupuesto — **decidido: Opción B**
      (auto-implementación VERI*FACTU en Adquierele), descartando la integración con Billin/terceros
      por coste. Ver `design.md` sección "Alternative Paths Considered".
- [ ] 1.5 Validar con una asesoría fiscal/gestoría familiarizada con el RRSIF el diseño técnico
      antes de implementar: esquema de registro encadenado, formato del QR, elección de modalidad
      (VERI*FACTU vs no-VERI*FACTU). Bloqueante — la autodeclaración de cumplimiento es
      responsabilidad propia y un fallo técnico la invalidaría.
- [ ] 1.6 Revisar la especificación técnica completa del RRSIF/AEAT (formato XML del registro,
      algoritmo de hash/encadenado, especificación del QR, y si se elige modalidad VERI*FACTU, el
      endpoint y formato de envío a la AEAT).

## 2. Diseño técnico (no empezar hasta cerrar la sección 1)

- [ ] 2.1 Diseñar el esquema Firestore del registro de facturación encadenado: un documento por
      factura con UUID, hash del registro anterior, hash propio, firma electrónica, y timestamp.
- [ ] 2.2 Diseñar el esquema Firestore del archivo local permanente de facturas emitidas (datos
      completos: cliente, conceptos, importes, fecha, hash, QR) — fuente de verdad propia,
      independiente de cualquier proveedor externo.
- [ ] 2.3 Diseñar el registro de eventos inmutable (altas, anulaciones, exportaciones) requerido por
      el RRSIF junto al registro de facturación.
- [ ] 2.4 Decidir modalidad: VERI*FACTU (envío en tiempo real a la AEAT) vs no-VERI*FACTU (cadena
      local sin envío inmediato); si es VERI*FACTU, diseñar la llamada a la API pública de la AEAT.
- [ ] 2.5 Definir el punto de disparo de la generación del registro (p. ej. tras
      `handleGenerateInvoice` en `useProjectSubcollections`) y la estrategia de reintentos/errores.

## 3. Implementación (fuera de alcance hasta que las secciones 1 y 2 estén cerradas)

- [ ] 3.1 Firebase Function: generar el registro de facturación encadenado (hash, UUID, firma) al
      emitir una factura.
- [ ] 3.2 Firebase Function: generar el QR de verificación y, si aplica modalidad VERI*FACTU,
      enviar el registro a la AEAT.
- [ ] 3.3 Integrar la llamada en `useProjectSubcollections`/`BillingView` tras generar/editar una
      factura.
- [ ] 3.4 Incorporar el QR y los datos de verificación en `InvoicePreviewModal`.
- [ ] 3.5 Redactar y emitir la declaración responsable de cumplimiento del sistema.
- [ ] 3.6 Pruebas manuales end-to-end antes de pasar a producción.

## 4. Referencia: integración con Billin (alternativa descartada por presupuesto)

Documentado por si en el futuro cambia el presupuesto disponible o la Opción B resulta inviable en
la validación de la sección 1. No es el plan activo.

- [ ] 4.1 Revisar `api.billin.net/docs` para confirmar soporte de CRUD completo de clientes.
- [ ] 4.2 Confirmar con soporte de Billin si al borrar un cliente por API las facturas ya emitidas
      siguen siendo consultables en su panel.
- [ ] 4.3 Confirmar el formato exacto de la respuesta de la API respecto a numeración y datos
      Veri-Factu.
- [ ] 4.4 Diseñar el patrón LRU de huecos de cliente (solo si se contratase un plan con límite).

Nota: este change queda en estado `future`. No ejecutar `/opsx:apply` hasta marcar completos todos
los ítems de la sección 1.
