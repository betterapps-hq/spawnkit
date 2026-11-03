import { starterKits } from "@spawn/templates/kits"
import { catalogQuestions } from "@spawn/templates/scaffold"
import { strToU8, zipSync } from "fflate"
import { agentDocuments, documentMarkdown, skillFiles } from "./agent-docs"
import { projectSetup, starterKitPlan } from "./kit-plan"

const origin = "https://spawnkit.cloud"
const cli = "pnpm dlx @spawnkit/cli"

async function buildCatalog() {
  return {
    schemaVersion: 1,
    origin,
    cliDistribution: "npm",
    cliPackage: "@spawnkit/cli",
    // The questionnaire `spawn catalog --json` prints: templates, the questions each asks by mode, add-ons and presets.
    ...catalogQuestions(),
    kits: await Promise.all(
      starterKits.map(async (kit) => {
        const plan = await starterKitPlan(kit.id)
        return {
          id: kit.id,
          name: kit.name,
          description: kit.description,
          useCase: kit.useCase,
          template: kit.template,
          preset: kit.id,
          answers: plan.answers,
          command: `${cli} ${plan.argv.join(" ")}`,
          url: `${origin}/kits/${kit.id}`,
          downloadUrl: `${origin}/downloads/kits/${kit.id}.zip`,
          ...projectSetup(plan.files)
        }
      })
    )
  }
}
let catalog: ReturnType<typeof buildCatalog> | undefined
/** `/catalog/v1.json`: the engine's questionnaire plus SpawnKit's kits. It's planned once per Worker. */
export function agentCatalog() {
  catalog ??= buildCatalog()
  return catalog
}
export const agentOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "SpawnKit public kit discovery",
    version: "2.0.0",
    description: "Catalog and curated downloads only. Authenticated platform operations are outside this document."
  },
  servers: [{ url: origin }],
  paths: {
    "/catalog/v1.json": {
      get: {
        operationId: "getKitCatalog",
        responses: {
          "200": {
            description: "The questionnaire spawn catalog --json prints, plus the curated kits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["schemaVersion", "catalog", "templates", "addons", "presets", "kits"],
                  properties: {
                    schemaVersion: { const: 1 },
                    catalog: {
                      type: "object",
                      required: ["id", "version"],
                      properties: { id: { type: "string" }, version: { type: "string" } }
                    },
                    templates: {
                      type: "array",
                      description: "Each template's questions, by mode, as spawn catalog --json prints them",
                      items: {
                        type: "object",
                        required: ["id", "questionsByMode"],
                        properties: { id: { type: "string" }, questionsByMode: { type: "object" } }
                      }
                    },
                    addons: { type: "array", items: { type: "object", required: ["id"] } },
                    presets: { type: "array", items: { type: "object", required: ["id", "template"] } },
                    kits: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "preset", "command", "downloadUrl", "scripts"],
                        properties: {
                          id: { type: "string" },
                          preset: { type: "string" },
                          command: { type: "string", description: "Creates the same project as the download" },
                          downloadUrl: { type: "string", format: "uri" },
                          scripts: { type: "object", additionalProperties: { type: "string" } }
                        }
                      }
                    }
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
            description: "Standalone project source: the files its kit's command writes",
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

export async function agentResource(request: Request): Promise<Response | null> {
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
    body = `# SpawnKit\n\n> Standalone TypeScript browser-game kits and game hosting. Local creation is account-free.\n\nCreate and extend games with pnpm dlx @spawnkit/cli, or download a standalone kit. Remote agents can request project-scoped access through the user-approved flow in auth.md.\n\n## Documentation\n${agentDocuments.map((doc) => `- [${doc.title}](${origin}/docs/${doc.id}.md): ${doc.description}`).join("\n")}\n\n## Contracts and skills\n- [Catalog v1](${origin}/catalog/v1.json): Every question spawn create asks, and the curated kits.\n- [OpenAPI](${origin}/openapi.json): Public catalog and download contracts.\n- [Authentication](${origin}/auth.md): Supported sign-in and recovery.\n- [SpawnKit skill](${origin}/skills/spawnkit/SKILL.md): Create, extend and publish workflows.\n- [Pricing](${origin}/cloud#pricing): Current hosting availability.\n- [Support](${origin}/contact#support): Troubleshooting and account help.\n`
  if (path === "/catalog/v1.json" || path === "/openapi.json") {
    headers.set("Content-Type", "application/json; charset=utf-8")
    body = JSON.stringify(path === "/catalog/v1.json" ? await agentCatalog() : agentOpenApi) + "\n"
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
