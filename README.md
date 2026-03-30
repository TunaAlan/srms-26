# SRMS - Infrastructure Report Management System

## Project Description

SRMS is a citizen-facing infrastructure reporting platform. Users can report issues such as road damage, broken sidewalks, and sewage problems by submitting a photo and GPS location via a mobile app. Reports are automatically analyzed by an AI service that assigns a category, priority level, and description. Administrators can review all reports on an interactive map through a web-based admin panel.

The user interface is in **Turkish**, as the target audience is Turkish municipal staff and local citizens.

**Flow: Citizen → Mobile App → Backend API → AI Analysis → Admin Panel → Relevant Municipal Department**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SRMS Architecture                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │   Mobile App (Expo)  │────────▶│   Backend API (TS)   │ │
│  │   React Native       │         │   Express.js         │ │
│  │   Client             │◀────────│   Node.js ESM        │ │
│  └──────────────────────┘         └──────────────────────┘ │
│       • Auth Context                    • Auth Routes       │
│       • Reports Context                 • JWT + Tokens      │
│       • Camera + Location               • Report Routes     │
│       • Image Upload                    • AI Integration    │
│                                         • File Upload       │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │   Admin Panel (HTML) │────────▶│  PostgreSQL Database │ │
│  │   Leaflet Maps       │         │  • Users             │ │
│  │   Cluster Markers    │         │  • Reports           │ │
│  └──────────────────────┘         └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
SRMS-26/
├── client-mobile/          # React Native Mobile App (Expo)
│   ├── app/               # Page/Screen components
│   ├── components/        # Reusable UI components
│   ├── context/           # Auth and Report contexts (API integrated)
│   ├── services/          # API clients
│   ├── config/            # Environment configuration
│   ├── test/              # Testing utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.development.example  # Dev environment template
│   └── Dockerfile
│
├── client-admin/          # Admin Panel (plain HTML + Leaflet.js)
│   └── app/admin/
│       └── index.html     # Single-page admin interface, served at /admin
│
├── service-core/          # Node.js Backend API (TypeScript + ESM)
│   ├── src/
│   │   ├── config/        # Database & environment config
│   │   ├── models/        # Sequelize models (User, Report)
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic + AI integration
│   │   ├── middleware/    # Auth, error handling
│   │   ├── scripts/       # Seed data
│   │   ├── app.ts         # Express setup
│   │   └── server.ts      # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── Dockerfile
│
├── .env.example            # Environment variables template
├── docker-compose.yml      # Container orchestration
└── API_TESTING_GUIDE.md    # API testing documentation
```

---

## Stack

### Frontend (Mobile)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **API Client**: Axios with interceptors
- **Secure Storage**: expo-secure-store
- **Navigation**: expo-router

### Admin Panel
- **Technology**: Plain HTML + Vanilla JavaScript
- **Maps**: Leaflet.js + MarkerCluster plugin
- **Served by**: Backend at `/admin` via `express.static`

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript (ESM modules)
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Authentication**: JWT
- **AI**: Gradio API integration
- **File Upload**: Multer

### DevOps
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 16 Alpine

---

## Quick Start

> For detailed setup instructions see [QUICK_START.md](QUICK_START.md).

**Requires:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone https://github.com/TunaAlan/srms-26.git
cd srms-26
cp .env.example .env        # set HOST_IP to your local IP
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Admin Panel | http://localhost:3000/admin |
| Backend API | http://localhost:3000/api |
| Database | localhost:5433 |

Admin login: `admin@ankara.bel.tr` / `admin123`

---

## Key Features

### Mobile App
- ✅ User authentication with JWT
- ✅ Report creation with photo and GPS location
- ✅ AI-powered report analysis (category, priority, description)
- ✅ Report history listing

### Backend API
- ✅ JWT authentication with role-based access (user, admin, department)
- ✅ File upload with persistent volume storage
- ✅ AI service integration (Gradio API)
- ✅ Admin panel static serving at `/admin`

### Admin Panel
- ✅ Interactive map with clustered report markers (Leaflet.js)
- ✅ Category-based filtering
- ✅ Report detail view (user and AI descriptions separately)
- ✅ User management

---

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Reports
- `POST /api/reports` — Create report (photo + location)
- `GET /api/reports/my` — Current user's reports
- `GET /api/reports` — All reports (admin/department)
- `GET /api/reports/:id` — Single report
- `PATCH /api/reports/:id/review` — Review report (admin/department)

### Other
- `GET /health` — Health check
- `GET /api/reports/images/:filename` — Serve uploaded image

For full API reference see [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md).

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :<port>` → `kill -9 <PID>` |
| DB connection failed | `docker ps` — check containers are running |
| Mobile can't reach backend | Use local IP in `.env.development`, not `localhost` |
| Admin panel not opening | Backend must be running: `curl http://localhost:3000/health` |

---

## License

Internal use only.

## Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [API Testing Guide](API_TESTING_GUIDE.md)
- [Backend README](service-core/README.md)
