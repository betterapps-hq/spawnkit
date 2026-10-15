import { describe, expect, it } from "vitest"
import { analyticsFixture, manyReleasesFixture } from "./fixtures"
import { releaseAdoption, releaseCatalog, searchReleases } from "./release-catalog"

describe("Release catalog", () => {
  it("orders by creation instead of version text or recent traffic", () => {
    const sessions = [{ ...analyticsFixture.sessions[0]!, release: "1.9.0", time: 999 }]
    const catalog = releaseCatalog({
      sessions,
      releases: [
        { version: "1.9.0", createdAt: 1 },
        { version: "1.10.0", createdAt: 2 },
        { version: "1.8.0", createdAt: 3 }
      ]
    })
    expect(catalog.map((release) => release.version)).toEqual(["1.8.0", "1.10.0", "1.9.0"])
    expect(catalog[2]?.createdAt).toBe(1)
    expect(releaseCatalog({ sessions, releases: [] })[0]).toEqual({ version: "1.9.0", firstObservedAt: 999 })
  })
  it("keeps catalog-only releases and deduplicates observed versions without mutating the source", () => {
    const catalog = releaseCatalog(manyReleasesFixture)
    expect(catalog).toHaveLength(500)
    expect(new Set(catalog.map((release) => release.version)).size).toBe(500)
    expect(catalog[0]?.version).toBe("1.8.3")
    expect(catalog.at(-1)?.version).toBe("1.3.3")
    expect(catalog.at(-1)?.firstObservedAt).toBeUndefined()
    expect(manyReleasesFixture.releases![0]).not.toHaveProperty("firstObservedAt")
  })
  it("searches the entire history and ranks exact versions before prefixes", () => {
    const catalog = releaseCatalog(manyReleasesFixture)
    expect(searchReleases(catalog, " 1.7.9 ")[0]?.version).toBe("1.7.9")
    expect(searchReleases(catalog, "1.3.3").some((release) => release.version === "1.3.3")).toBe(true)
    expect(searchReleases(catalog, "A41E9C8").map((release) => release.version)).toEqual(["1.8.3"])
    expect(searchReleases(catalog, "CHECKPOINT")[0]?.version).toContain("1.6.0-rc.2+")
    expect(searchReleases(catalog, "does not exist")).toEqual([])
  })
  it("bounds adoption rows and preserves every session in the denominator", () => {
    const rows = releaseAdoption(manyReleasesFixture.sessions)
    expect(rows).toHaveLength(6)
    expect(rows.at(-1)?.label).toBe("Other releases (58)")
    expect(rows.reduce((total, row) => total + row.value, 0)).toBe(manyReleasesFixture.sessions.length)
    expect(releaseAdoption([])).toEqual([])
    expect(releaseAdoption(analyticsFixture.sessions)).toHaveLength(3)
  })
})
