import { expect, it, vi } from "vitest"
import { watchDeployment } from "./deployment-watch"
import type { Deployment, PlatformApi } from "./platform-api"

const initial: Deployment = { id: "build1", environment: "production", status: "queued" }
function fixture() {
  const api = { status: vi.fn<PlatformApi["status"]>(), logs: vi.fn<PlatformApi["logs"]>() }
  return {
    api: api as Pick<PlatformApi, "status" | "logs">,
    sleep: vi.fn<(ms: number, signal: AbortSignal) => Promise<void>>(async () => {}),
    output: vi.fn<(text: string) => void>()
  }
}
it("follows status and cursor logs, reconnects without duplicates, and drains final logs", async () => {
  const { api, sleep, output } = fixture()
  vi.mocked(api.status)
    .mockResolvedValueOnce({ ...initial, status: "building" })
    .mockResolvedValue({
      ...initial,
      status: "succeeded",
      url: "https://game.example",
      dashboardUrl: "https://spawnkit.cloud/dashboard/projects/game1"
    })
  vi.mocked(api.logs)
    .mockResolvedValueOnce({ entries: [{ sequence: 1, message: "Installing" }] })
    .mockRejectedValueOnce(new Error("temporary disconnect"))
    .mockResolvedValueOnce({
      entries: [
        { sequence: 1, message: "Installing" },
        { sequence: 2, message: "Built" }
      ]
    })
    .mockResolvedValueOnce({ entries: [{ sequence: 3, message: "Media optimized" }] })
  const result = await watchDeployment(api, "game1", initial, output, { sleep })
  expect(result.deployment.status).toBe("succeeded")
  expect(output.mock.calls.flat().filter((line) => line === "Installing\n")).toHaveLength(1)
  expect(output.mock.calls.flat()).toContain("Media optimized\n")
  expect(api.logs).toHaveBeenLastCalledWith("game1", "build1", "2", expect.any(AbortSignal))
})
it("Ctrl+C stops watching without making a cancellation request", async () => {
  const { api, sleep, output } = fixture()
  vi.mocked(api.logs).mockResolvedValue({ entries: [] })
  vi.mocked(api.status).mockResolvedValue({ ...initial, status: "building" })
  const controller = new AbortController()
  sleep.mockImplementation(async () => {
    controller.abort()
  })
  const result = await watchDeployment(api, "game1", initial, output, { sleep, signal: controller.signal })
  expect(result).toMatchObject({ interrupted: true, deployment: { status: "building" } })
  expect(api.status).toHaveBeenCalledOnce()
})
it("stops after repeated connection failures with a resume command", async () => {
  const { api, sleep, output } = fixture()
  vi.mocked(api.logs).mockRejectedValue(new Error("Offline"))
  await expect(watchDeployment(api, "game1", initial, output, { sleep })).rejects.toThrow(
    "spawn logs build1 --project game1 --follow"
  )
  expect(api.logs).toHaveBeenCalledTimes(4)
})
