import type { Meta, StoryObj } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import type { GamesSearch } from "@/lib/game-discovery"
import type { GameSubmission } from "@/lib/publishing"
import { frontendProject } from "../project/fixtures"
import { ProjectStudio } from "../project/studio"
import { GamesPage } from "./games-page"
import { PublishedGamePage } from "./published-game-page"
const meta = { title: "Public site/Publishing", parameters: { layout: "fullscreen" } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
const submission: GameSubmission = {
  id: "submission-1",
  projectId: "project-1",
  releaseId: "release-1",
  title: "Snake",
  genre: "Arcade",
  dimension: "2D",
  description: "Collect fruit. Use arrow keys or swipe to steer.",
  url: "https://d-b2a727d1.spawn-snake.spawnkit.games",
  coverUrl: "https://d-b2a727d1.spawn-snake.spawnkit.games/media/cover.png",
  trailerUrl: "https://d-b2a727d1.spawn-snake.spawnkit.games/media/gameplay.mp4",
  status: "pending",
  submittedAt: "2026-10-15T12:00:00Z",
  reviewedAt: null,
  reviewNote: ""
}
function PublishingStudio({ admin = false }: { admin?: boolean }) {
  const [client] = useState(() => {
    const result = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    result.setQueryData(["publishing-review-queue"], {
      submissions: [
        {
          ...submission,
          coverUrl: "/examples/snake.webp",
          details: { controls: "Arrow keys", creator: "Existing creator" }
        },
        {
          ...submission,
          id: "submission-2",
          projectId: "project-2",
          title: "Garden Quest",
          coverUrl: "/examples/snake.webp"
        },
        { ...submission, id: "submission-3", projectId: "project-3", title: "Orbit Runner", coverUrl: undefined }
      ]
    })
    result.setQueryData(["publishing-projects"], { projects: [{ id: "project-1", name: "Snake" }] })
    result.setQueryData(["publishing-state", "project-1"], {
      environments: [{ name: "production", enabled: true, currentReleaseId: "release-1" }]
    })
    result.setQueryData(["submissions", "project-1"], { submissions: [submission] })
    return result
  })
  const project = { ...frontendProject, id: "project-1", name: "Snake" }
  return (
    <QueryClientProvider client={client}>
      <ProjectStudio
        project={project}
        projects={[project]}
        initialPage="submissions"
        publishingEnabled
        publishingAdmin={admin}
      />
    </QueryClientProvider>
  )
}
export const Review: Story = { render: () => <PublishingStudio admin /> }
export const NonAdmin: Story = { render: () => <PublishingStudio /> }
function PublishedCatalog() {
  const [search, setSearch] = useState<GamesSearch>({ sort: "newest" })
  return <GamesPage published={[submission]} search={search} onSearch={setSearch} />
}
export const Published: Story = { render: () => <PublishedCatalog /> }
function RankedCatalog() {
  const [search, setSearch] = useState<GamesSearch>({})
  const published = ["Orchard Snake", "Prism Break", "Starfall Squadron", "The Art of the Steal"].map(
    (title, index) => ({
      ...submission,
      projectId: `project-${index + 1}`,
      title,
      coverUrl: `/examples/${["snake", "breakout", "space-shooter", "snake"][index]}.webp`,
      trailerUrl: null,
      views: [20, 100, 50, 30][index]!,
      monthlyViews: [12, 8, 4, 1][index]!
    })
  )
  return <GamesPage published={published} search={search} onSearch={setSearch} />
}
export const Rankings: Story = { render: () => <RankedCatalog /> }

export const ReleaseSummary: Story = {
  render: () => {
    const release = {
      ...frontendProject.releases[0]!,
      title: "Version 1",
      number: 1,
      branch: "main",
      commit: "ce494d3a56978f5f24b00bbad8f95adf020aaa2fd",
      time: "2026-10-15T23:07:03.184Z"
    }
    const project = { ...frontendProject, releases: [release], production: { ...frontendProject.production, release } }
    return <ProjectStudio project={project} projects={[project]} initialPage="overview" />
  }
}

export const Player: Story = {
  render: function PlayerStory() {
    const [client] = useState(() => new QueryClient())
    return (
      <QueryClientProvider client={client}>
        <PublishedGamePage game={submission} />
      </QueryClientProvider>
    )
  }
}
