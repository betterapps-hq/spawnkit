import { createFileRoute } from "@tanstack/react-router"
import { ContentPage, ResourceLink } from "@/components/public/content-page"
import { agentDocuments } from "@/lib/agent-docs"
import { publicPageHead } from "@/lib/seo"

export const Route = createFileRoute("/docs/")({
  head: () => publicPageHead("/docs"),
  component: DocumentationPage
})

const groups = [
  {
    title: "Build",
    description: "Start with a kit, create a project with the CLI, or upload a game you already have."
  },
  { title: "Guides", description: "Work with an AI agent, use the dashboard, and test or update your game." },
  { title: "Reference", description: "Look up commands, configuration files, account requirements, and API resources." }
]
function DocumentationPage() {
  return (
    <ContentPage
      title="Documentation"
      description="Build, test, and publish browser games with SpawnKit."
      active="/docs"
    >
      {groups.map((group) => (
        <section className="p-docs-index-section" key={group.title} id={group.title.toLowerCase()}>
          <div>
            <h2>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          <div className="p-resource-task-grid">
            {agentDocuments
              .filter((doc) => doc.group === group.title)
              .map((doc) => (
                <ResourceLink key={doc.id} href={`/docs/${doc.id}`} title={doc.title}>
                  {doc.description}
                </ResourceLink>
              ))}
          </div>
        </section>
      ))}
    </ContentPage>
  )
}
