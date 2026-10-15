FROM node:24.16.0-bookworm-slim AS node
RUN npm install --global pnpm@12.10.1
FROM cloudflare/sandbox:0.13.0-next.776.1@sha256:9bc128104c9607cb72a81b155b30d765da69747782744f2e117a45e57b7ce2dd
COPY --from=node /usr/local/ /usr/local/
RUN useradd --create-home spawn-build && mkdir -p /workspace /opt/spawn && chown spawn-build:spawn-build /workspace
COPY build-runner.mjs /opt/spawn/build-runner.mjs
