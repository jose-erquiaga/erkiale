## Context

Today `catalog` is a flat Firestore collection (`category`, `concept`, `unit`, `price`), and
`categories`/`units` are simple string arrays stored in `settings/global`. Budget items are created
either by picking a flat catalog item and a quantity (`handleAddBudgetItem`) or, implicitly,
never truly "from scratch" in the current code — this proposal introduces genuine from-scratch
creation plus the new hierarchy. Expenses (`expense_items`) currently have a flat shape (`concept`,
`qty`, `price`, `total`, `date`, `category`, `unit`). There is no concept of Gremio/Estancia/Tipo/
Subcategoría anywhere yet, and no admin structure-management UI.

This design builds on the `restructure-app-monolith` change (hooks/components split). If that
change has not been applied yet, this work should still follow the same module boundaries
(`src/hooks/`, `src/components/`, `src/types/`) rather than adding more inline state to `App.tsx`.

## Goals / Non-Goals

**Goals:**
- Model the 4-level hierarchy (Gremio → Estancia → Tipo → Subcategoría) plus Ítem in Firestore in a
  way that supports independent Tareas/Material subcategory lists, cascade delete, and reordering.
- Give budgets a "select from catalog, copy on add, or create ad-hoc" flow with Tareas/Material
  display split.
- Ship an admin-only structure manager with tree UI + reordering.
- Update the expense flow and data shape (Tipo, conditional Base+IVA, forma de pago).
- Keep invoice generation logic unchanged; only its display groups by Tareas/Material.

**Non-Goals:**
- No migration of existing flat `catalog`/`categories`/`units` data into the new hierarchy — the
  new structure starts empty and is populated by the admin via the structure manager and catalog
  module.
- No Billin API integration (explicitly deferred to a future change).
- No change to Firestore security model beyond adding admin checks consistent with the existing
  `isAdmin()` pattern (client-side gate); if stricter server-side enforcement via `firestore.rules`
  is desired, that's a follow-up, not blocking this change.

## Decisions

- **Hierarchy as nested Firestore subcollections**: model as
  `guilds/{guildId}` → `rooms/{roomId}` (estancias, nested under a guild since estancias like
  "Baño 1" are scoped per Gremio per the doc's structure) → for Tipo, since it's a fixed 2-value
  enum (not user-editable), store it as a field/subpath rather than a collection:
  `guilds/{guildId}/rooms/{roomId}/types/{tarea|material}/subcategories/{subcategoryId}/items/{itemId}`.
  Rationale: mirrors the fixed navigation exactly, makes cascade delete a matter of deleting a
  subtree, and keeps Tipo's two values from ever needing their own CRUD (they're fixed, not
  user-editable, per the proposal). Alternative considered: a flat `catalog_items` collection with
  `guildId`/`roomId`/`type`/`subcategoryId` fields and a separate `structure` collection for the
  tree — simpler queries (no deep subcollection paths) but loses atomic cascade-delete-by-prefix
  and requires manual fan-out deletes anyway with Firestore's client SDK, so the nesting doesn't
  cost much extra complexity while making the tree UI's reads more natural (list children of a
  node = list a subcollection).
  **Open question below**: confirm this nesting depth is acceptable given Firestore client SDK has
  no true recursive delete — cascade delete must still be implemented as an explicit recursive
  client-side delete (collect all descendant doc refs, batch-delete). This is true regardless of
  flat vs. nested modeling, so it doesn't change the recommendation.
- **Tipo as a fixed enum, not editable**: only Gremio, Estancia, and Subcategoría are
  user-editable lists; Tipo is always exactly `tareas` / `material`, matching the proposal's
  "selección exclusiva" language (not "editable list").
- **Copy-on-add via plain object spread**: adding a catalog item to a budget copies its fields into
  a new `budget_items` doc (same pattern as today's `handleAddBudgetItem`), with no reference back
  to the catalog item's id — this is what already guarantees catalog edits/deletes never affect
  existing budget items.
- **Budget/invoice `tipo` field for Tareas/Material split**: `budget_items` and `invoice_items`
  gain a `tipo: 'tareas' | 'material'` field, copied from the source catalog item (or chosen
  explicitly for ad-hoc items). The view groups by this field client-side; no change to how totals
  are summed.
- **Expense schema change**: `expense_items` gains `tipo: 'material' | 'trabajo'`,
  `provider: string`, `paymentMethod: 'efectivo'|'tarjeta'|'transferencia'|'a_cuenta'`, and
  conditionally `base`/`iva` (when `tipo === 'material'`) instead of a single `price`; `total` is
  derived (`base + iva` for material, direct amount for trabajo). `category`/`unit` fields from the
  old shape are dropped from the new form (superseded by Tipo + Concepto) but the Firestore schema
  change is additive/renaming, not migrated — this is a **BREAKING** change to the expense document
  shape, acceptable per the proposal since no data migration is required and expenses are typically
  short-lived records.
- **Structure manager admin gate**: reuse the existing `isAdmin()` client-side check (hardcoded
  admin email) already used for catalog seeding — consistent with current patterns, no new auth
  mechanism introduced.
- **Cascade delete implementation**: recursive client-side delete — for a given node, first
  recursively delete all descendant subcollection documents (bottom-up: items → subcategories →
  types → rooms → the node itself), batched via Firestore `writeBatch` where practical, then
  delete the node itself. The admin sees a count of affected ítems before confirming (per the
  `structure-manager` spec).

## Risks / Trade-offs

- [Risk] Deep subcollection nesting makes some queries (e.g. "all items across all guilds") more
  expensive (would require a collection group query) → Mitigation: use Firestore collection group
  queries (`collectionGroup('items')`) where a flat view across the whole catalog is needed (e.g.
  budget item search/autocomplete), instead of walking the tree every time.
- [Risk] Recursive client-side cascade delete is not atomic — a crash mid-delete could leave a
  partially-deleted subtree → Mitigation: delete bottom-up (leaves first) so a partial failure
  leaves an orphaned-but-harmless subtree (parent still exists, children already gone) rather than
  dangling child references to a deleted parent; document this as a known limitation given the
  client SDK constraints already accepted by the current codebase (no Cloud Functions).
  Only the admin can trigger this, and the doc's cascade-delete requirement already expects the
  user to be an admin exercising care after confirming the affected item count.
- [Risk] Expense schema change breaks any code path still reading old `price`/`category`/`unit`
  expense fields → Mitigation: since there's no migration and this is a fresh field set, update all
  expense read/write/display code paths (list, edit form, delete) together as one atomic step in
  implementation, not incrementally.
- [Trade-off] Building the tree/reorder UI from scratch (no drag-and-drop library currently in
  `package.json`) — start with up/down arrow reordering (no new dependency) and only add a
  drag-and-drop library if the admin finds arrows insufficient in practice.

## Migration Plan

1. Add new Firestore collections/subcollections for the hierarchy and update `firestore.rules` to
   allow admin-only writes (client-side `isAdmin()` gate plus, if desired, rule-level checks tied
   to the admin's auth email).
2. Build the structure manager (tree view, CRUD, reorder, cascade delete) first, since catalog and
   budget creation both depend on having Gremios/Estancias/Subcategorías to select.
3. Build the Catálogo module (hierarchy navigation + item creation, texto libre/medidas toggle).
4. Update the Budget module: hierarchy-based item selection + copy-on-add + ad-hoc creation +
   Tareas/Material split display.
5. Update Billing display to group by Tareas/Material (no logic change).
6. Update the Expense module: new flow, new fields, Tipo-dependent Base+IVA.
7. Manual verification pass across catalog, structure manager, budgets, billing, and expenses.
8. Rollback: since there's no data migration, reverting is a matter of reverting the code commits;
   any test data created in the new Firestore collections during development can be deleted
   without affecting existing `catalog`/`categories`/`units`/`expense_items` data (untouched).

## Open Questions

- Confirm the nested-subcollection modeling (vs. flat collection + `structure` metadata
  collection) is acceptable given it requires collection-group queries for any flat/global view of
  catalog items (e.g. search across all items). If a flat catalog search is a hard requirement,
  reconsider a flat `catalog_items` collection with parent-id fields instead.
- Whether `firestore.rules` should also enforce admin-only writes at the rules level (defense in
  depth) or if the client-side `isAdmin()` gate is sufficient for this app's threat model, matching
  how `handleSeedCatalog` is gated today.
