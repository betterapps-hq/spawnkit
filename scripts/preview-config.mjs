const previewWorker = /^spawnkit-(?:dashboard|stories)-preview-pr-([1-9]\d*)$/

export function previewRegistry(baseline, pulls, repository) {
  if (!Array.isArray(baseline) || baseline.some((name) => !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(name)))
    throw new Error("Invalid preview registry")
  return [
    ...new Set([
      ...baseline.filter((name) => !/^pr-[1-9]\d*$/.test(name)),
      ...pulls
        .filter((pr) => pr.state === "open" && pr.head.repo?.full_name === repository)
        .map((pr) => {
          if (!Number.isSafeInteger(pr.number) || pr.number < 1) throw new Error("Invalid PR number")
          return `pr-${pr.number}`
        })
    ])
  ].sort()
}

export function retiredPreviewWorkers(workers, registry) {
  return workers.filter((worker) => {
    const match = previewWorker.exec(worker.name)
    return match && !registry.includes(`pr-${match[1]}`)
  })
}

export function assertPreviewDeletion(worker) {
  if (!previewWorker.test(worker.name) || !/^[a-f0-9]{32}$/.test(worker.id)) throw new Error("Unsafe preview deletion")
  if (
    (worker.references?.workers?.length ?? 0) ||
    (worker.references?.durable_objects?.length ?? 0) ||
    (worker.references?.queues?.length ?? 0) ||
    (worker.references?.dispatch_namespace_outbounds?.length ?? 0)
  )
    throw new Error(`Preview ${worker.name} is referenced by another resource`)
  const expectedHost =
    worker.name.replace("spawnkit-dashboard-", "").replace("spawnkit-stories-", "stories-") + ".spawnkit.cloud"
  if (worker.references?.domains?.some((domain) => domain.hostname !== expectedHost))
    throw new Error(`Preview ${worker.name} has an unexpected custom domain`)
}
