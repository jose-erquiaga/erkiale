## 1. Data model and rules

- [ ] 1.1 Define Firestore shape for the hierarchy: `guilds/{guildId}`,
      `guilds/{guildId}/rooms/{roomId}`, fixed `tareas`/`material` type path, and
      `.../subcategories/{subcategoryId}/items/{itemId}` (per design.md decision)
- [ ] 1.2 Define the catalog ítem document shape supporting both entry modes (texto libre:
      description + price; medidas: largo/ancho/alto/m²/price), plus shared unidad/cantidad/precio
      total fields
- [ ] 1.3 Update `firestore.rules` for the new collections (admin-only writes; reads per existing
      auth pattern)
- [ ] 1.4 Add/extend TypeScript types for Guild, Room, Subcategory, CatalogItem (hierarchical),
      and the new ExpenseItem shape

## 2. Structure manager (admin panel)

- [ ] 2.1 Build the tree/list view rendering Gremios → Estancias → Tipos → Subcategorías → Ítems,
      gated by `isAdmin()`
- [ ] 2.2 Implement create/edit/delete for each level
- [ ] 2.3 Implement reordering (up/down controls) within a level, persisting order
- [ ] 2.4 Implement recursive cascade delete (bottom-up) with a confirmation dialog showing the
      count of affected descendant ítems
- [ ] 2.5 Verify: non-admin cannot access the panel; admin can create, reorder, and cascade-delete
      a branch and see the affected item count before confirming

## 3. Catalog module

- [ ] 3.1 Build the catalog navigation flow: Gremio → Estancia → Tipo → Subcategoría, with inline
      "add new Gremio/Estancia" affordances
- [ ] 3.2 Build the ítem creation form with the texto libre / medidas toggle and dynamic fields
      (including computed total m²)
- [ ] 3.3 Verify: creating items in both modes, independent subcategory lists per Tipo, inline
      Gremio/Estancia creation

## 4. Budgets module

- [ ] 4.1 Replace ad-hoc/flat item picking with hierarchy-based selection (Gremio → Estancia →
      Tipo → Subcategoría → Ítem) that copies the selected catalog item into the budget
- [ ] 4.2 Implement ad-hoc item creation from within a budget, with an option to also save it to
      the catalog
- [ ] 4.3 Add `tipo` (tareas/material) to budget items and split the budget view into two lists
- [ ] 4.4 Verify: adding from catalog copies correctly (editing the budget item doesn't affect the
      catalog item and vice versa), ad-hoc creation with/without "save to catalog" both work,
      Tareas/Material lists render separately

## 5. Billing

- [ ] 5.1 Update the invoice view to group items into Tareas/Material lists, inheriting `tipo`
      from the source budget items
- [ ] 5.2 Verify invoice totals and generation logic are unchanged; only the display groups items

## 6. Expenses module

- [ ] 6.1 Rework the expense creation form to the new field order: Tipo → Fecha → Proveedor →
      Concepto → Cantidad → Forma de pago
- [ ] 6.2 Implement conditional Cantidad: Base + IVA fields when Tipo = Material, single amount
      when Tipo = Trabajo a realizar
- [ ] 6.3 Update the expense list/edit/delete views to read/display the new fields
      (tipo, provider, paymentMethod, base/iva or direct amount)
- [ ] 6.4 Verify: creating, editing, and listing expenses of both types, with each forma de pago
      option

## 7. Final verification

- [ ] 7.1 Run `npm run lint` (`tsc --noEmit`) and fix any type errors
- [ ] 7.2 Manual pass over catalog, structure manager, budgets, billing, and expenses end-to-end
      with the running app, confirming no regression in any pre-existing screen
