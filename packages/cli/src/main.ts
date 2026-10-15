import { stripVTControlCharacters } from "node:util"
import { log } from "@clack/prompts"
import { runTerminal } from "./terminal"

try {
  await runTerminal(process.argv.slice(2))
} catch (error) {
  const message = error instanceof Error ? error.message : "Unexpected scaffolding error"
  if (process.argv.includes("--json")) process.stderr.write(JSON.stringify({ status: "error", message }) + "\n")
  else if (process.stderr.isTTY)
    log.error(`${stripVTControlCharacters(message)}\nRun spawn --help for command usage.`, { output: process.stderr })
  else process.stderr.write(`SpawnKit: ${stripVTControlCharacters(message)}\n`)
  process.exitCode = 1
}
