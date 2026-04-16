# syntax=docker/dockerfile:1

ARG TURBO_VERSION=2.9.6

FROM node:24-alpine AS base
RUN apk add --no-cache \
    ca-certificates \
    libc6-compat \
    tzdata
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS pruner
RUN npm install -g turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune @ws/worker-ai --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@ws/worker-ai

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./.npmrc

COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/config/dist ./packages/config/dist

COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

COPY --from=builder /app/packages/validation/package.json ./packages/validation/
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist

COPY --from=builder /app/packages/sdk-internal/package.json ./packages/sdk-internal/
COPY --from=builder /app/packages/sdk-internal/dist ./packages/sdk-internal/dist

COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

COPY --from=builder /app/apps/worker-ai/package.json ./apps/worker-ai/
COPY --from=builder /app/apps/worker-ai/dist ./apps/worker-ai/dist

RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/worker-ai
ENTRYPOINT ["node"]
CMD ["--import=./dist/instrument.js", "./dist/index.js"]
