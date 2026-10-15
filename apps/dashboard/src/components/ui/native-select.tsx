import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"
import type { ComponentProps } from "react"

// shadcn/ui Native Select composition (MIT), using the shared theme tokens.
function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span
      data-slot="native-select-wrapper"
      className="group/native-select relative block w-full min-w-0 has-[select:disabled]:opacity-50"
    >
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-2 pr-8 pl-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  )
}
function NativeSelectOption({ className, ...props }: ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-popover text-popover-foreground", className)}
      {...props}
    />
  )
}
export { NativeSelect, NativeSelectOption }
