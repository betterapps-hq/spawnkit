import { Zap } from "lucide-react"

export function BrandSymbol() {
  return (
    <span
      data-brand-symbol
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
    >
      <Zap className="size-[18px] fill-current" aria-hidden="true" />
    </span>
  )
}
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span data-brand-wordmark className={`text-xl font-semibold tracking-tight ${className}`}>
      SpawnKit<span className="text-primary">.</span>
    </span>
  )
}
export function Brand({ className = "" }: { className?: string }) {
  return (
    <a href="/" aria-label="SpawnKit home" className={`inline-flex w-fit items-center gap-2.5 ${className}`}>
      <BrandSymbol />
      <BrandWordmark />
    </a>
  )
}
