import { defineConfig } from "vitest/config"
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/ingest.ts", "src/http.ts", "src/keys.ts"],
      exclude: ["src/**/*.test.ts"]
    }
  }
})
