import { MessageSquare, Star, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { feedbackRequest, type FeedbackTotals, type PersonalFeedback, type PublicFeedback } from "@/lib/game-feedback"
import { PlayerReport } from "./player-report"

export function GameCommunity({
  projectId,
  initialTotals,
  onTotals
}: {
  projectId: string
  initialTotals: FeedbackTotals
  onTotals: (totals: FeedbackTotals) => void
}) {
  const [feed, setFeed] = useState<PublicFeedback>({ totals: initialTotals, comments: [], nextCursor: null })
  const [personal, setPersonal] = useState<PersonalFeedback | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const load = useCallback(async () => {
    const [next, mine] = await Promise.all([
      feedbackRequest<PublicFeedback>(projectId, "feedback"),
      feedbackRequest<PersonalFeedback | null>(projectId, "feedback/me")
    ])
    return { next, mine }
  }, [projectId])
  useEffect(() => {
    let disposed = false
    void load()
      .then(({ next, mine }) => {
        if (disposed) return
        setFeed(next)
        setPersonal(mine)
        setRating(mine?.rating ?? 0)
        setComment(mine?.comment?.body ?? "")
        setReady(true)
        onTotals(next.totals)
      })
      .catch(() => {
        if (!disposed) setError("Ratings and comments couldn't be loaded. Please refresh to try again.")
      })
    return () => {
      disposed = true
    }
  }, [load, onTotals])
  async function save(path: string, method: string, data: unknown, message: string) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await feedbackRequest<{ totals: FeedbackTotals }>(projectId, path, method, data)
      onTotals(result.totals)
      setNotice(message)
      const { next, mine } = await load()
      setFeed(next)
      setPersonal(mine)
      setRating(mine?.rating ?? 0)
      if (path.startsWith("comments")) {
        setComment(mine?.comment?.body ?? "")
        setEditing(false)
      }
      setDeleting(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save feedback. Your text is still here.")
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }
  async function more() {
    if (!feed.nextCursor || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const next = await feedbackRequest<PublicFeedback>(
        projectId,
        `feedback?cursor=${encodeURIComponent(feed.nextCursor)}`
      )
      setFeed((current) => ({
        ...next,
        comments: [
          ...current.comments,
          ...next.comments.filter((item) => !current.comments.some((old) => old.id === item.id))
        ]
      }))
    } catch {
      setError("More comments couldn't be loaded. Please try again.")
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }
  const signIn = () => {
    try {
      sessionStorage.setItem("spawn-game-return", `/play/${projectId}#community`)
    } catch {
      /* Sign-in still works without storage. */
    }
  }
  return (
    <section id="community" className="p-community" aria-labelledby="community-title">
      <div className="p-section-heading">
        <h2 id="community-title">Ratings & comments</h2>
      </div>
      {!ready && !error && <output>Loading community…</output>}
      <div className="p-community-grid">
        <div className="p-rating-panel">
          <div className="p-rating-total">
            <strong>{feed.totals.reviews ? feed.totals.rating.toFixed(1) : "0"}</strong>
            <span>
              / 5<br />
              <small>
                {feed.totals.reviews} {feed.totals.reviews === 1 ? "review" : "reviews"}
              </small>
            </span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save("rating", "PUT", { rating }, "Rating saved.")
            }}
          >
            <fieldset disabled={!ready || !personal || busy}>
              <legend>Your rating</legend>
              <RadioGroup
                className="p-rating-stars"
                orientation="horizontal"
                aria-label="Your rating"
                value={String(rating)}
                disabled={!ready || !personal || busy}
                onValueChange={(value) => {
                  setRating(Number(value))
                  setNotice("")
                }}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    htmlFor={`rating-${projectId}-${value}`}
                    className={value <= rating ? "is-filled" : ""}
                  >
                    <RadioGroupItem
                      id={`rating-${projectId}-${value}`}
                      className="sr-only"
                      value={String(value)}
                      aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                    />
                    <Star size={27} aria-hidden="true" />
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="p-rating-value">{rating ? `${rating} out of 5` : "Choose a star rating"}</div>
            {personal && (
              <>
                <Button className="p-button p-button-outline" disabled={busy || !rating || rating === personal.rating}>
                  Save rating
                </Button>
                {personal.rating > 0 && (
                  <Button
                    type="button"
                    className="p-text-button"
                    disabled={busy}
                    onClick={() => void save("rating", "DELETE", undefined, "Rating removed.")}
                  >
                    Remove rating
                  </Button>
                )}
              </>
            )}
          </form>
          {ready && !personal && (
            <a className="p-button p-button-outline" href="/sign-in" onClick={signIn}>
              Sign in to rate
            </a>
          )}
        </div>
        <div className="p-comments-panel">
          <div className="p-comments-heading">
            <h3>Comments</h3>
            <span>{feed.totals.comments}</span>
          </div>
          <div className="p-review-list">
            {ready && feed.totals.comments === 0 && (
              <p className="p-comment-empty">No comments yet. Be the first to share what you think.</p>
            )}
            {feed.comments.map((item) => (
              <article className="p-review" key={item.id}>
                <header>
                  <span className="p-review-avatar" aria-hidden="true">
                    {item.author[0]?.toUpperCase()}
                  </span>
                  <b>{item.author}</b>
                  {item.rating > 0 && (
                    <span className="p-review-stars" aria-label={`${item.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={12} fill={n <= item.rating ? "currentColor" : "none"} />
                      ))}
                    </span>
                  )}
                </header>
                <p>{item.body}</p>
                <div className="p-review-meta">
                  <PlayerReport projectId={projectId} commentId={item.id} title={item.author} />
                  <time dateTime={item.createdAt} title={new Date(item.updatedAt).toLocaleString()}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                    {item.updatedAt !== item.createdAt ? " (edited)" : ""}
                  </time>
                  {item.id === personal?.comment?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditing(true)
                        setComment(item.body)
                      }}
                    >
                      Edit comment
                    </Button>
                  )}
                  {item.id === personal?.comment?.id && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(item.id)}>
                      <Trash2 size={13} />
                      Delete comment
                    </Button>
                  )}
                </div>
                {deleting === item.id && (
                  <fieldset className="p-comment-delete" aria-label="Confirm comment deletion">
                    <span>Delete this comment?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void save(`comments/${item.id}`, "DELETE", undefined, "Comment deleted.")}
                    >
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(null)}>
                      Cancel
                    </Button>
                  </fieldset>
                )}
              </article>
            ))}
          </div>
          {feed.nextCursor && (
            <Button variant="outline" disabled={busy} onClick={() => void more()}>
              Load more comments
            </Button>
          )}
          {personal && (!personal.comment || editing) && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void save("comments", "PUT", { body: comment }, "Comment saved.")
              }}
            >
              <label htmlFor={`comment-${projectId}`}>{editing ? "Edit your comment" : "Leave feedback"}</label>
              <textarea
                className="p-feedback-textarea"
                id={`comment-${projectId}`}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  setNotice("")
                }}
                placeholder="What did you enjoy? What could be improved?"
                maxLength={2000}
                rows={4}
                disabled={busy}
              />
              <div className="p-comment-actions">
                <span>{comment.length}/2000</span>
                {editing && (
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
                <Button className="p-button p-button-small" disabled={busy || !comment.trim()}>
                  Save comment <MessageSquare size={15} />
                </Button>
              </div>
            </form>
          )}
          {personal?.comment && !editing && !feed.comments.some((item) => item.id === personal.comment?.id) && (
            <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}>
              Edit your comment
            </Button>
          )}
          {ready && !personal && (
            <a className="p-button p-button-outline" href="/sign-in" onClick={signIn}>
              Sign in to comment
            </a>
          )}
          <a href="/community-guidelines" className="p-community-guidelines">
            Community guidelines
          </a>
        </div>
      </div>
      {notice && <output className="p-feedback-status">{notice}</output>}
      {error && (
        <p role="alert" className="p-field-error">
          {error}
        </p>
      )}
    </section>
  )
}
