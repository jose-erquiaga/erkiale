## ADDED Requirements

### Requirement: Tareas/Material split in invoice display
Invoice items generated from a budget SHALL inherit the Tareas/Material classification from their
source budget items and SHALL be displayed in two separate lists, mirroring the budget view.
Invoice generation logic (which items get copied from budget to invoice, and how totals are
computed) SHALL NOT change.

#### Scenario: Generating an invoice from a mixed budget
- **WHEN** an invoice is generated from a budget containing both Tareas and Material items
- **THEN** the invoice view displays two separate lists, Tareas and Material, with the same items
  and totals that would have resulted from the pre-existing generation logic
