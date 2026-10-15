import type { ProjectModel, Release } from "./model"

const releaseSeeds: Omit<Release, "build">[] = [
  {
    id: "rel-24",
    number: 24,
    title: "Balance the courtyard encounter",
    branch: "main",
    commit: "d6c4e19",
    actor: "Alex",
    time: "12 minutes ago",
    duration: "42s",
    environment: "sandbox",
    status: "ready",
    compatible: true,
    retained: true
  },
  {
    id: "rel-23",
    number: 23,
    title: "Add the forest checkpoint",
    branch: "main",
    commit: "a8f21b0",
    actor: "Alex",
    time: "2 hours ago",
    duration: "38s",
    environment: "production",
    status: "ready",
    compatible: true,
    retained: true
  },
  {
    id: "rel-22",
    number: 22,
    title: "Fix room reconnect timeout",
    branch: "main",
    commit: "7c5a091",
    actor: "Morgan",
    time: "Yesterday, 16:24",
    duration: "41s",
    environment: "production",
    status: "ready",
    compatible: true,
    retained: true
  },
  {
    id: "rel-21",
    number: 21,
    title: "Update physics integration",
    branch: "physics",
    commit: "bd3e042",
    actor: "Morgan",
    time: "Yesterday, 13:08",
    duration: "19s",
    environment: "sandbox",
    status: "failed",
    compatible: true,
    retained: false
  },
  {
    id: "rel-20",
    number: 20,
    title: "Player inventory migration",
    branch: "main",
    commit: "20ae768",
    actor: "Alex",
    time: "Oct 11, 10:32",
    duration: "35s",
    environment: "production",
    status: "ready",
    compatible: false,
    retained: true
  },
  {
    id: "rel-19",
    number: 19,
    title: "First playable build",
    branch: "main",
    commit: "392ab01",
    actor: "Alex",
    time: "Oct 10, 09:16",
    duration: "44s",
    environment: "production",
    status: "ready",
    compatible: true,
    retained: false
  }
]
const releases: Release[] = releaseSeeds.map((release) => ({
  ...release,
  build: {
    source: "GitHub",
    configVersion: "cfg_8f31",
    artifact:
      release.status === "ready" ? { digest: `sha256:${release.commit.repeat(9)}0`, size: "8.42 MB", files: 42 } : null,
    checks: [
      {
        name: "TypeScript",
        status: release.status === "failed" ? "failed" : "passed",
        detail: release.status === "failed" ? "PlayerState is missing property health" : "No type errors"
      },
      {
        name: "Unit tests",
        status: release.status === "failed" ? "pending" : "passed",
        detail: release.status === "failed" ? "Waiting for build" : "24 tests passed"
      },
      {
        name: "Artifact integrity",
        status: release.status === "failed" ? "pending" : "passed",
        detail: "Digest verified"
      },
      {
        name: "Database compatibility",
        status: release.compatible ? "passed" : "failed",
        detail: release.compatible ? "Compatible with current schema" : "Requires an older player schema"
      }
    ],
    changes: [
      { path: "src/rooms/ForestRoom.ts", added: 28, removed: 12 },
      { path: "src/game/balance.ts", added: 16, removed: 8 },
      { path: "assets/maps/courtyard.json", added: 4, removed: 2 }
    ],
    logs:
      release.status === "failed"
        ? [
            "00:00  Source received",
            "00:02  Dependencies restored from cache",
            "00:08  Checking TypeScript…",
            "00:19  src/game.ts:42",
            "00:19  Type error: PlayerState is missing property health.",
            "00:19  Build exited with code 1."
          ]
        : [
            "00:00  Source received",
            "00:02  Dependencies restored from cache",
            "00:08  TypeScript passed",
            "00:14  24 unit tests passed",
            "00:21  Building game assets",
            "00:35  Artifact stored and digest verified",
            "00:42  Version ready"
          ]
  }
}))

// Illustrative data for isolated Storybook design; never imported by the live dashboard.
export const multiplayerProject: ProjectModel = {
  id: "project-thornwatch",
  name: "Thornwatch",
  slug: "thornwatch",
  engine: "pixi",
  artwork: "/examples/tower-defense.webp",
  mode: "multiplayer",
  services: ["Player authentication", "Cloud saves", "Leaderboards"],
  database: "postgresql",
  repository: "studio/thornwatch",
  domains: [],
  previewsEnabled: true,
  previews: [],
  deployments: [
    {
      id: "dep-24",
      versionId: "rel-24",
      previousVersionId: "rel-22",
      environment: "sandbox",
      kind: "deploy",
      state: "live",
      actor: "Alex",
      time: "12 minutes ago",
      regions: [{ name: "New Jersey", state: "ready", players: 2 }]
    },
    {
      id: "dep-23",
      versionId: "rel-23",
      previousVersionId: "rel-22",
      environment: "production",
      kind: "promote",
      state: "live",
      actor: "Alex",
      time: "2 hours ago",
      regions: [{ name: "New Jersey", state: "ready", players: 84 }]
    },
    {
      id: "dep-22",
      versionId: "rel-22",
      previousVersionId: "rel-20",
      environment: "production",
      kind: "rollback",
      state: "superseded",
      actor: "Morgan",
      time: "Yesterday, 16:24",
      regions: [{ name: "New Jersey", state: "ready", players: 0 }]
    }
  ],
  production: {
    name: "production",
    url: "thornwatch.spawnkit.cloud",
    status: "healthy",
    release: releases[1]!,
    regions: [
      { id: "us-new-jersey", city: "New Jersey", cores: 1, ram: 2, cpu: 38, memory: 52, players: 84, status: "healthy" }
    ]
  },
  sandbox: {
    name: "sandbox",
    url: "staging.thornwatch.spawnkit.cloud",
    status: "healthy",
    release: releases[0]!,
    regions: [
      { id: "us-new-jersey", city: "New Jersey", cores: 1, ram: 2, cpu: 8, memory: 24, players: 2, status: "healthy" }
    ]
  },
  releases,
  monthlyEstimate: 32.54,
  metrics: {
    players: 84,
    rooms: 12,
    errors: 2,
    requests: "18.4k",
    traffic: [8, 14, 12, 22, 18, 34, 29, 45, 52, 44, 61, 57, 75, 68, 89, 84]
  },
  players: [
    {
      id: "player_01",
      name: "Fern",
      email: "fern@example.test",
      joined: "Oct 11",
      lastSeen: "Online now",
      status: "active",
      saves: 3
    },
    {
      id: "player_02",
      name: "Atlas",
      email: "atlas@example.test",
      joined: "Oct 12",
      lastSeen: "4 minutes ago",
      status: "active",
      saves: 8
    },
    {
      id: "player_03",
      name: "Juniper",
      email: "juniper@example.test",
      joined: "Oct 12",
      lastSeen: "18 minutes ago",
      status: "active",
      saves: 2
    },
    {
      id: "player_04",
      name: "River",
      email: "river@example.test",
      joined: "Oct 13",
      lastSeen: "Yesterday",
      status: "banned",
      saves: 1
    }
  ],
  logs: [
    {
      id: "log1",
      time: "10:42:03.084",
      level: "info",
      environment: "production",
      region: "New Jersey",
      message: "Room forest-12 created. Waiting for players.",
      release: "rel-23"
    },
    {
      id: "log2",
      time: "10:42:03.216",
      level: "info",
      environment: "production",
      region: "New Jersey",
      message: "Player joined forest-12. Connected clients: 4.",
      release: "rel-23"
    },
    {
      id: "log3",
      time: "10:42:04.502",
      level: "warn",
      environment: "production",
      region: "New Jersey",
      message: "Room forest-08 tick took 42ms. Target: 33ms.",
      release: "rel-23"
    },
    {
      id: "log4",
      time: "10:42:05.091",
      level: "info",
      environment: "sandbox",
      region: "New Jersey",
      message: "Build rel-24 passed readiness checks.",
      release: "rel-24"
    },
    {
      id: "log5",
      time: "10:42:06.624",
      level: "error",
      environment: "production",
      region: "New Jersey",
      message: "Save request timed out after 3000ms. Retrying (1/3).",
      release: "rel-23"
    },
    {
      id: "log6",
      time: "10:42:07.012",
      level: "info",
      environment: "production",
      region: "New Jersey",
      message: "Save retry completed successfully.",
      release: "rel-23"
    }
  ]
}
export const frontendProject: ProjectModel = {
  ...multiplayerProject,
  id: "project-clockwork",
  name: "Clockwork Courier",
  slug: "clockwork-courier",
  engine: "phaser",
  artwork: "/examples/platformer.webp",
  mode: "single",
  services: [],
  database: "none",
  repository: null,
  previewsEnabled: false,
  previews: [],
  deployments: multiplayerProject.deployments.filter((deployment) => deployment.environment === "production"),
  monthlyEstimate: 0,
  production: { ...multiplayerProject.production, url: "clockwork-courier.spawnkit.cloud", regions: [] },
  sandbox: null,
  releases: releases
    .filter((release) => release.environment === "production")
    .map((release) => ({ ...release, compatible: true })),
  players: [],
  logs: multiplayerProject.logs
    .filter((log) => log.level === "info")
    .map((log) => ({
      ...log,
      message: "Frontend asset request served from cache.",
      environment: "production" as const,
      region: "Global"
    })),
  metrics: { ...multiplayerProject.metrics, players: 0, rooms: 0, errors: 0 }
}
export const servicesProject: ProjectModel = {
  ...frontendProject,
  id: "project-orchard",
  name: "Orchard Trail",
  slug: "orchard-trail",
  engine: "pixi",
  artwork: "/examples/snake.webp",
  services: ["Player authentication", "Cloud saves", "Leaderboards"],
  database: "none",
  players: multiplayerProject.players,
  monthlyEstimate: 5,
  production: { ...frontendProject.production, url: "orchard-trail.spawnkit.cloud" }
}
export const multiRegionProject: ProjectModel = {
  ...multiplayerProject,
  id: "project-iron",
  name: "Iron Frontier",
  slug: "iron-frontier",
  engine: "babylon",
  artwork: "/examples/iron-frontier.webp",
  monthlyEstimate: 73.42,
  production: {
    ...multiplayerProject.production,
    url: "iron-frontier.spawnkit.cloud",
    regions: [
      ...multiplayerProject.production.regions,
      { id: "de-frankfurt", city: "Frankfurt", cores: 1, ram: 2, cpu: 46, memory: 61, players: 124, status: "healthy" },
      { id: "jp-tokyo", city: "Tokyo", cores: 1, ram: 2, cpu: 27, memory: 48, players: 62, status: "healthy" }
    ]
  },
  sandbox: { ...multiplayerProject.sandbox!, url: "staging.iron-frontier.spawnkit.cloud" },
  repository: "studio/iron-frontier",
  metrics: { ...multiplayerProject.metrics, players: 270, rooms: 36 }
}
export const freshProject: ProjectModel = {
  ...frontendProject,
  id: "project-relic",
  name: "Relic Run",
  slug: "relic-run",
  engine: "three",
  artwork: "/examples/endless-runner.webp",
  releases: [],
  logs: [],
  deployments: [],
  production: { ...frontendProject.production, url: "relic-run.spawnkit.cloud", release: null, status: "empty" },
  metrics: { players: 0, rooms: 0, errors: 0, requests: "0", traffic: [] }
}
export const degradedProject: ProjectModel = {
  ...multiRegionProject,
  production: {
    ...multiRegionProject.production,
    status: "degraded",
    regions: multiRegionProject.production.regions.map((region, index) =>
      index === 1 ? { ...region, status: "degraded", cpu: 94, memory: 89 } : region
    )
  },
  metrics: { ...multiRegionProject.metrics, errors: 28 }
}
export const buildingProject: ProjectModel = {
  ...multiplayerProject,
  releases: [
    {
      ...releases[0]!,
      id: "rel-25",
      number: 25,
      title: "Add seasonal rewards",
      status: "building",
      retained: false,
      build: {
        ...releases[0]!.build,
        artifact: null,
        checks: releases[0]!.build.checks.map((check, index) => ({
          ...check,
          status: index === 0 ? "running" : "pending",
          detail: "Build in progress"
        })),
        logs: ["00:00  Source received", "00:08  Checking TypeScript…"]
      },
      duration: "28s",
      time: "Just now"
    },
    ...releases
  ]
}
export const emptySandboxProject: ProjectModel = {
  ...multiplayerProject,
  sandbox: { ...multiplayerProject.sandbox!, release: null, status: "empty" }
}
export const demoProjects = [multiplayerProject, frontendProject, servicesProject, multiRegionProject, freshProject]
export const frontendSandboxProject: ProjectModel = {
  ...frontendProject,
  monthlyEstimate: 5,
  sandbox: { ...multiplayerProject.sandbox!, url: "staging.clockwork-courier.spawnkit.cloud", regions: [] },
  releases: [releases[0]!, ...frontendProject.releases]
}
export const multiplayerProductionProject: ProjectModel = {
  ...multiplayerProject,
  sandbox: null,
  releases: multiplayerProject.releases.filter((release) => release.environment === "production"),
  monthlyEstimate: 25
}
export const pausedProject: ProjectModel = {
  ...multiplayerProject,
  production: {
    ...multiplayerProject.production,
    status: "paused",
    regions: multiplayerProject.production.regions.map((region) => ({
      ...region,
      status: "paused",
      cpu: 0,
      memory: 0,
      players: 0
    }))
  },
  metrics: { ...multiplayerProject.metrics, players: 0, rooms: 0, traffic: [] }
}

function previewVersion(number: number, status: Release["status"], title: string, branch: string): Release {
  const seed = releases[0]!
  const commit = `e${number}4a9b1`
  return {
    ...seed,
    id: `rel-${number}`,
    number,
    title,
    branch,
    commit,
    actor: "Morgan",
    time: "4 minutes ago",
    duration: status === "building" ? "18s" : "46s",
    environment: "preview",
    status,
    retained: status === "ready",
    build: {
      ...seed.build,
      artifact: status === "ready" ? { digest: `sha256:${commit.repeat(9)}0`, size: "8.67 MB", files: 44 } : null,
      checks: seed.build.checks.map((check, index) => ({
        ...check,
        status:
          status === "ready" || index === 0
            ? "passed"
            : index === 1
              ? status === "failed"
                ? "failed"
                : "running"
              : "pending",
        detail:
          index === 1 && status === "failed"
            ? "2 tests failed"
            : status === "building" && index === 1
              ? "Running test suite"
              : check.detail
      })),
      logs:
        status === "ready"
          ? seed.build.logs
          : status === "failed"
            ? [
                "00:00  Source received",
                "00:08  TypeScript passed",
                "00:19  Unit tests: 2 failed, 22 passed",
                "00:19  Build exited with code 1."
              ]
            : [
                "00:00  Source received",
                "00:02  Dependencies restored",
                "00:08  TypeScript passed",
                "00:18  Running unit tests…"
              ]
    }
  }
}
const previewVersions = [
  previewVersion(27, "building", "Add cooperative matchmaking", "feat/co-op"),
  previewVersion(26, "ready", "Rework the frost mage abilities", "feat/frost-mage"),
  previewVersion(25, "failed", "Improve controller navigation", "fix/controller-nav")
]
const earlierSandboxVersion: Release = {
  ...releases[2]!,
  id: "rel-18",
  number: 18,
  title: "Original courtyard encounter",
  environment: "sandbox",
  branch: "release/courtyard",
  commit: "189a5bc",
  time: "Oct 9, 11:42"
}
export const previewProject: ProjectModel = {
  ...multiplayerProject,
  releases: [...previewVersions, ...releases, earlierSandboxVersion],
  previews: [
    {
      id: "preview-42",
      number: 42,
      title: "Add cooperative matchmaking",
      branch: "feat/co-op",
      commit: previewVersions[0]!.commit,
      actor: "Morgan",
      state: "building",
      url: "pr-42.thornwatch.spawnkit.cloud",
      versionId: "rel-27",
      updated: "4 minutes ago",
      isolation: "Isolated runtime / isolated data"
    },
    {
      id: "preview-41",
      number: 41,
      title: "Rework the frost mage abilities",
      branch: "feat/frost-mage",
      commit: previewVersions[1]!.commit,
      actor: "Alex",
      state: "ready",
      url: "pr-41.thornwatch.spawnkit.cloud",
      versionId: "rel-26",
      updated: "18 minutes ago",
      isolation: "Isolated runtime / isolated data"
    },
    {
      id: "preview-39",
      number: 39,
      title: "Improve controller navigation",
      branch: "fix/controller-nav",
      commit: previewVersions[2]!.commit,
      actor: "Morgan",
      state: "failed",
      url: "pr-39.thornwatch.spawnkit.cloud",
      versionId: "rel-25",
      updated: "32 minutes ago",
      isolation: "No runtime active; build failed"
    }
  ]
}
export const drainingProject: ProjectModel = {
  ...previewProject,
  production: {
    ...previewProject.production,
    release: releases[0]!,
    regions: multiRegionProject.production.regions.slice(0, 2)
  },
  deployments: [
    {
      id: "dep-25",
      versionId: "rel-24",
      previousVersionId: "rel-23",
      environment: "production",
      kind: "promote",
      state: "draining",
      actor: "Alex",
      time: "Just now",
      regions: [
        { name: "New Jersey", state: "draining", players: 12 },
        { name: "Frankfurt", state: "ready", players: 0 }
      ]
    },
    ...previewProject.deployments
  ]
}
