import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/auth-config.ts",
        "src/lib/auth-flow.ts",
        "src/lib/pricing.ts",
        "src/lib/project-records.ts",
        "src/lib/github-selection.ts"
      ]
    }
  }
})
