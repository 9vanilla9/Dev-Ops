# syntax=docker/dockerfile:1

ARG PLAYWRIGHT_VERSION=1.63.0

FROM node:22-bookworm AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

FROM base AS browser
ARG PLAYWRIGHT_VERSION
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install chromium

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM browser AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
CMD ["node", "src/index.js"]
