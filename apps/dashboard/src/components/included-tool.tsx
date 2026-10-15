import { Check } from "lucide-react"
import { OptionInfo } from "./addon-info"
export function IncludedTool(props: Parameters<typeof OptionInfo>[0]) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <Check className="size-4 text-primary" aria-hidden="true" />
      <span className="flex-1 text-xs font-medium">
        {props.name}
        <span className="sr-only"> selected</span>
      </span>
      <OptionInfo {...props} />
    </div>
  )
}
