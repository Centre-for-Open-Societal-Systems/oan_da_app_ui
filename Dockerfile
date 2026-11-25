# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# ---- deps: install from the lockfile (npm, package-lock.json) ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# The backend URL of the /api/v1 proxy. .env.local is not copied into the image (.dockerignore).
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
# The /api/v1 proxy (src/app/api/v1/[...path]/route.ts) is a route handler and reads API_BASE_URL (and the optional
# CROP_SOWN_BASE_URL) when it runs, so the value has to be in the runtime image too. A Helm/pod env var overrides it.
ARG API_BASE_URL
ENV API_BASE_URL=${API_BASE_URL}
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# node_modules is kept whole on purpose: next.config.ts is TypeScript and `next start` needs typescript to load it.
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
