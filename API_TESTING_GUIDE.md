# API Integration Testing Guide

This guide provides instructions for testing the integration between the mobile app and backend API.

## Prerequisites

- Backend running on `http://localhost:3000`
- Mobile app running on Expo
- Access to the API endpoints documented in [API_ENDPOINTS](testUtils.ts)

## Testing with Docker Compose

### 1. Start All Services

```bash
docker-compose up --build
```

This will start:
- PostgreSQL database on `localhost:5432`
- Backend API on `localhost:3000`
- Mobile app on `localhost:8081`

### 2. Verify Services

Check that all services are running:

```bash
docker ps
```

You should see containers for `db`, `service-core`, and `client-mobile`.

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

### Reports Flow (When Backend is Ready)

- [ ] Authenticated user can create report
- [ ] Report is saved with timestamp
- [ ] Report criticality level is auto-analyzed
- [ ] User can retrieve their reports
- [ ] Department users can view all reports
- [ ] Admin users can update report status

## Test Users

See [testUtils.ts](testUtils.ts) for predefined test users:

- **Admin User**: admin@infrareport.com / admin123456
- **Department User**: dept@infrareport.com / dept123456
- **Regular User**: user@infrareport.com / user123456

## Environment Variables

### Development (.env.development)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
NODE_ENV=development
```

### Test (.env.test)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
NODE_ENV=test
```

## Troubleshooting

### Connection Refused

If you get "Connection refused" errors:
1. Ensure backend is running: `http://localhost:3000/health`
2. Check Docker container logs: `docker logs service-core`
3. Verify database is running: `docker logs db`

### CORS Errors

The backend is configured with CORS enabled. Ensure:
1. Mobile app is using correct API_BASE_URL
2. Requests include proper headers
3. Backend is running and healthy

### Database Connection Issues

Check environment variables in docker-compose.yml:
- DB_HOST should be `db` (service name) for Docker
- DB_HOST should be `localhost` for local development
- Connection pool might need adjustment for high load

## Next Steps

1. Add report endpoints to backend API
2. Add file upload for report images
3. Add location tracking and permissions
4. Add authentication error boundaries to UI
5. Add offline sync capabilities
