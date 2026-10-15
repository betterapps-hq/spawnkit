import { deepEqual, throws } from "node:assert/strict"
import { test } from "node:test"
import { previewRegistry, retiredPreviewWorkers, assertPreviewDeletion } from "./preview-config.mjs"

test("fresh checkouts retain manual previews and all open same-repository PRs", () => {
  const pull = (number, state, repository) => ({ number, state, head: { repo: { full_name: repository } } })
  deepEqual(
    previewRegistry(
      ["latest", "pr-9"],
      [
        pull(1, "open", "owner/repo"),
        pull(2, "open", "fork/repo"),
        pull(3, "closed", "owner/repo"),
        pull(4, "open", "owner/repo")
      ],
      "owner/repo"
    ),
    ["latest", "pr-1", "pr-4"]
  )
  throws(() => previewRegistry(["../production"], [], "owner/repo"))
})

test("cleanup selects only retired PR frontends and refuses referenced resources", () => {
  const worker = (name) => ({ name, id: "a".repeat(32), references: {} })
  const retired = worker("spawnkit-stories-preview-pr-2")
  deepEqual(
    retiredPreviewWorkers(
      [
        retired,
        worker("spawnkit-dashboard-preview-pr-1"),
        worker("spawnkit-dashboard"),
        worker("spawnkit-dashboard-preview-latest"),
        worker("other-preview-pr-2")
      ],
      ["pr-1", "latest"]
    ),
    [retired]
  )
  assertPreviewDeletion(retired)
  throws(() => assertPreviewDeletion(worker("spawnkit-dashboard")))
  throws(() => assertPreviewDeletion({ ...retired, references: { workers: [{}] } }))
  throws(() => assertPreviewDeletion({ ...retired, references: { domains: [{ hostname: "spawnkit.cloud" }] } }))
})
