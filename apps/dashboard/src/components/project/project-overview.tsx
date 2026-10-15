import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Globe2,
  Plus,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../copy-button"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { scaffoldCommand } from "./creation-model"
import { DomainStatus, primaryHostname } from "./domains"
import type { OperationPanel, ProjectModel, ProjectPage, Release } from "./model"
import { EmptyState, Notice, StatusBadge } from "./primitives"
import { VersionTargets, type VersionSection } from "./version-console"

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  )
}

export function Overview({
  project,
  canEdit,
  onPage,
  onAction,
  onRelease,
  onDeployments,
  onConfigureSandbox
}: {
  project: ProjectModel
  canEdit: boolean
  onPage: (page: ProjectPage) => void
  onAction: (panel: OperationPanel) => void
  onRelease: (release: Release) => void
  onDeployments: (section: VersionSection) => void
  onConfigureSandbox?: (() => void) | undefined
}) {
  const multiplayer = project.mode === "multiplayer"
  const production = project.production
  const live = production.release
  const sandbox = project.sandbox
  const hostname = primaryHostname(project, "production")
  const openPreviews = project.previews.filter((preview) => preview.state !== "closing").length
  const metrics = [
    {
      label: multiplayer ? "Players online" : "Requests",
      value: multiplayer ? String(project.metrics.players) : project.metrics.requests,
      detail: multiplayer ? "In production" : "Last 24 hours"
    },
    {
      label: multiplayer ? "Active rooms" : "Delivery",
      value: multiplayer ? String(project.metrics.rooms) : live ? "Global" : "—",
      detail: multiplayer ? "Colyseus" : "Static hosting"
    },
    { label: "Errors", value: String(project.metrics.errors), detail: "Last 24 hours" },
    {
      label: "Monthly estimate",
      value: project.monthlyEstimate === 0 ? "Free" : `$${project.monthlyEstimate.toFixed(2)}`,
      valueClassName: project.monthlyEstimate === 0 ? "text-emerald-700 dark:text-emerald-300" : undefined,
      detail: project.monthlyEstimate
        ? project.mode === "single" && project.services.length && !sandbox && project.database === "none"
          ? "Service usage included"
          : "Plus metered usage"
        : "Frontend production"
    }
  ]
  return (
    <div className="space-y-7">
      {project.connected === false && project.configuration && (
        <section className="rounded-xl border bg-card p-5" aria-label="Project starter">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Start building</h2>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
            <code data-testid="scaffold-command" className="min-w-0 flex-1 break-all text-xs leading-6">
              {scaffoldCommand(project.configuration)}
            </code>
            <CopyButton value={scaffoldCommand(project.configuration)} label="Copy scaffold command" compact />
          </div>
        </section>
      )}
      {production.status === "degraded" && (
        <Notice>
          A production region needs attention.{" "}
          <button className="font-medium underline" onClick={() => onPage("backend")}>
            Review backend health
          </button>
        </Notice>
      )}
      {project.releases[0]?.status === "building" && (
        <Notice tone="info">
          Version v{project.releases[0].number} is building.
          {live
            ? ` Production still serves v${live.number}.`
            : " Your first version will appear here when it is ready."}
        </Notice>
      )}

      <section aria-label="Production deployment" className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="grid md:grid-cols-[minmax(180px,28%)_minmax(0,1fr)]">
          <div className="relative min-h-40 overflow-hidden md:min-h-60">
            <img src={project.artwork} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/25 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
              <Globe2 className="size-3" />
              {project.engine === "pixi"
                ? "PixiJS"
                : project.engine === "phaser"
                  ? "Phaser"
                  : project.engine === "babylon"
                    ? "Babylon.js"
                    : "Three.js"}
            </div>
          </div>
          <div className="flex min-w-0 flex-col p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-medium text-muted-foreground">Production</h2>
              <StatusBadge status={production.status} />
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-1">
              {live ? (
                <a
                  href={`https://${hostname}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-lg font-semibold tracking-tight hover:text-primary sm:text-xl"
                >
                  {hostname}
                </a>
              ) : (
                <h3 className="text-lg font-semibold">Ready for your first deployment</h3>
              )}
              {live && <CopyButton value={`https://${hostname}`} label="Copy production URL" compact />}
            </div>
            {live ? (
              <>
                <button
                  className="mt-4 flex w-fit max-w-full items-center gap-2 text-left text-sm hover:text-primary"
                  onClick={() => onRelease(live)}
                >
                  <Badge variant="secondary" className="shrink-0 font-mono">
                    v{live.number}
                  </Badge>
                  <span className="truncate">{live.title}</span>
                  <ArrowUpRight className="size-3 shrink-0" />
                </button>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="size-3" />
                    {live.branch}
                  </span>
                  <code className="flex items-center gap-1.5">
                    <GitCommitHorizontal className="size-3" />
                    {live.commit}
                  </code>
                  <span>{live.time}</span>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Publish from your repository or the spawn CLI.
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              {live ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://${hostname}`} target="_blank" rel="noreferrer">
                    Visit game
                    <ArrowUpRight />
                  </a>
                </Button>
              ) : (
                <Button size="sm" disabled={!canEdit} onClick={() => onAction("deploy")}>
                  <Rocket />
                  Deploy project
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onPage("domains")}>
                <Globe2 />
                Manage domains
              </Button>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {production.regions.length
                  ? `${production.regions.length} ${production.regions.length === 1 ? "region" : "regions"}`
                  : "Global static hosting"}
              </span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t bg-muted/20 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`relative min-w-0 px-5 py-4 md:px-6 ${index % 2 === 0 ? "border-r" : ""} ${index === 1 ? "lg:border-r" : ""} ${index < 2 ? "border-b lg:border-b-0" : ""}`}
            >
              <dt className="text-[11px] text-muted-foreground">{metric.label}</dt>
              <dd className={cn("mt-1.5 text-2xl font-semibold tracking-tight tabular-nums", metric.valueClassName)}>
                {metric.value}
              </dd>
              <dd className="mt-1 text-[10px] text-muted-foreground">{metric.detail}</dd>
              {index === 0 && project.metrics.traffic.length > 1 && (
                <svg
                  viewBox="0 0 100 32"
                  className="absolute right-4 bottom-7 hidden h-8 w-16 text-primary xl:block"
                  aria-hidden="true"
                >
                  <polyline
                    points={project.metrics.traffic
                      .map((n, i) => `${i * (100 / (project.metrics.traffic.length - 1))},${30 - n * 0.3}`)
                      .join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Section
            title="Recent versions"
            action={
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onDeployments("versions")}>
                View all
                <ArrowRight className="size-3" />
              </Button>
            }
          >
            <div className="divide-y">
              {project.releases.slice(0, 4).map((version) => (
                <button
                  key={version.id}
                  onClick={() => onRelease(version)}
                  className="group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/30 font-mono text-xs text-muted-foreground">
                    v{version.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium group-hover:text-primary">{version.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <code>{version.commit}</code>
                      <span>{version.time}</span>
                    </div>
                    <div className="mt-2">
                      <VersionTargets project={project} version={version} />
                    </div>
                  </div>
                  <StatusBadge status={version.status} />
                </button>
              ))}
            </div>
            {!project.releases.length && (
              <EmptyState
                icon={<Rocket />}
                title="No versions yet"
                description="Your builds and deployment history will appear here."
              />
            )}
          </Section>
          {multiplayer && (
            <Section
              title="Production runtime"
              action={
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onPage("backend")}>
                  Configure
                  <ArrowRight className="size-3" />
                </Button>
              }
            >
              <div className="divide-y">
                {production.regions.map((region) => (
                  <div key={region.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <Server className="size-4 text-muted-foreground" />
                    <div className="min-w-24 flex-1">
                      <p className="text-xs font-medium">{region.city}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {region.cores} vCPU / {region.ram} GB
                      </p>
                    </div>
                    <div className="w-20">
                      <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
                        <span>CPU</span>
                        <span>{region.cpu}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${region.cpu > 85 ? "bg-amber-500" : "bg-primary/70"}`}
                          style={{ width: `${region.cpu}%` }}
                        />
                      </div>
                    </div>
                    <StatusBadge status={region.status} />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <Section
            title="Environments"
            action={
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onDeployments("environments")}>
                Manage
                <ArrowRight className="size-3" />
              </Button>
            }
          >
            <div className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-xs font-medium">Sandbox</h3>
                {sandbox && (
                  <span className="ml-auto">
                    <StatusBadge status={sandbox.status} />
                  </span>
                )}
              </div>
              {sandbox ? (
                <>
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">{sandbox.url}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {sandbox.release ? (
                      <button
                        onClick={() => onRelease(sandbox.release!)}
                        className="flex items-center gap-2 text-xs hover:text-primary"
                      >
                        <Badge variant="secondary" className="font-mono">
                          v{sandbox.release.number}
                        </Badge>
                        <span>{sandbox.release.id === live?.id ? "Matches production" : "Ready to review"}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No version deployed</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !canEdit || !sandbox.release || sandbox.release.id === live?.id || sandbox.status === "paused"
                      }
                      onClick={() => onAction("promote")}
                    >
                      Promote
                      <ArrowUpRight className="size-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Try changes before they reach your players.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit && !onConfigureSandbox}
                      onClick={() => (onConfigureSandbox ? onConfigureSandbox() : onAction("enable-sandbox"))}
                    >
                      <Plus />
                      Enable Sandbox
                    </Button>
                    <span className="text-[11px] text-muted-foreground">$5/month + usage</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => onDeployments("previews")}
              className="flex w-full items-center gap-3 border-t bg-muted/20 px-5 py-4 text-left text-xs hover:bg-accent/30"
            >
              <GitPullRequest className="size-4 text-muted-foreground" />
              <span className="flex-1">PR previews</span>
              <span className="text-muted-foreground">
                {project.repository
                  ? project.previewsEnabled
                    ? `${openPreviews} open`
                    : "Not enabled"
                  : "Connect GitHub"}
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </button>
          </Section>
          <Section
            title="Domains"
            action={
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onPage("domains")}>
                {project.domains.length ? "Manage" : "Connect domain"}
                <ArrowRight className="size-3" />
              </Button>
            }
          >
            <button
              onClick={() => onPage("domains")}
              className="flex w-full items-center gap-3 p-5 text-left hover:bg-muted/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border">
                <Globe2 className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{hostname || "No domain assigned"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {project.domains.some((domain) => domain.primary && domain.environment === "production")
                    ? "Primary domain"
                    : "SpawnKit domain"}
                </p>
              </div>
              {hostname && <ShieldCheck className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />}
            </button>
            {project.domains
              .filter((domain) => domain.status !== "active")
              .slice(0, 2)
              .map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => onPage("domains")}
                  className="flex w-full flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-left hover:bg-muted/30"
                >
                  <span className="max-w-full truncate text-[11px]">{domain.hostname}</span>
                  <DomainStatus domain={domain} />
                </button>
              ))}
          </Section>
          {project.services.length > 0 && (
            <div className="px-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium">Game services</h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onPage("backend")}>
                  Manage
                  <ArrowRight className="size-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.services.map((service) => (
                  <Badge variant="secondary" key={service} className="text-[10px] font-normal">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
