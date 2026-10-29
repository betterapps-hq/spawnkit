import { expect, it } from "vitest"
import { projectHostname, projectSlug } from "./hosting"

it("separates platform and customer environments without database IDs in the URL", () => {
  const hosts = [false, true].flatMap((test) =>
    ["production", "sandbox", "preview-42", "preview-9999999999"].flatMap((environment) =>
      ["project-a", "project-b"].map((slug) => projectHostname(slug, environment, test))
    )
  )
  expect(new Set(hosts).size).toBe(hosts.length)
  for (const host of hosts) {
    expect(host).toMatch(/^[a-z0-9.-]+\.spawnkit\.games$/)
    expect(host.split(".")[0]!.length).toBeLessThanOrEqual(63)
  }
  expect(projectHostname("emberfall", "production", false)).toBe("emberfall.spawnkit.games")
  expect(projectHostname("emberfall", "sandbox", true)).toBe("staging.emberfall.staging.spawnkit.games")
  expect(projectHostname("emberfall", "preview-42", true)).toBe("pr-42.emberfall.staging.spawnkit.games")
  expect(() => projectHostname("p", "../../production", false)).toThrow("Unsupported hosting environment")
})

it("normalizes names and reserves platform addresses", () => {
  expect(projectSlug("Émberfall / Our Game")).toBe("emberfall-our-game")
  for (const name of [
    "api",
    "local",
    "stories",
    "staging",
    "preview-latest",
    "stories-preview-pr-42",
    "pr-42",
    "d-a1b2c3d4"
  ]) {
    expect(projectSlug(name)).not.toBe(name)
  }
  expect(projectSlug("!!!")).toBe("project")
})
