########
# BASE
########
FROM node:16-bullseye-slim as base

WORKDIR /usr/app

########
# BUILD
########
FROM base as build

# Copy all source files
COPY package*.json tsconfig.json ./

# Add dev deps
RUN npm ci

# Copy source code
COPY src src

RUN npm run build


########
# DEPLOY
########
FROM base as deploy

RUN apt-get update \
    && apt-get install -y \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --only=production && $(npx install-browser-deps)

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist 

# Heavy inspiration from: https://github.com/ulixee/secret-agent/blob/main/Dockerfile
RUN groupadd -r csgosus \
    && useradd -r -g csgosus -G audio,video csgosus \
    && mkdir -p /home/csgosus/Downloads \
    && mkdir -p /home/csgosus/.cache \
    && mkdir -p /csgo-sus \
    && chown -R csgosus:csgosus /home/csgosus \
    && chown -R csgosus:csgosus /usr/app \
    && chown -R csgosus:csgosus /csgo-sus \
    && mv ~/.cache/secret-agent /home/csgosus/.cache/ \
    && chmod 777 /tmp \
    && chmod -R 777 /home/csgosus/.cache/secret-agent
# Add below to run as unprivileged user.
USER csgosus

LABEL org.opencontainers.image.title="csgo-sus" \ 
    org.opencontainers.image.url="https://github.com/claabs/csgo-sus" \
    org.opencontainers.image.description="Lookup in-depth public data on CSGO players' accounts to see if they're suspicious" \
    org.opencontainers.image.name="csgo-sus" \
    org.opencontainers.image.base.name="node:16-bullseye-slim"

ARG COMMIT_SHA=""

ENV NODE_ENV=production \
    CACHE_DIR=/csgo-sus \
    COMMIT_SHA=${COMMIT_SHA}

VOLUME [ "/csgo-sus" ]

ENTRYPOINT ["tini", "--"]

CMD ["node", "dist/index.js"]