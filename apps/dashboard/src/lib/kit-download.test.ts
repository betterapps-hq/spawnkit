import { starterKits } from "@spawn/templates/kits"
import { strFromU8, unzipSync } from "fflate"
import { expect, it } from "vitest"
import { kitDownload } from "./kit-download"
import { starterKitPlan } from "./kit-plan"

it("downloads every curated kit from the same validated composition shown on its page", async () => {
  for (const kit of starterKits) {
    const plan = starterKitPlan(kit.id)
    const response = kitDownload(new Request(`https://spawnkit.cloud/downloads/kits/${kit.id}.zip`))!
    expect(response.status).toBe(200)
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
    expect(Object.keys(files).length).toBe(Object.keys(plan.files).length)
    for (const [path, source] of Object.entries(plan.files))
      expect(strFromU8(files[`${plan.name}/${path}`]!)).toBe(source)
    expect(JSON.parse(plan.files["package.json"]!).dependencies).not.toHaveProperty("@spawn/templates")
  }
  expect(kitDownload(new Request("https://spawnkit.cloud/downloads/kits/fake.zip"))?.status).toBe(404)
  expect(kitDownload(new Request("https://spawnkit.cloud/downloads/kits/pixi.zip", { method: "POST" }))?.status).toBe(
    405
  )
  expect(
    await kitDownload(new Request("https://spawnkit.cloud/downloads/kits/pixi.zip", { method: "HEAD" }))!.text()
  ).toBe("")
})
