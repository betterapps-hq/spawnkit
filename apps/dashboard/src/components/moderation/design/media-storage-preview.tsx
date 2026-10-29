import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  Film,
  HardDrive,
  Image,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react"
import { useState } from "react"
import { CopyButton } from "../../copy-button"
import { Button } from "../../ui/button"
import { Checkbox } from "../../ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { Empty, FilterSegments, Metadata, Notice, PreviewDialog, SafetyShell, StatusPill } from "./safety-shared"

type MediaScenario = "ready" | "processing" | "queued" | "failed" | "near-limit" | "limit" | "cleanup-error" | "empty"
const releaseSeeds = [
  { id: "v12", name: "Orchard polish", date: "Today, 10:24 AM", size: 184, state: "Live", protected: true },
  { id: "v11", name: "Touch controls", date: "Oct 15, 4:12 PM", size: 168, state: "Previous release", protected: true },
  { id: "v10", name: "Autumn orchard", date: "Oct 12, 11:30 AM", size: 156, state: "Older release", protected: false },
  {
    id: "v9",
    name: "New game over scene",
    date: "Oct 10, 2:09 PM",
    size: 142,
    state: "Older release",
    protected: false
  },
  { id: "b8", name: "Build attempt", date: "Oct 9, 8:42 AM", size: 92, state: "Failed build", protected: false }
]
const listingConfig =
  'import { defineConfig } from "./spawnkit/config"\n\nexport default defineConfig({\n  title: "Orchard Snake",\n  description: "Collect apples in a sunny orchard.",\n  genre: "Arcade",\n  dimension: "2D",\n  coverPath: "media/cover.webp",\n  trailerPath: "media/gameplay.mp4",\n})'

export function MediaStoragePreview({ scenario = "ready" }: { scenario?: MediaScenario }) {
  const [tab, setTab] = useState(["near-limit", "limit", "cleanup-error"].includes(scenario) ? "storage" : "media")
  const [media, setMedia] = useState(
    scenario === "processing"
      ? "processing"
      : scenario === "queued"
        ? "queued"
        : scenario === "failed"
          ? "failed"
          : "ready"
  )
  const [releases, setReleases] = useState(scenario === "empty" ? [] : releaseSeeds)
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState("all")
  const [cleanup, setCleanup] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [config, setConfig] = useState(false)
  const [policy, setPolicy] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState("")
  const extra = scenario === "near-limit" ? 210 : scenario === "limit" ? 282 : 0
  const used = releases.reduce((sum, item) => sum + item.size, 0) + extra
  const chosen = releases.filter((item) => selected.includes(item.id) && !item.protected)
  const reclaim = chosen.reduce((sum, item) => sum + item.size, 0)
  const cleanupEligible = releases.filter((item) => !item.protected)
  const shown = filter === "eligible" ? cleanupEligible : releases
  async function clean() {
    setPending(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 500))
    setPending(false)
    if (scenario === "cleanup-error" && !attempt) {
      setAttempt(1)
      setError("Cleanup failed. Nothing was removed. Try again.")
      return
    }
    setReleases((items) => items.filter((item) => item.protected || !selected.includes(item.id)))
    setSelected([])
    setCleanup(false)
    setNotice(`${chosen.length} items removed. ${reclaim} MiB of space recovered.`)
  }
  function reviewCleanup() {
    setConfirmed(false)
    setError("")
    setCleanup(true)
  }
  const percentage = Math.min(100, (used / 1024) * 100)
  return (
    <SafetyShell
      page="Media & storage"
      actions={
        <Button variant="outline" onClick={() => setConfig(true)}>
          <Upload />
          Update game media
        </Button>
      }
    >
      {notice && (
        <Notice tone="green" close={() => setNotice("")}>
          {notice}
        </Notice>
      )}
      <Tabs value={tab} onValueChange={setTab} className="safety-panel-tabs">
        <TabsList variant="line" className="safety-media-tabs">
          <TabsTrigger value="media">
            <Image />
            Listing media
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive />
            Project storage
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {tab === "media" ? (
            scenario === "empty" ? (
              <div className="safety-surface">
                <Empty
                  title="No listing media"
                  action={
                    <Button onClick={() => setConfig(true)}>
                      Set up listing media
                      <ArrowRight />
                    </Button>
                  }
                >
                  Add a cover image to your next deployment.
                </Empty>
              </div>
            ) : (
              <>
                {media !== "ready" && (
                  <Notice tone={media === "failed" ? "amber" : "purple"}>
                    <strong>
                      {media === "queued"
                        ? "Waiting to process"
                        : media === "processing"
                          ? "Preparing media"
                          : "Trailer processing failed"}
                    </strong>
                    <p>
                      {media === "failed"
                        ? "The previous trailer is still in use."
                        : media === "queued"
                          ? "Your game is live. Previous media stays in use until processing finishes."
                          : "Previous media stays in use until processing finishes."}
                    </p>
                    {media === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMedia("processing")
                          setNotice("Retry started.")
                        }}
                      >
                        <RefreshCw />
                        Retry preparation
                      </Button>
                    )}
                  </Notice>
                )}
                <div className="safety-media-grid">
                  {(["cover", "trailer"] as const).map((type) => (
                    <article className="safety-media-card" key={type}>
                      <header>
                        <span>
                          {type === "cover" ? <FileImage size={17} /> : <Film size={17} />}
                          <strong>{type === "cover" ? "Cover image" : "Hover preview"}</strong>
                        </span>
                        <StatusPill
                          tone={
                            media === "ready" ? "green" : media === "failed" && type === "trailer" ? "amber" : "quiet"
                          }
                        >
                          {media === "ready" ? (
                            <>
                              <Check size={11} />
                              Ready
                            </>
                          ) : media === "failed" && type === "trailer" ? (
                            "Needs attention"
                          ) : media === "failed" ? (
                            "Ready"
                          ) : (
                            "Previous version"
                          )}
                        </StatusPill>
                      </header>
                      <div className="safety-media-art">
                        <img
                          src="/examples/snake.webp"
                          alt={
                            type === "cover"
                              ? "Sample Orchard Snake cover"
                              : "Still frame representing the gameplay trailer"
                          }
                        />
                        {type === "trailer" && (
                          <>
                            <span className="safety-media-duration">
                              <Film size={12} />
                              0:08
                            </span>
                            <span className="safety-media-still">Poster frame</span>
                          </>
                        )}
                      </div>
                      <div className="safety-media-card-body">
                        <div className="safety-media-sizes">
                          <div>
                            <small>Original upload</small>
                            <strong>{type === "cover" ? "864 KiB" : "1.8 MiB"}</strong>
                          </div>
                          <ArrowRight size={17} />
                          <div>
                            <small>Served to players</small>
                            <strong>{type === "cover" ? "92 KiB" : "380 KiB"}</strong>
                          </div>
                          <StatusPill tone="green">
                            <ArrowDown size={11} />
                            {type === "cover" ? "89%" : "79%"}
                          </StatusPill>
                        </div>
                        <div className="safety-media-specs">
                          <Metadata items={type === "cover" ? ["WebP", "960 × 540"] : ["MP4", "640 × 360", "Muted"]} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {media === "processing" || media === "queued" ? (
                  <section className="safety-processing">
                    <div className="safety-processing-symbol">
                      <Clock3 size={20} />
                    </div>
                    <div>
                      <h3>{media === "queued" ? "In the processing queue" : "Preparing media from version 12"}</h3>
                    </div>
                    <div className="safety-processing-steps">
                      <span data-done="true">
                        <CheckCircle2 size={14} />
                        Received
                      </span>
                      <ChevronRight size={12} />
                      <span data-current="true">
                        <Clock3 size={14} />
                        {media === "queued" ? "Waiting" : "Preparing"}
                      </span>
                      <ChevronRight size={12} />
                      <span>Ready</span>
                    </div>
                    <button
                      className="safety-text-button"
                      onClick={() => {
                        setMedia(media === "queued" ? "processing" : "ready")
                        setNotice(media === "queued" ? "Processing started." : "Media ready.")
                      }}
                    >
                      {media === "queued" ? "Preview processing state" : "Preview completed state"}
                      <ArrowRight size={13} />
                    </button>
                  </section>
                ) : null}
                <div className="safety-media-guidance">
                  <dl>
                    <div>
                      <dt>Cover image</dt>
                      <dd>PNG, JPEG, WebP or SVG. Up to 1 MiB.</dd>
                    </div>
                    <div>
                      <dt>Gameplay video</dt>
                      <dd>MP4 or WebM. Up to 2 MiB, 60 seconds.</dd>
                    </div>
                  </dl>
                  <p>Start trailers on gameplay. Previews use the first eight seconds.</p>
                </div>
              </>
            )
          ) : (
            <>
              <div className="safety-storage-summary">
                <div>
                  <span className="safety-eyebrow">PROJECT STORAGE</span>
                  <div className="safety-storage-amount">
                    <strong>
                      {used.toLocaleString()} <small>MiB</small>
                    </strong>
                    <span>of 1 GiB</span>
                  </div>
                  <p>Source uploads, game releases and listing media.</p>
                </div>
                <div className="safety-storage-meter">
                  <meter className="sr-only" min={0} max={1024} value={used} aria-label="Project storage used" />
                  <div>
                    <strong>{Math.round(percentage)}% used</strong>
                    <StatusPill tone={percentage >= 100 ? "red" : percentage > 90 ? "amber" : "green"}>
                      {percentage >= 100 ? "Limit reached" : percentage > 90 ? "Nearly full" : "Available"}
                    </StatusPill>
                  </div>
                  <div
                    className="safety-meter"

                    aria-hidden="true"
                  >
                    <span style={{ width: `${percentage}%` }} data-full={percentage >= 100} />
                  </div>
                  <small>
                    {scenario === "empty" ? "Deploy a game to start tracking storage." : `${1024 - used} MiB available`}
                  </small>
                </div>
              </div>
              {used >= 924 && (
                <Notice tone={used >= 1024 ? "red" : "amber"}>
                  <strong>
                    {used >= 1024
                      ? "Make room before your next deployment"
                      : "Your next deployment may need more space"}
                  </strong>
                  <p>Your live game keeps running. Remove older releases or failed build files to make room.</p>
                </Notice>
              )}
              <section className="safety-surface">
                <div className="safety-storage-tools">
                  <div>
                    <h2>Stored releases</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPolicy(true)}>
                    <ShieldCheck />
                    What’s protected?
                  </Button>
                </div>
                <div className="safety-storage-filters">
                  <FilterSegments
                    value={filter}
                    onChange={setFilter}
                    label="Release protection"
                    items={[
                      { value: "all", label: "All releases" },
                      {
                        value: "eligible",
                        label: (
                          <>
                            Can be removed<span className="safety-count">{cleanupEligible.length}</span>
                          </>
                        )
                      }
                    ]}
                  />
                  {cleanupEligible.length > 0 && (
                    <button
                      className="safety-text-button"
                      onClick={() =>
                        setSelected(
                          selected.length === cleanupEligible.length ? [] : cleanupEligible.map((item) => item.id)
                        )
                      }
                    >
                      {selected.length === cleanupEligible.length ? "Clear selection" : "Select removable"}
                    </button>
                  )}
                </div>
                {shown.length ? (
                  <div className="safety-release-list">
                    {shown.map((item) => (
                      <label className="safety-release-row" key={item.id} data-selected={selected.includes(item.id)}>
                        <Checkbox
                          checked={selected.includes(item.id)}
                          disabled={item.protected || pending}
                          aria-label={`Select ${item.id}`}
                          onCheckedChange={(checked) =>
                            setSelected((items) =>
                              checked ? [...items, item.id] : items.filter((id) => id !== item.id)
                            )
                          }
                        />
                        <span className="safety-release-version">{item.id}</span>
                        <span className="safety-release-name">
                          <strong>{item.name}</strong>
                          <small>{item.date}</small>
                        </span>
                        <StatusPill
                          tone={item.state === "Live" ? "green" : item.state === "Failed build" ? "amber" : "quiet"}
                        >
                          {item.protected && <LockKeyhole size={10} />} {item.state}
                        </StatusPill>
                        <span className="safety-release-size">{item.size} MiB</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Empty title={scenario === "empty" ? "No releases" : "No removable releases"}>
                    {scenario === "empty"
                      ? "Your first deployment will appear here."
                      : "The remaining releases are protected."}
                  </Empty>
                )}
                <footer className="safety-storage-selection">
                  <div>
                    {chosen.length ? (
                      <>
                        <strong>
                          <Metadata items={[`${chosen.length} selected`, `${reclaim} MiB`]} />
                        </strong>
                      </>
                    ) : (
                      <>
                        <strong>
                          {cleanupEligible.reduce((sum, item) => sum + item.size, 0)} MiB can be recovered
                        </strong>
                      </>
                    )}
                  </div>
                  <Button variant="outline" onClick={reviewCleanup} disabled={!chosen.length}>
                    <Trash2 />
                    Review cleanup
                  </Button>
                </footer>
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
      <PreviewDialog
        open={config}
        onClose={() => setConfig(false)}
        title="Game metadata"
        description="Edit spawnkit.config.ts and redeploy."
      >
        <div className="safety-dialog-body">
          <div className="safety-code-heading">
            <span>spawnkit.config.ts</span>
            <CopyButton value={listingConfig} label="Copy listing configuration" compact />
          </div>
          <pre className="safety-config-code">
            <code>{listingConfig}</code>
          </pre>
          <p className="safety-muted">
            Put files in <code>public/media</code>. Paths are relative to the build output.
          </p>

          <Button onClick={() => setConfig(false)}>
            Got it
            <Check />
          </Button>
        </div>
      </PreviewDialog>
      <PreviewDialog open={policy} onClose={() => setPolicy(false)} title="Protected files">
        <div className="safety-dialog-body">
          <ol className="safety-guide">
            <li>
              <span>
                <LockKeyhole size={18} />
              </span>
              <div>
                <strong>The live game</strong>
                <p>Files serving your current game can’t be selected for cleanup.</p>
              </div>
            </li>
            <li>
              <span>
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>A recovery version</strong>
                <p>The previous working release stays available in case you need to recover.</p>
              </div>
            </li>
            <li>
              <span>
                <Image size={18} />
              </span>
              <div>
                <strong>Media that’s still in use</strong>
                <p>
                  Any listing asset referenced by a public game is preserved, even when an older release is removed.
                </p>
              </div>
            </li>
          </ol>
          <Button onClick={() => setPolicy(false)}>Back to storage</Button>
        </div>
      </PreviewDialog>
      <PreviewDialog
        open={cleanup}
        onClose={() => {
          if (!pending) setCleanup(false)
        }}
        title={`Remove ${chosen.length} stored ${chosen.length === 1 ? "item" : "items"}?`}
        description="This cannot be undone."
      >
        <div className="safety-dialog-body">
          <div className="safety-cleanup-list">
            {chosen.map((item) => (
              <div key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    <Metadata items={[item.id, item.state]} />
                  </small>
                </span>
                <strong>{item.size} MiB</strong>
              </div>
            ))}
          </div>
          <div className="safety-cleanup-total">
            <span>Space recovered</span>
            <strong>{reclaim} MiB</strong>
          </div>
          <Notice tone="green">
            <strong>Your live game is protected</strong>
            <p>The live release, recovery version and listing media still in use won’t be removed.</p>
          </Notice>
          <label className="safety-confirmation" htmlFor="confirm-cleanup">
            <Checkbox
              id="confirm-cleanup"
              checked={confirmed}
              disabled={pending}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            Permanently remove these stored releases.
          </label>
          {error && <Notice tone="red">{error}</Notice>}
          <div className="safety-dialog-actions">
            <Button variant="outline" disabled={pending} onClick={() => setCleanup(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!confirmed || pending} onClick={() => void clean()}>
              <Trash2 />
              {pending ? "Removing…" : "Remove selected"}
            </Button>
          </div>
        </div>
      </PreviewDialog>
    </SafetyShell>
  )
}
