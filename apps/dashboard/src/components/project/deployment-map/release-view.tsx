import { ArrowLeft, ArrowRight, ChevronRight, CircleDot, GitCommitHorizontal, GitPullRequest } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { EnvironmentBadge } from "../environment-badge"
import { StatusBadge } from "../primitives"
import { compareReleases, issues, pullRequests, releases, type Commit, type SourceRecord } from "./release-data"

export function ReleasePlacements({
  version,
  production,
  failed
}: {
  version: string
  production: string
  failed: boolean
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {version === production && <EnvironmentBadge environment="production" />}
      {version === (failed ? "v1.7.2" : "v1.8.0") && <EnvironmentBadge environment="staging" />}
      {version === "v1.8.0" && failed && <StatusBadge status="failed" />}
    </span>
  )
}

export function ReleaseIdentity({
  version,
  compareTo,
  showCount = true
}: {
  version: string
  compareTo?: string
  showCount?: boolean
}) {
  const release = releases.find((r) => r.version === version)!
  const comparison = compareTo ? compareReleases(compareTo, version) : null
  const count = comparison
    ? `${comparison.direction === "added" ? "+" : comparison.direction === "removed" ? "−" : ""}${comparison.commits.length}`
    : release.commits.length
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block font-medium">{version}</span>
      <span className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">
        {showCount && (
          <>
            <span>{count} commits</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <code>{release.sha}</code>
      </span>
    </span>
  )
}

export function ReleaseComparison({ current, target }: { current: string; target: string }) {
  return (
    <Card className="dm-release-comparison">
      <div>
        <span className="dm-comparison-label">Current</span>
        <strong>{current}</strong>
        <code>{releases.find((r) => r.version === current)?.sha}</code>
      </div>
      <ArrowRight size={16} className="text-muted-foreground" />
      <div>
        <span className="dm-comparison-label">After deployment</span>
        <strong>{target}</strong>
        <code>{releases.find((r) => r.version === target)?.sha}</code>
      </div>
    </Card>
  )
}

type SourceSelection = { kind: "pr" | "issue"; record: SourceRecord }

export function ReleaseChanges({ current, target }: { current: string; target: string }) {
  const { commits, direction } = compareReleases(current, target)
  const prs = pullRequests.filter((pr) => commits.some((commit) => commit.pr === pr.number))
  const linkedIssues = issues.filter((issue) => commits.some((commit) => commit.issues.includes(issue.number)))
  const [tab, setTab] = useState("commits")
  const [source, setSource] = useState<SourceSelection | null>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const changeTabs = useRef<HTMLDivElement>(null)
  const sourceOpener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (source) detailHeading.current?.focus()
    else if (sourceOpener.current?.isConnected) sourceOpener.current.focus()
    else if (sourceOpener.current) changeTabs.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [source])
  const openSource = (selection: SourceSelection, opener: HTMLElement) => {
    sourceOpener.current = opener
    setSource(selection)
  }
  const commitList = (items: Commit[]) => (
    <ul className="dm-commit-list">
      {items.map((commit) => (
        <li key={commit.sha}>
          <GitCommitHorizontal size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5">{commit.message}</p>
            <div className="dm-commit-meta">
              <code>{commit.sha}</code>
              <span>{commit.author}</span>
              {commit.pr && (
                <Button
                  variant="link"
                  size="xs"
                  onClick={(event) =>
                    openSource(
                      { kind: "pr", record: pullRequests.find((pr) => pr.number === commit.pr)! },
                      event.currentTarget
                    )
                  }
                >
                  <GitPullRequest />#{commit.pr}
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
  const records = (items: SourceRecord[], kind: SourceSelection["kind"]) => (
    <div className="dm-source-list">
      {items.map((record) => (
        <Button
          key={record.number}
          variant="ghost"
          className="dm-source-row"
          onClick={(event) => openSource({ kind, record }, event.currentTarget)}
        >
          {kind === "pr" ? (
            <GitPullRequest className="text-primary" />
          ) : (
            <CircleDot className="text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm">{record.title}</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              #{record.number} · {kind === "pr" ? "Merged" : "Closed"}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground" />
        </Button>
      ))}
    </div>
  )
  return (
    <div className="dm-changes">
      <div className="flex items-center justify-between gap-3">
        <h3 className={`text-sm font-medium ${direction === "removed" ? "text-destructive" : ""}`}>
          {direction === "included" ? "Changes" : `Changes ${direction}`}
        </h3>
        <span className="text-xs text-muted-foreground">
          {direction === "included" ? "In this release" : `vs. ${current}`}
        </span>
      </div>
      {source ? (
        <div className="dm-source-detail">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setSource(null)}>
            <ArrowLeft />
            Changes
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {source.kind === "pr" ? <GitPullRequest size={15} /> : <CircleDot size={15} />}
            GitHub · {source.kind === "pr" ? "Pull request" : "Issue"} #{source.record.number}
            <Badge variant="secondary">{source.kind === "pr" ? "Merged" : "Closed"}</Badge>
          </div>
          <h4 ref={detailHeading} tabIndex={-1} className="text-base font-medium outline-none">
            {source.record.title}
          </h4>
          <p className="text-sm leading-6 text-muted-foreground">{source.record.body}</p>
          {commitList(
            commits.filter((commit) =>
              source.kind === "pr" ? commit.pr === source.record.number : commit.issues.includes(source.record.number)
            )
          )}
          {source.kind === "pr" &&
            records(
              linkedIssues.filter((issue) =>
                commits.some((commit) => commit.pr === source.record.number && commit.issues.includes(issue.number))
              ),
              "issue"
            )}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList ref={changeTabs} variant="line" aria-label="Release changes" className="dm-change-tabs">
            <TabsTrigger value="commits">
              Commits <span>{commits.length}</span>
            </TabsTrigger>
            <TabsTrigger value="prs">
              Pull requests <span>{prs.length}</span>
            </TabsTrigger>
            <TabsTrigger value="issues">
              Issues <span>{linkedIssues.length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="commits">{commitList(commits)}</TabsContent>
          <TabsContent value="prs">{records(prs, "pr")}</TabsContent>
          <TabsContent value="issues">
            {records(linkedIssues, "issue")}
            {direction === "removed" && (
              <p className="pt-3 text-xs text-muted-foreground">Rolling back code does not reopen GitHub issues.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
