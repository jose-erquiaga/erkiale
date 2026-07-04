## 1. Firebase, types, and static data

- [x] 1.1 Create `src/lib/firebase.ts`: move Firebase init (`app`, `db`, `auth`,
      `isFirebaseConfigured`, `googleProvider`), `OperationType`, `FirestoreErrorInfo`,
      `handleFirestoreError`, and `isAdmin` out of `App.tsx`; import them back into `App.tsx`
- [x] 1.2 Create `src/types/index.ts` (or split per domain): move `Project`, `CompanyInfo`,
      `CatalogItem`, `CalendarEvent`, `BudgetItem`, `ExpenseItem` interfaces out of `App.tsx`
- [x] 1.3 Create `src/data/catalogSeed.ts`: move `CATALOG_SEED`, `CATALOG_SEED_CATEGORIES`,
      `CATALOG_SEED_UNITS`
- [x] 1.4 Create `src/data/constants.ts`: move `DEFAULT_COMPANY`, `DEFAULT_EXPENSE_CATEGORIES`,
      `PROJECT_COLORS`
- [x] 1.5 Run `npm run lint` (`tsc --noEmit`) and run the app locally to confirm no behavior
      changed (login, dashboard load, one tab of each kind)

## 2. Auth and settings hooks

- [x] 2.1 Create `src/hooks/useAuth.ts`: move the `user`/`authReady` state, the
      `onAuthStateChanged` effect, and `handleLogin`/`handleLogout`
- [x] 2.2 Wire `useAuth` into `App.tsx`, remove the now-duplicated state/effect/handlers
- [x] 2.3 Verify: login with Google, logout, and the "Firebase not configured" fallback state
      still behave the same
- [x] 2.4 Create `src/hooks/useSettings.ts`: move the `settings/global` listener and
      `categories`/`units`/`companyInfo`/`expenseCategories` state, plus the category/unit
      "add new" handlers (rename/delete/company-info writes stay inline in `App.tsx` for now —
      they'll move naturally when the Catalog view is extracted in task 5.6, since they need
      `catalog` state that isn't in its own hook yet)
- [x] 2.5 Wire `useSettings` into `App.tsx`; verify categories/units/company editing still works

## 3. Catalog and calendar hooks

- [x] 3.1 Create `src/hooks/useCatalog.ts`: move the `catalog` collection listener and
      add/update/scan handlers (seed-catalog stays in `App.tsx`: it also writes
      `categories`/`units` via `settings/global`, a cross-domain admin action; delete-catalog-item
      stays in `App.tsx`'s shared `confirmDelete`, which spans many domains and will be revisited
      when the remaining view extractions land)
- [x] 3.2 Wire `useCatalog` into `App.tsx`; verify catalog CRUD, catalog scan, and seed-catalog
      flows
- [x] 3.3 Create `src/hooks/useCalendarEvents.ts`: move the `calendar_events` collection listener
      and `handleSaveEvent`/`handleDrop`/`handleDragOver` logic (delete-event stays in the shared
      `confirmDelete`, same as other domains)
- [x] 3.4 Wire `useCalendarEvents` into `App.tsx`; verify creating, editing, dragging, and
      deleting calendar events

## 4. Projects and per-project subcollection hooks

- [ ] 4.1 Create `src/hooks/useProjects.ts`: move the `projects` collection listener,
      `selectedProjectId` sync logic, and project add/update/delete handlers
- [ ] 4.2 Wire `useProjects` into `App.tsx`; verify creating, selecting, and deleting projects
- [ ] 4.3 Create `src/hooks/useProjectSubcollections.ts`: move the budget/invoice/expense items
      listeners (per selected project) and their add/update/delete handlers, plus
      `handleGenerateInvoice`
- [ ] 4.4 Wire `useProjectSubcollections` into `App.tsx`; verify budget items, invoice generation
      and editing, and expense tracking

## 5. View components

- [ ] 5.1 Extract `ProjectsView` into `src/components/ProjectsView.tsx`, converting closure reads
      into explicit props; verify the projects list tab
- [ ] 5.2 Extract `CalendarWidget` into `src/components/CalendarWidget.tsx` with explicit props;
      verify the company-wide and per-project calendar tabs
- [ ] 5.3 Extract `BudgetView` into `src/components/BudgetView.tsx` with explicit props; verify
      the budget tab
- [ ] 5.4 Extract `BillingView` into `src/components/BillingView.tsx` with explicit props; verify
      the billing tab, including invoice print/PDF
- [ ] 5.5 Extract `ExpensesView` into `src/components/ExpensesView.tsx` with explicit props;
      verify the expenses tab
- [ ] 5.6 Extract the dashboard and catalog view JSX (currently inline in `App.tsx`'s render)
      into `src/components/DashboardView.tsx` and `src/components/CatalogView.tsx`; verify both
      tabs
- [ ] 5.7 Extract shared modals (delete confirmation, add/edit item forms) into
      `src/components/modals/` if they are not already scoped inside the views above

## 6. Final cleanup

- [ ] 6.1 Confirm `App.tsx` contains only: hook calls, tab-routing state, and composition JSX
      wiring hooks' data/handlers to view components as props
- [ ] 6.2 Remove unused imports and dead code left behind by the extraction
- [ ] 6.3 Run `npm run lint` and `npm run build`; do a final manual pass over every tab
      (dashboard, projects, budgets, calendar, billing, expenses, catalog) to confirm full
      behavior parity with pre-refactor `App.tsx`
