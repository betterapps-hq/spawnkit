import { developmentEnvironment } from "./dev-environment.mjs"
// Repository commands use this checkout's local dashboard unless explicitly configured.
process.env.SPAWN_SITE_URL ??= developmentEnvironment().app
await import("../packages/cli/src/main.ts")
