import assert from "node:assert/strict"
import { test } from "node:test"
import { catalog } from "@spawn/templates/scaffold"
import { selectCases, templateCases } from "./template-cases.mjs"

const { cases, rejected } = await templateCases()

test("cases cover each kit, the flows and every game in the pairwise set once", () => {
  assert.deepEqual(
    cases.filter((entry) => entry.kind === "kit").map((entry) => entry.argv.slice(0, 3)),
    catalog.presets.map((preset) => ["init", "--preset", preset.id])
  )
  assert.ok(cases.some((entry) => entry.kind === "flow" && entry.after.length > 0))
  assert.equal(new Set(cases.map((entry) => entry.name)).size, cases.length)
  assert.deepEqual(rejected, [])
  for (const template of catalog.templates) {
    const pairwise = cases.filter((entry) => entry.kind === "pairwise" && entry.argv[1] === template.id)
    assert.ok(pairwise.length > 1, template.id)
    // Every case names its own folder, which is also its package name and local hostname.
    for (const entry of pairwise) assert.equal(entry.argv[2], entry.name)
  }
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
