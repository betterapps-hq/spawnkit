import {
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  Globe2,
  LoaderCircle,
  Rocket,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { SelectField } from "../select-field"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import type { ActionHandler, OperationPanel, ProjectModel, PullRequestPreview, Release } from "./model"
import { Notice } from "./primitives"

const titles: Record<OperationPanel, string> = {
  deploy: "Create a new version",
  promote: "Promote to production",
  rollback: "Roll back production",
  restart: "Restart backend",
  "enable-sandbox": "Enable Sandbox",
  "stage-version": "Deploy version to Sandbox",
  "retry-preview": "Rebuild PR preview",
  "close-preview": "Close PR preview",
  "enable-previews": "Enable PR previews"
}
export function VersionActionSheet({
  project,
  panel,
  onClose,
  onAction,
  canEdit,
  initialState = "idle",
  version,
  preview
}: {
  project: ProjectModel
  panel: OperationPanel
  onClose: () => void
  onAction?: ActionHandler | undefined
  canEdit: boolean
  initialState?: "idle" | "pending" | "success" | "error"
  version?: Release | undefined
  preview?: PullRequestPreview | undefined
}) {
  const [state, setState] = useState(initialState)
  const [error, setError] = useState(
    initialState === "error"
      ? "Production changed while you were reviewing. Refresh the version list and review the new production version before trying again."
      : ""
  )
  const [target, setTarget] = useState(project.sandbox ? "sandbox" : "production")
  const [branch, setBranch] = useState("main")
  const [search, setSearch] = useState("")
  const [rollout, setRollout] = useState("drain")
  const candidates = project.releases.filter(
    (item) =>
      item.status === "ready" &&
      item.id !== project.production.release?.id &&
      item.number < (project.production.release?.number ?? Infinity)
  )
  const [selectedId, setSelectedId] = useState(
    version?.id ??
      (panel === "rollback"
        ? candidates.find((item) => item.retained && item.compatible)?.id
        : project.sandbox?.release?.id) ??
      ""
  )
  const selected = project.releases.find((item) => item.id === selectedId)
  const isVersionAction = ["promote", "rollback", "stage-version"].includes(panel)
  const destination = panel === "stage-version" ? project.sandbox : project.production
  const checks = [
    { label: "Successful build", passed: selected?.status === "ready" },
    { label: "Artifact retained", passed: Boolean(selected?.retained && selected.build.artifact) },
    { label: "Compatible schema", passed: Boolean(selected?.compatible) }
  ]
  const blocked = isVersionAction
    ? checks.some((check) => !check.passed) || !destination || selected?.id === destination.release?.id
    : panel === "enable-sandbox"
      ? Boolean(project.sandbox)
      : panel === "deploy"
        ? !project.repository || !branch.trim()
        : panel === "enable-previews"
          ? !project.repository || project.previewsEnabled
          : panel === "retry-preview" || panel === "close-preview"
            ? !preview
            : false
  async function submit() {
    if (!canEdit || !onAction || blocked || state === "pending") return
    setError("")
    setState("pending")
    try {
      await onAction({
        kind: panel,
        projectId: project.id,
        values: {
          versionId: selected?.id,
          environment: panel === "deploy" ? target : panel === "stage-version" ? "sandbox" : "production",
          expectedVersionId: destination?.release?.id ?? null,
          rollout,
          branch: branch.trim(),
          previewId: preview?.id
        }
      })
      setState("success")
    } catch {
      setState("error")
      setError("We couldn't confirm this request. Check deployment status before trying again.")
    }
  }
  const label =
    panel === "promote"
      ? "Promote version"
      : panel === "rollback"
        ? "Roll back to version"
        : panel === "stage-version"
          ? "Deploy to Sandbox"
          : panel === "deploy"
            ? "Build version"
            : panel === "close-preview"
              ? "Close preview"
              : panel === "retry-preview"
                ? "Rebuild preview"
                : panel === "enable-previews"
                  ? "Enable previews"
                  : panel === "enable-sandbox"
                    ? "Enable Sandbox"
                    : "Restart runtime"
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && state !== "pending") onClose()
      }}
    >
      <SheetContent
        showCloseButton={state !== "pending"}
        className={cn("w-full gap-0 overflow-y-auto", isVersionAction ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <SheetHeader className="border-b p-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            <Box className="size-3" />
            {project.name}
          </div>
          <SheetTitle className="text-xl font-semibold">{titles[panel]}</SheetTitle>
          <SheetDescription>
            {isVersionAction
              ? "Review the exact version and environment changes before activation."
              : panel === "deploy"
                ? "Build source once. Deploy the resulting version to your environments."
                : "Review this configuration change."}
          </SheetDescription>
        </SheetHeader>
        {state === "success" ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="size-8" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold">Request submitted</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              {isVersionAction
                ? "Track activation and room draining in deployment activity. The version and its build artifact remain unchanged."
                : "Follow this operation in your project."}
            </p>
            <Button className="mt-7" onClick={onClose}>
              Back to project
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 p-6">
              {panel === "rollback" && (
                <div>
                  <Label htmlFor="rollback-search">Find a version</Label>
                  <Input
                    id="rollback-search"
                    className="mt-2"
                    placeholder="Version number, branch, or commit…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <div
                    className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border p-2"
                    role="radiogroup"
                    aria-label="Rollback version"
                  >
                    {candidates
                      .filter((item) =>
                        `${item.number} ${item.title} ${item.commit} ${item.branch}`
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      )
                      .map((item) => (
                        <label
                          aria-label={`Version v${item.number}`}
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 rounded-md p-3",
                            selectedId === item.id
                              ? "bg-accent [&_.text-muted-foreground]:text-foreground"
                              : "hover:bg-muted",
                            (!item.compatible || !item.retained) && "opacity-50"
                          )}
                        >
                          <input
                            type="radio"
                            name="rollback-version"
                            className="accent-primary"
                            checked={selectedId === item.id}
                            onChange={() => setSelectedId(item.id)}
                            disabled={!item.compatible || !item.retained || state === "pending"}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="font-mono text-xs font-semibold">v{item.number}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {!item.retained
                                  ? "Artifact expired"
                                  : !item.compatible
                                    ? "Schema incompatible"
                                    : item.environment}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{item.title}</span>
                          </span>
                        </label>
                      ))}
                    {!candidates.length && (
                      <p className="p-4 text-sm text-muted-foreground">No earlier versions are available.</p>
                    )}
                  </div>
                </div>
              )}
              {isVersionAction && (
                <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_24px_1fr]">
                    <div className="rounded-lg border bg-muted/25 p-4">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Current {destination?.name ?? "environment"}
                      </p>
                      <p className="mt-3 font-mono text-xl font-semibold">
                        {destination?.release ? `v${destination.release.number}` : "Not deployed"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {destination?.release?.title ?? "No active version"}
                      </p>
                    </div>
                    <ArrowRight className="hidden self-center text-muted-foreground sm:block" />
                    <div className="rounded-lg border border-primary/30 bg-accent/30 p-4">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-primary">Target version</p>
                      <p className="mt-3 font-mono text-xl font-semibold">
                        {selected ? `v${selected.number}` : "No version selected"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selected?.title ?? "Build a compatible version first."}
                      </p>
                    </div>
                  </div>
                  <section className="rounded-lg border">
                    <div className="flex items-center gap-2 border-b px-4 py-3 text-xs font-medium">
                      <ShieldCheck className="size-4 text-primary" />
                      Deployment readiness
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-3">
                      {checks.map((check) => (
                        <div key={check.label} className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full",
                              check.passed
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            )}
                          >
                            {check.passed ? <Check className="size-3" /> : "!"}
                          </span>
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold">What changes</h2>
                    <dl className="space-y-3 text-xs">
                      {[
                        [
                          "Serving version",
                          `${destination?.release ? `v${destination.release.number}` : "None"} → ${selected ? `v${selected.number}` : "None"}`
                        ],
                        ["Domain", destination?.url ?? "No environment"],
                        [
                          "Runtime regions",
                          destination?.regions.map((region) => region.city).join(", ") || "Global static hosting"
                        ],
                        ["Secrets & configuration", "Keep destination values"],
                        ["Player data & database", "Preserved; no schema rollback"],
                        ["Build artifact", "Reused without rebuilding"]
                      ].map(([key, value]) => (
                        <div key={key} className="flex flex-wrap justify-between gap-3 border-b pb-3">
                          <dt className="text-muted-foreground">{key}</dt>
                          <dd className="max-w-[65%] break-words text-right font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  {project.mode === "multiplayer" && (
                    <fieldset disabled={state === "pending"}>
                      <legend className="mb-3 text-sm font-semibold">Existing game sessions</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            id: "drain",
                            title: "Let rooms finish",
                            body: "New rooms use the target version. Existing rooms finish on their current version."
                          },
                          {
                            id: "reconnect",
                            title: "Reconnect players",
                            body: "Close existing rooms after activation. Players reconnect to the target version."
                          }
                        ].map((option) => (
                          <label
                            key={option.id}
                            aria-label={option.title}
                            className={cn(
                              "cursor-pointer rounded-lg border p-4",
                              rollout === option.id && "border-primary bg-accent/25"
                            )}
                          >
                            <span className="flex items-center gap-2 text-xs font-semibold">
                              <input
                                type="radio"
                                name="session-policy"
                                checked={rollout === option.id}
                                onChange={() => setRollout(option.id)}
                                className="accent-primary"
                              />
                              {option.title}
                            </span>
                            <span className="mt-2 block text-xs leading-5 text-muted-foreground">{option.body}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {blocked && (
                    <Notice>
                      This version cannot be activated in the selected environment. Review the readiness checks and
                      current version.
                    </Notice>
                  )}
                </>
              )}
              {panel === "deploy" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4">
                    <GitBranch className="size-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{project.repository ?? "CLI source upload"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {project.repository
                          ? "Connected GitHub repository"
                          : "Publish local source through the spawn CLI"}
                      </p>
                    </div>
                  </div>
                  {project.repository ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="version-branch">Source branch</Label>
                        <Input id="version-branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version-target">Deploy after building</Label>
                        <SelectField
                          id="version-target"
                          label="Target environment"
                          value={target}
                          onChange={setTarget}
                          options={[
                            { value: "production", label: "Production" },
                            ...(project.sandbox ? [{ value: "sandbox", label: "Sandbox" }] : [])
                          ]}
                        />
                      </div>
                      <div className="rounded-lg border p-4">
                        <h3 className="text-xs font-semibold">Build pipeline</h3>
                        <ol className="mt-3 space-y-3 text-xs text-muted-foreground">
                          {[
                            "Resolve the selected commit",
                            "Build and run checks in isolation",
                            "Store the immutable artifact",
                            "Activate in the selected environment"
                          ].map((stage, index) => (
                            <li key={stage} className="flex items-center gap-2">
                              <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px]">
                                {index + 1}
                              </span>
                              {stage}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  ) : (
                    <Notice tone="info">
                      Connect a repository in project settings to create versions here, or use the CLI to upload local
                      source.
                    </Notice>
                  )}
                </div>
              )}
              {panel === "enable-sandbox" && (
                <div className="rounded-xl border p-5">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="mt-4 text-base font-semibold">One shared staging environment</h2>
                  <p className="mt-3 text-2xl font-semibold">
                    $5<span className="text-sm font-normal text-muted-foreground"> / month + usage</span>
                  </p>
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    {project.mode === "multiplayer"
                      ? "Configure regions and compute independently from production."
                      : "Static hosting for your single-player game. No multiplayer compute is needed."}
                  </p>
                </div>
              )}
              {panel === "restart" && (
                <Notice tone="info">
                  Restarting production may disconnect current players. Persistent player data and environment
                  configuration are preserved.
                </Notice>
              )}
              {["retry-preview", "close-preview", "enable-previews"].includes(panel) && (
                <div className="space-y-5">
                  <div className="rounded-xl border p-5">
                    <GitPullRequest className="size-5 text-primary" />
                    <h2 className="mt-4 text-base font-semibold">
                      {preview ? `PR #${preview.number}: ${preview.title}` : "One isolated preview per open PR"}
                    </h2>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">
                      {panel === "close-preview"
                        ? "Stop this preview's runtime and remove its routing. Production and Sandbox are unaffected. Retained version artifacts remain available."
                        : panel === "retry-preview"
                          ? "Build the latest pull request commit and update this preview after checks pass. The current preview remains available until replacement."
                          : "New commits update the preview automatically. Closing or merging a pull request schedules its environment for cleanup."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe2 className="size-4" />
                    {project.mode === "multiplayer"
                      ? "Separate runtime and data per preview"
                      : "Static hosting; no multiplayer runtime"}
                  </div>
                  <Notice tone="info">
                    Preview pricing and retention policy still need to be finalized. This design does not quote a
                    preview charge.
                  </Notice>
                </div>
              )}
              {error && <Notice>{error}</Notice>}
              {!canEdit && <Notice tone="info">You have view access. A project owner must submit this change.</Notice>}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card px-6 py-4">
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                {selected && isVersionAction ? `v${selected.number} / ${selected.commit}` : project.name}
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" disabled={state === "pending"} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!canEdit || !onAction || blocked || state === "pending"}
                  onClick={() => void submit()}
                >
                  {state === "pending" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Rocket className="size-4" />
                  )}
                  {state === "pending" ? "Submitting…" : label}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
