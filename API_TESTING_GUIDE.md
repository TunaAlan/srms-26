# API Integration Testing Guide

This guide provides instructions for testing the integration between the mobile app and backend API.

## Prerequisites

- Backend running on `http://localhost:3000`
- Mobile app running via Expo Go
- `curl` or an API client (Postman, Insomnia, etc.)

---

## Testing with Docker Compose

### 1. Start All Services

```bash
cp .env.example .env   # set HOST_IP to your local IP
docker-compose up --build
```

This will start:
- PostgreSQL database on `localhost:5433`
- Backend API on `localhost:3000`
- Expo dev server on `localhost:8081`

### 2. Verify Services

```bash
docker ps
curl http://localhost:3000/health
```

You should see containers for `db`, `service-core`, and `client-mobile`.

---

## Manual API Testing

### Authentication Endpoints

#### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "testpass123",
    "role": "user"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "Test User",
    "email": "testuser@example.com",
    "role": "user"
  },
  "token": "jwt-token"
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123"
  }'
```

#### Get Current User Profile

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### Report Endpoints

#### Get All Reports (admin only)

```bash
curl http://localhost:3000/api/reports \
  -H "Authorization: Bearer <admin-jwt-token>"
```

#### Get My Reports

```bash
curl http://localhost:3000/api/reports/my \
  -H "Authorization: Bearer <user-jwt-token>"
```

#### Create a Report (with image)

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Authorization: Bearer <user-jwt-token>" \
  -F "description=Road damage near the park" \
  -F "latitude=41.0082" \
  -F "longitude=28.9784" \
  -F "image=@/path/to/photo.jpg"
```

The backend will automatically call the AI service and populate:
- `aiCategory` — detected issue type (e.g. `road_damage`)
- `aiPriority` — priority level (`low`, `medium`, `high`, `critical`)
- `aiDescription` — AI-generated description
- `aiUnit` — suggested municipal department

#### Review a Report (admin or department)

```bash
curl -X PATCH http://localhost:3000/api/reports/<report-id>/review \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "staffNote": "Forwarded to roads department"}'
```

Valid status values: `pending`, `approved`, `rejected`, `redirected`

---

## Integration Testing Checklist

### Authentication Flow

- [ ] User can register with valid credentials
- [ ] User receives JWT token on successful registration
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect password
- [ ] Login fails with non-existent email
- [ ] User can view their profile with valid token
- [ ] Profile request fails without token
- [ ] Profile request fails with invalid token
- [ ] Token expires after specified duration

### Reports Flow

- [ ] Authenticated user can create report with photo and location
- [ ] Report is saved with timestamp
- [ ] AI fields are populated after submission (aiCategory, aiPriority, aiDescription, aiUnit)
- [ ] User can retrieve their own reports
- [ ] Admin can retrieve all reports
- [ ] Admin or department user can review report (approve/reject/redirect)

---

## Test Users

Seed data is loaded automatically on startup:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ankara.bel.tr | admin123 |
| Department | department@ankara.bel.tr | dept123 |
| Regular User | user1@ankara.bel.tr | user123 |
| Regular User | user2@ankara.bel.tr | user123 |
| Regular User | user3@ankara.bel.tr | user123 |

---

## Environment Variables

### Development (`client-mobile/.env.development`)
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000/api
NODE_ENV=development
```
> Use your machine's local IP, not `localhost`, when testing on a physical device.

### Test (`.env.test`)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
NODE_ENV=test
```

---

## Troubleshooting

### Connection Refused

If you get "Connection refused" errors:
1. Ensure backend is running: `curl http://localhost:3000/health`
2. Check Docker container logs: `docker logs srms-26-service-core-1`
3. Verify database is running: `docker logs srms-26-db-1`

### CORS Errors

The backend is configured with CORS enabled. Ensure:
1. Mobile app is using correct `EXPO_PUBLIC_API_BASE_URL`
2. Requests include proper `Authorization` header
3. Backend is running and healthy

### Database Connection Issues

Check environment variables in `docker-compose.yml`:
- `DB_HOST` should be `db` (Docker service name) when running inside Docker
- `DB_HOST` should be `localhost` for local development outside Docker
- External DB port is **5433**, internal is 5432
