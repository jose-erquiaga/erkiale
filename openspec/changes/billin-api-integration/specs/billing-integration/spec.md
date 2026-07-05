## ADDED Requirements

### Requirement: Registro de facturación encadenado (VERI*FACTU)
El sistema SHALL generar, para cada factura emitida, un registro de facturación con identificador
único (UUID), hash del registro anterior (encadenado criptográfico), y firma electrónica propia,
de forma que ninguna factura pueda alterarse o eliminarse sin dejar rastro.

#### Scenario: Emitir una factura
- **WHEN** se genera una factura en Adquierele
- **THEN** el sistema crea un registro de facturación encadenado al anterior, con hash y firma
  propios, antes de mostrar el documento al usuario

### Requirement: Código QR y verificación
El sistema SHALL incorporar en cada factura un código QR generado a partir de los datos de
verificación del propio sistema, que permita comprobar su autenticidad e integridad.

#### Scenario: Ver o descargar una factura
- **WHEN** el cliente visualiza o descarga una factura desde `InvoicePreviewModal`
- **THEN** el documento incluye el QR de verificación correspondiente al registro de facturación
  generado para esa factura

### Requirement: Registro de eventos inmutable
El sistema SHALL mantener un registro de eventos (altas, anulaciones, exportaciones) del propio
sistema de facturación, con los mismos requisitos de integridad que el registro de facturación.

#### Scenario: Anular o corregir una factura
- **WHEN** se anula o corrige una factura ya emitida
- **THEN** el sistema añade un evento al registro de eventos inmutable, sin modificar ni eliminar
  el registro de facturación original

### Requirement: Archivo local permanente de facturas
El sistema SHALL mantener un archivo local propio con los datos completos de cada factura emitida
(cliente, conceptos, importes, fecha), su hash/huella y su QR, como fuente de verdad para la
obligación de conservación de registros de facturación que recae sobre el emisor.

#### Scenario: Consultar el histórico de facturación
- **WHEN** se necesita consultar o exhibir el histórico de facturas emitidas (p. ej. ante una
  inspección)
- **THEN** el archivo local de Adquierele contiene todos los datos y elementos de verificación sin
  depender de ningún proveedor externo

### Requirement: Sincronización de clientes y facturas con Billin (alternativa, no activa)
Si en el futuro cambia el presupuesto disponible o la auto-implementación de VERI*FACTU resulta
inviable, el sistema MAY integrarse con Billin (TeamSystem Facturas Billin) vía API para
crear/editar/borrar clientes y enviar facturas, en lugar de generar el registro de facturación de
forma propia. Este requirement queda documentado como alternativa, no como plan activo.

#### Scenario: Límite de huecos de cliente alcanzado (solo si se activa esta alternativa)
- **WHEN** se activa la integración con Billin y se genera una factura para un cliente sin hueco
  asignado, sin huecos libres
- **THEN** el sistema identifica el hueco usado hace más tiempo (LRU), borra ese cliente en Billin
  vía API, crea el nuevo, y actualiza el mapeo interno
