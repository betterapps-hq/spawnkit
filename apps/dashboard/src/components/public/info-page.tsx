import { ArrowRight } from "lucide-react"
import { ContentPage, ResourceLink } from "./content-page"

export function AboutPage() {
  return (
    <ContentPage
      title="About SpawnKit"
      description="Browser games, standalone starter kits, and hosting for the games you make."
    >
      <section className="p-resource-section">
        <div>
          <h2>What is SpawnKit?</h2>
          <p>
            SpawnKit connects a browser game catalog, editable TypeScript starter kits, and game hosting. The kits give
            you playable source code to change in your editor or with an AI coding agent.
          </p>
          <p>
            You choose the engine and tools. Your game runs locally as a standalone project, and you can read and edit
            its source.
          </p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/browse" title="Find a game to play">
            Explore the browser game catalog.
          </ResourceLink>
          <ResourceLink href="/templates" title="Make a game of your own">
            Choose your engine, physics, and testing tools.
          </ResourceLink>
        </div>
      </section>
      <section className="p-resource-section" id="availability">
        <div>
          <h2>What you can use today</h2>
          <p>
            Download a web game kit for PixiJS, Phaser, Three.js, or Babylon.js. Build locally without a SpawnKit
            account. Sign in to upload a static browser build, manage your project, and share its hosted URL.
          </p>
          <p>
            Kits target the web. Touch controls and support for individual devices depend on how you build and test the
            game. Use <code>@spawnkit/cli</code> to create and extend games; downloadable kits and dashboard uploads are
            available.
          </p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/docs/getting-started" title="Run your first kit">
            Prerequisites, local development, and your first change.
          </ResourceLink>
          <ResourceLink href="/docs/upload-existing-game" title="Bring an existing game">
            Prepare a static build and publish it from the dashboard.
          </ResourceLink>
          <ResourceLink href="/cloud" title="Explore hosting and pricing">
            Review available hosting and planned services.
          </ResourceLink>
        </div>
      </section>
      <section className="p-resource-section">
        <div>
          <h2>Build with the tools you know</h2>
          <p>
            Use your own editor or follow a guide for Codex, Claude Code, or Cursor. Each guide starts with a real
            project folder and shows how to ask for a focused change, run it, and check the result.
          </p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/docs/codex" title="Codex">
            Open your kit and make a verified change.
          </ResourceLink>
          <ResourceLink href="/docs/claude-code" title="Claude Code">
            Work from your game folder with clear tasks.
          </ResourceLink>
          <ResourceLink href="/docs/cursor" title="Cursor">
            Edit, run, and test your game in Cursor.
          </ResourceLink>
        </div>
      </section>
    </ContentPage>
  )
}

export function HelpPage() {
  return (
    <ContentPage title="Help center" description="Find setup instructions, publishing guides, and answers for players.">
      <nav className="p-resource-task-grid" aria-label="Help topics">
        <ResourceLink href="/docs/getting-started" title="Start making a game">
          Install the tools, run a kit, and make your first edit.
        </ResourceLink>
        <ResourceLink href="/docs/upload-existing-game" title="Upload a game you already built">
          Check your build, package its files, and publish.
        </ResourceLink>
        <ResourceLink href="/docs/dashboard" title="Find your way around the dashboard">
          Projects, deployments, logs, and live URLs.
        </ResourceLink>
        <ResourceLink href="/docs/testing" title="Fix a game that is not working">
          Browser setup, missing assets, and build errors.
        </ResourceLink>
        <ResourceLink href="/docs/authentication" title="Understand accounts and access">
          Sign-in requirements and project permissions.
        </ResourceLink>
        <ResourceLink href="/docs/updating" title="Change an existing project">
          Add tools, review conflicts, and verify your changes.
        </ResourceLink>
      </nav>
      <section className="p-resource-section" id="playing">
        <div>
          <h2>Playing browser games</h2>
          <p>
            Choose a game from the <a href="/browse">catalog</a> and press Play. You can play without a SpawnKit account
            or installation. Check the game's description and on-screen instructions for controls; keyboard, mouse, and
            touch support vary by game.
          </p>
          <p>
            Click or tap the game if keyboard input is not reaching it. Use Fullscreen for a larger view, or Open game
            to play at its own address. Audio may require a click or tap before it starts.
          </p>
        </div>
        <div className="p-resource-answer">
          <h3>A game will not load</h3>
          <p>
            Reload the page and try a current browser. If the problem continues, try opening the game directly.{" "}
            <a href="/contact#support">Contact support</a> with the game link, browser, device, and what you see.
            Include any error message.
          </p>
        </div>
      </section>
      <section className="p-resource-section" id="feedback">
        <div>
          <h2>Feedback and reports</h2>
          <p>
            Sign in to leave a rating or comment. You can update or remove your own feedback. Useful bug reports explain
            what happened, what you expected, and how to reproduce the problem.
          </p>
          <p>
            For inappropriate content, use the report control on the game page. Follow the{" "}
            <a href="/community-guidelines">community guidelines</a> and keep account details, passwords, and tokens out
            of public comments.
          </p>
        </div>
        <div className="p-resource-answer">
          <h3>Views and plays</h3>
          <p>
            A view is a visit to a game's page. A play is recorded when someone starts the game through Play or Open
            game. Repeated activity is deduplicated; these counts do not measure time spent playing.
          </p>
        </div>
      </section>
      <section className="p-resource-section">
        <div>
          <h2>Contact support</h2>
          <p>The support page explains what information to include so we can understand your issue.</p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/contact" title="Contact SpawnKit">
            Account, publishing, game, and website questions.
          </ResourceLink>
        </div>
      </section>
    </ContentPage>
  )
}

export function GuidelinesPage() {
  return (
    <ContentPage
      title="Community guidelines"
      description="Rules for publishing games, leaving feedback, and reporting problems."
      layout="article"
    >
      <section>
        <h2>Review the game you played</h2>
        <p>
          Explain what worked and what could improve. Rate the experience rather than the tools used to make it. For a
          bug, include the steps, expected result, and browser or device. Keep feedback about the game.
        </p>
      </section>
      <section>
        <h2>Respect people and their work</h2>
        <p>
          Do not post harassment, threats, impersonation, spam, or unsafe downloads. Do not share private information,
          credentials, or someone else's private messages. Publish code, artwork, music, and other assets only when you
          have permission to use them.
        </p>
        <p>
          If you publish a source link, make sure you can share that repository and identify its license. See the{" "}
          <a href="/docs/publishing">publishing guide</a> for preparing your game's listing.
        </p>
      </section>
      <section>
        <h2>Report problems</h2>
        <p>
          Use the report control on a game page for content that may violate these guidelines. Describe the issue and
          where it appears. Use <a href="/contact#support">support</a> for account or technical problems; do not post
          passwords or sensitive logs in a report.
        </p>
      </section>
      <section>
        <h2>How moderation works</h2>
        <p>
          Reports are reviewed by the moderation team. Depending on the issue, a game can be removed from discovery,
          hosted access can be restricted, or a comment can be hidden. A report does not automatically remove content.
        </p>
        <p>
          If you believe a decision was mistaken, <a href="/contact">contact us</a> with the game link and relevant
          details. The <a href="/terms">terms of service</a> and <a href="/privacy">privacy policy</a> explain the
          broader service rules and data handling.
        </p>
      </section>
      <a className="p-resource-inline" href="/browse">
        Explore browser games <ArrowRight size={16} aria-hidden="true" />
      </a>
    </ContentPage>
  )
}
