## Why

`src/App.tsx` has grown to ~3000 lines: Firebase init, auth, all Firestore listeners and CRUD
handlers, domain types, seed data, and the JSX for every view (dashboard, projects, budgets,
calendar, billing, expenses, catalog) live in a single component. Views like `BudgetView`,
`BillingView`, and `ExpensesView` are defined as closures nested inside `App`, capturing state
and handlers implicitly instead of receiving them as props. This makes the file hard to navigate,
impossible to unit-test in isolation, and risky to change (any edit anywhere can affect unrelated
views through shared closure state). Splitting it now, before adding more features, keeps future
changes small and reviewable.

## What Changes

- Extract Firebase/Firestore setup (app/db/auth init, `isFirebaseConfigured`, error handling) into
  `src/lib/firebase.ts`.
- Extract domain types (`Project`, `CatalogItem`, `CalendarEvent`, `BudgetItem`, `ExpenseItem`,
  `CompanyInfo`, etc.) into `src/types/*.ts`.
- Extract static seed/constant data (`CATALOG_SEED`, `DEFAULT_COMPANY`, `PROJECT_COLORS`, etc.)
  into `src/data/*.ts`.
- Extract Firestore access + real-time listeners per domain into hooks under `src/hooks/`
  (e.g. `useAuth`, `useProjects`, `useCatalog`, `useCalendarEvents`, `useProjectSubcollections`
  for budget/invoice/expense items, `useSettings`).
- Extract CRUD handlers colocated with their hooks (e.g. `useProjects` exposes `addProject`,
  `updateProject`, `deleteProject` instead of `App` holding raw `addDoc`/`updateDoc` calls).
- Extract each view (`ProjectsView`, `BudgetView`, `CalendarWidget`, `BillingView`, `ExpensesView`,
  `DashboardView`, `CatalogView`, plus shared modals) into `src/components/` as standalone
  components that receive data/handlers via props instead of closing over `App`'s scope.
  **BREAKING** (internal only): these components change from implicit closures to explicit props;
  no user-facing behavior changes.
- Reduce `App.tsx` to composition/layout: routing between tabs and wiring hooks to view props.
- No change to Firestore data shape, security rules, or UI/UX behavior.

## Capabilities

### New Capabilities
(none — this is a structural refactor, not a new product capability)

### Modified Capabilities
(none — no requirement-level behavior changes; existing product behavior for projects, budgets,
calendar, billing, expenses, and catalog stays exactly as-is)

## Impact

- Affected code: `src/App.tsx` (shrinks drastically), new files under `src/lib/`, `src/types/`,
  `src/data/`, `src/hooks/`, `src/components/`.
- `src/services/geminiService.ts` and `src/main.tsx` are unaffected.
- No changes to `firebase-applet-config.json`, `firestore.rules`, `package.json` dependencies, or
  build config.
- Risk: regressions from incorrectly wiring props/hooks during extraction. Mitigated by doing the
  refactor incrementally (one domain/view at a time) and manually verifying each tab in the running
  app after each step.
