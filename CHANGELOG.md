# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).





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
- Truncated `forwardNote` shown beneath the description in archive rows (`📝 note content...`).
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
