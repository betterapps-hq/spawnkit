import type { Answers } from "@spawn/templates/answers"
import { ChevronDown, FileCode2, Folder } from "lucide-react"
import { useEffect, useState } from "react"

function ProjectFiles({ answers }: { answers: Answers }) {
  const [result, setResult] = useState<{ files?: string[]; error?: string }>({})
  useEffect(() => {
    let active = true
    void import("@spawn/templates/scaffold")
      .then(({ gameFiles }) => gameFiles(answers))
      .then((files) => {
        if (active) setResult({ files: Object.keys(files) })
      })
      .catch(() => {
        if (active) setResult({ error: "The file preview could not load. Reload the page and try again." })
      })
    return () => {
      active = false
    }
  }, [answers])
  if (result.error) return <p role="alert">{result.error}</p>
  if (!result.files) return <output>Loading project files…</output>
  return (
    <>
      <output>{result.files.length} files in your starter kit</output>
      <ul>
        {result.files.map((file) => (
          <li key={file}>
            <FileCode2 size={12} />
            {file}
          </li>
        ))}
      </ul>
    </>
  )
}

export function ProjectFilePreview({ answers }: { answers: Answers | undefined }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="p-file-preview" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <Folder size={16} />
        Project files
        <ChevronDown size={14} />
      </summary>
      {open &&
        (answers ? (
          <ProjectFiles key={JSON.stringify(answers)} answers={answers} />
        ) : (
          <p>Choose a valid project name and compatible tools to preview your files.</p>
        ))}
    </details>
  )
}
