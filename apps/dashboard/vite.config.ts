import { fileURLToPath } from "node:url"
import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode, command }) => {
  // Only the publishable key is exposed by Vite; the secret remains in the server process.
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "")
  for (const key of [
    "VITE_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_OAUTH_CLIENT_ID",
    "CLERK_OAUTH_ISSUER",
    "SPAWN_CONTROL_API_URL"
  ]) {
    if (process.env[key] === undefined && env[key]) process.env[key] = env[key]
  }
  return {
    cacheDir: process.env.SPAWN_VITE_CACHE ?? "node_modules/.vite",
    server: { allowedHosts: process.env.SPAWN_LOCAL_ORIGIN ? [new URL(process.env.SPAWN_LOCAL_ORIGIN).hostname] : [] },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    plugins: [
      tailwindcss(),
      ...(command === "build" || process.env.SPAWN_WORKER_DEV === "true"
        ? [cloudflare({ viteEnvironment: { name: "ssr" } })]
        : []),
      tanstackStart(),
      react()
    ]
  }
})
