FROM node:24-alpine AS build
WORKDIR /app
ARG PLUS_REGISTRY_TOKEN
RUN if [ -n "$PLUS_REGISTRY_TOKEN" ]; then printf 'x\n' > /app/.npmrc; fi
RUN echo after-printf-ok
