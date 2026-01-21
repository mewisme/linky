FROM node:24-slim AS base

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/logger ./packages/logger
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/logger ./packages/logger
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @repo/logger build \
  && pnpm --filter @repo/api build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=builder /app/packages/logger/package.json ./packages/logger/package.json
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN pnpm install --frozen-lockfile --prod --filter=@repo/api

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]
