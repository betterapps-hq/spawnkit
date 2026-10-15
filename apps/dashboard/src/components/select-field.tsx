import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
export function SelectField({
  id,
  label,
  value,
  className,
  onChange,
  options
}: {
  id?: string
  label: string
  value: string
  className?: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-full bg-card", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
