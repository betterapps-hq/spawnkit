import { useQuery } from "@tanstack/react-query"
import { Check, CheckCheck, Gamepad2, LoaderCircle, Play, X } from "lucide-react"
import { useState } from "react"
import type { GameSubmission } from "@/lib/publishing"
import { Button } from "../ui/button"
import "./publishing.css"
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api/platform/v1/${path}`,
    body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      : {}
  )
  const data = (await response.json()) as T & { error?: { message: string } }
  if (!response.ok) throw new Error(data.error?.message ?? "Unable to complete this request.")
  return data
}
function SubmissionCard({
  submission,
  busy,
  disabled,
  onReview
}: {
  submission: GameSubmission
  busy: boolean
  disabled: boolean
  onReview: (id: string, action: "approve" | "reject") => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <article className="submission-card" aria-label={submission.title} aria-busy={busy}>
      <a
        className="submission-game-link"
        href={submission.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Play ${submission.title} (opens in a new tab)`}
      >
        <div className="submission-cover">
          {submission.coverUrl && !imageFailed ? (
            <img src={submission.coverUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <div className="submission-placeholder" aria-hidden="true">
              <span className="submission-orbit" />
              <span className="submission-game-icon">
                <Gamepad2 />
              </span>
              <span className="submission-monogram">{submission.title.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <span className="submission-play" aria-hidden="true">
            <Play />
          </span>
        </div>
        <h2>{submission.title}</h2>
      </a>
      <p>{submission.description}</p>
      <div className="submission-card-actions">
        <Button className="submission-approve" disabled={disabled} onClick={() => onReview(submission.id, "approve")}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Check />} Approve
        </Button>
        <Button
          className="submission-reject"
          variant="outline"
          disabled={disabled}
          onClick={() => onReview(submission.id, "reject")}
        >
          <X /> Reject
        </Button>
      </div>
    </article>
  )
}

export function LiveReviewQueue() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const queue = useQuery({
    queryKey: ["publishing-review-queue"],
    queryFn: () => api<{ submissions: GameSubmission[] }>("admin/submissions")
  })
  async function review(id: string, action: "approve" | "reject") {
    setBusy(id)
    setError("")
    try {
      await api(`admin/submissions/${id}`, { action, note: "" })
      await queue.refetch({ throwOnError: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed.")
    } finally {
      setBusy(null)
    }
  }
  if (queue.isPending)
    return (
      <div className="submission-grid" aria-busy="true" aria-label="Loading submissions">
        {[0, 1, 2].map((index) => (
          <div className="submission-skeleton" key={index}>
            <div />
            <span />
            <span />
          </div>
        ))}
      </div>
    )
  const pending = queue.data?.submissions.filter((submission) => submission.status === "pending") ?? []
  return (
    <section className="dashboard-publishing">
      {(error || queue.error) && (
        <p role="alert" className="text-destructive">
          {error || queue.error?.message}
        </p>
      )}
      {!queue.error && !pending.length && (
        <div className="submission-empty">
          <CheckCheck aria-hidden="true" />
          <p>No submissions to review.</p>
        </div>
      )}
      <div className="submission-grid" aria-label="Submission queue">
        {pending.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            busy={busy === submission.id}
            disabled={busy !== null}
            onReview={(id, action) => void review(id, action)}
          />
        ))}
      </div>
    </section>
  )
}
