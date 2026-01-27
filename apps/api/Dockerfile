FROM node:24-slim AS base

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# ======================
# Build stage
# ======================
FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/logger ./packages/logger
COPY apps/api ./apps/api

RUN pnpm install --force --frozen-lockfile

RUN pnpm --filter @repo/logger build

RUN ls -la /app/packages/logger/dist/

# Refresh workspace links so TypeScript can find @repo/logger
RUN pnpm install --force

RUN pnpm --filter @repo/api build

# ======================
# Runtime stage
# ======================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy logger package (only package.json and dist needed at runtime)
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

# Copy API package (only package.json and dist needed at runtime)
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install only production dependencies (much faster than deploy)
# This will set up workspace links automatically
RUN pnpm install --prod --frozen-lockfile --filter @repo/api

# Set working directory to the API app
WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]