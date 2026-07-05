## ADDED Requirements

### Requirement: Sincronización de clientes con Billin
El sistema SHALL permitir crear, editar y borrar clientes en Billin vía API a partir de los datos
de cliente de un `Project` en Adquierele, sin requerir introducción manual en el panel de Billin.

#### Scenario: Cliente nuevo sin hueco asignado en Billin
- **WHEN** se genera la primera factura de un proyecto cuyo cliente no tiene hueco asignado en
  Billin y hay al menos un hueco libre
- **THEN** el sistema crea el cliente en Billin vía API y registra el mapeo cliente↔hueco en
  Firestore junto con la fecha de uso

#### Scenario: Límite de huecos alcanzado (patrón LRU)
- **WHEN** se genera una factura para un cliente sin hueco asignado y no hay ningún hueco libre en
  Billin
- **THEN** el sistema identifica el hueco usado hace más tiempo, borra ese cliente en Billin vía
  API, crea el nuevo cliente en su lugar, y actualiza el mapeo interno

### Requirement: Envío de facturas a Billin
El sistema SHALL enviar/crear en Billin, vía API, las facturas generadas en Adquierele, e
incorporar en el documento visto por el cliente el número de factura oficial y los datos de
verificación Veri-Factu devueltos por la API.

#### Scenario: Generar factura y enviarla a Billin
- **WHEN** se genera una factura en Adquierele para un cliente ya sincronizado en Billin
- **THEN** el sistema envía los datos de la factura a Billin vía API y recibe el número de factura
  oficial (folio/serie) y el hash/QR de Veri-Factu

### Requirement: Archivo local permanente de facturas
El sistema SHALL mantener un archivo local propio, independiente de Billin, con los datos completos
de cada factura emitida (cliente, conceptos, importes, fecha), el número de factura devuelto por
Billin, y el hash/huella + QR de Veri-Factu devueltos por Billin. Este archivo SHALL sobrevivir al
borrado del cliente correspondiente en Billin por el patrón LRU.

#### Scenario: Borrado LRU de un cliente con facturas previas
- **WHEN** el patrón LRU borra en Billin un cliente que tiene facturas previamente enviadas
- **THEN** el archivo local de esas facturas en Adquierele permanece accesible con todos sus datos,
  independientemente del estado del cliente en Billin
