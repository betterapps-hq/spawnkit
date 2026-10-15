import { ArrowLeft, ArrowRight, ChevronRight, CircleDot, GitCommitHorizontal, GitPullRequest } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { CommitLink as SourceCommitLink } from "../commit-link"
import { EnvironmentBadge } from "../environment-badge"
import { StatusBadge } from "../primitives"
import { useReleaseRecords, type Commit, type SourceRecord } from "./release-records"

function CommitLink({ sha }: { sha: string }) {
  const { repository } = useReleaseRecords()
  return <SourceCommitLink repository={repository} sha={sha} />
}

export function ReleasePlacements({
  version,
  production,
  failed,
  staging
}: {
  version: string
  production: string
  failed: boolean
  staging?: string | null
}) {
  const { releases } = useReleaseRecords()
  return (
    <span className="flex flex-wrap gap-1.5">
      {version === production && <EnvironmentBadge environment="production" />}
      {version === (staging === undefined ? releases[failed ? 1 : 0]?.version : staging) && (
        <EnvironmentBadge environment="staging" />
      )}
      {version === releases[0]?.version && failed && <StatusBadge status="failed" />}
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
  const { releases, compare: compareReleases } = useReleaseRecords()
  const release = releases.find((r) => r.version === version)!
  const comparison = compareTo ? compareReleases(compareTo, version) : null
  const count = comparison
    ? `${comparison.direction === "added" ? "+" : comparison.direction === "removed" ? "−" : ""}${comparison.commits.length}`
    : release.commits.length
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block font-medium">{release.label ?? version}</span>
      <span className="mt-1 flex items-center gap-2 text-xs font-normal text-muted-foreground">
        {showCount && (
          <>
            <span>{count} commits</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        {showCount ? <code>{release.sha}</code> : <CommitLink sha={release.sha} />}
      </span>
    </span>
  )
}

export function ReleaseComparison({
  current,
  target,
  staging,
  failed,
  onTargetChange,
  options
}: {
  current: string
  target: string
  staging: string | null
  failed: boolean
  onTargetChange?: ((version: string) => void) | undefined
  options?: string[]
}) {
  const { releases } = useReleaseRecords()
  const buildFailed =
    releases.find((release) => release.version === target)?.status === "failed" ||
    (target === releases[0]?.version && failed)
  return (
    <Card className="dm-release-comparison" aria-label="Release destination">
      <div className="dm-release-endpoint" aria-label="Source release">
        <span data-release-origin>
          {target === staging ? (
            <EnvironmentBadge environment="staging" />
          ) : buildFailed ? (
            <StatusBadge status="failed" />
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Retained release
            </Badge>
          )}
        </span>
        {onTargetChange ? (
          <Select value={target} onValueChange={onTargetChange}>
            <SelectTrigger aria-label="Target release" className="dm-release-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {(options
                ? releases.filter((release) => options.includes(release.version))
                : releases.slice(releases.findIndex((release) => release.version === current) + 1)
              ).map((release) => (
                <SelectItem key={release.version} value={release.version}>
                  {release.label ?? release.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <strong>{releases.find((release) => release.version === target)?.label ?? target}</strong>
        )}
        <CommitLink sha={releases.find((r) => r.version === target)?.sha ?? ""} />
      </div>
      <ArrowRight size={20} className="dm-release-direction text-muted-foreground" aria-hidden="true" />
      <div className="dm-release-endpoint dm-release-destination" aria-label="Current production release">
        <EnvironmentBadge environment="production" />
        <strong>{releases.find((release) => release.version === current)?.label ?? (current || "No release")}</strong>
        <CommitLink sha={releases.find((r) => r.version === current)?.sha ?? ""} />
      </div>
    </Card>
  )
}

type SourceSelection = { kind: "pr" | "issue"; record: SourceRecord }

export function ReleaseChanges({ current, target }: { current: string; target: string }) {
  const { compare: compareReleases, pullRequests, issues } = useReleaseRecords()
  const { commits, direction } = compareReleases(current, target)
  const prs = pullRequests.filter((pr) =>
    commits.some((commit) => commit.pr === pr.number || commit.prs?.includes(pr.number))
  )
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
          <span className="dm-commit-marker" aria-hidden="true">
            <GitCommitHorizontal size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5">{commit.message}</p>
            <div className="dm-commit-meta">
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
              <CommitLink sha={commit.sha} />
            </div>
            <p className="dm-commit-author">{commit.author}</p>
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
              #{record.number} · {record.state ?? (kind === "pr" ? "Merged" : "Closed")}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground" />
        </Button>
      ))}
    </div>
  )
  return (
    <div className="dm-changes">
      <div>
        <h3 className={`text-sm font-semibold ${direction === "removed" ? "text-destructive" : ""}`}>
          {direction === "included" ? "Changes" : `Changes ${direction}`}
        </h3>
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
            <Badge variant="secondary">{source.record.state ?? (source.kind === "pr" ? "Merged" : "Closed")}</Badge>
          </div>
          <h4 ref={detailHeading} tabIndex={-1} className="text-base font-medium outline-none">
            {source.record.title}
          </h4>
          <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap break-words">
            {source.record.body}
          </p>
          {source.record.url && (
            <Button asChild variant="link" size="sm" className="w-fit p-0">
              <a href={source.record.url} target="_blank" rel="noopener noreferrer">
                Open on GitHub
              </a>
            </Button>
          )}
          {commitList(
            commits.filter((commit) =>
              source.kind === "pr"
                ? commit.pr === source.record.number || commit.prs?.includes(source.record.number)
                : commit.issues.includes(source.record.number)
            )
          )}
          {source.kind === "pr" &&
            records(
              linkedIssues.filter((issue) =>
                commits.some(
                  (commit) =>
                    (commit.pr === source.record.number || commit.prs?.includes(source.record.number)) &&
                    commit.issues.includes(issue.number)
                )
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
