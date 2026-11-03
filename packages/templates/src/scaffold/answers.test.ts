import { describeCatalog, requestArgv, templateQuestions } from "@buildkitgg/scaffolder"
import { describe, expect, it } from "vitest"
import { addons, physicsOptions, telemetryOptions, templates, uiOptions } from "../catalog"
import { starterKits } from "../kits"
import { gameAnswers, initArgv, kitAnswers, kitArgv, kitPreset, kitProjectName } from "./answers"
import { catalog, gameFiles } from "./index"

// Each template has one mode, its renderer, of the same id.
const choices = (template: string, question: string) =>
  templateQuestions(catalog, template, template)
    .find((entry) => entry.id === question)!
    .choices.map((choice) => choice.id)

// The dashboard shows the choices in `@spawn/templates/catalog`. They have to be the choices the engine offers.
describe("the dashboard's choices are the engine's", () => {
  it.each(templates.map((template) => template.id))("offers the %s questions the engine asks", (template) => {
    const physics = physicsOptions.filter((option) => (option.renderers as readonly string[]).includes(template))
    const answer = (game: Parameters<typeof gameAnswers>[0], question: string) =>
      gameAnswers(game).questions?.[question] ?? []
    expect(physics.flatMap((option) => answer({ template, physics: option.id }, "physics"))).toEqual(
      choices(template, "physics")
    )
    const ui = uiOptions.filter((option) => (option.renderers as readonly string[]).includes(template))
    expect(ui.flatMap((option) => answer({ template, ui: option.id }, "ui"))).toEqual(choices(template, "ui"))
    expect(telemetryOptions.flatMap((option) => answer({ template, telemetry: option.id }, "telemetry"))).toEqual(
      choices(template, "telemetry")
    )
    const entity = (id?: "bitecs" | "koota") => answer({ template, addons: id ? [id] : [] }, "simulation")
    expect([entity(), entity("bitecs"), entity("koota")].flat()).toEqual(choices(template, "simulation"))
    const tools = addons.filter((addon) => addon.id !== "bitecs" && addon.id !== "koota").map((addon) => addon.id)
    expect(answer({ template, addons: tools }, "tools")).toEqual(choices(template, "tools"))
  })
  it.each(
    templates.flatMap((template) =>
      [...physicsOptions, ...uiOptions.map((option) => ({ ...option, ui: true }))]
        .filter((option) => !(option.renderers as readonly string[]).includes(template.id))
        .map((option) => ({ template: template.id, option }))
    )
  )("rejects $option.name on $template", ({ template, option }) => {
    expect(() => gameAnswers("ui" in option ? { template, ui: option.id } : { template, physics: option.id })).toThrow(
      "doesn't work with"
    )
  })
  it("rejects unknown choices and two entity systems", () => {
    expect(() => gameAnswers({ template: "unity" as "pixi" })).toThrow("no template")
    expect(() => gameAnswers({ template: "pixi", addons: ["jest" as "vitest"] })).toThrow("no add-on named jest")
    expect(() => gameAnswers({ template: "pixi", addons: ["bitecs", "koota"] })).toThrow("can't be combined")
  })
})

describe("commands", () => {
  it("answers every question but the tools, so the command leaves nothing else to ask", () => {
    const answers = gameAnswers({
      name: "night-orchard",
      template: "three",
      physics: "rapier3d",
      addons: ["playwright", "bitecs", "vitest"]
    })
    expect(initArgv(answers)).toEqual([
      "create",
      "three",
      "night-orchard",
      "--physics",
      "rapier3d",
      "--ui",
      "html-ui",
      "--simulation",
      "bitecs",
      "--no-telemetry",
      "--tools",
      "vitest,playwright"
    ])
    expect(initArgv(answers)).toEqual(requestArgv({ intent: { command: "init", answers } }))
    expect(gameAnswers({ template: "pixi" }).questions).not.toHaveProperty("tools")
  })
  it("writes the same command without the catalog, because no template selects a tool by default", () => {
    // With a default, a game without that tool would need --without, which only the catalog can say.
    const defaults = templates.flatMap((template) =>
      templateQuestions(catalog, template.id, template.id).flatMap((question) => question.default)
    )
    expect(defaults.filter((id) => choices("pixi", "tools").includes(id))).toEqual([])
    const answers = gameAnswers({ name: "quiet-pond", template: "pixi", addons: ["storybook"] })
    expect(initArgv(answers)).toEqual(requestArgv({ intent: { command: "init", answers } }, { catalog }))
  })
  it("creates each kit from its preset", () => {
    const presets = describeCatalog(catalog).presets
    expect(presets.map((preset) => preset.id)).toEqual(starterKits.map((kit) => kit.id))
    for (const kit of starterKits) {
      expect(catalog.presets!.find((preset) => preset.id === kit.id)).toEqual(kitPreset(kit))
      expect(kitPreset(kit).answers).toEqual(kitAnswers(kit))
      expect(kitArgv(kit)).toEqual(["create", "--preset", kit.id, kitProjectName(kit)])
    }
  })
  it("plans every kit with tests, and the physics its page names", async () => {
    for (const kit of starterKits) {
      const files = await gameFiles({ ...kitAnswers(kit), name: kitProjectName(kit) })
      const pkg = JSON.parse(files["package.json"]!)
      expect(pkg.name).toBe(`${kit.id}-game`)
      for (const script of ["dev", "build", "lint", "test"]) expect(pkg.scripts).toHaveProperty(script)
      expect(files["src/physics.ts"] === undefined).toBe(kit.physics === "none")
      expect(files["src/ui.ts"]).toContain("Pause")
    }
  })
})
