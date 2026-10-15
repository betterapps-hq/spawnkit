import { ArrowLeft, ArrowUpRight, Mail, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GithubMark } from "../github-mark"
import { PublicShell } from "./shell"

export function ContactPage() {
  return (
    <PublicShell active="">
      <div className="p-container p-info-page">
        <h1>Contact SpawnKit</h1>
        <p className="p-info-lead">Get help with your game or connect with other creators.</p>
        <section>
          <Badge variant="outline">Contact details are placeholders</Badge>
          <div className="p-contact-grid">
            <article id="support">
              <Mail size={25} />
              <h2>Support</h2>
              <p>Questions about your project, hosting, or account.</p>
              <code>support@spawnkit.cloud</code>
              <span>Example address · not connected</span>
            </article>
            <article id="social">
              <MessageCircle size={25} />
              <h2>Community</h2>
              <p>Share your game, ask for feedback, and meet other builders.</p>
              <code>SpawnKit on Discord</code>
              <span>Community link coming soon</span>
            </article>
            <article id="github">
              <GithubMark size={25} />
              <h2>GitHub</h2>
              <p>Project examples, issue reports, and development updates.</p>
              <code>github.com/spawnkit</code>
              <span>Example profile · not connected</span>
            </article>
            <article id="updates">
              <ArrowUpRight size={25} />
              <h2>Follow along</h2>
              <p>New games, product updates, and creator releases.</p>
              <code>@spawnkit</code>
              <span>Example social handle · not connected</span>
            </article>
          </div>
        </section>
        <Button asChild variant="outline">
          <a href="/help">
            <ArrowLeft size={16} /> Visit the help center
          </a>
        </Button>
      </div>
    </PublicShell>
  )
}

export function PolicyPlaceholder({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy"
  return (
    <PublicShell active="">
      <div className="p-container p-info-page">
        <Badge variant="outline" className="mb-6">
          Draft placeholder
        </Badge>
        <h1>{privacy ? "Privacy policy" : "Terms of service"}</h1>
        <p className="p-info-lead">{privacy ? "How SpawnKit handles your data." : "The terms for using SpawnKit."}</p>
        <section>
          <h2>Policy content coming soon</h2>
          <p>
            This page reserves the destination for the published {privacy ? "privacy policy" : "terms of service"}. The
            final text, effective date, and company contact details will be added here.
          </p>
          <p>This preview does not contain a published policy or agreement.</p>
        </section>
        <Button asChild variant="outline">
          <a href="/">
            <ArrowLeft size={16} /> Back to games
          </a>
        </Button>
      </div>
    </PublicShell>
  )
}
