# client-admin

Web-based admin panel for the SRMS infrastructure reporting platform. Built with React 19, TypeScript, and Vite. Served behind nginx in production.

## Stack

- **React 19** + TypeScript
- **Vite 8** — build tooling, version injection
- **Leaflet** + react-leaflet-cluster — interactive map
- **nginx** — static file serving in production (Docker)

## Roles & Access

| Tab | admin | review_personnel |
|---|---|---|
| Dashboard | ✓ | ✓ |
| Reports *(Raporlar)* | ✓ | — |
| Review Queue *(İnceleme Kuyruğu)* | ✓ | ✓ |
| Map *(Harita)* | ✓ | ✓ |
| Personnel *(Personel)* | ✓ | — |

## Report Lifecycle (Admin View)

```
pending → in_review → in_progress → resolved
                    ↘ rejected ↗  (admin can re-open)
```

- **pending** — AI analyzing
- **in_review** — awaiting admin/personnel review
- **in_progress** — approved or corrected, field team working
- **resolved** — closed
- **rejected** — rejected with mandatory reason; admin can re-open

## Key Features

- **Review Queue** *(İnceleme Kuyruğu)* — reports sorted by AI confidence score; approve, correct, or reject with optional/required notes
- **Map** *(Harita)* — clustered markers colored by criticality; clicking opens correct modal based on report status
- **Dashboard** — live stats, category distribution, priority queue
- **Personnel** *(Personel)* — create and manage `review_personnel` accounts
- **reviewedByName** — every review decision records who made it (shown in detail/inspection modals)

## Dev Setup

```bash
npm install
npm run dev       # http://localhost:5173
```

Requires `service-core` running at `http://localhost:3000`. API calls are proxied via `vite.config.ts`:

```ts
proxy: { '/api': 'http://localhost:3000' }
```

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # preview production build locally
```

Version is injected at build time from `package.json` via `vite.config.ts` — update `version` there, UI reflects it automatically.

## Docker

```bash
docker build -t srms-client-admin .
```

Multi-stage build: Node compiles the app, nginx serves `dist/`. See root `docker-compose.yml` for full setup.

## Environment

No runtime env vars — all configuration is baked in at build time. API base is always `/api` (relative), resolved by nginx proxy in production.
