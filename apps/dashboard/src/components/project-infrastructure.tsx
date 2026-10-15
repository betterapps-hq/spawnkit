import { Check } from "lucide-react"
import { OptionInfo } from "./addon-info"
import { IncludedTool } from "./included-tool"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
export function Environments({
  sandbox,
  onChange,
  github,
  previews,
  onPreviews
}: {
  sandbox: boolean
  onChange: (enabled: boolean) => void
  github: boolean
  previews: boolean
  onPreviews: (enabled: boolean) => void
}) {
  return (
    <fieldset className="mt-7">
      <legend className="mb-4 text-sm font-semibold">Environments</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
          <Check className="mt-0.5 size-4 text-primary" />
          <div className="flex-1">
            <p className="text-xs font-medium">Production</p>
            <p className="mt-1 text-xs text-muted-foreground">Your live game</p>
          </div>
          <OptionInfo
            name="Production"
            what="The version of your game that players use."
            why="Publish stable releases here. Every project has production enabled."
            includes="Frontend-only single-player hosting is free. Services and multiplayer have separate charges."
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg border bg-card p-4">
          <Label className="flex flex-1 cursor-pointer items-start gap-3">
            <Checkbox
              aria-label="Enable Sandbox"
              checked={sandbox}
              onCheckedChange={(value) => onChange(value === true)}
            />
            <span>
              <span className="block text-xs font-medium">Sandbox</span>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">$5/month + usage</span>
            </span>
          </Label>
          <OptionInfo
            name="Sandbox"
            what="A separate staging version for testing before players see an update."
            why="Try changes safely, then promote a tested build to production."
            includes="One Sandbox per game, with multiple regions for multiplayer. Adds $5/month plus usage; single-player uses static hosting without a game server."
          />
        </div>
        {github && (
          <div className="flex items-start gap-2 rounded-lg border bg-card p-4">
            <Label className="flex flex-1 cursor-pointer items-start gap-3">
              <Checkbox
                aria-label="Enable Previews"
                checked={previews}
                onCheckedChange={(value) => onPreviews(value === true)}
              />
              <span>
                <span className="block text-xs font-medium">Previews</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">For GitHub pull requests</span>
              </span>
            </Label>
            <OptionInfo
              name="Previews"
              what="A temporary link to test the changes in a GitHub pull request."
              why="Review each proposed change separately, without replacing your shared Sandbox."
              includes="Draft only. Requires GitHub authorization and automated builds. Preview charges are not included in this estimate."
            />
          </div>
        )}
      </div>
    </fieldset>
  )
}
const databases = [
  {
    id: "none",
    name: "None",
    what: "No custom database for your game.",
    why: "Use this for games that keep progress on the player's device or only use managed game services."
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    what: "A hosted database for structured game data.",
    why: "Choose this for your own player records, inventories, or other data shared across devices."
  },
  {
    id: "sqlite",
    name: "SQLite",
    what: "A lightweight SQL database for custom data.",
    why: "Choose this for simpler data models. The hosted adapter still needs implementation."
  }
] as const
export function DatabaseConfig({
  database,
  onDatabase
}: {
  database: "none" | "postgresql" | "sqlite"
  onDatabase: (value: "none" | "postgresql" | "sqlite") => void
}) {
  return (
    <section className="mt-7" aria-label="Custom database">
      <h2 className="mb-4 text-sm font-semibold">Database</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {databases.map((option) => (
          <div key={option.id} className="flex items-start gap-2 rounded-lg border bg-card p-4">
            <label className="flex flex-1 cursor-pointer items-center gap-3 text-xs font-medium">
              <input
                type="radio"
                name="database"
                className="accent-primary"
                checked={database === option.id}
                onChange={() => onDatabase(option.id)}
              />
              {option.name}
            </label>
            <OptionInfo
              name={option.name === "None" ? "No database" : option.name}
              what={option.what}
              why={option.why}
              includes="Configuration draft only. Managed game services include their own storage; a custom database adds metered usage."
              links={
                option.id === "none"
                  ? []
                  : [
                      {
                        label: "Website",
                        href: option.id === "postgresql" ? "https://www.postgresql.org/" : "https://sqlite.org/"
                      }
                    ]
              }
            />
          </div>
        ))}
      </div>
      {database !== "none" && (
        <section className="mt-7" aria-label="ORM">
          <h2 className="mb-4 text-sm font-semibold">ORM</h2>
          <IncludedTool
            name="Drizzle"
            what="A library that helps your TypeScript code read and write database records."
            why="Drizzle checks your queries against your database structure, helping catch mistakes before your game runs."
            includes="Selected with your database. Database adapter generation is not connected yet."
            links={[
              { label: "Website", href: "https://orm.drizzle.team/" },
              { label: "GitHub", href: "https://github.com/drizzle-team/drizzle-orm" }
            ]}
          />
        </section>
      )}
    </section>
  )
}
