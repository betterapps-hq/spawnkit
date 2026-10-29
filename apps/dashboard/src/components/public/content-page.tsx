import { ArrowRight, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { PublicShell } from "./shell"
import "./resource-pages.css"

/** Resource hubs and reading pages share one title, breadcrumb, and spacing contract. */
export function ContentPage({
  title,
  description,
  layout = "resource",
  active = "",
  children
}: {
  title: string
  active?: string
  description?: string
  layout?: "resource" | "article"
  children: ReactNode
}) {
  return (
    <PublicShell active={active}>
      <article className={`p-container p-resource-page${layout === "article" ? " p-resource-reading" : ""}`}>
        <nav className="p-content-breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>
        <header className="p-resource-header">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
      </article>
    </PublicShell>
  )
}

export function ResourceLink({ href, title, children }: { href: string; title: string; children: ReactNode }) {
  return (
    <a className="p-resource-link" href={href}>
      <span>
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </a>
  )
}
