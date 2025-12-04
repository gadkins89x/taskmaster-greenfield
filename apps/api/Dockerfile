# Build stage
FROM node:22-alpine AS builder

# Install dependencies for native modules and pnpm
RUN apk add --no-cache python3 make g++ && \
    corepack enable && \
    corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for workspace packages
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

# Install pnpm for production dependencies
RUN corepack enable && \
    corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma/
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./dist

# Create storage directory
RUN mkdir -p /app/storage

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the application
CMD ["node", "dist/main.js"]
