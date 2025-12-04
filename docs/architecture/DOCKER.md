# TaskMaster CMMS - Docker Topology

## Overview

TaskMaster is 100% containerized with Docker. This document defines the container architecture for development and production environments.

---

## Container Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Docker Network                                  │
│                            (taskmaster-net)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │    nginx    │────▶│     API     │────▶│  PostgreSQL │                   │
│  │   :80/:443  │     │   :3000     │     │    :5432    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│         │                   │                   │                           │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │     PWA     │     │   Worker    │     │    Redis    │                   │
│  │   (static)  │     │  (BullMQ)   │     │    :6379    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                             │                                               │
│                             ▼                                               │
│                      ┌─────────────┐                                       │
│                      │   MinIO     │                                       │
│                      │   :9000     │                                       │
│                      └─────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services

| Service | Image | Purpose | Ports |
|---------|-------|---------|-------|
| **nginx** | nginx:alpine | Reverse proxy, TLS termination, routing | 80, 443 |
| **api** | taskmaster/api | NestJS backend | 3000 |
| **worker** | taskmaster/api | BullMQ job processor | - |
| **pwa** | taskmaster/pwa | React PWA (nginx) | 80 |
| **postgres** | postgres:17 | Primary database | 5432 |
| **redis** | redis:8 | Cache, queues, sessions | 6379 |
| **minio** | minio/minio | Object storage (optional) | 9000, 9001 |

---

## Development Configuration

### docker-compose.yml (Development)

```yaml
name: taskmaster-dev

services:
  # =============================================================================
  # REVERSE PROXY
  # =============================================================================
  nginx:
    image: nginx:alpine
    container_name: taskmaster-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - pwa
    networks:
      - taskmaster-net
    profiles:
      - full

  # =============================================================================
  # BACKEND API
  # =============================================================================
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.dev
    container_name: taskmaster-api
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/api/node_modules
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://taskmaster:taskmaster@postgres:5432/taskmaster?schema=public
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-in-production
      JWT_EXPIRES_IN: 15m
      REFRESH_TOKEN_EXPIRES_IN: 7d
      STORAGE_TYPE: local
      STORAGE_PATH: /app/storage
      LOG_LEVEL: debug
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - taskmaster-net
    profiles:
      - full

  # =============================================================================
  # FRONTEND PWA
  # =============================================================================
  pwa:
    build:
      context: .
      dockerfile: apps/pwa/Dockerfile.dev
    container_name: taskmaster-pwa
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/pwa/node_modules
    environment:
      VITE_API_URL: http://localhost/api
    networks:
      - taskmaster-net
    profiles:
      - full

  # =============================================================================
  # DATABASE
  # =============================================================================
  postgres:
    image: postgres:17
    container_name: taskmaster-postgres
    environment:
      POSTGRES_USER: taskmaster
      POSTGRES_PASSWORD: taskmaster
      POSTGRES_DB: taskmaster
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - taskmaster-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskmaster"]
      interval: 5s
      timeout: 5s
      retries: 5

  # =============================================================================
  # CACHE & QUEUES
  # =============================================================================
  redis:
    image: redis:8
    container_name: taskmaster-redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - taskmaster-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # =============================================================================
  # DEV TOOLS
  # =============================================================================
  mailhog:
    image: mailhog/mailhog
    container_name: taskmaster-mailhog
    ports:
      - "8025:8025"
    networks:
      - taskmaster-net
    profiles:
      - tools

networks:
  taskmaster-net:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

### nginx.conf (Development)

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream api {
        server api:3000;
    }

    upstream pwa {
        server pwa:5173;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 50M;

        # API routes
        location /api {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # PWA frontend (default)
        location / {
            proxy_pass http://pwa;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## Production Configuration

### docker-compose.prod.yml

```yaml
name: taskmaster-prod

services:
  # =============================================================================
  # REVERSE PROXY
  # =============================================================================
  nginx:
    image: nginx:alpine
    container_name: taskmaster-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ${SSL_CERT_PATH}:/etc/nginx/ssl/fullchain.pem:ro
      - ${SSL_KEY_PATH}:/etc/nginx/ssl/privkey.pem:ro
    depends_on:
      - api
      - pwa
    networks:
      - taskmaster-net
    restart: unless-stopped

  # =============================================================================
  # BACKEND API
  # =============================================================================
  api:
    image: ${REGISTRY:-taskmaster}/api:${VERSION:-latest}
    container_name: taskmaster-api
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 15m
      REFRESH_TOKEN_EXPIRES_IN: 7d
      STORAGE_TYPE: ${STORAGE_TYPE:-local}
      STORAGE_PATH: /app/storage
      CORS_ORIGIN: ${CORS_ORIGIN}
    volumes:
      - api-storage:/app/storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - taskmaster-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # =============================================================================
  # BACKGROUND WORKER
  # =============================================================================
  worker:
    image: ${REGISTRY:-taskmaster}/api:${VERSION:-latest}
    container_name: taskmaster-worker
    command: ["node", "dist/worker.js"]
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      STORAGE_TYPE: ${STORAGE_TYPE:-local}
      STORAGE_PATH: /app/storage
    volumes:
      - api-storage:/app/storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - taskmaster-net
    restart: unless-stopped

  # =============================================================================
  # FRONTEND PWA
  # =============================================================================
  pwa:
    image: ${REGISTRY:-taskmaster}/pwa:${VERSION:-latest}
    container_name: taskmaster-pwa
    networks:
      - taskmaster-net
    restart: unless-stopped

  # =============================================================================
  # DATABASE
  # =============================================================================
  postgres:
    image: postgres:17
    container_name: taskmaster-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - taskmaster-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # =============================================================================
  # CACHE & QUEUES
  # =============================================================================
  redis:
    image: redis:8
    container_name: taskmaster-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - taskmaster-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  taskmaster-net:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  api-storage:
```

---

## Resource Recommendations

| Service | Min RAM | Recommended RAM | CPU |
|---------|---------|-----------------|-----|
| nginx | 64MB | 128MB | 0.25 |
| api | 512MB | 1GB | 1-2 |
| worker | 256MB | 512MB | 0.5-1 |
| pwa | 64MB | 128MB | 0.25 |
| postgres | 512MB | 2GB | 1-2 |
| redis | 128MB | 512MB | 0.5 |

**Total Minimum**: ~2GB RAM for basic deployment
**Recommended**: 4-6GB RAM for comfortable operation

---

## Commands Reference

```bash
# Development
docker compose --profile full up -d        # Start all services
docker compose --profile full up -d --build # Rebuild and start
docker compose logs -f api                  # Follow API logs
docker compose exec api pnpm prisma migrate dev  # Run migrations
docker compose down                         # Stop all services
docker compose down -v                      # Stop and remove volumes

# Production
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml pull   # Pull latest images
docker compose -f docker-compose.prod.yml logs -f

# Health checks
docker compose ps                           # Check service status
curl http://localhost/api/v1/health         # API health
```