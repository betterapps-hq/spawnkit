import { defineConfig } from "vite"

export default defineConfig({
  publicDir: false,
  ssr: { target: "node", noExternal: true },
  build: {
    ssr: true,
    target: "node24",
    minify: false,
    sourcemap: false,
    license: { fileName: "THIRD-PARTY-LICENSES.md" },
    rolldownOptions: {
      input: "src/main.ts",
      output: { format: "es", entryFileNames: "main.mjs", banner: "#!/usr/bin/env node" }
    }
  }
})
