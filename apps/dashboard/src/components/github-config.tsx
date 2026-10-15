import { GitBranch } from "lucide-react"
import { githubError, type GitHubSelection } from "@/lib/github-selection"
import { OptionInfo } from "./addon-info"
import { SelectField } from "./select-field"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
export function GitHubConfig({
  value,
  onChange,
  onConnect
}: {
  value: GitHubSelection
  onChange: (value: GitHubSelection) => void
  onConnect?: (() => void) | undefined
}) {
  const error = githubError(value)
  return (
    <fieldset className="mt-7">
      <legend className="mb-4 text-sm font-semibold">GitHub repository</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { id: "none", name: "No repository" },
            { id: "create", name: "Create repository" },
            { id: "connect", name: "Connect repository" }
          ] as const
        ).map((option) => (
          <div key={option.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
            <label className="flex flex-1 cursor-pointer items-center gap-3 py-1 text-xs font-medium">
              <input
                type="radio"
                className="accent-primary"
                name="github"
                checked={value.mode === option.id}
                onChange={() => onChange({ ...value, mode: option.id })}
              />
              {option.name}
            </label>
            <OptionInfo
              name={option.name}
              what={
                option.id === "none"
                  ? "Keep your source code on your computer."
                  : option.id === "create"
                    ? "Start a new GitHub repository for this game."
                    : "Use a repository you already have on GitHub."
              }
              why={
                option.id === "none"
                  ? "Publish with the CLI without connecting GitHub."
                  : "A repository saves code history, supports collaboration, and can trigger builds when you push changes."
              }
              includes="GitHub authorization controls which repositories SpawnKit can access."
              links={[{ label: "Documentation", href: "https://docs.github.com/en/repositories" }]}
            />
          </div>
        ))}
      </div>
      {value.mode !== "none" && (
        <div className="mt-3 space-y-3 rounded-lg border bg-card p-4">
          {value.mode === "create" ? (
            <>
              <Label htmlFor="github-name">Repository name</Label>
              <Input
                id="github-name"
                value={value.name}
                aria-invalid={Boolean(error)}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
              />
              <Label htmlFor="github-visibility">Visibility</Label>
              <SelectField
                id="github-visibility"
                label="Visibility"
                value={value.visibility}
                onChange={(visibility) =>
                  onChange({ ...value, visibility: visibility === "public" ? "public" : "private" })
                }
                options={[
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" }
                ]}
              />
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={!onConnect || Boolean(error)}
                onClick={onConnect}
                aria-describedby="github-connection-help"
              >
                <GitBranch />
                Connect GitHub
              </Button>
              <p id="github-connection-help" className="text-xs text-muted-foreground">
                {onConnect
                  ? "Save and authorize access to this repository on GitHub."
                  : "Create your project first, then connect GitHub in project configuration."}
              </p>
              <Label htmlFor="github-url">Repository URL</Label>
              <Input
                id="github-url"
                placeholder="https://github.com/team/game"
                value={value.url}
                aria-invalid={Boolean(error)}
                onChange={(event) => onChange({ ...value, url: event.target.value })}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}
