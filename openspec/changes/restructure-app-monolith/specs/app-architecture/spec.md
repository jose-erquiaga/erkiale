## ADDED Requirements

### Requirement: Modular source layout
The codebase SHALL organize Firebase setup, domain types, seed data, data-access hooks, and view
components into separate files under `src/lib/`, `src/types/`, `src/data/`, `src/hooks/`, and
`src/components/` instead of a single `src/App.tsx` file.

#### Scenario: App.tsx reduced to composition
- **WHEN** the refactor is complete
- **THEN** `src/App.tsx` contains only tab routing and wiring of hooks to view components, with no
  inline Firestore listener setup, no CRUD handler bodies, and no nested view-component
  definitions

#### Scenario: Views receive data via props
- **WHEN** a view component (e.g. `ProjectsView`, `BudgetView`, `BillingView`, `ExpensesView`,
  `CalendarWidget`) is rendered
- **THEN** it receives the data and callback handlers it needs as explicit props or via a hook
  it calls itself, rather than reading them from an enclosing closure

### Requirement: Behavior parity after refactor
The refactor SHALL NOT change any user-observable behavior: authentication flow, Firestore data
read/write paths, computed totals, and UI text/layout must remain identical to the pre-refactor
implementation.

#### Scenario: Manual smoke test after each extraction step
- **WHEN** a domain or view is extracted into its new module
- **THEN** the app is run locally and the affected tab (dashboard, projects, budgets, calendar,
  billing, expenses, or catalog) is exercised to confirm it behaves exactly as before
