import { ArrowRight, BookOpen, Gamepad2, Layers3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicShell } from "./shell"

export function AboutPage() {
  return (
    <PublicShell active="">
      <div className="p-container p-info-page">
        <h1>About SpawnKit</h1>
        <p className="p-info-lead">A place to discover browser games and build your own.</p>
        <section>
          <h2>For players and creators</h2>
          <p>
            SpawnKit brings free browser games, configurable starter kits, and game infrastructure together. Play a
            demo, explore a concept, or start with an engine and make something of your own using your preferred AI
            editor.
          </p>
          <a href="/templates" className="p-text-link">
            Build a starter kit <ArrowRight size={16} />
          </a>
        </section>
        <section id="availability">
          <h2>Platform availability</h2>
          <div className="p-info-grid">
            <article>
              <Gamepad2 />
              <h3>Available now</h3>
              <p>
                Three browser demos, four engine starter kits, downloadable project source, and configurable physics,
                testing, and telemetry integrations.
              </p>
            </article>
            <article>
              <Layers3 />
              <h3>In development</h3>
              <p>
                Managed Colyseus servers, hosted build activation, GitHub previews, paid checkout, public ratings and
                comments, and native desktop and mobile templates.
              </p>
            </article>
          </div>
          <p>
            Static release promotion and rollback are implemented. Cloud features have individual availability notes on
            the hosting page.
          </p>
          <a href="/cloud" className="p-text-link">
            Explore hosting <ArrowRight size={16} />
          </a>
        </section>
      </div>
    </PublicShell>
  )
}

export function HelpPage() {
  return (
    <PublicShell active="">
      <div className="p-container p-info-page">
        <h1>Getting started</h1>
        <p className="p-info-lead">Play a game or run your first project.</p>
        <section id="playing">
          <h2>Playing games</h2>
          <p>
            Choose an entry marked “Playable demo,” then select Play demo. No account or install is needed. Each game
            includes keyboard and touch controls. Space pauses the game when it has focus.
          </p>
          <p>
            Entries marked “Game concept” show an idea and its artwork. Their starter links create a minimal engine
            project, rather than the illustrated game.
          </p>
          <a href="/?availability=playable#games" className="p-text-link">
            Find a playable demo <ArrowRight size={16} />
          </a>
        </section>
        <section>
          <h2>Run a starter kit</h2>
          <ol>
            <li>Open the starter kit builder and choose an engine.</li>
            <li>Add compatible physics, interface, and testing tools.</li>
            <li>Download and extract the ZIP into a new folder.</li>
            <li>Open the folder in your editor. Install Node.js 24+ and pnpm 12 if needed.</li>
            <li>
              Run <code>pnpm install</code>, then <code>pnpm dev</code>.
            </li>
          </ol>
          <p>The included README explains the generated project. Downloading a kit does not create cloud resources.</p>
          <Button asChild>
            <a href="/templates" className="p-button">
              Open the builder <ArrowRight size={16} />
            </a>
          </Button>
        </section>
        <section>
          <h2>Ratings and comments</h2>
          <p>
            Community features are in preview. You can save, edit, and remove your feedback on a game page. It stays in
            this browser, is not included in public totals, and is removed if you clear site storage. Public posting is
            not available yet.
          </p>
        </section>
        <section>
          <h2>Cloud setup</h2>
          <p>
            Sign in to open your dashboard. Check individual feature availability before configuring hosting or
            services. Paid plan checkout is not enabled in this preview.
          </p>
          <a href="/cloud" className="p-text-link">
            Hosting and deployment details <ArrowRight size={16} />
          </a>
        </section>
      </div>
    </PublicShell>
  )
}

export function GuidelinesPage() {
  return (
    <PublicShell active="">
      <div className="p-container p-info-page">
        <BookOpen className="p-info-icon" size={32} />
        <h1>Community guidelines</h1>
        <p className="p-info-lead">Help creators make better games and players find games they enjoy.</p>
        <section>
          <h2>Review the game you played</h2>
          <p>
            Explain what you liked and what could improve. Rate the experience rather than the tools used to make it.
            Label feedback on an unplayable concept as feedback on the idea.
          </p>
        </section>
        <section>
          <h2>Make feedback useful</h2>
          <p>
            For a bug, include what happened, what you expected, and the steps to reproduce it. Mention your browser or
            device if relevant. Keep passwords, tokens, personal details, and private logs out of comments.
          </p>
        </section>
        <section>
          <h2>Respect other people’s work</h2>
          <p>
            Critique the game without targeting the creator. Avoid harassment, spam, impersonation, and links to unsafe
            downloads. Share assets and code only when you have permission.
          </p>
        </section>
        <section>
          <h2>During the preview</h2>
          <p>
            Feedback is saved locally and is visible only to you. Public posting and moderation tools are still in
            development.
          </p>
        </section>
        <a href="/#games" className="p-text-link">
          Browse games <ArrowRight size={16} />
        </a>
      </div>
    </PublicShell>
  )
}
