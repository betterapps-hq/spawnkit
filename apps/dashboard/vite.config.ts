import { fileURLToPath } from "node:url"
import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { docsHighlight } from "./docs-highlight"

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
    // Worker-only imports are resolved by Cloudflare in production; ordinary Vite dev has no bindings.
    ...(command === "serve" && process.env.SPAWN_WORKER_DEV !== "true"
      ? { optimizeDeps: { exclude: ["cloudflare:workers"] }, ssr: { external: ["cloudflare:workers"] } }
      : {}),
    server: {
      allowedHosts: process.env.SPAWN_LOCAL_ORIGIN ? [new URL(process.env.SPAWN_LOCAL_ORIGIN).hostname] : [],
      watch: { ignored: ["**/coverage/**", "**/storybook-static/**", "**/dist/**", "**/work/**"] }
    },
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    plugins: [
      // Resolve pre-tokenized code in both client and server route modules.
      docsHighlight(),
      tailwindcss(),
      ...(command === "build" || process.env.SPAWN_WORKER_DEV === "true"
        ? [cloudflare({ viteEnvironment: { name: "ssr" } })]
        : []),
      tanstackStart(),
      react()
    ]
  }
})
