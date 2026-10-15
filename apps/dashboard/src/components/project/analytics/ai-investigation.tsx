import { ArrowUpRight, Check, Circle, LoaderCircle, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { CopyButton } from "../../copy-button"
import { Button } from "../../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import {
  investigationBrief,
  type InvestigationRequest,
  type InvestigationResult,
  type InvestigationEvidence,
  type Investigator
} from "./investigation"
import { scopeDates } from "./model"
import { Tone } from "./primitives"

export function AIInvestigation({
  request,
  investigator,
  canEdit,
  active,
  onEvidence
}: {
  request: InvestigationRequest
  investigator?: Investigator | null | undefined
  canEdit: boolean
  active: boolean
  onEvidence: (evidence: InvestigationEvidence) => void
}) {
  const [open, setOpen] = useState(false),
    [phase, setPhase] = useState<"idle" | "running" | "complete" | "error">("idle")
  const [step, setStep] = useState(0),
    [context, setContext] = useState("")
  const [result, setResult] = useState<InvestigationResult | null>(null),
    [snapshot, setSnapshot] = useState(request)
  const [checked, setChecked] = useState<string[]>([])
  const controller = useRef<AbortController | null>(null)
  const pendingEvidence = useRef<InvestigationEvidence | null>(null)
  const [pane, setPane] = useState("cause")
  const resume = useRef(false),
    wasActive = useRef(active)
  useEffect(() => {
    if (active && !wasActive.current && resume.current) {
      resume.current = false
      setOpen(true)
    }
    wasActive.current = active
  }, [active])
  useEffect(() => () => controller.current?.abort(), [])
  async function investigate() {
    if (!investigator || !canEdit) return
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    const input = { ...request, context: context.trim() }
    setSnapshot(input)
    setPhase("running")
    setStep(0)
    setResult(null)
    setChecked([])
    setPane("cause")
    try {
      const response = await investigator(input, {
        signal: current.signal,
        onProgress: (value) => {
          if (!current.signal.aborted) setStep(value)
        }
      })
      if (!current.signal.aborted) {
        setResult(response)
        setPhase("complete")
      }
    } catch {
      if (!current.signal.aborted) setPhase("error")
    }
  }
  function cancel() {
    controller.current?.abort()
    setPhase("idle")
  }
  return (
    <>
      <div className="an-ai-entry">
        <span className="an-ai-glyph">
          <Sparkles className="size-5" />
        </span>
        <div>
          <strong>AI investigation</strong>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            setOpen(true)
            if (!result && investigator && canEdit) void investigate()
          }}
        >
          {result ? "View investigation" : "Investigate with AI"}
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
      <Sheet open={open && active} onOpenChange={setOpen}>
        <SheetContent
          className="an-ai-sheet w-full overflow-auto sm:max-w-[640px]"
          onCloseAutoFocus={(event) => {
            if (pendingEvidence.current) {
              event.preventDefault()
              onEvidence(pendingEvidence.current)
              pendingEvidence.current = null
            }
          }}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AI investigation
            </SheetTitle>
            <SheetDescription>
              {request.issue.id}: {request.issue.title}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-5 pb-6">
            <div className="an-ai-scope">
              <span>{request.scope.environment}</span>
              <span>{request.scope.release === "all" ? "All releases" : request.scope.release}</span>
              <span>{scopeDates(request.scope)}</span>
            </div>
            {!investigator ? (
              <div className="an-ai-empty">
                <h3>Connect an investigation service</h3>
                <p>AI analysis is unavailable for this project.</p>
              </div>
            ) : phase === "idle" || phase === "error" ? (
              <>
                <div className="an-ai-intro">
                  <h3>What’s behind this issue?</h3>
                  <p>Trace the failure, inspect the source, and prepare a fix.</p>
                </div>
                <div className="an-ai-sources">
                  <span>Source context</span>
                  <span>
                    {request.sessions.filter((session) => session.issueId === request.issue.id).length} affected
                    sessions
                  </span>
                  {request.issue.operation && <span>Related trace</span>}
                </div>
                <label className="block text-xs font-medium">
                  Additional context
                  <textarea
                    className="an-ai-input"
                    placeholder="Recent changes, a reproduction, or a theory to check…"
                    value={context}
                    maxLength={2000}
                    disabled={!canEdit}
                    onChange={(event) => setContext(event.target.value)}
                  />
                </label>
                {phase === "error" && (
                  <p role="alert" className="an-negative">
                    Investigation failed. Your issue is unchanged.
                  </p>
                )}
                <Button onClick={() => void investigate()} disabled={!canEdit}>
                  <Sparkles className="size-4" />
                  {phase === "error" ? "Retry investigation" : "Start investigation"}
                </Button>
                {!canEdit && <p className="text-xs text-muted-foreground">Read-only access</p>}
              </>
            ) : phase === "running" ? (
              <div className="an-ai-progress" aria-live="polite" aria-busy="true">
                <h3>Following the evidence</h3>
                {[
                  "Read source and issue context",
                  "Correlate sessions and traces",
                  "Prepare a fix and verification plan"
                ].map((label, index) => (
                  <div key={label} data-active={step === index}>
                    {index < step ? <Check /> : index === step ? <LoaderCircle className="animate-spin" /> : <Circle />}
                    <span>{label}</span>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={cancel}>
                  Cancel investigation
                </Button>
              </div>
            ) : (
              result && (
                <>
                  <div className="an-ai-result-heading">
                    <Tone tone="purple">Likely cause</Tone>
                    <h3>{result.title}</h3>
                  </div>
                  <Tabs value={pane} onValueChange={setPane}>
                    <TabsList variant="line" className="w-full justify-start">
                      <TabsTrigger value="cause">Findings</TabsTrigger>
                      <TabsTrigger value="fix">Proposed fix</TabsTrigger>
                      <TabsTrigger value="verify">Verify</TabsTrigger>
                    </TabsList>
                    <TabsContent value="cause" className="an-ai-findings">
                      <p>{result.cause}</p>
                      <h4>Evidence</h4>
                      <div className="an-ai-evidence">
                        {result.evidence.map((evidence) => (
                          <button
                            key={evidence.id}
                            onClick={() => {
                              pendingEvidence.current = evidence
                              resume.current = evidence.source === "trace"
                              setOpen(false)
                            }}
                          >
                            <span className="an-evidence-id">{evidence.id}</span>
                            <span>
                              <strong>{evidence.title}</strong>
                              <small>{evidence.detail}</small>
                            </span>
                            <ArrowUpRight className="ml-auto size-4 shrink-0" />
                          </button>
                        ))}
                      </div>
                      <div className="an-ai-uncertainty">
                        <strong>Still to verify</strong>
                        <p>{result.uncertainty}</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="fix" className="an-ai-findings">
                      <p>{result.solution}</p>
                      {result.patch && (
                        <>
                          <div className="flex items-center justify-between">
                            <h4>Suggested change</h4>
                            <CopyButton value={result.patch} label="Copy proposed patch" compact />
                          </div>
                          <pre className="an-ai-diff">
                            {result.patch.split("\n").map((line, i) => (
                              <code
                                key={i}
                                data-kind={line.startsWith("+") ? "add" : line.startsWith("-") ? "remove" : "context"}
                              >
                                {line || " "}
                              </code>
                            ))}
                          </pre>
                          <span className="an-caption">Not applied or tested</span>
                        </>
                      )}
                    </TabsContent>
                    <TabsContent value="verify" className="an-ai-findings">
                      <h4>Verification checklist</h4>
                      {result.checks.map((check) => (
                        <label className="an-ai-check" key={check}>
                          <input
                            type="checkbox"
                            checked={checked.includes(check)}
                            onChange={(event) =>
                              setChecked((previous) =>
                                event.target.checked
                                  ? [...previous, check]
                                  : previous.filter((entry) => entry !== check)
                              )
                            }
                          />
                          <span>{check}</span>
                        </label>
                      ))}
                      <p className="an-caption">
                        {checked.length} of {result.checks.length} reviewed
                      </p>
                    </TabsContent>
                  </Tabs>
                  <div className="an-ai-actions">
                    <CopyButton value={investigationBrief(snapshot, result)} label="Copy for coding agent" />
                    <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setPhase("idle")}>
                      Add context & rerun
                    </Button>
                  </div>
                </>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
