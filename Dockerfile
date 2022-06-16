########
# BASE
########
FROM node:16-bullseye-slim as base

WORKDIR /usr/app

########
# DEPS
########
FROM base as deps

RUN echo "deb http://deb.debian.org/debian bullseye main contrib non-free" > /etc/apt/sources.list \
    && echo "deb http://deb.debian.org/debian-security/ bullseye-security main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb http://deb.debian.org/debian bullseye-updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y \
    # fonts
    fonts-arphic-ukai \
    fonts-arphic-uming \
    fonts-ipafont-mincho \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-ipafont-gothic \
    fonts-unfonts-core \
    ttf-wqy-zenhei \
    ttf-mscorefonts-installer \
    fonts-freefont-ttf \
    # app
    tini \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json for version number
COPY package*.json ./

RUN npm ci --only=production && $(npx install-browser-deps) \
    # Heavy inspiration from: https://github.com/ulixee/hero/blob/main/Dockerfile
    && groupadd -r csgosus \
    && useradd -r -g csgosus -G audio,video csgosus \
    && mkdir -p /home/csgosus/Downloads \
    && mkdir -p /home/csgosus/.cache \
    && chown -R csgosus:csgosus /home/csgosus \
    && mv ~/.cache/ulixee /home/csgosus/.cache/ \
    && chmod 777 /tmp
# && chmod -R 777 /home/csgosus/.cache/ulixee

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
FROM deps as deploy

# Add below to run as unprivileged user.
USER csgosus

# Steal compiled code from build image
COPY --from=build /usr/app/dist ./dist 

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