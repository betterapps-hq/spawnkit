import { browserToolsSource } from "./browser-tools"
import { isAddonId, isTemplateId, templates, validateProjectName } from "./catalog"
import type { AddonId, TemplateId } from "./catalog"
import { applyExtensions, type ExtensionOptions } from "./extensions"
import { babylonSource, phaserSource, pixiSource, threeSource } from "./game-sources"
import { defaultCover, listingSchema } from "./listing"
import { listingConfigSource, listingPluginSource } from "./listing-config"
import { localDevelopmentFiles, playwrightConfiguration } from "./local-development"
import { kootaSimulation, ecsSimulation, inputSource, plainSimulation, simulationTest } from "./simulation"
import { browserTests } from "./testing"

export interface ProjectOptions extends ExtensionOptions {
  name: string
  template: TemplateId
  addons?: readonly AddonId[]
}
export interface TemplateModule {
  id: string
  requires: readonly string[]
  conflicts: readonly string[]
  files: Record<string, string>
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
export interface ProjectPlan {
  name: string
  template: TemplateId
  modules: string[]
  files: Record<string, string>
}

export function describeProjectPlan(plan: ProjectPlan) {
  const pkg = JSON.parse(plan.files["package.json"]!) as {
    packageManager: string
    engines: Record<string, string>
    scripts: Record<string, string>
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
  }
  return {
    packageManager: pkg.packageManager,
    engines: pkg.engines,
    scripts: pkg.scripts,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
    resources: [] as string[],
    notices: ["Dependencies are not installed automatically.", "No hosted resources are provisioned."]
  }
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n"

const base: TemplateModule = {
  id: "base",
  requires: [],
  conflicts: [],
  scripts: {
    dev: "dev-domains run app",
    build: "tsc --noEmit && vite build",
    preview: "vite preview",
    lint: "oxlint --no-ignore src vite.config.ts"
  },
  devDependencies: {
    typescript: "7.0.2",
    vite: "8.3.4",
    oxlint: "1.88.0",
    oxfmt: "0.73.0",
    "@buildkitgg/dev-domains": "0.1.0",
    "@types/node": "24.19.2"
  },
  files: {
    ...localDevelopmentFiles,
    ".gitignore":
      "node_modules/\ndist/\n.env\n.env.*\n!.env.example\ncoverage/\n.vitest/\nstorybook-static/\n.spawn/add.lock\n.spawn/recovery.json\n",
    ".npmrc": "engine-strict=true\n",
    "pnpm-workspace.yaml": "packages: []\n",
    "tsconfig.json": json({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        isolatedModules: true,
        esModuleInterop: true,
        types: ["vite/client"]
      },
      include: ["src", "spawnkit.config.ts", "spawnkit", "vite.config.ts"]
    }),
    ".oxlintrc.json": json({ categories: { correctness: "error" }, ignorePatterns: ["dist/**"] }),
    ".oxfmtrc.json": json({ semi: false, ignorePatterns: ["dist/**", "pnpm-lock.yaml"] }),
    "src/score.ts": "export function advanceScore(score: number): number {\n  return score + 1\n}\n",
    "src/input.ts": inputSource,
    "vite.config.ts":
      'import { defineConfig } from "vite"\nimport { spawnkitListing } from "./spawnkit/vite"\n\nexport default defineConfig({ plugins: [spawnkitListing()], build: { target: "es2022" } })\n',
    "spawnkit/config.ts": listingConfigSource,
    "spawnkit/vite.ts": listingPluginSource,
    "src/style.css":
      "* { box-sizing: border-box; }\nbody { margin: 0; background: #0a141c; color: #e7f0f5; font-family: system-ui, sans-serif; }\nheader { padding: 18px 24px; display: flex; gap: 20px; align-items: baseline; flex-wrap: wrap; }\nh1 { margin: 0; font-size: 20px; }\np { margin: 0; color: #a1b6c5; }\n#game { height: calc(100dvh - 100px); min-height: 300px; }\ncanvas { display: block; width: 100%; height: 100%; touch-action: none; }\n"
  }
}

const registry: readonly TemplateModule[] = [
  base,
  {
    id: "playwright",
    requires: ["base"],
    conflicts: [],
    devDependencies: {
      "@types/node": "24.19.2",
      "@playwright/test": "1.64.0",
      playwright: "1.64.0"
    },
    scripts: {
      e2e: "node scripts/browser-tools.mjs e2e",
      "e2e:ui": "node scripts/browser-tools.mjs e2e --ui",
      "test:setup": "node scripts/browser-tools.mjs install",
      setup: "dev-domains setup && node scripts/browser-tools.mjs install"
    },
    files: {
      "playwright.config.ts": playwrightConfiguration,
      "scripts/browser-tools.mjs": browserToolsSource
    }
  },
  {
    id: "storybook",
    requires: ["base"],
    conflicts: [],
    devDependencies: {
      storybook: "10.6.2",
      "@storybook/html-vite": "10.6.2"
    },
    scripts: {
      storybook: "dev-domains run stories"
    },
    files: {
      ".storybook/main.ts":
        'import type { StorybookConfig } from "@storybook/html-vite"\nconst origin = process.env.PORTLESS_URL ? new URL(process.env.PORTLESS_URL) : undefined\nconst config: StorybookConfig = {\n framework: { name: "@storybook/html-vite", options: {} },\n stories: ["../src/**/*.stories.ts"], core: { disableTelemetry: true, allowedHosts: origin ? [origin.hostname] : [] },\n async viteFinal(config) {\n  const { mergeConfig } = await import("vite")\n  return mergeConfig(config, {server:{allowedHosts:origin ? [origin.hostname] : [], hmr: origin ? {host:origin.hostname,protocol:origin.protocol === "https:" ? "wss" : "ws",clientPort:Number(origin.port || (origin.protocol === "https:" ? 443 : 80))} : undefined}})\n }\n}\nexport default config\n',
      ".storybook/preview.ts":
        'import type { Preview } from "@storybook/html-vite"\nimport "../src/style.css"\nconst preview: Preview = { parameters: { layout: "centered" } }\nexport default preview\n',
      "src/hud.ts":
        'export function createScoreDisplay(score: number) {\n const element = document.createElement("output")\n element.setAttribute("aria-label", "Score")\n element.style.cssText = "padding: 12px 20px; border: 1px solid #657987; border-radius: 8px; font: 600 18px system-ui"\n element.textContent = "Score: " + score\n return element\n}\n',
      "src/hud.stories.ts":
        'import type { Meta, StoryObj } from "@storybook/html-vite"\nimport { createScoreDisplay } from "./hud"\nconst meta = {title:"Game/Score",args:{score:0},render:({score})=>createScoreDisplay(score)} satisfies Meta<{score:number}>\nexport default meta\ntype Story = StoryObj<{score:number}>\nexport const Empty: Story = {}\nexport const Playing: Story = {args:{score:120}}\n'
    }
  },
  {
    id: "pixi",
    requires: ["base"],
    conflicts: ["phaser", "babylon", "three"],
    dependencies: { "pixi.js": "8.22.0" },
    files: { "src/main.ts": pixiSource }
  },
  {
    id: "phaser",
    requires: ["base"],
    conflicts: ["pixi", "babylon", "three"],
    dependencies: { phaser: "3.90.0" },
    files: { "src/main.ts": phaserSource }
  },
  {
    id: "babylon",
    requires: ["base"],
    conflicts: ["pixi", "phaser", "three"],
    dependencies: { "@babylonjs/core": "9.30.0" },
    files: { "src/main.ts": babylonSource }
  },
  {
    id: "three",
    requires: ["base"],
    conflicts: ["pixi", "phaser", "babylon"],
    dependencies: { three: "0.186.1" },
    devDependencies: { "@types/three": "0.186.0" },
    files: { "src/main.ts": threeSource }
  },
  {
    id: "movement",
    requires: ["base"],
    conflicts: ["bitecs", "koota"],
    files: { "src/simulation.ts": plainSimulation }
  },
  {
    id: "bitecs",
    requires: ["base"],
    conflicts: ["movement", "koota"],
    dependencies: { bitecs: "0.4.0" },
    files: { "src/simulation.ts": ecsSimulation }
  },
  {
    id: "koota",
    requires: ["base"],
    conflicts: ["movement", "bitecs"],
    dependencies: { koota: "0.6.6" },
    files: { "src/simulation.ts": kootaSimulation }
  },
  {
    id: "vitest",
    requires: ["base"],
    conflicts: [],
    devDependencies: {
      vitest: "5.0.4",
      "@vitest/coverage-v8": "5.0.4",
      "@vitest/browser-playwright": "5.0.4",
      playwright: "1.64.0"
    },
    scripts: {
      test: "node scripts/browser-tools.mjs test",
      "test:setup": "node scripts/browser-tools.mjs install",
      setup: "dev-domains setup && node scripts/browser-tools.mjs install"
    },
    files: {
      "scripts/browser-tools.mjs": browserToolsSource,
      "vitest.config.ts":
        'import { defineConfig } from "vitest/config"\nimport { playwright } from "@vitest/browser-playwright"\nexport default defineConfig({test:{fileParallelism:false,browser:{enabled:true,headless:true,provider:playwright({launchOptions:{args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]}}),instances:[{browser:"chromium"}]},include:["src/**/*.test.ts"],coverage:{provider:"v8",include:["src/**/*.ts"],exclude:["src/**/*.test.ts","src/**/*.stories.ts","src/**/*.d.ts"],reporter:["text","html","lcov","json-summary"],thresholds:{statements:90,branches:90,functions:90,lines:90}}}})\n',
      "src/score.test.ts":
        'import { expect, it } from "vitest"\nimport { advanceScore } from "./score"\n\nit("adds one point for a collectible", () => {\n  expect(advanceScore(4)).toBe(5)\n})\n'
    }
  }
]

export function resolveModules(
  ids: readonly string[],
  modules: readonly TemplateModule[] = registry
): TemplateModule[] {
  const resolved: TemplateModule[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(id: string) {
    if (visited.has(id)) return
    if (visiting.has(id)) throw new Error(`Circular template dependency: ${id}`)
    const module = modules.find((entry) => entry.id === id)
    if (!module) throw new Error(`Unknown template module: ${id}`)
    visiting.add(id)
    module.requires.forEach(visit)
    visiting.delete(id)
    visited.add(id)
    resolved.push(module)
  }
  ids.forEach(visit)
  for (const module of resolved) {
    const conflict = module.conflicts.find((id) => visited.has(id))
    if (conflict) throw new Error(`Template modules ${module.id} and ${conflict} cannot be combined`)
  }
  return resolved
}

function merge(target: Record<string, string>, source: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(source)) {
    if (target[key] !== undefined && target[key] !== value) throw new Error(`Conflicting template value: ${key}`)
    target[key] = value
  }
}

export function createProjectPlan(options: ProjectOptions): ProjectPlan {
  const nameError = validateProjectName(options.name)
  if (nameError) throw new Error(nameError)
  if (!isTemplateId(options.template)) throw new Error(`Unknown template: ${options.template}`)
  for (const addon of options.addons ?? []) {
    if (!isAddonId(addon)) throw new Error(`Unknown add-on: ${addon}`)
  }
  const template = templates.find((entry) => entry.id === options.template)
  if (!template) throw new Error("Template not found")
  const modules = resolveModules([
    ...template.modules,
    ...(options.addons?.some((id) => id === "bitecs" || id === "koota") ? [] : ["movement"]),
    ...(options.addons ?? [])
  ])
  const files: Record<string, string> = {}
  const scripts: Record<string, string> = {}
  const dependencies: Record<string, string> = {}
  const devDependencies: Record<string, string> = {}
  for (const module of modules) {
    merge(files, module.files)
    merge(scripts, module.scripts)
    merge(dependencies, module.dependencies)
    merge(devDependencies, module.devDependencies)
  }
  if (modules.some((module) => module.id === "vitest")) files["src/simulation.test.ts"] = simulationTest
  if (options.addons?.includes("storybook") && options.addons.includes("vitest"))
    files["src/hud.test.ts"] = `import { expect, it } from "vitest"
import { createScoreDisplay } from "./hud"
it("renders an accessible score for the Storybook preview", () => {
 const score = createScoreDisplay(120)
 document.body.append(score)
 try {
  expect(score.tagName).toBe("OUTPUT")
  expect(score.getAttribute("aria-label")).toBe("Score")
  expect(score.textContent).toBe("Score: 120")
 } finally { score.remove() }
})
`
  if (options.addons?.includes("storybook")) files["pnpm-workspace.yaml"] += "allowBuilds:\n  esbuild: true\n"
  const extensions = applyExtensions(options.template, options, files, dependencies)
  if (options.addons?.includes("vitest"))
    Object.assign(files, browserTests(options.template, extensions.ui, extensions.telemetry))
  if (options.addons?.includes("vitest") && (extensions.physics === "rapier2d" || extensions.physics === "rapier3d")) {
    const two = extensions.physics === "rapier2d"
    files["src/physics.test.ts"] =
      `import { expect, it } from "vitest"\nimport { createPhysicsDemo } from "./physics"\nit("simulates gravity and keeps the ball above its collider", async () => {\n  const world = await createPhysicsDemo()\n  try {\n    const initial = world.step(0).y\n    for (let step = 0; step < 30; step++) world.step(1 / 60)\n    expect(world.step(0).y).${two ? "toBeGreaterThan" : "toBeLessThan"}(initial)\n    for (let step = 0; step < 600; step++) world.step(1 / 60)\n    expect(world.step(0).y).toBeCloseTo(${two ? "475" : "0.35"}, 0)\n  } finally { world.dispose() }\n})\n`
  }
  if (options.addons?.includes("playwright")) {
    files[".gitignore"] += "playwright-report/\ntest-results/\n"
    const config = JSON.parse(files["tsconfig.json"]!)
    config.include.push("e2e", "playwright.config.ts")
    config.compilerOptions.types.push("node")
    files["tsconfig.json"] = json(config)
    files["e2e/game.spec.ts"] = `import { expect, test } from "@playwright/test"
test("loads the game and accepts keyboard input", async ({page}) => {
 const errors: string[] = []
 page.on("pageerror", error => errors.push(error.message))
 await page.goto("/")
 const canvas = page.locator("canvas").first()
 await expect(canvas).toBeVisible()
 await canvas.focus()
 await page.keyboard.down("ArrowRight")
 try {
 ${extensions.ui === "none" ? "await expect(canvas).toBeFocused()" : 'await expect(page.locator("#score")).toHaveText(/^Collected: [1-9][0-9]*$/, {timeout:15000})'}
 } finally { await page.keyboard.up("ArrowRight") }
 expect(errors).toEqual([])
})
`
  }
  const moduleIds = [
    ...modules.map((module) => module.id),
    `ui:${extensions.ui}`,
    `physics:${extensions.physics}`,
    `telemetry:${extensions.telemetry}`
  ]
  files["package.json"] = json({
    name: options.name,
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: "pnpm@12.10.1",
    engines: { node: ">=24.0.0" },
    scripts,
    dependencies,
    devDependencies
  })
  files["game.config.json"] = json({
    schemaVersion: 1,
    platform: "web",
    name: options.name,
    template: options.template,
    dimension: template.dimension,
    mode: "single-player",
    modules: moduleIds,
    ...extensions,
    build: { command: "pnpm build", output: "dist" }
  })
  files["spawnkit.config.ts"] =
    'import { defineConfig } from "./spawnkit/config"\n\nexport default defineConfig(' +
    JSON.stringify(
      {
        title: options.name,
        description: `Play ${options.name}, a new browser game made with SpawnKit.`,
        genre: "Arcade",
        dimension: template.dimension.toUpperCase(),
        coverPath: "media/cover.svg"
      },
      null,
      2
    ) +
    ")\n"
  files["spawnkit.config.schema.json"] = json(listingSchema)
  files["public/media/cover.svg"] = defaultCover
  files["index.html"] =
    `<!doctype html>\n<html lang="en">\n<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${options.name}</title></head>\n<body><header><h1>${options.name}</h1><p>Use the arrow keys to collect gold.</p><span id="score" aria-live="polite"></span></header><main id="game" aria-label="Game canvas"></main><script type="module" src="/src/main.ts"></script></body>\n</html>\n`
  files["README.md"] =
    `# ${options.name}\n\n${template.name} single-player game generated with SpawnKit.\n\n## Run locally\n\nRequires Node.js 24+ and pnpm 12.\n\n\`\`\`sh\npnpm install\npnpm dev\n\`\`\`\n\nUse the arrow keys to collect gold. Edit src/main.ts to make the game your own.\n\n## Verify and build\n\n\`\`\`sh\npnpm lint\n${modules.some((module) => module.id === "vitest") ? "pnpm test\n" : ""}${modules.some((module) => module.id === "playwright") ? "pnpm e2e\n" : ""}pnpm build\n\`\`\`\n\nThe production frontend is written to dist/. This project has no hosted backend. Use the SpawnKit CLI to link the project and deploy its frontend.\n\nCommit the pnpm-lock.yaml generated by pnpm install. Dependencies use exact versions; the lockfile also records transitive versions.\n`
  files["README.md"] +=
    "\n## Game listing\n\nEdit spawnkit.config.ts with the included defineConfig() helper to set your title, description, genre, dimension (2D or 3D), coverPath, and optional trailerPath. TypeScript checks required fields and genre/dimension choices; the helper validates text lengths and paths at build time. The Vite plugin emits spawnkit.config.json into dist. For JSON, replace the TypeScript file with spawnkit.config.json at the project root. Both formats describe the same listing; the plugin detects and validates either one automatically. Use only one source. Genre defaults to Arcade; choose the best match before publishing. A 1280×720 editable default illustration is included at public/media/cover.svg. Replace it with your own PNG, JPEG, WebP, or SVG cover (up to 1 MiB) and update coverPath. Optional gameplay video supports MP4/WebM up to 2 MiB and 60 seconds. SpawnKit automatically creates a bounded WebP cover and a silent, compressed MP4 preview of the first eight seconds, at most 640 pixels on either side. Start your clip on active gameplay; the platform does not choose highlights or detect title screens. Oversized or invalid listing media is omitted with a build-log warning; the game can still deploy. Paths are relative to the build root, without public/ or a leading slash. Vite copies these files into dist automatically. The CLI checks available public media before uploading without executing the config. Dynamic or build-generated media is checked on SpawnKit after the build. Platform validation and compression remain authoritative.\n"
  files["README.md"] +=
    "\n## Local domains\n\nRun pnpm exec dev-domains urls for exact app, Storybook, and isolated E2E origins. BuildKit dev-domains starts or reuses Portless for trusted HTTPS and assigns backend ports. Every template includes it as a pinned development dependency. Unlinked projects use <project>.local.spawnkit.games; Git worktrees add their folder name. Run pnpm exec dev-domains doctor to diagnose DNS, proxy, and certificate setup. The CLI saves your verified hostname when you link a project. You can also set SPAWN_GAME_DOMAIN to your assigned project hostname (for example emberfall.spawnkit.games) to use local.emberfall.spawnkit.games after domain provisioning. Set SPAWN_LOCAL_NAME to give an independent clone its own address. Configure endpoint names in dev-domains.config.mjs. First-time certificate trust may need interactive machine setup. Use pnpm exec vite for a plain Vite server. Automated tests use loopback by default; set SPAWN_E2E_HTTPS=1 to test the named HTTPS endpoint after machine setup. Register exact OAuth callbacks and telemetry origins; public webhooks require a separately configured tunnel and server receiver. No shared wildcard cookies or browser-side webhook secrets.\n"
  files["README.md"] +=
    `\n## Selected modules\n\nPhysics: ${extensions.physics}. UI: ${extensions.ui}. Telemetry: ${extensions.telemetry}.\n\nPhysics-enabled starters include a separate falling-ball collision example with renderer synchronization. Arrow-key player movement remains the editable plain/bitECS/Koota simulation, not a physics character controller. Rapier uses a fixed 60 Hz step; Phaser uses its engine physics loop; Havok uses Babylon's physics loop.\n\nUI-enabled games support Escape to pause/resume. Canvas-based controls supplement keyboard input.\n\nPlatform telemetry includes the standalone @spawn/telemetry package. Open project Logs > Game telemetry in the dashboard, configure allowed game origins, and copy the public configuration into .env. Set VITE_SPAWN_TELEMETRY_ENABLED=true, then call setTelemetryConsent(true) from your collection-policy flow; capture is denied until that call. Use flushTelemetry/shutdownTelemetry for lifecycle control. Events and errors are retained for seven days with per-environment limits. Sentry initializes only when VITE_SENTRY_DSN is supplied; it uses breadcrumbs and error capture, with default PII collection disabled. Neither option adds billing or provisions resources.\n`
  if (options.addons?.includes("vitest"))
    files["README.md"] +=
      "\n## Coverage\n\npnpm test prepares the matching Chromium browser automatically, reusing cached downloads. It enforces 90% statements, branches, functions, and lines across all src TypeScript, including renderer startup and optional modules. Tests, stories, and type declarations are excluded. Thresholds apply across the source set, not per file. Unit and renderer integration tests run in headless Chromium with software WebGL; Sentry is mocked. Reports are written to coverage/.\n"
  if (options.addons?.includes("playwright"))
    files["README.md"] +=
      "\n## Browser tests\n\nAfter pnpm install, run pnpm e2e. It prepares the matching Chromium browser automatically before running tests. Use pnpm e2e:ui for interactive debugging, or pnpm e2e --grep keyboard to filter tests. Edit e2e/game.spec.ts to cover your game. The test starts its own loopback server on port 4173, checks browser errors, and exercises keyboard collection when the HUD is enabled. With UI set to none it checks canvas loading and keyboard focus. Chromium uses software rendering for portable headless checks. Set SPAWN_E2E_HTTPS=1 for named HTTPS testing after local domain setup; CI always uses loopback. Vitest and Playwright can be selected independently or together.\n"
  if (modules.some((module) => module.id === "vitest" || module.id === "playwright"))
    files["README.md"] +=
      "\n## Test environment setup\n\nRun pnpm run setup to prepare local HTTPS and Chromium together. Trusting the local certificate may require a one-time OS prompt; this does not register a public domain or create a cloud project. Run pnpm test:setup to prepare only Chromium. No browser download or certificate changes run during pnpm install.\n\nOn a supported Linux CI runner, run pnpm install --frozen-lockfile, then pnpm test:setup --with-deps, then the test scripts selected for this project. System-library installation may require elevated permissions. CI skips automatic browser installation and uses a loopback server for E2E. For an already provisioned offline environment, set SPAWN_SKIP_BROWSER_INSTALL=1. A failed browser download stops before tests run; check network/proxy access and retry pnpm test:setup.\n"
  if (options.addons?.includes("storybook"))
    files["README.md"] +=
      "\n## Storybook\n\nRun pnpm storybook to develop HTML game interface components. Run pnpm exec storybook build to export storybook-static/. This is a separate development tool; it does not add React to the game or automatically render canvas UI modules.\n"
  if (extensions.ui === "none") files["index.html"] = files["index.html"]!.replace(/<header>.*?<\/header>/, "")
  files[".spawn/state.json"] = json({
    schemaVersion: 1,
    generatorVersion: "0.0.0",
    moduleVersions: Object.fromEntries(moduleIds.map((id) => [id, 1])),
    options,
    files: { ...files }
  })
  // User-owned guidance is intentionally outside the generator's update baseline.
  files["AGENTS.md"] =
    `# ${options.name}\n\nStandalone ${template.name} browser game. Use Node.js 24+ and pnpm 12.\n\n- Read package.json and game.config.json for this project's selected modules and commands.\n- Install with pnpm install; keep pnpm-lock.yaml. Run pnpm lint and pnpm build after changes, and pnpm test / pnpm e2e only when those scripts exist. Test scripts prepare Chromium automatically outside CI. If test:setup exists, use pnpm test:setup --with-deps before tests in CI. When the setup script exists, pnpm run setup prepares local HTTPS and Chromium; certificate trust may prompt.\n- Edit src/main.ts and the selected simulation modules. Preserve existing user files, saves and artwork.\n- pnpm dev uses named local HTTPS; pnpm exec dev-domains doctor diagnoses setup. pnpm exec vite provides a plain local server.\n- Keep this project standalone. Never place secrets in VITE_ variables or public assets.\n- Local development requires no account. Publish only when requested, to the confirmed project. See https://spawnkit.cloud/docs/publishing and https://spawnkit.cloud/auth.md.\n- Run the CLI with pnpm dlx @spawnkit/cli. Use --help for commands and --dry-run before mutations. Remote publishing requires explicit project approval; see https://spawnkit.cloud/auth.md.\n`
  return { name: options.name, template: options.template, modules: moduleIds, files }
}

export { planAddition } from "./addition"

export { componentCatalog, resolveComposition, selectedComponents } from "./composition"
export type { Composition, ResolutionIssue, ResolutionChoice } from "./composition"
