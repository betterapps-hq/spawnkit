import { ContentPage, ResourceLink } from "./content-page"

export function ContactPage() {
  return (
    <ContentPage title="Contact" description="Get help with your account, a game, or a deployment.">
      <section className="p-resource-section" id="support">
        <div>
          <h2>Email SpawnKit</h2>
          <a className="p-resource-email" href="mailto:hello@spawnkit.cloud">
            hello@spawnkit.cloud
          </a>
          <p>
            Describe what you were trying to do and what happened. Include the page or game link and any error message.
          </p>
          <p>
            For a build or deployment issue, include the project or deployment ID from your dashboard. Remove
            credentials and personal information from screenshots and logs before sending them.
          </p>
        </div>
        <div className="p-resource-answer">
          <h3>Details that help</h3>
          <ul>
            <li>Steps to reproduce the issue</li>
            <li>The result you expected</li>
            <li>Your browser and device</li>
            <li>A screenshot or short relevant error excerpt</li>
          </ul>
          <p>Never send passwords, API keys, login codes, or an entire environment file.</p>
        </div>
      </section>
      <section className="p-resource-section">
        <div>
          <h2>Find an answer in the guides</h2>
          <p>These guides cover the most common setup and publishing questions.</p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/docs/getting-started" title="Run a starter kit">
            Required tools, installation, and local development.
          </ResourceLink>
          <ResourceLink href="/docs/upload-existing-game" title="Upload an existing game">
            Build requirements, ZIP layout, and publishing.
          </ResourceLink>
          <ResourceLink href="/docs/testing" title="Troubleshoot your game">
            Test setup, browser errors, and missing assets.
          </ResourceLink>
          <ResourceLink href="/docs/authentication" title="Accounts and access">
            When sign-in is needed and how project access works.
          </ResourceLink>
        </div>
      </section>
      <section className="p-resource-section">
        <div>
          <h2>Content and privacy questions</h2>
          <p>
            Use a game's report control to flag inappropriate content, or email us with the game URL. For privacy
            questions or requests about your information, use the same email address and describe the request.
          </p>
        </div>
        <div className="p-resource-links">
          <ResourceLink href="/community-guidelines" title="Community guidelines">
            Publishing, feedback, reports, and moderation.
          </ResourceLink>
          <ResourceLink href="/privacy" title="Privacy policy">
            What we collect and how to contact us about your data.
          </ResourceLink>
        </div>
      </section>
    </ContentPage>
  )
}
