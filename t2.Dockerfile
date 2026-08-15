FROM node:24-alpine AS build
WORKDIR /app
ARG PLUS_REGISTRY_TOKEN
RUN if [ -n "$PLUS_REGISTRY_TOKEN" ]; then printf '@adonisplus:registry=https://plus.adonisjs.com/registry/\n' > /app/.npmrc; fi
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN ls -la
