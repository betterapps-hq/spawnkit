import { ArrowRight, ArrowUpRight, Box, Check, ChevronRight, RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet"
import { Tabs, TabsContent } from "../../ui/tabs"
import { configurations, initialResources, type DeploymentPreset, type ResourceSettings } from "./configuration"
import "./map.css"
import { DashboardDestination } from "./dashboard-destination"
import { dashboardProject } from "./dashboard-project"
import { EnvironmentGraph, Status, type MapEnvironment } from "./environment-graph"
import { compareReleases, releases, pullRequests, issues } from "./release-data"
import { ReleaseDataProvider } from "./release-records"
import { ReleaseChanges, ReleaseComparison, ReleaseIdentity, ReleasePlacements } from "./release-view"
import { ResourcePanel } from "./resource-panel"
import { DeploymentViewTabs } from "./view-tabs"

const previews: MapEnvironment[] = [
  {
    id: "pr-142",
    name: "PR #142",
    branch: "feat/ranked-queues",
    release: "a5c92e1",
    status: "Ready",
    kind: "preview",
    servers: 1,
    regions: 1
  },
  {
    id: "pr-145",
    name: "PR #145",
    branch: "fix/reconnect",
    release: "b1120df",
    candidate: "d42b70a",
    status: "Building",
    kind: "preview",
    servers: 1,
    regions: 1
  },
  {
    id: "pr-148",
    name: "PR #148",
    branch: "feat/lobby",
    release: "7bf428c",
    candidate: "f19a286",
    status: "Failed",
    kind: "preview",
    servers: 1,
    regions: 1
  }
]
export function DeploymentMap(props: ComponentProps<typeof MockDeploymentMap>) {
  return (
    <ReleaseDataProvider
      value={{ repository: "studio/thornwatch", releases, pullRequests, issues, compare: compareReleases }}
    >
      <MockDeploymentMap {...props} />
    </ReleaseDataProvider>
  )
}
function MockDeploymentMap({
  initialView = "Environments",
  scenario = "healthy",
  canEdit = true,
  previewCount = 3,
  preset = "multiplayer"
}: {
  initialView?: string
  scenario?: "healthy" | "failed"
  canEdit?: boolean
  previewCount?: number
  preset?: DeploymentPreset
}) {
  const configuration = configurations[preset]
  const returnFocus = useRef<HTMLElement | null>(null)
  const mapHeading = useRef<HTMLHeadingElement>(null)
  const activityFocus = useRef<HTMLOutputElement | null>(null)
  const restoreFocus = () => {
    const opener = returnFocus.current
    if (opener?.isConnected && !opener.matches(":disabled")) opener.focus()
    else (document.querySelector<HTMLElement>(".dm-dashboard h1") ?? activityFocus.current)?.focus()
  }
  const [editingResource, setEditingResource] = useState(false)
  const [resourceToInspect, setResourceToInspect] = useState<string | null>(null)
  const [resources, setResources] = useState<Record<string, ResourceSettings>>({})
  const [deletedPreviews, setDeletedPreviews] = useState<string[]>([])
  const [deletingPreview, setDeletingPreview] = useState(false)
  const deleteCancel = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (deletingPreview) deleteCancel.current?.focus()
  }, [deletingPreview])
  const [previewHistory, setPreviewHistory] = useState<MapEnvironment[]>([])
  const previewCatalog = [
    ...previews,
    ...Array.from({ length: Math.max(0, previewCount - 3) }, (_, i): MapEnvironment => ({
      id: `pr-${150 + i}`,
      name: `PR #${150 + i}`,
      branch: `feat/arena-${i + 1}`,
      release: `a02f${String(i).padStart(3, "0")}`,
      status: "Ready",
      kind: "preview",
      servers: 1,
      regions: 1
    }))
  ].slice(0, previewCount)
  const allPreviews = previewCatalog.filter((preview) => !deletedPreviews.includes(preview.id))
  const [production, setProduction] = useState("v1.7.2")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null)
  const [managingRelease, setManagingRelease] = useState(false)
  const [scope, setScope] = useState(() => window.location.hash)
  useEffect(() => {
    const updateScope = () => {
      setScope(window.location.hash)
      setSelectedId(null)
      setSelectedRelease(null)
      setManagingRelease(false)
      setDeletingPreview(false)
    }
    window.addEventListener("hashchange", updateScope)
    return () => window.removeEventListener("hashchange", updateScope)
  }, [])
  const [activity, setActivity] = useState("")
  const [failed, setFailed] = useState(scenario === "failed")
  const [previewUpdates, setPreviewUpdates] = useState<Record<string, MapEnvironment["status"]>>({})
  const [draining, setDraining] = useState(false)
  const [pendingResources, setPendingResources] = useState<{
    id: string
    name: string
    settings: ResourceSettings
  } | null>(null)
  const busy = draining || pendingResources !== null
  const finishResourceDrain = () => {
    if (!pendingResources) return
    setResources((r) => ({ ...r, [pendingResources.id]: pendingResources.settings }))
    setActivity(`${pendingResources.name} resources updated`)
    setPendingResources(null)
  }
  const environments: MapEnvironment[] = [
    ...allPreviews.map((p) => ({
      ...p,
      status: previewUpdates[p.id] ?? p.status,
      release: previewUpdates[p.id] === "Ready" ? (p.candidate ?? p.release) : p.release
    })),
    {
      id: "staging",
      name: "Staging",
      branch: "main",
      release: failed ? "v1.7.2" : "v1.8.0",
      candidate: "v1.8.0",
      status: failed ? "Failed" : "Ready",
      kind: "staging",
      servers: 1,
      regions: 1
    },
    {
      id: "production",
      name: "Production",
      branch: "main",
      release: production,
      status: "Ready",
      kind: "production",
      servers: 6,
      regions: 3
    }
  ]
  for (const env of environments) {
    const config = resources[env.id] ?? initialResources(env.kind === "production", preset)
    env.servers = Object.values(config.regions).reduce((sum, count) => sum + count, 0)
    env.regions = Object.keys(config.regions).length
  }
  const selected = environments.find((e) => e.id === selectedId)
  const openEnvironment = (id: string, resource: string | null = null) => {
    setDeletingPreview(false)
    setResourceToInspect(resource)
    setEditingResource(Boolean(resource))
    setSelectedId(id)
  }
  const review = selectedRelease ? compareReleases(production, selectedRelease) : null
  const action = review?.direction === "added" ? "promote" : review?.direction === "removed" ? "rollback" : null
  const openReview = (version: string) => {
    setSelectedId(null)
    setManagingRelease(false)
    setSelectedRelease(version)
  }
  const openRollback = () => {
    const index = releases.findIndex((r) => r.version === production)
    openReview(releases[index + 1]?.version ?? production)
  }
  const dashboardOpen = scope.startsWith("#environment/") || scope.startsWith("#release/")
  useEffect(() => {
    if (!dashboardOpen) mapHeading.current?.focus()
  }, [scope, dashboardOpen])
  const deletePreview = () => {
    if (!selected || selected.kind !== "preview" || !canEdit || busy) return
    const id = selected.id
    setDeletedPreviews((ids) => [...ids, id])
    setActivity(`${selected.name} preview deleted`)
    setSelectedId(null)
    setDeletingPreview(false)
    setEditingResource(false)
    returnFocus.current = null
  }
  return (
    <section
      className="deployment-map"
      onFocusCapture={(e) => {
        if (!selectedId && !selectedRelease && !managingRelease) returnFocus.current = e.target as HTMLElement
      }}
    >
      {dashboardOpen ? (
        <DashboardDestination
          scope={scope}
          project={dashboardProject(
            environments,
            resources,
            preset,
            failed,
            [...previewCatalog, ...previewHistory],
            draining
          )}
          canEdit={canEdit && !busy}
          onReview={openReview}
        />
      ) : (
        <>
          <div className="dm-heading">
            <div className="flex items-center gap-3">
              <h1 ref={mapHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                Deployments
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canEdit || busy || production === releases.at(-1)?.version}
                onClick={openRollback}
              >
                <RotateCcw />
                Rollback
              </Button>
              <Button
                size="sm"
                disabled={!canEdit || busy || failed || production === "v1.8.0"}
                onClick={() => openReview("v1.8.0")}
              >
                <ArrowUpRight />
                Promote
              </Button>
            </div>
          </div>
          {failed && <p className="mb-3 text-xs text-destructive">Staging checks failed</p>}
          <Tabs className="gap-3" defaultValue={initialView === "Releases" ? "releases" : "environments"}>
            <DeploymentViewTabs />
            <TabsContent value="environments">
              <EnvironmentGraph
                environments={environments}
                configuration={configuration}
                settingsFor={(environment) =>
                  resources[environment.id] ?? initialResources(environment.kind === "production", preset)
                }
                onOpen={openEnvironment}
                onManage={() => setManagingRelease(true)}
                blocked={failed}
                active={draining}
              />
            </TabsContent>
            <TabsContent value="releases">
              <Card className="gap-0 overflow-hidden p-0">
                {releases.map((r) => (
                  <Button
                    key={r.version}
                    variant="ghost"
                    className="dm-release-row"
                    onClick={() => openReview(r.version)}
                  >
                    <Box className="text-muted-foreground" />
                    <ReleaseIdentity version={r.version} />
                    <ReleasePlacements version={r.version} production={production} failed={failed} />
                    <span className="dm-release-time">{r.time}</span>
                    <ChevronRight />
                  </Button>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
      {activity && (
        <output className="dm-activity" ref={activityFocus} tabIndex={-1}>
          <Check size={14} />
          <span>{activity}</span>
          {pendingResources && (
            <Button size="xs" variant="ghost" onClick={finishResourceDrain}>
              Finish drain
            </Button>
          )}
          {draining && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setDraining(false)
                setActivity(`${production} rollout complete`)
              }}
            >
              Finish drain
            </Button>
          )}
        </output>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            setEditingResource(false)
            setDeletingPreview(false)
          }
        }}
      >
        <SheetContent
          className="dm-inspector overflow-y-auto"
          onCloseAutoFocus={(e) => {
            if (!selectedRelease) {
              e.preventDefault()
              restoreFocus()
            }
          }}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {deletingPreview ? `Delete ${selected?.name}?` : selected?.name}
              {selected && !deletingPreview && <Status status="Ready" />}
            </SheetTitle>
            <SheetDescription>
              {selected?.branch} · {selected?.release}
            </SheetDescription>
          </SheetHeader>
          {selected && deletingPreview ? (
            <div className="dm-inspector-body">
              <p className="text-sm leading-6 text-muted-foreground">
                This removes the preview and all of its resources. The GitHub pull request stays open.
              </p>
              <Card className="gap-2 p-4 text-sm">
                <strong className="font-medium">{selected.name}</strong>
                <span className="text-muted-foreground">{selected.branch}</span>
                {configuration.servers && (
                  <span className="text-xs text-muted-foreground">
                    {selected.servers} {selected.servers === 1 ? "instance" : "instances"} · {selected.regions}{" "}
                    {selected.regions === 1 ? "region" : "regions"}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {[
                    "Game client",
                    configuration.api && "API",
                    configuration.database && "database",
                    configuration.assets && "assets"
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Card>
              <div className="mt-2 flex gap-2">
                <Button
                  ref={deleteCancel}
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDeletingPreview(false)
                    requestAnimationFrame(() => deleteTrigger.current?.focus())
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" disabled={!canEdit || busy} onClick={deletePreview}>
                  Delete preview
                </Button>
              </div>
            </div>
          ) : (
            selected && (
              <div className="dm-inspector-body">
                {!editingResource && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`#environment/${selected.id}`} onClick={() => setSelectedId(null)}>
                      Open in dashboard
                      <ArrowUpRight />
                    </a>
                  </Button>
                )}
                {selected.status !== "Ready" && (
                  <Card className="gap-3 p-4">
                    <div className="text-sm font-medium">
                      {selected.status === "Building" ? "Building update…" : "Update failed"}
                      <code className="mt-1 block text-xs font-normal text-muted-foreground">{selected.candidate}</code>
                    </div>
                    {selected.status === "Failed" && (
                      <code className="text-xs text-destructive">matchmaking.reconnect.test.ts</code>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || busy}
                      onClick={() => {
                        if (selected.kind === "staging") setFailed(false)
                        else {
                          setPreviewUpdates((p) => ({ ...p, [selected.id]: "Ready" }))
                          setPreviewHistory((history) => [
                            ...history,
                            { ...selected, release: selected.candidate ?? selected.release, status: "Ready" }
                          ])
                        }
                        setActivity(`${selected.name} build passed`)
                      }}
                    >
                      {selected.status === "Building" ? "Complete build" : "Retry build"}
                    </Button>
                  </Card>
                )}
                {pendingResources?.id === selected.id && (
                  <Card className="gap-3 p-4">
                    <p className="text-sm">Draining rooms before resizing</p>
                    <Button variant="outline" size="sm" onClick={finishResourceDrain}>
                      Finish drain
                    </Button>
                  </Card>
                )}
                <ResourcePanel
                  key={`${selected.id}-${resourceToInspect}`}
                  initialResource={resourceToInspect}
                  environment={selected.name}
                  onEditingChange={setEditingResource}
                  release={selected.release}
                  settings={resources[selected.id] ?? initialResources(selected.kind === "production", preset)}
                  configuration={configuration}
                  canEdit={canEdit && !busy}
                  onSave={(settings) => {
                    const previous = resources[selected.id] ?? initialResources(selected.kind === "production", preset)
                    const needsDrain =
                      previous.size !== settings.size ||
                      Object.entries(previous.regions).some(([city, count]) => (settings.regions[city] ?? 0) < count)
                    if (needsDrain) {
                      setPendingResources({ id: selected.id, name: selected.name, settings })
                      setActivity(`${selected.name} scaling · draining rooms`)
                    } else {
                      setResources((r) => ({ ...r, [selected.id]: settings }))
                      setActivity(`${selected.name} resources updated`)
                    }
                  }}
                />
                {selected.kind === "preview" && !editingResource && (
                  <div className="mt-2 flex items-center justify-between gap-3 border-t pt-4">
                    <span className="text-xs text-muted-foreground">Auto-deletes when the PR closes</span>
                    <Button
                      ref={deleteTrigger}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={!canEdit || busy}
                      onClick={() => setDeletingPreview(true)}
                    >
                      <Trash2 />
                      Delete preview
                    </Button>
                  </div>
                )}
                {selected.kind === "staging" && !editingResource && (
                  <Button
                    disabled={!canEdit || busy || failed || production === "v1.8.0"}
                    onClick={() => {
                      openReview("v1.8.0")
                    }}
                  >
                    Promote to production
                    <ArrowRight />
                  </Button>
                )}
                {selected.kind === "production" && !editingResource && (
                  <Button
                    variant="outline"
                    disabled={!canEdit || busy || production === releases.at(-1)?.version}
                    onClick={() => {
                      setSelectedId(null)
                      openRollback()
                    }}
                  >
                    <RotateCcw />
                    Rollback
                  </Button>
                )}
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={managingRelease} onOpenChange={setManagingRelease}>
        <SheetContent
          className="dm-inspector"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!selectedRelease) restoreFocus()
          }}
        >
          <SheetHeader>
            <SheetTitle>Production releases</SheetTitle>
            <SheetDescription>Changes compared with {production} in production.</SheetDescription>
          </SheetHeader>
          <div className="dm-inspector-body">
            <Card className="flex-row items-center justify-between gap-4 p-4">
              <span className="flex items-center gap-2 text-sm">
                <Status status="Ready" />
                Live
              </span>
              <Button variant="ghost" size="sm" onClick={() => openReview(production)}>
                <code>{production}</code>
                <ChevronRight />
              </Button>
            </Card>
            <div className="space-y-2">
              {releases
                .filter((release) => release.version !== production)
                .map((release) => {
                  return (
                    <Button
                      key={release.version}
                      variant="outline"
                      className="dm-version-option"
                      onClick={() => openReview(release.version)}
                    >
                      <Box className="text-muted-foreground" />
                      <ReleaseIdentity version={release.version} compareTo={production} />
                      <ReleasePlacements version={release.version} production={production} failed={failed} />
                      <ChevronRight />
                    </Button>
                  )
                })}
            </div>
            {busy && <p className="text-xs text-muted-foreground">A deployment is in progress.</p>}
            {!canEdit && <p className="text-xs text-muted-foreground">View-only access</p>}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet
        open={selectedRelease !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRelease(null)
        }}
      >
        <SheetContent
          className="dm-inspector dm-release-inspector"
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            restoreFocus()
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-xl tracking-tight">
              {action === "rollback" ? "Roll back release" : action === "promote" ? "Promote release" : selectedRelease}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {action ? "Review the release and its changes before updating Production." : "Release details"}
            </SheetDescription>
            <div className="flex items-center gap-3">
              {selectedRelease && (
                <Button asChild variant="link" size="xs" className="h-auto p-0">
                  <a href={`#release/${selectedRelease}`} onClick={() => setSelectedRelease(null)}>
                    Open in dashboard
                    <ArrowUpRight />
                  </a>
                </Button>
              )}
            </div>
          </SheetHeader>
          {selectedRelease && (
            <>
              <div className="dm-inspector-body">
                {action ? (
                  <ReleaseComparison
                    current={production}
                    target={selectedRelease}
                    staging={environments.find((environment) => environment.id === "staging")!.release}
                    failed={failed}
                    onTargetChange={action === "rollback" ? setSelectedRelease : undefined}
                  />
                ) : (
                  <ReleaseIdentity version={selectedRelease} showCount={false} />
                )}
                <ReleaseChanges
                  key={`${production}-${selectedRelease}`}
                  current={production}
                  target={selectedRelease}
                />
              </div>
              {action && (
                <div className="dm-release-actions">
                  <p className="text-xs leading-5 text-muted-foreground">
                    {configuration.servers
                      ? "Active sessions finish on their current release."
                      : "Updates the release served at the global edge."}
                    {(configuration.database || configuration.assets) && (
                      <>
                        <br />
                        {configuration.database ? "Database" : "Assets"}
                        {configuration.database && configuration.assets ? " and assets" : ""} unchanged.
                      </>
                    )}
                  </p>
                  {(busy || !canEdit || (selectedRelease === "v1.8.0" && failed)) && (
                    <p className="text-xs text-muted-foreground">
                      {!canEdit ? "View-only access" : busy ? "A deployment is in progress." : "Staging checks failed."}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedRelease(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      aria-label={action === "promote" ? "Confirm promotion" : "Confirm rollback"}
                      disabled={!canEdit || busy || (selectedRelease === "v1.8.0" && failed)}
                      onClick={() => {
                        setProduction(selectedRelease)
                        setDraining(configuration.servers)
                        setActivity(
                          `${selectedRelease} ${action === "promote" ? "promoted" : "restored"}${configuration.servers ? " · draining sessions" : ""}`
                        )
                        setSelectedRelease(null)
                      }}
                    >
                      {action === "promote" ? <ArrowUpRight /> : <RotateCcw />}
                      {action === "promote" ? "Promote to production" : "Roll back production"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
