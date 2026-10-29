import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Flag,
  Gamepad2,
  LockKeyhole,
  MessageSquare,
  MoreHorizontal,
  Star
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { PublicShell } from "../../public/shell"
import { Button } from "../../ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Textarea } from "../../ui/textarea"
import { caseSeeds } from "./safety-fixtures"
import { Avatar, Metadata, Notice, PreviewDialog } from "./safety-shared"

type PlayerScenario = "entry" | "game" | "comment" | "signed-out" | "duplicate" | "rate-limit" | "error" | "received"
const gameReasons = [
  ["Unsafe content or links", "Harmful downloads, suspicious links or inappropriate content."],
  ["Misleading game listing", "The cover, description or game is not what it claims to be."],
  ["Spam or advertising", "Unwanted promotions or repeated advertising."],
  ["Something else", "Tell us what needs our attention."]
]
const commentReasons = [
  ["Spam or advertising", "Unwanted promotions, repeated posts or suspicious links."],
  ["Harassment or hate", "Abusive language or content targeting a person or group."],
  ["Personal information", "Private information shared without permission."],
  ["Something else", "Tell us what needs our attention."]
]

export function PlayerReportPreview({ scenario = "entry" }: { scenario?: PlayerScenario }) {
  const [open, setOpen] = useState(scenario !== "entry")
  const [target, setTarget] = useState<"game" | "comment">(scenario === "comment" ? "comment" : "game")
  const [step, setStep] = useState<"reason" | "details" | "received">(scenario === "received" ? "received" : "reason")
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [signedIn, setSignedIn] = useState(scenario !== "signed-out")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [attempted, setAttempted] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [receipt, setReceipt] = useState(scenario === "duplicate" || scenario === "received")
  const [submittedTarget, setSubmittedTarget] = useState<"game" | "comment">("game")
  const [cooldown, setCooldown] = useState(scenario === "rate-limit")
  function begin(kind: "game" | "comment") {
    if (kind !== target) {
      setReason("")
      setDetails("")
      setError("")
    }
    setTarget(kind)
    setStep(receipt && submittedTarget === kind ? "received" : "reason")
    setOpen(true)
    setDiscard(false)
  }
  function close() {
    if (pending) return
    if ((reason || details) && step !== "received") {
      setDiscard(true)
      return
    }
    setOpen(false)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (step !== "details" || pending || !reason || (reason === "Something else" && !details.trim())) return
    setPending(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 500))
    setPending(false)
    if (scenario === "error" && !attempted) {
      setAttempted(true)
      setError("Report wasn’t sent. Try again.")
      return
    }
    setReceipt(true)
    setSubmittedTarget(target)
    setStep("received")
  }
  const reasons = target === "game" ? gameReasons : commentReasons
  const duplicate = scenario === "duplicate" && receipt && submittedTarget === target
  return (
    <PublicShell active="/">
      <div className="safety-player">
        <div className="safety-player-heading">
          <a href="https://spawnkit.cloud/">
            <ArrowLeft size={16} />
            All games
          </a>
          <div>
            <div>
              <Metadata items={["Arcade", "2D"]} />
              <h1>Orchard Snake</h1>
              <p>By Orchard Studio</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Game options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => begin("game")}>
                  <Flag />
                  Report game
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="safety-player-stage">
          <img src="/examples/snake.webp" alt="Illustrated Orchard Snake game environment" />
          <div>
            <Gamepad2 size={25} />
            <strong>Orchard Snake</strong>
            <span>Game preview</span>
          </div>
        </div>
        <div className="safety-player-below">
          <section>
            <p>Collect apples and grow your snake.</p>
            <div className="safety-player-stats">
              <span>
                <Star size={14} />
                4.8 <small>12 ratings</small>
              </span>
              <span>
                <MessageSquare size={14} />3 comments
              </span>
            </div>
            <div className="safety-player-discussion">
              <h2>
                Conversation <span>3</span>
              </h2>
              <article>
                <Avatar name="Juniper" />
                <div>
                  <header>
                    <strong>juniper</strong>
                    <time>2 hours ago</time>
                  </header>
                  <p>This is my new five-minute break. The little details are lovely!</p>
                </div>
              </article>
              <article className="safety-reportable-comment">
                <Avatar name="Pixel Pilot" />
                <div>
                  <header>
                    <strong>pixelpilot</strong>
                    <time>34 minutes ago</time>
                  </header>
                  <p>{caseSeeds[0]!.content}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Comment options">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => begin("comment")}>
                      <Flag />
                      Report comment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
              <article>
                <Avatar name="Sky Bound" />
                <div>
                  <header>
                    <strong>skybound</strong>
                    <time>12 minutes ago</time>
                  </header>
                  <p>Finally beat my high score. The corner turns are everything.</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
      <PreviewDialog
        open={open}
        onClose={close}
        title={
          discard
            ? "Keep your report?"
            : !signedIn
              ? "Sign in to report"
              : duplicate
                ? "Already reported"
                : cooldown
                  ? "Report limit reached"
                  : step === "received"
                    ? "Report received"
                    : `Report ${target}`
        }
        description={
          discard
            ? "Your report hasn’t been sent."
            : cooldown && signedIn && !duplicate
              ? "Try again in a few minutes."
              : undefined
        }
      >
        {discard ? (
          <div className="safety-dialog-body">
            <div className="safety-dialog-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setReason("")
                  setDetails("")
                  setError("")
                  setDiscard(false)
                  setOpen(false)
                }}
              >
                Discard draft
              </Button>
              <Button onClick={() => setDiscard(false)}>Keep writing</Button>
            </div>
          </div>
        ) : !signedIn ? (
          <div className="safety-dialog-body">
            <div className="safety-report-symbol">
              <LockKeyhole size={28} />
            </div>

            <Button onClick={() => setSignedIn(true)}>
              Continue with demo account
              <ArrowRight />
            </Button>
          </div>
        ) : duplicate || cooldown || step === "received" ? (
          <div className="safety-dialog-body">
            <div className="safety-receipt">
              <span>
                <CheckCircle2 size={30} />
              </span>
              {!cooldown && (
                <div>
                  <LockKeyhole size={14} />
                  Your identity stays private.
                </div>
              )}
            </div>

            <Button onClick={() => setOpen(false)}>
              Back to the game
              <ArrowRight />
            </Button>
            {cooldown && (
              <button className="safety-text-button" onClick={() => setCooldown(false)}>
                Preview after the limit clears
              </button>
            )}
          </div>
        ) : (
          <form className="safety-dialog-body" onSubmit={(event) => void submit(event)}>
            <div className="safety-report-progress" aria-label={`Step ${step === "reason" ? 1 : 2} of 2`}>
              <span data-active="true" />
              <span data-active={step === "details"} />
              <small>Step {step === "reason" ? "1" : "2"} of 2</small>
            </div>
            <div className="safety-target">
              <img src="/examples/snake.webp" alt="" />
              <div>
                <strong>Orchard Snake</strong>
                <span>{target === "comment" ? "Comment by pixelpilot" : "Game by Orchard Studio"}</span>
              </div>
            </div>
            {target === "comment" && <blockquote className="safety-report-quote">{caseSeeds[0]!.content}</blockquote>}
            {step === "reason" ? (
              <fieldset>
                <legend className="safety-field-label">What’s the issue?</legend>
                <RadioGroup value={reason} onValueChange={setReason} className="safety-role-options">
                  {reasons.map(([label, description]) => (
                    <label key={label} htmlFor={`report-reason-${label}`} data-selected={reason === label}>
                      <RadioGroupItem id={`report-reason-${label}`} value={label!} aria-label={label} />
                      <span>
                        <strong>{label}</strong>
                        <span>{description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            ) : (
              <>
                <div className="safety-report-chosen">
                  <span>
                    <Flag size={14} />
                    {reason}
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setStep("reason")}>
                    Change
                  </Button>
                </div>
                <div className="safety-field">
                  <label htmlFor="player-report-details">
                    What should we know? <span>{reason === "Something else" ? "Required" : "Optional"}</span>
                  </label>
                  <Textarea
                    id="player-report-details"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    maxLength={500}
                    disabled={pending}
                    placeholder="Share where you saw the issue and what happened."
                  />
                  <small className="safety-field-foot">
                    <span>Don’t include passwords or private account details.</span>
                    <span>{details.length}/500</span>
                  </small>
                </div>
              </>
            )}
            <p className="safety-private-note">
              <LockKeyhole size={13} />
              Only the moderation team can see your report.
            </p>
            {error && <Notice tone="red">{error}</Notice>}
            <div className="safety-dialog-actions">
              <Button
                variant="outline"
                type="button"
                disabled={pending}
                onClick={() => (step === "details" ? setStep("reason") : close())}
              >
                {step === "details" ? (
                  <>
                    <ChevronLeft />
                    Back
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
              {step === "reason" ? (
                <Button
                  key="continue"
                  type="button"
                  disabled={!reason}
                  onClick={(event) => {
                    event.preventDefault()
                    setStep("details")
                  }}
                >
                  Continue
                  <ArrowRight />
                </Button>
              ) : (
                <Button
                  key="submit"
                  type="submit"
                  disabled={pending || (reason === "Something else" && !details.trim())}
                >
                  {pending ? "Sending…" : "Send report"}
                  <Check />
                </Button>
              )}
            </div>
          </form>
        )}
      </PreviewDialog>
    </PublicShell>
  )
}
