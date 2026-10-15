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
  ArrowLeftRight,
  ChevronRight,
  GitPullRequest,
  Globe2,
  Layers,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import type { DeploymentConfiguration, ResourceSettings } from "./configuration"
import { Infrastructure } from "./infrastructure"
import "@xyflow/react/dist/style.css"
import "./map.css"
export type MapEnvironment = {
  id: string
  name: string
  branch: string
  release: string
  status: "Ready" | "Building" | "Failed" | "Empty"
  kind: "preview" | "staging" | "production"
  servers: number
  regions: number
  candidate?: string
  health?: "Ready" | "Empty" | "Degraded" | "Paused"
  updateLabel?: string
  infrastructure?: ReactNode
  summary?: string
  mobile?: boolean
}
type EnvironmentNode = Node<
  MapEnvironment & {
    expanded: boolean
    settings: ResourceSettings
    configuration: DeploymentConfiguration
    onToggle: () => void
    onResource: (resource: string) => void
  },
  "environment"
>
export function Status({ status }: { status: MapEnvironment["status"] | "Degraded" | "Paused" }) {
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
        <Status status={data.health ?? "Ready"} />
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
      {data.expanded &&
        (data.infrastructure ?? (
          <Infrastructure settings={data.settings} configuration={data.configuration} onOpen={data.onResource} />
        ))}
      <div className="dm-environment-footer">
        <span>
          {data.summary ??
            (data.configuration.servers ? (
              <>
                {data.servers} {data.servers === 1 ? "instance" : "instances"} · {data.regions}{" "}
                {data.regions === 1 ? "region" : "regions"}
              </>
            ) : (
              "Global edge"
            ))}
        </span>
        {(data.updateLabel || data.status === "Building" || data.status === "Failed") && (
          <span className={`dm-build-state ${data.status === "Failed" ? "text-destructive" : ""}`}>
            {data.updateLabel ?? (data.status === "Failed" ? "Update failed" : "Building")}
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

export function EnvironmentGraph({
  environments,
  configuration,
  settingsFor,
  onOpen,
  onManage,
  blocked = false,
  active = false
}: {
  environments: MapEnvironment[]
  configuration: DeploymentConfiguration
  settingsFor: (environment: MapEnvironment) => ResourceSettings
  onOpen: (id: string, resource?: string) => void
  onManage: () => void
  blocked?: boolean
  active?: boolean
}) {
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
  const [expanded, setExpanded] = useState<string[]>(["staging", "production"])
  const [page, setPage] = useState(0)
  const [mobilePreview, setMobilePreview] = useState("")
  const allPreviews = environments.filter((environment) => environment.kind === "preview")
  const activePage = Math.min(page, Math.max(0, Math.ceil(allPreviews.length / 3) - 1))
  const activeMobilePreview = allPreviews.find((preview) => preview.id === mobilePreview)?.id ?? allPreviews[0]?.id
  const visiblePreviews = mobile
    ? allPreviews.filter((preview) => preview.id === activeMobilePreview)
    : allPreviews.slice(activePage * 3, activePage * 3 + 3)
  const shownEnvironments = environments.filter(
    (e) => e.kind !== "preview" || visiblePreviews.some((p) => p.id === e.id)
  )
  const heightFor = (env: MapEnvironment) =>
    expanded.includes(env.id)
      ? 190 +
        (configuration.servers
          ? 70 + Math.min(env.regions, 3) * 26 + (env.regions > 3 ? 24 : 0)
          : configuration.api
            ? 62
            : 0) +
        (configuration.database || configuration.assets ? 100 : 0)
      : 128
  const mobileY = shownEnvironments.reduce((sum, environment) => sum + heightFor(environment) + 80, 0)
  const nodes: EnvironmentNode[] = shownEnvironments.map((env, index) => {
    const previous = shownEnvironments.slice(0, index)
    const previewY = previous
      .filter((environment) => environment.kind === "preview")
      .reduce((sum, environment) => sum + heightFor(environment) + 34, 0)
    const y = env.kind === "preview" ? previewY : 90
    const position = mobile
      ? { x: 0, y: previous.reduce((sum, environment) => sum + heightFor(environment) + 80, 0) }
      : { x: env.kind === "preview" ? 0 : env.kind === "staging" ? 380 : 790, y }
    const settings = settingsFor(env)
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
        onResource: (resource) => onOpen(env.id, resource)
      },
      ariaLabel:
        env.name +
        ", " +
        env.branch +
        ", serving " +
        env.release +
        (env.updateLabel
          ? `, ${env.updateLabel}`
          : env.status === "Failed"
            ? ", update failed"
            : env.status === "Building"
              ? ", building update"
              : env.status === "Empty"
                ? ", no deployment"
                : ""),
      draggable: true,
      dragHandle: ".dm-environment-title"
    }
  })
  // Environment links provide context; release changes are explicit actions.
  const edges: DeploymentEdge[] = [
    ...visiblePreviews.map((p) => ({
      id: `${p.id}-staging`,
      source: p.id,
      target: environments.some((environment) => environment.id === "staging") ? "staging" : "production",
      type: "connection",
      className: "dm-preview-edge"
    })),
    ...(environments.some((environment) => environment.id === "staging")
      ? [
          {
            id: "promote",
            source: "staging",
            target: "production",
            type: "connection",
            data: { onManage: () => onManage() },
            className: blocked ? "dm-blocked-edge" : active ? "dm-promote-edge is-active" : "dm-promote-edge"
          }
        ]
      : [])
  ]
  return (
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
                  {activePage * 3 + 1}–{Math.min(activePage * 3 + 3, allPreviews.length)} of {allPreviews.length}
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
          if (!(event.target as HTMLElement).closest("button")) onOpen(node.id)
        }}
        onKeyDownCapture={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          if (!["Enter", " "].includes(event.key)) return
          const id = (event.target as HTMLElement).closest(".react-flow__node")?.getAttribute("data-id")
          if (id) {
            event.preventDefault()
            event.stopPropagation()
            onOpen(id)
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
  )
}
