import { notFoundArtwork, notFoundDescription, notFoundTitle } from "@spawn/platform/not-found"
import { ArrowRight } from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import "@spawn/platform/not-found.css"

const artwork = { __html: notFoundArtwork }

export function NotFoundPage() {
  return (
    <>
      <title>{notFoundTitle}</title>
      <meta name="robots" content="noindex" />
      <div className="spawn-not-found">
        <header className="nf-header">
          <Brand />
        </header>
        <main className="nf-main" id="main">
          <div className="nf-art" aria-hidden="true" dangerouslySetInnerHTML={artwork} />
          <h1>Game not found</h1>
          <p className="nf-description">{notFoundDescription}</p>
          <Button asChild className="nf-discover">
            <a href="/">
              Discover games <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        </main>
      </div>
    </>
  )
}
