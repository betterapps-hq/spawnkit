import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { URL } from "node:url"
export function communityFixture() {
  const db = new DatabaseSync(":memory:")
  const migrations = new URL("../migrations/", import.meta.url)
  for (const file of readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL(file, migrations), "utf8"))
  db.exec(`INSERT INTO projects(id,owner_id,name,configuration,created_at,updated_at) VALUES('p','creator','Game','{}','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');
    INSERT INTO environments(id,project_id,name,enabled,current_release_id) VALUES('p:production','p','production',1,'r');
    INSERT INTO releases(id,project_id,build_id,status,environment,created_at) VALUES('r','p','d','ready','production','2026-10-16T00:00:00.000Z');
    INSERT INTO deployments(id,project_id,release_id,environment,status,operation,request_key,request_hash,actor_id,created_at,updated_at) VALUES('d','p','r','production','succeeded','deployments','k','h','creator','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');
    INSERT INTO deployment_hostnames VALUES('d','d-game.spawnkit.games','p','production','r');
    INSERT INTO game_submissions(id,project_id,release_id,deployment_id,title,description,status,submitted_at,genre,dimension) VALUES('s','p','r','d','Game','Play a game.','approved','2026-10-16T00:00:00.000Z','Arcade','2D');
    INSERT INTO platform_admins VALUES('admin','now');
    INSERT INTO platform_admins VALUES('second-admin','now');
    INSERT INTO game_comments(id,project_id,user_id,author,body,created_at,updated_at) VALUES('c','p','player','Player','Original comment','2026-10-16T00:00:00.000Z','2026-10-16T00:00:00.000Z');`)
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = []
    const statement = {
      bind(...args: (string | number | null)[]) {
        values = args
        return statement
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null
      },
      async all() {
        return { results: db.prepare(sql).all(...values) }
      },
      async raw() {
        return db
          .prepare(sql)
          .all(...values)
          .map((row) => Object.values(row))
      },
      async run() {
        return db.prepare(sql).run(...values)
      },
      execute() {
        return { results: db.prepare(sql).all(...values) }
      }
    }
    return statement
  }
  const env = {
    DATABASE: {
      prepare,
      async batch(statements: ReturnType<typeof prepare>[]) {
        db.exec("BEGIN")
        try {
          const results = statements.map((s) => s.execute())
          db.exec("COMMIT")
          return results
        } catch (error) {
          db.exec("ROLLBACK")
          throw error
        }
      }
    },
    CLERK_SECRET_KEY: "test",
    DASHBOARD_URL: "https://spawnkit.cloud",
    DASHBOARD_ORIGINS: "https://spawnkit.cloud",
    RESEND_API_KEY: "test",
    INVITATION_FROM: "SpawnKit <team@spawnkit.cloud>",
    ARTIFACTS: { get: async () => null }
  } as unknown as Env
  return { db, env }
}
