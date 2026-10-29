import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

// Reuse the repository's pinned image encoder; originals remain the source assets.
const sharp = createRequire(new URL("../apps/control-api/package.json", import.meta.url))("sharp")
for (const engine of ["pixi", "phaser", "babylon", "three"]) {
  const source = new URL(`../apps/dashboard/public/templates/${engine}.webp`, import.meta.url)
  for (const width of [320, 640]) {
    const output = new URL(`../apps/dashboard/public/templates/${engine}-${width}.webp`, import.meta.url)
    const result = await sharp(fileURLToPath(source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(fileURLToPath(output))
    console.log(`${engine}-${width}.webp: ${result.size} bytes`)
  }
}
