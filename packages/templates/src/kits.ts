import { templates, type PhysicsId, type TemplateId } from "./catalog"

/** Deliberately curated public kits; configuration still resolves through composition. */
export const starterKits = [
  ...templates.map((template) => ({
    id: template.id as string,
    name: `${template.name} game starter`,
    description: template.description,
    template: template.id,
    physics: "none" as PhysicsId,
    useCase: template.dimension === "2d" ? "Sprite-based browser games" : "Interactive 3D browser worlds"
  })),
  {
    id: "phaser-arcade",
    name: "Phaser Arcade Physics starter",
    description: "Start a 2D game with Phaser's Arcade Physics integration, movement and collision handling.",
    template: "phaser" as TemplateId,
    physics: "arcade" as PhysicsId,
    useCase: "2D movement and collision experiments"
  },
  {
    id: "three-rapier",
    name: "Three.js and Rapier 3D starter",
    description: "Combine Three.js rendering with Rapier 3D physics in an editable TypeScript browser game.",
    template: "three" as TemplateId,
    physics: "rapier3d" as PhysicsId,
    useCase: "3D movement with a dedicated physics engine"
  }
]

export function findStarterKit(id: string) {
  return starterKits.find((kit) => kit.id === id)
}
