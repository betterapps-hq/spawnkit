import { Button } from "../ui/button"

/** Display a compact hash while linking to the exact, full source commit. */
export function CommitLink({ repository, sha }: { repository: string | null; sha: string }) {
  if (!sha || !repository) return <span className="text-xs text-muted-foreground">Source unavailable</span>
  return (
    <Button asChild variant="link" size="xs" className="h-auto p-0 text-[11px]">
      <a
        href={`https://github.com/${repository}/commit/${sha}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View commit ${sha} on GitHub`}
      >
        <code>{sha.slice(0, 7)}</code>
      </a>
    </Button>
  )
}
