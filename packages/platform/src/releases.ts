export type ReleaseCommit = {
  sha: string
  message: string
  author: string
  pr?: number
  prs?: number[]
  issues: number[]
}
export type ReleaseSourceRecord = { number: number; title: string; body: string; state?: string; url?: string }
export type ReleaseChanges = {
  commits: ReleaseCommit[]
  pullRequests: ReleaseSourceRecord[]
  issues: ReleaseSourceRecord[]
  direction: "added" | "removed" | "included"
  truncated?: boolean
  linksUnavailable?: boolean
  compareUrl?: string
}
