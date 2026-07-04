## ADDED Requirements

### Requirement: Fixed 4-level catalog hierarchy
Catalog items SHALL be organized under a fixed navigation hierarchy: Gremio → Estancia → Tipo →
Subcategoría → Ítem. Tipo SHALL be an exclusive choice between "Tareas a realizar" and "Material".
Subcategorías SHALL belong to exactly one Tipo, and the subcategoría list for "Tareas a realizar"
SHALL be independent from the subcategoría list for "Material".

#### Scenario: Navigating to create an item
- **WHEN** a user opens the Catálogo module
- **THEN** they select a Gremio, then an Estancia, then a Tipo ("Tareas a realizar" or
  "Material"), then a Subcategoría scoped to that Tipo, before creating an ítem

#### Scenario: Independent subcategory lists per Tipo
- **WHEN** a subcategoría is created under Tipo "Material"
- **THEN** it does not appear as an option when Tipo "Tareas a realizar" is selected, and vice
  versa

### Requirement: Editable Gremio and Estancia lists
Users SHALL be able to add new Gremios and new Estancias while creating a catalog item, without
leaving the catalog creation flow.

#### Scenario: Adding a new Gremio inline
- **WHEN** a user does not find their Gremio in the list while creating a catalog item
- **THEN** they can add a new Gremio from the same screen and immediately select it

### Requirement: Two item entry modes
When creating a catalog ítem, the user SHALL choose between two mutually exclusive entry modes via
a toggle/checkbox: **Texto libre** or **Medidas**. The form SHALL dynamically show only the fields
relevant to the selected mode.

#### Scenario: Texto libre item
- **WHEN** a user selects "Texto libre" mode
- **THEN** the form shows a free-text description field and a price field, plus the common fields
  unidad, cantidad, and precio total

#### Scenario: Medidas item
- **WHEN** a user selects "Medidas" mode
- **THEN** the form shows largo, ancho, alto, and a total m² field computed as largo × ancho (or
  the applicable formula), plus a price field, plus the common fields unidad, cantidad, and precio
  total

#### Scenario: Switching modes clears irrelevant fields
- **WHEN** a user switches from one mode to the other while creating an item
- **THEN** fields not relevant to the newly selected mode are hidden and not submitted with the
  item
