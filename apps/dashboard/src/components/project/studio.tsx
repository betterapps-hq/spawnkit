import type { templates, TemplateId } from "@spawn/templates/catalog"
import { Gauge, LoaderCircle, Plus, RefreshCw, RotateCcw, Save, Settings2, Terminal } from "lucide-react"
import { useState, type ReactNode, type ComponentProps } from "react"
import { match } from "ts-pattern"
import { createDashboardStore } from "@/lib/dashboard-store"
import type { LoadReleaseChanges } from "@/lib/release-changes"
import { BrandSymbol, BrandWordmark } from "../brand"
import { CopyButton } from "../copy-button"
import type { StudioNotification } from "../notifications"
import { PageHeader } from "../page-header"
import { ProjectSwitcher } from "../project-switcher"
import { SidebarAccount, type StudioAccount } from "../sidebar-account"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Separator } from "../ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar
} from "../ui/sidebar"
import { ProjectUsers } from "./activity"
import { Backend, ProjectSettings } from "./configuration"
import { ProjectCreation } from "./creation"
import type { ProjectDraft } from "./creation-model"
import { ProjectDeployments } from "./deployment-map/project-deployments"
import { ReleaseReview } from "./deployment-map/release-review"
import { Domains } from "./domains"
import { Logs } from "./logs"
import type {
  ActionHandler,
  OperationPanel,
  ProjectModel,
  ProjectPage,
  Release,
  PullRequestPreview,
  StudioLocation
} from "./model"
import { projectNavigation as navigation } from "./navigation"
import { ProjectCollection } from "./overview"
import { EmptyState, Notice } from "./primitives"
import { Overview } from "./project-overview"
import { StudioHeader } from "./studio-header"
import { LiveTelemetry } from "./telemetry"
import { VersionActionSheet } from "./version-actions"
import { VersionConsole, type VersionSection } from "./version-console"
import { VersionDetail } from "./version-detail"

const descriptions: Record<ProjectPage, string> = {
  projects: "",
  create: "",
  configure: "",
  overview: "",
  deployments: "",
  domains: "Manage the addresses players use to reach your game.",
  analytics: "",
  logs: "Follow what's happening inside your game.",
  users: "Player accounts for your game.",
  backend: "Runtime regions, resources, and game services.",
  settings: "Identity, source, and environment configuration."
}

export function ProjectStudio({
  initialSidebarOpen = true,
  ...props
}: ComponentProps<typeof StudioContent> & { initialSidebarOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <StudioContent {...props} />
    </SidebarProvider>
  )
}

function StudioContent({
  project,
  projects,
  initialPage = "overview",
  canEdit = true,
  initialPanel = null,
  operationState = "idle",
  viewState = "ready",
  disconnected = false,
  initialVersion,
  initialSection = "versions",
  initialDomain,
  initialCreationStep,
  initialDraft,
  onAction,
  location,
  onNavigate,
  account = { name: "Your account" },
  notifications,
  banner,
  cloudEnabled = true,
  telemetryEnabled = false,
  analyticsPreview,
  deploymentsPreview,
  deploymentMapEnabled = false,
  loadReleaseChanges,
  storageReady = true,
  templateCatalog
}: {
  project: ProjectModel
  projects: ProjectModel[]
  initialPage?: ProjectPage
  canEdit?: boolean
  initialPanel?: OperationPanel | null
  operationState?: "idle" | "pending" | "success" | "error"
  viewState?: "ready" | "loading" | "error"
  disconnected?: boolean
  initialVersion?: string
  initialSection?: VersionSection
  initialDomain?: string
  initialCreationStep?: number
  initialDraft?: Partial<ProjectDraft>
  onAction?: ActionHandler | undefined
  location?: StudioLocation | undefined
  onNavigate?: ((next: StudioLocation) => void) | undefined
  account?: StudioAccount
  notifications?: StudioNotification[]
  banner?: ReactNode
  cloudEnabled?: boolean
  telemetryEnabled?: boolean
  /** Storybook-only design content. Live projects use the tenant telemetry connection. */
  analyticsPreview?: ReactNode
  deploymentsPreview?: ReactNode
  deploymentMapEnabled?: boolean
  loadReleaseChanges?: LoadReleaseChanges | undefined
  storageReady?: boolean
  templateCatalog?: typeof templates | undefined
}) {
  const [useNavigation] = useState(() =>
    createDashboardStore({ page: initialPage, projectId: project.id, versionId: initialVersion })
  )
  const navigationState = useNavigation()
  const current = location ?? navigationState.location
  const active =
    current.projectId === project.id ? project : (projects.find((item) => item.id === current.projectId) ?? project)
  const page = current.page
  const [section, setSection] = useState(initialSection)
  const [selectedStarter, setSelectedStarter] = useState<TemplateId>()
  const [configurationEntry, setConfigurationEntry] = useState<"repository" | "sandbox">()
  const [connectDomain, setConnectDomain] = useState(initialDomain === "connect")
  const [operation, setOperation] = useState<{
    kind: OperationPanel
    version?: Release | undefined
    preview?: PullRequestPreview | undefined
  } | null>(initialPanel ? { kind: initialPanel } : null)
  function setPanel(kind: OperationPanel, version?: Release, preview?: PullRequestPreview) {
    setOperation({ kind, version, preview })
  }
  const release = active.releases.find((version) => version.id === current.versionId) ?? null
  const { setOpenMobile } = useSidebar()
  const [loadState, setLoadState] = useState(viewState)
  const [offline, setOffline] = useState(disconnected)
  function go(next: StudioLocation) {
    setConfigurationEntry(undefined)
    navigationState.navigate(next)
    onNavigate?.(next)
    setOpenMobile(false)
    setOperation(null)
    setConnectDomain(false)
  }
  function inspectVersion(version: Release) {
    go({ page: "deployments", projectId: active.id, versionId: version.id })
  }
  function navigate(next: ProjectPage) {
    setConfigurationEntry(undefined)
    go({ page: next, projectId: next === "projects" || next === "create" ? undefined : active.id })
  }
  function select(next: ProjectModel) {
    setSection("versions")
    go({ page: "overview", projectId: next.id })
  }
  function beginCreation(template?: TemplateId) {
    setSelectedStarter(template)
    navigate("create")
  }
  function configureHosting(target: "repository" | "sandbox") {
    go({ page: "configure", projectId: active.id })
    setConfigurationEntry(target)
  }
  const isHome = page === "projects"
  const isCreating = page === "create" || page === "configure"
  const title = match(page)
    .with("projects", () => "Dashboard")
    .with("create", () => "Create a project")
    .with("configure", () => "Configure project")
    .with("overview", () => active.name)
    .otherwise((value) => navigation.find((item) => item.id === value)!.label)
  const editable = canEdit && Boolean(onAction) && loadState === "ready" && storageReady
  const operable = editable && cloudEnabled
  const sidebar = (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-4 pb-2 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("projects")}
              aria-label="SpawnKit dashboard"
              tooltip="SpawnKit dashboard"
              className="h-10 gap-2.5 hover:bg-transparent"
            >
              <BrandSymbol />
              <BrandWordmark className="group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <ProjectSwitcher
          projects={projects}
          active={isHome || isCreating ? null : { ...active, name: active.name || "Loading project" }}
          onSelect={(selected) => {
            const next = projects.find((item) => item.id === selected.id)
            if (next) select(next)
          }}
          onAll={() => navigate("projects")}
          onCreate={() => beginCreation()}
        />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Project navigation">
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("projects")}
                  isActive={isHome}
                  aria-current={isHome ? "page" : undefined}
                  aria-label="Dashboard"
                  tooltip="Dashboard"
                  className="h-9"
                >
                  <Gauge />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          {!isHome && !isCreating && (
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarMenu>
                {navigation.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      onClick={() => navigate(id)}
                      isActive={page === id}
                      aria-current={page === id ? "page" : undefined}
                      aria-label={label}
                      tooltip={label}
                      className="h-9"
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </nav>
      </SidebarContent>
      <SidebarFooter className="gap-3 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton tooltip="spawn CLI" aria-label="spawn CLI" className="text-muted-foreground">
                  <Terminal />
                  <span>spawn CLI</span>
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-64 rounded-xl">
                <p className="mb-3 text-sm font-medium">Start from your terminal</p>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                  <code className="text-xs">npx spawn init</code>
                  <CopyButton value="npx spawn init" label="Copy init command" compact />
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="bg-sidebar-border" />
        <SidebarAccount account={account} />
      </SidebarFooter>
    </Sidebar>
  )
  const actions = isHome ? (
    <Button onClick={() => beginCreation()} disabled={!editable}>
      <Plus />
      Create project
    </Button>
  ) : page === "overview" || page === "deployments" ? (
    <>
      {!cloudEnabled && (
        <Button variant="outline" disabled={!editable} onClick={() => navigate("configure")}>
          <Settings2 />
          Edit configuration
        </Button>
      )}
      <Button variant="outline" disabled={!operable || !active.production.release} onClick={() => setPanel("rollback")}>
        <RotateCcw />
        Rollback
      </Button>
      <Button disabled={!operable} onClick={() => setPanel("deploy")}>
        <Plus />
        New version
      </Button>
    </>
  ) : page === "domains" ? (
    <Button disabled={!editable} onClick={() => setConnectDomain(true)}>
      <Plus />
      Connect domain
    </Button>
  ) : page === "settings" ? (
    <Button type="submit" form="project-settings-form" disabled={!editable}>
      <Save />
      Save changes
    </Button>
  ) : page === "backend" && !cloudEnabled ? (
    <Button variant="outline" disabled={!editable} onClick={() => navigate("configure")}>
      <Settings2 />
      Edit configuration
    </Button>
  ) : page === "backend" && active.mode === "multiplayer" ? (
    <>
      <Button variant="outline" disabled={!operable} onClick={() => setPanel("restart")}>
        <RefreshCw />
        Restart
      </Button>
      <Button type="submit" form="project-backend-form" disabled={!operable}>
        <Save />
        Save configuration
      </Button>
    </>
  ) : null
  return (
    <>
      {sidebar}
      <SidebarInset className="min-w-0">
        <StudioHeader
          project={active}
          projects={projects}
          page={page}
          title={title}
          release={release}
          notifications={notifications}
          onNavigate={(next) => {
            setSection("versions")
            go(next)
          }}
          onCreate={() => beginCreation()}
          canCreate={editable}
        />
        <main id="main" className="mx-auto w-full max-w-[1500px] px-5 py-7 md:px-8 md:py-9">
          {banner && <div className="mb-5">{banner}</div>}
          {!release &&
            !(page === "deployments" && (deploymentsPreview || (deploymentMapEnabled && !current.environmentId))) && (
              <PageHeader
                title={title}
                description={descriptions[page]}
                actions={actions}
                eyebrow={
                  !isHome && page === "overview" ? (
                    <>
                      <span>{active.mode === "multiplayer" ? "Multiplayer" : "Single-player"}</span>
                      {active.services.length > 0 && <span className="border-l pl-2">Game services</span>}
                    </>
                  ) : undefined
                }
              />
            )}
          {!canEdit && (
            <div className="mb-5">
              <Notice tone="info">You have view access. Changes require a project owner.</Notice>
            </div>
          )}
          {loadState === "loading" || !storageReady ? (
            <div aria-busy="true" aria-label="Loading project" className="space-y-6">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading project…
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-32 animate-pulse rounded-xl border bg-muted/60" />
                ))}
              </div>
              <div className="h-80 animate-pulse rounded-xl border bg-muted/40" />
            </div>
          ) : loadState === "error" ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                icon={<RefreshCw />}
                title="Couldn't load this project"
                description="The connection was interrupted. Your game is still running."
                action={
                  <Button onClick={() => setLoadState("ready")}>
                    <RefreshCw />
                    Try again
                  </Button>
                }
              />
            </div>
          ) : (
            <div key={page === "create" ? "create" : `${active.id}-${page}`}>
              {release ? (
                <VersionDetail
                  key={release.id}
                  project={active}
                  version={release}
                  canEdit={operable}
                  onBack={() =>
                    deploymentMapEnabled
                      ? go({ page: "deployments", projectId: active.id, deploymentView: "releases" })
                      : navigate("deployments")
                  }
                  onAction={setPanel}
                />
              ) : isCreating ? (
                <ProjectCreation
                  projectId={active.id}
                  canEdit={editable}
                  onAction={onAction}
                  initialStep={
                    configurationEntry && page === "configure"
                      ? 2
                      : (initialCreationStep ?? (page === "configure" ? 1 : 0))
                  }
                  initialDraft={
                    page === "configure"
                      ? {
                          ...active.configuration,
                          ...(configurationEntry === "sandbox" ? { sandbox: true } : {}),
                          ...(configurationEntry === "repository" && active.configuration?.github.mode === "none"
                            ? { github: { ...active.configuration.github, mode: "connect" as const } }
                            : {})
                        }
                      : selectedStarter
                        ? { ...initialDraft, template: selectedStarter }
                        : initialDraft
                  }
                  editing={page === "configure"}
                  templateCatalog={templateCatalog}
                  onCancel={() => navigate(page === "configure" ? "overview" : "projects")}
                  onCreated={(id) => go({ page: "overview", projectId: id })}
                />
              ) : isHome ? (
                <ProjectCollection
                  projects={projects}
                  onOpen={select}
                  onCreate={beginCreation}
                  onProjectPage={(selected, next) => {
                    setSection("versions")
                    go({ page: next, projectId: selected.id })
                  }}
                  canCreate={editable}
                  templateCatalog={templateCatalog}
                />
              ) : page === "overview" ? (
                <Overview
                  project={active}
                  canEdit={operable}
                  onPage={navigate}
                  onAction={setPanel}
                  onRelease={inspectVersion}
                  onDeployments={(next) => {
                    setSection(next)
                    if (deploymentMapEnabled)
                      go({
                        page: "deployments",
                        projectId: active.id,
                        deploymentView:
                          next === "versions" ? "releases" : next === "activity" ? "activity" : "environments"
                      })
                    else navigate("deployments")
                  }}
                  onConfigureSandbox={!cloudEnabled && editable ? () => configureHosting("sandbox") : undefined}
                />
              ) : page === "deployments" ? (
                (deploymentsPreview ??
                (deploymentMapEnabled ? (
                  <ProjectDeployments
                    project={active}
                    canEdit={operable}
                    environmentId={current.environmentId}
                    view={current.deploymentView}
                    onNavigate={go}
                    onAction={setPanel}
                    onConfigureHosting={!cloudEnabled && editable ? configureHosting : undefined}
                  />
                ) : (
                  <VersionConsole
                    project={active}
                    canEdit={operable}
                    onVersion={inspectVersion}
                    onAction={setPanel}
                    initialSection={section}
                    onConfigureHosting={editable ? configureHosting : undefined}
                  />
                )))
              ) : page === "domains" ? (
                <Domains
                  project={active}
                  canEdit={editable}
                  cloudEnabled={cloudEnabled}
                  onAction={onAction}
                  connectOpen={connectDomain}
                  onConnectOpenChange={setConnectDomain}
                  initialDomain={initialDomain === "connect" ? undefined : initialDomain}
                />
              ) : page === "analytics" ? (
                (analyticsPreview ??
                (telemetryEnabled ? (
                  <LiveTelemetry
                    key={active.id}
                    projectId={active.id}
                    sandbox={Boolean(active.sandbox)}
                    canEdit={editable}
                  />
                ) : (
                  <Notice>
                    Analytics is not connected. Connect a tenant telemetry backend to see captured game events and error
                    groups. No sample observations are shown for this project.
                  </Notice>
                )))
              ) : page === "logs" ? (
                <Logs project={active} disconnected={offline} onReconnect={() => setOffline(false)} />
              ) : page === "users" ? (
                <ProjectUsers project={active} canEdit={operable} onAction={onAction} />
              ) : page === "settings" ? (
                <ProjectSettings
                  project={active}
                  canEdit={editable}
                  onAction={onAction}
                  onConfigureSource={editable ? () => configureHosting("repository") : undefined}
                />
              ) : (
                <Backend project={active} canEdit={operable} onAction={onAction} />
              )}
            </div>
          )}
        </main>
      </SidebarInset>
      {operation &&
        (deploymentMapEnabled && (operation.kind === "promote" || operation.kind === "rollback") ? (
          <ReleaseReview
            key={`${active.id}-${operation.kind}-${operation.version?.id ?? ""}`}
            project={active}
            kind={operation.kind}
            version={operation.version}
            onClose={() => setOperation(null)}
            onAction={onAction}
            canEdit={operable}
            onVersion={inspectVersion}
            loadChanges={loadReleaseChanges}
          />
        ) : (
          <VersionActionSheet
            key={`${active.id}-${operation.kind}-${operation.version?.id ?? ""}`}
            project={active}
            panel={operation.kind}
            version={operation.version}
            preview={operation.preview}
            onClose={() => setOperation(null)}
            onAction={onAction}
            canEdit={operable}
            initialState={operationState}
          />
        ))}
    </>
  )
}
