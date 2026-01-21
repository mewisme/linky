FROM node:24-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

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

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @repo/logger build \
  && pnpm --filter @repo/api build \
  && pnpm --filter @repo/api deploy /out --prod

# ======================
# Runtime stage
# ======================
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /out ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
