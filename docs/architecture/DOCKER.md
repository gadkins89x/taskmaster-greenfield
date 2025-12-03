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
│  │   Traefik   │────▶│     API     │────▶│  PostgreSQL │                   │
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
| **traefik** | traefik:v3.6 | Reverse proxy, TLS termination, routing | 80, 443, 8080 (dashboard) |
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
  traefik:
    image: traefik:v3.6
    container_name: taskmaster-traefik
    command:
      - "--api.insecure=true"
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--log.level=DEBUG"
    ports:
      - "80:80"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - taskmaster-net

  # =============================================================================
  # BACKEND API
  # =============================================================================
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    container_name: taskmaster-api
    volumes:
      - ./apps/api:/app
      - /app/node_modules
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
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=PathPrefix(`/api`) || PathPrefix(`/auth`)"
      - "traefik.http.routers.api.entrypoints=web"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
    networks:
      - taskmaster-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # =============================================================================
  # BACKGROUND WORKER
  # =============================================================================
  worker:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    container_name: taskmaster-worker
    command: npm run start:worker:dev
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://taskmaster:taskmaster@postgres:5432/taskmaster?schema=public
      REDIS_URL: redis://redis:6379
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

  # =============================================================================
  # FRONTEND PWA
  # =============================================================================
  pwa:
    build:
      context: ./apps/pwa
      dockerfile: Dockerfile.dev
    container_name: taskmaster-pwa
    volumes:
      - ./apps/pwa:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost/api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pwa.rule=PathPrefix(`/`)"
      - "traefik.http.routers.pwa.entrypoints=web"
      - "traefik.http.routers.pwa.priority=1"
      - "traefik.http.services.pwa.loadbalancer.server.port=5173"
    networks:
      - taskmaster-net

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
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"  # Expose for local tools
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
      - "6379:6379"  # Expose for local tools
    networks:
      - taskmaster-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # =============================================================================
  # OBJECT STORAGE (Optional for dev)
  # =============================================================================
  minio:
    image: minio/minio
    container_name: taskmaster-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: taskmaster
      MINIO_ROOT_PASSWORD: taskmaster123
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"  # Console
    networks:
      - taskmaster-net
    profiles:
      - storage  # Only start with: docker compose --profile storage up

  # =============================================================================
  # DEV TOOLS
  # =============================================================================
  mailhog:
    image: mailhog/mailhog
    container_name: taskmaster-mailhog
    ports:
      - "8025:8025"  # Web UI
    networks:
      - taskmaster-net
    profiles:
      - tools

  bull-board:
    image: deadly0/bull-board
    container_name: taskmaster-bull-board
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3001:3000"
    depends_on:
      - redis
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
  minio-data:
```

### Development Dockerfiles

#### apps/api/Dockerfile.dev

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source (will be overwritten by volume mount)
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Use tsx for hot reload
CMD ["npm", "run", "start:dev"]
```

#### apps/pwa/Dockerfile.dev

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Vite dev server with HMR
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
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
  traefik:
    image: traefik:v3.6
    container_name: taskmaster-traefik
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--log.level=WARN"
      - "--accesslog=true"
      - "--metrics.prometheus=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt-data:/letsencrypt
    networks:
      - taskmaster-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

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
      S3_ENDPOINT: ${S3_ENDPOINT:-}
      S3_BUCKET: ${S3_BUCKET:-}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      LOG_LEVEL: info
    volumes:
      - api-storage:/app/storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=PathPrefix(`/api`) || PathPrefix(`/auth`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=50"
      - "traefik.http.routers.api.middlewares=api-ratelimit"
    networks:
      - taskmaster-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

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
      S3_ENDPOINT: ${S3_ENDPOINT:-}
      S3_BUCKET: ${S3_BUCKET:-}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      LOG_LEVEL: info
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
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # =============================================================================
  # FRONTEND PWA
  # =============================================================================
  pwa:
    image: ${REGISTRY:-taskmaster}/pwa:${VERSION:-latest}
    container_name: taskmaster-pwa
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pwa.rule=PathPrefix(`/`)"
      - "traefik.http.routers.pwa.entrypoints=websecure"
      - "traefik.http.routers.pwa.tls.certresolver=letsencrypt"
      - "traefik.http.routers.pwa.priority=1"
      - "traefik.http.services.pwa.loadbalancer.server.port=80"
      # Cache static assets
      - "traefik.http.middlewares.pwa-headers.headers.customresponseheaders.Cache-Control=public, max-age=31536000, immutable"
      - "traefik.http.routers.pwa-assets.rule=PathPrefix(`/assets`)"
      - "traefik.http.routers.pwa-assets.middlewares=pwa-headers"
    networks:
      - taskmaster-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

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
      - ./backups:/backups
    networks:
      - taskmaster-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # =============================================================================
  # CACHE & QUEUES
  # =============================================================================
  redis:
    image: redis:8
    container_name: taskmaster-redis
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
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
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # =============================================================================
  # BACKUP SERVICE
  # =============================================================================
  backup:
    image: prodrigestivill/postgres-backup-local
    container_name: taskmaster-backup
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SCHEDULE: "0 2 * * *"  # Daily at 2 AM
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
      HEALTHCHECK_PORT: 8080
    volumes:
      - ./backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - taskmaster-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M

networks:
  taskmaster-net:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  api-storage:
  letsencrypt-data:
```

### Production Dockerfiles

#### apps/api/Dockerfile

```dockerfile
# =============================================================================
# BUILD STAGE
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# =============================================================================
# PRODUCTION STAGE
# =============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Create storage directory
RUN mkdir -p /app/storage && chown nestjs:nodejs /app/storage

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

#### apps/pwa/Dockerfile

```dockerfile
# =============================================================================
# BUILD STAGE
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build for production
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# =============================================================================
# PRODUCTION STAGE
# =============================================================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Add non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### apps/pwa/nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no caching
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Manifest - short cache
    location /manifest.json {
        expires 1d;
        add_header Cache-Control "public";
    }

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;

        # Don't cache index.html
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }

    # Health check
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

---

## Environment Configuration

### .env.example

```bash
# =============================================================================
# DATABASE
# =============================================================================
POSTGRES_USER=taskmaster
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=taskmaster
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public

# =============================================================================
# REDIS
# =============================================================================
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# =============================================================================
# AUTHENTICATION
# =============================================================================
JWT_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# =============================================================================
# STORAGE
# =============================================================================
STORAGE_TYPE=local  # or 's3'
STORAGE_PATH=/app/storage

# S3/MinIO (optional)
S3_ENDPOINT=http://minio:9000
S3_BUCKET=taskmaster
S3_ACCESS_KEY=
S3_SECRET_KEY=

# =============================================================================
# EMAIL
# =============================================================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@taskmaster.example.com

# =============================================================================
# TLS/HTTPS
# =============================================================================
ACME_EMAIL=admin@example.com

# =============================================================================
# DEPLOYMENT
# =============================================================================
REGISTRY=your-registry.example.com
VERSION=latest
```

---

## Backup Strategy

### Automated PostgreSQL Backups

The `backup` service runs daily at 2 AM and maintains:
- **Daily backups**: Last 7 days
- **Weekly backups**: Last 4 weeks
- **Monthly backups**: Last 6 months

### Manual Backup Commands

```bash
# Create immediate backup
docker exec taskmaster-postgres pg_dump -U taskmaster taskmaster > backup-$(date +%Y%m%d).sql

# Compressed backup
docker exec taskmaster-postgres pg_dump -U taskmaster taskmaster | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore from backup
cat backup.sql | docker exec -i taskmaster-postgres psql -U taskmaster taskmaster

# Backup Redis
docker exec taskmaster-redis redis-cli -a $REDIS_PASSWORD BGSAVE
docker cp taskmaster-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Backup attachment storage
docker cp taskmaster-api:/app/storage ./storage-backup-$(date +%Y%m%d)
```

### Backup Verification

```bash
# Test restore to temporary database
docker run --rm -v $(pwd)/backup.sql:/backup.sql postgres:17 \
    sh -c 'createdb test && psql test < /backup.sql && psql test -c "SELECT count(*) FROM work_orders"'
```

---

## Scaling Considerations

### Horizontal Scaling (Future)

```yaml
# docker-compose.scale.yml - overlay for scaling
services:
  api:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      rollback_config:
        parallelism: 1
        delay: 10s

  worker:
    deploy:
      replicas: 2
```

### Resource Recommendations

| Service | Min RAM | Recommended RAM | CPU |
|---------|---------|-----------------|-----|
| traefik | 128MB | 256MB | 0.5 |
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
docker compose up -d                    # Start all services
docker compose up -d --build            # Rebuild and start
docker compose logs -f api              # Follow API logs
docker compose exec api npm run prisma:migrate  # Run migrations
docker compose down                     # Stop all services
docker compose down -v                  # Stop and remove volumes

# With optional services
docker compose --profile storage up -d   # Include MinIO
docker compose --profile tools up -d     # Include dev tools

# Production
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml pull  # Pull latest images
docker compose -f docker-compose.prod.yml logs -f

# Health checks
docker compose ps                        # Check service status
curl http://localhost/health             # API health
curl http://localhost:8080/ping          # Traefik health
```
