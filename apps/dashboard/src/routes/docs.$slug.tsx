import { createFileRoute, notFound } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  Hash,
  Info,
  Search
} from "lucide-react"
import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import codeTokens from "virtual:docs-code"
import { DocsSearch } from "@/components/public/docs-search"
import { PublicShell } from "@/components/public/shell"
import { agentDocuments, documentMarkdown, type DocBlock } from "@/lib/agent-docs"
import { pageHead } from "@/lib/seo"
import "@/components/public/agent-docs.css"

export const Route = createFileRoute("/docs/$slug")({
  loader: async ({ params }) => {
    const { agentDocuments: documents } = await import("@/lib/agent-docs")
    const doc = documents.find((doc) => doc.id === params.slug)
    if (!doc) throw notFound()
    return doc
  },
  head: ({ loaderData: doc }) => {
    if (!doc) return {}
    const head = pageHead(`/docs/${doc.id}`, `${doc.title} — SpawnKit`, doc.description, doc.title)
    return {
      ...head,
      links: [
        ...head.links,
        { rel: "alternate", type: "text/markdown", href: `/docs/${doc.id}.md` },
        { rel: "describedby", href: "/llms.txt" }
      ]
    }
  },
  component: DocumentationPage
})

/** Deliberately small renderer for our authored inline content; never interprets HTML. */
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>
    if (part.startsWith("**"))
      return (
        <strong key={index}>
          <Inline text={part.slice(2, -2)} />
        </strong>
      )
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link && /^(https:\/\/|\/(?!\/)|#)/.test(link[2]!))
      return (
        <a key={index} href={link[2]}>
          {link[1]}
        </a>
      )
    return part
  })
}

function CopyButton({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  return (
    <span className="agent-docs-copy">
      <button
        type="button"
        className="agent-docs-tool"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setState("copied")
          } catch {
            setState("failed")
          }
        }}
      >
        {state === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span>{state === "copied" ? "Copied" : compact ? "Copy" : label}</span>
      </button>
      <output className={state === "failed" ? "agent-docs-copy-error" : "agent-docs-sr-only"}>
        {state === "copied"
          ? compact
            ? "Copied code to clipboard."
            : "Copied Markdown to clipboard."
          : state === "failed"
            ? "Copy unavailable. Select the text or use View Markdown."
            : ""}
      </output>
    </span>
  )
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const lines = codeTokens[language + "\n" + code]
  return (
    <code data-language={language}>
      {lines
        ? lines.map((line, row) => (
            <span key={row}>
              {row > 0 ? "\n" : ""}
              {line.map((token, index) => (
                <span
                  key={index}
                  className="docs-token"
                  style={{ "--code-light": token.light, "--code-dark": token.dark } as CSSProperties}
                >
                  {token.text}
                </span>
              ))}
            </span>
          ))
        : code}
    </code>
  )
}

function CodeTabs({ block }: { block: Extract<DocBlock, { type: "tabs" }> }) {
  const [selected, setSelected] = useState(0)
  const id = useId()
  return (
    <div className="agent-docs-tabs">
      <div role="tablist" aria-label={block.label}>
        {block.examples.map((example, index) => (
          <button
            key={example.label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % block.examples.length
                  : event.key === "ArrowLeft"
                    ? (index + block.examples.length - 1) % block.examples.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? block.examples.length - 1
                        : undefined
              if (next === undefined) return
              event.preventDefault()
              setSelected(next)
              document.getElementById(`${id}-tab-${next}`)?.focus()
            }}
          >
            {example.label}
          </button>
        ))}
      </div>
      {block.examples.map((example, index) => (
        <div
          key={example.label}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={selected !== index}
        >
          <Block block={{ type: "code", ...example }} />
        </div>
      ))}
    </div>
  )
}

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "tabs":
      return <CodeTabs block={block} />
    case "paragraph":
      return (
        <p>
          <Inline text={block.text} />
        </p>
      )
    case "list": {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List>
          {block.items.map((item) => (
            <li key={item}>
              <Inline text={item} />
            </li>
          ))}
        </List>
      )
    }
    case "code":
      return (
        <div className="agent-docs-code">
          <div className="agent-docs-code-header">
            <span>
              <Code2 size={14} aria-hidden="true" />
              {block.label}
            </span>
            <CopyButton key={block.code} value={block.code} label={`Copy ${block.label}`} compact />
          </div>
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Long code examples must support keyboard scrolling. */}
          <pre tabIndex={0}>
            <HighlightedCode code={block.code} language={block.language} />
          </pre>
        </div>
      )
    case "note":
      return (
        <aside className="agent-docs-note" aria-label={block.title}>
          <Info size={17} aria-hidden="true" />
          <div>
            <strong>{block.title}</strong>
            <p>
              <Inline text={block.text} />
            </p>
          </div>
        </aside>
      )
    case "table":
      return (
        <div className="agent-docs-table">
          <table>
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th scope="row" key={cellIndex}>
                        <Inline text={cell} />
                      </th>
                    ) : (
                      <td key={cellIndex}>
                        <Inline text={cell} />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function DocumentationNavigation({ current }: { current: string }) {
  return (
    <>
      {["Build", "Guides", "Reference"].map((group) => (
        <div className="agent-docs-nav-group" key={group}>
          <span className="agent-docs-label">{group}</span>
          {agentDocuments
            .filter((item) => item.group === group)
            .map((item) => (
              <a key={item.id} href={`/docs/${item.id}`} aria-current={item.id === current ? "page" : undefined}>
                {item.navTitle}
              </a>
            ))}
        </div>
      ))}
    </>
  )
}

function DocumentationPage() {
  const doc = Route.useLoaderData()
  const searchDialog = useRef<HTMLDialogElement>(null)
  const [activeSection, setActiveSection] = useState(doc.sections[0]!.id)
  const currentIndex = agentDocuments.findIndex((item) => item.id === doc.id)
  const previous = agentDocuments[currentIndex - 1]
  const next = agentDocuments[currentIndex + 1]
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-24px 0px -65% 0px" }
    )
    doc.sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [doc])
  const outline = (
    <ul>
      {doc.sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`} aria-current={activeSection === section.id ? "location" : undefined}>
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  )
  return (
    <PublicShell active="/docs">
      <div className="agent-docs">
        <aside className="agent-docs-sidebar">
          <a className="agent-docs-brand" href="/docs">
            <BookOpen size={18} aria-hidden="true" />
            Documentation
          </a>
          <button type="button" className="agent-docs-search-trigger" onClick={() => searchDialog.current?.showModal()}>
            <Search size={15} aria-hidden="true" />
            Search docs<kbd>Ctrl K</kbd>
          </button>
          <nav aria-label="Documentation">
            <DocumentationNavigation current={doc.id} />
          </nav>
          <div className="agent-docs-sidebar-resource">
            <span className="agent-docs-label">For your agent</span>
            <a href="/downloads/skills/spawnkit.zip">
              <Download size={15} aria-hidden="true" />
              Download skill
            </a>
            <a href="/llms.txt">
              <FileText size={15} aria-hidden="true" />
              llms.txt
            </a>
          </div>
        </aside>
        <div className="agent-docs-main">
          <button
            type="button"
            className="agent-docs-search-trigger agent-docs-mobile-search"
            onClick={() => searchDialog.current?.showModal()}
          >
            <Search size={15} aria-hidden="true" />
            Search docs<kbd>Ctrl K</kbd>
          </button>
          <details className="agent-docs-mobile-nav">
            <summary>
              <span>
                <BookOpen size={16} aria-hidden="true" />
                Browse documentation
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile documentation">
              <DocumentationNavigation current={doc.id} />
            </nav>
          </details>
          <article aria-labelledby="doc-title">
            <header className="agent-docs-header">
              <nav className="agent-docs-breadcrumb" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/docs">Docs</a>
                <span>/</span>
                <span>{doc.group}</span>
              </nav>
              <h1 id="doc-title">{doc.title}</h1>
              <p className="agent-docs-lead">{doc.description}</p>
              <div className="agent-docs-actions">
                <CopyButton key={doc.id} value={documentMarkdown(doc)} label="Copy as Markdown" />
                <a className="agent-docs-tool" href={`/docs/${doc.id}.md`}>
                  <FileText size={14} aria-hidden="true" />
                  View Markdown
                </a>
              </div>
            </header>
            <details className="agent-docs-mobile-outline">
              <summary>
                On this page
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              {outline}
            </details>
            <div className="agent-docs-content">
              {doc.sections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
                  <h2 id={`heading-${section.id}`} tabIndex={-1}>
                    <a href={`#${section.id}`}>
                      {section.title}
                      <Hash size={16} aria-hidden="true" />
                    </a>
                  </h2>
                  {section.blocks.map((block, index) => (
                    <Block key={index} block={block} />
                  ))}
                </section>
              ))}
            </div>
            <nav className="agent-docs-pagination" aria-label="Related guides">
              {previous && (
                <a href={`/docs/${previous.id}`}>
                  <span>
                    <ArrowLeft size={14} aria-hidden="true" />
                    Previous guide
                  </span>
                  <strong>{previous.navTitle}</strong>
                </a>
              )}
              {next && (
                <a className="agent-docs-next" href={`/docs/${next.id}`}>
                  <span>
                    Next guide
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                  <strong>{next.navTitle}</strong>
                </a>
              )}
            </nav>
            <p className="agent-docs-help">
              Need a hand?{" "}
              <a href="/contact#support">
                Get support
                <ArrowRight size={13} aria-hidden="true" />
              </a>
            </p>
          </article>
        </div>
        <aside className="agent-docs-outline">
          <nav aria-label="On this page">
            <span className="agent-docs-label">On this page</span>
            {outline}
          </nav>
          <a className="agent-docs-start" href="/templates">
            <span>Ready to build?</span>Explore starter kits
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </aside>
        <DocsSearch dialog={searchDialog} />
      </div>
    </PublicShell>
  )
}
