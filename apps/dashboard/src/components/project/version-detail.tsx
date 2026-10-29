import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCheck,
  ChevronDown,
  FileCode2,
  GitBranch,
  GitCompareArrows,
  GitCommitHorizontal,
  LoaderCircle,
  Package,
  RotateCcw,
  ShieldCheck,
  X
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../copy-button"
import { SelectField } from "../select-field"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { BuildOutput } from "./build-output"
import { CommitLink } from "./commit-link"
import { MediaWarnings } from "./media-warnings"
import type { ProjectModel, Release } from "./model"
import { Notice, StatusBadge } from "./primitives"
import { releaseLabel } from "./release-label"
import { VersionTargets, type OpenVersionAction } from "./version-console"

export function VersionDetail({
  project,
  version,
  canEdit,
  canStage = canEdit,
  onBack,
  onAction
}: {
  project: ProjectModel
  version: Release
  canEdit: boolean
  canStage?: boolean
  onBack: () => void
  onAction: OpenVersionAction
}) {
  const [tab, setTab] = useState("overview")
  const [baselineId, setBaselineId] = useState(project.production.release?.id ?? "")
  const baseline = project.releases.find((item) => item.id === baselineId)
  const current = project.production.release?.id === version.id
  const older = Boolean(project.production.release && version.number < project.production.release.number)
  const eligible = version.status === "ready" && version.retained && version.compatible
  const passed = version.build.checks.filter((check) => check.status === "passed").length
  return (
    <div className="space-y-7">
      <Button variant="ghost" size="sm" className="-ml-2 text-xs text-muted-foreground" onClick={onBack}>
        <ArrowLeft />
        All versions
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border bg-card shadow-xs">
              <Box className="size-5 text-primary" />
            </span>
            <h1 tabIndex={-1} className="font-mono text-3xl font-semibold tracking-tight outline-none">
              {releaseLabel(version)}
            </h1>
            <StatusBadge status={version.status} />
            <VersionTargets project={project} version={version} />
          </div>
          <p className="mt-4 text-lg font-medium">{version.title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              {version.branch}
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <GitCommitHorizontal className="size-3.5" />
              <CommitLink repository={project.repository} sha={version.commit} />
            </span>
            <span>{version.actor}</span>
            <span>{version.time}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTab("compare")}>
            <GitCompareArrows />
            Compare
          </Button>
          {project.sandbox && (
            <Button
              variant="outline"
              disabled={!canEdit || !canStage || !eligible || project.sandbox.release?.id === version.id}
              onClick={() => onAction("stage-version", version)}
            >
              To Sandbox
            </Button>
          )}
          <Button
            disabled={!canEdit || !eligible || current}
            onClick={() => onAction(older ? "rollback" : "promote", version)}
          >
            {older ? <RotateCcw /> : <ArrowUpRight />}
            {current ? "Current production" : older ? "Roll back to version" : "Promote version"}
          </Button>
        </div>
      </div>
      <MediaWarnings warnings={version.build.mediaWarnings} />
      {!version.retained && version.status !== "building" && version.status !== "queued" && (
        <Notice>
          This version's artifact is unavailable. Its history remains visible, but it cannot be deployed or restored.
        </Notice>
      )}
      {!version.compatible && version.status !== "building" && version.status !== "queued" && (
        <Notice>
          This version expects a different database schema. Resolve compatibility before deploying it; code rollback
          does not reverse database changes.
        </Notice>
      )}
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-6">
        <div className="min-w-0 overflow-x-auto">
          <TabsList variant="line" className="min-w-full justify-start">
            {[
              { id: "overview", name: "Overview" },
              { id: "logs", name: "Build logs" },
              { id: "checks", name: `Checks (${passed}/${version.build.checks.length})` },
              { id: "changes", name: "Changes" },
              { id: "compare", name: "Compare" }
            ].map((item) => (
              <TabsTrigger key={item.id} className="flex-none px-3" value={item.id}>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="space-y-5">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <h2 className="text-sm font-semibold">Version details</h2>
                  <CopyButton label="Copy version ID" value={version.id} compact />
                </div>
                <dl className="grid gap-6 p-5 sm:grid-cols-3">
                  {[
                    ["Version ID", version.id],
                    ["Build duration", version.duration],
                    ["Created via", version.build.source],
                    ["Build origin", version.environment],
                    ["Configuration", version.build.configVersion],
                    ["Retention", version.retained ? "Artifact retained" : "Artifact unavailable"]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-2 font-mono text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <h2 className="text-sm font-semibold">Build pipeline</h2>
                  <button onClick={() => setTab("logs")} className="flex items-center gap-1 text-xs text-primary">
                    View logs
                    <ArrowUpRight className="size-3" />
                  </button>
                </div>
                <div className="divide-y">
                  {["Source uploaded", "Dependencies restored", "Build and test", "Artifact stored"].map(
                    (stage, index) => {
                      const done = version.status === "ready" || (version.status !== "queued" && index < 2)
                      const failed = version.status === "failed" && index === 2
                      const running = version.status === "building" && index === 2
                      return (
                        <div key={stage} className="flex items-center gap-3 px-5 py-4">
                          <span
                            className={cn(
                              "grid size-6 place-items-center rounded-full border",
                              done
                                ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : failed
                                  ? "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300"
                                  : "text-muted-foreground"
                            )}
                          >
                            {done ? (
                              <Check className="size-3" />
                            ) : failed ? (
                              <X className="size-3" />
                            ) : running ? (
                              <LoaderCircle className="size-3 animate-spin" />
                            ) : (
                              <span className="text-[10px]">{index + 1}</span>
                            )}
                          </span>
                          <span className="text-xs font-medium">{stage}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {done ? "Completed" : failed ? "Failed" : running ? "Running" : "Waiting"}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>
              </section>
              <section className="rounded-xl border bg-card">
                <div className="border-b px-5 py-4 text-sm font-semibold">Environment history</div>
                {project.deployments
                  .filter((event) => event.versionId === version.id)
                  .map((event) => (
                    <div key={event.id} className="flex flex-wrap items-center gap-3 border-b p-5 last:border-b-0">
                      <span className="grid size-8 place-items-center rounded-full bg-accent">
                        <ArrowUpRight className="size-4 text-primary" />
                      </span>
                      <div>
                        <p className="text-sm capitalize">
                          {event.kind} to {event.environment}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.actor} / {event.time}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-auto capitalize">
                        {event.state.replace("-", " ")}
                      </Badge>
                    </div>
                  ))}
                {!project.deployments.some((event) => event.versionId === version.id) && (
                  <p className="p-5 text-sm text-muted-foreground">
                    This version has not been activated in a shared environment.
                  </p>
                )}
              </section>
            </div>
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl border bg-card">
                <img src={project.artwork} alt="" className="h-36 w-full object-cover" />
                <div className="p-5">
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {project.mode === "multiplayer" ? "Frontend + Colyseus runtime" : "Frontend"}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Immutable version
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Package className="size-4 text-primary" />
                  Build artifact
                </p>
                {version.build.artifact ? (
                  <>
                    <p className="mt-4 text-2xl font-semibold">{version.build.artifact.size}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {version.build.artifact.files} files / Content addressed
                    </p>
                    <div className="mt-4 flex items-start gap-2 border-t pt-4">
                      <code className="min-w-0 flex-1 break-all text-[10px] leading-5 text-muted-foreground">
                        {version.build.artifact.digest}
                      </code>
                      <CopyButton label="Copy artifact digest" value={version.build.artifact.digest} compact />
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Available after a successful build.</p>
                )}
              </div>
              <button
                onClick={() => setTab("checks")}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-5 text-left"
              >
                <CheckCheck className="size-5 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold">
                    {passed} of {version.build.checks.length} checks passed
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Review deployment readiness</p>
                </div>
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="logs" className="space-y-5">
          <BuildOutput version={version} />
        </TabsContent>
        <TabsContent value="checks" className="space-y-5">
          <div className="overflow-hidden rounded-xl border bg-card">
            {version.build.checks.map((check) => (
              <div key={check.name} className="flex items-center gap-4 border-b px-5 py-5 last:border-b-0">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full",
                    check.status === "passed"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : check.status === "failed"
                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {check.status === "passed" ? (
                    <Check className="size-4" />
                  ) : check.status === "failed" ? (
                    <X className="size-4" />
                  ) : (
                    <LoaderCircle className={cn("size-4", check.status === "running" && "animate-spin")} />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{check.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
                </div>
                <Badge variant="outline" className="ml-auto capitalize">
                  {check.status}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="changes" className="space-y-5">
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-sm font-semibold">
                Changes in <CommitLink repository={project.repository} sha={version.commit} />
              </h2>
              <span className="text-xs text-muted-foreground">{version.build.changes.length} files changed</span>
            </div>
            {version.build.changes.map((file) => (
              <div key={file.path} className="flex flex-wrap items-center gap-3 border-b px-5 py-4 last:border-b-0">
                <FileCode2 className="size-4 text-muted-foreground" />
                <code className="min-w-0 flex-1 break-all text-xs">{file.path}</code>
                <span className="text-xs text-emerald-700 dark:text-emerald-300">+{file.added}</span>
                <span className="text-xs text-rose-600 dark:text-rose-300">−{file.removed}</span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="compare" className="space-y-5">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-64">
                <SelectField
                  label="Compare from version"
                  value={baselineId}
                  onChange={setBaselineId}
                  options={project.releases.map((item) => ({
                    value: item.id,
                    label: `${releaseLabel(item)} / ${item.commit}`
                  }))}
                />
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span className="rounded-md border bg-card px-4 py-2 font-mono text-sm">
                {releaseLabel(version)} / <CommitLink repository={project.repository} sha={version.commit} />
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-4 font-medium text-muted-foreground">Version comparison</th>
                    <th className="p-4">{releaseLabel(baseline)}</th>
                    <th className="p-4">{releaseLabel(version)}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Commit", baseline?.commit, version.commit],
                    ["Branch", baseline?.branch, version.branch],
                    ["Build status", baseline?.status, version.status],
                    [
                      "Artifact",
                      baseline?.build.artifact?.size ?? "Unavailable",
                      version.build.artifact?.size ?? "Unavailable"
                    ],
                    ["Configuration", baseline?.build.configVersion, version.build.configVersion],
                    [
                      "Schema compatibility",
                      baseline?.compatible ? "Compatible" : "Incompatible",
                      version.compatible ? "Compatible" : "Incompatible"
                    ],
                    ["Retained artifact", baseline?.retained ? "Yes" : "No", version.retained ? "Yes" : "No"]
                  ].map(([label, from, to]) => (
                    <tr key={label} className="border-b last:border-b-0">
                      <th className="p-4 font-normal text-muted-foreground">{label}</th>
                      <td className="p-4 font-mono">
                        {label === "Commit" && from ? <CommitLink repository={project.repository} sha={from} /> : from}
                      </td>
                      <td
                        className={cn(
                          "p-4 font-mono",
                          from !== to && "bg-violet-50 dark:bg-violet-500/10 text-primary"
                        )}
                      >
                        {label === "Commit" && to ? <CommitLink repository={project.repository} sha={to} /> : to}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" onClick={() => setTab("changes")}>
              <ChevronDown />
              View target commit changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
