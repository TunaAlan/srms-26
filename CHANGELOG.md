# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).





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
