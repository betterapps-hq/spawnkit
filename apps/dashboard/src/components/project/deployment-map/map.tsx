import { useMediaQuery } from "@mantine/hooks"
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getSmoothStepPath,
  useNodesInitialized,
  useNodes,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps
} from "@xyflow/react"
import {
  ArrowRight,
  ArrowLeftRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  GitPullRequest,
  Globe2,
  Layers,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import "@xyflow/react/dist/style.css"
import "./map.css"
import {
  configurations,
  initialResources,
  type DeploymentConfiguration,
  type DeploymentPreset,
  type ResourceSettings
} from "./configuration"
import { DashboardDestination } from "./dashboard-destination"
import { dashboardProject } from "./dashboard-project"
import { Infrastructure } from "./infrastructure"
import { compareReleases, releases } from "./release-data"
import { ReleaseChanges, ReleaseComparison, ReleaseIdentity, ReleasePlacements } from "./release-view"
import { ResourcePanel } from "./resource-panel"

type Environment = {
  id: string
  name: string
  branch: string
  release: string
  status: "Ready" | "Building" | "Failed"
  kind: "preview" | "staging" | "production"
  servers: number
  regions: number
  candidate?: string
  mobile?: boolean
}
type EnvironmentNode = Node<
  Environment & {
    expanded: boolean
    settings: ResourceSettings
    configuration: DeploymentConfiguration
    onToggle: () => void
    onResource: (resource: string) => void
  },
  "environment"
>
const previews: Environment[] = [
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
function Status({ status }: { status: Environment["status"] }) {
  return (
    <span className={`dm-status dm-status-${status.toLowerCase()}`} title={status}>
      <span className="sr-only">{status}</span>
    </span>
  )
}
function EnvironmentCard({ data, selected }: NodeProps<EnvironmentNode>) {
  const Icon = data.kind === "preview" ? GitPullRequest : data.kind === "production" ? Globe2 : Layers
  return (
    <Card className={`dm-environment gap-0 p-0 ${data.expanded ? "is-expanded" : ""} ${selected ? "is-selected" : ""}`}>
      {data.kind !== "preview" && (
        <Handle
          type="target"
          position={data.mobile ? Position.Top : Position.Left}
          style={data.mobile ? undefined : { top: 52 }}
        />
      )}
      <div className="dm-environment-title" title="Drag to move">
        <Icon size={17} />
        <strong>{data.name}</strong>
        <Status status="Ready" />
        <Button
          className="nodrag nopan dm-expand"
          variant="ghost"
          size="icon-xs"
          aria-label={`${data.expanded ? "Collapse" : "Expand"} ${data.name} infrastructure`}
          aria-expanded={data.expanded}
          onClick={(event) => {
            event.stopPropagation()
            data.onToggle()
          }}
        >
          {data.expanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      <div className="dm-environment-meta">
        <span>{data.branch}</span>
        <code>{data.release}</code>
      </div>
      {data.expanded && (
        <Infrastructure settings={data.settings} configuration={data.configuration} onOpen={data.onResource} />
      )}
      <div className="dm-environment-footer">
        <span>
          {data.configuration.servers ? (
            <>
              {data.servers} {data.servers === 1 ? "instance" : "instances"} · {data.regions}{" "}
              {data.regions === 1 ? "region" : "regions"}
            </>
          ) : (
            "Global edge"
          )}
        </span>
        {data.status !== "Ready" && (
          <span className={`dm-build-state ${data.status === "Failed" ? "text-destructive" : ""}`}>
            {data.status === "Failed" ? "Update failed" : "Building"}
          </span>
        )}
        <ChevronRight size={14} className="ml-auto" />
      </div>
      {data.kind !== "production" && (
        <Handle
          type="source"
          position={data.mobile ? Position.Bottom : Position.Right}
          style={data.mobile ? undefined : { top: 52 }}
        />
      )}
    </Card>
  )
}
type DeploymentEdge = Edge<{ onManage?: () => void }>
function Connection(props: EdgeProps<DeploymentEdge>) {
  const [path, x, y] = getSmoothStepPath({ ...props, borderRadius: 16 })
  return (
    <>
      <BaseEdge id={props.id} path={path} />
      <circle className="dm-packet" r="2.5" fill="var(--primary)">
        <animateMotion dur="4s" repeatCount="indefinite" path={path} />
      </circle>
      {props.data?.onManage && (
        <EdgeLabelRenderer>
          <div
            className="dm-edge-action nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Change production release"
                  onClick={props.data.onManage}
                >
                  <ArrowLeftRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change release</TooltipContent>
            </Tooltip>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
const nodeTypes = { environment: EnvironmentCard }
const edgeTypes = { connection: Connection }

function FitCanvas() {
  const initialized = useNodesInitialized()
  const measuredSizes = useNodes()
    .map((node) => `${node.id}:${node.measured?.width}:${node.measured?.height}`)
    .join("|")
  const { fitView } = useReactFlow()
  const width = useStore((state) => state.width)
  const height = useStore((state) => state.height)
  useEffect(() => {
    if (initialized && width && height) void fitView({ padding: 0.08, maxZoom: 1 })
  }, [initialized, measuredSizes, width, height, fitView])
  return null
}

export function DeploymentMap({
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
  const mobile = useMediaQuery("(max-width: 800px)")
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [measurements, setMeasurements] = useState<Record<string, { width: number; height: number }>>({})
  const [layoutRevision, setLayoutRevision] = useState(0)
  const positionKey = (id: string) => `${mobile ? "mobile" : "desktop"}-${id}`
  const onNodesChange = (changes: NodeChange<EnvironmentNode>[]) => {
    const moved = changes.filter((change) => change.type === "position" && change.position)
    const resized = changes.filter((change) => change.type === "dimensions" && change.dimensions)
    if (resized.length)
      setMeasurements((current) => {
        const next = { ...current }
        for (const change of resized)
          if (change.type === "dimensions" && change.dimensions) next[positionKey(change.id)] = change.dimensions
        return next
      })
    if (!moved.length) return
    setPositions((current) => {
      const next = { ...current }
      for (const change of moved)
        if (change.type === "position" && change.position) next[positionKey(change.id)] = change.position
      return next
    })
  }
  const returnFocus = useRef<HTMLElement | null>(null)
  const mapHeading = useRef<HTMLHeadingElement>(null)
  const activityFocus = useRef<HTMLOutputElement | null>(null)
  const restoreFocus = () => {
    const opener = returnFocus.current
    if (opener?.isConnected && !opener.matches(":disabled")) opener.focus()
    else (document.querySelector<HTMLElement>(".dm-dashboard h1") ?? activityFocus.current)?.focus()
  }
  const [editingResource, setEditingResource] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(["staging", "production"])
  const [resourceToInspect, setResourceToInspect] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [mobilePreview, setMobilePreview] = useState("pr-142")
  const [resources, setResources] = useState<Record<string, ResourceSettings>>({})
  const [deletedPreviews, setDeletedPreviews] = useState<string[]>([])
  const [deletingPreview, setDeletingPreview] = useState(false)
  const deleteCancel = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (deletingPreview) deleteCancel.current?.focus()
  }, [deletingPreview])
  const [previewHistory, setPreviewHistory] = useState<Environment[]>([])
  const previewCatalog = [
    ...previews,
    ...Array.from({ length: Math.max(0, previewCount - 3) }, (_, i): Environment => ({
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
  const activePage = Math.min(page, Math.max(0, Math.ceil(allPreviews.length / 3) - 1))
  const activeMobilePreview = allPreviews.find((p) => p.id === mobilePreview)?.id ?? allPreviews[0]?.id
  const visiblePreviews = mobile
    ? allPreviews.filter((p) => p.id === activeMobilePreview)
    : allPreviews.slice(activePage * 3, activePage * 3 + 3)
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
  const [previewUpdates, setPreviewUpdates] = useState<Record<string, Environment["status"]>>({})
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
  const environments: Environment[] = [
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
  const shownEnvironments = environments.filter(
    (e) => e.kind !== "preview" || visiblePreviews.some((p) => p.id === e.id)
  )
  const heightFor = (env: Environment) =>
    expanded.includes(env.id)
      ? 190 +
        (configuration.servers
          ? 70 + Math.min(env.regions, 3) * 26 + (env.regions > 3 ? 24 : 0)
          : configuration.api
            ? 62
            : 0) +
        (configuration.database || configuration.assets ? 100 : 0)
      : 128
  let previewY = 0
  let mobileY = 0
  const openEnvironment = (id: string, resource: string | null = null) => {
    setDeletingPreview(false)
    setResourceToInspect(resource)
    setEditingResource(Boolean(resource))
    setSelectedId(id)
  }
  const nodes: EnvironmentNode[] = shownEnvironments.map((env) => {
    const y = env.kind === "preview" ? previewY : 90
    if (env.kind === "preview") previewY += heightFor(env) + 34
    const position = mobile
      ? { x: 0, y: mobileY }
      : { x: env.kind === "preview" ? 0 : env.kind === "staging" ? 380 : 790, y }
    mobileY += heightFor(env) + 80
    const settings = resources[env.id] ?? initialResources(env.kind === "production", preset)
    return {
      id: env.id,
      type: "environment",
      position: positions[positionKey(env.id)] ?? position,
      measured: measurements[positionKey(env.id)] ?? {},
      data: {
        ...env,
        mobile,
        settings,
        configuration,
        expanded: expanded.includes(env.id),
        onToggle: () =>
          setExpanded((ids) => (ids.includes(env.id) ? ids.filter((id) => id !== env.id) : [...ids, env.id])),
        onResource: (resource) => openEnvironment(env.id, resource)
      },
      ariaLabel:
        env.name +
        ", " +
        env.branch +
        ", serving " +
        env.release +
        (env.status === "Ready" ? "" : env.status === "Failed" ? ", update failed" : ", building update"),
      draggable: true,
      dragHandle: ".dm-environment-title"
    }
  })
  // Environment links provide context; release changes are explicit actions.
  const edges: DeploymentEdge[] = [
    ...visiblePreviews.map((p) => ({
      id: `${p.id}-staging`,
      source: p.id,
      target: "staging",
      type: "connection",
      className: "dm-preview-edge"
    })),
    {
      id: "promote",
      source: "staging",
      target: "production",
      type: "connection",
      data: { onManage: () => setManagingRelease(true) },
      className: failed ? "dm-blocked-edge" : draining ? "dm-promote-edge is-active" : "dm-promote-edge"
    }
  ]
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
    setExpanded((ids) => ids.filter((value) => value !== id))
    const omit = <T,>(record: Record<string, T>) =>
      Object.fromEntries(
        Object.entries(record).filter(([key]) => key !== id && key !== `desktop-${id}` && key !== `mobile-${id}`)
      )
    setResources(omit)
    setPreviewUpdates(omit)
    setPositions(omit)
    setMeasurements(omit)
    setPage(Math.min(activePage, Math.max(0, Math.ceil((allPreviews.length - 1) / 3) - 1)))
    setMobilePreview(allPreviews.find((p) => p.id !== id)?.id ?? "")
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
          <Tabs defaultValue={initialView === "Releases" ? "releases" : "environments"}>
            <TabsList variant="line" aria-label="Deployment views">
              <TabsTrigger value="environments">Environments</TabsTrigger>
              <TabsTrigger value="releases">Releases</TabsTrigger>
            </TabsList>
            <TabsContent value="environments">
              <div
                className={`dm-canvas ${expanded.length ? "has-infrastructure" : ""}`}
                style={mobile ? { height: Math.max(700, (mobileY - 80) * 0.9 + 110) } : undefined}
              >
                <div className="dm-preview-navigation">
                  {mobile && allPreviews.length > 0 ? (
                    <Select value={activeMobilePreview} onValueChange={setMobilePreview}>
                      <SelectTrigger aria-label="PR preview" className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {allPreviews.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {p.branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      {allPreviews.length > 3 && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label="Previous previews"
                            disabled={activePage === 0}
                            onClick={() => setPage(activePage - 1)}
                          >
                            <ChevronLeft />
                          </Button>
                          <span>
                            {activePage * 3 + 1}–{Math.min(activePage * 3 + 3, allPreviews.length)} of{" "}
                            {allPreviews.length}
                          </span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label="Next previews"
                            disabled={(activePage + 1) * 3 >= allPreviews.length}
                            onClick={() => setPage(activePage + 1)}
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <ReactFlow
                  proOptions={{ hideAttribution: true }}
                  key={`${mobile}-${activePage}-${activeMobilePreview}-${layoutRevision}`}
                  nodes={nodes}
                  onNodesChange={onNodesChange}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: mobile ? 0.08 : 0.08, maxZoom: 1 }}
                  minZoom={0.3}
                  maxZoom={1.5}
                  nodesConnectable={false}
                  nodesDraggable
                  edgesFocusable={false}
                  onNodeClick={(event, node) => {
                    if (!(event.target as HTMLElement).closest("button")) openEnvironment(node.id)
                  }}
                  onKeyDownCapture={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return
                    if (!["Enter", " "].includes(event.key)) return
                    const id = (event.target as HTMLElement).closest(".react-flow__node")?.getAttribute("data-id")
                    if (id) {
                      event.preventDefault()
                      event.stopPropagation()
                      openEnvironment(id)
                    }
                  }}
                >
                  <Background gap={22} size={1} color="color-mix(in srgb, var(--muted-foreground) 28%, transparent)" />
                  <Controls showInteractive={false} orientation="horizontal" />
                  <FitCanvas />
                </ReactFlow>
                <Button
                  className="dm-reset-layout"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Reset layout"
                  title="Reset layout"
                  onClick={() => {
                    setPositions({})
                    setLayoutRevision((value) => value + 1)
                  }}
                >
                  <RotateCcw />
                </Button>
              </div>
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
            <SheetTitle>
              {action === "rollback" ? "Review rollback" : action === "promote" ? "Review release" : selectedRelease}
            </SheetTitle>
            <div className="flex items-center justify-between gap-3">
              <SheetDescription>{action ? "Production" : "Release details"}</SheetDescription>
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
                {action === "rollback" && (
                  <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                    <SelectTrigger aria-label="Target release" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      {releases
                        .filter(
                          (r) => releases.indexOf(r) > releases.findIndex((current) => current.version === production)
                        )
                        .map((r) => (
                          <SelectItem key={r.version} value={r.version}>
                            {r.version}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {action ? (
                  <ReleaseComparison current={production} target={selectedRelease} />
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
                      {action === "promote" ? "Promote release" : "Roll back"}
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
