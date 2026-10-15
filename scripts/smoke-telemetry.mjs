import { spawnSync } from "node:child_process"
import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const pnpm = process.env.npm_execpath
if (!pnpm) throw new Error("Run with pnpm exec node scripts/smoke-telemetry.mjs")
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 120_000 })
  if (result.error || result.status !== 0)
    throw new Error(`${args.join(" ")} failed: ${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`)
}
function packageCommand(args, cwd) {
  if (/\.[cm]?js$/.test(pnpm)) run(process.execPath, [pnpm, ...args], cwd)
  else run(pnpm, args, cwd)
}
await mkdir(resolve(root, "work"), { recursive: true })
const directory = await mkdtemp(resolve(root, "work/telemetry-package-"))
packageCommand(["build"], resolve(root, "packages/telemetry"))
packageCommand(["pack", "--pack-destination", directory], resolve(root, "packages/telemetry"))
await copyFile(resolve(directory, "spawn-telemetry-0.1.0.tgz"), resolve(root, "work/spawn-telemetry-0.1.0.tgz"))
await writeFile(resolve(directory, "pnpm-workspace.yaml"), "packages: []\n")
await writeFile(
  resolve(directory, "package.json"),
  JSON.stringify(
    {
      name: "spawn-telemetry-package-smoke",
      private: true,
      type: "module",
      dependencies: { "@spawn/telemetry": "file:./spawn-telemetry-0.1.0.tgz", "@opentelemetry/sdk-logs": "0.223.0" },
      devDependencies: { typescript: "7.0.2", "@types/node": "24.19.2" }
    },
    null,
    2
  )
)
await writeFile(
  resolve(directory, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: ["node"],
        lib: ["ES2023", "DOM"]
      },
      include: ["smoke.ts"]
    },
    null,
    2
  )
)
await writeFile(
  resolve(directory, "smoke.ts"),
  `import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createTelemetry, type TelemetryOptions } from "@spawn/telemetry"
import { createOtelLogExporter } from "@spawn/telemetry/otel"
import { LIMITS } from "@spawn/telemetry/protocol"
import { telemetryFiles } from "@spawn/telemetry/scaffold"
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
const options: TelemetryOptions = { endpoint: "https://example.test/v1/logs", key: "public-package-test", serviceName: "package-test", consent: "granted", flushIntervalMs: 0, fetch: async () => Response.json({}) }
const client = createTelemetry(options)
client.track("package.event", { score: 1 }, { traceId: "a".repeat(32) })
const provider = new LoggerProvider({ processors: [new SimpleLogRecordProcessor({ exporter: createOtelLogExporter(client) })] })
provider.getLogger("package").emit({ body: "package OTEL", severityNumber: 9 })
await provider.forceFlush()
assert.equal((await client.flush()).sent, 2)
assert.equal(LIMITS.batchRecords, 20)
assert.equal(telemetryFiles["vendor/spawn-telemetry/dist/index.js"], await readFile(new URL(import.meta.resolve("@spawn/telemetry")), "utf8"))
assert.equal(Object.keys(telemetryFiles).length, 5)
await provider.shutdown()
console.log("Clean tarball installation, all exports, NodeNext declarations, vendored artifact identity and official OpenTelemetry adapter passed.")
`
)
packageCommand(["install"], directory)
packageCommand(["exec", "tsc"], directory)
run(process.execPath, ["smoke.ts"], directory)
console.log(`Telemetry package smoke passed: ${directory}`)
