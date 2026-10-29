import { describe, expect, it } from "vitest"
import { defaultProjectDraft } from "@/components/project/creation-model"
import { projectRecordModel, readProjectDraft, readProjectRecords, saveProjectRecord } from "./project-records"

const draft = () => ({ ...structuredClone(defaultProjectDraft), name: "Emberfall" })
describe("project records", () => {
  it("requires a complete configuration without inventing deployed resources", () => {
    const records = readProjectRecords(
      JSON.stringify([{ id: "game-id", name: "Test", configuration: { ...draft(), name: "Test" } }])
    )
    expect(() => readProjectRecords('[{"id":"game-id","name":"Test"}]')).toThrow("Check your project configuration")
    const model = projectRecordModel(records[0]!)
    expect(model.id).toBe("game-id")
    expect(model.configuration?.name).toBe("Test")
    expect(model.production).toMatchObject({ url: "", status: "empty", release: null })
    expect(model.releases).toEqual([])
    expect(model.domains).toEqual([])
    expect(model.repository).toBeNull()
    expect(model.connected).toBe(false)
  })
  it("round-trips configurations and replaces an existing ID without duplicating it", () => {
    const records = saveProjectRecord([], "game-1", readProjectDraft(draft()))
    const next = saveProjectRecord(
      records,
      "game-1",
      readProjectDraft({
        ...draft(),
        name: "Moon Garden",
        template: "three",
        physics: "rapier3d",
        addons: ["vitest", "bitecs"]
      })
    )
    expect(readProjectRecords(JSON.stringify(next))).toEqual(next)
    expect(next).toHaveLength(1)
    expect(next[0]?.configuration?.physics).toBe("rapier3d")
    expect(() => saveProjectRecord(next, "other", { ...draft(), name: "moon garden" })).toThrow("already exists")
  })
  it("keeps compute and service choices as configuration rather than live infrastructure", () => {
    const configuration = readProjectDraft({
      ...draft(),
      mode: "multiplayer",
      sandbox: true,
      github: { mode: "create", name: "emberfall", visibility: "private", url: "" },
      previews: true
    })
    const model = projectRecordModel({ id: "game-1", name: configuration.name, configuration })
    expect(model.production.regions[0]?.status).toBe("unprovisioned")
    expect(model.sandbox?.status).toBe("empty")
    expect(model.repository).toBeNull()
    expect(model.previewsEnabled).toBe(false)
    expect(model.monthlyEstimate).toBeGreaterThan(10)
  })
  it("rejects unreadable storage without returning an empty list that could overwrite it", () => {
    for (const raw of ["broken", "{}", '[{"id":"a"}]', '[{"id":"a","name":"A"},{"id":"a","name":"B"}]'])
      expect(() => readProjectRecords(raw)).toThrow(/./)
    expect(readProjectRecords(null)).toEqual([])
  })
  it("retains domain intent before deployment without inventing DNS or certificates", () => {
    const record = {
      id: "game-1",
      name: "Emberfall",
      configuration: { ...draft(), sandbox: true },
      domainConfigurations: [
        { hostname: "Play.Example.com.", environment: "production" },
        { hostname: "sandbox.example.com", environment: "sandbox" }
      ]
    }
    const [saved] = readProjectRecords(JSON.stringify([record]))
    const model = projectRecordModel(saved!)
    expect(model.production.release).toBeNull()
    expect(model.sandbox?.release).toBeNull()
    expect(model.domains[0]).toMatchObject({
      hostname: "play.example.com",
      status: "unverified",
      records: [],
      checked: null,
      certificate: "pending",
      primary: false
    })
    expect(() => saveProjectRecord([saved!], "game-1", draft())).toThrow("Remove the Sandbox domains")
    expect(() => readProjectRecords(JSON.stringify([{ ...record, configuration: draft() }]))).toThrow("enabled Sandbox")
    expect(saveProjectRecord([saved!], "game-1", { ...draft(), sandbox: true })[0]?.domainConfigurations).toEqual(
      saved?.domainConfigurations
    )
  })
  it("validates combinations, source, resources, and service selections before saving", () => {
    for (const change of [
      { template: "invalid" },
      { addons: ["koota", "bitecs"] },
      { physics: "havok" },
      { services: ["invalid"] },
      { mode: "multiplayer", productionLocations: [] },
      { sandbox: "true" },
      { github: { mode: "connect", name: "", visibility: "private", url: "not-github" } },
      { productionLocations: [{ id: "bad", region: "us-new-jersey", planId: "standard-1c-2gb", hours: -1 }] }
    ])
      expect(() => readProjectDraft({ ...draft(), ...change })).toThrow(/./)
    expect(
      readProjectDraft({ ...draft(), productionLocations: [], sandboxLocations: [], previews: true }).previews
    ).toBe(false)
  })
})
