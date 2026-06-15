# EcoOffice

Hybrid work desk and parking booking application for modern hybrid teams. Reserve desks or parking spots before coming to the physical office.

## Project Structure

```
├── backend/            # Node.js/Express/TypeScript API
│   ├── src/            # TypeScript source code
│   ├── migrations/     # SQL database migration scripts
│   ├── Dockerfile      # Container build for backend service
│   ├── package.json
│   └── tsconfig.json
├── frontend/           # React/TypeScript/Tailwind CSS UI (Vite)
│   ├── src/            # Frontend source code
│   ├── package.json
│   └── tsconfig.json
├── .env.example        # Environment variable template
└── README.md
```

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x
- Docker (optional, for containerized deployment)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd CapstoneProject
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment variables

Copy the `.env.example` file to `backend/.env` and fill in the values:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/eco_office
SESSION_SECRET=your-secure-random-secret
API_PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### 4. Database setup

```bash
# Create the database
createdb eco_office

# Run migrations (from backend/ directory)
cd backend
npm run migrate
```

### 5. Start development servers

```bash
# Backend (from backend/ directory)
npm run dev

# Frontend (from frontend/ directory)
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `SESSION_SECRET` | Secret for signing session cookies | Yes | — |
| `API_PORT` | Port the backend API listens on | Yes | — |
| `CORS_ORIGIN` | Allowed frontend origin for CORS | No | — |

The backend will refuse to start and exit with a non-zero code if any required variable is missing.

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register a new user | No |
| POST | `/api/v1/auth/login` | Log in and create session | No |
| POST | `/api/v1/auth/logout` | Log out and destroy session | Yes |

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/bookings/desks` | Book a desk | Yes |
| POST | `/api/v1/bookings/parking` | Book a parking spot | Yes |
| GET | `/api/v1/bookings/mine` | Get user's upcoming bookings | Yes |
| DELETE | `/api/v1/bookings/:id` | Cancel a booking | Yes |

### Availability

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/availability/desks?date=YYYY-MM-DD` | Desk availability for a date | Yes |
| GET | `/api/v1/availability/parking?date=YYYY-MM-DD` | Parking availability for a date | Yes |

### Admin — Resource Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/admin/desks` | Add a desk | Admin |
| PUT | `/api/v1/admin/desks/:id` | Update a desk | Admin |
| DELETE | `/api/v1/admin/desks/:id` | Deactivate a desk | Admin |
| POST | `/api/v1/admin/parking` | Add a parking spot | Admin |
| PUT | `/api/v1/admin/parking/:id` | Update a parking spot | Admin |
| DELETE | `/api/v1/admin/parking/:id` | Deactivate a parking spot | Admin |

### Admin — Booking Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/admin/bookings?startDate&endDate&resourceType` | View all bookings (filtered) | Admin |

### Health Check

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/health` | Health check | No |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation error / malformed request |
| 401 | Authentication required |
| 403 | Insufficient privileges (non-admin) |
| 404 | Resource not found |
| 409 | Conflict (double-booking, duplicate identifier) |
| 429 | Rate limited (too many login attempts) |

## Running Tests

### Backend tests (unit + property + integration)

```bash
cd backend
npm test
```

This runs Jest with coverage reporting. Tests include:
- Unit tests for service layer logic
- Property-based tests (fast-check) for validation and booking constraints
- Integration tests for API endpoints

### End-to-end tests

```bash
npm run test:e2e
```

E2E tests use Playwright to verify full user flows through the browser.

### Frontend tests

```bash
cd frontend
npm test
```

Frontend tests use Vitest with React Testing Library.

## Docker

### Build the backend image

```bash
cd backend
docker build -t ecooffice-backend .
```

### Run the container

```bash
docker run -d \
  --name ecooffice-api \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/eco_office \
  -e SESSION_SECRET=your-secure-random-secret \
  -e API_PORT=3000 \
  -e CORS_ORIGIN=http://localhost:5173 \
  ecooffice-backend
```

The container runs as a non-root user and includes a health check at `/api/v1/health`.

## Database Migrations

Migration scripts are in `backend/migrations/` and run sequentially:

1. `001_create_users.sql` — Users table
2. `002_create_desks.sql` — Desks table
3. `003_create_parking_spots.sql` — Parking spots table
4. `004_create_bookings.sql` — Bookings table with unique constraint
5. `005_create_sessions.sql` — Sessions table for connect-pg-simple

Run migrations:

```bash
cd backend
npm run migrate
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Testing**: Jest, fast-check, Supertest (backend); Vitest, React Testing Library (frontend); Playwright (E2E)
- **Containerization**: Docker (multi-stage build)

## License

ISC
