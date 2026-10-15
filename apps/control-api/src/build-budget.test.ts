import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
import { expect, it } from "vitest"
import { claimBuildBudget } from "./build-budget"

it("shares owner quotas across projects, enforces the platform ceiling, and permits retry of a claimed job", async () => {
  const db = new DatabaseSync(":memory:")
  db.exec("CREATE TABLE projects(id TEXT,owner_id TEXT); INSERT INTO projects VALUES('a','u'),('b','u'),('c','v')")
  db.exec(readFileSync(new URL("../migrations/0009_build_budgets.sql", import.meta.url), "utf8"))
  const env = {
    BUILD_DAILY_OWNER_LIMIT: "2",
    BUILD_DAILY_PLATFORM_LIMIT: "3",
    DATABASE: {
      prepare: (sql: string) => ({
        bind: (...args: (string | number)[]) => ({ first: async () => db.prepare(sql).get(...args) ?? null })
      })
    }
  } as unknown as Env
  try {
    await Promise.all([claimBuildBudget(env, "1", "a"), claimBuildBudget(env, "2", "b")])
    await expect(claimBuildBudget(env, "3", "a")).rejects.toMatchObject({ code: "build_budget_exhausted" })
    await claimBuildBudget(env, "1", "a")
    await claimBuildBudget(env, "4", "c")
    await expect(claimBuildBudget(env, "5", "c")).rejects.toMatchObject({ code: "build_budget_exhausted" })
    db.exec("UPDATE build_budget_claims SET day='2000-01-01'")
    await Promise.all([claimBuildBudget(env, "6", "a"), claimBuildBudget(env, "6", "a")])
    expect(db.prepare("SELECT COUNT(*) AS count FROM build_budget_claims").get()?.count).toBe(4)
  } finally {
    db.close()
  }
})
