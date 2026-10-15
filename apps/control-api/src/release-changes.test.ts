import { afterEach, expect, it, vi } from "vitest"
import { installationToken } from "./github"
import { releaseChanges } from "./release-changes"

vi.mock("./github", () => ({ installationToken: vi.fn<typeof installationToken>().mockResolvedValue("test-token") }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(installationToken).mockReset().mockResolvedValue("test-token")
})
const older = "a".repeat(40)
const newer = "b".repeat(40)
const commit = {
  sha: newer,
  commit: { message: "Add ranked queues\n\nDetailed message", author: { name: "Alexandra Morgan-Sutherland" } }
}
function fixture() {
  const reads: unknown[][] = []
  const env = {
    DATABASE: {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            reads.push(values)
            return {
              async first() {
                if (sql.includes("github_connections"))
                  return { installation_id: 1, repository_id: 2, repository: "studio/game" }
                return values[0] === "project"
                  ? values[1] === "new"
                    ? { sha: newer }
                    : values[1] === "old"
                      ? { sha: older }
                      : values[1] === "cli"
                        ? { sha: null }
                        : null
                  : null
              }
            }
          }
        }
      }
    }
  } as unknown as Env
  return { env, reads }
}
const request = (from = "old", to = "new") =>
  new Request(`https://control.test/projects/project/release-changes?from=${from}&to=${to}`)

it("resolves both versions within the authorized project before accessing GitHub", async () => {
  const { env, reads } = fixture()
  const fetch = vi.fn<typeof globalThis.fetch>()
  vi.stubGlobal("fetch", fetch)
  await expect(releaseChanges(request("old", "other-project-release"), env, "project")).rejects.toMatchObject({
    status: 404
  })
  expect(reads).toEqual([["project", "other-project-release"]])
  expect(fetch).not.toHaveBeenCalled()
  expect(installationToken).not.toHaveBeenCalled()
})

it("returns real commit messages and linked PRs/issues without exposing credentials", async () => {
  const { env } = fixture()
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url, options) => {
    expect(options?.redirect).toBe("manual")
    if (String(url).endsWith("/graphql"))
      return Response.json({
        data: {
          repository: {
            c0: {
              associatedPullRequests: {
                pageInfo: { hasNextPage: false },
                nodes: [
                  {
                    number: 18427,
                    title: "Ranked queues",
                    body: "Fixes #12345",
                    state: "MERGED",
                    repository: { nameWithOwner: "studio/game" },
                    closingIssuesReferences: {
                      pageInfo: { hasNextPage: false },
                      nodes: [
                        {
                          number: 12345,
                          title: "Queue issue",
                          body: "Details",
                          state: "CLOSED",
                          repository: { nameWithOwner: "studio/game" }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      })
    return Response.json({ status: "ahead", total_commits: 1, commits: [commit] })
  })
  vi.stubGlobal("fetch", fetch)
  const response = await releaseChanges(request(), env, "project")
  const result = await response.json()
  expect(result).toMatchObject({
    direction: "added",
    commits: [
      { sha: newer, message: "Add ranked queues", author: "Alexandra Morgan-Sutherland", pr: 18427, issues: [12345] }
    ],
    pullRequests: [{ number: 18427, state: "merged", url: "https://github.com/studio/game/pull/18427" }],
    issues: [{ number: 12345, state: "closed" }]
  })
  expect(JSON.stringify(result)).not.toContain("test-token")
  expect(installationToken).toHaveBeenLastCalledWith(env, 1, 2, true)
})

it("reverses an ancestor comparison to show commits removed by rollback", async () => {
  const { env } = fixture()
  vi.mocked(installationToken).mockImplementation(async (_env, _installation, _repo, linked) => {
    if (linked) throw new Error("Missing permission")
    return "test-token"
  })
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ status: "behind", commits: [], total_commits: 0 }))
    .mockResolvedValueOnce(Response.json({ status: "ahead", commits: [commit], total_commits: 250 }))
  vi.stubGlobal("fetch", fetch)
  const result = await (await releaseChanges(request("new", "old"), env, "project")).json()
  expect(fetch.mock.calls[1]?.[0]).toContain(`${older}...${newer}`)
  expect(result).toMatchObject({
    direction: "removed",
    truncated: true,
    linksUnavailable: true,
    commits: [{ sha: newer }],
    compareUrl: `https://github.com/studio/game/compare/${older}...${newer}`
  })
})

it("does not invent a linear changelog for diverged branches or a CLI release", async () => {
  const { env } = fixture()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ status: "diverged", commits: [commit] }))
  )
  await expect(releaseChanges(request(), env, "project")).rejects.toMatchObject({ code: "diverged_history" })
  await expect(releaseChanges(request("old", "cli"), env, "project")).rejects.toMatchObject({
    code: "source_unavailable"
  })
})

it("marks partial linked work and refuses oversized GitHub responses", async () => {
  const { env } = fixture()
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ status: "ahead", total_commits: 1, commits: [commit] }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: "Permission denied" }] }))
  )
  expect(await (await releaseChanges(request(), env, "project")).json()).toMatchObject({
    linksUnavailable: true,
    commits: [{ sha: newer }]
  })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1)))
  )
  await expect(releaseChanges(request(), env, "project")).rejects.toMatchObject({ status: 413 })
})
