import { MessageSquare, Star, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { emptyFeedback, parseGameFeedback, type GameFeedback } from "@/lib/game-feedback"

export function GameCommunity({ gameId, playable }: { gameId: string; playable: boolean }) {
  const [saved, setSaved] = useState<GameFeedback>(emptyFeedback)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState(false)
  const storageKey = `spawn:game-feedback:v1:${gameId}`
  useEffect(() => {
    // Restore a local draft after hydration; unreadable data must not be overwritten.
    try {
      const draft = parseGameFeedback(localStorage.getItem(storageKey))
      if (!draft) throw new Error("Your saved feedback could not be read. It has been left unchanged.")
      // oxlint-disable-next-line react/set-state-in-effect
      setSaved(draft)
      setRating(draft.rating)
      setComment(draft.comment)
      setReady(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Browser storage is unavailable.")
    }
  }, [storageKey])
  function persist(next: GameFeedback, message: string) {
    if (!ready) return false
    try {
      const current = parseGameFeedback(localStorage.getItem(storageKey))
      if (!current || JSON.stringify(current) !== JSON.stringify(saved)) {
        setError("This draft changed in another tab. Reload to read it before saving.")
        setNotice("")
        return false
      }
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSaved(next)
      setNotice(message)
      setError("")
      setEditing(false)
      return true
    } catch {
      setError("Your feedback could not be saved. Keep this page open and try again.")
      setNotice("")
      return false
    }
  }
  return (
    <section id="community" className="p-community" aria-labelledby="community-title">
      <div className="p-section-heading">
        <h2 id="community-title">Ratings & comments</h2>
        <Badge variant="outline" className="p-tag">
          Community preview
        </Badge>
      </div>
      <p className="p-community-notice">
        Public posting is coming soon. Your feedback stays in this browser and is only visible to you.
      </p>
      <div className="p-community-grid">
        <div className="p-rating-panel">
          <div className="p-rating-total">
            <strong>—</strong>
            <span>
              / 5<br />
              <small>No public ratings yet</small>
            </span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              persist({ ...saved, rating, updatedAt: new Date().toISOString() }, "Rating saved on this device.")
            }}
          >
            <fieldset disabled={!ready}>
              <legend>{playable ? "Your rating" : "Rate this concept"}</legend>
              <RadioGroup
                orientation="horizontal"
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return
                  event.preventDefault()
                  const current = event.target instanceof HTMLButtonElement ? Number(event.target.value) : rating || 1
                  const next =
                    event.key === "Home"
                      ? 1
                      : event.key === "End"
                        ? 5
                        : ((current - 1 + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + 5) % 5) + 1
                  setRating(next)
                  setNotice("")
                  document.getElementById(`star-${gameId}-${next}`)?.focus()
                }}
                className="p-rating-stars"
                aria-label={playable ? "Your rating" : "Rate this concept"}
                value={String(rating)}
                disabled={!ready}
                onValueChange={(value) => {
                  setRating(Number(value))
                  setNotice("")
                }}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} htmlFor={`star-${gameId}-${value}`} className={value <= rating ? "is-filled" : ""}>
                    <RadioGroupItem
                      id={`star-${gameId}-${value}`}
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
            <Button className="p-button p-button-outline" disabled={!ready || !rating || rating === saved.rating}>
              Save rating locally
            </Button>
            {saved.rating > 0 && (
              <Button
                className="p-text-button"
                type="button"
                onClick={() => {
                  const next = { ...saved, rating: 0, updatedAt: new Date().toISOString() }
                  if (persist(next, "Local rating removed.")) setRating(0)
                }}
              >
                Remove rating
              </Button>
            )}
          </form>
        </div>
        <div className="p-comments-panel">
          <div className="p-comments-heading">
            <h3>Comments</h3>
            <span>0 public comments</span>
          </div>
          {saved.comment && !editing ? (
            <article className="p-comment-draft">
              <header>
                <span className="p-comment-avatar">Y</span>
                <div>
                  <b>Your draft</b>
                  <small>Only visible to you</small>
                </div>
              </header>
              <p>{saved.comment}</p>
              <div>
                <Button className="p-text-button" onClick={() => setEditing(true)}>
                  Edit draft
                </Button>
                <Button
                  className="p-text-button"
                  onClick={() => {
                    if (
                      persist({ ...saved, comment: "", updatedAt: new Date().toISOString() }, "Comment draft deleted.")
                    )
                      setComment("")
                  }}
                >
                  <Trash2 size={14} />
                  Delete draft
                </Button>
              </div>
            </article>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                persist(
                  { ...saved, comment: comment.trim(), updatedAt: new Date().toISOString() },
                  "Comment draft saved on this device."
                )
              }}
            >
              <label htmlFor={`comment-${gameId}`}>Leave feedback</label>
              <Textarea
                id={`comment-${gameId}`}
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  setNotice("")
                }}
                placeholder={
                  playable ? "What did you enjoy? What could be improved?" : "What would you want to play in this game?"
                }
                maxLength={2000}
                rows={4}
                disabled={!ready}
              />
              <div className="p-comment-actions">
                <span>{comment.length}/2000</span>
                {editing && (
                  <Button
                    type="button"
                    className="p-text-button"
                    onClick={() => {
                      setComment(saved.comment)
                      setEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button className="p-button p-button-small" disabled={!ready || !comment.trim()}>
                  Save comment draft <MessageSquare size={15} />
                </Button>
              </div>
            </form>
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
