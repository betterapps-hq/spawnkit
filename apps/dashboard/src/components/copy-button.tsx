import { useClipboard } from "@mantine/hooks"
import { Check, Copy } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

export function CopyButton({
  value,
  label = "Copy command",
  success = "Command copied",
  compact = false,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  value: string
  label?: string
  success?: string
  compact?: boolean
}) {
  const clipboard = useClipboard({ timeout: 2200 })
  return (
    <>
      <Button
        {...props}
        type="button"
        size={compact ? "icon-sm" : props.size}
        variant={compact ? "ghost" : props.variant}
        aria-label={clipboard.copied ? success : label}
        title={clipboard.copied ? success : label}
        onClick={() => clipboard.copy(value)}
      >
        <span className="relative size-4 shrink-0" aria-hidden="true">
          <Copy
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200",
              clipboard.copied && "scale-50 -rotate-45 opacity-0"
            )}
          />
          <Check
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200",
              !clipboard.copied && "scale-50 rotate-45 opacity-0"
            )}
          />
        </span>
        {!compact && (clipboard.copied ? success : label)}
      </Button>
      <output className={cn("text-xs text-muted-foreground", clipboard.error ? "block" : "sr-only")} aria-live="polite">
        {clipboard.error ? "Clipboard unavailable. Select and copy the text above." : clipboard.copied ? success : ""}
      </output>
    </>
  )
}
