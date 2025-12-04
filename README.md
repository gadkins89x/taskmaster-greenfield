# TaskMaster CMMS

A modern, full-stack **Computerized Maintenance Management System** built with TypeScript. Designed for field technicians and maintenance teams with offline-first capabilities, multi-tenant architecture, and enterprise-grade features.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

TaskMaster CMMS is a comprehensive maintenance management platform that enables organizations to:

- **Track Assets** - Register and monitor equipment with full lifecycle management
- **Manage Work Orders** - Create, assign, and complete maintenance tasks with detailed workflows
- **Schedule Preventive Maintenance** - Automate recurring maintenance with flexible scheduling
- **Control Inventory** - Track parts and supplies with reorder alerts
- **Work Offline** - Full PWA support for field technicians without connectivity
- **Multi-Tenant** - Securely isolate data for multiple organizations

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Asset Management** | Hierarchical asset tracking, QR/barcode scanning, specifications, warranty tracking |
| **Work Orders** | Full lifecycle management with steps, comments, photos, signatures, labor & parts tracking |
| **Preventive Maintenance** | RFC 5545 recurrence patterns, auto-generation, lead time configuration |
| **Inventory Control** | Stock levels, reorder points, transaction history, work order integration |
| **Location Hierarchy** | Site → Building → Floor → Area → Room with GPS coordinates |
| **Notifications** | Email, push notifications, and in-app alerts with user preferences |
| **Dashboard & Analytics** | Real-time metrics, completion rates, overdue tracking |
| **Audit Logging** | Immutable change history with user tracking |

### Technical Highlights

- **Offline-First PWA** - Works without connectivity using IndexedDB and service workers
- **Multi-Tenant Architecture** - Row-level data isolation with 5-layer enforcement
- **Role-Based Access Control** - Granular permissions (Admin, Supervisor, Technician, Requester)
- **Real-Time Sync** - Queue management for offline changes with conflict resolution
- **Type-Safe End-to-End** - Shared TypeScript types between frontend and backend
- **API Documentation** - OpenAPI/Swagger auto-generated documentation

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| [NestJS 11](https://nestjs.com/) | TypeScript-first Node.js framework |
| [Prisma 7](https://www.prisma.io/) | Type-safe ORM with migrations |
| [PostgreSQL 17](https://www.postgresql.org/) | Primary database |
| [Redis 8](https://redis.io/) | Caching and job queues |
| [BullMQ 5](https://docs.bullmq.io/) | Background job processing |
| [Passport.js](http://www.passportjs.org/) | JWT authentication |
| [Argon2](https://github.com/P-H-C/phc-winner-argon2) | Password hashing |

### Frontend

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework with Actions API |
| [Vite 7](https://vitejs.dev/) | Build tool with fast HMR |
| [TanStack Router](https://tanstack.com/router) | Type-safe routing |
| [TanStack Query](https://tanstack.com/query) | Server state management |
| [Zustand 5](https://zustand-demo.pmnd.rs/) | Client state management |
| [Dexie.js 4](https://dexie.org/) | IndexedDB for offline storage |
| [Workbox 7](https://developer.chrome.com/docs/workbox/) | Service worker tooling |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Component library |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| [Docker](https://www.docker.com/) | Containerization |
| [nginx](https://nginx.org/) | Reverse proxy & routing |
| [pnpm](https://pnpm.io/) | Fast, disk-efficient package manager |

---

## Project Structure

```
taskmaster-greenfield/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── prisma/             # Database schema & migrations
│   │   │   ├── schema.prisma   # Prisma schema (26 models)
│   │   │   └── seed.ts         # Development seed data
│   │   ├── src/
│   │   │   ├── common/         # Shared utilities
│   │   │   │   ├── auth/       # JWT guards & strategies
│   │   │   │   ├── config/     # Configuration validation
│   │   │   │   ├── database/   # Prisma service
│   │   │   │   └── exceptions/ # Error handling
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── assets/
│   │   │   │   ├── audit/
│   │   │   │   ├── authentication/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── inventory/
│   │   │   │   ├── locations/
│   │   │   │   ├── notifications/
│   │   │   │   ├── roles/
│   │   │   │   ├── scheduling/
│   │   │   │   ├── tenants/
│   │   │   │   ├── users/
│   │   │   │   └── work-orders/
│   │   │   └── health/         # Health checks
│   │   └── test/               # E2E tests
│   │
│   └── pwa/                    # React PWA Frontend
│       ├── public/             # Static assets & PWA manifest
│       └── src/
│           ├── components/     # Reusable UI components
│           ├── hooks/          # Custom React hooks
│           ├── lib/            # Utilities & API clients
│           ├── pages/          # Route components
│           └── stores/         # Zustand state stores
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── docs/
│   └── architecture/           # Technical documentation
│
└── docker-compose.yml          # Development environment
```

---

## Getting Started

### Prerequisites

- **Node.js** v22 LTS or later
- **pnpm** v9 or later
- **Docker** and Docker Compose
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/taskmaster-greenfield.git
cd taskmaster-greenfield
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Start infrastructure services**

```bash
docker compose up -d postgres redis
```

4. **Configure environment**

```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your settings
```

5. **Set up the database**

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

6. **Start the development servers**

```bash
# Terminal 1: API
cd apps/api
pnpm dev

# Terminal 2: PWA
cd apps/pwa
pnpm dev
```

7. **Access the application**

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **App (via nginx)**: http://localhost (when using full Docker setup)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | password123 |
| Technician | tech@demo.com | password123 |

---

## Development

### Available Scripts

```bash
# Root workspace
pnpm dev              # Start all apps in development mode
pnpm build            # Build all apps for production
pnpm test             # Run all tests
pnpm lint             # Lint all packages

# API (apps/api)
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm prisma:studio    # Open Prisma Studio GUI

# PWA (apps/pwa)
pnpm dev              # Start Vite dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
```

### Docker Development

Run the full stack in containers:

```bash
# Start all services
docker compose --profile full up -d

# Start with development tools (MailHog)
docker compose --profile full --profile tools up -d

# View logs
docker compose logs -f api pwa

# Stop all services
docker compose down
```

### Database Management

```bash
cd apps/api

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (destructive)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

---

## API Reference

The API follows RESTful conventions with consistent response formats.

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "admin@demo.com",
  "password": "password123"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### Endpoints

| Resource | Endpoints |
|----------|-----------|
| Authentication | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
| Users | `GET/POST/PATCH/DELETE /users` |
| Roles | `GET/POST/PATCH/DELETE /roles` |
| Locations | `GET/POST/PATCH/DELETE /locations` |
| Assets | `GET/POST/PATCH/DELETE /assets` |
| Work Orders | `GET/POST/PATCH/DELETE /work-orders` |
| - Steps | `GET/POST/PATCH/DELETE /work-orders/:id/steps` |
| - Comments | `GET/POST /work-orders/:id/comments` |
| - Photos | `GET/POST/DELETE /work-orders/:id/photos` |
| - Labor | `GET/POST/PATCH/DELETE /work-orders/:id/labor` |
| - Parts | `GET/POST/DELETE /work-orders/:id/parts` |
| Inventory | `GET/POST/PATCH/DELETE /inventory` |
| Scheduling | `GET/POST/PATCH/DELETE /scheduling` |
| Notifications | `GET/PATCH /notifications` |
| Dashboard | `GET /dashboard/metrics`, `GET /dashboard/charts` |
| Audit Logs | `GET /audit`, `GET /audit/stats` |

### Response Format

```typescript
// Success response
{
  "data": T | T[],
  "meta": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}

// Error response
{
  "statusCode": number,
  "message": string,
  "error": string,
  "details": object
}
```

Full API documentation available at `/api/docs` when the server is running.

---

## Architecture

### Multi-Tenancy

TaskMaster uses row-level tenant isolation with 5 enforcement layers:

1. **JWT Claims** - Tenant ID embedded in access tokens
2. **Request Context** - Tenant extracted and validated per request
3. **Repository Layer** - All queries scoped to tenant
4. **Prisma Middleware** - Automatic tenant filtering
5. **Database Indexes** - Optimized queries on `tenant_id`

### Security

- **Authentication**: JWT access tokens (15m) + refresh tokens (7d)
- **Password Hashing**: Argon2id with secure defaults
- **Rate Limiting**: Three-tier throttling (short/medium/long)
- **Input Validation**: class-validator DTOs + Zod schemas
- **Security Headers**: Helmet middleware
- **Audit Trail**: Immutable logs of all data changes

### Offline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│  TanStack Query                    Zustand Store         │
│  (Server State)                    (Client State)        │
├─────────────────────────────────────────────────────────┤
│                    Sync Manager                          │
│  - Queue offline mutations                               │
│  - Retry on reconnection                                 │
│  - Conflict resolution                                   │
├─────────────────────────────────────────────────────────┤
│                    Dexie.js (IndexedDB)                  │
│  - Local data cache                                      │
│  - Offline queue                                         │
│  - Pending sync items                                    │
├─────────────────────────────────────────────────────────┤
│                    Service Worker (Workbox)              │
│  - Cache static assets                                   │
│  - Cache API responses                                   │
│  - Background sync                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/taskmaster

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
SMTP_FROM=noreply@example.com

# Push Notifications (optional)
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@example.com

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

---

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run E2E tests
cd apps/api
pnpm test:e2e

# Run specific test file
pnpm test -- path/to/test.spec.ts
```

---

## Deployment

### Production Build

```bash
# Build all packages
pnpm build

# The API build output is in apps/api/dist/
# The PWA build output is in apps/pwa/dist/
```

### Docker Production

```dockerfile
# Example production Dockerfile for API
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

### Environment Checklist

- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure production `DATABASE_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS via reverse proxy
- [ ] Configure CORS origins
- [ ] Set up database backups
- [ ] Configure monitoring/alerting

---

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Architecture Overview](docs/architecture/ARCHITECTURE.md) - System design and patterns
- [Backend Structure](docs/architecture/BACKEND_STRUCTURE.md) - API layer details
- [Frontend Structure](docs/architecture/FRONTEND_STRUCTURE.md) - PWA architecture
- [Docker Setup](docs/architecture/DOCKER.md) - Container configuration

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use TypeScript strict mode
- Write meaningful commit messages
- Include tests for new features
- Update documentation as needed

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with these excellent open-source projects:

- [NestJS](https://nestjs.com/) - A progressive Node.js framework
- [React](https://react.dev/) - The library for web and native user interfaces
- [Prisma](https://www.prisma.io/) - Next-generation ORM for Node.js
- [TanStack](https://tanstack.com/) - High-quality open-source software for web developers
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
