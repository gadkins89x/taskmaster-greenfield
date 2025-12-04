# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && \
    corepack prepare pnpm@latest --activate

WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_VAPID_PUBLIC_KEY

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

# Copy root workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for workspace packages
COPY apps/pwa/package.json ./apps/pwa/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/pwa/ ./apps/pwa/
COPY packages/shared/ ./packages/shared/

# Build the application
WORKDIR /app/apps/pwa
RUN pnpm build

# Production stage - serve with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/pwa/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/apps/pwa/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
