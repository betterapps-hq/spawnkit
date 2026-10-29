/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable log needs keyboard focus. */
import { Terminal } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { CopyButton } from "../copy-button"
import { Button } from "../ui/button"
import type { Release } from "./model"
import { releaseLabel } from "./release-label"

export function BuildOutput({ version }: { version: Release }) {
  const viewport = useRef<HTMLPreElement>(null)
  const [following, setFollowing] = useState(true)
  const live = version.status === "building" || version.status === "queued"
  useEffect(() => {
    if (following && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
  }, [following, version.build.logs])
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <span className="flex items-center gap-2 text-xs">
          <Terminal className="size-4 text-primary" />
          Build output / {releaseLabel(version)}
          {live && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              Live
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" aria-pressed={following} onClick={() => setFollowing(!following)}>
            {following ? "Pause scrolling" : "Follow output"}
          </Button>
          <CopyButton label="Copy build logs" value={version.build.logs.join("\n")} compact />
        </div>
      </div>
      <pre
        ref={viewport}
        role="log"
        aria-label="Build output"
        aria-live="off"
        tabIndex={0}
        onScroll={() => {
          const element = viewport.current!
          if (element.scrollHeight - element.scrollTop - element.clientHeight > 40) setFollowing(false)
        }}
        className="max-h-[28rem] min-h-80 overflow-auto bg-muted/30 p-5 text-xs leading-7"
      >
        {version.build.logs.length ? (
          version.build.logs.map((line, index) => (
            <span
              key={index}
              className={`block ${/omitted:|warning/i.test(line) ? "text-amber-700 dark:text-amber-300" : /error|failed/i.test(line) ? "text-destructive" : "text-muted-foreground"}`}
            >
              <span className="mr-5 inline-block w-5 select-none text-right opacity-50">{index + 1}</span>
              {line}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{live ? "Waiting for build output…" : "No build output."}</span>
        )}
      </pre>
    </section>
  )
}
