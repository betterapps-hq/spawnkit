import { fileURLToPath } from "node:url"
import { defineMain } from "@spawn/storybook-config/main"
import tailwindcss from "@tailwindcss/vite"
export default defineMain({
  core: { allowedHosts: process.env.SPAWN_LOCAL_ORIGIN ? [new URL(process.env.SPAWN_LOCAL_ORIGIN).hostname] : [] },
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: fileURLToPath(new URL("./vite.config.ts", import.meta.url)) } }
  },
  stories: ["../src/**/*.stories.tsx"],
  staticDirs: ["../public"],
  async viteFinal(config) {
    const { mergeConfig } = await import("vite")
    const origin = process.env.SPAWN_LOCAL_ORIGIN ? new URL(process.env.SPAWN_LOCAL_ORIGIN) : undefined
    return mergeConfig(config, {
      server: {
        allowedHosts: origin ? [origin.hostname] : [],
        hmr: origin
          ? {
              host: origin.hostname,
              protocol: origin.protocol === "https:" ? "wss" : "ws",
              clientPort: Number(origin.port || (origin.protocol === "https:" ? 443 : 80))
            }
          : undefined
      },
      plugins: [tailwindcss()],
      resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) }, dedupe: ["react", "react-dom"] }
    })
  }
})
