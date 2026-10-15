import { templates, type TemplateId } from "@spawn/templates/catalog"
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Code2,
  FileCode2,
  GitBranch,
  Globe2,
  LayoutGrid,
  List,
  Rocket,
  Search,
  Terminal,
  X
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../copy-button"
import { EngineBadge } from "../engine-badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { scaffoldCommand } from "./creation-model"
import type { ProjectModel, ProjectPage } from "./model"
import { EmptyState, StatusBadge } from "./primitives"

type ProjectFilter = "all" | "live" | "draft" | "attention"
const projectFilters = [
  { id: "all", label: "All projects", icon: Boxes },
  { id: "live", label: "In production", icon: Globe2 },
  { id: "draft", label: "Not deployed", icon: FileCode2 },
  { id: "attention", label: "Needs attention", icon: AlertCircle }
] as const

function matchesFilter(project: ProjectModel, filter: ProjectFilter) {
  if (filter === "live") return Boolean(project.production.release)
  if (filter === "draft") return !project.production.release
  if (filter === "attention")
    return (
      project.production.status === "degraded" ||
      project.sandbox?.status === "degraded" ||
      project.releases[0]?.status === "failed"
    )
  return true
}

export function ProjectCollection({
  projects,
  onOpen,
  onCreate,
  onProjectPage,
  canCreate = true,
  templateCatalog = templates
}: {
  projects: ProjectModel[]
  onOpen: (project: ProjectModel) => void
  onCreate: (template?: TemplateId) => void
  onProjectPage: (project: ProjectModel, page: ProjectPage) => void
  canCreate?: boolean
  templateCatalog?: typeof templates | undefined
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<ProjectFilter>("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const filtered = projects.filter(
    (project) =>
      matchesFilter(project, filter) &&
      `${project.name} ${project.engine} ${project.repository ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  )
  const featured = projects.length === 1 && view === "grid"
  return (
    <div className="@container space-y-9">
      {projects.length ? (
        <section aria-label="Your projects" className="space-y-5">
          <fieldset
            aria-label="Filter projects by status"
            className="grid min-w-0 grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1 @min-[42rem]:grid-cols-4"
          >
            {projectFilters.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-3 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
                  filter === id
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", filter === id && "text-primary")} />
                <span className="flex-1 font-medium">{label}</span>
                <span
                  className={cn("font-mono tabular-nums", filter === id ? "text-foreground" : "text-muted-foreground")}
                >
                  {projects.filter((project) => matchesFilter(project, id)).length}
                </span>
              </button>
            ))}
          </fieldset>
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1 @min-[42rem]:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="bg-card pr-9 pl-9"
                aria-label="Search projects"
                placeholder="Find a project…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            <fieldset
              aria-label="Project layout"
              className="ml-auto flex shrink-0 gap-0.5 rounded-lg border bg-muted/30 p-0.5"
            >
              {(
                [
                  { id: "grid", icon: LayoutGrid, label: "Grid view" },
                  { id: "list", icon: List, label: "List view" }
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={label}
                      aria-pressed={view === id}
                      onClick={() => setView(id)}
                      className={cn(
                        "size-8",
                        view === id ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </fieldset>
          </div>
          {filtered.length ? (
            <div
              className={cn(
                "grid gap-5",
                view === "list"
                  ? "gap-3"
                  : featured
                    ? "@min-[48rem]:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]"
                    : "@min-[40rem]:grid-cols-2 @min-[70rem]:grid-cols-3"
              )}
            >
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => onOpen(project)}
                  view={view}
                  featured={featured}
                />
              ))}
              {featured && (
                <ProjectNextStep project={filtered[0]!} onPage={(page) => onProjectPage(filtered[0]!, page)} />
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed">
              <EmptyState
                icon={<Search />}
                title="No matching projects"
                description="Try another name or choose a different status."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("")
                      setFilter("all")
                    }}
                  >
                    Reset filters
                  </Button>
                }
              />
            </div>
          )}
        </section>
      ) : (
        <section className="relative isolate overflow-hidden rounded-2xl border bg-card px-6 py-10 sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-16 -z-10 size-96 rounded-full border border-primary/10 bg-primary/3 ring-[48px] ring-primary/2"
          />
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <Rocket className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your first game starts here</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Pick an engine below, then make it yours.
          </p>
          <Button className="mt-6" onClick={() => onCreate()} disabled={!canCreate}>
            Create project
            <ArrowRight />
          </Button>
        </section>
      )}
      <StarterKits onCreate={onCreate} canCreate={canCreate} catalog={templateCatalog} />
    </div>
  )
}

function ProjectCard({
  project,
  onOpen,
  view,
  featured
}: {
  project: ProjectModel
  onOpen: () => void
  view: "grid" | "list"
  featured: boolean
}) {
  const template = templates.find((item) => item.id === project.engine)!
  const list = view === "list"
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative flex min-w-0 overflow-hidden rounded-xl border bg-card text-left shadow-xs outline-none transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring",
        list ? "flex-row items-stretch" : "flex-col"
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          list ? "w-20 shrink-0 sm:w-36" : featured ? "h-52 @min-[48rem]:h-60" : "h-40"
        )}
      >
        <img
          src={project.artwork}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
        {!list && (
          <>
            <EngineBadge engine={project.engine} />
            <span className="absolute right-4 bottom-3 rounded-md border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              {template.dimension.toUpperCase()}
            </span>
          </>
        )}
      </div>
      <div className={cn("flex min-w-0 flex-1 p-5", list ? "flex-wrap items-center gap-x-6 gap-y-3 p-4" : "flex-col")}>
        <div className={cn("min-w-0", list && "flex-1 basis-32")}>
          <div className="flex items-center justify-between gap-3">
            <h3 className={cn("truncate font-semibold tracking-tight", featured ? "text-xl" : "text-base")}>
              {project.name}
            </h3>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{template.name}</span>
            <span className="border-l pl-2">{project.mode === "multiplayer" ? "Multiplayer" : "Single-player"}</span>
            {project.services.length > 0 && <span className="border-l pl-2">Game services</span>}
          </div>
        </div>
        <div
          className={cn(
            "space-y-2.5 rounded-lg border bg-muted/25 p-3",
            list ? "w-full border-0 bg-transparent p-0 @min-[45rem]:w-48" : "mt-5"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Production</span>
            <StatusBadge status={project.production.status} />
          </div>
          {project.sandbox && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Sandbox</span>
              <StatusBadge status={project.sandbox.status} />
            </div>
          )}
        </div>
        {!list && (
          <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              {project.production.release ? (
                <>
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="truncate">{project.production.release.branch}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono">
                    v{project.production.release.number}
                  </span>
                </>
              ) : (
                <>
                  <FileCode2 className="size-3.5" />
                  {project.configuration ? "Configuration saved" : "No releases yet"}
                </>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-medium text-primary">
              Open project
              <ArrowRight className="size-3 transition-transform motion-safe:group-hover:translate-x-0.5" />
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

function ProjectNextStep({ project, onPage }: { project: ProjectModel; onPage: (page: ProjectPage) => void }) {
  const latest = project.releases[0]
  const command = project.configuration ? scaffoldCommand(project.configuration) : null
  return (
    <aside
      aria-label="Project next step"
      className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-primary/6 to-transparent"
      />
      <div className="relative flex flex-1 flex-col">
        <div className="mb-5 flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
          {latest ? <GitBranch className="size-5" /> : <Terminal className="size-5" />}
        </div>
        <div className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {latest ? "Latest version" : "Next step"}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">
          {latest ? `Version ${latest.number}` : command ? "Build locally" : "Make your first release"}
        </h2>
        {latest ? (
          <>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{latest.title}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusBadge status={latest.status} />
              <span className="text-xs text-muted-foreground">{latest.time}</span>
            </div>
          </>
        ) : command ? (
          <>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create your starter’s game files with the spawn CLI.
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border bg-muted/40">
              <div className="flex items-center justify-between border-b px-3 py-1.5">
                <span className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                  <Code2 className="size-3.5" />
                  Terminal
                </span>
                <CopyButton value={command} label="Copy project command" compact />
              </div>
              <pre className="p-3 text-xs leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
                <code>
                  {command.split(" ").map((part, index) => (
                    <span key={index}>
                      <span className="inline-block max-w-full">{part}</span>{" "}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage your builds and environment releases from Deployments.
          </p>
        )}
        <div className="flex-1" />
        <Button
          className="mt-6 w-full justify-between bg-card"
          variant="outline"
          onClick={() => onPage(latest || !command ? "deployments" : "configure")}
        >
          {latest ? "View versions" : command ? "Review configuration" : "View deployments"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </aside>
  )
}

function StarterKits({
  onCreate,
  canCreate,
  catalog
}: {
  onCreate: (template?: TemplateId) => void
  canCreate: boolean
  catalog: typeof templates
}) {
  return (
    <section aria-label="Start a new project" className="border-t pt-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Starter kits</h2>
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 text-xs text-muted-foreground"
          onClick={() => onCreate()}
          disabled={!canCreate}
        >
          Browse templates
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4">
        {catalog.map((template) => (
          <button
            key={template.id}
            disabled={!canCreate}
            onClick={() => onCreate(template.id)}
            aria-label={`Create with ${template.name}`}
            className="group min-w-0 overflow-hidden rounded-xl border bg-card text-left outline-none transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="relative h-24 overflow-hidden bg-muted @min-[60rem]:h-28">
              <img
                src={`/templates/${template.id}.webp`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/35 to-transparent" />
              <span className="absolute bottom-2 left-3 inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/95 px-2 shadow-sm">
                <img
                  src={`/engines/${template.id}.${template.id === "phaser" ? "png" : "svg"}`}
                  alt=""
                  className="max-h-5 max-w-16"
                />
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{template.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {template.dimension.toUpperCase()}{" "}
                  {template.id === "pixi" || template.id === "three" ? "renderer" : "game engine"}
                </div>
              </div>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
