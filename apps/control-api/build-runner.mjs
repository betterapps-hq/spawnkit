import { spawn } from "node:child_process"
import { readFile, writeFile, mkdir, readdir, lstat, realpath } from "node:fs/promises"
import { resolve, dirname, relative } from "node:path"

const root = "/workspace"
async function run(args) {
  const child = spawn("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CI: "true",
      NODE_EXTRA_CA_CERTS: "/etc/cloudflare/certs/cloudflare-containers-ca.crt",
      NODE_ENV: "production",
      npm_config_registry: "https://registry.npmjs.org/"
    }
  })
  const timer = setTimeout(() => child.kill("SIGKILL"), 240_000)
  try {
    const code = await new Promise((done, reject) => {
      child.once("error", reject)
      child.once("exit", done)
    })
    if (code !== 0) throw new Error(`Command failed (${code})`)
  } finally {
    clearTimeout(timer)
  }
}
if (process.argv[2] === "install") {
  const archive = JSON.parse(await readFile("/tmp/spawn-source.json", "utf8"))
  for (const file of archive.files) {
    const target = resolve(root, file.path)
    if (!target.startsWith(`${root}/`)) throw new Error("Invalid source path")
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, Buffer.from(file.content, "base64"), { flag: "wx" })
  }
  await run(["install", "--frozen-lockfile", "--ignore-scripts", "--ignore-pnpmfile", "--prod=false"])
  process.exit(0)
}
if (process.argv[2] !== "build") throw new Error("Unknown build phase")
await run(["run", "build"])
const out = resolve(root, "dist")
if ((await realpath(out)) !== out) throw new Error("Build output must not be a symbolic link")
const files = []
let size = 0
async function walk(dir) {
  for (const name of (await readdir(dir)).sort()) {
    const path = resolve(dir, name)
    const stat = await lstat(path)
    if (stat.isSymbolicLink()) throw new Error("Build output contains a symbolic link")
    if (stat.isDirectory()) await walk(path)
    else if (stat.isFile()) {
      size += stat.size
      if (size > 20 * 1024 * 1024 || files.length >= 2000) throw new Error("Build output exceeds the artifact limit")
      const content = await readFile(path)
      files.push({ path: relative(out, path), content: content.toString("base64") })
    } else throw new Error("Build output contains an unsupported file")
  }
}
await walk(out)
if (!files.some((file) => file.path === "index.html")) throw new Error("Build must produce dist/index.html")
if (
  files.length > 2000 ||
  files.reduce((total, file) => total + Buffer.byteLength(file.content, "base64"), 0) > 20 * 1024 * 1024
)
  throw new Error("Build output exceeds the artifact limit")
await writeFile("/workspace/spawn-artifacts.json", JSON.stringify({ files }))
