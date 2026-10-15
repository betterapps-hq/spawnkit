import type { ReactNode } from "react"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FieldSelect({
  id,
  value,
  onValueChange,
  children,
  "aria-label": label
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  "aria-label"?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={label} className="p-field-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" sideOffset={5} className="p-select-menu">
        {children}
      </SelectContent>
    </Select>
  )
}
