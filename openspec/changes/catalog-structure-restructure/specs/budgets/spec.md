## ADDED Requirements

### Requirement: Budget creation by selecting catalog items
Adding an item to a budget SHALL follow the same navigation hierarchy as the catalog (Gremio →
Estancia → Tipo → Subcategoría), but at the final step the user SHALL select an existing catalog
ítem rather than creating one from scratch.

#### Scenario: Selecting a catalog item into a budget
- **WHEN** a user navigates Gremio → Estancia → Tipo → Subcategoría within a budget and picks an
  existing ítem
- **THEN** a copy of that ítem (concept, unit, price, and mode-specific fields) is added to the
  budget

### Requirement: Copy-on-add, independent editing
An item added to a budget from the catalog SHALL become an independent copy: editing it within the
budget SHALL NOT modify the original catalog ítem, and later changes to the catalog ítem SHALL NOT
retroactively affect budget items already copied from it.

#### Scenario: Editing a budget item does not affect the catalog
- **WHEN** a user edits the price or description of a budget item that was copied from a catalog
  ítem
- **THEN** the original catalog ítem's price/description remains unchanged

### Requirement: Ad-hoc item creation from a budget
Users SHALL be able to create a new item directly within a budget without first going through the
catalog, with an option to also save that new item to the catalog for future reuse.

#### Scenario: Creating an item inline and saving to catalog
- **WHEN** a user creates a new item directly from a budget and checks "guardar en catálogo"
- **THEN** the item is added to the budget AND a corresponding catalog ítem is created under the
  chosen Gremio/Estancia/Tipo/Subcategoría

#### Scenario: Creating an item inline without saving to catalog
- **WHEN** a user creates a new item directly from a budget without choosing to save it to the
  catalog
- **THEN** the item is added only to that budget and no catalog ítem is created

### Requirement: Tareas/Material split in budget display
Budget items SHALL be displayed in two separate lists, Tareas and Material, based on the Tipo of
the catalog ítem (or ad-hoc item) they originate from. Items SHALL NOT be mixed in a single list.

#### Scenario: Viewing a budget with mixed item types
- **WHEN** a budget contains both "Tareas a realizar" and "Material" items
- **THEN** the budget view renders them in two separate lists labeled Tareas and Material
