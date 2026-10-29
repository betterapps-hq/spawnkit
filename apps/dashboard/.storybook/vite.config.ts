import { defineConfig } from "vite"
// Storybook's staticDirs already copies public assets; avoid two concurrent copies.
export default defineConfig({ build: { copyPublicDir: false } })
