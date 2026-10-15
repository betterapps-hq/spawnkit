import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  ChevronRight,
  ExternalLink,
  GitPullRequest,
  Plus,
  RotateCcw,
  Settings2,
  Trash2
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { Tabs, TabsContent } from "../../ui/tabs"
import { CommitLink } from "../commit-link"
import { EnvironmentBadge } from "../environment-badge"
import type { DeploymentView, ProjectModel, Release, StudioLocation } from "../model"
import { EmptyState, Notice, StatusBadge } from "../primitives"
import { releaseLabel } from "../release-label"
import { VersionConsole, DeploymentActivity, type OpenVersionAction } from "../version-console"
import type { DeploymentConfiguration, ResourceSettings } from "./configuration"
import { EnvironmentGraph, type MapEnvironment } from "./environment-graph"
import { Infrastructure } from "./infrastructure"
import { DeploymentViewTabs } from "./view-tabs"

export function canRelease(project: ProjectModel, release: Release | null | undefined) {
  return (
    project.connected !== false &&
    project.mode === "single" &&
    release?.status === "ready" &&
    release.retained &&
    release.compatible &&
    Boolean(release.build.artifact)
  )
}

export function ProjectDeployments({
  project,
  canEdit,
  environmentId,
  view = "environments",
  onNavigate,
  onAction,
  onConfigureHosting
}: {
  project: ProjectModel
  canEdit: boolean
  environmentId?: string | undefined
  view?: DeploymentView | undefined
  onNavigate: (location: StudioLocation) => void
  onAction: OpenVersionAction
  onConfigureHosting?: ((target: "repository" | "sandbox") => void) | undefined
}) {
  const [selected, setSelected] = useState<{ id: string; resource?: string | undefined } | null>(null)
  const [managing, setManaging] = useState(false)
  const openRelease = (release: Release) =>
    onNavigate({ page: "deployments", projectId: project.id, versionId: release.id })
  const openEnvironment = (id: string) =>
    onNavigate({ page: "deployments", projectId: project.id, environmentId: id === "staging" ? "sandbox" : id })
  const busy = project.deployments.some(
    (event) => event.environment === "production" && ["rolling-out", "draining"].includes(event.state)
  )
  const staging = project.sandbox?.release
  const production = project.production.release
  const rollback = project.releases.find(
    (release) => release.number < (production?.number ?? 0) && canRelease(project, release)
  )
  const promote = canEdit && !busy && canRelease(project, staging) && staging?.id !== production?.id
  const configuration: DeploymentConfiguration = {
    servers: project.mode === "multiplayer",
    api: false,
    database: project.database === "none" ? null : "managed",
    assets: true
  }
  const regionsFor = (id: string) =>
    id === "production" ? project.production.regions : id === "staging" ? (project.sandbox?.regions ?? []) : []
  const settingsFor = (environment: MapEnvironment): ResourceSettings => ({
    regions: Object.fromEntries(regionsFor(environment.id).map((region) => [region.city, 1])),
    size: "Configured per region",
    database: project.database === "postgresql" ? "PostgreSQL" : "SQLite"
  })
  const baseEnvironments: MapEnvironment[] = [
    ...project.previews.map((preview): MapEnvironment => ({
      id: preview.environmentId ?? preview.id,
      kind: "preview",
      name: `PR #${preview.number}`,
      branch: preview.branch,
      release: releaseLabel(
        project.releases.find(
          (release) => release.id === (preview.currentVersionId ?? (preview.state === "ready" ? preview.versionId : ""))
        )
      ),
      status:
        preview.state === "ready"
          ? "Ready"
          : ["failed", "cleanup-failed"].includes(preview.state)
            ? "Failed"
            : "Building",
      regions: 0,
      servers: 0,
      summary: "Global edge",
      health: preview.currentVersionId || preview.state === "ready" ? "Ready" : "Empty",
      updateLabel: {
        ready: "",
        building: "Building",
        failed: "Update failed",
        outdated: "Outdated",
        closing: "Deleting",
        "cleanup-failed": "Cleanup failed"
      }[preview.state]
    })),
    ...(project.sandbox
      ? [
          {
            id: "staging",
            kind: "staging" as const,
            name: "Staging",
            branch: staging?.branch || "—",
            release: releaseLabel(staging),
            status: (staging ? "Ready" : "Empty") as MapEnvironment["status"],
            servers: 0,
            regions: project.sandbox.regions.length
          }
        ]
      : []),
    {
      id: "production",
      kind: "production",
      name: "Production",
      branch: production?.branch || project.productionBranch || "main",
      release: releaseLabel(production),
      status: production ? "Ready" : "Empty",
      regions: project.production.regions.length,
      servers: 0
    }
  ]
  const environments = baseEnvironments.map((environment): MapEnvironment => {
    const hasRelease = environment.release !== "—"
    const event = project.deployments.find(
      (item) => item.environment === (environment.id === "staging" ? "sandbox" : environment.id)
    )
    const health = project[environment.id === "production" ? "production" : "sandbox"]?.status
    return {
      ...environment,
      health:
        environment.health ??
        (health === "paused" ? "Paused" : health === "degraded" ? "Degraded" : hasRelease ? "Ready" : "Empty"),
      status: event?.state === "failed" ? "Failed" : event?.state === "rolling-out" ? "Building" : environment.status,
      summary:
        environment.summary ??
        (configuration.servers
          ? `${environment.regions} regions configured`
          : hasRelease
            ? "Global edge"
            : "No deployment"),
      infrastructure: (
        <Infrastructure
          settings={settingsFor(environment)}
          configuration={configuration}
          details={{
            client: hasRelease ? "Release deployed" : "No release",
            servers: "Not provisioned",
            database: "Not provisioned",
            assets: hasRelease ? "Release artifacts" : "No artifacts"
          }}
          onOpen={(resource) => setSelected({ id: environment.id, resource })}
        />
      )
    }
  })
  const inspected = environments.find((environment) => environment.id === selected?.id)
  const preview = project.previews.find((item) => (item.environmentId ?? item.id) === selected?.id)
  const inspectedRelease =
    inspected?.id === "production"
      ? production
      : inspected?.id === "staging"
        ? staging
        : project.releases.find((release) => release.id === (preview?.currentVersionId ?? preview?.versionId))
  const hostname = preview?.url ?? (inspected?.id === "production" ? project.production.url : project.sandbox?.url)
  const requestAction: OpenVersionAction = (kind, release, pull) => {
    setSelected(null)
    onAction(kind, release, pull)
  }
  const reviewRelease = (release: Release) => {
    setManaging(false)
    if (release.id !== production?.id && release.id === staging?.id && canRelease(project, release))
      onAction("promote", release)
    else if (release.number < (production?.number ?? 0) && canRelease(project, release)) onAction("rollback", release)
    else openRelease(release)
  }
  const releaseList = (
    <Card className="gap-0 overflow-hidden p-0">
      {project.releases.length ? (
        project.releases.map((release) => (
          <div key={release.id} className="dm-live-release-row">
            <Box className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <Button variant="link" className="h-auto p-0 text-foreground" onClick={() => reviewRelease(release)}>
                {releaseLabel(release)}
              </Button>
              <p className="truncate text-xs text-muted-foreground">{release.branch}</p>
              <CommitLink repository={project.repository} sha={release.commit} />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {release.id === production?.id && <EnvironmentBadge environment="production" />}
              {release.id === staging?.id && <EnvironmentBadge environment="staging" />}
              {project.previews.some(
                (item) => (item.currentVersionId ?? (item.state === "ready" ? item.versionId : null)) === release.id
              ) && <EnvironmentBadge environment="preview" />}
              {release.status !== "ready" && <StatusBadge status={release.status} />}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Open ${releaseLabel(release)}`}
              onClick={() => reviewRelease(release)}
            >
              <ChevronRight />
            </Button>
          </div>
        ))
      ) : (
        <EmptyState
          icon={<Box />}
          title="No releases yet"
          description="Deploy from your connected repository or upload a build with the CLI."
        />
      )}
    </Card>
  )
  const environmentExists =
    environmentId === "production" ||
    (environmentId === "sandbox" && project.sandbox) ||
    project.previews.some((item) => (item.environmentId ?? item.id) === environmentId)
  if (environmentId)
    return (
      <div className="dm-dashboard">
        <Button
          variant="ghost"
          className="mb-5 -ml-3"
          onClick={() => onNavigate({ page: "deployments", projectId: project.id })}
        >
          <ArrowLeft />
          Deployment map
        </Button>
        {environmentExists ? (
          <VersionConsole
            key={environmentId}
            scoped
            project={project}
            canEdit={canEdit && project.mode === "single"}
            onVersion={openRelease}
            onAction={onAction}
            initialSection={environmentId === "production" || environmentId === "sandbox" ? "environments" : "previews"}
            selectedEnvironment={
              project.previews.find((item) => item.environmentId === environmentId)?.id ?? environmentId
            }
          />
        ) : (
          <Notice>This environment is no longer available.</Notice>
        )}
      </div>
    )
  return (
    <section className="deployment-map">
      <div className="dm-heading">
        <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canEdit || busy || !rollback}
            onClick={() => onAction("rollback", rollback)}
          >
            <RotateCcw />
            Rollback
          </Button>
          {staging && staging.id !== production?.id ? (
            <Button size="sm" disabled={!promote} onClick={() => onAction("promote", staging)}>
              <ArrowUpRight />
              Promote
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={
                !canEdit || busy || project.mode !== "single" || !project.repository || !project.capabilities?.builds
              }
              onClick={() => onAction("deploy")}
            >
              <Plus />
              Deploy
            </Button>
          )}
        </div>
      </div>
      {project.connected === false && <Notice>Connect this project to load deployment status.</Notice>}
      {!project.repository && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm">
          <span>Connect a repository to build releases and PR previews.</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canEdit && !onConfigureHosting}
            onClick={() =>
              onConfigureHosting
                ? onConfigureHosting("repository")
                : onNavigate({ page: "settings", projectId: project.id })
            }
          >
            Configure GitHub
            <ArrowUpRight />
          </Button>
        </div>
      )}
      {!project.sandbox && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          disabled={!canEdit && !onConfigureHosting}
          onClick={() => (onConfigureHosting ? onConfigureHosting("sandbox") : onAction("enable-sandbox"))}
        >
          <Plus />
          Enable Staging
        </Button>
      )}
      {project.capabilities && !project.capabilities.builds && (
        <p className="mb-4 text-xs text-muted-foreground">
          Hosted builds are not enabled. Retained releases remain available for promotion and rollback.
        </p>
      )}
      {busy && <output className="mb-4 block text-sm text-muted-foreground">Deployment in progress</output>}
      <Tabs
        className="gap-3"
        value={view}
        onValueChange={(value) =>
          onNavigate({ page: "deployments", projectId: project.id, deploymentView: value as DeploymentView })
        }
      >
        <DeploymentViewTabs activity />
        <TabsContent value="environments">
          <EnvironmentGraph
            environments={environments}
            configuration={configuration}
            settingsFor={settingsFor}
            onOpen={(id, resource) => setSelected({ id, resource })}
            onManage={() => setManaging(true)}
            blocked={!staging || staging.status !== "ready"}
            active={busy}
          />
          {!project.previews.length && (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {project.previewsEnabled
                  ? "Each eligible pull request gets its own preview environment."
                  : "PR previews are off."}
              </span>
              {!project.previewsEnabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canEdit || !project.repository}
                  onClick={() => onAction("enable-previews")}
                >
                  <GitPullRequest />
                  Enable previews
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="releases">{releaseList}</TabsContent>
        <TabsContent value="activity">
          <DeploymentActivity project={project} onVersion={openRelease} />
        </TabsContent>
      </Tabs>
      <Sheet open={managing} onOpenChange={setManaging}>
        <SheetContent className="dm-inspector overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Production releases</SheetTitle>
            <SheetDescription>Choose a release to review its changes.</SheetDescription>
          </SheetHeader>
          <div className="dm-inspector-body">{releaseList}</div>
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(inspected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="dm-inspector overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.resource ?? inspected?.name}</SheetTitle>
            <SheetDescription>{selected?.resource ? inspected?.name : inspected?.branch}</SheetDescription>
          </SheetHeader>
          {inspected && (
            <div className="dm-inspector-body">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(null)
                    openEnvironment(inspected.id)
                  }}
                >
                  Open in dashboard
                  <ArrowUpRight />
                </Button>
                {hostname && inspectedRelease?.status === "ready" && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={`https://${hostname}`} target="_blank" rel="noopener noreferrer">
                      Visit
                      <ExternalLink />
                    </a>
                  </Button>
                )}
              </div>
              {inspectedRelease && (
                <Card className="gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <EnvironmentBadge environment={inspected.kind} />
                    <StatusBadge status={inspectedRelease.status} />
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-between px-0"
                    onClick={() => {
                      setSelected(null)
                      openRelease(inspectedRelease)
                    }}
                  >
                    {releaseLabel(inspectedRelease)}
                    <ChevronRight />
                  </Button>
                  <CommitLink repository={project.repository} sha={inspectedRelease.commit} />
                </Card>
              )}
              {selected?.resource === "Game servers" ? (
                <>
                  <Notice>
                    Game-server provisioning is not available yet. These are your saved resource settings.
                  </Notice>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled>
                      Scale up
                    </Button>
                    <Button variant="outline" disabled>
                      Scale out
                    </Button>
                  </div>
                  <div className="divide-y rounded-lg border">
                    {regionsFor(inspected.id).map((region) => (
                      <div key={region.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                        <span>{region.city}</span>
                        <span className="text-muted-foreground">
                          {region.cores} vCPU · {region.ram} GB
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => onNavigate({ page: "configure", projectId: project.id })}>
                    <Settings2 />
                    Edit configuration
                  </Button>
                </>
              ) : selected?.resource === "Database" ? (
                <Notice>
                  {project.database === "postgresql" ? "PostgreSQL" : "SQLite"} is configured. A managed database has
                  not been provisioned.
                </Notice>
              ) : selected?.resource === "Asset storage" ? (
                <Notice>Static assets are stored with each retained release. Storage usage is not reported yet.</Notice>
              ) : (
                <>
                  {inspected.infrastructure}
                  {!inspectedRelease && <p className="text-sm text-muted-foreground">No release deployed.</p>}
                  {inspected.id === "staging" && staging && (
                    <Button disabled={!promote} onClick={() => requestAction("promote", staging)}>
                      Promote to production
                      <ArrowUpRight />
                    </Button>
                  )}
                  {inspected.id === "production" && rollback && (
                    <Button
                      variant="outline"
                      disabled={!canEdit || busy}
                      onClick={() => requestAction("rollback", rollback)}
                    >
                      <RotateCcw />
                      Rollback
                    </Button>
                  )}
                  {preview && (
                    <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEdit || !project.capabilities?.builds || preview.state === "building"}
                        onClick={() => requestAction("retry-preview", undefined, preview)}
                      >
                        Rebuild
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={!canEdit}
                        onClick={() => requestAction("close-preview", undefined, preview)}
                      >
                        <Trash2 />
                        Delete preview
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
