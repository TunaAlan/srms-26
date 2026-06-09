# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).





## [0.6.5] - 2026-06-09

### Client Admin — Accessibility Fix: Interactive `<div>` → `<button>`

#### Motivation

E2E test authoring exposed four places where clickable `<div>` elements were used as interactive controls. These pass a visual check but break keyboard navigation (Tab/Enter), screen readers, and `getByRole('button')` queries in Playwright. All four replaced with semantic `<button>` elements; CSS reset rules added so existing styles are unaffected.

#### Changed files

| File | Element | Role |
|---|---|---|
| `NavTabs.tsx` | `.nav-tab` | Primary navigation tabs |
| `Dashboard.tsx` | review queue action card | "İncelemeye Başla" shortcut |
| `PhotoLightbox.tsx` | image zoom trigger | Opens fullscreen lightbox |
| `Topbar.tsx` | `.user-dropdown-item` | Logout menu item |

CSS: `border: none`, `background: none`, `font-family: inherit` reset added to `.nav-tab` and `.user-dropdown-item` so `<button>` default styles do not bleed through.

---

### Client Admin — Frontend Test Suite

#### Motivation

The frontend had no automated tests. Business logic in `utils.ts` and `api.ts` was verified only by manual browser testing; component interactions — confirmation dialogs, form validation, status transitions — were entirely uncovered. The suite adds two layers: unit tests for pure functions and component tests for interactive UI behaviour. E2E (Playwright) is planned but not yet implemented.

---

#### Test Categories and Methodology

| Layer | Files | Box |
|---|---|---|
| **Unit** | `utils.test.ts`, `api.test.ts` | Whitebox — all internal branches exercised with full implementation knowledge |
| **Component** | 8 `*.test.tsx` files | Whitebox — props/callbacks are the public API; internal React state is known but not inspected directly |
| **E2E** | *(planned — Playwright)* | Blackbox — browser drives the full stack, no internal knowledge assumed |

---

#### Why Vitest + React Testing Library

`client-admin` is a Vite project with `"type": "module"`. Jest requires `--experimental-vm-modules` and a `.cjs` config to run ESM — fragile and breaks on minor Node/TypeScript bumps. Vitest is Vite-native: same config file, same module resolution, zero extra glue.

React Testing Library was chosen over Enzyme because it queries the DOM the way a user would (`getByRole`, `getByPlaceholderText`) rather than by component internals. Tests survive refactors that preserve behaviour but change internal structure.

---

#### Added — Packages

- `@testing-library/react` — renders React components into jsdom.
- `@testing-library/user-event` — simulates real user interactions (full browser event sequence: pointerdown → mousedown → click).
- `@testing-library/jest-dom` — DOM-aware matchers: `toBeInTheDocument()`, `toBeDisabled()`, `toHaveTextContent()`.
- `src/__tests__/setup.ts` — imports `jest-dom` and stubs `__APP_VERSION__` (Vite's `define` replacement never runs in jsdom).
- `src/__tests__/helpers.ts` — `makeReport(overrides?)` factory; tests override only the fields relevant to each scenario.

---

#### Unit Tests

**`utils.test.ts`** — 36 tests

| Group | Coverage | Why |
|---|---|---|
| `getTimeAgo` | 5 boundary cases | `Date.now` frozen — without frozen time results are non-deterministic |
| `getStatusLabel` / `getCriticalityLabel` / `getReviewStatusLabel` / `getRoleLabel` | All known keys + unknown passthrough | Unknown keys must pass through, not blank — missing labels surface as the raw API value |
| `CATEGORY_LABEL_MAP` | All 14 AI category keys present and non-empty | Map completeness test fails immediately if the AI service adds a new category without a map entry |
| `mapReport` | 8 scenarios | `aiUnit` normalisation, `aiDescription`/`rejectReason` fallback, null JOIN fields → `null` not `undefined`, `aiPriority` → `criticality` for all 5 values |
| `getConfidenceColor` / `getConfidenceLabel` | null + 3 thresholds + rounding | `0.876` → `"88%"` verifies `Math.round` over `toFixed` |

Not covered: `mapPriority` and `_STATUS_TO_UI` are private (unexported) — tested indirectly through `mapReport`.

---

**`api.test.ts`** — 12 tests

| Group | Coverage | Why |
|---|---|---|
| `getToken` | Empty localStorage → `""` | Callers concatenate the result; `null` would produce `"null"` in the `Authorization` header |
| `logout` | Server called / skipped / token cleared even on network failure | The `finally` block must clear tokens regardless — a failed logout must not leave a live session in localStorage |
| `login` | admin ✓, review_personnel ✓, user role → throws, wrong credentials → server message | Role enforcement happens client-side after a valid 200 response |
| `apiFetch` | Successful GET + header check, 204 → null, non-ok → throws, 401 → refresh → retry, refresh failure → clears tokens | The `catch` branch inside the refresh flow was entirely invisible before this test |

Not covered: `fetchStaff`, `createStaff`, `setStaffActive`, `deleteStaff`, `retryReportAnalysis`, `changeReportStatus` — all are thin `apiFetch` wrappers with no branching logic. The meaningful surface is inside `apiFetch` itself. Concurrent 401 queue (`refreshQueue`) requires two simultaneous in-flight requests; better suited to E2E.

---

#### Component Tests

**`DeleteModal.test.tsx`** — 4 tests
Renders description, ✕ and "İptal" call `onClose`, "Sil" calls `onConfirm(report.id)`. No dynamic state — all interactions are one-shot prop callbacks; no further scenarios exist.

**`ClearAllModal.test.tsx`** — 6 tests
Covers warning render, cancel buttons, confirm call, both buttons disabled during in-flight `onConfirm` (tested with a never-resolving promise), buttons re-enabled after resolution. The loading state test is critical: the `finally` block must reset `loading` regardless of success or failure.

Not covered: `onConfirm` rejection — the component has no error UI; if error handling is added later a test should follow.

**`RejectModal.test.tsx`** — 7 tests
Submit disabled when empty, disabled for whitespace-only input (verifies `.trim()` guard — spaces would otherwise reach the backend as a non-empty `rejectReason`), enabled with valid text, `onConfirm(id, trimmedReason)`, `onClose` vs `onBack` button label swap.

**`ReviewModal.test.tsx`** — 6 tests
Pre-selected category, unit auto-derived from `CATEGORY_TO_UNIT` map (`road_damage` → `Fen İşleri`), unit updates on category change, two-step confirm flow (save → confirm screen → back → save again), `onSave` called with correct args.

**`DetailModal.test.tsx`** — 9 tests
Description render, dropdown hidden for `review_personnel` and for statuses with no transitions (`pending`), `▾` indicator visible for admin + `in_progress`, transition options appear on click, note textarea + Onayla/Vazgeç after selecting a transition, `onChangeStatus(id, status, note)` on confirm, Vazgeç dismisses panel, `rejectReason` banner for rejected reports.

Not covered: `onViewOnMap` — a presentational navigation shortcut with no state mutation; belongs in E2E.

**`InspectionModal.test.tsx`** — 8 tests
Action buttons for both roles, two-click approve flow (first click → confirm screen only; `onApprove` not called until second click — guards against misclick), `onCorrect(report)` + `onClose`, `onReject(report)` + `onClose`, back navigation from confirm screen.

**`LoginScreen.test.tsx`** — 9 tests
Email and password inputs, submit disabled for empty / partial / loading states, `onLogin(email, password)` called on submit, no call when fields empty, error message displayed.

Note: `LoginScreen` labels have no `htmlFor`/`id` association — queries use `getByPlaceholderText` instead of `getByLabelText`.

**`Dashboard.test.tsx`** — 11 tests
Admin: 7 stat cards (`container.querySelectorAll('.stat-card')`), correct total and `İncelemede` counts (queried via `.stat-label` NodeList to avoid badge ambiguity), critical count excluding resolved/rejected, `onTabChange('review')` on shortcut click.
Review personnel: hero banner with pending count, 4 reviewer KPI cards, `Toplam` absent, `onTabChange('review')` on "İncelemeye Başla", low-confidence count via `parentElement` traversal.

Not covered (by design): `Reports`, `ReviewQueue`, `PersonnelPanel` — large table components where meaningful coverage requires the full filter → sort → paginate → click workflow. That belongs in E2E, not component tests.

---

#### E2E — Playwright

Full browser test suite implemented in `e2e/` using Playwright + Chromium. Tests run sequentially (`workers: 1`) to avoid shared DB state conflicts.

| Spec file | Tests | Coverage |
|---|---|---|
| `auth.spec.ts` | 4 | Admin login, reviewer login, wrong password, citizen account rejected |
| `admin.spec.ts` | 8 | Reports tab, status filter, map view, status change, personnel CRUD (create/toggle/delete) |
| `review.personnel.spec.ts` | 6 | Queue loads, approve removes row, reject requires reason, correct saves category, confidence filter |

`seed.ts` extended with a `citizen@test.com` test user to cover the access-denied scenario in `auth.spec.ts`.

---

#### Coverage Summary

```
utils.ts        100% lines / 100% branches
api.ts           ~85% lines /  ~80% branches (thin wrappers excluded)
─────────────────────────────────────────────────────────────────
Component layer  behaviour-based (no line coverage target)
```

---

### Service Core — Delete All Reports Endpoint

#### Added
- `DELETE /reports` — destroys all report rows and removes every associated image file from disk. Restricted to `admin` role via `authorize('admin')` middleware. Returns `204 No Content` on success.
- `clearAllReports()` service function — iterates over all reports, calls `fs/promises unlink` for each `imagePath`, then calls `Report.destroy({ where: {} })`. File deletion errors are caught per-report so a missing file does not abort the batch.
- Route registered before `/:id` to prevent Express from interpreting the empty path segment as an ID parameter.

#### Changed
- `getAllReports` return type changed from `Report[]` to `PaginatedReports` — a new interface `{ data: Report[]; total: number; page: number; pageSize: number; totalPages: number }`. Accepts `page` and `pageSize` as optional query parameters; defaults to `page=1`, `pageSize=20`. Existing callers that pass `pageSize=1000` continue to receive all records in a single response.
- `ListFilter` extended with optional `page` and `pageSize` fields.

---

### Client Admin — Pagination

#### Motivation

With the report dataset growing, an unbounded list becomes unusable: every scroll interaction re-renders all rows, and the table height becomes unpredictable. Pagination caps the visible row count at a fixed `PAGE_SIZE`, keeps render cost constant, and gives users a clear position signal ("17 rapor · Sayfa 1/4").

Client-side pagination was chosen over server-side because the admin loads all records once on mount (`pageSize=1000`) and needs to filter, sort, and count locally without round-trips. The pagination layer operates on the already-filtered, already-sorted slice.

---

#### Added

**Reports tab**
- `PAGE_SIZE = 20` constant. `page` state, reset to `1` via `useEffect` whenever any filter or search query changes.
- `paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)` — table renders only the current page's rows.
- Pagination bar: ‹ prev · numbered page buttons · next › with "N rapor · Sayfa X/Y" counter. Hidden (`visibility: hidden`) when `totalPages <= 1` to hold layout position without shifting surrounding content.

**ReviewQueue tab**
- Same `PAGE_SIZE = 20` and `page` state pattern applied independently — the queue filter (confidence + category + criticality + search) resets the page counter on change.
- Pagination bar rendered below the table when `Math.ceil(queue.length / PAGE_SIZE) > 1`.

#### Changed
- `loadReports` in `App.tsx` updated to unwrap the new paginated response shape: `(res.data ?? res).map(mapReport)` — the `?? res` fallback retains compatibility if the server is running an older build.

---

### Client Admin — Delete All Reports

#### Added
- `ClearAllModal` component (`src/components/ClearAllModal.tsx`) — confirmation dialog before bulk deletion. Uses the same `modal`, `modal-header`, `modal-body`, `modal-footer`, `delete-confirm` CSS class structure as `DeleteModal`. Has an in-flight loading state ("Siliniyor…") to prevent double-submission.
- "Tümünü Sil" button in the Reports tab filter bar, visible only to `admin` role. Positioned with `marginLeft: auto` to stay at the trailing edge of the filter row.
- `showClearAllModal` boolean state and `handleClearAll` async handler in `App.tsx` — calls `DELETE /reports`, then clears local `reports` state on success.

---

### Service Core — Unit Test Coverage Expansion

#### Added
Two additional edge case tests in `tests/unit/reportService.test.ts`:

- `createReport` — fallback `update` also throws when AI is unavailable and DB is down; verifies no unhandled rejection propagates (the nested `.catch` silently swallows the second error).
- `reviewReport` — `aiCategory`, `aiPriority`, `aiUnit`, and `reviewedBy` fields are all persisted correctly when passed in a `corrected` review.

---

### Client Admin — Frontend Test Infrastructure

#### Added
- `vitest` and `@vitest/coverage-v8` added to `devDependencies`.
- `jsdom` added to `devDependencies` — provides a browser-like DOM environment for component and utility tests.
- `vite.config.ts` import changed from `vite` to `vitest/config`; `test: { environment: 'jsdom', globals: true }` block added.
- `package.json` scripts: `test` (single run via `vitest run`), `test:watch` (interactive file-watch mode).

Note: all additions are `devDependencies`. The production Docker build (`npm ci --omit=dev`) is unaffected; no server restart is needed.

---

## [0.6.4] - 2026-05-13

### Client Admin — Branding Update

#### Changed
- `LoginScreen.tsx` — `ABB` label replaced with `SRMS`; badge dimensions increased to 80×80 px with matching `line-height` and `font-size`.
- `Topbar.tsx` — top-bar logo mark updated from `ABB` to `SRMS`.

---

## [0.6.3] - 2026-05-07

### Service Core — Unit Test Suite

#### Motivation

The backend had no automated tests. With six people committing to the same codebase, regressions in auth, report lifecycle, and role enforcement were caught manually or not at all. The test suite establishes a safety net at the service and middleware layers — the two layers that contain all business logic and access control decisions.

Controllers and models are intentionally excluded. Controllers delegate entirely to services (no branching logic to assert); models are Sequelize schema definitions (testing them means testing the ORM, not our code). The meaningful surface area is services and middleware.

---

#### Why Vitest, not Jest

`service-core` is configured with `"type": "module"` and `"module": "NodeNext"` in `tsconfig.json`. Jest does not natively support ESM — running it requires `--experimental-vm-modules`, a `.cjs` config file, and additional `ts-jest` transforms. In practice this produces fragile config that breaks on minor Node or TypeScript version bumps.

Vitest supports ESM and TypeScript out of the box with zero additional transforms. It exposes an identical API (`describe`, `it`, `expect`, `vi` vs. `jest`) so there is no learning curve, and it is significantly faster on cold starts. For a `NodeNext` project, Vitest is the correct default; Jest is a workaround.

---

#### Added

**Test runner**
- `vitest` and `@vitest/coverage-v8` added to `devDependencies`.
- `vitest.config.ts` — `environment: node`, `include: tests/**/*.test.ts`, coverage scoped to `src/services/**` and `src/middleware/**`.
- `package.json` scripts: `test` (single run), `test:watch` (file-watch mode), `test:coverage` (with v8 coverage report).
- `service-core/coverage/` added to root `.gitignore`.

**Test files**

`tests/unit/authService.test.ts` — 15 tests
- `register`: successful registration returns `{ user, accessToken, refreshToken }`; duplicate email throws 409.
- `login`: successful login returns tokens; user not found throws 401; wrong password throws 401; inactive account throws 403.
- `refresh`: successful rotation returns new token pair; token not found throws 401; token revoked throws 401; token expired throws 401; user deleted from DB throws 403; user inactive throws 403.
- `logout`: `RefreshToken.update({ revoked: true })` called with correct token.
- `getProfile`: returns safe user object; missing user throws 404.

`tests/unit/auth.middleware.test.ts` — 7 tests
- `authenticate`: valid token sets `req.user` and calls `next`; missing `Authorization` header returns 401; wrong scheme (`Basic` instead of `Bearer`) returns 401; invalid/expired token returns 401.
- `authorize`: matching role calls `next`; non-matching role returns 403; `req.user` undefined (authenticate skipped) returns 403.

`tests/unit/userService.test.ts` — 9 tests
- `listStaff`: `findAll` called with `role: ['admin', 'review_personnel']` filter.
- `createStaff`: returns `toSafeJSON()` result on success; duplicate email throws 409.
- `setActive`: calls `user.update({ isActive })` on success; user not found throws 404; citizen role (`role: 'user'`) throws 400.
- `deleteStaff`: calls `user.destroy()` on success; user not found throws 404; citizen role throws 400.

`tests/unit/reportService.test.ts` — 25 tests
- `getReportById`: returns report; missing report throws 404.
- `createReport`: `reportNumber` increments from `MAX + 1`; starts at 1 when table is empty; AI-rejected image sets `status: rejected`, `reviewStatus: rejected`; AI service failure sets `aiError: true`.
- `reviewReport`: `approved` sets `status: in_progress`; `corrected` sets `status: in_progress`; `rejected` sets `status: rejected`; `staffNote` and `staffNoteBy` persisted when provided.
- `deleteReport`: calls `report.destroy()` and `unlink(imagePath)`; missing report throws 404.
- `retryAnalysis`: returns report for `pending` status; non-pending throws 400.
- `getMyReports`: `findAll` called with `{ where: { userId } }`.
- `getAllReports`: no filter; category filter; status filter (without `reviewedBy`); `reviewedBy` filter builds `Op.or` clause.
- `changeStatus`: `pending → in_review` allowed; `in_progress → resolved` allowed; `in_progress → in_review` allowed; `rejected → in_review` allowed; `in_review` transition resets `reviewStatus` and `rejectReason` to null; `pending → resolved` throws 400; `in_review → resolved` throws 400.

---

#### Edge Cases

`authService`
- `refresh`: token record exists but `user` row was deleted from DB — same 403 path as inactive user, but triggered by a missing FK target rather than a flag. Verified that `record.update({ revoked: true })` is still called before throwing, preventing the orphaned token from being reused.
- `refresh`: expired token (`expiresAt < new Date()`) — boundary checked with a date set 1 second in the past; ensures the comparison is strict rather than `<=`.

`auth.middleware`
- `authenticate`: `Authorization` header present but uses wrong scheme (`Basic token123` instead of `Bearer`) — the `startsWith('Bearer ')` guard rejects it with 401 before attempting `jwt.verify`. Catches misconfigured clients that send credentials in the wrong format.
- `authorize`: called without a preceding `authenticate` — `req.user` is `undefined`. The `!req.user` guard returns 403 rather than throwing a runtime `TypeError` on `req.user.role`.

`userService`
- `setActive` / `deleteStaff`: target user exists but has `role: 'user'` (citizen) — staff management endpoints must not affect citizen accounts. Verified 400 is thrown before any mutation.

`reportService`
- `createReport`: `MAX(reportNumber)` returns `null` (empty table) — `?? 0` fallback produces `reportNumber: 1` on the first insert. Without this test, a `null + 1 = 1` assumption would silently break if Sequelize returned `undefined` instead.
- `createReport` (AI rejected): `analyzeImage` resolves with `rejected: true` — report is set to `status: rejected` and never enters the review queue. The background promise is awaited with a 10ms flush to assert the update was called after the async fire-and-forget.
- `createReport` (AI error): `analyzeImage` rejects — `aiError: true` is set and `status` stays `pending` for admin retry. The nested `.catch` handler is exercised; without this test the fallback path was entirely invisible to coverage.
- `retryAnalysis`: report `status` is not `pending` — 400 thrown immediately without triggering `runAiAnalysis`. Prevents re-analysis of already-processed reports.
- `changeStatus`: `in_review` transition explicitly nulls `reviewStatus` and `rejectReason` — verifies that a previously rejected report is fully reset when sent back to review, not just given a new status.

---

#### Coverage

```
authService.ts       100% lines  /  95% branches
auth.ts (middleware) 100% lines  / 100% branches
userService.ts       100% lines  / 100% branches
reportService.ts      98% lines  /  80% branches
─────────────────────────────────────────────────
Overall               85% lines  /  68% branches
```

Remaining uncovered branches: `aiService.ts` (external Gemini API — not testable in isolation), `errorHandler.ts` (no business logic), `reportService` line 103 (nested `.catch` inside fire-and-forget AI call).

---

### Security — Refresh Token Architecture

#### Motivation

The previous logout implementation (0.5.0) stored revoked JWTs in an in-memory `Set`. This had three structural problems: (1) the blacklist was lost on every server restart, allowing logged-out users to reuse their tokens; (2) it assumed a single server instance — horizontal scaling would give each container its own isolated blacklist; (3) the `Set` grew indefinitely with no eviction.

The root cause was a 7-day access token lifetime. The fix is to shorten it to 15 minutes — at that window, a leaked or post-logout token becomes invalid on its own — and introduce a database-backed refresh token for session continuity. This removes the need for a blacklist entirely.

---

### Service Core (Backend)

#### Added
- `RefreshToken` model — `userId`, `token` (opaque random bytes), `expiresAt`, `revoked`. `revoked` is a soft-delete flag rather than a hard delete to preserve the audit trail of terminated sessions.
- `POST /auth/refresh` — validates the refresh token (existence, `revoked`, `expiresAt`, `user.isActive`), issues a new access token, and rotates the refresh token. Rotation ensures a stolen refresh token is invalidated the moment the legitimate user next refreshes.
- `user.isActive` check in the refresh handler — a suspended account is locked out within 15 minutes (the remaining access token lifetime) without blacklist lookups on every request.
- `JWT_REFRESH_SECRET` — refresh tokens are signed with a separate secret; compromise of one does not affect the other.

#### Changed
- `JWT_EXPIRES_IN` default: `7d` → `15m`.
- `login` / `register` response: `{ user, token }` → `{ user, accessToken, refreshToken }`.
- `logout` — from in-memory `Set` insertion to `RefreshToken.update({ revoked: true })`.
- `authenticate` middleware — `isBlacklisted` call removed; middleware now only verifies JWT signature and expiry.

#### Removed
- `tokenBlacklist.ts` — no longer needed.

#### Infrastructure
- `docker-compose.yml` and `.env` files updated with `JWT_REFRESH_SECRET` and `JWT_REFRESH_EXPIRES_IN`.

---

### Client Mobile

#### Changed
- `accessToken` and `refreshToken` stored separately in `expo-secure-store`.
- Axios `401` interceptor automatically calls `POST /auth/refresh`, rotates tokens, and retries the original request — user sees no interruption. Concurrent `401`s are queued and retried together once the single refresh resolves.
- `logout` sends `refreshToken` to the server before clearing local storage.

---

### Client Admin

#### Changed
- `srms_token` (access) and `srms_refresh_token` (refresh) stored as separate `localStorage` keys.
- `apiFetch` extended with automatic `401` refresh + retry, mirroring the mobile logic.
- `logout` sends `refreshToken` to `POST /auth/logout` before clearing `localStorage`.
- `handleLogin`: `data.token` → `data.accessToken` + `data.refreshToken`.

---

## [0.6.2] - 2026-05-04

### Service Core (Backend)

#### Fixed
- `GET /reports` now enforces role-based filtering for `review_personnel` — returns only `status=in_review` reports plus reports where `reviewedBy=req.user.id`. Previously the backend returned all reports regardless of role, relying solely on the UI to restrict the view (security through obscurity). The constraint is now enforced at the data layer.
- `ListFilter` extended with `reviewedBy` field; `getAllReports` uses `Op.or` to combine queue and personal history in a single query.

---

### Client Admin

#### Changed
- Review personnel dashboard KPI cards updated: "Onaylandı / Düzeltildi / Reddedildi" replaced with "Onayladıklarım / Düzelttiklerim / Reddettiklerim" — counts now reflect the reviewer's own decisions (via `reviewedBy` filtered data) rather than system-wide totals, which would always show 0 after the backend role filter was applied.

#### Fixed
- "Düzelt" button added to reviewer dashboard priority table — previously reviewers could only approve or reject from the dashboard; correction required navigating to the review queue. `onCorrect` prop added to `Dashboard` component and wired in `App.tsx`.
- Priority table header now shows the real `reviewPending` count instead of the capped slice length — table shows top 5 by criticality, with "ilk 5 gösteriliyor" note when there are more.
- Admin dashboard KPI grid expanded from 5 to 7 cards: `in_review` (İncelemede) and `rejected` (Reddedildi) statuses were previously invisible.
- Critical count now excludes `resolved` and `rejected` reports — previously all critical reports regardless of status were counted, inflating the metric.
- Category distribution percentage now calculated against `categoryTotal` (non-pending reports) instead of `total` — previously `pending` reports were excluded from the chart but included in the denominator, causing percentages to not sum to 100%.
- İncelemede and Reddedildi KPI cards corrected from `borderTop` to `borderLeft` to match the visual style of all other stat cards.
- Kritik (Aktif) KPI label renamed to "Kritik Öncelikli" — the previous label implied a status rather than a priority level.
- `in_progress` reports no longer show a "Reddet" button in DetailModal — rejection at this stage is incorrect since the report has already passed reviewer approval. Admin should use "Tekrar İncelemeye Al" instead.
- `rejectReason` now shown as a red banner with ✕ icon in the reports list for `rejected` reports — previously only visible inside the detail modal, requiring admin to open each rejected report individually.
- `resolution-note` banner color now context-aware: amber for admin re-open notes (`status=in_review` + `staffNoteBy` set), green for all other staff notes (reviewer corrections, resolution notes). Previously all notes were the same color regardless of context.

#### Added
- `staffNoteBy` UUID field added to `Report` model — stores the user ID of whoever wrote the `staffNote`. Set server-side in both `reviewReport` (reviewer corrections) and `changeStatus` (admin re-open with note).
- `staffNoteAuthor` JOIN added (`Report.belongsTo(User, { as: 'staffNoteAuthor' })`) — `staffNoteAuthorName` and `staffNoteAuthorRole` returned in `GET /reports` and `GET /reports/:id`.
- `reportNumber` INTEGER field added to `Report` model — unique, human-readable report identifier. Assigned via `MAX(reportNumber) + 1` in `createReport` (PostgreSQL `SERIAL` type rejected by `sync({ alter: true })` on existing tables). Existing reports retain `null`; only new reports receive a number.
- Note banners show directional label: `↩ Admin → İnceleme:` when `staffNoteBy` is set and status is `in_review`, otherwise `✎` for reviewer/resolution notes. Visible in Reports list and Review Queue.
- `InspectionModal` and `DetailModal` "PERSONEL NOTU" section shows note author `👤 İsim Soyisim (Rol)` — previously anonymous. Color context-aware: amber for admin re-open notes, green for reviewer/resolution notes.
- `DetailModal` and `InspectionModal` "RET SEBEBİ" section shows who rejected `👤 İsim Soyisim (Rol)` — via `reviewedByName` and `reviewedByRole` (`role` added to `REVIEWER_INCLUDE` attributes).
- `#reportNumber` column added to Reports list, Review Queue, Dashboard "Son 5 Rapor" table, `DetailModal` title, and `InspectionModal` title. Shows `—` when null. Search supports `#1042` or `1042` — `#` prefix stripped before matching.

---

## [0.6.1] - 2026-05-01

### Service Core (Backend)

#### Added
- `aiError` boolean field on `Report` model — set to `true` when AI analysis fails, cleared on success or retry.
- `POST /reports/:id/retry` endpoint (admin only) — triggers a new AI analysis attempt for reports stuck in `pending` with `aiError: true`.
- `runAiAnalysis` extracted as a shared helper used by both `createReport` and `retryAnalysis` — eliminates duplicated AI callback logic.
- `staffNote` is now explicitly cleared (`null`) when a report is sent back to `in_review` without a note — previously the old note from a prior review cycle would persist.

---

### Client Admin

#### Added
- Review queue: staff note shown as an amber banner beneath the description for reports that have been re-opened by admin.
- Reports list: "Analiz başarısız" label shown in red when `aiError` is true, replacing the misleading "Analiz bekleniyor..." label.
- Reports list: "↻ Yeniden Analiz" button shown next to the delete button for failed reports — triggers `POST /reports/:id/retry`.

#### Fixed
- Review status badge and reviewer name are now displayed inline — previously the reviewer name rendered below the badge, making the info card disproportionately tall.
- `rejectReason` shown as description for troll-rejected reports — previously "Analiz bekleniyor..." was shown because `aiDescription` was empty.

---

### Client Mobile

#### Fixed
- Keyboard was covering the description `TextInput` on the report submission screen — wrapped in `KeyboardAvoidingView` with platform-aware behavior (`padding` on iOS, `height` on Android).

---

## [0.6.0] - 2026-05-01

### AI Service

#### Changed
- Local files restored to match server-deployed ONNX v0.9.1 pipeline — local copy had drifted to a PyTorch-based implementation that crashed at startup with `ModuleNotFoundError: No module named 'torch'`.
- `model.py` ONNX path corrected from `text_classifier_v9.onnx` to `text_classifier_v0.9.1.onnx`.
- `requirements.txt` restored: `onnxruntime>=1.20.0`, `numpy>=1.24.0`; PyTorch dependency removed.
- `ClassifyRequest` extended with `report_id: str = "unknown"` for traceability in logs.

---

### Service Core (Backend)

#### Changed
- `status` enum redesigned: `pending → in_review → in_progress → resolved / rejected`. The `in_review` value moved from `reviewStatus` to `status` — it is a lifecycle state, not a review decision.
- `reviewStatus` enum narrowed to `approved | corrected | rejected` (removed `in_review` — it was never a valid reviewer decision).
- AI callback: on successful analysis, report transitions to `in_review` (previously `in_progress`) — the report now waits for human review before becoming actionable.
- `changeStatus` allowed transitions extended: `rejected → in_review` (admin re-open) and `in_progress → in_review` (admin send back to review).
- `rejectReason` field type corrected to `CreationOptional<string | null>` — was `CreationOptional<string>`, causing a TypeScript compile error when assigning `null`.

#### Added
- `reviewedBy` UUID field on `Report` model — stores the ID of the staff member who made the review decision. Set server-side from `req.user.id` on every review action; not writable by the client.
- `Report.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' })` association — `GET /reports` returns `reviewedByName` via JOIN without a separate lookup.
- `AiResult` interface extended with `rejected: boolean` and `rejectReason: string | null` — AI service signals troll/NSFW/indoor detection via this flag.
- Troll auto-reject: when `ai.rejected === true`, the report is set to `status: 'rejected'`, `reviewStatus: 'rejected'` with the AI-provided `rejectReason` and never enters the review queue.
- `deleteReport` now removes the associated image file from disk via `fs/promises unlink` — previously, only the DB row was deleted and the file was left behind.
- `userService`, `userController`, `userRoutes` added for personnel management (`GET /users`, `POST /users`, `PATCH /users/:id/active`, `DELETE /users/:id`), all restricted to `admin` role.

---

### Client Admin

#### Changed
- All `r.reviewStatus === 'in_review'` comparisons replaced with `r.status === 'in_review'` across `App.tsx`, `Dashboard.tsx`, and `ReviewQueue.tsx` — fixes the bug where the review queue appeared empty despite reports awaiting review.
- `ReviewQueue` filter updated to `r.status === 'in_review'`.
- `handleChangeStatus` in `App.tsx` now accepts `'in_review' | 'in_progress' | 'resolved'` (removed `'in_review'` from reviewStatus, added to status).
- `STATUS_TRANSITIONS` in `DetailModal` updated: `rejected → in_review` and `in_progress → [resolved, in_review]` added.
- Map: reports with `status === 'in_review'` open `InspectionModal`; all other statuses open `DetailModal`.
- `ReviewQueue` correct/reject handlers now set `inspectTarget` before opening the target modal — previously `inspectTarget` was null when the modal opened from the queue, causing it to render with no data.
- `reviewStatus` enum in `types.ts` updated to `'approved' | 'corrected' | 'rejected' | null`.
- `getReviewStatusLabel` in `utils.ts`: `in_review` entry removed.
- `mapReport` in `utils.ts`: `reviewedByName: r.reviewer?.name ?? null`.

#### Added
- `reviewedByName` shown in `DetailModal` below the review status badge — identifies which staff member made the review decision.
- `.badge-in_review` CSS class (`background: #ede9fe; color: #7c3aed`).
- `PersonnelPanel` component — admin-only staff management: list all users, create new staff accounts (email, name, password, role), toggle active status, delete.
- `PhotoLightbox` component — full-screen image viewer on report photo click.

#### Removed
- `EmergencyReports` and `ForwardModal` components removed — following requirements clarification, the emergency officer role and dedicated forward workflow are out of scope.

---

### Client Mobile

#### Fixed
- `ReportStatus` type removed from `ReportContext` — was defined as Turkish display strings (`"Beklemede"`, `"İşleme Alındı"`...) that never matched the English API values, causing all status comparisons to silently fail.
- `Report` type now imported from `reportsApi.ts` instead of defined locally — eliminates the type mismatch that was preventing `ReportContext` from compiling.
- Stat counters on the home screen corrected: pending KPI now counts `pending + in_review`, in-progress counts `in_progress`, resolved counts `resolved`. All were previously zero due to string mismatch.
- Report polling continues while `status === 'pending' || status === 'in_review'` — was only polling for `pending`, so reports that transitioned to `in_review` appeared stuck.

#### Added
- `in_review` status support in `STATUS_MAP`, `Report` interface, and `mapReportFromApi`.
- `rejectReason` field added to `Report` interface and `mapReportFromApi`.
- `history.tsx`: `in_review` entry added to `STATUS_CONFIG` with label "İncelemede" and icon `search`.
- `history.tsx`: rejection reason displayed in a red-bordered block beneath the status badge when present.

---

### Infrastructure

#### Changed
- `.gitignore`: `*.onnx` added to exclude ONNX model files from version control.

---

## [0.5.0] - 2026-04-22

### Service Core (Backend)

#### Added
- `POST /auth/logout` endpoint — adds the caller's JWT token to an in-memory blacklist `Set`; `authenticate` middleware now checks the blacklist on every request and returns `401` for revoked tokens. Previously, logout only cleared `localStorage`; the token remained valid on the backend for its full 7-day lifetime.
- `tokenBlacklist.ts` service — exposes `addToBlacklist` / `isBlacklisted`. Switching to Redis in the future only requires changing this module; middleware and controller are unaffected.
- Seed script extended with 11 mock reports covering every workflow state (`pending`, `approved`, `corrected`, `rejected`, `forwarded`, `completed`). The database was previously empty, making end-to-end flow testing impossible.
- `Report` model exported from `models/index.ts` — seed script and other imports were failing with a build error because `db.Report` was not resolvable.

#### Changed
- `PATCH /reports/:id/review` is now restricted to the `review` role via `authorize('review')` middleware. Previously the `emergency` role could also call this endpoint.
- `PATCH /reports/:id/forward` introduced as a dedicated endpoint restricted to the `emergency` role. Review and forward operations previously shared a single endpoint with no role separation.
- `DELETE /reports/:id` restricted to `super_admin` role.
- `reviewReport` and `forwardReport` extracted into separate service functions — a single function was previously handling both concerns.

---

### Client Admin — Types & Utilities

#### Added
- `Report` interface extended with five new fields: `reviewStatus`, `rejectReason`, `forwardNote`, `forwardStatus`, `aiConfidence` — aligns with backend model; resolves prior TypeScript compile errors.
- `TabState` extended with `review` and `emergency`. `UserRole` type introduced.
- `getConfidenceLabel`, `getConfidenceColor`, `getReviewStatusLabel`, `getForwardStatusLabel`, `getRoleLabel` helper functions.
- `CATEGORY_TO_UNIT` map mirroring `model.py` `DEPARTMENT_MAP` — responsible unit is derived automatically from the selected category; manual unit selection is no longer needed.

#### Changed
- `mapReport` fixed: `userDescription` was incorrectly read from `r.description`; now read from its own field.
- Status label for `redirected` changed to **"Acil Müdahalede"** — the previous label "İnceleniyor" implied the report was still in the review queue, even though review had already concluded.
- `getRoleLabel`: `emergency` → `"Müdahale Yetkilisi"`.

#### Removed
- Dead `approved → çözüldü` mapping removed from `utils.ts` — the backend never returns `status: 'approved'`.

---

### Client Admin — App.tsx

#### Added
- Session restore via `GET /auth/me` on mount — `userRole` was always resetting to the `super_admin` default after page refresh; the real role is now read from the stored token.
- Role-based default tab on login: `review` → Review Queue, `emergency` → Emergency tab.
- Full state management and handlers for `InspectionModal`, `ReviewModal`, `RejectModal`, `ForwardModal`, and a new read-only `archiveModal` for completed reports.
- Role-based `onReportClick` handler for map markers: `review` → InspectionModal, `emergency` → ForwardModal (read-only archive modal if completed), `super_admin` → DetailModal.

#### Changed
- `handleForwardSave` migrated to `PATCH /reports/:id/forward`.

---

### Client Admin — NavTabs & Topbar

#### Added
- Role-based tab sets: `super_admin` sees 5 tabs, `review` sees 3 (Dashboard / Review Queue / Map), `emergency` sees 3 (Dashboard / Müdahale / Map).
- Pending-count badges on Review Queue and Emergency tabs.
- Role-scoped topbar indicators: `review` sees only the review counter, `emergency` sees only the emergency counter, `super_admin` sees both.

#### Changed
- Tab label "Acil Müdahale" → **"Müdahale"**.
- Topbar indicator label "Kritik" → **"Acil"** — the counter includes both `kritik` and `yuksek` reports; "Kritik" was misleading.
- User dropdown aligned to the right (`right: 0`) — the previous `translateX(50%)` centering caused overflow on narrow viewports.

---

### Client Admin — Dashboard

#### Added
- Three role-specific dashboards:
  - `super_admin`: 5 KPI cards + Review/Emergency unit shortcut cards + recent 5 reports compact list.
  - `review`: Hero banner (pending count + "İncelemeye Başla" CTA) + 4 KPI cards + low-confidence and critical-priority risk indicators + prioritised pending-reports table with inline Approve / Reject actions.
  - `emergency`: Hero banner (active emergency count + contextual message) + 4 KPI cards + unforwarded-critical alert + top-5 critical reports table with inline Forward / Update / Note actions.

#### Changed
- `emergencyTotal` (Dashboard) and `emergencyCount` (App.tsx) now exclude `forwardStatus === 'completed'` reports — completed reports were inflating the Topbar badge, NavTabs badge, and Dashboard KPI counts.
- `emergencyTableReports` filtered to exclude completed reports — completed reports were appearing alongside active ones in the dashboard table.
- "Son 5 Bildirim" replaced from an 8-column table to a **compact card list** — each row shows criticality badge, category, description, status badge, and timestamp on a single line.

---

### Client Admin — Review Queue & Modals

#### Added
- `ReviewQueue` component — all pending reports sorted by confidence score; purple banner, confidence filter, inline Approve / Correct / Reject actions.
- `InspectionModal` — report detail with action selection; Approve goes through a confirmation screen, Reject directly opens `RejectModal` (redundant confirm step removed).
- `ReviewModal` — category and priority correction; responsible unit is derived automatically from `CATEGORY_TO_UNIT`, no manual selection.
- `RejectModal` — mandatory rejection reason field; cannot be submitted empty.

#### Fixed
- ReviewQueue banner displayed `%70` confidence threshold while `CONFIDENCE_THRESHOLD = 0.60` was the actual value — corrected to `%60`.

---

### Client Admin — Emergency Queue & ForwardModal

#### Added
- `EmergencyReports` component — Acil / Normal / Arşiv tabs with sorting, category filter, and search.
- **Archive tab** — completed reports (`forwardStatus === 'completed'`) are separated from the active queue; active queue no longer mixed with finished work.
- Truncated `forwardNote` shown beneath the description in archive rows (`note content...`).
- Clicking an archive row opens a **read-only ForwardModal** — full intervention note, location, and descriptions are visible; no edits possible.
- **Delete button** for `super_admin` in the archive tab — uses the existing `DELETE /reports/:id` endpoint via `DeleteModal` confirmation.
- Contextual colour-coded info banner per tab: Acil → red, Normal → blue, Arşiv → green; report count shown on the right.
- `readOnly` prop on `ForwardModal` — footer shows only a "Kapat" button; form fields are locked.

#### Fixed
- `ForwardModal` was showing `report.address` in the unit field — corrected to `report.aiUnit`.
- Emergency officers could open a completed report from the map marker and edit the intervention note via `ForwardModal`. Completed reports are now routed to the read-only archive modal.

#### Changed
- `ForwardModal` now displays a location row — tappable "🗺️ Haritada Gör" link when coordinates are present, plain address otherwise.
- AI description and user description shown side-by-side in a two-column grid.
- When `forwardStatus === 'completed'`, the status dropdown is replaced with a read-only "Tamamlandı" display (terminal state).
- Button label for completed reports changed from "Güncelle" to **"Not Ekle"** (opacity 0.5).

---

### Client Admin — Map

#### Added
- "Raporu Görüntüle" button in map popups.
- `onReportClick` prop on `MapView` — role-based modal dispatch on marker click.

---

### Client Admin — CSS

#### Added
- `--review-color`, `--emergency-color` CSS custom properties.
- `btn-approve`, `btn-correct`, `btn-reject`, `btn-forward` button styles.
- `badge-review-*`, `badge-forward-*` badge classes for `reviewStatus` and `forwardStatus` visual mapping.
- NavTab badge styles for pending-count indicators.
- `login-role-select` style.

---

### Client Mobile

#### Fixed
- Report list was showing `aiUnit` (department name) in the address field due to `address: r.aiUnit` mapping error — corrected to `address: r.address || ''`.
- `redirected` status now displayed as **"İşleme Alındı"** in the citizen UI — operational terms such as "Acil Müdahalede" were surfacing internal workflow detail to citizens unnecessarily.

#### Changed
- `expo-cli` global install removed from Dockerfile — `npx expo` already pulls the package; the extra layer was unnecessary.
- Expo DevTools ports (19000–19002) removed from `docker-compose.yml` — not used by modern Expo CLI.

---

## [0.4.0] - 2026-04-15

### Service Core (Backend)

#### Added
- `reviewStatus` field on `Report` model — enum(`pending`, `approved`, `corrected`, `rejected`). Set to `pending` automatically when AI confidence < 0.60.
- `rejectReason` field on `Report` model — mandatory rejection reason entered by reviewer.
- `forwardNote` field on `Report` model — intervention note when report is forwarded to a municipal unit.
- `forwardStatus` field on `Report` model — enum(`iletildi`, `goruldu`, `islemde`, `tamamlandi`) for forwarding progress tracking.
- `PATCH /reports/:id/review` now accepts `reviewStatus`, `rejectReason`, `forwardNote`, `forwardStatus`, `aiCategory`, `aiPriority` with enum validation.
- `GET /reports` now supports `?reviewStatus=` query filter.

#### Changed
- `description` column renamed to `userDescription` to distinguish from `aiDescription`.
- `reviewFlag` (boolean) replaced by `reviewStatus` (enum) — eliminates redundant dual-field state.

#### Removed
- `reviewFlag` boolean field removed from `Report` model and all service/controller references.

---

### Client Mobile

#### Changed
- `description` → `userDescription` in `reportsApi.ts`, `ReportContext.tsx`, and `report.tsx` to match backend rename.

---

### Infrastructure

#### Changed
- `**/.env` added to root `.gitignore` to ensure all subdirectory `.env` files are excluded from version control.

---

## [0.3.0] - 2026-04-15

### Client Mobile

#### Changed
- `CATEGORIES` list replaced from 8 generic categories (`yol`, `su`, `elektrik`...) to 12 AI-aligned categories (`road_damage`, `sidewalk_damage`, `waste`...) to enable meaningful comparison with AI classification output.
- Category selection and text description are now **optional** — only a photo is required to submit a report. This reflects the design intent: user input serves as a hint for the review team, not a mandatory field.
- Submit button disabled state updated to require only image.
- `CATEGORY_MAP` replaced with `CATEGORY_LABEL_MAP` providing proper Turkish labels for AI category IDs (e.g. `road_damage` → `Yol Hasarı`). Previously `categoryLabel` was incorrectly populated from `aiUnit` (department name) or raw English ID.

#### Added
- `userCategory` field propagated through the full mobile stack: `report.tsx` → `ReportContext` → `reportsApi` → sent as `FormData` field when selected.

#### Fixed
- `description` field in `createReport` FormData now only appended when non-empty (was always sent as empty string).

---

### Service Core (Backend)

#### Added
- `userCategory` column added to `Report` model (`STRING`, `allowNull: true`) to store the citizen's self-selected category for review comparison.
- `userCategory` extracted from `req.body` in `reportController` and passed through `reportService` to `Report.create`.

---

### Client Admin

#### Fixed
- Category filter dropdown in `Reports.tsx` was using old 8-category values (`yol`, `su`...) while `r.category` held AI values (`road_damage`, `sewage_water`...) — filter was never matching. Updated to use 14 AI category IDs.
- `categoryLabel` in `utils.ts` was populated from `r.aiUnit` (e.g. `Fen İşleri`) instead of a proper category label. Replaced `CATEGORY_MAP` with `CATEGORY_LABEL_MAP` for correct Turkish display.

#### Added
- `userCategory` field added to `Report` type and mapped in `mapReport` utility.
- `DetailModal` now shows **Kullanıcı Kategorisi** vs **AI Kategorisi** side by side, enabling review team to compare citizen input against AI classification. Displays "Seçilmedi" when user skipped category selection.

---

### Infrastructure

#### Fixed
- `ai-service` volume mount corrected from `shared-uploads:/app/uploads` to `shared-uploads:/uploads`. The AI service (`main.py`) checks `Path("/uploads/foto.jpg").exists()` but the previous mount placed files at `/app/uploads` — causing all `/classify` requests to return HTTP 400.
- `API_KEY` added to `.env.example` (was missing; `gemini.py` reads `os.getenv("API_KEY")` but the example file only documented `GEMINI_API_KEY`).
- `.venv/` and `*.pyc` added to root `.gitignore` to prevent Python virtual environment from being tracked.

---

## [0.2.3] - 2026-04-15

### Client Admin

#### Changed
- Refactored `client-admin` from a single monolithic `index.html` (1729 lines of vanilla HTML/JS) to a Vite + React + TypeScript application with a component-based architecture.
- Introduced dedicated components: `LoginScreen`, `Dashboard`, `Reports`, `DetailModal`, `DeleteModal`, `Map`, `NavTabs`, `Topbar`.
- Added `types.ts` for shared TypeScript interfaces, `utils.ts` for label/mapping helpers, `api.ts` for centralised API calls.
- Added `nginx.conf` for SPA routing and `/api` reverse proxy, `Dockerfile` for containerised builds.
- Resolved 405 API routing errors by implementing a Vite dev server proxy setup pointing to the backend.

### AI Service

#### Changed
- Updated the AI model path resolution to use dynamic relative paths instead of an absolute `/models` path, effectively rectifying startup failures.
- Added missing `python-dotenv` dependency to `requirements.txt`.

### Infrastructure

#### Changed
- Standardized `docker-compose.yml` by removing `external: true` from networks and volumes for automatic creation.
- Added the missing `ai-service` Docker startup config.
- Removed obsolete `client-admin` static file copy directives from `service-core/Dockerfile` since the React app now builds its own Nginx container.

---

## [0.1.2] - 2026-04-07

### Service Core (Backend)

#### Added
- `aiPriorityLabel` field added to `Report` model and DB mapping

### Infrastructure

#### Changed
- `service-core` Docker build context moved to monorepo root
- `client-admin` static files embedded into `service-core` image (no longer a volume mount)
- Removed `client-admin` volume mount from `docker-compose.yml`

---

## [0.1.1] - 2026-04-07

### Service Core (Backend)

#### Changed
- Replaced Gradio-based AI integration with the new FastAPI `ai-service` (`POST /classify`)
- `aiService.ts` rewritten: sends `image_path` to `http://ai-service:8000/classify`, handles `rejected` responses
- `reportService.ts` updated: field mapping aligned with new AI response (`department` → `aiUnit`, `needs_review` → `reviewFlag`, integer `priority` → string)
- `AI_SERVICE_URL` extracted to environment variable (`.env`, `docker-compose.yml`)
- Removed `aiTop3` field from `Report` model (no longer returned by AI service)

### Infrastructure

#### Changed
- `docker-compose.yml`: replaced `uploads` volume with `shared-uploads` (external) shared with `ai-service`
- `docker-compose.yml`: `service-core` connected to external `srms-network` for hostname-based AI service discovery
- `.env.example` files updated with `AI_SERVICE_URL`

---

## [0.1.0] - 2026-03-30

### Overview
Initial demo release of the Smart Reporting Management System (SRMS). All three services — backend, mobile client, and admin panel — are unified in a single monorepo with full Docker support and a live PostgreSQL database. Not yet deployed to production.

---

### Service Core (Backend)

#### Added
- REST API endpoints for report management (`GET`, `POST`, `PATCH /api/reports`)
- `Report` and `User` database models with Sequelize ORM
- JWT-based authentication (`/api/auth/login`, `/api/auth/register`)
- AI service integration (`aiService.ts`) connecting to a self-hosted Gradio inference server
  - Accepts uploaded report images encoded as base64 and submits them via the Gradio SSE API
  - Returns structured analysis: category, priority, responsible unit, confidence score, Gemini-generated description, and top-3 label candidates
  - Automatically sets `reviewFlag = true` for predictions below 70% confidence
- Role-based middleware: `authenticate` (JWT verification) and `authorize(...roles)` (role-gated access) for protected routes
- Global error handler middleware
- Database seed script for development and testing
- Production-ready Dockerfile: TypeScript build → production deps only

#### Changed
- Replaced all mock data layers with real PostgreSQL queries via `reportService`
- Standardized REST API response format across all controllers
- Report creation flow enriched with AI-generated metadata (category, priority, responsible unit, description)

---

### Client Mobile

#### Added
- Login, register, and admin-login screens with form validation
- `AuthContext` for session and token management
- `ReportContext` connected to live API (replaced local mock state)
- `reportsApi` service using `apiClient` with JWT header injection
- Map view (`map.tsx`) displaying live reports from the database
- Report history screen (`history.tsx`) with real-time data
- Native map component (`Map.native.tsx`) and web fallback (`Map.web.tsx`)
- `env.ts` config for environment-aware API base URL

#### Changed
- Home screen (`index.tsx`) refactored: mock submissions replaced with API calls
- Report submission flow wired to backend; response includes AI-generated analysis

---

### Client Admin

#### Added
- Admin panel served as static files from `service-core` public directory
- Statistics dashboard and user management connected to live backend data

---

### Infrastructure

#### Added
- `docker-compose.yml` orchestrating `db` (PostgreSQL 16), `service-core`, and `client-mobile`
- Named volumes for persistent database storage (`pgdata`) and file uploads (`uploads`)
- PostgreSQL healthcheck with `depends_on` condition for safe startup ordering
- Root `.env` and `.env.example` for `HOST_IP` and `JWT_SECRET` configuration
- `client-mobile/.env.development.example` for local IP setup instructions
- `.dockerignore` for `client-mobile` to optimise image build context

#### Changed
- `docker-compose.yml` updated to pass `HOST_IP` dynamically to Expo packager
