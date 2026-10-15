import type { ReleaseChanges as Changes } from "@spawn/platform/releases"
import { ArrowUpRight, LoaderCircle, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { loadReleaseChanges, type LoadReleaseChanges } from "@/lib/release-changes"
import { Button } from "../../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import type { ActionHandler, ProjectModel, Release } from "../model"
import { Notice } from "../primitives"
import { releaseLabel } from "../release-label"
import { canRelease } from "./project-deployments"
import { ReleaseDataProvider } from "./release-records"
import { ReleaseChanges, ReleaseComparison } from "./release-view"

export function ReleaseReview({
  project,
  kind,
  version,
  canEdit,
  onAction,
  onClose,
  onVersion,
  loadChanges = loadReleaseChanges
}: {
  project: ProjectModel
  kind: "promote" | "rollback"
  version?: Release | undefined
  canEdit: boolean
  onAction?: ActionHandler | undefined
  onClose: () => void
  onVersion: (release: Release) => void
  loadChanges?: LoadReleaseChanges | undefined
}) {
  const [baseline, setBaseline] = useState(project.production.release)
  const candidates = project.releases.filter(
    (release) => canRelease(project, release) && release.number < (baseline?.number ?? 0)
  )
  const [targetId, setTargetId] = useState(
    version?.id ?? (kind === "promote" ? project.sandbox?.release?.id : candidates[0]?.id) ?? ""
  )
  const target = project.releases.find((release) => release.id === targetId)
  const [result, setResult] = useState<{ key: string; data?: Changes; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<"idle" | "pending" | "accepted">("idle")
  const [error, setError] = useState("")
  const baselineId = baseline?.id
  const requestKey = `${project.id}-${baselineId}-${targetId}-${retry}`
  const loading = result?.key !== requestKey
  const changes = !loading ? result?.data : undefined
  const changesError = !loading ? result?.error : undefined
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const result = await loadChanges(project.id, baselineId, targetId, controller.signal)
        if (!controller.signal.aborted) setResult({ key: requestKey, data: result as Changes })
      } catch (reason) {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            error: reason instanceof Error ? reason.message : "Changes could not be loaded."
          })
      }
    }
    void load()
    return () => controller.abort()
  }, [project.id, targetId, baselineId, requestKey, loadChanges])
  const stale = (project.production.release?.id ?? null) !== (baseline?.id ?? null)
  const staged = target?.id === project.sandbox?.release?.id
  const busy = project.deployments.some(
    (event) => event.environment === "production" && ["rolling-out", "draining"].includes(event.state)
  )
  const eligible =
    canRelease(project, target) &&
    target?.id !== baseline?.id &&
    (kind === "promote" ? staged : candidates.some((release) => release.id === targetId))
  const historyRequired = target?.build.source === "GitHub" && (!baseline || baseline.build.source === "GitHub")
  const blocked =
    !canEdit ||
    !onAction ||
    !eligible ||
    stale ||
    busy ||
    loading ||
    (historyRequired && Boolean(changesError)) ||
    state !== "idle"
  async function submit() {
    if (blocked || !onAction || !target) return
    setState("pending")
    setError("")
    try {
      await onAction({
        kind,
        projectId: project.id,
        values: { versionId: target.id, environment: "production", expectedVersionId: baseline?.id ?? null }
      })
      setState("accepted")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The request could not be confirmed. Check deployment status before retrying."
      )
      setState("idle")
    }
  }
  const records = [
    ...project.releases,
    ...(baseline && !project.releases.some((release) => release.id === baseline.id) ? [baseline] : [])
  ].map((release) => ({
    version: release.id,
    label: releaseLabel(release),
    sha: release.commit,
    time: release.time,
    status: release.status,
    commits: []
  }))
  return (
    <ReleaseDataProvider
      value={{
        repository: project.repository,
        releases: records,
        pullRequests: changes?.pullRequests ?? [],
        issues: changes?.issues ?? [],
        compare: () => changes ?? { commits: [], direction: kind === "rollback" ? "removed" : "added" }
      }}
    >
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open && state !== "pending") onClose()
        }}
      >
        <SheetContent
          showCloseButton={state !== "pending"}
          className="dm-inspector dm-release-inspector"
          onEscapeKeyDown={(event) => {
            if (state === "pending") event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (state === "pending") event.preventDefault()
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-xl tracking-tight">
              {kind === "promote" ? "Promote release" : "Roll back release"}
            </SheetTitle>
            <SheetDescription className="sr-only">Review changes before updating production.</SheetDescription>
            {target && (
              <Button
                variant="link"
                size="xs"
                className="h-auto w-fit p-0"
                disabled={state === "pending"}
                onClick={() => onVersion(target)}
              >
                Open in dashboard
                <ArrowUpRight />
              </Button>
            )}
          </SheetHeader>
          <div className="dm-inspector-body">
            <ReleaseComparison
              current={baseline?.id ?? ""}
              target={targetId}
              staging={project.sandbox?.release?.id ?? null}
              failed={target?.status === "failed"}
              options={candidates.map((release) => release.id)}
              onTargetChange={kind === "rollback" && state === "idle" ? setTargetId : undefined}
            />
            {state === "accepted" ? (
              <output className="text-sm">Deployment request accepted. Follow its progress in Activity.</output>
            ) : (
              <>
                {loading ? (
                  <output className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Loading changes…
                  </output>
                ) : changesError ? (
                  <div className="space-y-3">
                    <Notice>{changesError}</Notice>
                    <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
                      Retry changes
                    </Button>
                  </div>
                ) : (
                  changes && (
                    <>
                      <ReleaseChanges
                        key={`${baseline?.id}-${targetId}`}
                        current={baseline?.id ?? ""}
                        target={targetId}
                      />
                      {!changes.commits.length && (
                        <p className="text-sm text-muted-foreground">No commit changes between these releases.</p>
                      )}
                      {(changes.truncated || changes.linksUnavailable) && (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {changes.truncated ? "Showing a partial changelog. " : ""}
                          {changes.linksUnavailable ? "Some linked pull requests or issues could not be loaded. " : ""}
                          {changes.compareUrl && (
                            <a
                              className="text-primary hover:underline"
                              href={changes.compareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Review on GitHub
                              <ArrowUpRight className="ml-1 inline size-3" />
                            </a>
                          )}
                        </p>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </div>
          <div className="dm-release-actions">
            {state !== "accepted" && (
              <>
                <p className="text-xs leading-5 text-muted-foreground">
                  Updates the release served at the global edge. Stored data is unchanged.
                </p>
                {stale ? (
                  <div className="space-y-2">
                    <Notice>Production changed while you were reviewing.</Notice>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBaseline(project.production.release)
                        setError("")
                      }}
                    >
                      Review current production
                    </Button>
                  </div>
                ) : !canEdit ? (
                  <p className="text-xs text-muted-foreground">View-only access</p>
                ) : busy ? (
                  <p className="text-xs text-muted-foreground">Another deployment is in progress.</p>
                ) : !eligible ? (
                  <Notice>
                    {project.mode === "multiplayer"
                      ? "Multiplayer runtime deployment is not available yet."
                      : kind === "promote"
                        ? "Choose the successful retained release currently in staging."
                        : "Choose an older retained release."}
                  </Notice>
                ) : null}
                {error && <Notice>{error}</Notice>}
              </>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={state === "pending"} onClick={onClose}>
                {state === "accepted" ? "Done" : "Cancel"}
              </Button>
              {state !== "accepted" && (
                <Button
                  className="flex-1"
                  aria-label={kind === "promote" ? "Confirm promotion" : "Confirm rollback"}
                  disabled={blocked}
                  onClick={() => void submit()}
                >
                  {state === "pending" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : kind === "promote" ? (
                    <ArrowUpRight />
                  ) : (
                    <RotateCcw />
                  )}
                  {state === "pending"
                    ? "Submitting…"
                    : kind === "promote"
                      ? "Promote to production"
                      : "Roll back production"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </ReleaseDataProvider>
  )
}
