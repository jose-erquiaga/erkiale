## ADDED Requirements

### Requirement: New expense creation flow
Creating an expense SHALL follow this field order: Tipo (Material / Trabajo a realizar) → Fecha →
Proveedor → Concepto → Cantidad → Forma de pago (Efectivo / Tarjeta / Transferencia / A cuenta).

#### Scenario: Creating an expense
- **WHEN** a user fills out a new expense
- **THEN** they provide Tipo, Fecha, Proveedor, Concepto, Cantidad, and Forma de pago, in that
  order

### Requirement: Tipo-dependent cantidad breakdown
When Tipo is "Material", the Cantidad field SHALL be entered as Base + IVA, with the total derived
from both. When Tipo is "Trabajo a realizar", Cantidad SHALL be a single direct amount with no IVA
breakdown.

#### Scenario: Material expense shows Base + IVA
- **WHEN** a user selects Tipo "Material" while creating an expense
- **THEN** the form shows separate Base and IVA fields, and computes the total from them

#### Scenario: Trabajo a realizar expense shows direct amount
- **WHEN** a user selects Tipo "Trabajo a realizar" while creating an expense
- **THEN** the form shows a single Cantidad field with no IVA breakdown, and no IVA fields are
  submitted

### Requirement: Forma de pago selection
Every expense SHALL record a Forma de pago, chosen among: Efectivo, Tarjeta, Transferencia, A
cuenta.

#### Scenario: Recording an expense payment method
- **WHEN** a user submits a new expense
- **THEN** they must have selected exactly one Forma de pago from Efectivo, Tarjeta,
  Transferencia, or A cuenta
