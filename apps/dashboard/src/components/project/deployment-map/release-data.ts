// Storybook-only source records. These are not fetched from a connected GitHub repository.
import type { Commit, SourceRecord } from "./release-records"
export const pullRequests: SourceRecord[] = [
  {
    number: 18427,
    title: "Add skill-based matchmaking",
    body: "Match players by rating, keep parties together, and expire abandoned queue tickets."
  },
  {
    number: 18431,
    title: "Show matchmaking queue progress",
    body: "Show queue position and retry state while players wait for a match."
  },
  {
    number: 18396,
    title: "Recover player sessions after disconnects",
    body: "Retry room handshakes with bounded backoff and restore the existing player session."
  },
  {
    number: 18254,
    title: "Reduce lobby presence updates",
    body: "Cache the lobby roster and deduplicate presence events when players rejoin."
  }
]
export const issues: SourceRecord[] = [
  {
    number: 121,
    title: "Match players with similar ratings",
    body: "Players with very different ratings are being placed in the same match."
  },
  {
    number: 126,
    title: "Keep parties on the same team",
    body: "Party members can be split during allocation when a queue fills."
  },
  {
    number: 129,
    title: "Show progress while finding a match",
    body: "Players need to know whether they are queued or should retry."
  },
  {
    number: 118,
    title: "Restore sessions after a brief disconnect",
    body: "A short network interruption can send players back to the lobby."
  },
  {
    number: 112,
    title: "Reduce lobby update latency",
    body: "Repeated presence events cause unnecessary roster refreshes."
  }
]
export const releases: { version: string; sha: string; time: string; commits: Commit[] }[] = [
  {
    version: "v1.8.0",
    sha: "8e3a9c2",
    time: "12m ago",
    commits: [
      {
        sha: "8e3a9c2",
        message: "Add skill-based matchmaking queues",
        author: "Alexandra Morgan-Sutherland",
        pr: 18427,
        issues: [121]
      },
      {
        sha: "9cf42b1",
        message: "Keep parties together during match allocation",
        author: "Alexandra Morgan-Sutherland",
        pr: 18427,
        issues: [126]
      },
      {
        sha: "bd027e6",
        message: "Expire abandoned matchmaking tickets",
        author: "Samir Patel",
        pr: 18427,
        issues: [121]
      },
      {
        sha: "52c8a14",
        message: "Show queue position while finding a match",
        author: "Maya Chen",
        pr: 18431,
        issues: [129]
      },
      { sha: "c821a09", message: "Add queue timeout and retry coverage", author: "Samir Patel", issues: [] }
    ]
  },
  {
    version: "v1.7.2",
    sha: "c46d219",
    time: "2h ago",
    commits: [
      {
        sha: "c46d219",
        message: "Preserve player session after a brief disconnect",
        author: "Maya Chen",
        pr: 18396,
        issues: [118]
      },
      {
        sha: "a7e219d",
        message: "Retry room handshakes with bounded backoff",
        author: "Samir Patel",
        pr: 18396,
        issues: [118]
      }
    ]
  },
  {
    version: "v1.7.1",
    sha: "7bf428c",
    time: "Yesterday",
    commits: [
      {
        sha: "7bf428c",
        message: "Cache lobby roster between room updates",
        author: "Alexandra Morgan-Sutherland",
        pr: 18254,
        issues: [112]
      },
      {
        sha: "0e68a92",
        message: "Deduplicate presence updates when players rejoin",
        author: "Maya Chen",
        pr: 18254,
        issues: [112]
      }
    ]
  }
]

export function compareReleases(
  current: string,
  target: string
): { direction: "added" | "removed" | "included"; commits: Commit[] } {
  const from = releases.findIndex((release) => release.version === current)
  const to = releases.findIndex((release) => release.version === target)
  const direction = to < from ? "added" : to > from ? "removed" : "included"
  const commits =
    direction === "included"
      ? releases[to]!.commits
      : releases.slice(Math.min(from, to), Math.max(from, to)).flatMap((release) => release.commits)
  return { direction, commits }
}
