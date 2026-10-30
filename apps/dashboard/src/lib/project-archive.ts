import type { Answers } from "@spawn/templates/answers"
import { gameFiles } from "@spawn/templates/scaffold"
import { strToU8, zipSync } from "fflate"

/** A ZIP of what `spawn create` writes for these answers, in a folder named after the project. */
export async function projectArchive(answers: Answers & { name: string }) {
  const files = await gameFiles(answers)
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([path, source]) => [`${answers.name}/${path}`, strToU8(source)])),
    { level: 6 }
  )
}
