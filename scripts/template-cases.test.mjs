import assert from "node:assert/strict"
import { test } from "node:test"
import { checkCatalog, memoryTree, mergePacks, plan } from "@buildkitgg/scaffolder"
import { catalog, settings } from "@spawn/templates/scaffold"
import fixturePack from "./fixtures/template-pack/index.js"
import { selectCases, templateCases } from "./template-cases.mjs"

const { cases, rejected } = await templateCases({ matrix: "pairwise" })

test("cases cover each kit, the flows, the template package and every game in the pairwise set once", () => {
  assert.deepEqual(
    cases.filter((entry) => entry.kind === "kit").map((entry) => entry.argv),
    catalog.presets.map((preset) => ["init", "--preset", preset.id, `kit-${preset.id}`])
  )
  assert.ok(cases.some((entry) => entry.kind === "flow" && entry.after.length > 0))
  assert.deepEqual(
    cases.filter((entry) => entry.kind === "pack").map((entry) => entry.argv.slice(0, 2)),
    [["init", "@spawn-fixture/tower"]]
  )
  assert.equal(new Set(cases.map((entry) => entry.name)).size, cases.length)
  assert.deepEqual(rejected, [])
  for (const template of catalog.templates) {
    const pairwise = cases.filter((entry) => entry.kind === "pairwise" && entry.argv[1] === template.id)
    assert.ok(pairwise.length > 1, template.id)
    // Every case names its own folder, which is also its package name and local hostname.
    for (const entry of pairwise) assert.equal(entry.argv[2], entry.name)
  }
})

test("the fixture template package extends the catalog and plans its game", async () => {
  const merged = mergePacks(catalog, [{ name: "@spawn-fixture/tower", version: "1.0.0", pack: fixturePack }])
  assert.deepEqual(checkCatalog(merged), [])
  const planned = await plan({
    catalog: merged,
    settings,
    request: {
      intent: {
        command: "init",
        answers: { template: "@spawn-fixture/tower#tower", name: "pack-tower", optional: ["@spawnkit/vitest"] }
      }
    },
    tree: memoryTree({})
  })
  assert.equal(planned.status, "planned", planned.error?.message)
  assert.ok("@spawn-fixture/tower/waves" in planned.lock.addons)
})

test("shards split the selected cases without overlap", () => {
  const shards = [1, 2, 3, 4].map((index) => selectCases(cases, { shard: `${index}/4` }))
  assert.deepEqual(
    shards.flat().toSorted((left, right) => cases.indexOf(left) - cases.indexOf(right)),
    cases
  )
  assert.ok(Math.max(...shards.map((shard) => shard.length)) - Math.min(...shards.map((shard) => shard.length)) <= 1)
  for (const shard of ["0/4", "5/4", "2", "a/b"]) assert.throws(() => selectCases(cases, { shard }), /--shard/)
})

test("filters match a case's name or its command", () => {
  assert.deepEqual(
    selectCases(cases, { filters: ["kit-"] }).map((entry) => entry.kind),
    catalog.presets.map(() => "kit")
  )
  const koota = selectCases(cases, { filters: ["--simulation koota"] })
  assert.ok(koota.length > 0)
  assert.ok(koota.every((entry) => entry.argv.join(" ").includes("--simulation koota")))
  assert.deepEqual(selectCases(cases, { filters: ["pixi-add"] }).length, 1)
})

test("pull requests run a few of each template's pairwise games", async () => {
  const { cases: sampled } = await templateCases()
  const pairwise = new Set(cases.filter((entry) => entry.kind === "pairwise").map((entry) => entry.name))
  for (const template of catalog.templates) {
    const picked = sampled.filter((entry) => entry.kind === "pairwise" && entry.argv[1] === template.id)
    assert.ok(picked.length > 1 && picked.length <= 4, template.id)
    for (const entry of picked) assert.ok(pairwise.has(entry.name), entry.name)
  }
  assert.ok(sampled.filter((entry) => entry.kind === "kit" || entry.kind === "flow").length >= 4)
  await assert.rejects(templateCases({ matrix: "most" }), /--matrix/)
})
