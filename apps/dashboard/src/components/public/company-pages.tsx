import { ArrowLeft, ArrowUpRight, Mail, MessageCircle } from "lucide-react"
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
          <div className="p-contact-grid">
            <article id="support">
              <Mail size={25} />
              <h2>Support</h2>
              <p>Questions about your project, hosting, or account.</p>
              <code>hello@spawnkit.cloud</code>
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
            </article>
            <article id="updates">
              <ArrowUpRight size={25} />
              <h2>Follow along</h2>
              <p>New games, product updates, and creator releases.</p>
              <code>@spawnkit</code>
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
