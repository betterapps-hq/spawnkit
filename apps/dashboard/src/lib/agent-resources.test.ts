import { catalogQuestions } from "@spawn/templates/scaffold"
import { strFromU8, unzipSync } from "fflate"
import { expect, it } from "vitest"
import { agentDocuments, documentMarkdown, skillFiles } from "./agent-docs"
import { agentCatalog, agentOpenApi, agentResource } from "./agent-resources"
import { documentIds } from "./document-ids"
import { kitDownload } from "./kit-download"
import { starterKitPlan } from "./kit-plan"
const request = (path: string, method = "GET") => new Request(`https://spawnkit.cloud${path}`, { method })
it("serves the same documents and portable skill references with bounded method handling", async () => {
  expect(agentDocuments.map((doc) => doc.id)).toEqual(documentIds)
  for (const doc of agentDocuments) {
    const markdown = documentMarkdown(doc)
    expect(markdown).not.toMatch(/\]\(\/(?!\/)/)
    for (const section of doc.sections) {
      expect(markdown).toContain(`## ${section.title}`)
      expect(markdown).toContain(`<a id="${section.id}"></a>`)
      for (const block of section.blocks) {
        const samples = block.type === "code" ? [block] : block.type === "tabs" ? block.examples : []
        for (const sample of samples) {
          expect(!/(^|\n)spawn /.test(sample.code) || sample.code.includes("pnpm add --global @spawnkit/cli")).toBe(
            true
          )
          expect(sample.code).not.toContain("packages/cli/dist")
          expect(sample.code).not.toContain("pnpm --filter")
          expect(sample.code).not.toMatch(/<(project-id|deployment-id)>/)
        }
      }
    }
    for (const link of markdown.matchAll(/\]\(https:\/\/spawnkit\.cloud\/docs\/([^\s)#]+)(?:#([^\s)]+))?\)/g)) {
      const target = agentDocuments.find((candidate) => candidate.id === link[1])
      expect(target, `Broken guide link in ${doc.id}: ${link[0]}`).toBeDefined()
      expect(!link[2] || target!.sections.some((section) => section.id === link[2]), `Broken anchor: ${link[0]}`).toBe(
        true
      )
    }
    expect(await (await agentResource(request(`/docs/${doc.id}.md`)))!.text()).toBe(documentMarkdown(doc))
    expect(await (await agentResource(request(`/docs/${doc.id}.md`, "HEAD")))!.text()).toBe("")
    expect((await agentResource(request(`/docs/${doc.id}.md`, "POST")))!.status).toBe(405)
  }
  const authentication = await (await agentResource(request("/auth.md")))!.text()
  expect(authentication).toContain("service_auth")
  expect(authentication).toContain("oauth2/revoke")
  expect(authentication).toContain("/cli/access")
  expect(await agentCatalog()).toMatchObject({ cliDistribution: "npm", cliPackage: "@spawnkit/cli" })
  expect(await (await agentResource(request("/llms.txt")))!.text()).toContain("/catalog/v1.json")
  expect(await agentResource(request("/docs/missing.md"))).toBeNull()
  expect(await agentResource(request("/skills/spawnkit/toString"))).toBeNull()
  const zip = unzipSync(
    new Uint8Array(await (await agentResource(request("/downloads/skills/spawnkit.zip")))!.arrayBuffer())
  )
  for (const [path, source] of Object.entries(skillFiles())) {
    expect(strFromU8(zip[`spawnkit/${path}`]!)).toBe(source)
    expect(await (await agentResource(request(`/skills/spawnkit/${path}`)))!.text()).toBe(source)
  }
  expect(skillFiles()["SKILL.md"]).toMatch(/^---\nname: spawnkit\ndescription: .+\n---/)
})
it("keeps the documented API, shared catalog, commands and actual downloaded kits aligned", async () => {
  const catalog = await (await agentResource(request("/catalog/v1.json")))!.json()
  expect(catalog).toEqual(await agentCatalog())
  expect(await (await agentResource(request("/openapi.json")))!.json()).toEqual(agentOpenApi)
  // The catalog is the questionnaire spawn catalog --json prints, with SpawnKit's kits added.
  expect(catalog).toMatchObject(catalogQuestions())
  const schema = agentOpenApi.paths["/catalog/v1.json"].get.responses["200"].content["application/json"].schema
  for (const field of schema.required) expect(catalog).toHaveProperty(field)
  for (const field of schema.properties.kits.items.required) expect(catalog.kits[0]).toHaveProperty(field)
  expect(agentOpenApi.paths["/downloads/kits/{kit}.zip"].parameters[0]!.schema.enum).toEqual(
    catalog.kits.map((kit: { id: string }) => kit.id)
  )
  expect(catalog.presets.map((preset: { id: string }) => preset.id)).toEqual(
    catalog.kits.map((kit: { preset: string }) => kit.preset)
  )
  for (const kit of (await agentCatalog()).kits) {
    const plan = await starterKitPlan(kit.id),
      zip = unzipSync(new Uint8Array(await (await kitDownload(new Request(kit.downloadUrl)))!.arrayBuffer()))
    expect(kit.command).toBe(`pnpm dlx @spawnkit/cli create --preset ${kit.id} ${plan.name}`)
    expect(JSON.parse(strFromU8(zip[`${plan.name}/package.json`]!)).scripts).toEqual(kit.scripts)
    for (const command of ["lint", "test", "build", "dev"]) expect(kit.scripts).toHaveProperty(command)
    expect(strFromU8(zip[`${plan.name}/AGENTS.md`]!)).toContain("Standalone")
    expect(zip[`${plan.name}/spawnkit-attribution.json`]).toBeUndefined()
    expect(kit.dependencies).not.toHaveProperty("@spawn/templates")
  }
})
