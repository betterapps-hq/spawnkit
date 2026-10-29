import {
  gameDimensions,
  gameGenres,
  listingTemplate,
  listingSchema,
  parseListingConfig,
  type GameDetails,
  type GameListingConfig
} from "@spawn/templates/listing"
import { strToU8, zipSync } from "fflate"
import {
  CircleAlert,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileArchive,
  Film,
  Gamepad2,
  ImagePlus,
  LoaderCircle,
  Play,
  RefreshCw,
  X
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  checkGameName,
  gamePublisher,
  UploadSignInRequired,
  type UploadResult,
  type UploadStage
} from "../../../lib/game-upload"
import { readUploadListing, uploadArchiveLimit } from "../../../lib/upload-listing"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Textarea } from "../../ui/textarea"
import { SafetyShell } from "./safety-shared"
import "./upload-game.css"

type Step = 0 | 1 | 2
type Scenario =
  | "empty"
  | "ready"
  | "uploading"
  | "failed"
  | "invalid"
  | "complete"
  | "config"
  | "existing"
  | "publishing"
  | "publish-failed"
type Asset = { name: string; url: string; size: number; blob?: Blob }
const seed = {
  title: "Orchard Snake",
  description:
    "Collect apples and grow your snake through a sunny orchard. Find your rhythm, chase your best score, and try for one more bite.",
  genre: "Arcade",
  dimension: "2D"
}
const fixtureCover: Asset = { name: "orchard-cover.webp", url: "/examples/snake.webp", size: 184320 }
const steps = ["Game files", "Details", "Media"]

/** Shared form; Storybook simulates deployment unless explicitly mounted in live mode. */
export function UploadGamePreview({
  initialStep = 0,
  scenario = "empty",
  live = false,
  onProjectCreated,
  initialPublishStage = "processing"
}: {
  initialStep?: Step
  scenario?: Scenario
  live?: boolean
  initialPublishStage?: UploadStage
  onProjectCreated?: (() => void) | undefined
}) {
  const publisher = useRef<ReturnType<typeof gamePublisher> | null>(null)
  const archive = useRef<File | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [publishStage, setPublishStage] = useState<UploadStage>(initialPublishStage)
  const [createdProjectUrl, setCreatedProjectUrl] = useState<string | null>(null)
  const [publishError, setPublishError] = useState(
    scenario === "publish-failed"
      ? "Your game couldn’t be published. Try again, or open the project to review the build logs."
      : ""
  )
  const publishStatus = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>(initialStep)
  const [file, setFile] = useState(scenario === "empty" ? null : { name: "orchard-snake.zip", size: 18_874_368 })
  const [uploadState, setUploadState] = useState(
    scenario === "failed"
      ? "failed"
      : scenario === "invalid"
        ? "invalid"
        : scenario === "uploading"
          ? "uploading"
          : scenario === "empty"
            ? "empty"
            : "ready"
  )
  const [progress, setProgress] = useState(64)
  const [details, setDetails] = useState(
    scenario === "empty" || scenario === "uploading" ? { title: "", description: "", genre: "", dimension: "" } : seed
  )
  const [cover, setCover] = useState<Asset | null>(
    ["ready", "complete", "existing", "config", "publishing", "publish-failed"].includes(scenario) ? fixtureCover : null
  )
  const [video, setVideo] = useState<Asset | null>(null)
  const [mediaError, setMediaError] = useState({ cover: "", video: "" })
  const [dragging, setDragging] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [complete, setComplete] = useState(scenario === "complete")
  const [saved, setSaved] = useState(false)
  const [imported, setImported] = useState(scenario === "config")
  const [gameError, setGameError] = useState("")
  const [extraDetails, setExtraDetails] = useState<GameDetails>({})
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [publishing, setPublishing] = useState(scenario === "publishing")
  const gameInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const importRequest = useRef(0)
  const player = useRef<HTMLVideoElement>(null)
  const [nameCheck, setNameCheck] = useState<{
    name: string
    available: boolean
    slug?: string
    error?: string
  } | null>(null)
  useEffect(() => {
    if (!live || !details.title.trim() || createdProjectUrl) return
    let active = true
    const timer = setTimeout(() => {
      void checkGameName(details.title).then(
        (result) => {
          if (active) setNameCheck({ name: details.title, ...result })
        },
        () => {
          if (active)
            setNameCheck({
              name: details.title,
              available: false,
              error: "Couldn't check availability. Edit the name to try again."
            })
        }
      )
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [live, details.title, createdProjectUrl])
  const nameChecked = nameCheck?.name === details.title
  const nameAvailable = !live || Boolean(createdProjectUrl) || (nameChecked && nameCheck.available)
  const titleValid = details.title.trim().length > 0 && details.title.length <= 64 && nameAvailable
  const descriptionValid = details.description.trim().length >= 10
  const detailsValid = titleValid && descriptionValid && details.genre && details.dimension
  const slug =
    details.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "your-game"
  useEffect(
    () => () => {
      if (cover?.url.startsWith("blob:")) URL.revokeObjectURL(cover.url)
    },
    [cover]
  )
  useEffect(
    () => () => {
      if (video?.url.startsWith("blob:")) URL.revokeObjectURL(video.url)
    },
    [video]
  )
  useEffect(
    () => () => {
      if (demoTimer.current) clearTimeout(demoTimer.current)
      importRequest.current++
    },
    []
  )
  useEffect(() => {
    if (uploadState !== "uploading" || scenario === "uploading") return
    let percent = 10
    const timer = setInterval(() => {
      percent = Math.min(percent + 18, 100)
      setProgress(percent)
      if (percent === 100) {
        setUploadState("ready")
        clearInterval(timer)
      }
    }, 180)
    return () => clearInterval(timer)
  }, [uploadState, scenario])
  async function chooseGame(selected?: File) {
    if (!selected) return
    archive.current = selected
    const request = ++importRequest.current
    setFile({ name: selected.name, size: selected.size })
    setSaved(false)
    setGameError("")
    if (!selected.name.toLowerCase().endsWith(".zip") || selected.size > uploadArchiveLimit) {
      setGameError("Choose a game ZIP under 64 MB.")
      setUploadState("invalid")
      return
    }
    setUploadState("reading")
    try {
      const result = readUploadListing(new Uint8Array(await selected.arrayBuffer()))
      if (request !== importRequest.current) return
      if (result.config) {
        const { title, description, genre, dimension, details } = result.config
        setDetails({ title, description, genre, dimension })
        setExtraDetails(details ?? {})
        const asset = (file: NonNullable<typeof result.cover>): Asset => ({
          name: file.name,
          size: file.data.length,
          blob: new Blob([new Uint8Array(file.data)], { type: file.type }),
          url: URL.createObjectURL(new Blob([new Uint8Array(file.data)], { type: file.type }))
        })
        setCover(result.cover ? asset(result.cover) : null)
        setVideo(result.video ? asset(result.video) : null)
        setMediaError({ cover: "", video: "" })
      }
      setImported(Boolean(result.config))
      setUploadState("ready")
    } catch (error) {
      if (request !== importRequest.current) return
      setGameError(error instanceof Error ? error.message : "This ZIP couldn't be opened.")
      setUploadState("invalid")
    }
  }
  function downloadConfig(config?: GameListingConfig) {
    try {
      const value =
        config ??
        parseListingConfig({
          schemaVersion: 1,
          ...details,
          coverPath: cover?.name ?? "cover.png",
          ...(video ? { trailerPath: video.name } : {}),
          ...(Object.keys(extraDetails).length ? { details: extraDetails } : {})
        })
      const json = (data: unknown) => JSON.stringify(data, null, 2) + "\n"
      const blob = config
        ? new Blob(
            [
              new Uint8Array(
                zipSync({
                  "spawnkit.config.json": strToU8(json({ $schema: "./spawnkit.config.schema.json", ...value })),
                  "spawnkit.config.schema.json": strToU8(json(listingSchema))
                })
              )
            ],
            { type: "application/zip" }
          )
        : new Blob([json(value)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = config ? "spawnkit-config-template.zip" : "spawnkit.config.json"
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      setGameError("")
    } catch (error) {
      setGameError(error instanceof Error ? error.message : "Couldn't download the config.")
    }
  }
  function chooseMedia(kind: "cover" | "video", selected?: File) {
    if (!selected) return
    const max = (kind === "cover" ? 1 : 2) * 1024 * 1024
    const types = kind === "cover" ? ["image/png", "image/jpeg", "image/webp"] : ["video/mp4", "video/webm"]
    if (!types.includes(selected.type) || selected.size > max) {
      setMediaError((current) => ({
        ...current,
        [kind]:
          selected.size > max
            ? `Choose a file under ${kind === "cover" ? "1" : "2"} MB.`
            : kind === "cover"
              ? "Choose a PNG, JPG, or WebP image."
              : "Choose an MP4 or WebM video."
      }))
      return
    }
    const asset = { name: selected.name, size: selected.size, blob: selected, url: URL.createObjectURL(selected) }
    if (kind === "cover") setCover(asset)
    else setVideo(asset)
    setMediaError((current) => ({ ...current, [kind]: "" }))
    setSaved(false)
  }
  async function next() {
    setAttempted(true)
    if (step === 0 && uploadState === "ready") {
      setStep(1)
      setAttempted(false)
    } else if (step === 1 && detailsValid) {
      setStep(2)
      setAttempted(false)
    } else if (step === 1 && !titleValid) titleInput.current?.focus()
    else if (step === 2 && cover && detailsValid) {
      if (publishing) return
      setPublishing(true)
      if (live) {
        try {
          if (!archive.current) throw new Error("Choose a game ZIP first.")
          publisher.current ??= gamePublisher(onProjectCreated)
          const config = parseListingConfig({
            schemaVersion: 1,
            ...details,
            coverPath: cover.name,
            ...(video ? { trailerPath: video.name } : {}),
            ...(Object.keys(extraDetails).length ? { details: extraDetails } : {})
          })
          setGameError("")
          setPublishError("")
          setNeedsSignIn(false)
          const deployed = await publisher.current({ archive: archive.current, config, cover, video }, (stage) => {
            setPublishStage(stage)
            setCreatedProjectUrl(publisher.current?.projectUrl() ?? null)
          })
          setResult(deployed)
          setComplete(true)
        } catch (error) {
          setNeedsSignIn(error instanceof UploadSignInRequired)
          setPublishError(
            error instanceof UploadSignInRequired
              ? ""
              : error instanceof Error
                ? error.message
                : "Deployment failed. Please retry."
          )
        } finally {
          setCreatedProjectUrl(publisher.current?.projectUrl() ?? null)
          setPublishing(false)
        }
        return
      }
      demoTimer.current = setTimeout(() => {
        setPublishing(false)
        setComplete(true)
      }, 800)
    }
  }
  function update(key: keyof typeof seed, value: string) {
    setDetails((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }
  useEffect(() => {
    if (publishing || publishError || needsSignIn) {
      publishStatus.current?.focus({ preventScroll: true })
      publishStatus.current?.scrollIntoView({ block: "nearest", behavior: "instant" })
    }
  }, [publishing, publishError, needsSignIn])
  const stageIndex =
    publishStage === "preparing" ? 0 : publishStage === "uploading" ? 1 : publishStage === "publishing" ? 3 : 2
  const preview = (
    <aside className="upload-preview" aria-label="Listing preview">
      <div className="upload-preview-heading">
        <span>Listing preview</span>
      </div>
      <div
        className="upload-game-card"
        onMouseEnter={() => {
          if (!matchMedia("(prefers-reduced-motion: reduce)").matches) void player.current?.play().catch(() => {})
        }}
        onMouseLeave={() => {
          if (player.current) {
            player.current.pause()
            player.current.currentTime = 0
          }
        }}
      >
        <div className="upload-card-art">
          {cover ? (
            <img src={cover.url} alt={`${details.title || "Your game"} cover`} />
          ) : (
            <div className="upload-art-placeholder">
              <Gamepad2 size={36} />
              <span>Your cover image</span>
            </div>
          )}
          {video && (
            <video
              ref={player}
              src={video.url}
              muted
              playsInline
              loop
              preload="metadata"
              aria-label="Gameplay preview"
            />
          )}
          <div className="upload-card-shade" />
          <div className="upload-card-title">
            <h3>{details.title || "Your game title"}</h3>
            <span aria-hidden="true">
              <Play size={15} fill="currentColor" />
            </span>
          </div>
        </div>
        <div className="upload-card-info">
          <div>
            <span>{details.genre || "Genre"}</span>
            <span>{details.dimension || "2D / 3D"}</span>
          </div>
          <p>{details.description || "Your description will appear here."}</p>
        </div>
      </div>
      {!live && (
        <div className="upload-destination">
          <Gamepad2 size={15} />
          <span>{slug}.spawnkit.games</span>
        </div>
      )}
      <ol className="upload-checklist">
        {[
          { text: "Game files", done: uploadState === "ready" },
          { text: "Game details", done: Boolean(detailsValid) },
          { text: "Cover image", done: Boolean(cover) }
        ].map((item) => (
          <li key={item.text} data-done={item.done}>
            <span>{item.done ? <Check size={12} /> : null}</span>
            {item.text}
          </li>
        ))}
      </ol>
    </aside>
  )
  const content = (
    <div className="upload-page">
      {publishing && publishStage === "publishing" ? (
        <div className="upload-complete" aria-live="polite">
          <span>
            <CheckCircle2 size={28} />
          </span>
          <h2>{details.title} uploaded</h2>
          <p className="text-muted-foreground">Your game address is being prepared.</p>
          {cover && (
            <div className="upload-complete-cover">
              <img src={cover.url} alt={`${details.title} cover`} />
            </div>
          )}
          <div className="upload-complete-actions">
            <Button disabled>
              <LoaderCircle className="animate-spin" />
              Play game
            </Button>
            {createdProjectUrl && (
              <Button asChild variant="outline">
                <a href={createdProjectUrl}>
                  Open project <ArrowRight />
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : complete ? (
        <div className="upload-complete">
          <span>
            <CheckCircle2 size={28} />
          </span>
          <h2>{details.title} is live!</h2>
          <a
            className="upload-complete-url"
            href={result?.url ?? `https://${slug}.spawnkit.games`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {result ? new URL(result.url).hostname : `${slug}.spawnkit.games`} <ExternalLink size={14} />
          </a>
          {cover && (
            <a
              className="upload-complete-cover"
              href={result?.url ?? `https://${slug}.spawnkit.games`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Play ${details.title}`}
            >
              <img src={cover.url} alt={`${details.title} cover`} />
            </a>
          )}
          <div className="upload-complete-actions">
            <Button asChild>
              <a href={result?.url ?? `https://${slug}.spawnkit.games`} target="_blank" rel="noopener noreferrer">
                <Play />
                Play game
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={result?.dashboardUrl ?? "?id=project-dashboard-overview--frontend-only&viewMode=story"}>
                Open project
                <ArrowRight />
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <nav className="upload-steps" aria-label="Upload steps" hidden={publishing}>
            {steps.map((label, index) => (
              <button
                key={label}
                aria-current={step === index ? "step" : undefined}
                disabled={publishing || (index > step && (uploadState !== "ready" || (index === 2 && !detailsValid)))}
                onClick={() => {
                  setStep(index as Step)
                  setAttempted(false)
                }}
              >
                <span>{index < step ? <Check size={14} /> : index + 1}</span>
                {label}
                {index < 2 && <ArrowRight size={14} className="upload-step-arrow" />}
              </button>
            ))}
          </nav>
          {(publishing || publishError || needsSignIn) && (
            <div
              ref={publishStatus}
              tabIndex={-1}
              className="upload-publish-status"
              data-failed={Boolean(publishError)}
            >
              <div className="upload-publish-heading">
                <span className="upload-publish-icon">
                  {publishing ? <LoaderCircle className="animate-spin" /> : <CircleAlert />}
                </span>
                <div>
                  <h2>
                    {publishing
                      ? `Publishing ${details.title}`
                      : needsSignIn
                        ? "Sign in to continue"
                        : "Couldn't publish your game"}
                  </h2>
                  {publishing ? (
                    <output>
                      {publishStage === "queued"
                        ? "Waiting to prepare your game…"
                        : [
                            "Checking your game files…",
                            "Sending your game files…",
                            "Preparing your game and media…",
                            "Setting up your game address…"
                          ][stageIndex]}
                    </output>
                  ) : publishError ? (
                    <p role="alert">{publishError}</p>
                  ) : null}
                </div>
              </div>
              {publishing ? (
                <ol className="upload-publish-stages" aria-label="Publishing progress">
                  {["Check files", "Upload", "Prepare", "Publish"].map((label, index) => (
                    <li
                      key={label}
                      data-state={index < stageIndex ? "done" : index === stageIndex ? "active" : "waiting"}
                      aria-current={index === stageIndex ? "step" : undefined}
                    >
                      <span>{index < stageIndex ? <Check size={14} /> : index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="upload-publish-actions">
                  {needsSignIn && (
                    <Button asChild>
                      <a href="/sign-in" target="_blank" rel="noopener noreferrer">
                        Sign in <ExternalLink />
                      </a>
                    </Button>
                  )}
                  <Button variant={needsSignIn ? "outline" : "default"} onClick={() => void next()}>
                    <RefreshCw />
                    Try again
                  </Button>
                  {createdProjectUrl && (
                    <Button asChild variant="outline">
                      <a href={createdProjectUrl}>
                        Open project <ArrowRight />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="upload-layout" hidden={publishing}>
            <div className="upload-editor">
              <div className="upload-section-heading">
                <div>
                  <h2>{step === 0 ? "Game files" : step === 1 ? "Game details" : "Cover & video"}</h2>
                  <p>
                    {step === 0
                      ? "Upload a ZIP of your browser build."
                      : step === 1
                        ? "Shown on your game page and in search."
                        : "The cover appears in search. Video plays on hover."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={step > 0 && !detailsValid}
                  onClick={() => downloadConfig(step === 0 && !detailsValid ? listingTemplate : undefined)}
                >
                  <Download />
                  {step === 0 && !detailsValid ? "Download template" : "Download config"}
                </Button>
              </div>
              {step > 0 && gameError && (
                <p className="upload-field-error" role="alert">
                  {gameError}
                </p>
              )}
              {step === 0 && (
                <section aria-label="Game files">
                  <input
                    ref={gameInput}
                    type="file"
                    accept=".zip"
                    className="sr-only"
                    aria-label="Game ZIP"
                    onChange={(event) => {
                      void chooseGame(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  {file ? (
                    <div
                      className="upload-file-panel"
                      data-error={uploadState === "failed" || uploadState === "invalid"}
                    >
                      <div className="upload-file-heading">
                        <span>
                          <FileArchive size={24} />
                        </span>
                        <div>
                          <strong>{file.name}</strong>
                          <small>{formatSize(file.size)}</small>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove game file"
                          onClick={() => {
                            importRequest.current++
                            setFile(null)
                            setUploadState("empty")
                            setGameError("")
                            setDetails({ title: "", description: "", genre: "", dimension: "" })
                            setExtraDetails({})
                            setCover(null)
                            setVideo(null)
                            setImported(false)
                            setMediaError({ cover: "", video: "" })
                            setSaved(false)
                            setAttempted(false)
                            setProgress(0)
                          }}
                        >
                          <X />
                        </Button>
                      </div>
                      {uploadState === "reading" ? (
                        <output className="upload-file-ready">
                          <LoaderCircle size={16} className="animate-spin" />
                          Reading game files
                        </output>
                      ) : uploadState === "uploading" ? (
                        <div className="upload-progress">
                          <div>
                            <span>Uploading</span>
                            <span>{progress}%</span>
                          </div>
                          <progress value={progress} max={100} aria-label="Game upload progress" />
                        </div>
                      ) : uploadState === "failed" || uploadState === "invalid" ? (
                        <div className="upload-file-error" role="alert">
                          <p>
                            {uploadState === "invalid"
                              ? gameError || "Upload a browser build ZIP with index.html at its root."
                              : "Upload interrupted. Your details are saved in this form."}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              uploadState === "invalid"
                                ? gameInput.current?.click()
                                : (setProgress(10), setUploadState("uploading"))
                            }
                          >
                            <RefreshCw />
                            {uploadState === "invalid" ? "Choose another file" : "Retry upload"}
                          </Button>
                        </div>
                      ) : (
                        <div className="upload-file-ready">
                          <CheckCircle2 size={16} />
                          <span>Ready to deploy</span>
                          <Button variant="ghost" size="sm" onClick={() => gameInput.current?.click()}>
                            Replace
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="upload-dropzone"
                      data-dragging={dragging}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDragging(false)
                        void chooseGame(event.dataTransfer.files[0])
                      }}
                    >
                      <div className="upload-file-illustration" aria-hidden="true">
                        <div />
                        <div />
                        <FileArchive size={38} />
                      </div>
                      <h3>Drop your game ZIP here</h3>
                      <p>Include index.html and your game assets. Up to 20 MB expanded.</p>
                      <Button onClick={() => gameInput.current?.click()}>
                        <CloudUpload />
                        Choose file
                      </Button>
                    </div>
                  )}
                </section>
              )}
              {step === 1 && (
                <section className="upload-details" aria-label="Game details">
                  {imported && (
                    <div className="upload-import-source">
                      <Check size={14} />
                      Imported from spawnkit.config.json
                    </div>
                  )}
                  <div className="upload-field">
                    <label htmlFor="upload-title">Game title</label>
                    <Input
                      ref={titleInput}
                      id="upload-title"
                      maxLength={64}
                      value={details.title}
                      placeholder="e.g. Orchard Snake"
                      aria-invalid={(attempted && !titleValid) || Boolean(live && nameChecked && !nameCheck.available)}
                      aria-describedby={
                        details.title.trim() && live && !createdProjectUrl
                          ? "upload-name-status"
                          : attempted && !titleValid
                            ? "upload-title-error"
                            : undefined
                      }
                      onChange={(event) => update("title", event.target.value)}
                    />
                    {attempted && !details.title.trim() && (
                      <span id="upload-title-error" role="alert">
                        Enter a game title.
                      </span>
                    )}
                    {live && details.title.trim() && !createdProjectUrl && (
                      <span id="upload-name-status" aria-live="polite">
                        {!nameChecked
                          ? "Checking availability…"
                          : (nameCheck.error ??
                            (nameCheck.available
                              ? "This game name is available."
                              : `The name "${details.title.trim()}" is already taken! Please choose a unique name.`))}
                      </span>
                    )}
                  </div>
                  <div className="upload-field">
                    <div>
                      <label htmlFor="upload-description">Description</label>
                      <span>{details.description.length}/500</span>
                    </div>
                    <Textarea
                      id="upload-description"
                      rows={5}
                      maxLength={500}
                      placeholder="What makes your game fun to play?"
                      value={details.description}
                      aria-invalid={attempted && !descriptionValid}
                      aria-describedby={attempted && !descriptionValid ? "upload-description-error" : undefined}
                      onChange={(event) => update("description", event.target.value)}
                    />
                    {attempted && !descriptionValid && (
                      <span id="upload-description-error" role="alert">
                        Use at least 10 characters.
                      </span>
                    )}
                  </div>
                  <div className="upload-field-pair">
                    <div className="upload-field">
                      <label htmlFor="upload-genre">Genre</label>
                      <Select value={details.genre} onValueChange={(value) => update("genre", value)}>
                        <SelectTrigger id="upload-genre" aria-label="Genre" aria-invalid={attempted && !details.genre}>
                          <SelectValue placeholder="Choose a genre" />
                        </SelectTrigger>
                        <SelectContent>
                          {gameGenres.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {attempted && !details.genre && <span role="alert">Choose a genre.</span>}
                    </div>
                    <fieldset className="upload-field upload-dimension">
                      <legend>Dimensions</legend>
                      <div>
                        {gameDimensions.map((value) => (
                          <button
                            type="button"
                            key={value}
                            aria-pressed={details.dimension === value}
                            onClick={() => update("dimension", value)}
                          >
                            {value}
                            {details.dimension === value && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                      {attempted && !details.dimension && <span role="alert">Choose 2D or 3D.</span>}
                    </fieldset>
                  </div>
                </section>
              )}
              {step === 2 && (
                <section className="upload-media" aria-label="Game media">
                  <input
                    ref={coverInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Cover image file"
                    className="sr-only"
                    onChange={(event) => {
                      chooseMedia("cover", event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  <input
                    ref={videoInput}
                    type="file"
                    accept="video/mp4,video/webm"
                    aria-label="Gameplay video file"
                    className="sr-only"
                    onChange={(event) => {
                      chooseMedia("video", event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  <div className="upload-media-label">
                    <h3>Cover image</h3>
                    <span>Required</span>
                  </div>
                  <div className="upload-cover-editor">
                    {cover ? (
                      <>
                        <img
                          src={cover.url}
                          alt="Selected cover"
                          onError={() => {
                            setCover(null)
                            setMediaError((current) => ({
                              ...current,
                              cover: "This image couldn't be opened. Choose another file."
                            }))
                          }}
                        />
                        <div className="upload-cover-actions">
                          <Button variant="secondary" size="sm" onClick={() => coverInput.current?.click()}>
                            <ImagePlus />
                            Replace image
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Remove cover"
                            onClick={() => setCover(null)}
                          >
                            <X />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <button className="upload-cover-empty" onClick={() => coverInput.current?.click()}>
                        <ImagePlus size={26} />
                        <strong>Choose a cover image</strong>
                        <span>PNG, JPG, or WebP</span>
                      </button>
                    )}
                  </div>
                  <div className="upload-media-hint">
                    <span>16:9 recommended</span>
                    <span>Up to 1 MB</span>
                  </div>
                  {(mediaError.cover || (attempted && !cover)) && (
                    <p className="upload-field-error" role="alert">
                      {mediaError.cover || "Add a cover image to continue."}
                    </p>
                  )}
                  <div className="upload-media-label">
                    <h3>Gameplay preview</h3>
                    <span>Optional</span>
                  </div>
                  <div className="upload-video-file">
                    <span>
                      <Film size={22} />
                    </span>
                    <div>
                      <strong>{video?.name || "Play a clip on hover"}</strong>
                      <p>{video ? formatSize(video.size) : "MP4 or WebM, up to 2 MB"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => videoInput.current?.click()}>
                      {video ? "Replace" : "Add video"}
                    </Button>
                    {video && (
                      <Button variant="ghost" size="icon-sm" aria-label="Remove video" onClick={() => setVideo(null)}>
                        <X />
                      </Button>
                    )}
                  </div>
                  {mediaError.video && (
                    <p className="upload-field-error" role="alert">
                      {mediaError.video}
                    </p>
                  )}
                </section>
              )}
              <footer className="upload-footer">
                {(!live || step > 0) && (
                  <Button variant="ghost" onClick={() => (step > 0 ? setStep((step - 1) as Step) : setSaved(true))}>
                    {step > 0 ? (
                      <>
                        <ArrowLeft />
                        Back
                      </>
                    ) : (
                      "Save draft"
                    )}
                  </Button>
                )}
                <output>{!live && saved ? "Draft saved" : ""}</output>
                {!live && step > 0 && (
                  <Button variant="ghost" onClick={() => setSaved(true)}>
                    Save draft
                  </Button>
                )}
                <Button disabled={(step === 0 && uploadState !== "ready") || publishing} onClick={() => void next()}>
                  {publishing ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Deploying
                    </>
                  ) : step === 2 ? (
                    <>
                      {scenario === "existing" ? "Deploy update" : "Deploy game"}
                      <ArrowRight />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight />
                    </>
                  )}
                </Button>
              </footer>
            </div>
            {preview}
          </div>
        </>
      )}
    </div>
  )
  return live ? (
    content
  ) : (
    <SafetyShell page="Upload game" accountRole="Creator">
      {content}
    </SafetyShell>
  )
}
function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
