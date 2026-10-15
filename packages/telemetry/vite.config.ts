import { defineConfig } from "vite"

export default defineConfig({
  build: {
    target: "es2022",
    minify: false,
    lib: { entry: { index: "src/index.ts", protocol: "src/protocol.ts", otel: "src/otel.ts" }, formats: ["es"] }
  }
})
