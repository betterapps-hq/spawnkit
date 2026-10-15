import type { AddonId } from "@spawn/templates/catalog"
import { Info, ExternalLink } from "lucide-react"
import { libraryLinks, type LibraryLink } from "@/lib/library-links"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
const details: Record<AddonId | "xstate" | "zustand", { what: string; why: string; includes: string }> = {
  xstate: {
    what: "State machines and actors for explicit game flow and transitions.",
    why: "Useful for coordinating game phases, retries, and cancellation.",
    includes: "Not available yet. Template integration has not been built."
  },
  zustand: {
    what: "A shared state store with a vanilla API that works without React.",
    why: "Useful for scores, settings, inventory, and progression shared across game systems.",
    includes: "Not available yet. Template integration has not been built."
  },
  storybook: {
    what: "A workshop for developing interface components outside the running game.",
    why: "Choose it when you want to check HUDs, menus, and different UI states without playing through the game.",
    includes: "HTML/Vite Storybook, score-display stories, and local development commands. No React game dependency."
  },
  vitest: {
    what: "A test runner for individual functions and game logic.",
    why: "Choose it to catch scoring, movement, and simulation regressions quickly as you change code.",
    includes: "Unit tests for scoring and movement, plus commands to run and watch tests."
  },
  koota: {
    what: "A trait-based entity-component-system library for TypeScript games.",
    why: "Choose it to organize game objects with typed traits and queries that update shared behavior.",
    includes: "A Koota movement simulation connected to your chosen renderer, without React."
  },
  bitecs: {
    what: "An entity-component-system library that separates game data from the systems that update it.",
    why: "Choose it when many game objects share behavior. Plain movement is simpler for a small game that does not need an ECS.",
    includes: "An entity-based movement simulation connected to your chosen renderer."
  },
  playwright: {
    what: "Browser automation that tests your game the way a player interacts with it.",
    why: "Choose it to catch loading, rendering, and keyboard-input failures that unit tests alone can miss. It complements Vitest.",
    includes:
      "A Chromium smoke test and browser-test commands. Install the test browser once after installing dependencies."
  }
}
export function AddonInfo({ id, name }: { id: AddonId | "xstate" | "zustand"; name: string }) {
  return <OptionInfo name={name} {...details[id]} links={libraryLinks[`addon:${id}`] ?? []} />
}
export function OptionInfo({
  name,
  what,
  why,
  includes,
  links = []
}: {
  name: string
  what: string
  why: string
  includes: string
  links?: readonly LibraryLink[]
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label={`About ${name}`}
        >
          <Info className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 text-xs leading-5"
        aria-label={`About ${name}`}
      >
        <h3 className="text-sm font-semibold">{name}</h3>
        <p>{what}</p>
        <p className="text-muted-foreground">{why}</p>
        <div className="border-t pt-3">
          <p className="font-medium">Included</p>
          <p className="text-muted-foreground">{includes}</p>
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-4 border-t pt-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {link.label}
                <ExternalLink className="size-3" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
