# Quick Start Guide - SRMS Development

## 🚀 Get Running in 5 Minutes

### Option 1: Docker (Recommended)

```bash
# Start everything
docker-compose up --build

# Wait for output:
# service-core_1 | service-core running on port 3000
# client-mobile_1 | Ready on http://localhost:8081

# Open browser: http://localhost:8081
```

**That's it!** Backend, database, and mobile app are running.

### Option 2: Local Development

#### Terminal 1 - Backend
```bash
cd service-core
npm install
npm run dev

# Output: service-core running on port 3000
```

#### Terminal 2 - Mobile
```bash
cd client-mobile
npm install
npm start

# Scan QR code with Expo app or press 'w' for web
```

#### Terminal 3 - Database (Optional)
```bash
# If not using Docker, start PostgreSQL locally
# Update service-core/.env with your DB details
```

---

## 🧪 Test Authentication

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

## 📁 Project Layout

```
SRMS-26/
├── client-mobile/     # React Native Expo app
│   ├── services/      # API clients (apiClient.ts, reportsApi.ts)
│   ├── context/       # State management (AuthContext, ReportContext)
│   └── app/           # Pages/screens
│
├── service-core/      # Express.js backend
│   └── src/
│       ├── models/    # Database models (User.ts)
│       ├── routes/    # API endpoints
│       └── services/  # Business logic
│
└── docker-compose.yml # Container orchestration
```

---

## 🔑 Key Services

| Service | URL | Purpose |
|---------|-----|---------|
| Mobile App | http://localhost:8081 | React Native frontend |
| Backend API | http://localhost:3000 | Express.js API |
| Database | localhost:5432 | PostgreSQL |

---

## 💻 Development Commands

### Backend
```bash
npm run dev       # Development with watch
npm run build     # Compile TypeScript
npm start         # Run production build
```

### Mobile
```bash
npm start         # Start Expo metro
npm run ios       # iOS preview
npm run android   # Android preview
npm run web       # Web preview
```

---

## 🛠️ Common Issues

### Port Already in Use
```bash
# Kill process on port
lsof -i :3000
kill -9 <PID>
```

### DB Connection Failed
```bash
# Check PostgreSQL is running
# On Docker: docker ps | grep postgres
# On local: psql -U postgres

# Update DB credentials in .env
```

### Mobile Can't Connect to Backend
```bash
# Check EXPO_PUBLIC_API_BASE_URL in .env.development
# Should be: http://localhost:3000/api
# Not: http://192.168.x.x:3000/api
```

---

## 📚 Full Documentation

- [API Testing Guide](API_TESTING_GUIDE.md) - Detailed API reference
- [Main README](README.md) - Full architecture overview
- [Backend README](service-core/README.md) - Backend specific docs

---

## ✅ Verification Checklist

After starting services:

- [ ] Backend health: `curl http://localhost:3000/health`
- [ ] Can register user (see above)
- [ ] Can login with credentials
- [ ] Can get profile with token
- [ ] Mobile app loads at http://localhost:8081
- [ ] Database has users table

---

## 🚀 Next Steps

1. **Test the API** using curl commands above
2. **Read API_TESTING_GUIDE.md** for comprehensive testing
3. **Integrate UI** with AuthContext and ReportContext
4. **Build reports** feature on backend
5. **Add image upload** support

---

**Questions?** Check the documentation files or inspect the code.
