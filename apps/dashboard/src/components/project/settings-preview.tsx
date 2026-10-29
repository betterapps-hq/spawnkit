import { SettingsForm, type SettingsDraft, type SettingsScenario } from "./settings-form"
const original: SettingsDraft = {
  name: "Orchard Snake",
  description:
    "One more bite. Collect apples and grow your snake through a sunny orchard. Steer with arrow keys, WASD, or swipes; press Space to pause.",
  genre: "Arcade",
  dimension: "2D",
  cover: { url: "/examples/snake.webp", name: "orchard-snake.webp" },
  trailer: null
}
export function SettingsPreview({
  scenario = "default",
  connected = false,
  onExit
}: {
  scenario?: SettingsScenario
  connected?: boolean
  onExit?: () => void
}) {
  return (
    <SettingsForm
      initial={original}
      scenario={scenario}
      hostname="spawn-snake.spawnkit.games"
      projectId="460be2a7-c8b2-4a65-82e5-6a5e00430ad1"
      repository={connected ? "spawnkit/orchard-snake" : null}
      onExit={onExit}
      onSave={async (draft) => {
        await new Promise((resolve) => setTimeout(resolve, 700))
        return draft
      }}
      onDelete={async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }}
    />
  )
}
