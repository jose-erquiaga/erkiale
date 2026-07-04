## ADDED Requirements

### Requirement: Admin-only structure management panel
The system SHALL provide a dedicated panel to manage the full hierarchy (Gremios → Estancias →
Tipos → Subcategorías → Ítems) used by Catálogo and Presupuestos. Access to create, edit, delete,
and reorder any level SHALL be restricted to the admin user (the same admin check already used
elsewhere in the app).

#### Scenario: Non-admin cannot access the structure manager
- **WHEN** a non-admin user attempts to open or use the structure manager panel
- **THEN** the action is blocked and the user is informed only the admin can manage the structure

#### Scenario: Admin manages any level
- **WHEN** the admin user opens the structure manager
- **THEN** they can create, edit, delete, and reorder Gremios, Estancias, Tipos, Subcategorías, and
  Ítems from a single tree/list interface

### Requirement: Tree-based reordering interface
The structure manager SHALL present the hierarchy as a tree/list with reordering controls (e.g.
up/down arrows or drag-and-drop) rather than a plain form, so relative order within a level is
preserved and editable.

#### Scenario: Reordering siblings
- **WHEN** the admin reorders two Estancias within the same Gremio
- **THEN** the new order is persisted and reflected wherever that Gremio's Estancias are listed
  (catalog creation, budget creation)

### Requirement: Cascading delete
Deleting a node at any level SHALL delete all descendant nodes and catalog ítems nested beneath it.
Budget and invoice items already copied from catalog ítems SHALL NOT be affected by a subsequent
catalog/structure deletion, since they are independent copies.

#### Scenario: Deleting a Gremio cascades
- **WHEN** the admin deletes a Gremio that has Estancias, Tipos, Subcategorías, and catalog ítems
  beneath it
- **THEN** all of those descendant nodes and ítems are deleted, after the admin confirms the
  cascading impact (e.g. a count of affected ítems shown before confirming)

#### Scenario: Existing budget items survive catalog deletion
- **WHEN** a catalog ítem previously copied into a budget is later deleted from the catalog
  (directly or via cascading structure deletion)
- **THEN** the budget item that was copied from it remains unchanged and fully usable
