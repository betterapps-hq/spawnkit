import { addons, plannedArchitectureAddons, type AddonId } from "@spawn/templates/catalog"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { AddonInfo } from "./addon-info"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
export function AddonCards({ selected, onChange }: { selected: AddonId[]; onChange: (value: AddonId[]) => void }) {
  const ecsName = useId()
  const ecs = selected.find((id) => id === "bitecs" || id === "koota") ?? "none"
  return (
    <>
      {["Testing", "Code architecture"].map((group) => (
        <fieldset key={group} className="mt-7">
          <legend className="mb-4 text-sm font-semibold">{group}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {group === "Code architecture" && (
              <div className="space-y-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Entity system — choose one</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { id: "none" as const, name: "No ECS", description: "Write game logic with plain TypeScript." },
                    ...addons.filter((addon) => addon.id === "bitecs" || addon.id === "koota")
                  ].map((addon) => (
                    <div
                      key={addon.id}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border bg-card p-4 focus-within:ring-2 focus-within:ring-ring",
                        ecs === addon.id && "border-primary/30 bg-accent/30"
                      )}
                    >
                      <label className="flex flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name={ecsName}
                          value={addon.id}
                          aria-label={addon.name}
                          checked={ecs === addon.id}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                          onChange={() =>
                            onChange([
                              ...selected.filter((id) => id !== "bitecs" && id !== "koota"),
                              ...(addon.id === "none" ? [] : [addon.id])
                            ])
                          }
                        />
                        <span>
                          <span className="block text-xs font-medium">{addon.name}</span>
                          <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                            {addon.description}
                          </span>
                        </span>
                      </label>
                      {addon.id !== "none" && <AddonInfo id={addon.id} name={addon.name} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {addons
              .filter((addon) => group === "Testing" && !["bitecs", "koota"].includes(addon.id))
              .map((addon) => (
                <div
                  key={addon.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border bg-card p-4",
                    selected.includes(addon.id) && "border-primary/30 bg-accent/30"
                  )}
                >
                  <Label
                    className={cn(
                      "flex flex-1 items-start gap-3",
                      ["playwright", "storybook"].includes(addon.id)
                        ? "cursor-not-allowed opacity-45"
                        : "cursor-pointer"
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      aria-label={addon.name}
                      disabled={["playwright", "storybook"].includes(addon.id)}
                      checked={selected.includes(addon.id)}
                      onCheckedChange={(checked) =>
                        onChange(checked ? [...selected, addon.id] : selected.filter((id) => id !== addon.id))
                      }
                    />
                    <span>
                      <span className="block text-xs font-medium">{addon.name}</span>
                      <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                        {addon.description}
                      </span>
                    </span>
                  </Label>
                  <AddonInfo id={addon.id} name={addon.name} />
                </div>
              ))}
            {group === "Code architecture" &&
              plannedArchitectureAddons.map((addon) => (
                <div key={addon.id} className="flex items-start gap-2 rounded-lg border bg-card p-4">
                  <Label className="flex flex-1 cursor-not-allowed items-start gap-3 opacity-45">
                    <Checkbox className="mt-0.5" aria-label={addon.name} disabled checked={false} />
                    <span>
                      <span className="block text-xs font-medium">{addon.name}</span>
                      <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                        {addon.description}
                      </span>
                    </span>
                  </Label>
                  <AddonInfo id={addon.id} name={addon.name} />
                </div>
              ))}
          </div>
        </fieldset>
      ))}
    </>
  )
}
