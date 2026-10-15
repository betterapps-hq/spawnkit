export interface GitHubSelection {
  mode: "none" | "create" | "connect"
  name: string
  visibility: "private" | "public"
  url: string
}
export function githubError(value: GitHubSelection) {
  if (value.mode === "create" && (!/^[A-Za-z0-9._-]{1,100}$/.test(value.name) || /^\.+$/.test(value.name)))
    return "Use a repository name with letters, numbers, dots, underscores, or hyphens."
  if (value.mode === "connect" && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/?$/.test(value.url))
    return "Enter a GitHub repository URL, such as https://github.com/team/game."
  return undefined
}
