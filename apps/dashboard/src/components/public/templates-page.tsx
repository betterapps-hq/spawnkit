import { createProjectPlan, describeProjectPlan } from "@spawn/templates"
import {
  addons,
  physicsOptions,
  templates,
  telemetryOptions,
  uiOptions,
  validateProjectName,
  type AddonId,
  type PhysicsId,
  type TelemetryId,
  type TemplateId,
  type UiId
} from "@spawn/templates/catalog"
import { resolveComposition, selectedComponents } from "@spawn/templates/composition"
import { strToU8, zipSync } from "fflate"
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  FileCode2,
  Folder,
  Globe2,
  Monitor,
  Package,
  ShieldCheck,
  Smartphone,
  Terminal
} from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { CopyButton } from "../copy-button"
import { PublicShell } from "./shell"

const recommendations: Record<TemplateId, string> = {
  pixi: "Lightweight 2D renderer for custom game mechanics.",
  phaser: "2D game framework with scenes, sprites, and physics.",
  babylon: "3D engine with built-in scene and rendering tools.",
  three: "Flexible 3D renderer for custom worlds and interactions."
}
export function TemplatesPage({ initialEngine }: { initialEngine: TemplateId }) {
  const [engine, setEngine] = useState(initialEngine)
  const [name, setName] = useState("my-first-game")
  const [physics, setPhysics] = useState<PhysicsId>("none")
  const [ui, setUi] = useState<UiId>("html")
  const [telemetry, setTelemetry] = useState<TelemetryId>("none")
  const [ecs, setEcs] = useState("none")
  const [tools, setTools] = useState<AddonId[]>(["vitest"])
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const options = useMemo(
    () => ({
      name,
      template: engine,
      physics,
      ui,
      telemetry,
      addons: [...tools, ...(ecs === "none" ? [] : [ecs as AddonId])]
    }),
    [name, engine, physics, ui, telemetry, ecs, tools]
  )
  const selection = selectedComponents(options)
  const nameError = validateProjectName(name)
  const result = useMemo(() => {
    if (validateProjectName(options.name)) return { error: "Choose a valid project name to preview your files." }
    try {
      const resolved = resolveComposition(options.name, selectedComponents(options))
      if ("issue" in resolved) return { error: resolved.issue.message }
      const plan = createProjectPlan(resolved.plan.options)
      return { plan, description: describeProjectPlan(plan) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "This combination is not available." }
    }
  }, [options])
  const engineInfo = templates.find((item) => item.id === engine)!
  const command = `pnpm cli init ../${name} --add ${selection.join(",")}`
  function selectEngine(next: TemplateId) {
    setEngine(next)
    setPhysics("none")
    setUi("html")
    setNotice("")
  }
  async function download() {
    if (!result.plan || busy) return
    setBusy(true)
    setNotice("")
    try {
      const archive = zipSync(
        Object.fromEntries(
          Object.entries(result.plan.files).map(([path, source]) => [`${name}/${path}`, strToU8(source)])
        ),
        { level: 6 }
      )
      const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: "application/zip" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `${name}.zip`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setNotice("Your kit is ready. Extract it into a new folder, then follow the README to install and run it.")
    } catch {
      setNotice("The download could not be prepared. Try again, or copy the local CLI command below.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <PublicShell active="/create">
      <div className="p-container p-builder-page">
        <div className="p-builder-heading">
          <div>
            <h1>Build your starter kit</h1>
            <p>Choose your engine and tools. Download a standalone TypeScript project.</p>
          </div>
          <a href="/create" className="p-text-link">
            New to making games? <ArrowRight size={16} />
          </a>
        </div>
        <div className="p-builder-layout">
          <div className="p-builder-options">
            <section>
              <div className="p-builder-step">
                <span>01</span>
                <div>
                  <h2>Choose a platform</h2>
                </div>
              </div>
              <div className="p-platform-options">
                <div className="is-selected">
                  <Globe2 size={20} />
                  <b>Web</b>
                  <span>Ready to build</span>
                  <Check size={15} />
                </div>
                <div aria-disabled="true">
                  <Monitor size={20} />
                  <b>Desktop</b>
                  <span>Coming soon</span>
                </div>
                <div aria-disabled="true">
                  <Smartphone size={20} />
                  <b>Mobile</b>
                  <span>Coming soon</span>
                </div>
              </div>
            </section>
            <section>
              <div className="p-builder-step">
                <span>02</span>
                <div>
                  <h2>Choose your engine</h2>
                </div>
              </div>
              <div className="p-engine-grid" role="radiogroup" aria-label="Game engine">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    aria-label={template.name}
                    className={engine === template.id ? "is-selected" : ""}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="engine"
                      aria-label={template.name}
                      value={template.id}
                      checked={engine === template.id}
                      onChange={() => selectEngine(template.id)}
                    />
                    <div className="p-engine-image">
                      <img src={`/templates/${template.id}.webp`} alt="" />
                      <span>{template.dimension.toUpperCase()}</span>
                      {engine === template.id && (
                        <span className="p-engine-check">
                          <Check size={16} />
                        </span>
                      )}
                    </div>
                    <div className="p-engine-choice">
                      <img src={`/engines/${template.id}.${template.id === "phaser" ? "png" : "svg"}`} alt="" />
                      <h3>{template.name}</h3>
                      {template.id === "pixi" && <small>START HERE</small>}
                    </div>
                    <p>{recommendations[template.id]}</p>
                  </label>
                ))}
              </div>
            </section>
            <section>
              <div className="p-builder-step">
                <span>03</span>
                <div>
                  <h2>Configure your project</h2>
                </div>
              </div>
              <div className="p-builder-fields">
                <label className="p-field" htmlFor="project-name">
                  Project name
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setNotice("")
                    }}
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? "project-name-error" : undefined}
                    maxLength={64}
                  />
                </label>
                {nameError && (
                  <p id="project-name-error" className="p-field-error">
                    {nameError}
                  </p>
                )}
                <label className="p-field" htmlFor="physics">
                  Physics
                  <NativeSelect
                    id="physics"
                    value={physics}
                    onChange={(event) => setPhysics(event.target.value as PhysicsId)}
                  >
                    {physicsOptions
                      .filter((option) => (option.renderers as readonly string[]).includes(engine))
                      .map((option) => (
                        <NativeSelectOption key={option.id} value={option.id}>
                          {option.id === "none" ? "No physics" : option.name}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                  <small>Only options compatible with {engineInfo.name} are shown.</small>
                </label>
                <label className="p-field" htmlFor="game-interface">
                  Game interface
                  <NativeSelect id="game-interface" value={ui} onChange={(event) => setUi(event.target.value as UiId)}>
                    {uiOptions
                      .filter((option) => (option.renderers as readonly string[]).includes(engine))
                      .map((option) => (
                        <NativeSelectOption key={option.id} value={option.id}>
                          {option.name}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </label>
              </div>
              <details className="p-advanced">
                <summary>
                  Architecture & telemetry <ChevronDown size={17} />
                </summary>
                <div className="p-builder-fields">
                  <label className="p-field" htmlFor="entity-system">
                    Entity system
                    <NativeSelect id="entity-system" value={ecs} onChange={(event) => setEcs(event.target.value)}>
                      <NativeSelectOption value="none">Plain TypeScript</NativeSelectOption>
                      <NativeSelectOption value="koota">Koota</NativeSelectOption>
                      <NativeSelectOption value="bitecs">bitECS</NativeSelectOption>
                    </NativeSelect>
                  </label>
                  <label className="p-field" htmlFor="telemetry">
                    Telemetry
                    <NativeSelect
                      id="telemetry"
                      value={telemetry}
                      onChange={(event) => setTelemetry(event.target.value as TelemetryId)}
                    >
                      {telemetryOptions.map((option) => (
                        <NativeSelectOption key={option.id} value={option.id}>
                          {option.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <small>
                      {telemetry === "platform"
                        ? "Requires project credentials and player consent before sending events."
                        : telemetry === "sentry"
                          ? "Connect your own Sentry project and DSN."
                          : "Add error reporting when you’re ready."}
                    </small>
                  </label>
                </div>
              </details>
              <fieldset className="p-quality">
                <legend>
                  <ShieldCheck size={17} /> Testing tools
                </legend>
                {addons
                  .filter((addon) => addon.id !== "bitecs" && addon.id !== "koota")
                  .map((addon) => (
                    <label key={addon.id} htmlFor={`addon-${addon.id}`} aria-label={addon.name}>
                      <Checkbox
                        id={`addon-${addon.id}`}
                        aria-label={addon.name}
                        checked={tools.includes(addon.id)}
                        onCheckedChange={(checked) =>
                          setTools(checked === true ? [...tools, addon.id] : tools.filter((item) => item !== addon.id))
                        }
                      />
                      <div>
                        <b>{addon.name}</b>
                        <span>{addon.description}</span>
                      </div>
                    </label>
                  ))}
              </fieldset>
            </section>
          </div>
          <aside className="p-kit-summary">
            <div className="p-summary-top">
              <span className="p-live-dot" /> YOUR STARTER KIT <Package size={17} />
            </div>
            <div className="p-summary-content">
              <div className="p-kit-icon">
                <Code2 size={31} />
              </div>
              <h2>{name || "Your next game"}</h2>
              <p>
                {engineInfo.name} · {engineInfo.dimension.toUpperCase()} web game
              </p>
              <div className="p-summary-stack">
                <span>
                  Engine <b>{engineInfo.name}</b>
                </span>
                <span>
                  Physics <b>{physicsOptions.find((option) => option.id === physics)?.name}</b>
                </span>
                <span>
                  Interface <b>{uiOptions.find((option) => option.id === ui)?.name}</b>
                </span>
                <span>
                  Language <b>TypeScript</b>
                </span>
              </div>
              <div className="p-summary-included">
                <Check size={15} /> Vite, linting & formatting included
                <br />
                <Check size={15} /> Standalone. Ready for your AI editor.
              </div>
              <Button className="p-button" disabled={!result.plan || busy} onClick={() => void download()}>
                <ArrowDownToLine size={18} />
                {busy ? "Preparing your kit…" : "Download starter kit"}
              </Button>
              <p className="p-summary-free">100% free · No account needed</p>
              {notice && <output className="p-download-notice">{notice}</output>}
              {result.error && (
                <p role="alert" className="p-field-error">
                  {result.error}
                </p>
              )}
              <details className="p-file-preview">
                <summary>
                  <Folder size={16} />
                  {result.plan ? Object.keys(result.plan.files).length : 0} project files
                  <ChevronDown size={14} />
                </summary>
                <ul>
                  {result.plan &&
                    Object.keys(result.plan.files).map((file) => (
                      <li key={file}>
                        <FileCode2 size={12} />
                        {file}
                      </li>
                    ))}
                </ul>
              </details>
              <div className="p-included-steps">
                <b>Run your project</b>
                <ol>
                  <li>Extract into a new folder.</li>
                  <li>Open it in your AI coding editor.</li>
                  <li>
                    Run <code>pnpm install</code> and <code>pnpm dev</code>.
                  </li>
                </ol>
                <small>Requires Node.js 24+ and pnpm 12. No resources are provisioned by downloading.</small>
              </div>
            </div>
          </aside>
        </div>
        <section className="p-cli-alternative">
          <div>
            <Terminal size={24} />
            <h2>Create with the CLI</h2>
            <p>The same setup, from the SpawnKit repository. Public CLI package coming soon.</p>
          </div>
          <div>
            <code>{nameError ? "Choose a valid project name above." : command}</code>
            <CopyButton
              className="p-button p-button-outline"
              value={command}
              label="Copy CLI command"
              disabled={!!nameError || !result.plan}
            />
          </div>
        </section>
      </div>
    </PublicShell>
  )
}
