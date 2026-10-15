import { DAY, utcDay } from "./engagement"
import type { AnalyticsData, AnalyticsIssue, AnalyticsSession, PlayerDay } from "./model"

// Imported by stories only. No sample sessions are bundled into the live application.
const issues: AnalyticsIssue[] = [
  {
    id: "SPN-241",
    sourceStartLine: 36,
    operation: "saveMs",
    title: "SaveConflictError",
    message: "Checkpoint revision is behind the persisted save",
    location: "saveCheckpoint at src/services/saves.ts:42",
    category: "Error",
    priority: "High",
    state: "Regressed",
    owner: "Gameplay",
    status: "unresolved",
    firstRelease: "1.8.3",
    hypothesis:
      "The new optimistic save path may retry with an outdated revision. Compare the revision update in 1.8.3 with the previous release before changing the retry policy.",
    source: [
      "async function saveCheckpoint(state: GameState) {",
      "  const checkpoint = serialize(state)",
      "  const response = await saves.write(checkpoint, {",
      "    expectedRevision: state.saveRevision,",
      "  })",
      "  if (response.status === 409) {",
      "    throw new SaveConflictError(response.revision)",
      "  }",
      "  state.saveRevision = response.revision",
      "}"
    ]
  },
  {
    id: "SPN-238",
    sourceStartLine: 114,
    operation: "loadMs",
    title: "WebGL context lost",
    message: "Renderer context was lost while loading Forest Ruins",
    location: "Renderer.render at src/render/renderer.ts:118",
    category: "Error",
    priority: "High",
    state: "New",
    owner: "Rendering",
    status: "unresolved",
    firstRelease: "1.8.3",
    hypothesis:
      "Texture allocation during scene transitions may exceed the memory budget on mobile devices. Check texture disposal and measure peak allocations.",
    source: [
      "function renderScene(scene: Scene) {",
      "  const textures = scene.loadTextures()",
      "  renderer.bind(textures)",
      "  if (renderer.contextLost) {",
      "    throw new Error('WebGL context lost')",
      "  }",
      "  renderer.draw(scene)",
      "}"
    ]
  },
  {
    id: "SPN-229",
    sourceStartLine: 84,
    title: "Room join timed out",
    message: "Room handshake exceeded 3,000 ms",
    location: "joinRoom at src/network/rooms.ts:87",
    category: "Error",
    priority: "Medium",
    state: "Ongoing",
    owner: "Multiplayer",
    status: "unresolved",
    firstRelease: "1.8.2",
    hypothesis:
      "The room handshake exceeded its deadline. Correlate region and server queue time before increasing the timeout.",
    source: [
      "async function joinRoom(id: string) {",
      "  const connection = await socket.connect(id)",
      "  await connection.waitFor('ready', {",
      "    timeout: 3000,",
      "  })",
      "  return connection",
      "}"
    ]
  },
  {
    id: "SPN-236",
    sourceStartLine: 62,
    title: "Cannot read properties of undefined",
    message: "Cannot read properties of undefined (reading 'slot')",
    location: "equipItem at src/game/inventory.ts:64",
    category: "Error",
    priority: "Medium",
    state: "New",
    owner: "Unassigned",
    status: "unresolved",
    firstRelease: "1.8.3",
    hypothesis:
      "An inventory entry may be removed between selection and equip. Check whether the selection still exists before accessing its slot.",
    source: [
      "function equipItem(itemId: string) {",
      "  const item = inventory.get(itemId)",
      "  const target = equipment[item.slot]",
      "  target.replace(item)",
      "}"
    ]
  },
  {
    id: "SPN-222",
    sourceStartLine: 27,
    operation: "loadMs",
    title: "Scene asset failed to load",
    message: "forest-atlas.webp returned 503",
    location: "AssetLoader.load at src/assets/loader.ts:29",
    category: "Error",
    priority: "Low",
    state: "Ongoing",
    owner: "Platform",
    status: "unresolved",
    firstRelease: "1.8.2",
    hypothesis:
      "A transient asset request failed. Inspect retry behavior and cache health before changing asset packaging.",
    source: [
      "async function loadAsset(url: string) {",
      "  const response = await fetch(url)",
      "  if (!response.ok) throw new AssetError(url)",
      "  return response.blob()",
      "}"
    ]
  },
  {
    id: "SPN-217",
    sourceStartLine: 201,
    operation: "frameMs",
    title: "Frame budget exceeded",
    message: "Simulation update exceeded the 16.7 ms frame budget",
    location: "World.update at src/game/world.ts:203",
    category: "Performance",
    priority: "Medium",
    state: "Ongoing",
    owner: "Rendering",
    status: "unresolved",
    firstRelease: "1.8.2",
    hypothesis:
      "Collision work may grow with nearby entities. Measure the broad phase and avoid scanning the entire world each frame.",
    source: [
      "function updateWorld(delta: number) {",
      "  for (const entity of world.entities) {",
      "    const nearby = world.entities.filter(inRange(entity))",
      "    resolveCollisions(entity, nearby)",
      "  }",
      "}"
    ]
  }
]
const now = Date.UTC(2026, 9, 14, 18)
const sessions: AnalyticsSession[] = Array.from({ length: 2400 }, (_, index) => {
  const age = (index * 48) / 2400
  const release = age < 8 && index % 5 !== 0 ? "1.8.3" : age < 36 ? "1.8.2" : "1.8.1"
  const device = (["Desktop", "Mobile", "Desktop", "Mobile", "Tablet"] as const)[index % 5]!
  const environment = index % 11 === 0 ? "sandbox" : "production"
  const issueId =
    release === "1.8.3" && index % 4 === 1
      ? "SPN-241"
      : release === "1.8.3" && device === "Mobile" && index % 9 === 0
        ? "SPN-238"
        : index % 37 === 0
          ? "SPN-229"
          : release === "1.8.3" && index % 29 === 0
            ? "SPN-236"
            : index % 53 === 0
              ? "SPN-222"
              : index % 41 === 0
                ? "SPN-217"
                : undefined
  return {
    id: `s_${(0x7a2f00 + index * 17).toString(16)}`,
    time: now - age * 3_600_000 - 900_000,
    environment,
    release,
    device,
    browser: device === "Desktop" ? "Chrome 141" : device === "Mobile" ? "Safari 19" : "Chrome 141",
    region: ["North America", "Europe", "Asia Pacific"][index % 3]!,
    scene: ["Forest Ruins", "Sunken Temple", "Campfire"][index % 3]!,
    duration: 48 + ((index * 37) % 920),
    loadMs: 480 + ((index * 17) % 1100) + (device === "Mobile" ? 420 : 0),
    frameMs: Number((12 + ((index * 7) % 90) / 10 + (issueId === "SPN-217" ? 32 : 0)).toFixed(1)),
    saveMs: 110 + ((index * 11) % 300) + (issueId === "SPN-241" ? 1500 : 0),
    completed: !issueId || issueId === "SPN-217",
    operationFailures:
      issueId === "SPN-241"
        ? { saveMs: "conflict" }
        : issueId === "SPN-238"
          ? { loadMs: "context_lost" }
          : issueId === "SPN-222"
            ? { loadMs: "503" }
            : {},
    ...(issueId ? { issueId } : {})
  }
})
const playerDays: PlayerDay[] = []
// Stable identities, actual return days, and active play time make every displayed metric reproducible.
for (let cohort = 0; cohort < 64; cohort++) {
  const firstSeen = utcDay(now) - (64 - cohort) * DAY
  const count = 34 + Math.floor(cohort * 1.8) + (cohort % 7) * 3
  for (let player = 0; player < count; player++) {
    const seed = cohort * 7919 + player * 104729
    for (let age = 0; age < 64 - cohort; age++) {
      const chance = age === 1 ? 47 : age < 7 ? 36 : age < 30 ? 24 : 16
      if (age > 0 && (seed + age * 3701) % 101 >= chance) continue
      const day = firstSeen + age * DAY
      const started = 2 + ((seed + age) % 7)
      playerDays.push({
        playerId: `p_${seed.toString(36)}`,
        firstSeen,
        day,
        environment: player % 13 === 0 ? "sandbox" : "production",
        release: day >= utcDay(now) - DAY ? "1.8.2" : "1.8.1",
        activeSeconds: 360 + ((seed + age * 733) % 4200),
        sessions: 1 + ((seed + age) % 3),
        levelStarts: started,
        levelCompletions: Math.max(0, started - (seed % 3))
      })
    }
  }
}
export const analyticsFixture: AnalyticsData = {
  now,
  sessions,
  issues,
  releases: [
    { version: "1.8.3", createdAt: now - 8 * 3_600_000, commit: "a41e9c83ef75d02b4e641ec619dc38a86d10a3aa" },
    { version: "1.8.2", createdAt: now - 36 * 3_600_000, commit: "7f02cd901f8cd52b4d388eb45628af01ce6a12e9" },
    { version: "1.8.1", createdAt: now - 3 * DAY, commit: "b5a1208dd319f0f116da861adc0b291c84cbe4de" }
  ],
  playerDays,
  playerCoverage: (["production", "sandbox"] as const).map((environment) => ({
    environment,
    from: utcDay(now) - 64 * DAY,
    until: utcDay(now)
  }))
}

// Long-lived games keep clients on older releases. Catalog entries need not have traffic in this window.
const historicReleases = Array.from({ length: 497 }, (_, index) => ({
  version:
    index === 160
      ? "1.6.0-rc.2+checkpoint-recovery.mobile-renderer"
      : `1.${7 - Math.floor(index / 100)}.${99 - (index % 100)}`,
  createdAt: now - (index + 4) * DAY,
  commit: (0x918b3de0 + index * 7919).toString(16).padEnd(40, "0")
}))
export const manyReleasesFixture: AnalyticsData = {
  ...analyticsFixture,
  releases: [...analyticsFixture.releases!, ...historicReleases],
  sessions: [
    ...sessions,
    ...historicReleases.slice(0, 60).flatMap((release, index) =>
      Array.from({ length: 1 + (index % 4) }, (_, observation) => ({
        ...sessions[1]!,
        id: `legacy-${index}-${observation}`,
        release: release.version,
        time: now - (1 + (index % 20)) * 3_600_000 - observation * 60_000,
        completed: true,
        issueId: undefined,
        operationFailures: {},
        saveMs: 220
      }))
    )
  ].map(({ issueId, ...session }) => ({ ...session, ...(issueId ? { issueId } : {}) }))
}
