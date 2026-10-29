import type { GameListingSettings } from "@spawn/platform/community"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleCheck, LoaderCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { communityRequest } from "../../lib/community"
import { Button } from "../ui/button"
import type { ProjectModel } from "./model"
import { SettingsForm, type SettingsDraft } from "./settings-form"

function draft(listing: GameListingSettings): SettingsDraft {
  return {
    name: listing.title,
    description: listing.description,
    genre: listing.genre ?? "",
    dimension: listing.dimension === "2D" || listing.dimension === "3D" ? listing.dimension : "",
    cover: listing.coverUrl ? { url: listing.coverUrl, name: "Cover image" } : null,
    trailer: listing.trailerUrl ? { url: listing.trailerUrl, name: "Gameplay preview" } : null
  }
}
type Identity = { name: string; hostname?: string }
type Deletion = { state: "active" | "pending" | "retrying" | "complete" }

export function LiveProjectSettings({ project, onExit }: { project: ProjectModel; onExit: () => void }) {
  const client = useQueryClient()
  const [deleting, setDeleting] = useState(project.lifecycle === "deleting")
  const stopped = useRef(false)
  useEffect(() => {
    stopped.current = false
    return () => {
      stopped.current = true
    }
  }, [])
  const listing = useQuery({
    queryKey: ["game-listing", project.id],
    queryFn: () => communityRequest<GameListingSettings>(`projects/${project.id}/listing`),
    enabled: !deleting,
    retry: false
  })
  const identity = useQuery({
    queryKey: ["project-identity", project.id],
    queryFn: () => communityRequest<Identity>(`projects/${project.id}`),
    enabled: !deleting,
    retry: false
  })
  const deletion = useQuery({
    queryKey: ["project-deletion", project.id],
    queryFn: () => communityRequest<Deletion>(`projects/${project.id}/deletion`),
    enabled: deleting,
    refetchInterval: (query) => (query.state.data?.state === "complete" ? false : 2500)
  })
  useEffect(() => {
    if (deletion.data?.state === "complete") void client.invalidateQueries({ queryKey: ["projects"] })
  }, [client, deletion.data?.state])
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["projects"] }),
      client.invalidateQueries({ queryKey: ["project-identity", project.id] })
    ])
  }
  async function save(values: SettingsDraft) {
    const current = listing.data!
    const details = {
      title: values.name.trim(),
      description: values.description.trim(),
      genre: values.genre,
      dimension: values.dimension,
      details: current.details ?? {}
    }
    const removeTrailer = Boolean(current.trailerUrl && !values.trailer)
    let result: GameListingSettings
    if (values.cover?.file || values.trailer?.file || removeTrailer) {
      const assets: Record<string, unknown> = {}
      for (const kind of ["cover", "trailer"] as const) {
        const file = values[kind]?.file
        if (!file) continue
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ""
        for (let offset = 0; offset < bytes.length; offset += 8192)
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
        assets[kind] = { extension: file.name.split(".").at(-1)?.toLowerCase(), content: btoa(binary) }
      }
      const update = await communityRequest<{ id: string }>(`projects/${project.id}/listing/media`, {
        key: crypto.randomUUID(),
        revision: current.revision,
        releaseId: current.releaseId,
        listing: { schemaVersion: 1, ...details, coverPath: "cover.webp" },
        ...assets,
        removeTrailer
      })
      for (let attempt = 0; ; attempt++) {
        if (stopped.current) throw new Error("Your update continues in Deployments.")
        const deployment = await communityRequest<{ status: string }>(`projects/${project.id}/deployments/${update.id}`)
        if (deployment.status === "succeeded") break
        if (["failed", "superseded"].includes(deployment.status))
          throw new Error(
            "Couldn't save the media update. Your previous game is unchanged. Check Deployments for details."
          )
        if (attempt >= 360) throw new Error("Your media is still processing. Check Deployments for its status.")
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      result = await communityRequest<GameListingSettings>(`projects/${project.id}/listing`)
    } else {
      result = await communityRequest<GameListingSettings>(
        `projects/${project.id}/listing`,
        { ...details, reset: false, revision: current.revision, releaseId: current.releaseId },
        "PUT"
      )
    }
    client.setQueryData(["game-listing", project.id], result)
    await refresh()
    return draft(result)
  }
  async function remove(name: string) {
    await communityRequest<Deletion>(`projects/${project.id}`, { name }, "DELETE")
    setDeleting(true)
    void client.invalidateQueries({ queryKey: ["projects"] })
    void client.invalidateQueries({ queryKey: ["project-deletion", project.id] })
  }
  if (deleting) {
    const complete = deletion.data?.state === "complete"
    return (
      <section className="settings-deleted" aria-live="polite">
        {complete ? <CircleCheck size={28} /> : <LoaderCircle size={28} className="animate-spin" />}
        <h1>{complete ? "Project deleted" : "Deleting project"}</h1>
        {!complete && (
          <p>
            {deletion.error
              ? "Couldn't check deletion progress. Cleanup continues in the background."
              : deletion.data?.state === "retrying"
                ? "Your game is offline. Cleanup hit a problem and will retry automatically."
                : "Your game is offline. Removing its files and game addresses…"}
          </p>
        )}
        {deletion.error && (
          <Button variant="outline" onClick={() => void deletion.refetch()}>
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={onExit}>
          Back to projects
        </Button>
      </section>
    )
  }
  if (listing.error || identity.error)
    return (
      <section className="settings-proposal">
        <h1>Settings</h1>
        <p role="alert">{listing.error?.message ?? identity.error?.message}</p>
        <Button
          variant="outline"
          onClick={() => {
            void listing.refetch()
            void identity.refetch()
          }}
        >
          Try again
        </Button>
      </section>
    )
  if (!listing.data || !identity.data)
    return (
      <output className="flex items-center gap-2">
        <LoaderCircle className="animate-spin" size={18} />
        Loading settings…
      </output>
    )
  return (
    <SettingsForm
      key={project.id}
      initial={draft(listing.data)}
      hostname={identity.data.hostname ?? ""}
      projectId={project.id}
      repository={project.repository}
      deleteName={identity.data.name}
      mediaEnabled={Boolean(listing.data.releaseId)}
      onSave={save}
      onDelete={remove}
      onExit={onExit}
    />
  )
}
