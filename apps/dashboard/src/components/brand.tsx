import { Box } from "lucide-react"

export function Brand({ className = "" }: { className?: string }) {
  return (
    <a
      href="/"
      aria-label="SpawnKit home"
      className={`inline-flex w-fit items-center gap-2.5 text-xl font-bold tracking-tight ${className}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Box className="size-5" aria-hidden="true" />
      </span>
      SpawnKit
    </a>
  )
}
