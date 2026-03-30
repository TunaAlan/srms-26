# Quick Start Guide - SRMS Development

## Get Running in 5 Minutes

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

---

### Option 1: Docker (Recommended)

```bash
# 1. Copy environment template and set your local IP
cp .env.example .env
# Edit .env: set HOST_IP to your machine's IP (run: ipconfig getifaddr en0)

# 2. Start everything
docker-compose up --build

# Wait for:
# service-core  | service-core running on port 3000
```

**Access:**

| Service | URL |
|---------|-----|
| Admin Panel | http://localhost:3000/admin |
| Backend API | http://localhost:3000/api |
| Health Check | http://localhost:3000/health |
| Database | localhost:5433 |

Admin login: `admin@ankara.bel.tr` / `admin123`

---

### Option 2: Local Development (without Docker)

#### Terminal 1 - Backend
```bash
cd service-core
npm install
cp .env.example .env   # fill in your local DB credentials
npm run dev

# Output: service-core running on port 3000
```

#### Terminal 2 - Mobile
```bash
cp client-mobile/.env.development.example client-mobile/.env.development
# Edit .env.development: set your machine's local IP

cd client-mobile
npm install
npx expo start

# Scan QR code with Expo Go on your phone
```

#### Database (required if not using Docker)
Start a local PostgreSQL instance and update `service-core/.env` with your credentials.

---

## Test Authentication

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@test.com",
    "password": "password123",
    "role": "user"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@test.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "password": "password123"
  }'
```

### 3. Get Profile (with token)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Project Layout

```
SRMS-26/
├── client-mobile/     # React Native Expo app
│   ├── services/      # API clients (apiClient.ts, reportsApi.ts)
│   ├── context/       # State management (AuthContext, ReportContext)
│   └── app/           # Pages/screens
│
├── client-admin/      # Admin panel (plain HTML + Leaflet.js)
│   └── app/admin/
│       └── index.html # Served by backend at /admin
│
├── service-core/      # Express.js backend
│   └── src/
│       ├── models/    # Database models
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic + AI integration
│       └── scripts/   # Seed data
│
├── .env.example           # Environment template
└── docker-compose.yml     # Container orchestration
```

---

## Key Services

| Service | URL | Purpose |
|---------|-----|---------|
| Admin Panel | http://localhost:3000/admin | Web-based report management |
| Backend API | http://localhost:3000/api | REST API |
| Health Check | http://localhost:3000/health | Service status |
| Database | localhost:5433 | PostgreSQL (port 5433 externally) |

---

## Development Commands

### Backend
```bash
npm run dev       # Development with watch
npm run build     # Compile TypeScript
npm start         # Run production build
```

### Mobile
```bash
npx expo start    # Start Expo metro bundler
npm run ios       # iOS simulator
npm run android   # Android emulator
```

---

## Common Issues

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### DB Connection Failed
```bash
# Check containers are running
docker ps

# View logs
docker logs srms-26-db-1
```

### Mobile Can't Connect to Backend
```bash
# Check EXPO_PUBLIC_API_BASE_URL in client-mobile/.env.development
# Must be your machine's local IP, NOT localhost:
# Correct:   http://192.168.x.x:3000/api
# Wrong:     http://localhost:3000/api
#
# localhost refers to the phone itself, not your computer.
# Get your IP: ipconfig getifaddr en0 (Mac) or ipconfig (Windows)
```

### Admin Panel Not Loading
```bash
# Backend must be running first
curl http://localhost:3000/health
# Then open: http://localhost:3000/admin
```

---

## Full Documentation

- [API Testing Guide](API_TESTING_GUIDE.md) - Detailed API reference
- [Main README](README.md) - Full architecture overview
