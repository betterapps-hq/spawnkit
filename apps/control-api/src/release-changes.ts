import type { ReleaseChanges, ReleaseCommit, ReleaseSourceRecord } from "@spawn/platform/releases"
import { installationToken } from "./github"
import { boundedBody, HttpError, record, requireValue } from "./http"

const shaPattern = /^[a-f0-9]{40}$/
const unavailable = () =>
  new HttpError(
    502,
    "changes_unavailable",
    "Release changes could not be loaded from GitHub. Try again or review the comparison on GitHub."
  )

async function github(path: string, token: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "SpawnKit",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok || !response.body) throw unavailable()
  const bytes = await boundedBody(response, 2 * 1024 * 1024)
  return JSON.parse(new TextDecoder().decode(bytes))
}

const text = (value: unknown, limit = 2000) => (typeof value === "string" ? value.slice(0, limit) : "")
const nodes = (value: unknown): Record<string, unknown>[] => {
  const list = record(value).nodes
  return Array.isArray(list) ? list.map(record) : []
}
function source(value: Record<string, unknown>, repository: string, kind: "pull" | "issues"): ReleaseSourceRecord {
  requireValue(Number.isSafeInteger(value.number) && Number(value.number) > 0, "Invalid GitHub source record.")
  const number = Number(value.number)
  return {
    number,
    title: text(value.title, 500),
    body: text(value.body, 8000),
    state: text(value.state).toLowerCase(),
    url: `https://github.com/${repository}/${kind}/${number}`
  }
}

/** Both release IDs are resolved inside the already-authorized project. Clients cannot supply repository names or SHAs. */
export async function releaseChanges(request: Request, env: Env, projectId: string) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  requireValue(to && to.length <= 128 && (!from || from.length <= 128), "Choose releases to compare.")
  const release = async (id: string) => {
    const row = await env.DATABASE.prepare(
      "SELECT g.commit_sha AS sha FROM releases r LEFT JOIN github_events g ON g.deployment_id=r.build_id WHERE r.project_id=? AND r.id=?"
    )
      .bind(projectId, id)
      .first<{ sha: string | null }>()
    if (!row) throw new HttpError(404, "not_found", "Release not found.")
    if (!row.sha || !shaPattern.test(row.sha))
      throw new HttpError(
        422,
        "source_unavailable",
        "This release has no GitHub source history. Inspect its build details instead."
      )
    return row.sha
  }
  const target = await release(to)
  const current = from ? await release(from) : null
  const connection = await env.DATABASE.prepare(
    "SELECT installation_id,repository_id,repository FROM github_connections WHERE project_id=?"
  )
    .bind(projectId)
    .first<{ installation_id: number; repository_id: number; repository: string }>()
  if (!connection)
    throw new HttpError(422, "source_unavailable", "Connect the source repository to review its changes.")
  requireValue(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(connection.repository), "Invalid repository.")
  const { repository } = connection
  const token = await installationToken(env, connection.installation_id, connection.repository_id)
  let direction: ReleaseChanges["direction"] = "included"
  let commits: unknown[]
  let truncated = false
  let compareUrl = `https://github.com/${repository}/commits/${target}`
  if (current) {
    let comparison = record(await github(`/repos/${repository}/compare/${current}...${target}?per_page=100`, token))
    if (comparison.status === "diverged")
      throw new HttpError(
        422,
        "diverged_history",
        "These releases have diverged. Review both branches on GitHub before changing production."
      )
    direction = comparison.status === "behind" ? "removed" : comparison.status === "identical" ? "included" : "added"
    const base = direction === "removed" ? target : current
    const head = direction === "removed" ? current : target
    if (direction === "removed")
      comparison = record(await github(`/repos/${repository}/compare/${base}...${head}?per_page=100`, token))
    commits = Array.isArray(comparison.commits) ? comparison.commits : []
    truncated = Number(comparison.total_commits) > commits.length
    compareUrl = `https://github.com/${repository}/compare/${base}...${head}`
  } else {
    const result = await github(`/repos/${repository}/commits?sha=${target}&per_page=100`, token)
    if (!Array.isArray(result)) throw unavailable()
    commits = result
    truncated = result.length === 100
  }
  const changes: ReleaseChanges = {
    commits: commits.map((item): ReleaseCommit => {
      const value = record(item)
      const commit = record(value.commit)
      requireValue(typeof value.sha === "string" && shaPattern.test(value.sha), "Invalid GitHub commit.")
      return {
        sha: value.sha,
        message: text(commit.message, 4000).split("\n")[0]!,
        author: text(record(commit.author).name, 500),
        issues: []
      }
    }),
    pullRequests: [],
    issues: [],
    direction,
    truncated,
    compareUrl
  }
  // Linked work needs additional App read permissions. Commit review still works when an installation lacks them.
  if (!changes.commits.length) return Response.json(changes)
  try {
    const linkedToken = await installationToken(env, connection.installation_id, connection.repository_id, true)
    const [owner, name] = repository.split("/")
    for (let offset = 0; offset < changes.commits.length; offset += 25) {
      const batch = changes.commits.slice(offset, offset + 25)
      const fields = batch
        .map(
          (commit, index) =>
            `c${index}: object(oid: "${commit.sha}") { ... on Commit { associatedPullRequests(first: 10) { pageInfo { hasNextPage } nodes { number title body state repository { nameWithOwner } closingIssuesReferences(first: 20) { pageInfo { hasNextPage } nodes { number title body state repository { nameWithOwner } } } } } } }`
        )
        .join("\n")
      const result = record(
        await github("/graphql", linkedToken, {
          query: `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`,
          variables: { owner, name }
        })
      )
      if (result.errors) throw unavailable()
      const repo = record(record(result.data).repository)
      for (const [index, commit] of batch.entries()) {
        const pulls = record(record(repo[`c${index}`]).associatedPullRequests)
        if (record(pulls.pageInfo).hasNextPage) changes.truncated = true
        for (const pull of nodes(pulls)) {
          if (record(pull.repository).nameWithOwner !== repository) continue
          const pr = source(pull, repository, "pull")
          // Keep the primary association on the compact commit row; all associations remain in the PR tab.
          commit.pr ??= pr.number
          commit.prs ??= []
          if (!commit.prs.includes(pr.number)) commit.prs.push(pr.number)
          if (!changes.pullRequests.some((item) => item.number === pr.number)) changes.pullRequests.push(pr)
          const linked = record(pull.closingIssuesReferences)
          if (record(linked.pageInfo).hasNextPage) changes.truncated = true
          for (const item of nodes(linked)) {
            // Numeric identifiers are scoped to this repository, never silently mix cross-repository issues.
            if (record(item.repository).nameWithOwner !== repository) {
              changes.linksUnavailable = true
              continue
            }
            const issue = source(item, repository, "issues")
            if (!commit.issues.includes(issue.number)) commit.issues.push(issue.number)
            if (!changes.issues.some((value) => value.number === issue.number)) changes.issues.push(issue)
          }
        }
      }
    }
  } catch {
    changes.linksUnavailable = true
  }
  return Response.json(changes)
}
