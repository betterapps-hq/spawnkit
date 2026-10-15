import { isAddonId, isTemplateId, templates, validateProjectName } from "./catalog"
import type { AddonId, TemplateId } from "./catalog"
import { applyExtensions, type ExtensionOptions } from "./extensions"
import { babylonSource, phaserSource, pixiSource, threeSource } from "./game-sources"
import { localDevelopmentFiles } from "./local-development"
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
    dev: "node scripts/local.mjs app",
    "dev:setup": "node scripts/local.mjs setup",
    "dev:urls": "node scripts/local.mjs urls",
    "dev:plain": "vite",
    build: "tsc --noEmit && vite build",
    preview: "vite preview",
    "check:types": "tsc --noEmit",
    lint: "oxlint --no-ignore src vite.config.ts",
    format: "oxfmt",
    "check:format": "oxfmt --check"
  },
  devDependencies: { typescript: "7.0.2", vite: "8.3.4", oxlint: "1.88.0", oxfmt: "0.73.0", portless: "0.15.8" },
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
      include: ["src"]
    }),
    ".oxlintrc.json": json({ categories: { correctness: "error" }, ignorePatterns: ["dist/**"] }),
    ".oxfmtrc.json": json({ semi: false, ignorePatterns: ["dist/**", "pnpm-lock.yaml"] }),
    "src/score.ts": "export function advanceScore(score: number): number {\n  return score + 1\n}\n",
    "src/input.ts": inputSource,
    "vite.config.ts":
      'import { defineConfig } from "vite"\n\nexport default defineConfig({ build: { target: "es2022" } })\n',
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
      "@playwright/test": "1.64.0"
    },
    scripts: {
      "test:e2e": "playwright test",
      "test:e2e:ui": "playwright test --ui"
    },
    files: {
      "playwright.config.ts":
        'import { defineConfig, devices } from "@playwright/test"\nimport { getCACertificates, setDefaultCACertificates } from "node:tls"\nimport { localOrigin } from "./scripts/local-environment.mjs"\nsetDefaultCACertificates([...getCACertificates("default"), ...getCACertificates("system")])\nconst origin = localOrigin("e2e")\nexport default defineConfig({\n testDir: "./e2e", fullyParallel: true, forbidOnly: true,\n use: { baseURL: origin, trace: "retain-on-failure" },\n projects: [{name:"chromium",use:{...devices["Desktop Chrome"],launchOptions:{args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]}}}],\n webServer: {command:"node scripts/local.mjs e2e",url:origin,reuseExistingServer:false}\n})\n'
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
      storybook: "node scripts/local.mjs stories",
      "build:storybook": "storybook build"
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
      test: "vitest run --coverage",
      "test:coverage": "vitest run --coverage",
      "test:watch": "vitest",
      "test:setup": "playwright install chromium",
      verify: "pnpm check:types && pnpm lint && pnpm test:coverage && pnpm build"
    },
    files: {
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
  files["index.html"] =
    `<!doctype html>\n<html lang="en">\n<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${options.name}</title></head>\n<body><header><h1>${options.name}</h1><p>Use the arrow keys to collect gold.</p><span id="score" aria-live="polite"></span></header><main id="game" aria-label="Game canvas"></main><script type="module" src="/src/main.ts"></script></body>\n</html>\n`
  files["README.md"] =
    `# ${options.name}\n\n${template.name} single-player game generated with SpawnKit.\n\n## Run locally\n\nRequires Node.js 24+ and pnpm 12.\n\n\`\`\`sh\npnpm install\npnpm dev:setup\npnpm dev\n\`\`\`\n\nUse the arrow keys to collect gold. Edit src/main.ts to make the game your own.\n\n## Verify and build\n\n\`\`\`sh\npnpm check:types\npnpm lint\n${modules.some((module) => module.id === "vitest") ? "pnpm test:setup\npnpm test\n" : ""}pnpm build\n\`\`\`\n\nThe production frontend is written to dist/. This project has no hosted backend. SpawnKit publishing is not implemented yet.\n\nCommit the pnpm-lock.yaml generated by pnpm install. Dependencies use exact versions; the lockfile also records transitive versions.\n`
  files["README.md"] +=
    "\n## Local domains\n\nRun pnpm dev:urls for exact app, Storybook, and isolated E2E origins. Portless uses trusted HTTPS and assigns backend ports. Unlinked projects use a stable directory-derived name. Set SPAWN_GAME_DOMAIN to your assigned project hostname (for example emberfall.spawnkit.cloud) to use local.emberfall.spawnkit.cloud after domain provisioning. Set SPAWN_LOCAL_NAME for an additional checkout. Use pnpm dev:plain for a plain Vite server and SPAWN_E2E_LOOPBACK=1 for CI or isolated loopback tests. Register exact OAuth callbacks and telemetry origins; public webhooks require a separately configured tunnel and server receiver. No shared wildcard cookies or browser-side webhook secrets.\n"
  files["README.md"] +=
    `\n## Selected modules\n\nPhysics: ${extensions.physics}. UI: ${extensions.ui}. Telemetry: ${extensions.telemetry}.\n\nPhysics-enabled starters include a separate falling-ball collision example with renderer synchronization. Arrow-key player movement remains the editable plain/bitECS/Koota simulation, not a physics character controller. Rapier uses a fixed 60 Hz step; Phaser uses its engine physics loop; Havok uses Babylon's physics loop.\n\nUI-enabled games support Escape to pause/resume. Canvas-based controls supplement keyboard input.\n\nPlatform telemetry includes the standalone @spawn/telemetry package. Open project Logs > Game telemetry in the dashboard, configure allowed game origins, and copy the public configuration into .env. Set VITE_SPAWN_TELEMETRY_ENABLED=true, then call setTelemetryConsent(true) from your collection-policy flow; capture is denied until that call. Use flushTelemetry/shutdownTelemetry for lifecycle control. Events and errors are retained for seven days with per-environment limits. Sentry initializes only when VITE_SENTRY_DSN is supplied; it uses breadcrumbs and error capture, with default PII collection disabled. Neither option adds billing or provisions resources.\n`
  if (options.addons?.includes("vitest"))
    files["README.md"] +=
      "\n## Coverage\n\nRun pnpm test:setup once to install Chromium. pnpm test and pnpm verify enforce 90% statements, branches, functions, and lines across all src TypeScript, including renderer startup and optional modules. Tests, stories, and type declarations are excluded. Thresholds apply across the source set, not per file. Unit and renderer integration tests run in headless Chromium with software WebGL; Sentry is mocked. Reports are written to coverage/.\n"
  if (options.addons?.includes("playwright"))
    files["README.md"] +=
      "\n## Browser tests\n\nAfter pnpm install, run pnpm exec playwright install chromium once, then pnpm test:e2e. Use pnpm test:e2e:ui for interactive debugging. The test starts a local Vite server on port 4173, checks browser errors, and exercises keyboard collection when the HUD is enabled. With UI set to none it checks canvas loading and keyboard focus. Chromium uses software rendering for portable headless checks. Vitest and Playwright can be selected independently or together.\n"
  if (options.addons?.includes("storybook"))
    files["README.md"] +=
      "\n## Storybook\n\nRun pnpm storybook to develop HTML game interface components. Run pnpm build:storybook to export storybook-static/. This is a separate development tool; it does not add React to the game or automatically render canvas UI modules.\n"
  if (extensions.ui === "none") files["index.html"] = files["index.html"]!.replace(/<header>.*?<\/header>/, "")
  files[".spawn/state.json"] = json({
    schemaVersion: 1,
    generatorVersion: "0.0.0",
    moduleVersions: Object.fromEntries(moduleIds.map((id) => [id, 1])),
    options,
    files: { ...files }
  })
  return { name: options.name, template: options.template, modules: moduleIds, files }
}

export { planAddition } from "./addition"

export { componentCatalog, resolveComposition, selectedComponents } from "./composition"
export type { Composition, ResolutionIssue, ResolutionChoice } from "./composition"
