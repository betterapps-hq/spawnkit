import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  Clock3,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Globe2,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
  Search,
  Sparkles
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { SelectField } from "../select-field"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { CommitLink } from "./commit-link"
import { EnvironmentBadge } from "./environment-badge"
import type { OperationPanel, ProjectModel, PullRequestPreview, Release } from "./model"
import { EmptyState, Notice, StatusBadge } from "./primitives"
import { releaseLabel } from "./release-label"

export type VersionSection = "versions" | "environments" | "previews" | "activity"
export type OpenVersionAction = (kind: OperationPanel, version?: Release, preview?: PullRequestPreview) => void

export function VersionTargets({ project, version }: { project: ProjectModel; version: Release }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {project.production.release?.id === version.id && <EnvironmentBadge environment="production" />}
      {project.sandbox?.release?.id === version.id && <EnvironmentBadge environment="sandbox" />}
      {project.previews
        .filter((preview) => preview.versionId === version.id)
        .map((preview) => (
          <EnvironmentBadge key={preview.id} environment="preview">
            PR #{preview.number}
          </EnvironmentBadge>
        ))}
    </div>
  )
}

function EnvironmentPointer({
  project,
  name,
  onVersion,
  onAction,
  canEdit,
  onConfigureSandbox
}: {
  project: ProjectModel
  name: "production" | "sandbox"
  onVersion: (version: Release) => void
  onAction: OpenVersionAction
  canEdit: boolean
  onConfigureSandbox?: (() => void) | undefined
}) {
  const environment = project[name]
  const production = name === "production"
  const version = environment?.release
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card">
      <div className={cn("h-0.5", production ? "bg-emerald-400" : "bg-violet-400")} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            {production ? (
              <Globe2 className="size-4 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <Sparkles className="size-4 text-primary" />
            )}
            {production ? "Production" : "Sandbox"}
          </span>
          {environment && <StatusBadge status={environment.status} />}
        </div>
        {version ? (
          <>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => onVersion(version)}
                className="font-mono text-xl font-semibold tracking-tight hover:text-primary"
              >
                {releaseLabel(version)}
              </button>
              <CommitLink repository={project.repository} sha={version.commit} />
              <span className="ml-auto text-[11px] text-muted-foreground">{version.time}</span>
            </div>
            <p className="mt-2 truncate text-sm">{version.title}</p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
              <span className="truncate text-[11px] text-muted-foreground">
                {environment.regions.length
                  ? `${environment.regions.length} ${environment.regions.length === 1 ? "region" : "regions"}`
                  : "Global edge"}
                <span className="mx-2 text-border">/</span>
                {production ? "Serving players" : "Ready to validate"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canEdit}
                className="h-7 text-xs"
                onClick={() => onAction(production ? "rollback" : "promote", production ? undefined : version)}
              >
                {production ? "Rollback" : "Promote"}
                {production ? <RotateCcw className="size-3" /> : <ArrowUpRight className="size-3" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">
              {environment ? "No version deployed" : "Staging is not enabled"}
            </p>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              disabled={!canEdit && !(!environment && onConfigureSandbox)}
              onClick={() =>
                !environment && onConfigureSandbox
                  ? onConfigureSandbox()
                  : onAction(environment ? "deploy" : "enable-sandbox")
              }
            >
              {environment ? "Deploy version" : "Enable Sandbox"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function VersionConsole({
  project,
  canEdit,
  onVersion,
  onAction,
  initialSection = "versions",
  selectedEnvironment,
  scoped = false,
  onConfigureHosting
}: {
  project: ProjectModel
  canEdit: boolean
  onVersion: (version: Release) => void
  onAction: OpenVersionAction
  initialSection?: VersionSection
  selectedEnvironment?: string | undefined
  scoped?: boolean
  onConfigureHosting?: ((target: "repository" | "sandbox") => void) | undefined
}) {
  const [section, setSection] = useState(initialSection)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [origin, setOrigin] = useState("all")
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!selectedEnvironment) return
    const target = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-environment]") ?? []).find(
      (element) => element.dataset.environment === selectedEnvironment
    )
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: "nearest" })
  }, [selectedEnvironment, section])
  const filtered = project.releases.filter(
    (version) =>
      (status === "all" || version.status === status) &&
      (origin === "all" || origin === version.environment) &&
      `${releaseLabel(version)} ${version.commit} ${version.title} ${version.branch}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  const activePreviews = project.previews.filter((preview) => preview.state !== "closing")
  if (scoped && selectedEnvironment)
    return (
      <div ref={root} className="space-y-6">
        {selectedEnvironment === "production" || selectedEnvironment === "sandbox" ? (
          <EnvironmentPointer
            project={project}
            name={selectedEnvironment}
            onVersion={onVersion}
            onAction={onAction}
            canEdit={canEdit}
          />
        ) : (
          <PreviewList
            project={{ ...project, previews: project.previews.filter((preview) => preview.id === selectedEnvironment) }}
            onVersion={onVersion}
            onAction={onAction}
            canEdit={canEdit}
            selectedEnvironment={selectedEnvironment}
          />
        )}
      </div>
    )
  return (
    <div ref={root} className="space-y-6">
      {!project.repository && onConfigureHosting && (
        <section
          aria-label="GitHub repository"
          className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-4"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-muted">
            <GitBranch className="size-5" />
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <h2 className="text-sm font-medium">GitHub repository</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {project.configuration?.github.mode !== "none"
                ? "Repository configuration saved. GitHub is not connected."
                : "Build from your repository and create previews for pull requests."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onConfigureHosting("repository")}>
            Configure GitHub
            <ArrowRight className="size-3.5" />
          </Button>
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
        <EnvironmentPointer
          project={project}
          name="production"
          onVersion={onVersion}
          onAction={onAction}
          canEdit={canEdit}
        />
        <EnvironmentPointer
          project={project}
          name="sandbox"
          onVersion={onVersion}
          onAction={onAction}
          canEdit={canEdit}
          onConfigureSandbox={onConfigureHosting ? () => onConfigureHosting("sandbox") : undefined}
        />
        <button
          onClick={() => setSection("previews")}
          className="group flex flex-col items-start justify-between rounded-xl border bg-linear-to-br from-card to-accent/35 p-5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <GitPullRequest className="size-4 text-primary" />
            PR previews
          </span>
          <span className="mt-5 text-3xl font-semibold tracking-tight">
            {activePreviews.length}
            <span className="ml-2 text-xs font-normal text-muted-foreground">open</span>
          </span>
          <span className="mt-5 flex w-full items-center justify-between text-xs text-muted-foreground">
            {project.repository ? "Isolated per pull request" : "Connect GitHub to enable"}
            <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
      <Tabs value={section} onValueChange={(value) => setSection(value as VersionSection)} className="min-w-0 gap-6">
        <div className="min-w-0 overflow-x-auto">
          <TabsList variant="line" className="min-w-full justify-start">
            <TabsTrigger value="versions" className="flex-none px-3">
              Versions{" "}
              <span className="ml-1 rounded bg-muted px-1.5 text-[10px] tabular-nums">{project.releases.length}</span>
            </TabsTrigger>
            <TabsTrigger value="environments" className="flex-none px-3">
              Environments
            </TabsTrigger>
            <TabsTrigger value="previews" className="flex-none px-3">
              PR previews
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-none px-3">
              Activity
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="versions" className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                aria-label="Search versions"
                placeholder="Search version, commit, or branch…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-card pl-9"
              />
            </div>
            <div className="w-40">
              <SelectField
                label="Version origin"
                value={origin}
                onChange={setOrigin}
                options={[
                  { value: "all", label: "All origins" },
                  { value: "production", label: "Production" },
                  { value: "sandbox", label: "Sandbox" },
                  { value: "preview", label: "PR preview" }
                ]}
              />
            </div>
            <div className="w-36">
              <SelectField
                label="Version status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All statuses" },
                  ...(["ready", "building", "failed", "queued"] as const).map((value) => ({
                    value,
                    label: value[0]!.toUpperCase() + value.slice(1)
                  }))
                ]}
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
              <span>{filtered.length} versions</span>
              <span>Newest first</span>
            </div>
            {filtered.map((version) => {
              const current = project.production.release?.id === version.id
              const eligible = version.status === "ready" && version.retained && version.compatible
              return (
                <div
                  key={version.id}
                  className="group flex items-start gap-4 border-b px-5 py-5 transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "mt-1 hidden size-9 shrink-0 place-items-center rounded-lg border sm:grid",
                      current
                        ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <Box className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => onVersion(version)}
                        className="font-mono text-sm font-semibold hover:text-primary"
                      >
                        {releaseLabel(version)}
                      </button>
                      <StatusBadge status={version.status} />
                      <VersionTargets project={project} version={version} />
                    </div>
                    <button
                      onClick={() => onVersion(version)}
                      className="mt-2 block max-w-full truncate text-left text-sm font-medium hover:text-primary"
                    >
                      {version.title}
                    </button>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="size-3" />
                        {version.branch}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono">
                        <GitCommitHorizontal className="size-3" />
                        <CommitLink repository={project.repository} sha={version.commit} />
                      </span>
                      <span>{version.actor}</span>
                      <span>{version.time}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-right text-[11px] text-muted-foreground xl:block">
                      <span className="block">{version.duration}</span>
                      <span className="mt-2 block">
                        {!version.retained
                          ? "Artifact unavailable"
                          : !version.compatible
                            ? "Schema incompatible"
                            : (version.build.artifact?.size ?? "Building")}
                      </span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${releaseLabel(version)}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onVersion(version)}>
                          Inspect version
                          <ArrowUpRight />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onAction("promote", version)}
                          disabled={!canEdit || !eligible || current}
                        >
                          Promote to production
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => onAction("stage-version", version)}
                          disabled={
                            !canEdit || !eligible || !project.sandbox || project.sandbox.release?.id === version.id
                          }
                        >
                          Deploy to Sandbox
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onAction("rollback", version)}
                          disabled={
                            !canEdit ||
                            !eligible ||
                            !project.production.release ||
                            version.number >= project.production.release.number
                          }
                        >
                          Roll back to this version
                          <RotateCcw />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
            {!filtered.length && (
              <EmptyState
                icon={<Box />}
                title={project.releases.length ? "No matching versions" : "No versions yet"}
                description={
                  project.releases.length
                    ? "Try another search or filter."
                    : "Build your source to create the first immutable game version."
                }
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="previews" className="space-y-5">
          <PreviewList
            project={project}
            onVersion={onVersion}
            onAction={onAction}
            canEdit={canEdit}
            selectedEnvironment={selectedEnvironment}
          />
        </TabsContent>
        <TabsContent value="environments" className="space-y-5">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Environment configuration</h2>
            </div>
            {[project.production, project.sandbox]
              .filter((environment) => environment !== null)
              .map((environment) => (
                <div
                  key={environment.name}
                  data-environment={environment.name}
                  tabIndex={-1}
                  className={cn(
                    "grid gap-5 border-b p-5 outline-none last:border-b-0 md:grid-cols-[160px_1fr_1fr]",
                    selectedEnvironment === environment.name && "bg-accent/35"
                  )}
                >
                  <div>
                    <p className="mb-3 text-sm font-semibold capitalize">{environment.name}</p>
                    <StatusBadge status={environment.status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Domain</p>
                    <p className="mt-2 break-all font-mono text-xs">{environment.url}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {environment.regions.map((region) => region.city).join(", ") || "Global static hosting"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Configuration</p>
                    <p className="mt-2 text-sm">
                      {environment.name === "production" ? "Live player traffic" : "One shared staging environment"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Isolated secrets and persistent data</p>
                  </div>
                </div>
              ))}
            <button
              onClick={() => setSection("previews")}
              className="flex w-full items-center gap-3 bg-muted/20 p-5 text-left"
            >
              <GitPullRequest className="size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Pull request previews</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Temporary environments linked to open pull requests
                </p>
              </div>
              <ChevronRight className="ml-auto size-4" />
            </button>
          </div>
        </TabsContent>
        <TabsContent value="activity" className="space-y-5">
          <DeploymentActivity project={project} onVersion={onVersion} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PreviewList({
  project,
  onVersion,
  onAction,
  canEdit,
  selectedEnvironment
}: {
  project: ProjectModel
  onVersion: (version: Release) => void
  onAction: OpenVersionAction
  canEdit: boolean
  selectedEnvironment?: string | undefined
}) {
  if (!project.repository)
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<GitPullRequest />}
          title="Connect GitHub to create PR previews"
          description="Each open pull request gets an isolated environment and its own shareable URL."
        />
      </div>
    )
  if (!project.previewsEnabled)
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<GitPullRequest />}
          title="Test changes before they merge"
          description="Automatically build new commits and update a preview for each open pull request."
          action={
            <Button disabled={!canEdit} onClick={() => onAction("enable-previews")}>
              Enable PR previews
            </Button>
          }
        />
      </div>
    )
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <GitBranch className="size-4 text-muted-foreground" />
          {project.repository}
          <Badge variant="outline" className="text-[10px]">
            Automatic previews
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">Pricing pending</span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {project.previews.map((preview) => {
          const version = project.releases.find((item) => item.id === preview.versionId)
          return (
            <article
              key={preview.id}
              data-environment={preview.id}
              tabIndex={-1}
              className={cn(
                "border-b p-5 outline-none last:border-b-0",
                selectedEnvironment === preview.id && "bg-accent/35"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  <GitPullRequest className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{preview.number}</span>
                    <h2 className="text-sm font-semibold">{preview.title}</h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        preview.state === "ready" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                      )}
                    >
                      {preview.state.replace("-", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{preview.branch}</span>
                    <CommitLink repository={project.repository} sha={preview.commit} />
                    <span>{preview.actor}</span>
                    <span>{preview.updated}</span>
                  </p>
                  <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{preview.url}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Preview ${preview.number} actions`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!canEdit} onSelect={() => onAction("retry-preview", version, preview)}>
                      Rebuild latest commit
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canEdit} onSelect={() => onAction("close-preview", version, preview)}>
                      Close preview environment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pl-11">
                <p className="text-[11px] text-muted-foreground">{preview.isolation}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!version}
                    onClick={() => {
                      if (version) onVersion(version)
                    }}
                  >
                    Inspect {releaseLabel(version)}
                  </Button>
                  {preview.state === "ready" && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`https://${preview.url}`} target="_blank" rel="noreferrer">
                        Visit preview
                        <ArrowUpRight />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !canEdit ||
                      preview.state !== "ready" ||
                      !version?.compatible ||
                      !version.retained ||
                      !project.sandbox
                    }
                    onClick={() => onAction("stage-version", version, preview)}
                  >
                    To Sandbox
                    <ArrowRight />
                  </Button>
                </div>
              </div>
              {preview.state === "outdated" && (
                <div className="mt-4">
                  <Notice tone="info">
                    A newer commit is waiting to build. This preview still serves the last successful version.
                  </Notice>
                </div>
              )}
              {preview.state === "cleanup-failed" && (
                <div className="mt-4">
                  <Notice>Cleanup failed. Resources may still be running. Retry closure from the preview menu.</Notice>
                </div>
              )}
            </article>
          )
        })}
        {!project.previews.length && (
          <EmptyState
            icon={<GitPullRequest />}
            title="No open pull requests"
            description="Open a pull request in your connected repository to create a preview."
          />
        )}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Previews use isolated data and secrets. Closing or merging a pull request retires its preview; retained versions
        remain available in version history.
      </p>
    </div>
  )
}

export function DeploymentActivity({
  project,
  onVersion
}: {
  project: ProjectModel
  onVersion: (version: Release) => void
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4 text-sm font-semibold">Deployment activity</div>
      {project.deployments.map((event) => {
        const version = project.releases.find((item) => item.id === event.versionId)
        return (
          <div key={event.id} className="flex gap-4 border-b p-5 last:border-b-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted/30">
              {event.kind === "rollback" ? <RotateCcw className="size-3.5" /> : <PackageCheck className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{event.actor}</span>{" "}
                {event.kind === "promote" ? "promoted" : event.kind === "rollback" ? "rolled back to" : "deployed"}{" "}
                <button
                  className="font-mono font-semibold text-primary"
                  onClick={() => {
                    if (version) onVersion(version)
                  }}
                >
                  {releaseLabel(version)}
                </button>{" "}
                to <span className="capitalize">{event.environment}</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {event.time}
                <span className="mx-2">/</span>
                {event.id}
              </p>
              {event.regions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.regions.map((region) => (
                    <span
                      key={region.name}
                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]"
                    >
                      {region.state === "ready" ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <Clock3 className="size-3 text-amber-600 dark:text-amber-300" />
                      )}
                      {region.name}
                      <span className="text-muted-foreground">{region.state}</span>
                      {region.state === "draining" && <span>{region.players} players</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Badge variant="outline" className="h-fit capitalize">
              {event.state.replace("-", " ")}
            </Badge>
          </div>
        )
      })}
      {!project.deployments.length && (
        <EmptyState
          icon={<Clock3 />}
          title="No deployment activity"
          description="Environment changes will appear here, with the version and person who made them."
        />
      )}
    </div>
  )
}
