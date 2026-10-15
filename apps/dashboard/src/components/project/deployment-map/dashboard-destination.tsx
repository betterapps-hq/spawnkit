import { ArrowLeft } from "lucide-react"
import { useEffect, useRef } from "react"
import { Button } from "../../ui/button"
import type { ProjectModel } from "../model"
import { VersionConsole } from "../version-console"
import { VersionDetail } from "../version-detail"

/** Navigation adapter only: destinations use the dashboard's existing page components. */
export function DashboardDestination({
  scope,
  project,
  canEdit,
  onReview
}: {
  scope: string
  project: ProjectModel
  canEdit: boolean
  onReview: (version: string) => void
}) {
  const version = scope.startsWith("#release/")
    ? project.releases.find((release) => release.id === scope.slice(9))
    : undefined
  const environment = scope.startsWith("#environment/") ? scope.slice(13) : undefined
  const target = environment === "staging" ? "sandbox" : environment
  const exists =
    target === "production" || target === "sandbox" || project.previews.some((preview) => preview.id === target)
  const back = () => {
    window.location.hash = "deployments"
  }
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scope.startsWith("#release/")) root.current?.querySelector<HTMLElement>("h1")?.focus()
  }, [scope])
  return (
    <div ref={root} className="dm-dashboard">
      {version ? (
        <VersionDetail
          project={project}
          version={version}
          canEdit={canEdit && version.environment !== "preview"}
          canStage={false}
          onBack={back}
          onAction={(kind, selected) => {
            if (selected && (kind === "promote" || kind === "rollback")) onReview(selected.id)
          }}
        />
      ) : (
        <>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
            <a href="#deployments">
              <ArrowLeft />
              Deployment map
            </a>
          </Button>
          <h1 tabIndex={-1} className="mb-6 text-2xl font-semibold tracking-tight outline-none">
            {exists ? "Deployments" : "Environment unavailable"}
          </h1>
          {exists ? (
            <VersionConsole
              key={target}
              project={project}
              canEdit={false}
              initialSection={target?.startsWith("pr-") ? "previews" : "environments"}
              selectedEnvironment={target}
              onVersion={(release) => {
                window.location.hash = `release/${release.id}`
              }}
              onAction={() => {}}
            />
          ) : (
            <p className="text-sm text-muted-foreground">This environment may have been deleted.</p>
          )}
        </>
      )}
    </div>
  )
}
