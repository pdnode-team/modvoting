FROM node:24-alpine AS build
WORKDIR /app
COPY pnpm-workspace.yaml ./
RUN cat pnpm-workspace.yaml
