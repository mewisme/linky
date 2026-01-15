FROM node:24-slim AS base

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile && pnpm --filter @repo/api build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]
