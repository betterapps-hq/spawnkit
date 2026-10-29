import { describeCatalog, requestArgv, templateQuestions } from "@buildkitgg/scaffolder"
import { describe, expect, it } from "vitest"
import { addons, physicsOptions, telemetryOptions, templates, uiOptions } from "../catalog"
import { starterKits } from "../kits"
import { gameAnswers, initArgv, kitAnswers, kitArgv, kitProjectName } from "./answers"
import { catalog, gameFiles } from "./index"

const questions = (template: string) =>
  templateQuestions(
    catalog,
    catalog.templates.find((t) => t.id === template)!,
    template
  )
const choices = (template: string, slot: string) =>
  questions(template)
    .slots.find((question) => question.slot === slot)!
    .choices.map((choice) => choice.id)

// The dashboard shows the choices in `@spawn/templates/catalog`. They have to be the choices the engine offers.
describe("the dashboard's choices are the engine's", () => {
  it.each(templates.map((template) => template.id))("offers the %s questions the engine asks", (template) => {
    const physics = physicsOptions.filter((option) => (option.renderers as readonly string[]).includes(template))
    expect(physics.flatMap((option) => gameAnswers({ template, physics: option.id }).slots!.physics ?? [])).toEqual(
      choices(template, "physics")
    )
    const ui = uiOptions.filter((option) => (option.renderers as readonly string[]).includes(template))
    expect(ui.flatMap((option) => gameAnswers({ template, ui: option.id }).slots!.ui ?? [])).toEqual(
      choices(template, "ui")
    )
    expect(
      telemetryOptions.flatMap((option) => gameAnswers({ template, telemetry: option.id }).slots!.telemetry ?? [])
    ).toEqual(choices(template, "telemetry"))
    const entity = (id?: "bitecs" | "koota") => gameAnswers({ template, addons: id ? [id] : [] }).slots!.simulation
    expect([entity(), entity("bitecs"), entity("koota")]).toEqual(choices(template, "simulation"))
    const tools = addons.filter((addon) => addon.id !== "bitecs" && addon.id !== "koota").map((addon) => addon.id)
    expect(gameAnswers({ template, addons: tools }).optional?.toSorted()).toEqual(
      questions(template)
        .optional.map((choice) => choice.id)
        .toSorted()
    )
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
  it("answers every slot, so the command leaves nothing to ask but the tools", () => {
    const answers = gameAnswers({
      name: "night-orchard",
      template: "three",
      physics: "rapier3d",
      addons: ["playwright", "bitecs", "vitest"]
    })
    expect(initArgv(answers)).toEqual([
      "init",
      "three",
      "night-orchard",
      "--physics",
      "rapier3d",
      "--ui",
      "html-ui",
      "--simulation",
      "bitecs",
      "--no-telemetry",
      "--with",
      "vitest",
      "--with",
      "playwright"
    ])
    expect(initArgv(answers)).toEqual(requestArgv({ intent: { command: "init", answers } }))
    expect(gameAnswers({ template: "pixi" })).not.toHaveProperty("optional")
  })
  it("creates each kit from its preset", () => {
    const presets = describeCatalog(catalog).presets
    expect(presets.map((preset) => preset.id)).toEqual(starterKits.map((kit) => kit.id))
    for (const kit of starterKits) {
      expect(catalog.presets!.find((preset) => preset.id === kit.id)!.answers).toEqual(kitAnswers(kit))
      expect(kitArgv(kit)).toEqual(["init", "--preset", kit.id, kitProjectName(kit)])
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
