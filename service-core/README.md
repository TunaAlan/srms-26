# Service Core - Backend API

Express.js REST API built with TypeScript (ESM), featuring JWT authentication, PostgreSQL integration, and automatic database synchronization.

## Features

- ✅ TypeScript with ES modules (ESM)
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ PostgreSQL with Sequelize ORM
- ✅ Automatic database synchronization
- ✅ Role-based access control (RBAC)
- ✅ Error handling middleware
- ✅ CORS enabled
- ✅ Request logging with Morgan
- ✅ Security headers with Helmet
- ✅ Report CRUD endpoints
- ✅ File upload with Multer (persistent Docker volume)
- ✅ AI service integration (Gradio API)
- ✅ Admin panel static serving at `/admin`

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 12+

### Installation

```bash
npm install
```

### Environment Setup

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Start with TypeScript watch mode
npm run dev

# Terminal will show:
# - Database connection status
# - Models synced
# - Server listening on PORT
```

### Production Build

```bash
# Compile TypeScript to dist/
npm run build

# Start compiled server
npm start
```

## Project Structure

```
src/
├── config/
│   ├── database.ts        # Sequelize configuration
│   └── env.ts             # Environment variables
├── models/
│   ├── User.ts            # User model (with hooks for password hashing)
│   ├── Report.ts          # Report model (with AI fields)
│   └── index.ts           # Model exports
├── controllers/
│   ├── authController.ts  # Authentication request handlers
│   └── reportController.ts # Report request handlers
├── routes/
│   ├── authRoutes.ts      # Auth endpoints
│   ├── reportRoutes.ts    # Report endpoints (with Multer upload)
│   └── index.ts           # Route aggregation
├── services/
│   ├── authService.ts     # Business logic (login, register, etc)
│   └── aiService.ts       # Gradio AI API integration
├── scripts/
│   └── seed.ts            # Seed test users and sample reports
├── middleware/
│   ├── auth.ts            # JWT verification and RBAC
│   └── errorHandler.ts    # Global error handler
├── app.ts                 # Express app setup
└── server.ts              # Server entry point
```

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "user"  // "user" | "admin" | "department"
}

Response:
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secure_password"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Profile
```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user"
}
```

### Health Check
```
GET /health

Response:
{
  "status": "ok"
}
```

### Reports

#### Create Report (authenticated users)
```
POST /api/reports
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
  description  string   User description of the issue
  latitude     number   GPS latitude
  longitude    number   GPS longitude
  image        file     Photo (max 10MB, image/* only)

Response:
{
  "id": "uuid",
  "description": "Road crack near park entrance",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "imagePath": "uploads/filename.jpg",
  "aiCategory": "road_damage",
  "aiPriority": "high",
  "aiUnit": "Fen İşleri Müdürlüğü",
  "aiDescription": "Significant road surface damage...",
  "aiConfidence": 87,
  "status": "pending",
  "reviewFlag": false
}
```

Note: `reviewFlag` is automatically set to `true` when AI confidence is below 70%.

#### Get My Reports (authenticated users)
```
GET /api/reports/my
Authorization: Bearer <token>
```

#### Get All Reports (admin or department)
```
GET /api/reports
Authorization: Bearer <admin-or-dept-token>
```

#### Get Report by ID (admin or department)
```
GET /api/reports/:id
Authorization: Bearer <admin-or-dept-token>
```

#### Review Report (admin or department)
```
PATCH /api/reports/:id/review
Authorization: Bearer <admin-or-dept-token>
Content-Type: application/json

{
  "status": "approved",    // pending | approved | rejected | redirected
  "staffNote": "Optional admin note"
}
```

#### Get Report Image
```
GET /api/reports/images/:filename
```

## Database

### Models

#### User
```typescript
{
  id: UUID (primary key)
  name: string
  email: string (unique, validated)
  password: string (hashed)
  role: enum('user' | 'admin' | 'department')
  timestamps: true (createdAt, updatedAt)
}
```

#### Report
```typescript
{
  id: UUID (primary key)
  userId: UUID (foreign key → User)
  description: string          // User-provided description
  imagePath: string            // Relative path to uploaded image
  latitude: number
  longitude: number
  aiCategory: string           // AI-detected category (e.g. road_damage, sewage_water)
  aiPriority: string           // low | medium | high | critical
  aiUnit: string               // Suggested municipal department (Turkish)
  aiDescription: string        // AI-generated description
  aiConfidence: number         // AI confidence score (0-100)
  aiTop3: JSON                 // Top 3 category predictions
  status: enum                 // pending | approved | rejected | redirected
  reviewFlag: boolean          // true when aiConfidence < 70 (needs manual review)
  staffNote: string            // Admin/department note on review
  timestamps: true (createdAt, updatedAt)
}
```

### Auto-Migration

Sequelize auto-syncs on server startup:
```typescript
await db.sequelize.sync()  // Creates/updates tables
```

No manual migrations needed for initial setup.

### Database Connection

Configured in `config/database.ts`:
- Host: `DB_HOST` env variable
- Port: `DB_PORT` env variable
- Database: `DB_NAME` env variable
- User: `DB_USER` environment variable
- Password: `DB_PASSWORD` env variable

## Authentication

### JWT Flow

1. **Registration/Login**: API generates JWT token
2. **Client Storage**: Token saved in SecureStore (mobile)
3. **Authorization**: Token sent in `Authorization: Bearer <token>` header
4. **Verification**: Middleware validates JWT signature
5. **Access**: Decoded user info attached to `req.user`

### Middleware

```typescript
import { authenticate, authorize } from './middleware/auth'

// Require authentication
router.get('/api/protected', authenticate, controller.handler)

// Require specific role
router.post('/api/admin', 
  authenticate, 
  authorize('admin'), 
  controller.handler
)
```

### Token Validation

- **Signature**: HS256 with JWT_SECRET
- **Expiry**: JWT_EXPIRES_IN (default: 7d)
- **Decoding**: User info extracted without DB query
- **Error**: 401 Unauthorized if invalid/expired

## Security

### Implemented
- Password hashing with bcrypt (12 rounds)
- Helmet security headers
- CORS enabled
- JWT token auth
- SQL injection prevention (Sequelize)
- Error messages don't expose internals

### Best Practices
- Use strong JWT_SECRET in production
- Set short expiry times for sensitive operations
- Enable HTTPS in production
- Use environment variables for all secrets
- Rate limit endpoints in production
- Validate all user inputs

## Development

### Adding New Endpoints

1. **Create Model** (if needed): `src/models/YourModel.ts`
2. **Create Controller**: `src/controllers/yourController.ts`
3. **Create Routes**: `src/routes/yourRoutes.ts`
4. **Add to Router**: Update `src/routes/index.ts`

Example:
```typescript
// routes/yourRoutes.ts
import express from 'express'
import * as controller from '../controllers/yourController'
import { authenticate } from '../middleware/auth'

const router = express.Router()

router.get('/', authenticate, controller.list)
router.post('/', authenticate, controller.create)
router.get('/:id', authenticate, controller.get)

export default router
```

### Service Layer Pattern

Keep business logic in services:
```typescript
// services/yourService.ts
export async function createItem(data) {
  // Validation
  if (!data.name) throw new Error('Name required')
  
  // Create
  const item = await YourModel.create(data)
  
  // Return safe data
  return item.toJSON()
}
```

## Environment Variables

```bash
# Server
NODE_ENV=development          # development | production | test
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infrareport
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

## Scripts

```bash
npm run dev        # Development with watch (tsx)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled server (production)
npm run test       # Run tests (jest)
```

## Error Handling

### Global Error Handler

```typescript
// All errors caught and formatted
app.use(errorHandler)

// Returns:
{
  "message": "Error description",
  "stack": "..." // Only in development
}
```

### Common HTTP Statuses

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Successful request |
| 201 | Created | User registered |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | No/invalid token |
| 403 | Forbidden | Wrong role |
| 404 | Not Found | Endpoint doesn't exist |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Unexpected error |

## Logging

Uses Morgan for request logging:
```
GET /api/auth/login 200 - 45ms
POST /api/auth/register 201 - 120ms
GET /api/auth/me 200 - 30ms
```

## Testing

### Manual Testing

```bash
# Check health
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test",
    "email":"test@test.com",
    "password":"test123",
    "role":"user"
  }'

# Set TOKEN from response, then:

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get Profile
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Docker

### Build Image

```bash
docker build -t srms-backend .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e JWT_SECRET=secret \
  srms-backend
```

See root `docker-compose.yml` for full setup.

## Possible Enhancements

- [ ] Automated tests (Jest)
- [ ] Request validation (Joi/Zod)
- [ ] Pagination for report listing
- [ ] Email verification
- [ ] Password reset flow
- [ ] Refresh token rotation
- [ ] API documentation (Swagger)
- [ ] Rate limiting
- [ ] Performance monitoring

## Troubleshooting

### Database Connection Failed
- Check DB_HOST, DB_PORT, credentials
- Ensure PostgreSQL is running
- Check network connectivity

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### JWT Invalid
- Check JWT_SECRET hasn't changed
- Token might be expired (check JWT_EXPIRES_IN)
- Clock skew between client and server

## References

- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Sequelize](https://sequelize.org/)
- [JWT.io](https://jwt.io/)
- [Bcrypt](https://www.npmjs.com/package/bcryptjs)
