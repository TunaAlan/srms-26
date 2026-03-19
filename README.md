# SRMS - Infrastructure Report Management System

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
│       • API Client                      • Database Sync     │
│       • Secure Storage                                      │
│                                   ┌──────────────────────┐ │
│                                   │  PostgreSQL Database │ │
│                                   │  • Users             │ │
│                                   │  • Reports (future)  │ │
│                                   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

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
│   ├── .env.development   # Dev environment
│   ├── .env.test          # Test environment
│   └── Dockerfile
│
├── service-core/          # Node.js Backend API (TypeScript + ESM)
│   ├── src/
│   │   ├── config/        # Database & environment config
│   │   ├── models/        # Sequelize models
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, error handling
│   │   ├── app.ts         # Express setup
│   │   └── server.ts      # Server entry point
│   ├── dist/              # Compiled JavaScript (generated)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env.test          # Test environment
│   └── Dockerfile
│
├── docker-compose.yml     # Container orchestration
└── API_TESTING_GUIDE.md   # API testing documentation
```

## Stack

### Frontend (Mobile)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: React Context + Hooks
- **API Client**: Axios with interceptors
- **Secure Storage**: expo-secure-store
- **Navigation**: expo-router

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript (ESM modules)
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Bcrypt, Helmet, CORS

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Database**: PostgreSQL 16 Alpine

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# Services:
# - Backend: http://localhost:3000
# - Mobile: http://localhost:8081
# - Database: localhost:5432
```

### Local Development

#### Backend Setup

```bash
cd service-core
npm install
cp .env.example .env
npm run dev          # Starts with TypeScript watch
```

#### Mobile App Setup

```bash
cd client-mobile
npm install
npm start            # Starts Expo metro bundler
```

## Database

- Auto-migrates on backend startup via Sequelize
- PostgreSQL with Docker
- Test data: See [API Testing Guide](API_TESTING_GUIDE.md)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user profile

### Health Check
- `GET /health` - Backend health status

For complete API testing guide, see [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md).

## Key Features

### Mobile App
- ✅ User authentication with JWT
- ✅ Secure token storage
- ✅ Context-based state management
- ✅ Report management (data layer ready)
- ✅ Criticality level analysis
- ✅ Offline report caching

### Backend API
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access (user, admin, department)
- ✅ Automated database synchronization
- ✅ Error handling middleware
- ✅ CORS enabled

## Authentication Flow

1. **User Registration/Login** → Backend validates credentials
2. **JWT Generation** → Token stored in SecureStore
3. **API Requests** → Authorization header with token
4. **Token Expiry** → Auto-logout and redirect to login
5. **Session Persistence** → Token restored on app restart

## Testing

### Manual API Testing
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get Profile
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) for comprehensive testing guide.

## Environment Variables

### Backend (service-core/.env)
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infrareport
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Mobile (client-mobile/.env.development)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
NODE_ENV=development
```

## Development Workflow

1. **Backend Changes**: Auto-reload with `npm run dev`
2. **Mobile Changes**: Hot reload with Expo
3. **Database**: Auto-sync via Sequelize
4. **Testing**: See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process: `lsof -i :<port> && kill -9 <PID>` |
| DB connection failed | Check DB_HOST (.env) and Docker containers running |
| CORS errors | Verify EXPO_PUBLIC_API_BASE_URL is correct |
| Token invalid | Clear secure storage and re-login |

## License

Internal use only.

## Related Documentation

- [API Testing Guide](API_TESTING_GUIDE.md) - Detailed API testing
- [service-core README](service-core/README.md) - Backend documentation
- [Expo Documentation](https://docs.expo.dev/)
- [Sequelize Documentation](https://sequelize.org/)

