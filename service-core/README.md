# service-core

REST API backend for the SRMS platform. Built with Express.js, TypeScript (ESM), Sequelize, and PostgreSQL.

## Stack

- **Node.js 20** + Express.js
- **TypeScript** (ESM modules)
- **Sequelize** + PostgreSQL
- **JWT** + bcrypt — authentication
- **Multer** — image upload to shared Docker volume
- **Helmet** + CORS + Morgan

## Roles

| Role | Access |
|---|---|
| `user` | Submit reports, view own reports |
| `admin` | Full access — all reports, review, personnel management |
| `review_personnel` | Review queue, read-only report access |

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Reports
```
POST   /api/reports                  # Submit report (multipart/form-data)
GET    /api/reports/my               # Own reports (user)
GET    /api/reports                  # All reports (admin, review_personnel)
GET    /api/reports/:id              # Single report
PATCH  /api/reports/:id/review       # Approve / correct / reject (admin, review_personnel)
PATCH  /api/reports/:id/status       # Change workflow status (admin)
DELETE /api/reports/:id              # Delete report (admin)
GET    /api/reports/images/:filename # Serve uploaded image
```

### Users
```
GET    /api/users                    # List staff (admin)
POST   /api/users                    # Create staff account (admin)
PATCH  /api/users/:id/active         # Toggle active status (admin)
DELETE /api/users/:id                # Delete staff (admin)
```

## Report Lifecycle

```
pending → in_review → in_progress → resolved
                    ↘ rejected ↗  (admin can re-open)
```

- **pending** — report created, AI analyzing in background
- **in_review** — AI done, awaiting human review
- **in_progress** — reviewed and approved/corrected
- **resolved** — closed
- **rejected** — rejected with mandatory reason; admin can re-open via `PATCH /status`

`reviewStatus` records the reviewer's decision (`approved | corrected | rejected`). `reviewedBy` stores the reviewer's user ID — resolved via JOIN on `GET /reports`.

## AI Integration

AI analysis runs **asynchronously** after report creation — the `POST /reports` response returns immediately with `status: pending`. The background job calls `ai-service` and updates the report on completion.

Troll-filtered reports (NSFW, non-photo, indoor) are auto-rejected without entering the review queue.

## Dev Setup

```bash
npm install
cp .env.example .env   # configure DB and JWT_SECRET
npm run dev
```

Requires PostgreSQL running locally. DB tables are auto-synced on startup via `sequelize.sync({ alter: true })`.

## Environment

```bash
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infrareport
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
```

## Scripts

```bash
npm run dev      # tsx watch mode
npm run build    # compile to dist/
npm start        # run compiled server
```

## Docker

Built and orchestrated via root `docker-compose.yml`. Shares an `uploads` volume with `ai-service` — images are written once by service-core and read directly by ai-service without network transfer.
