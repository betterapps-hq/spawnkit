import type { Investigator } from "./investigation"

/** Story-only adapter. Production must inject an authenticated investigation service. */
export const investigateFixture: Investigator = async (request, { signal, onProgress }) => {
  for (let step = 0; step < 3; step++) {
    onProgress(step)
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      const abort = () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort)
        resolve()
      }, 550)
      signal.addEventListener("abort", abort, { once: true })
    })
  }
  const { issue, sessions } = request
  const affected = sessions.filter((session) => session.issueId === issue.id)
  const save = issue.id === "SPN-241"
  const releases = [...new Set(affected.map((session) => session.release))]
  return {
    title: save ? "A conflicting checkpoint leaves the local revision stale" : issue.title,
    cause: save
      ? "The 409 branch throws before updating saveRevision. A retry with the same state can submit the same stale revision and fail again. The source supports this path; the session data does not prove a retry occurred."
      : issue.hypothesis,
    uncertainty: save
      ? "Retry behavior and concurrent writes still need reproduction."
      : "Confirm this hypothesis with a reproduction and runtime measurements.",
    evidence: [
      { id: "E1", title: "Source context", detail: issue.location, source: "code", location: issue.location },
      {
        id: "E2",
        title: `${affected.length} affected sessions`,
        detail: `Releases ${releases.join(", ") || "outside scope"}`,
        source: "sessions",
        sessionIds: affected.map((session) => session.id)
      },
      ...(affected.length && issue.operation
        ? [
            {
              id: "E3",
              title: "Related trace",
              detail: `${affected[0]!.id} (${affected[0]!.device})`,
              source: "trace" as const,
              sessionId: affected[0]!.id,
              operation: issue.operation
            }
          ]
        : [])
    ],
    solution: save
      ? "Handle a revision conflict explicitly: preserve the unsaved checkpoint, fetch the latest save, and reconcile before offering a retry. Do not overwrite the remote save or silently discard player progress."
      : "Reproduce the failing path, compare it with a healthy session, then make the smallest change supported by the measurements.",
    ...(save
      ? {
          patch:
            "@@ src/services/saves.ts (proposed conflict handling)\n   if (response.status === 409) {\n-    throw new SaveConflictError(response.revision)\n+    return {\n+      status: 'conflict',\n+      checkpoint,\n+      remoteRevision: response.revision,\n+    }\n   }\n\n// Update callers to preserve checkpoint and reconcile\n// against the latest save before retrying."
        }
      : {}),
    checks: save
      ? [
          "Reproduce two saves with the same expected revision.",
          "Preserve unsaved progress when the server returns 409.",
          "Reconcile with the latest save before a bounded retry.",
          "Verify callers handle the new conflict result.",
          "Compare checkpoint failures after a canary release."
        ]
      : [
          "Reproduce with the affected device and release.",
          "Add a regression test for the failing path.",
          "Compare issue rate and latency after a canary release."
        ]
  }
}

export const failedInvestigationFixture: Investigator = async () => {
  throw new Error("Investigation service unavailable")
}
