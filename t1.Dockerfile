FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
RUN echo stage1-ok
