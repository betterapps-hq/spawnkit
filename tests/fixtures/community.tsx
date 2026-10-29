import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { frontendProject } from "../../apps/dashboard/src/components/project/fixtures"
import type { StudioLocation } from "../../apps/dashboard/src/components/project/model"
import { ProjectStudio } from "../../apps/dashboard/src/components/project/studio"
import { PlayerReport } from "../../apps/dashboard/src/components/public/player-report"
import { ThemeProvider } from "../../apps/dashboard/src/components/theme-provider"
import "../../apps/dashboard/src/style.css"

function Harness() {
  const params = new URLSearchParams(location.search)
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  )
  const [current, setCurrent] = useState<StudioLocation>({
    page:
      params.get("page") === "upload"
        ? "upload"
        : params.get("page") === "reports"
          ? "reports"
          : params.get("page") === "settings"
            ? "settings"
            : "team",
    projectId: "p"
  })
  const role =
    params.get("role") === "Observer" ? "Observer" : params.get("role") === "Moderator" ? "Moderator" : "Admin"
  const project = { ...frontendProject, id: "p" }
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {params.get("page") === "player" ? (
          <main className="p-8">
            <h1>Orchard Snake</h1>
            <PlayerReport projectId="p" title="Orchard Snake" />
            <PlayerReport projectId="p" commentId="c" title="Alex" />
          </main>
        ) : (
          <ProjectStudio
            project={project}
            projects={[project]}
            location={current}
            onNavigate={setCurrent}
            publishingEnabled
            publishingAdmin={role === "Admin"}
            communityRole={role}
          />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
createRoot(document.getElementById("root")!).render(<Harness />)
