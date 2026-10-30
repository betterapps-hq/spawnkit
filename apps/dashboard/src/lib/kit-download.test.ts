import { kitAnswers, kitProjectName } from "@spawn/templates/answers"
import { starterKits } from "@spawn/templates/kits"
import { gameFiles } from "@spawn/templates/scaffold"
import { strFromU8, unzipSync } from "fflate"
import { expect, it } from "vitest"
import { kitDownload } from "./kit-download"
import { starterKitPlan } from "./kit-plan"

it("downloads every curated kit as the files spawn create --preset writes", async () => {
  for (const kit of starterKits) {
    const plan = await starterKitPlan(kit.id)
    expect(plan.argv).toEqual(["create", "--preset", kit.id, kitProjectName(kit)])
    expect(plan.files).toEqual(await gameFiles({ ...kitAnswers(kit), name: plan.name }))
    const response = (await kitDownload(new Request(`https://spawnkit.cloud/downloads/kits/${kit.id}.zip`)))!
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Disposition")).toBe(`attachment; filename="${plan.name}.zip"`)
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
    expect(Object.keys(files)).toEqual(Object.keys(plan.files).map((path) => `${plan.name}/${path}`))
    for (const [path, source] of Object.entries(plan.files))
      expect(strFromU8(files[`${plan.name}/${path}`]!)).toBe(source)
    expect(JSON.parse(plan.files["package.json"]!).dependencies).not.toHaveProperty("@spawn/templates")
  }
  expect((await kitDownload(new Request("https://spawnkit.cloud/downloads/kits/fake.zip")))?.status).toBe(404)
  expect(
    (await kitDownload(new Request("https://spawnkit.cloud/downloads/kits/pixi.zip", { method: "POST" })))?.status
  ).toBe(405)
  expect(
    await (await kitDownload(new Request("https://spawnkit.cloud/downloads/kits/pixi.zip", { method: "HEAD" })))!.text()
  ).toBe("")
  expect(await kitDownload(new Request("https://spawnkit.cloud/kits/pixi"))).toBeNull()
})

it("adds attribution to one download without changing the kit", async () => {
  const response = (await kitDownload(new Request("https://spawnkit.cloud/downloads/kits/pixi.zip"), '{"id":"x"}\n'))!
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
  expect(strFromU8(files["pixi-game/spawnkit-attribution.json"]!)).toBe('{"id":"x"}\n')
  expect((await starterKitPlan("pixi")).files).not.toHaveProperty("spawnkit-attribution.json")
})
