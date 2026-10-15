import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import { connectGitHub, githubCallback } from "./github"

const databases: DatabaseSync[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  for (const db of databases.splice(0)) db.close()
})

async function fixture() {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  for (const name of ["0001_control", "0005_github"])
    db.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), "utf8"))
  db.exec(
    "INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('project','owner','Game','{}','now','now')"
  )
  const env = {
    GITHUB_APP_ID: "42",
    GITHUB_APP_PRIVATE_KEY: "configured",
    GITHUB_CLIENT_ID: "client",
    GITHUB_CLIENT_SECRET: "secret",
    GITHUB_WEBHOOK_SECRET: "hook",
    DASHBOARD_URL: "https://spawnkit.cloud",
    DATABASE: {
      prepare(sql: string) {
        return {
          bind(...values: (string | number | null)[]) {
            return {
              async first() {
                return db.prepare(sql).get(...values) ?? null
              },
              async run() {
                return db.prepare(sql).run(...values)
              }
            }
          }
        }
      }
    }
  } as unknown as Env
  const response = await connectGitHub(env, "owner", "project", { github: { url: "https://github.com/studio/game" } })
  const { url } = (await response.json()) as { url: string }
  const state = new URL(url).searchParams.get("state")
  const request = new Request(`https://spawnkit.cloud/api/platform/v1/github/callback?state=${state}&code=test-code`)
  return { db, env, request }
}

function githubFetch(responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (_url, options) => {
    // workerd rejects "error"; automatic redirects could forward credentials.
    expect(options?.redirect).toBe("manual")
    const response = responses.shift()
    if (!response) throw new Error("Unexpected GitHub request")
    return response
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

describe("GitHub repository authorization", () => {
  it("connects the user-accessible repository and returns to its dashboard settings", async () => {
    const { db, env, request } = await fixture()
    const fetch = githubFetch([
      Response.json({ access_token: "user-token" }),
      Response.json({ installations: [{ app_id: 42, id: 7 }] }),
      Response.json({ repositories: [{ id: 9, full_name: "studio/game" }] })
    ])
    const response = await githubCallback(request, env, "owner")
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://spawnkit.cloud/dashboard?page=settings&project=project")
    expect(
      db.prepare("SELECT project_id,installation_id,repository_id,connected_by FROM github_connections").get()
    ).toEqual({ project_id: "project", installation_id: 7, repository_id: 9, connected_by: "owner" })
    await expect(githubCallback(request, env, "owner")).rejects.toMatchObject({ code: "invalid_state" })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("does not consume another user's authorization state", async () => {
    const { db, env, request } = await fixture()
    const fetch = githubFetch([])
    await expect(githubCallback(request, env, "stranger")).rejects.toMatchObject({ code: "invalid_state" })
    expect(db.prepare("SELECT count(*) AS count FROM github_states").get()).toEqual({ count: 1 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(["exchange", "installations"])(
    "rejects a redirect during %s without following it or saving a connection",
    async (step) => {
      const { db, env, request } = await fixture()
      const responses = [new Response("Redirect", { status: 302, headers: { location: "https://unexpected.test" } })]
      if (step === "installations") responses.unshift(Response.json({ access_token: "user-token" }))
      const fetch = githubFetch(responses)
      await expect(githubCallback(request, env, "owner")).rejects.toThrow(/GitHub/)
      expect(fetch).toHaveBeenCalledTimes(step === "exchange" ? 1 : 2)
      expect(db.prepare("SELECT count(*) AS count FROM github_connections").get()).toEqual({ count: 0 })
    }
  )

  it("rejects a repository absent from the user's installation access", async () => {
    const { db, env, request } = await fixture()
    githubFetch([
      Response.json({ access_token: "user-token" }),
      Response.json({ installations: [{ app_id: 42, id: 7 }] }),
      Response.json({ repositories: [{ id: 10, full_name: "studio/other" }] })
    ])
    await expect(githubCallback(request, env, "owner")).rejects.toMatchObject({ status: 403 })
    expect(db.prepare("SELECT count(*) AS count FROM github_connections").get()).toEqual({ count: 0 })
  })
})
