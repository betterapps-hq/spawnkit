import { gameGenres } from "@spawn/templates/listing"
import { Check, CircleCheck, ExternalLink, Film, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react"
import { Toast as ToastPrimitive } from "radix-ui"
import { useEffect, useId, useRef, useState } from "react"
import { CopyButton } from "../copy-button"
import { PageHeader } from "../page-header"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet"
import { Textarea } from "../ui/textarea"
import "./settings-preview.css"

export type SettingsScenario = "default" | "unsaved" | "saved" | "save-failed" | "delete" | "deleting" | "delete-failed"
type Media = { url: string; name: string; file?: File } | null
export type SettingsDraft = {
  name: string
  description: string
  genre: string
  dimension: "2D" | "3D" | ""
  cover: Media
  trailer: Media
}

export function SettingsForm({
  initial: original,
  hostname,
  projectId,
  repository,
  scenario = "default",
  onExit,
  onSave,
  onDelete,
  canEdit = true,
  mediaEnabled = true,
  deleteName
}: {
  initial: SettingsDraft
  hostname: string
  projectId: string
  repository?: string | null
  scenario?: SettingsScenario
  onExit?: (() => void) | undefined
  onSave: (draft: SettingsDraft) => Promise<SettingsDraft>
  onDelete: (name: string) => Promise<void>
  canEdit?: boolean
  mediaEnabled?: boolean
  deleteName?: string
}) {
  const formId = useId()
  const [saved, setSaved] = useState(original)
  const [draft, setDraft] = useState(() =>
    scenario === "unsaved" || scenario === "save-failed"
      ? { ...original, description: "Collect apples, grow your snake, and beat your best score in a sunny orchard." }
      : original
  )
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(scenario === "save-failed" ? "error" : "idle")
  const [deleteOpen, setDeleteOpen] = useState(scenario.startsWith("delet"))
  const [confirmation, setConfirmation] = useState(
    scenario === "delete-failed" || scenario === "deleting" ? original.name : ""
  )
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error" | "deleted">(
    scenario === "deleting" ? "deleting" : scenario === "delete-failed" ? "error" : "idle"
  )
  const [toastOpen, setToastOpen] = useState(scenario === "saved")
  const [mediaError, setMediaError] = useState("")
  const coverInput = useRef<HTMLInputElement>(null)
  const trailerInput = useRef<HTMLInputElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)
  const [saveError, setSaveError] = useState("Couldn't save changes. Try again.")
  const [deleteError, setDeleteError] = useState("Couldn't delete the project. Try again.")
  const objectUrls = useRef<string[]>([])
  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    []
  )
  const changed = JSON.stringify(saved) !== JSON.stringify(draft)
  function update(values: Partial<SettingsDraft>) {
    setToastOpen(false)
    setDraft((current) => ({ ...current, ...values }))
    setSaveState("idle")
  }
  function selectMedia(kind: "cover" | "trailer", file?: File) {
    if (!file) return
    const limit = kind === "cover" ? 1 : 2
    const types = kind === "cover" ? ["image/png", "image/jpeg", "image/webp"] : ["video/mp4", "video/webm"]
    if (!types.includes(file.type) || file.size > limit * 1024 * 1024) {
      setMediaError(
        kind === "cover" ? "Choose a PNG, JPEG, or WebP image under 1 MB." : "Choose an MP4 or WebM video under 2 MB."
      )
      return
    }
    setMediaError("")
    const url = URL.createObjectURL(file)
    objectUrls.current.push(url)
    update({ [kind]: { url, name: file.name, file } })
  }
  async function save() {
    if (!canEdit || saveState === "saving") return
    setSaveState("saving")
    try {
      const result = await onSave(draft)
      setSaved(result)
      setDraft(result)
      setSaveState("idle")
      setToastOpen(true)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't save changes. Try again.")
      setSaveState("error")
    }
  }
  function closeDelete() {
    if (deleteState === "deleting") return
    setDeleteOpen(false)
    setConfirmation("")
    setDeleteState("idle")
  }
  const confirmationName = deleteName ?? saved.name
  async function removeProject() {
    if (!canEdit || confirmation !== confirmationName || deleteState === "deleting") return
    setDeleteState("deleting")
    try {
      await onDelete(confirmationName)
      setDeleteOpen(false)
      setDeleteState("deleted")
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Couldn't delete the project. Try again.")
      setDeleteState("error")
    }
  }
  if (deleteState === "deleted")
    return (
      <output className="settings-deleted">
        <Check size={28} />
        <h2>{saved.name} was deleted</h2>
        <Button variant="outline" onClick={onExit}>
          Back to projects
        </Button>
      </output>
    )
  return (
    <div className="settings-proposal">
      <header className="settings-heading">
        <PageHeader
          title="Settings"
          actions={
            changed && canEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveState === "saving"}
                  onClick={() => {
                    setDraft(saved)
                    setSaveState("idle")
                    setMediaError("")
                  }}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  form={formId}
                  disabled={
                    saveState === "saving" ||
                    !draft.name.trim() ||
                    draft.description.trim().length < 10 ||
                    !draft.genre ||
                    !draft.dimension
                  }
                >
                  {saveState === "saving" && <LoaderCircle className="animate-spin" />}
                  {saveState === "saving" ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : undefined
          }
        />
        <div className="settings-identity" aria-label="Project information">
          {hostname && (
            <div>
              <a href={`https://${hostname}`} target="_blank" rel="noreferrer">
                {hostname}
              </a>
              <CopyButton
                value={`https://${hostname}`}
                compact
                label="Copy game address"
                success="Game address copied"
              />
            </div>
          )}
          <div>
            <span>Project ID</span>
            <code>{projectId}</code>
            <CopyButton value={projectId} compact label="Copy project ID" success="Project ID copied" />
          </div>
          {repository && (
            <div>
              <a href={`https://github.com/${repository}`} target="_blank" rel="noreferrer">
                {repository}
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
        {saveState === "error" && (
          <p className="settings-error" role="alert">
            {saveError}
          </p>
        )}
      </header>

      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <fieldset
          disabled={!canEdit || saveState === "saving" || deleteState === "deleting"}
          className="settings-editable"
        >
          <div className="settings-fields">
            <label htmlFor="settings-name">Game name</label>
            <Input
              id="settings-name"
              value={draft.name}
              required
              maxLength={64}
              onChange={(event) => update({ name: event.target.value })}
            />
            <label htmlFor="settings-description">Description</label>
            <Textarea
              id="settings-description"
              rows={6}
              minLength={10}
              maxLength={500}
              required
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
            />
            <span className="settings-counter">{draft.description.length}/500</span>
            <div className="settings-classification">
              <div>
                <label htmlFor="settings-genre">Genre</label>
                <Select value={draft.genre} onValueChange={(genre) => update({ genre })}>
                  <SelectTrigger id="settings-genre">
                    <SelectValue placeholder="Choose genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameGenres.map((genre) => (
                      <SelectItem value={genre} key={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="settings-dimension">
                <legend>Dimension</legend>
                <div>
                  {(["2D", "3D"] as const).map((dimension) => (
                    <Button
                      type="button"
                      variant="ghost"
                      key={dimension}
                      aria-pressed={draft.dimension === dimension}
                      onClick={() => update({ dimension })}
                    >
                      {dimension}
                    </Button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
          <div className="settings-media">
            <div className="settings-media-heading">
              <label htmlFor="settings-cover">Cover image</label>
              <span>1 MB max</span>
            </div>
            <button
              type="button"
              className="settings-cover"
              onClick={() => coverInput.current?.click()}
              aria-label="Replace cover image"
              disabled={!mediaEnabled}
              title={!mediaEnabled ? "Deploy a game to add media" : undefined}
            >
              {draft.cover && <img src={draft.cover.url} alt={`${draft.name} cover`} />}
              <span>
                <ImagePlus size={16} /> Replace cover
              </span>
            </button>
            <input
              ref={coverInput}
              id="settings-cover"
              disabled={!mediaEnabled}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept=".png,.jpg,.jpeg,.webp"
              onChange={(event) => {
                selectMedia("cover", event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <div className="settings-media-heading">
              <label htmlFor="settings-trailer">Gameplay preview</label>
              <span>2 MB max</span>
            </div>
            <div className="settings-trailer">
              {draft.trailer ? (
                <>
                  <video
                    src={draft.trailer.url}
                    controls
                    playsInline
                    muted
                    preload="metadata"
                    aria-label="Gameplay preview video"
                  />
                  <div className="settings-trailer-actions">
                    <span>{draft.trailer.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove gameplay preview"
                      onClick={() => update({ trailer: null })}
                    >
                      <X />
                    </Button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!mediaEnabled}
                  title={!mediaEnabled ? "Deploy a game to add media" : undefined}
                  onClick={() => trailerInput.current?.click()}
                >
                  <Film size={20} />
                  <span>
                    Add video<small>MP4 or WebM</small>
                  </span>
                  <Upload size={16} />
                </button>
              )}
            </div>
            <input
              ref={trailerInput}
              id="settings-trailer"
              disabled={!mediaEnabled}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept=".mp4,.webm"
              onChange={(event) => {
                selectMedia("trailer", event.target.files?.[0])
                event.target.value = ""
              }}
            />
            {mediaError && (
              <p className="settings-error" role="alert">
                {mediaError}
              </p>
            )}
          </div>
        </fieldset>
      </form>
      <section className="settings-danger" aria-labelledby="settings-danger-heading">
        <div>
          <h2 id="settings-danger-heading">Danger Zone</h2>
          <p>Permanently delete this project and its hosted files.</p>
        </div>
        <Button
          ref={deleteButton}
          disabled={!canEdit || saveState === "saving"}
          type="button"
          variant="outline"
          onClick={() => {
            setConfirmation("")
            setDeleteState("idle")
            setDeleteOpen(true)
          }}
        >
          <Trash2 />
          Delete project
        </Button>
      </section>
      <Sheet
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) closeDelete()
        }}
      >
        <SheetContent
          side="bottom"
          className="settings-delete-dialog"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            cancelButton.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            deleteButton.current?.focus()
          }}
        >
          <div className="settings-delete-icon">
            <Trash2 size={22} />
          </div>
          <SheetTitle>Delete project?</SheetTitle>
          <SheetDescription>
            This takes your game offline and permanently removes its listing, versions, and uploaded files.
          </SheetDescription>
          <div className="settings-delete-game">
            {saved.cover && <img src={saved.cover.url} alt="" />}
            <div>
              <strong>{saved.name}</strong>
              <span>{hostname}</span>
            </div>
          </div>
          <p className="settings-delete-warning">This cannot be undone.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void removeProject()
            }}
          >
            <label htmlFor="settings-delete-confirm">
              Type <strong>{confirmationName}</strong> to confirm
            </label>
            <Input
              id="settings-delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={deleteState === "deleting"}
            />
            {deleteState === "error" && (
              <p className="settings-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="settings-delete-actions">
              <Button
                type="button"
                variant="outline"
                ref={cancelButton}
                disabled={deleteState === "deleting"}
                onClick={closeDelete}
              >
                Cancel
              </Button>
              <Button variant="destructive" disabled={confirmation !== confirmationName || deleteState === "deleting"}>
                {deleteState === "deleting" ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {deleteState === "deleting" ? "Deleting…" : "Delete project"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      {toastOpen && (
        <ToastPrimitive.Provider duration={5000} swipeDirection="right">
          <ToastPrimitive.Root
            open={toastOpen}
            onOpenChange={setToastOpen}
            type="background"
            className="settings-toast"
          >
            <CircleCheck className="settings-toast-icon" size={20} aria-hidden="true" />
            <ToastPrimitive.Title>Changes saved</ToastPrimitive.Title>
            <ToastPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Dismiss notification">
                <X />
              </Button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
          <ToastPrimitive.Viewport className="settings-toast-viewport" />
        </ToastPrimitive.Provider>
      )}
    </div>
  )
}
