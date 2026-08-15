# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
FROM node:24-alpine AS build
WORKDIR /app

# pnpm 11.17（固定版本：pnpm 11.21+ 把 ERR_PNPM_IGNORED_BUILDS 视为 fatal，行为与本地 lockfile 不一致）
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
# better-sqlite3 无 prebuilt → node-gyp 编译需要工具链
RUN apk add --no-cache python3 make g++

# Plus 私有 registry 认证（@adonisplus/* 是 dependencies，构建期需要）
ARG PLUS_REGISTRY_TOKEN
RUN if [ -n "$PLUS_REGISTRY_TOKEN" ]; then \
      printf '@adonisplus:registry=https://plus.adonisjs.com/registry/\n//plus.adonisjs.com/registry/:_authToken=%s\n' "$PLUS_REGISTRY_TOKEN" > /app/.npmrc; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---------- Stage 2: production ----------
FROM node:24-alpine AS production
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333
WORKDIR /app

# Plus registry 认证（生产依赖安装也需要；写用户级 ~/.npmrc，任何 WORKDIR 都会读）
ARG PLUS_REGISTRY_TOKEN
RUN if [ -n "$PLUS_REGISTRY_TOKEN" ]; then \
      printf '@adonisplus:registry=https://plus.adonisjs.com/registry/\n//plus.adonisjs.com/registry/:_authToken=%s\n' "$PLUS_REGISTRY_TOKEN" > /root/.npmrc; \
    fi

COPY --from=build /app/build ./build
# build 产物不含 pnpm-workspace.yaml（overrides 在 lockfile 校验里需要）
COPY --from=build /app/pnpm-workspace.yaml ./build/pnpm-workspace.yaml
WORKDIR /app/build
RUN apk add --no-cache python3 make g++ \
    && corepack enable && corepack prepare pnpm@11.17.0 --activate \
    && pnpm i --prod --frozen-lockfile

# SQLite 数据目录（生产建议挂 volume，或换 Postgres 后无需）
RUN mkdir -p tmp
VOLUME ["/app/build/tmp"]

EXPOSE 3333
# 启动前先跑迁移（幂等；生产需 --force）
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
