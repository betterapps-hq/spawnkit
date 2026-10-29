import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import tailwind from "@tailwindcss/vite"
import { build, preview } from "vite"
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const config = {
  configFile: false,
  root,
  publicDir: resolve(root, "apps/dashboard/public"),
  plugins: [tailwind()],
  resolve: {
    alias: {
      "@": resolve(root, "apps/dashboard/src"),
      react: resolve(root, "apps/dashboard/node_modules/react"),
      "react-dom": resolve(root, "apps/dashboard/node_modules/react-dom"),
      "@tanstack/react-query": resolve(root, "apps/dashboard/node_modules/@tanstack/react-query")
    }
  },
  build: {
    outDir: resolve(root, "work/community-browser"),
    emptyOutDir: true,
    rolldownOptions: { input: resolve(root, "tests/fixtures/community.html") }
  },
  preview: { host: "127.0.0.1", port: 6020, strictPort: true },
  oxc: { jsx: { runtime: "automatic" } }
}
await build(config)
const server = await preview(config)
server.printUrls()
