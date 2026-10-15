export function estimateRuntime(hourlyRate: number, hours: number) {
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || !Number.isFinite(hours) || hours < 0 || hours > 744)
    throw new Error("Invalid runtime estimate")
  const compute = Math.round(hourlyRate * hours * 100) / 100
  return { fee: 5, compute, total: Math.round((5 + compute) * 100) / 100 }
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
  const gameFee = options.multiplayer || options.services ? 5 : 0
  const sandboxFee = options.sandbox ? 5 : 0
  return {
    gameFee,
    sandboxFee,
    locations,
    total:
      Math.round((gameFee + sandboxFee + locations.reduce((total, location) => total + location.compute, 0)) * 100) /
      100
  }
}
