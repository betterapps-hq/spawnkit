import { createHmac } from "node:crypto"
import type { ReportCase, ReportDetail, TeamData } from "@spawn/platform/community"
import { afterEach, expect, it, vi } from "vitest"
import type { DeploymentRow } from "./activation"
import { automaticSubmission } from "./automatic-submission"
import { communityFixture } from "./community-fixture"
import { reportsRoute, submitReport } from "./community-reports"
import { acceptInvitation, deliverInvitations, teamRoute } from "./community-team"
import { moderationRoute } from "./moderation"
import { projectListing } from "./project-listing"

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn<
    () => Promise<{ username: string; emailAddresses: { emailAddress: string; verification: { status: string } }[] }>
  >(async () => ({
    username: "Verified person",
    emailAddresses: [{ emailAddress: "invitee@example.com", verification: { status: "verified" } }]
  }))
}))
vi.mock("@clerk/backend", () => ({ createClerkClient: () => ({ users: { getUser } }) }))
const fixtures: ReturnType<typeof communityFixture>[] = []
function fixture() {
  const f = communityFixture()
  fixtures.push(f)
  f.db.exec(
    "INSERT INTO community_members(user_id,name,email,role,created_at) VALUES('mod','Moderator','mod@example.com','Moderator','now'),('observer','Observer','read@example.com','Observer','now')"
  )
  return f
}
afterEach(() => {
  fixtures.splice(0).forEach((f) => f.db.close())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const req = (body?: unknown, query = "", method = "POST") =>
  new Request(
    `https://test/api${query}`,
    body === undefined ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  )
const json = async <T>(response: Promise<Response>) => (await (await response).json()) as T
const invite = (overrides: Record<string, unknown> = {}) => ({
  requestId: crypto.randomUUID(),
  action: "invite",
  email: "invitee@example.com",
  role: "Moderator",
  ...overrides
})
async function report(env: Env, actor = "player", kind = "Game") {
  await submitReport(
    req({
      kind,
      reason: kind === "Game" ? "Unsafe content or links" : "Spam or advertising",
      details: "Observed in the game",
      ...(kind === "Comment" ? { commentId: "c" } : {})
    }),
    env,
    actor,
    "p"
  )
  return (await json<{ items: ReportCase[] }>(reportsRoute(req(), env, "admin"))).items[0]!
}
const detail = (env: Env, id: string) => json<ReportDetail>(reportsRoute(req(), env, "admin", id))
const command = (item: ReportCase, action: string, extra: Record<string, unknown> = {}) => ({
  requestId: crypto.randomUUID(),
  revision: item.revision,
  action,
  reason: "Unsafe content",
  note: "Verified the evidence",
  ...extra
})

it("enforces read, moderation and administrator permissions", async () => {
  const { env } = fixture()
  for (const actor of ["creator", "player"]) {
    await expect(teamRoute(req(), env, actor)).rejects.toMatchObject({ status: 403 })
    await expect(reportsRoute(req(), env, actor)).rejects.toMatchObject({ status: 403 })
  }
  for (const actor of ["mod", "observer"])
    await expect(teamRoute(req(invite()), env, actor, "invitations")).rejects.toMatchObject({ status: 403 })
  await expect(reportsRoute(req({}), env, "observer", "x")).rejects.toMatchObject({ status: 403 })
  await expect(moderationRoute(req({}), env, "observer", "decisions")).rejects.toMatchObject({ status: 403 })
  expect((await teamRoute(req(), env, "observer")).status).toBe(200)
})
it("issues a hashed, verified-email invitation and records acceptance once", async () => {
  const { env, db } = fixture(),
    body = invite()
  await teamRoute(req(body), env, "admin", "invitations")
  await teamRoute(req(body), env, "admin", "invitations")
  const row = db.prepare("SELECT * FROM community_invitations").get()!
  const token = createHmac("sha256", "test")
    .update(`spawnkit-community-invite-v1:${row.id}:${body.requestId}`)
    .digest("hex")
  expect(row.token_hash).not.toBe(token)
  getUser.mockResolvedValueOnce({
    username: "Wrong",
    emailAddresses: [{ emailAddress: "wrong@example.com", verification: { status: "verified" } }]
  })
  await expect(acceptInvitation(req({ token }), env, "new-user")).rejects.toMatchObject({ status: 403 })
  getUser.mockResolvedValueOnce({
    username: "Unverified",
    emailAddresses: [{ emailAddress: "invitee@example.com", verification: { status: "unverified" } }]
  })
  await expect(acceptInvitation(req({ token }), env, "new-user")).rejects.toMatchObject({ status: 403 })
  await acceptInvitation(req({ token }), env, "new-user")
  await acceptInvitation(req({ token }), env, "new-user")
  expect(db.prepare("SELECT role FROM community_access WHERE user_id='new-user'").get()).toMatchObject({
    role: "Moderator"
  })
  expect(db.prepare("SELECT count(*) AS n FROM community_audit").get()).toMatchObject({ n: 2 })
  expect(() => db.exec("DELETE FROM community_audit")).toThrow("immutable")
})
it("revokes prior invitation links on resend and respects expiry and issuer access", async () => {
  const { env, db } = fixture(),
    body = invite()
  await teamRoute(req(body), env, "admin", "invitations")
  const row = db.prepare("SELECT id FROM community_invitations").get()!
  const token = createHmac("sha256", "test")
    .update(`spawnkit-community-invite-v1:${row.id}:${body.requestId}`)
    .digest("hex")
  await teamRoute(
    req({ requestId: crypto.randomUUID(), action: "resend", revision: 0 }),
    env,
    "second-admin",
    "invitations",
    String(row.id)
  )
  await expect(acceptInvitation(req({ token }), env, "new-user")).rejects.toMatchObject({ status: 410 })
  db.exec("UPDATE community_invitations SET expires_at='2000-01-01'")
  expect((await json<TeamData>(teamRoute(req(), env, "admin"))).invitations[0]!.expiresAt).toBe("2000-01-01")
})
it("protects the last admin and keeps removed legacy admins revoked", async () => {
  const { env, db } = fixture()
  await teamRoute(
    req({ requestId: crypto.randomUUID(), action: "remove", revision: 0, reason: "Access ended" }),
    env,
    "admin",
    "members",
    "second-admin"
  )
  expect(db.prepare("SELECT user_id FROM community_access WHERE user_id='second-admin'").get()).toBeUndefined()
  await expect(teamRoute(req(invite()), env, "second-admin", "invitations")).rejects.toMatchObject({ status: 403 })
  db.exec("INSERT INTO community_members(user_id,role,created_at) VALUES('admin','Admin','now')")
  expect(() => db.exec("UPDATE community_members SET role='Moderator' WHERE user_id='admin'")).toThrow(
    "last administrator"
  )
})
it("uses durable email retries with stable idempotency keys and never sends an accepted invitation", async () => {
  const { env, db } = fixture()
  await teamRoute(req(invite()), env, "admin", "invitations")
  const send = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
    .mockResolvedValue(new Response("{}"))
  vi.stubGlobal("fetch", send)
  await deliverInvitations(env)
  expect(db.prepare("SELECT email_attempts,email_state FROM community_invitations").get()).toMatchObject({
    email_attempts: 1,
    email_state: "pending"
  })
  db.exec("UPDATE community_invitations SET email_next_at=NULL")
  await deliverInvitations(env)
  expect(new Headers(send.mock.calls[0]![1]!.headers).get("Idempotency-Key")).toBe(
    new Headers(send.mock.calls[1]![1]!.headers).get("Idempotency-Key")
  )
  expect(JSON.parse(String(send.mock.calls[0]![1]!.body)).from).toBe("SpawnKit <team@spawnkit.cloud>")
  expect(db.prepare("SELECT email_state FROM community_invitations").get()).toMatchObject({ email_state: "sent" })
  await deliverInvitations(env)
  expect(send).toHaveBeenCalledTimes(2)
})
it("groups reports, prevents duplicates and preserves the original evidence after edits", async () => {
  const { env, db } = fixture()
  const item = await report(env, "player", "Comment")
  await report(env, "player", "Comment")
  await report(env, "another", "Comment")
  expect((await detail(env, item.id)).reports).toBe(2)
  db.exec("UPDATE game_comments SET body='Edited later',moderation_revision=1 WHERE id='c'")
  const result = await detail(env, item.id)
  expect(result.evidence[0]!.snapshot.body).toBe("Original comment")
  expect(result.current!.body).toBe("Edited later")
  expect(JSON.stringify(result)).not.toContain("reporterId")
  expect(() => db.exec("UPDATE player_reports SET details='changed'")).toThrow("immutable")
  await report(env, "player", "Comment")
  expect((await detail(env, item.id)).reports).toBe(3)
})
it("paginates complete report evidence and audit history without gaps", async () => {
  const { env } = fixture()
  const item = await report(env)
  for (let i = 0; i < 44; i++) {
    await report(env, `player-${i}`)
    await reportsRoute(req(command(await detail(env, item.id), "note")), env, "mod", item.id)
  }
  const first = await detail(env, item.id)
  expect(first.evidence).toHaveLength(40)
  expect(first.events).toHaveLength(40)
  const moreEvidence = await json<{ items: { id: string }[]; nextCursor: string | null }>(
    reportsRoute(
      req(undefined, `?feed=evidence&cursor=${encodeURIComponent(first.evidenceCursor!)}`),
      env,
      "observer",
      item.id
    )
  )
  const moreHistory = await json<{ items: { id: string }[]; nextCursor: string | null }>(
    reportsRoute(
      req(undefined, `?feed=history&cursor=${encodeURIComponent(first.historyCursor!)}`),
      env,
      "observer",
      item.id
    )
  )
  expect(new Set([...first.evidence, ...moreEvidence.items].map((r) => r.id)).size).toBe(45)
  expect(new Set([...first.events, ...moreHistory.items].map((r) => r.id)).size).toBe(44)
  expect(moreEvidence.nextCursor).toBeNull()
  expect(moreHistory.nextCursor).toBeNull()
})
it("enforces report limits without creating empty cases", async () => {
  const { env, db } = fixture()
  for (let i = 0; i < 5; i++) {
    db.prepare("UPDATE game_comments SET body=?,moderation_revision=? WHERE id='c'").run(`Version ${i}`, i)
    await report(env, "player", "Comment")
  }
  db.exec("UPDATE game_comments SET body='Six',moderation_revision=6 WHERE id='c'")
  await expect(report(env, "player", "Comment")).rejects.toMatchObject({ status: 429 })
  expect(db.prepare("SELECT count(*) AS n FROM player_reports").get()).toMatchObject({ n: 5 })
})
it("requires current evidence and ownership, applies content decisions and audits atomically", async () => {
  const { env, db } = fixture()
  const item = await report(env)
  await reportsRoute(req(command(item, "claim")), env, "mod", item.id)
  let current = await detail(env, item.id)
  await expect(
    reportsRoute(
      req(command(current, "restrict-game", { contentVersion: current.contentVersion })),
      env,
      "mod",
      item.id
    )
  ).rejects.toMatchObject({ status: 403 })
  const stale = command(current, "hide-game", { contentVersion: current.contentVersion })
  db.exec("UPDATE game_submissions SET description='New content to review'")
  await expect(reportsRoute(req(stale), env, "mod", item.id)).rejects.toMatchObject({ status: 409 })
  current = await detail(env, item.id)
  const body = command(current, "hide-game", { contentVersion: current.contentVersion })
  await Promise.all([reportsRoute(req(body), env, "mod", item.id), reportsRoute(req(body), env, "mod", item.id)])
  expect(db.prepare("SELECT state,revision FROM game_moderation").get()).toMatchObject({ state: "hidden", revision: 1 })
  expect(db.prepare("SELECT count(*) AS n FROM moderation_audit").get()).toMatchObject({ n: 1 })
  expect((await detail(env, item.id)).state).toBe("resolved")
})
it("does not apply a different decision racing with the same request ID", async () => {
  const { env, db } = fixture()
  const item = await report(env)
  await reportsRoute(req(command(item, "claim")), env, "mod", item.id)
  const current = await detail(env, item.id)
  const note = command(current, "note")
  const hide = { ...note, action: "hide-game", contentVersion: current.contentVersion }
  const results = await Promise.allSettled([
    reportsRoute(req(note), env, "mod", item.id),
    reportsRoute(req(hide), env, "mod", item.id)
  ])
  expect(results[0]!.status).toBe("fulfilled")
  expect(results[1]).toMatchObject({ status: "rejected", reason: { status: 409 } })
  expect(db.prepare("SELECT count(*) AS n FROM game_moderation").get()).toMatchObject({ n: 0 })
  expect(db.prepare("SELECT count(*) AS n FROM moderation_audit").get()).toMatchObject({ n: 0 })
  expect((await detail(env, item.id)).state).toBe("open")
})
it("rolls back content and audit when a moderation transaction fails", async () => {
  const { env, db } = fixture()
  const item = await report(env)
  await reportsRoute(req(command(item, "claim")), env, "mod", item.id)
  const current = await detail(env, item.id)
  db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON moderation_audit BEGIN SELECT RAISE(ABORT,'Test failure'); END")
  const decision = command(current, "hide-game", { contentVersion: current.contentVersion })
  await expect(reportsRoute(req(decision), env, "mod", item.id)).rejects.toThrow("Test failure")
  expect(db.prepare("SELECT id FROM report_audit WHERE id=?").get(decision.requestId)).toBeUndefined()
  expect(db.prepare("SELECT count(*) AS n FROM game_moderation").get()).toMatchObject({ n: 0 })
  expect((await detail(env, item.id)).revision).toBe(current.revision)
})
it("rechecks reviewer access inside the write transaction", async () => {
  const { env, db } = fixture()
  const item = await report(env)
  await reportsRoute(req(command(item, "claim")), env, "mod", item.id)
  const current = await detail(env, item.id)
  getUser.mockImplementationOnce(async () => {
    db.exec("UPDATE community_members SET active=0 WHERE user_id='mod'")
    return { username: "Former reviewer", emailAddresses: [] }
  })
  await expect(
    reportsRoute(req(command(current, "hide-game", { contentVersion: current.contentVersion })), env, "mod", item.id)
  ).rejects.toMatchObject({ status: 409 })
  expect(db.prepare("SELECT count(*) AS n FROM game_moderation").get()).toMatchObject({ n: 0 })
})
it("returns assigned cases to the queue when a moderator loses write access", async () => {
  const { env } = fixture()
  const item = await report(env)
  await reportsRoute(req(command(item, "claim")), env, "mod", item.id)
  await teamRoute(
    req({
      requestId: crypto.randomUUID(),
      action: "role",
      role: "Observer",
      revision: 0,
      reason: "Review-only access"
    }),
    env,
    "admin",
    "members",
    "mod"
  )
  expect((await detail(env, item.id)).assigneeId).toBeNull()
  await expect(
    reportsRoute(req(command(await detail(env, item.id), "claim")), env, "mod", item.id)
  ).rejects.toMatchObject({ status: 403 })
})
it("owns listing metadata centrally, rejects stale changes and applies overrides to future deployments", async () => {
  const { env, db } = fixture()
  await expect(projectListing(req(), env, "player", "p")).rejects.toMatchObject({ status: 404 })
  const before = await json<Record<string, unknown>>(projectListing(req(), env, "creator", "p"))
  expect(before).not.toHaveProperty("status")
  const body = {
    revision: 0,
    releaseId: "r",
    reset: false,
    title: "New title",
    description: "A new description.",
    details: {
      objective: "Solve the puzzle",
      controls: "Arrow keys",
      creator: "Puzzle Studio",
      sourceUrl: "https://example.com/source",
      sourcePermission: true,
      sourceLicense: "MIT",
      kitId: "three"
    },
    genre: "Puzzle",
    dimension: "3D"
  }
  await projectListing(req(body, "", "PUT"), env, "creator", "p")
  await expect(projectListing(req(body, "", "PUT"), env, "creator", "p")).rejects.toMatchObject({ status: 409 })
  expect(db.prepare("SELECT title,genre FROM game_submissions").get()).toMatchObject({
    title: "New title",
    genre: "Puzzle"
  })
  expect((await json<Record<string, unknown>>(projectListing(req(), env, "creator", "p"))).details).toEqual(
    body.details
  )
  db.exec("DELETE FROM game_submissions")
  await env.DATABASE.batch(
    await automaticSubmission(
      env,
      { id: "d", project_id: "p", release_id: "r" } as DeploymentRow,
      new Date().toISOString()
    )
  )
  expect(db.prepare("SELECT title,dimension FROM game_submissions").get()).toMatchObject({
    title: "New title",
    dimension: "3D"
  })
  expect(JSON.parse((db.prepare("SELECT details FROM game_submissions").get() as { details: string }).details)).toEqual(
    body.details
  )
  await projectListing(req({ revision: 1, releaseId: "r", reset: true }, "", "PUT"), env, "creator", "p")
  expect((await json<Record<string, unknown>>(projectListing(req(), env, "creator", "p"))).details).toEqual({})
  expect(db.prepare("SELECT active,revision FROM project_listing_settings").get()).toMatchObject({
    active: 0,
    revision: 2
  })
})
