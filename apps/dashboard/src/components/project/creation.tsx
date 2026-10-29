import { createProjectPlan } from "@spawn/templates"
import {
  templates,
  platformOptions,
  physicsOptions,
  uiOptions,
  telemetryOptions,
  validateProjectName
} from "@spawn/templates/catalog"
import { useForm } from "@tanstack/react-form"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe2,
  LoaderCircle,
  Rocket,
  SlidersHorizontal,
  Terminal
} from "lucide-react"
import { useState } from "react"
import invariant from "tiny-invariant"
import { githubError } from "@/lib/github-selection"
import { ProjectInputError } from "@/lib/project-records"
import { cn } from "@/lib/utils"
import { AddonCards } from "../addon-cards"
import { CatalogCard, CatalogGrid } from "../catalog-card"
import { CatalogToolbar } from "../catalog-toolbar"
import { ComputeRegions } from "../compute-regions"
import { CopyButton } from "../copy-button"
import { CostEstimate } from "../cost-estimate"
import { GitHubConfig } from "../github-config"
import { ModuleCards } from "../module-cards"
import { ServiceCards } from "../multiplayer-config"
import { DatabaseConfig, Environments } from "../project-infrastructure"
import { Toolchain } from "../toolchain"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { defaultProjectDraft, projectSlug, scaffoldCommand, type ProjectDraft } from "./creation-model"
import type { ActionHandler } from "./model"
import { Notice } from "./primitives"

const steps = ["Starter kit", "Configure", "Hosting", "Review"]
const headings = ["Choose your starting point", "Make it your own", "Choose how your game runs", "Review your project"]
export function ProjectCreation({
  projectId,
  onAction,
  onCancel,
  onCreated,
  initialStep = 0,
  initialDraft,
  canEdit,
  editing = false,
  templateCatalog = templates
}: {
  projectId: string
  onAction?: ActionHandler | undefined
  onCancel: () => void
  onCreated: (id: string) => void
  initialStep?: number | undefined
  initialDraft?: Partial<ProjectDraft> | undefined
  canEdit: boolean
  editing?: boolean
  templateCatalog?: typeof templates | undefined
}) {
  const [draft, setDraft] = useState<ProjectDraft>({ ...defaultProjectDraft, ...initialDraft })
  const [step, setStep] = useState(initialStep)
  const [furthest, setFurthest] = useState(initialStep)
  const [search, setSearch] = useState("")
  const [dimension, setDimension] = useState("all")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const form = useForm({ defaultValues: { name: initialDraft?.name ?? "" }, onSubmit: () => {} })
  const template = templateCatalog.find((item) => item.id === draft.template)
  invariant(template, "The selected starter kit must exist in the catalog")
  const patch = (update: Partial<ProjectDraft>) => setDraft((current) => ({ ...current, ...update }))
  const slug = projectSlug(draft.name)
  const nameError =
    !draft.name.trim() || draft.name.trim().length > 64
      ? "Enter a project name between 1 and 64 characters."
      : validateProjectName(slug)
  const sourceError = githubError(draft.github)
  const filtered = templateCatalog.filter(
    (item) =>
      (dimension === "all" || dimension === item.dimension) &&
      `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())
  )
  const locations =
    draft.mode === "multiplayer"
      ? [
          ...draft.productionLocations.map((location) => ({ ...location, environment: "production" as const })),
          ...(draft.sandbox
            ? draft.sandboxLocations.map((location) => ({ ...location, environment: "sandbox" as const }))
            : [])
        ]
      : []
  const command = scaffoldCommand(draft)
  function move(next: number) {
    if (pending) return
    const validation = step === 1 && next > step ? nameError : step === 2 && next > step ? sourceError : null
    if (validation) {
      setError(validation)
      return
    }
    setError("")
    setStep(next)
    setFurthest(Math.max(furthest, next))
    document.getElementById("creation-steps")?.scrollIntoView({ block: "start", behavior: "instant" })
  }
  async function create() {
    if (!canEdit || !onAction || pending) return
    if (nameError || sourceError) {
      setError(nameError ?? sourceError ?? "Check your project settings.")
      return
    }
    try {
      createProjectPlan({
        name: slug,
        template: draft.template,
        addons: draft.addons,
        physics: draft.physics,
        ui: draft.ui,
        telemetry: draft.telemetry
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This combination cannot be generated.")
      return
    }
    setPending(true)
    setError("")
    try {
      const result = await onAction({
        kind: editing ? "save-project" : "create-project",
        projectId,
        values: {
          ...draft,
          name: draft.name.trim(),
          slug,
          previews: draft.github.mode !== "none" && draft.previews,
          productionLocations: draft.mode === "multiplayer" ? draft.productionLocations : [],
          sandboxLocations: draft.sandbox && draft.mode === "multiplayer" ? draft.sandboxLocations : []
        }
      })
      if (!result?.projectId) throw new Error("No project returned")
      setCreated(result.projectId)
    } catch (reason) {
      setError(
        reason instanceof ProjectInputError
          ? reason.message
          : "We couldn't confirm project creation. Your choices are saved here. Check your project list before retrying."
      )
    } finally {
      setPending(false)
    }
  }
  if (created)
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">{editing ? `${draft.name} updated` : `${draft.name} is ready`}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your project configuration is saved. Open the project to prepare its first version.
        </p>
        <Button className="mt-6" onClick={() => onCreated(created)}>
          Open project
          <ArrowRight />
        </Button>
      </div>
    )
  return (
    <div className="space-y-7">
      <nav
        id="creation-steps"
        aria-label="Project creation steps"
        className="scroll-mt-6 rounded-xl border bg-card px-3 py-3 sm:px-5"
      >
        <ol className="grid grid-cols-4 gap-2">
          {steps.map((label, i) => (
            <li key={label}>
              <button
                disabled={i > furthest || pending}
                onClick={() => move(i)}
                aria-current={step === i ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-md px-1 py-1 text-[11px] sm:flex-row sm:gap-3 sm:text-xs",
                  step === i ? "font-medium text-foreground" : "text-muted-foreground",
                  i > furthest && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                    step === i && "border-primary bg-primary text-white",
                    i < step && "border-primary/20 bg-accent text-primary"
                  )}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">{headings[step]}</h2>
          <fieldset disabled={pending || !canEdit} className="min-w-0">
            <legend className="sr-only">{headings[step]}</legend>
            {step === 0 && (
              <div className="space-y-5">
                <CatalogToolbar
                  label="templates"
                  search={search}
                  onSearch={setSearch}
                  dimension={dimension}
                  onDimension={setDimension}
                />
                <CatalogGrid>
                  {filtered.map((item) => (
                    <CatalogCard
                      key={item.id}
                      name={item.name}
                      description={item.description}
                      image={`/templates/${item.id}.webp`}
                      engine={item.id}
                      dimension={item.dimension}
                      recommended={["pixi", "babylon"].includes(item.id)}
                      selected={draft.template === item.id}
                      onSelect={() => {
                        if (item.id !== draft.template) patch({ template: item.id, physics: "none", ui: "html" })
                      }}
                    />
                  ))}
                </CatalogGrid>
                {!filtered.length && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm">
                    <p>No starter kits match your search.</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearch("")
                        setDimension("all")
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            )}
            {step === 1 && (
              <div className="rounded-xl border bg-card p-5 sm:p-6">
                <form.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="creation-name">Project name</Label>
                      <Input
                        id="creation-name"
                        placeholder="My first game"
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value)
                          patch({ name: event.target.value })
                        }}
                        onBlur={field.handleBlur}
                        aria-invalid={Boolean(error && nameError)}
                        aria-describedby="creation-name-hint"
                        maxLength={64}
                      />
                      <p id="creation-name-hint" className="text-[11px] text-muted-foreground">
                        Folder name: <span className="font-mono">{slug || "my-first-game"}</span>
                      </p>
                    </div>
                  )}
                </form.Field>
                <ModuleCards
                  title="Platform"
                  kind="platform"
                  value="web"
                  options={platformOptions}
                  onChange={() => {}}
                />
                <ModuleCards
                  title="Game mode"
                  kind="mode"
                  value={draft.mode}
                  options={[
                    { id: "single", name: "Single-player" },
                    { id: "multiplayer", name: "Multiplayer" }
                  ]}
                  onChange={(mode) => patch({ mode })}
                />
                <details className="group mt-7 border-t pt-5">
                  <summary className="flex list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <SlidersHorizontal className="size-4 text-primary" />
                    <span>Customize your stack</span>
                    <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-1">
                    <Toolchain />
                    <AddonCards selected={draft.addons} onChange={(addons) => patch({ addons })} />
                    <ModuleCards
                      title="Physics"
                      kind="physics"
                      value={draft.physics}
                      options={physicsOptions.filter((option) =>
                        (option.renderers as readonly string[]).includes(draft.template)
                      )}
                      onChange={(physics) => patch({ physics })}
                    />
                    <ModuleCards
                      title="Game interface"
                      kind="ui"
                      value={draft.ui}
                      options={[
                        ...uiOptions.filter((option) =>
                          (option.renderers as readonly string[]).includes(draft.template)
                        ),
                        { id: "react" as const, name: "React", disabled: true }
                      ]}
                      onChange={(ui) => {
                        if (ui !== "react") patch({ ui })
                      }}
                    />
                    <ModuleCards
                      title="Telemetry"
                      kind="telemetry"
                      value={draft.telemetry}
                      options={telemetryOptions}
                      onChange={(telemetry) => patch({ telemetry })}
                    />
                  </div>
                </details>
              </div>
            )}
            {step === 2 && (
              <div className="rounded-xl border bg-card p-5 sm:p-6 [&>fieldset:first-child]:mt-0">
                <GitHubConfig
                  value={draft.github}
                  onConnect={
                    editing && onAction
                      ? async () => {
                          if (pending) return
                          setPending(true)
                          setError("")
                          try {
                            await onAction({ kind: "save-project", projectId, values: { ...draft } })
                            await onAction({ kind: "connect-repository", projectId, values: {} })
                          } catch (cause) {
                            setError(cause instanceof Error ? cause.message : "GitHub connection failed.")
                          } finally {
                            setPending(false)
                          }
                        }
                      : undefined
                  }
                  onChange={(github) => patch({ github, ...(github.mode === "none" ? { previews: false } : {}) })}
                />
                <Environments
                  multiplayer={draft.mode === "multiplayer"}
                  github={draft.github.mode !== "none"}
                  previews={draft.previews}
                  onPreviews={(previews) => patch({ previews })}
                  sandbox={draft.sandbox}
                  onChange={(sandbox) => patch({ sandbox })}
                />
                {draft.mode === "multiplayer" && (
                  <>
                    <ComputeRegions
                      environment="production"
                      locations={draft.productionLocations}
                      onChange={(productionLocations) => patch({ productionLocations })}
                    />
                    {draft.sandbox && (
                      <ComputeRegions
                        environment="sandbox"
                        locations={draft.sandboxLocations}
                        onChange={(sandboxLocations) => patch({ sandboxLocations })}
                      />
                    )}
                  </>
                )}
                <ServiceCards enabled selected={draft.services} onChange={(services) => patch({ services })} />
                <DatabaseConfig database={draft.database} onDatabase={(database) => patch({ database })} />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <img src={`/templates/${draft.template}.webp`} alt="" className="size-14 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold">{draft.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.name} / {template.dimension.toUpperCase()} /{" "}
                        {draft.mode === "single" ? "Single-player" : "Multiplayer"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => move(1)}>
                      Edit
                    </Button>
                  </div>
                  <dl className="mt-6 divide-y text-xs">
                    {[
                      ["Platform", "Web"],
                      ["Language", "TypeScript"],
                      ["Runtime", draft.mode === "multiplayer" ? "Node.js / Colyseus" : "Browser"],
                      ["Environments", draft.sandbox ? "Production, Sandbox" : "Production"],
                      ["PR previews", draft.github.mode !== "none" && draft.previews ? "Enabled" : "Off"],
                      [
                        "Repository",
                        draft.github.mode === "none"
                          ? "Publish with the CLI"
                          : draft.github.mode === "create"
                            ? draft.github.name
                            : draft.github.url
                      ],
                      [
                        "Database",
                        draft.database === "none"
                          ? "None"
                          : `${draft.database === "postgresql" ? "PostgreSQL" : "SQLite"} / Drizzle`
                      ],
                      ["Physics", physicsOptions.find((item) => item.id === draft.physics)!.name],
                      ["Game interface", uiOptions.find((item) => item.id === draft.ui)!.name],
                      ["Telemetry", telemetryOptions.find((item) => item.id === draft.telemetry)!.name],
                      ["Add-ons", draft.addons.join(", ") || "None"],
                      ["Game services", draft.services.length ? draft.services.join(", ") : "None"]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-6 py-3">
                        <dt className="shrink-0 text-muted-foreground">{label}</dt>
                        <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {draft.github.mode === "none" && (
                  <div className="rounded-xl border bg-card p-5">
                    <h3 className="flex items-center gap-2 text-xs font-medium">
                      <Terminal className="size-4 text-primary" />
                      Start locally
                    </h3>
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 pl-3 pr-1">
                      <code className="min-w-0 flex-1 break-all py-3 text-[11px] leading-5">{command}</code>
                      <CopyButton value={command} label="Copy scaffold command" compact />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      This command generates the client starter.{" "}
                      {draft.mode === "multiplayer" || draft.database !== "none" || draft.services.length
                        ? "Backend and service setup are saved in your project configuration."
                        : "Publish your source when you're ready for the first build."}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 text-xs leading-5 text-muted-foreground">
                  <Globe2 className="mt-0.5 size-4 shrink-0" />
                  Every environment gets a SpawnKit address. You can connect your own domain from the project.
                </div>
              </div>
            )}
          </fieldset>
          {error && (
            <div className="mt-5">
              <Notice>{error}</Notice>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
            <Button variant="ghost" disabled={pending} onClick={step === 0 ? onCancel : () => move(step - 1)}>
              <ArrowLeft />
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button disabled={!canEdit} onClick={() => move(step + 1)}>
                Continue
                <ArrowRight />
              </Button>
            ) : (
              <Button disabled={pending || !canEdit || !onAction} onClick={() => void create()}>
                {pending ? <LoaderCircle className="animate-spin" /> : <Rocket />}
                {pending ? "Creating project…" : editing ? "Save configuration" : "Create project"}
              </Button>
            )}
          </div>
        </div>
        <aside aria-label="Project configuration summary" className="space-y-4 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="relative h-28">
              <img src={`/templates/${draft.template}.webp`} alt="" className="h-full w-full object-cover" />
              <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">
                {template.dimension.toUpperCase()}
              </Badge>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{template.name}</h3>
                {step > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => move(0)} disabled={pending}>
                    Change
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  TypeScript
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Web
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {draft.mode === "single" ? "Single-player" : "Multiplayer"}
                </Badge>
              </div>
            </div>
          </div>
          <CostEstimate
            multiplayer={draft.mode === "multiplayer"}
            services={draft.services.length > 0}
            sandbox={draft.sandbox}
            customDatabase={draft.database !== "none"}
            previews={draft.github.mode !== "none" && draft.previews}
            locations={locations}
          />
        </aside>
      </div>
    </div>
  )
}
