import { useOs } from "@mantine/hooks"
import {
  ArrowUpRight,
  Inbox,
  ShieldCheck,
  Check,
  CornerDownLeft,
  Plus,
  Search,
  Slash,
  X,
  Users,
  Flag
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Notifications, type StudioNotification } from "../notifications"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "../ui/breadcrumb"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { SidebarTrigger } from "../ui/sidebar"
import type { ProjectModel, ProjectPage, Release, StudioLocation } from "./model"
import { projectNavigation } from "./navigation"
import { StatusBadge } from "./primitives"

export function StudioHeader({
  project,
  projects,
  page,
  title,
  release,
  notifications,
  onNavigate,
  onCreate,
  canCreate
}: {
  project: ProjectModel
  projects: ProjectModel[]
  page: ProjectPage
  title: string
  release: Release | null
  notifications?: StudioNotification[] | undefined
  onNavigate: (location: StudioLocation) => void
  onCreate: () => void
  canCreate: boolean
}) {
  const home = page === "projects"
  const creating = ["upload", "create", "configure", "submissions", "manage", "team", "reports"].includes(page)
  const inProject = !home && !creating
  const PageIcon =
    page === "manage"
      ? ShieldCheck
      : page === "submissions"
        ? Inbox
        : page === "team"
          ? Users
          : page === "reports"
            ? Flag
            : (projectNavigation.find((item) => item.id === page)?.icon ?? Plus)
  return (
    <header className="sticky top-0 z-20 flex h-[76px] shrink-0 items-center gap-3 border-b bg-linear-to-r from-card/95 via-card/90 to-accent/35 px-4 shadow-[0_1px_12px_-8px_color-mix(in_oklab,var(--primary)_25%,transparent)] backdrop-blur-xl md:gap-4 md:px-8">
      <SidebarTrigger className="size-9 shrink-0 rounded-lg border bg-background text-muted-foreground shadow-xs hover:border-primary/30 hover:text-foreground" />
      <div aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
      <Breadcrumb aria-label="Breadcrumb" className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap gap-2 sm:gap-3">
          <BreadcrumbItem className={cn(!home && "hidden lg:inline-flex")}>
            {home ? (
              <BreadcrumbPage className="font-semibold tracking-tight">Dashboard</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <button className="text-xs" onClick={() => onNavigate({ page: "projects" })}>
                  Dashboard
                </button>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!home && (
            <BreadcrumbSeparator className="hidden text-border lg:block">
              <Slash className="size-4!" />
            </BreadcrumbSeparator>
          )}
          {creating ? (
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="flex items-center gap-2 text-xs font-medium">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PageIcon className="size-4" />
                </span>
                <span className="truncate">{title}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            inProject && (
              <>
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbLink asChild>
                    <button
                      onClick={() => onNavigate({ page: "overview", projectId: project.id })}
                      aria-current={page === "overview" ? "page" : undefined}
                      className="group flex min-w-0 items-center gap-2.5 text-foreground"
                    >
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-primary/15 bg-muted shadow-xs">
                        <img
                          src={project.artwork}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-110"
                        />
                      </span>
                      <span
                        className={cn(
                          "max-w-32 truncate text-sm font-semibold tracking-tight sm:max-w-48",
                          page !== "overview" && "hidden sm:block"
                        )}
                      >
                        {project.name || "Project"}
                      </span>
                      {page !== "overview" && <span className="sr-only sm:hidden">{project.name || "Project"}</span>}
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {page !== "overview" && (
                  <>
                    <BreadcrumbSeparator className="hidden text-border sm:block">
                      <Slash className="size-4!" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem className="min-w-0">
                      <BreadcrumbPage className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/10 bg-primary/6 px-2.5 py-1.5 text-xs font-medium text-primary">
                        <PageIcon className="hidden size-3.5 shrink-0 sm:block" />
                        <span className="truncate">{title}</span>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
                {release && (
                  <BreadcrumbItem className="hidden sm:inline-flex">
                    <span className="rounded-md border bg-muted/50 px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
                      v{release.number}
                    </span>
                  </BreadcrumbItem>
                )}
              </>
            )
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex shrink-0 items-center gap-2">
        {inProject && (
          <div className="hidden 2xl:block">
            <StatusBadge status={project.production.status} />
          </div>
        )}
        <QuickNavigation
          projects={projects}
          active={inProject ? project : null}
          page={page}
          onNavigate={onNavigate}
          onCreate={onCreate}
          canCreate={canCreate}
        />
        <div className="rounded-lg border bg-background shadow-xs">
          <Notifications items={notifications} onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  )
}

function QuickNavigation({
  projects,
  active,
  page,
  onNavigate,
  onCreate,
  canCreate
}: {
  projects: ProjectModel[]
  active: ProjectModel | null
  page: ProjectPage
  onNavigate: (location: StudioLocation) => void
  onCreate: () => void
  canCreate: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const os = useOs()
  const modifier = os === "macos" || os === "ios" ? "⌘" : "Ctrl"
  const content = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.altKey) {
        event.preventDefault()
        setQuery("")
        restoreFocus.current = open
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [open])
  const search = query.trim().toLowerCase()
  const pages = active ? projectNavigation.filter((item) => item.label.toLowerCase().includes(search)) : []
  const matches = projects.filter((item) => `${item.name} ${item.engine}`.toLowerCase().includes(search))
  function navigate(location: StudioLocation) {
    setOpen(false)
    setQuery("")
    onNavigate(location)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (value) restoreFocus.current = false
        setOpen(value)
        setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          variant="outline"
          aria-label="Search projects and pages"
          aria-keyshortcuts="Control+k Meta+k"
          className="h-9 w-9 gap-2 bg-background px-0 text-xs font-normal text-muted-foreground shadow-xs lg:w-48 lg:justify-start lg:px-3"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">Jump to…</span>
          <kbd
            aria-hidden="true"
            className="ml-auto hidden rounded border bg-muted/60 px-1 py-0.5 font-mono text-[9px] xl:inline"
          >
            {modifier} K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={content}
        aria-label="Quick navigation"
        align="end"
        sideOffset={12}
        className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-0 shadow-xl shadow-black/10"
        onEscapeKeyDown={() => {
          restoreFocus.current = true
        }}
        onCloseAutoFocus={(event) => {
          if (restoreFocus.current) {
            event.preventDefault()
            trigger.current?.focus()
            restoreFocus.current = false
          }
        }}
        onKeyDown={(event) => {
          const items = Array.from(
            content.current?.querySelectorAll<HTMLButtonElement>("[data-navigation-result]") ?? []
          )
          if (!items.length) return
          const index = items.findIndex((item) => item === document.activeElement)
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            const next =
              index < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : items.length - 1
                : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
            items[next]?.focus()
          } else if (event.key === "Enter" && document.activeElement?.tagName === "INPUT") {
            event.preventDefault()
            items[0]?.click()
          }
        }}
      >
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute top-5 left-4 size-4 text-muted-foreground" />
          <Input
            aria-label="Search navigation"
            placeholder="Find a project or page…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 border-0 bg-transparent! pr-9 pl-9 text-sm shadow-none focus-visible:ring-0"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear navigation search"
              className="absolute top-3 right-3"
              onClick={() => setQuery("")}
            >
              <X />
            </Button>
          )}
        </div>
        <div className="max-h-[min(420px,55svh)] overflow-y-auto p-2">
          {pages.length > 0 && (
            <section aria-label="Project pages">
              <p className="px-2 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {active!.name}
              </p>
              {pages.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  data-navigation-result
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => navigate({ page: id, projectId: active!.id })}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{label}</span>
                  {page === id && <Check className="size-3.5 text-primary" />}
                </button>
              ))}
            </section>
          )}
          {matches.length > 0 && (
            <section aria-label="Projects">
              <p className="px-2 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Projects
              </p>
              {matches.map((project) => (
                <button
                  key={project.id}
                  data-navigation-result
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => navigate({ page: "overview", projectId: project.id })}
                >
                  <img src={project.artwork} alt="" className="size-7 rounded-md border object-cover" />
                  <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </section>
          )}
          {!pages.length && !matches.length && (
            <p className="px-3 py-9 text-center text-sm text-muted-foreground">No matching projects or pages.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canCreate}
            className="h-8 text-xs"
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
          >
            <Plus className="size-3.5" />
            Create project
          </Button>
          <span aria-hidden="true" className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CornerDownLeft className="size-3" />
            to open<span className="ml-2 rounded border px-1 py-0.5 font-mono">esc</span>to close
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
