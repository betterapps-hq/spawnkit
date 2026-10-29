export const multiplayerBundleFee = 10
export const singlePlayerAddonFee = 5

export function estimateRuntime(hourlyRate: number, hours: number) {
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || !Number.isFinite(hours) || hours < 0 || hours > 744)
    throw new Error("Invalid runtime estimate")
  const compute = Math.round(hourlyRate * hours * 100) / 100
  return { fee: multiplayerBundleFee, compute, total: Math.round((multiplayerBundleFee + compute) * 100) / 100 }
}

export function estimateProject(options: {
  multiplayer: boolean
  services: boolean
  sandbox: boolean
  locations: readonly { environment: "production" | "sandbox"; rate: number; hours: number }[]
}) {
  const locations = options.multiplayer
    ? options.locations
        .filter((location) => location.environment !== "sandbox" || options.sandbox)
        .map((location) => ({ ...location, compute: estimateRuntime(location.rate, location.hours).compute }))
    : []
  const gameFee = options.multiplayer ? multiplayerBundleFee : options.services ? singlePlayerAddonFee : 0
  const sandboxFee = options.sandbox && !options.multiplayer ? singlePlayerAddonFee : 0
  return {
    gameFee,
    sandboxFee,
    locations,
    total:
      Math.round((gameFee + sandboxFee + locations.reduce((total, location) => total + location.compute, 0)) * 100) /
      100
  }
}
