# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).





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
- Refactored `client-admin` from vanilla HTML/JS to a modular Vite-based React application.
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
