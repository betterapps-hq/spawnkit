import { createHash } from "node:crypto"
import { describeCatalog, memoryTree, pairwiseAnswers, plan, requestArgv } from "@buildkitgg/scaffolder"
import { catalog, settings } from "@spawn/templates/scaffold"

const init = (answers) => requestArgv({ intent: { command: "init", answers } }, { catalog })
const add = (addons, replace = []) => requestArgv({ intent: { command: "add", addons, replace, options: {} } })

// Each kit as `spawn init --preset` makes it, in the command the engine writes for its preset. Kits include Vitest, so
// their tests and coverage gate run too.
const kits = (catalog.presets ?? []).map((preset) => ({
  name: `kit-${preset.id}`,
  kind: "kit",
  argv: requestArgv(
    { intent: { command: "init", answers: { ...preset.answers, name: `kit-${preset.id}` } } },
    { preset, catalog }
  ),
  after: []
}))

// Changes to a game after init, which the generated matrix doesn't reach. `after` runs in the game before its checks.
const flows = [
  {
    name: "pixi-add",
    kind: "flow",
    argv: init({ template: "pixi", name: "pixi-add" }),
    // Adding them again changes nothing.
    after: [add(["@spawnkit/vitest", "@spawnkit/playwright"]), add(["@spawnkit/vitest", "@spawnkit/playwright"])]
  },
  {
    name: "phaser-replace",
    kind: "flow",
    argv: init({
      template: "phaser",
      name: "phaser-replace",
      questions: { physics: ["@spawnkit/arcade"], tools: ["@spawnkit/vitest"] }
    }),
    after: [add(["@spawnkit/matter"], ["@spawnkit/arcade"])]
  }
]

// A template from a template package, which `spawn init <package>` installs from npm. The smoke script serves the one in
// scripts/fixtures/template-pack from a local registry.
const packs = [
  {
    name: "pack-tower",
    kind: "pack",
    argv: ["create", "@spawn-fixture/tower", "pack-tower", "--with", "vitest"],
    after: []
  }
]

/**
 * Every answer to every question a template asks in one mode: no (unless it's required) or each choice, and for a
 * `many` question every set of its choices.
 */
function everyAnswer(template, mode, questions) {
  let sets = [{ template, mode, questions: {} }]
  for (const question of questions) {
    const ids = question.choices.map((choice) => choice.id)
    const values =
      question.pick === "many"
        ? ids.reduce((subsets, id) => subsets.flatMap((subset) => [subset, [...subset, id]]), [[]])
        : [[], ...ids.map((id) => [id])]
    sets = sets.flatMap((answers) =>
      values
        .filter((value) => !question.required || value.length > 0)
        .map((value) => ({ ...answers, questions: { ...answers.questions, [question.id]: value } }))
    )
  }
  return sets
}

/**
 * One case per game the answers make: the engine's pairwise set, or with `all` every combination. Answers that make the
 * same game run once, named by the template and a hash of its add-ons. Answers the catalog turns down are returned as
 * `rejected`; answers that fail to plan throw, because that's a catalog bug.
 */
async function generated(all) {
  const cases = []
  const selections = new Map()
  const asked = new Set()
  const rejected = []
  for (const template of describeCatalog(catalog).templates) {
    const modes = Object.entries(template.questionsByMode)
    for (const [mode, questions] of modes) {
      const sets = all ? everyAnswer(template.id, mode, questions) : pairwiseAnswers(catalog, template.id, mode)
      for (const set of sets) {
        // Each case names its own folder, and the CLI picks a template's only mode itself.
        const answers = { ...set }
        delete answers.name
        if (modes.length === 1) delete answers.mode
        // The pairwise set repeats some answers.
        if (asked.has(JSON.stringify(answers))) continue
        asked.add(JSON.stringify(answers))
        const planned = await plan({
          catalog,
          settings,
          request: { intent: { command: "init", answers: { ...answers, name: "template-check" } } },
          tree: memoryTree({})
        })
        if (planned.status === "needs-decision") {
          rejected.push({ argv: init(answers), reason: planned.decisions[0]?.message ?? planned.status })
          continue
        }
        if (planned.status !== "planned" || !planned.lock) {
          throw new Error(`${init(answers).join(" ")} fails to plan: ${planned.error?.message ?? planned.status}`)
        }
        const addons = Object.entries(planned.lock.addons)
          .map(([id, entry]) => [id, entry.options])
          .sort(([left], [right]) => (left < right ? -1 : 1))
        const selection = JSON.stringify([template.id, mode, addons])
        const name = `${template.id}-${createHash("sha256").update(selection).digest("hex").slice(0, 8)}`
        if (selections.has(name)) {
          if (selections.get(name) !== selection) throw new Error(`Two games share the case name ${name}`)
          continue
        }
        selections.set(name, selection)
        cases.push({ name, kind: all ? "combination" : "pairwise", argv: init({ ...answers, name }), after: [] })
      }
    }
  }
  return { cases, rejected }
}

/** How many pairwise games per template a pull request runs. */
const samplePerTemplate = 4

/** Up to `count` of a template's cases, spread evenly through its pairwise set so they cover different answers. */
function sample(cases, count) {
  const byTemplate = Map.groupBy(cases, (entry) => entry.name.slice(0, entry.name.lastIndexOf("-")))
  return [...byTemplate.values()].flatMap((group) => {
    const step = Math.max(1, group.length / count)
    return Array.from({ length: Math.min(count, group.length) }, (_, index) => group[Math.floor(index * step)])
  })
}

/**
 * The smoke cases, in a stable order: each kit, the flows, the template package, then the generated games. `matrix`
 * picks those games: `sample`, a few of each template's pairwise games, for pull requests; `pairwise`, the whole
 * pairwise set, weekly; or `all`, every combination, run by hand. `argv` is the CLI command without `--yes --json`; the
 * game's folder is the case name.
 */
export async function templateCases({ matrix = "sample" } = {}) {
  if (!["sample", "pairwise", "all"].includes(matrix)) {
    throw new Error(`--matrix takes sample, pairwise or all, not ${matrix}`)
  }
  const { cases, rejected } = await generated(matrix === "all")
  return {
    cases: [...kits, ...flows, ...packs, ...(matrix === "sample" ? sample(cases, samplePerTemplate) : cases)],
    rejected
  }
}

/**
 * The cases whose name or command contains any filter, then shard `index/count` of those: every count-th case, so each
 * shard gets a share of every template.
 */
export function selectCases(cases, { filters = [], shard } = {}) {
  const matching = filters.length
    ? cases.filter((entry) =>
        filters.some((filter) => entry.name.includes(filter) || entry.argv.join(" ").includes(filter))
      )
    : cases
  if (shard === undefined) return matching
  const [, index, count] = /^([1-9]\d*)\/([1-9]\d*)$/.exec(shard)?.map(Number) ?? []
  if (!index || !count || index > count) throw new Error(`--shard takes <index>/<count>, such as 2/4, not ${shard}`)
  return matching.filter((_, position) => position % count === index - 1)
}
