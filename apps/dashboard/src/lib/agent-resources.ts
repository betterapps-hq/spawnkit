import { describeProjectPlan } from "@spawn/templates"
import { templates, physicsOptions, uiOptions, telemetryOptions } from "@spawn/templates/catalog"
import { componentCatalog } from "@spawn/templates/composition"
import { starterKits } from "@spawn/templates/kits"
import { strToU8, zipSync } from "fflate"
import { agentDocuments, documentMarkdown, skillFiles } from "./agent-docs"
import { starterKitPlan } from "./kit-plan"

const origin = "https://spawnkit.cloud"
export function agentCatalog() {
  return {
    schemaVersion: 1,
    origin,
    cliDistribution: "npm",
    cliPackage: "@spawnkit/cli",
    templates,
    physicsOptions,
    uiOptions,
    telemetryOptions,
    components: componentCatalog,
    kits: starterKits.map((kit) => ({
      ...kit,
      url: `${origin}/kits/${kit.id}`,
      downloadUrl: `${origin}/downloads/kits/${kit.id}.zip`,
      ...describeProjectPlan(starterKitPlan(kit.id))
    }))
  }
}
export const agentOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "SpawnKit public kit discovery",
    version: "1.0.0",
    description: "Catalog and curated downloads only. Authenticated platform operations are outside this document."
  },
  servers: [{ url: origin }],
  paths: {
    "/catalog/v1.json": {
      get: {
        operationId: "getKitCatalog",
        responses: {
          "200": {
            description: "Versioned kit catalog",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schemaVersion", "kits", "components"],
                  properties: {
                    schemaVersion: { const: 1 },
                    kits: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "downloadUrl", "scripts"],
                        properties: {
                          id: { type: "string" },
                          downloadUrl: { type: "string", format: "uri" },
                          scripts: { type: "object", additionalProperties: { type: "string" } }
                        }
                      }
                    },
                    components: { type: "array", items: { type: "object" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/downloads/kits/{kit}.zip": {
      parameters: [
        { name: "kit", in: "path", required: true, schema: { type: "string", enum: starterKits.map((kit) => kit.id) } }
      ],
      get: {
        operationId: "downloadKit",
        responses: {
          "200": {
            description: "Standalone project source",
            content: { "application/zip": { schema: { type: "string", format: "binary" } } }
          },
          "404": { description: "Unknown kit" }
        }
      },
      head: {
        operationId: "checkKit",
        responses: { "200": { description: "Kit available; no response body" }, "404": { description: "Unknown kit" } }
      }
    }
  }
}

export function agentResource(request: Request) {
  const url = new URL(request.url),
    path = url.pathname
  const doc = agentDocuments.find(
    (doc) => path === `/docs/${doc.id}.md` || (path === "/auth.md" && doc.id === "authentication")
  )
  const skill = skillFiles()
  const skillPath = path.startsWith("/skills/spawnkit/") ? path.slice("/skills/spawnkit/".length) : ""
  const skillText = Object.hasOwn(skill, skillPath) ? skill[skillPath as keyof typeof skill] : undefined
  if (
    !doc &&
    !skillText &&
    !["/llms.txt", "/catalog/v1.json", "/openapi.json", "/downloads/skills/spawnkit.zip"].includes(path)
  )
    return null
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=300",
    Link: `<${origin}/llms.txt>; rel="describedby"`,
    "X-Robots-Tag": "noindex, follow"
  })
  if (!["GET", "HEAD"].includes(request.method)) {
    headers.set("Allow", "GET, HEAD")
    return new Response("Method not allowed", { status: 405, headers })
  }
  let body: string | Uint8Array = doc ? documentMarkdown(doc) : (skillText ?? "")
  if (path === "/llms.txt")
    body = `# SpawnKit\n\n> Standalone TypeScript browser-game kits and game hosting. Local creation is account-free.\n\nCreate and extend games with pnpm dlx @spawnkit/cli, or download a standalone kit. Remote agents can request project-scoped access through the user-approved flow in auth.md.\n\n## Documentation\n${agentDocuments.map((doc) => `- [${doc.title}](${origin}/docs/${doc.id}.md): ${doc.description}`).join("\n")}\n\n## Contracts and skills\n- [Catalog v1](${origin}/catalog/v1.json): Supported kits and compatibility data.\n- [OpenAPI](${origin}/openapi.json): Public catalog and download contracts.\n- [Authentication](${origin}/auth.md): Supported sign-in and recovery.\n- [SpawnKit skill](${origin}/skills/spawnkit/SKILL.md): Create, extend and publish workflows.\n- [Pricing](${origin}/cloud#pricing): Current hosting availability.\n- [Support](${origin}/contact#support): Troubleshooting and account help.\n`
  if (path === "/catalog/v1.json" || path === "/openapi.json") {
    headers.set("Content-Type", "application/json; charset=utf-8")
    body = JSON.stringify(path === "/catalog/v1.json" ? agentCatalog() : agentOpenApi) + "\n"
  }
  if (path === "/downloads/skills/spawnkit.zip") {
    headers.set("Content-Type", "application/zip")
    headers.set("Content-Disposition", 'attachment; filename="spawnkit.zip"')
    body = new Uint8Array(
      zipSync(Object.fromEntries(Object.entries(skill).map(([name, text]) => [`spawnkit/${name}`, strToU8(text)])))
    )
  }
  return new Response(request.method === "HEAD" ? null : (body as BodyInit), { headers })
}
