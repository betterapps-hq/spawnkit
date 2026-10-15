import type { TemplateId } from "@spawn/templates/catalog"
const names = { pixi: "PixiJS", phaser: "Phaser", babylon: "Babylon.js", three: "Three.js" }
export function EngineBadge({ engine, planned = false }: { engine: TemplateId; planned?: boolean }) {
  return (
    <span
      className="absolute left-3 top-3 z-10 flex h-10 min-w-10 items-center justify-center rounded-lg border border-white/70 bg-white/95 px-2.5 py-2 shadow-sm"
      title={`${planned ? "Planned engine: " : ""}${names[engine]}`}
    >
      <img
        src={`/engines/${engine}.${engine === "phaser" ? "png" : "svg"}`}
        alt={`${names[engine]}${planned ? " planned engine" : " logo"}`}
        className="h-6 max-w-20 object-contain"
      />
    </span>
  )
}
