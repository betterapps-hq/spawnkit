import { createHmac } from "node:crypto"
import { expect, it } from "vitest"
import { githubWebhook } from "./github"

it("allows signed connection checks before App authorization and rejects forged deliveries", async () => {
  const secret = "local-test-only"
  const env = { GITHUB_WEBHOOK_SECRET: secret } as Env
  const body = JSON.stringify({ zen: "connection check" })
  const request = (signature: string, event = "ping") =>
    new Request("https://primary.hooks.local.spawnkit.cloud/api/platform/v1/github/webhook", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": signature, "x-github-delivery": "local-check", "x-github-event": event }
    })
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
  expect(await (await githubWebhook(request(signature), env)).json()).toEqual({ accepted: true })
  await expect(githubWebhook(request("sha256=invalid"), env)).rejects.toMatchObject({ status: 401 })
  await expect(githubWebhook(request(signature, "push"), env)).rejects.toMatchObject({ status: 503 })
})
