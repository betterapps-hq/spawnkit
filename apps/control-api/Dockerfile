FROM node:24.16.0-bookworm-slim AS node
RUN npm install --global pnpm@12.10.1
FROM cloudflare/sandbox:0.13.0-next.776.1@sha256:9bc128104c9607cb72a81b155b30d765da69747782744f2e117a45e57b7ce2dd
COPY --from=node /usr/local/ /usr/local/
RUN useradd --create-home spawn-build && mkdir -p /workspace /opt/spawn && chown spawn-build:spawn-build /workspace
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY build-runner.mjs /opt/spawn/build-runner.mjs
RUN cd /opt/spawn && pnpm add --save-exact --prod sharp@0.35.5
COPY optimize-cover.mjs /opt/spawn/optimize-cover.mjs
COPY cover-policy.mjs /opt/spawn/cover-policy.mjs
COPY optimize-trailer.mjs trailer-policy.mjs /opt/spawn/
COPY media-runner.mjs /opt/spawn/media-runner.mjs
COPY optimize-game-images.mjs /opt/spawn/optimize-game-images.mjs
