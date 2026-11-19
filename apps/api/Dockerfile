# Production Dockerfile for ASKR EV NestJS API Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and activate specific pnpm version
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

# Copy workspace definition and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy source code and Prisma schema
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma client and compile TypeScript packages
RUN pnpm --filter @askrev/database db:generate
RUN pnpm --filter @askrev/shared build
RUN pnpm --filter @askrev/database build
RUN pnpm --filter @askrev/api build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

# Copy dependencies, compiled packages, and application dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
