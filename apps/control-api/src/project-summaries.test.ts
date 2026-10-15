import { DatabaseSync } from "node:sqlite"
import { expect, it } from "vitest"
import { projectSummaries } from "./project-summaries"

it("returns only the owner's stable environments and their current releases", async () => {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    CREATE TABLE projects(id TEXT,owner_id TEXT);
    CREATE TABLE environments(project_id TEXT,name TEXT,enabled INTEGER,current_release_id TEXT);
    CREATE TABLE hosting_slots(project_id TEXT,environment TEXT,hostname TEXT);
    CREATE TABLE releases(id TEXT,project_id TEXT,build_id TEXT,status TEXT,environment TEXT,created_at TEXT,artifact_digest TEXT,url TEXT);
    INSERT INTO projects VALUES('p','owner'),('q','other');
    INSERT INTO environments VALUES('p','production',1,'v2'),('p','sandbox',1,NULL),('p','preview-1',1,'v1'),('q','production',1,'secret');
    INSERT INTO releases VALUES('v1','p','b1','ready','production','yesterday','hash1','old'),('v2','p','b2','ready','production','today','hash2','live'),('secret','q','b3','ready','production','today','hash3','private');
  `)
  const env = {
    DATABASE: {
      prepare: (sql: string) => ({
        bind: (owner: string) => ({ all: async () => ({ results: db.prepare(sql).all(owner) }) })
      })
    }
  } as unknown as Env
  try {
    const rows = await projectSummaries(env, "owner")
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.name === "production")).toMatchObject({ id: "v2", versionNumber: 2 })
    expect(rows.find((row) => row.name === "sandbox")).toMatchObject({ id: null, currentReleaseId: null })
    expect(await projectSummaries(env, "unknown")).toEqual([])
  } finally {
    db.close()
  }
})
