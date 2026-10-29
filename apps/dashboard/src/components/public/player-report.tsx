import { reportReasons, type ReportKind } from "@spawn/platform/community"
import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { CommunityError, communityRequest } from "../../lib/community"
import { Notice, PreviewDialog } from "../moderation/design/safety-shared"
import { Button } from "../ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Textarea } from "../ui/textarea"
import "./player-report.css"

export function PlayerReport({
  projectId,
  commentId,
  title
}: {
  projectId: string
  commentId?: string
  title: string
}) {
  const [open, setOpen] = useState(false),
    [step, setStep] = useState("reason"),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [discard, setDiscard] = useState(false)
  const kind: ReportKind = commentId ? "Comment" : "Game"
  const send = useMutation({
    mutationFn: () =>
      communityRequest<{ received: boolean; duplicate: boolean }>(`games/${projectId}/reports`, {
        kind,
        reason,
        details,
        ...(commentId ? { commentId } : {})
      }),
    onSuccess: () => setStep("received")
  })
  function close() {
    if (send.isPending) return
    if (step !== "received" && (reason || details)) {
      setDiscard(true)
      return
    }
    setOpen(false)
  }
  const signedOut = send.error instanceof CommunityError && send.error.status === 401
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={commentId ? `Options for ${title}’s comment` : "Game options"}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setOpen(true)
              setDiscard(false)
            }}
          >
            <Flag />
            Report {kind.toLowerCase()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PreviewDialog
        open={open}
        onClose={close}
        title={discard ? "Discard report?" : step === "received" ? "Report received" : `Report ${kind.toLowerCase()}`}
      >
        <div className="player-report-form">
          {discard ? (
            <>
              <p>Your report hasn’t been sent.</p>
              <footer>
                <Button variant="outline" onClick={() => setDiscard(false)}>
                  Keep editing
                </Button>
                <Button
                  onClick={() => {
                    setDiscard(false)
                    setOpen(false)
                    setReason("")
                    setDetails("")
                    setStep("reason")
                    send.reset()
                  }}
                >
                  Discard
                </Button>
              </footer>
            </>
          ) : step === "received" ? (
            <div className="player-report-received">
              <CheckCircle2 size={32} />
              <p>
                {send.data?.duplicate
                  ? "You’ve already reported this content."
                  : "Thank you for reporting this content."}
              </p>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : signedOut ? (
            <>
              <p>Sign in to report this {kind.toLowerCase()}.</p>
              <Button asChild>
                <a
                  href="/sign-in"
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem("spawn-game-return", `/play/${projectId}#community`)
                    } catch {
                      /* Sign-in still works without storage. */
                    }
                  }}
                >
                  Sign in
                </a>
              </Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (step === "reason") setStep("details")
                else send.mutate()
              }}
            >
              <p className="player-report-target">{title}</p>
              {step === "reason" ? (
                <fieldset>
                  <legend>What’s the issue?</legend>
                  {reportReasons[kind].map((item) => (
                    <label className="player-report-reason" key={item} data-selected={reason === item}>
                      <input
                        type="radio"
                        name={`report-${commentId ?? projectId}`}
                        value={item}
                        checked={reason === item}
                        onChange={() => setReason(item)}
                        required
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <label className="player-report-details">
                  Details {reason !== "Something else" && <span>(optional)</span>}
                  <Textarea
                    rows={5}
                    maxLength={500}
                    required={reason === "Something else"}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Tell us what happened and where to find it."
                  />
                  <small>{details.length}/500</small>
                </label>
              )}
              {send.error && <Notice tone="red">{send.error.message}</Notice>}
              <footer>
                {step === "details" ? (
                  <Button type="button" variant="ghost" disabled={send.isPending} onClick={() => setStep("reason")}>
                    <ArrowLeft />
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                )}
                <Button
                  disabled={
                    send.isPending || !reason || (step === "details" && reason === "Something else" && !details.trim())
                  }
                >
                  {send.isPending ? (
                    "Sending…"
                  ) : step === "reason" ? (
                    <>
                      Continue
                      <ArrowRight />
                    </>
                  ) : (
                    "Send report"
                  )}
                </Button>
              </footer>
            </form>
          )}
        </div>
      </PreviewDialog>
    </>
  )
}
