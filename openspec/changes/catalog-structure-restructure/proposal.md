## Why

Today catalog items are defined "on the fly" inline while building a budget, with a flat category
list. This prevents reusing items consistently across projects, gives no place to manage the
category hierarchy itself, and mixes "tasks" and "material" concepts together in budgets, invoices,
and expenses. Separating catalog management from budget creation, and formalizing a fixed 4-level
hierarchy (Gremio → Estancia → Tipo → Subcategoría → Ítem), lets items be created once and reused,
and gives admins one dedicated place to maintain the hierarchy instead of ad-hoc category/unit
lists.

## What Changes

- **New Catalog module**: catalog items are created by navigating a fixed hierarchy — Gremio
  (editable list) → Estancia (editable list) → Tipo (fixed: "Tareas a realizar" / "Material") →
  Subcategoría (editable per Tipo, independent lists for Tareas vs Material) → Ítem. Each item is
  created in one of two entry modes, selected via toggle:
  - **Texto libre**: free-text description + price.
  - **Medidas**: largo, ancho, alto, total m² (calculated), + price.
  - Both modes share: unidad, cantidad, precio total.
- **Budgets module (modified)**: navigation mirrors the catalog hierarchy (Gremio → Estancia →
  Tipo → Subcategoría), but here the user **selects** an existing catalog item instead of creating
  one from scratch. Adding a catalog item to a budget **copies** it (fully editable afterward
  without affecting the original catalog item). Users can still create a new item directly from
  the budget, with an option to also save it to the catalog for reuse. Budget items are displayed
  in two separate lists: **Tareas** and **Material** (never mixed).
- **Billing (minor, no logic change)**: inherits the same visual split into Tareas / Material
  lists. Invoice generation logic from a budget stays exactly as it is today.
- **Expenses module (modified)**: new expense creation flow, in order: Tipo (Material / Trabajo a
  realizar) → Fecha → Proveedor → Concepto → Cantidad → Forma de pago (Efectivo / Tarjeta /
  Transferencia / A cuenta). **BREAKING** (data shape): when Tipo = Material, cantidad is entered
  as Base + IVA (both stored, total derived); when Tipo = Trabajo a realizar, cantidad is a single
  direct amount with no IVA breakdown.
- **New Structure Manager (admin panel)**: a dedicated panel to create, edit, delete, and reorder
  every level of the hierarchy (Gremios → Estancias → Tipos → Subcategorías → Ítems), tree/list UI
  with reordering (drag&drop or up/down controls) rather than a plain form. This panel is the only
  way to maintain the Gremio/Estancia/Subcategoría lists referenced by Catálogo and Presupuestos.
  Restricted to the admin user (same `isAdmin()` check already used for catalog seeding). Deleting
  a node cascades: removing a Gremio/Estancia/Tipo/Subcategoría also deletes every catalog item
  nested under it. Existing budget/invoice items are unaffected by catalog deletions, since they
  are already independent copies made at the time they were added to a budget.
- No existing screen or functionality is removed except what becomes obsolete by this
  restructuring itself: inline catalog-item creation from within a budget (superseded by the new
  Catalog module + "create and optionally save to catalog" flow).
- No data migration: the new catalog hierarchy starts empty; existing flat catalog/category/unit
  data is left as-is and superseded going forward (not migrated into the new hierarchy).

## Capabilities

### New Capabilities
- `catalog-management`: hierarchical catalog (Gremio/Estancia/Tipo/Subcategoría/Ítem), texto
  libre vs. medidas entry modes.
- `structure-manager`: admin panel for CRUD + reorder of the Gremio/Estancia/Tipo/Subcategoría
  hierarchy, with cascade delete.
- `budgets`: budget creation by selecting catalog items (copy-on-add), Tareas/Material split,
  inline "create new + optionally save to catalog".
- `billing`: invoice display split into Tareas/Material (generation logic unchanged).
- `expenses`: new expense creation flow with Tipo-dependent IVA breakdown and forma de pago.

### Modified Capabilities
(none — no capability specs exist yet in `openspec/specs/`; the capabilities above formalize
current + changed behavior for the first time)

## Impact

- Affected code: catalog UI/handlers, budget UI/handlers, billing display, expense UI/handlers,
  plus a new structure-manager admin screen and its Firestore-backed hierarchy data.
- Firestore: new collections/subcollections for the Gremio→Estancia→Tipo→Subcategoría→Ítem
  hierarchy; expense documents gain Tipo, IVA breakdown fields (when Material), and forma de pago;
  budget/invoice items gain a Tareas/Material classification (inherited from the catalog item they
  were copied from).
- Out of scope for this change: the future Billin invoicing API integration described in the
  source proposal (client CRUD + invoice submission via Billin's API) — explicitly deferred,
  pending confirmation of API access on Billin's plan, and will be its own future change.
- Open items intentionally deferred to design/implementation: exact Firestore schema/collection
  layout for the new hierarchy, and UI details of the tree/reorder control.
