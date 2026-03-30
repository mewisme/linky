# syntax=docker/dockerfile:1

ARG PNPM_VERSION=10.33.0

FROM node:25-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

FROM base AS pruner
RUN npm install -g turbo@2.9.0
COPY . .
RUN turbo prune @ws/worker-jobs --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@ws/worker-jobs

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

COPY --from=builder /app/packages/sdk-internal/package.json ./packages/sdk-internal/
COPY --from=builder /app/packages/sdk-internal/dist ./packages/sdk-internal/dist

COPY --from=builder /app/apps/worker-jobs/package.json ./apps/worker-jobs/
COPY --from=builder /app/apps/worker-jobs/dist ./apps/worker-jobs/dist

RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/worker-jobs
ENTRYPOINT ["node"]
CMD ["./dist/index.js"]
