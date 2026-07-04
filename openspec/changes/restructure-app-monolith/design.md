## Context

`src/App.tsx` (~3000 lines) currently contains: Firebase/Firestore init, domain types, seed/constant
data, all `useState`/`useEffect` state and Firestore listeners, all CRUD handlers (budget, invoice,
expense, catalog, calendar, projects, settings), and the JSX for every view. Several views
(`ProjectsView`, `BudgetView`, `CalendarWidget`, `BillingView`, `ExpensesView`) are already
extracted as *nested* arrow functions inside `App`, but they capture state and handlers via
closure rather than props — so they cannot be moved to their own files without first threading
their dependencies explicitly.

There is no test suite; the only defined `lint` script is `tsc --noEmit`. Verification during the
refactor is manual (run the dev server, exercise each tab).

## Goals / Non-Goals

**Goals:**
- Split `App.tsx` into cohesive modules by responsibility: Firebase setup, types, seed data, hooks
  (data access + real-time sync + CRUD), and view components.
- Make each view component's data dependencies explicit (props/hooks) so it's independently
  readable and could be unit-tested later.
- Keep the change mechanical and incremental — no behavior changes, no new features, no dependency
  changes.

**Non-Goals:**
- No changes to Firestore schema, security rules, or the shape of documents.
- No introduction of a state-management library (Redux/Zustand) or routing library.
- No visual/UX changes.
- No test suite is added as part of this change (out of scope; app currently has none).

## Decisions

- **Hooks over Context for shared state**: Use one custom hook per domain
  (`useAuth`, `useProjects`, `useCatalog`, `useCalendarEvents`, `useSettings`,
  `useProjectSubcollections`) that owns its Firestore `onSnapshot` listener and exposes CRUD
  functions, rather than a single global Context/reducer. Rationale: the current code is already
  organized by domain listeners in separate `useEffect`s; hooks map 1:1 onto that existing
  structure with minimal risk, whereas a global store would be a bigger, riskier rewrite for no
  functional benefit at this stage. Alternative considered: React Context for cross-cutting state
  (selected project, auth) — still used, but only for genuinely cross-cutting values (current user,
  `selectedProjectId`), not for domain data.
- **`App.tsx` keeps top-level state for navigation/selection**: `activeTab`, `selectedProjectId`,
  and modal/editing UI state stay in `App` (or are passed down), since they're inherently
  page-level concerns, not domain data. Only Firestore-backed domain data and its CRUD operations
  move into hooks.
- **View components take props, not closures**: Each extracted view (`ProjectsView`, `BudgetView`,
  `CalendarWidget`, `BillingView`, `ExpensesView`, `CatalogView`, `DashboardView`) becomes a
  standalone function component in `src/components/` receiving the project list, relevant domain
  data, and handler callbacks as props. Alternative considered: leaving them as closures and only
  moving the top of `App.tsx` — rejected because it doesn't fix the core problem (implicit,
  untestable dependencies).
- **Firebase module stays a singleton**: `src/lib/firebase.ts` exports `app`, `db`, `auth`,
  `isFirebaseConfigured`, and `handleFirestoreError`/`OperationType`, initialized once at module
  load — same behavior as today, just relocated.
- **Incremental extraction order**: lib/firebase → types → data/seed → hooks (one domain at a
  time) → components (one view at a time) → shrink `App.tsx`. Each step keeps the app compiling
  and runnable, so regressions are caught immediately rather than accumulating across one giant
  diff.

## Risks / Trade-offs

- [Risk] Extracting closures into props-based components introduces subtle prop-drilling bugs
  (wrong id passed, stale handler) → Mitigation: extract one view at a time, manually exercise that
  tab in the browser immediately after, before moving to the next.
- [Risk] Firestore listener extraction changes effect dependency arrays and could cause duplicate
  listeners or missed unsubscribes → Mitigation: keep each hook's `useEffect` shape (dependencies,
  cleanup function) identical to the current inline version, just moved verbatim into the hook.
- [Risk] No automated tests to catch regressions → Mitigation: manual smoke test per tab after each
  extraction step (per `app-architecture` spec's behavior-parity requirement); run `npm run lint`
  (`tsc --noEmit`) after each step to catch type errors immediately.
- [Trade-off] More files/indirection for a small app — accepted because the current single-file
  size is already the pain point motivating this change.

## Migration Plan

1. Create `src/lib/firebase.ts`, `src/types/*.ts`, `src/data/*.ts` — pure extraction, no logic
   changes, `App.tsx` imports from them.
2. Create hooks in `src/hooks/` one domain at a time (auth → settings/catalog → projects →
   calendar events → project subcollections), replacing the corresponding `useEffect`/handler
   blocks in `App.tsx` with a call to the new hook. Verify after each.
3. Create view components in `src/components/` one at a time, replacing the nested closures in
   `App.tsx` with imports, passing props explicitly. Verify after each.
4. Final pass: confirm `App.tsx` only contains tab/layout composition; remove now-unused imports.
5. Rollback strategy: each step is a small, independently revertable commit; if a step breaks
   behavior, `git revert` that commit and re-attempt.

## Open Questions

- None — scope and approach are unambiguous given the existing code's clear domain boundaries.
