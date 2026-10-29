import { Search, X, ArrowUpRight } from "lucide-react"
import { useEffect, useRef, useState, type RefObject } from "react"
import { agentDocuments } from "@/lib/agent-docs"

const entries = agentDocuments.flatMap((doc) =>
  doc.sections.map((section) => {
    const text = section.blocks
      .map((block) => {
        switch (block.type) {
          case "tabs":
            return block.label + " " + block.examples.map((example) => example.label + " " + example.code).join(" ")
          case "paragraph":
            return block.text
          case "note":
            return block.title + " " + block.text
          case "code":
            return block.code
          case "list":
            return block.items.join(" ")
          case "table":
            return block.rows.flat().join(" ")
        }
      })
      .join(" ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*]/g, "")
    return { title: section.title, guide: doc.navTitle, href: `/docs/${doc.id}#${section.id}`, text }
  })
)

export function DocsSearch({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const [query, setQuery] = useState("")
  const pressedBackdrop = useRef(false)
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const results = words.length
    ? entries
        .filter((entry) =>
          words.every((word) => `${entry.title} ${entry.guide} ${entry.text}`.toLowerCase().includes(word))
        )
        .sort(
          (a, b) =>
            Number(b.title.toLowerCase().includes(query.toLowerCase().trim())) -
            Number(a.title.toLowerCase().includes(query.toLowerCase().trim()))
        )
        .slice(0, 10)
    : []
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        dialog.current?.showModal()
      }
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [dialog])
  return (
    <dialog
      ref={dialog}
      className="agent-docs-search-dialog"
      aria-label="Search documentation"
      onPointerDown={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        pressedBackdrop.current =
          event.target === event.currentTarget &&
          (event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom)
      }}
      onPointerUp={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        if (
          pressedBackdrop.current &&
          event.target === event.currentTarget &&
          (event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom)
        )
          event.currentTarget.close()
        pressedBackdrop.current = false
      }}
      onClose={() => setQuery("")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.close()
          return
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
        const links = Array.from(
          event.currentTarget.querySelectorAll<HTMLAnchorElement>(".agent-docs-search-results a")
        )
        const index = links.indexOf(event.target as HTMLAnchorElement)
        if (event.target instanceof HTMLInputElement && event.key === "ArrowDown") {
          event.preventDefault()
          links[0]?.focus()
        } else if (index >= 0) {
          event.preventDefault()
          if (index === 0 && event.key === "ArrowUp") event.currentTarget.querySelector("input")?.focus()
          else links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus()
        }
      }}
    >
      <div className="agent-docs-search-field">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search documentation"
          placeholder="Search guides, commands, and fixes…"
          value={query}
          maxLength={120}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" aria-label="Close search" onClick={() => dialog.current?.close()}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="agent-docs-search-results">
        <p className="agent-docs-label">{words.length ? "Matching sections" : "Explore the guides"}</p>
        {words.length ? (
          results.length ? (
            results.map((result) => (
              <a key={result.href} href={result.href} onClick={() => dialog.current?.close()}>
                <span>{result.guide}</span>
                <strong>
                  {result.title}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </strong>
                <p>
                  {result.text.slice(0, 155)}
                  {result.text.length > 155 ? "…" : ""}
                </p>
              </a>
            ))
          ) : (
            <p className="agent-docs-search-empty">
              No sections match “{query}”. Try a kit name, a command, or a word such as “upload”.
            </p>
          )
        ) : (
          agentDocuments.map((doc) => (
            <a key={doc.id} href={`/docs/${doc.id}`} onClick={() => dialog.current?.close()}>
              <strong>
                {doc.title}
                <ArrowUpRight size={16} aria-hidden="true" />
              </strong>
              <p>{doc.summary}</p>
            </a>
          ))
        )}
      </div>
      <output className="agent-docs-sr-only">
        {words.length ? `${results.length} matching sections` : `${agentDocuments.length} guides available`}
      </output>
      <div className="agent-docs-search-footer">
        Search across all guides<span>Click outside or Esc to close</span>
      </div>
    </dialog>
  )
}
