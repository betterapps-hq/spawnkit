import { ContentPage } from "./content-page"

const contactEmail = "hello@spawnkit.cloud"

function PrivacyContact() {
  return (
    <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">
      {contactEmail}
    </a>
  )
}

export function PrivacyPolicyPage() {
  return (
    <ContentPage title="Privacy policy" layout="article">
      <p>Effective date: October 17, 2026</p>
      <section aria-label="About this policy">
        <p>
          SpawnKit ("we", "us") operates the SpawnKit service. This policy explains how we handle personal information
          when you visit spawnkit.cloud, use a SpawnKit developer account or CLI, or use our hosting services. Contact
          us at <PrivacyContact /> about privacy or your information.
        </p>
      </section>
      <section>
        <h2>Information we collect</h2>
        <p>
          <strong>Optional kit attribution.</strong> If you opt in when downloading a curated kit, we add a random
          download ID to spawnkit-attribution.json. We record the kit and download preparation time in Cloudflare D1 and
          can associate it with the first successful production deployment of a hosted project. Copied folders share the
          same download ID; downloads and deployed projects are counted separately. This does not identify unique people
          or track local development. We do not collect source code or credentials for these analytics. Download records
          and their analytics links expire after 90 days. Normal source uploads follow the hosting retention described
          below and may contain this file. Delete the file before uploading to stop attribution of that upload. Do Not
          Track and Global Privacy Control disable attribution. Contact us to remove existing attribution.
        </p>
        <p>
          <strong>Account information.</strong> We receive information you provide when registering or managing an
          account, such as your email address and name. Our authentication provider, Clerk, processes sign-in
          credentials, linked accounts, sessions and security information on our behalf.
        </p>
        <p>
          <strong>Google and GitHub sign-in.</strong> When you choose a social sign-in provider, we receive your
          provider account identifier, email address and basic profile information, such as your name and profile
          picture, as available. Google sign-in requests only identity, email and basic profile access. It does not
          request access to Gmail messages, Drive files, contacts or calendars. We do not receive your Google or GitHub
          password.
        </p>
        <p>
          <strong>Projects and deployments.</strong> We process project names, configuration, uploaded source files,
          deployment artifacts, deployment history and associated operational records. If you separately install our
          GitHub App, we can read content and pull request information from repositories you select and receive relevant
          repository events. GitHub sign-in alone does not grant this repository access.
        </p>
        <p>
          <strong>Technical information.</strong> Our hosting and authentication services process information such as IP
          addresses, browser and device information, request times, security events and errors to deliver and protect
          the service. Support requests contain the information you choose to send us.
        </p>
        <p>
          <strong>Game views and plays.</strong> When you visit a published game or launch it from SpawnKit, we count
          that activity using a random browser identifier. Repeat activity for the same game within 30 minutes counts
          once. The identifier is renewed after 24 hours of inactivity. We retain aggregate counts and temporarily store
          a game-specific hash for deduplication; those hashes are removed after their counting window expires. IP
          addresses are used transiently for rate limiting, not stored with game activity. This does not track what you
          do inside the game.
        </p>
        <p>
          <strong>Optional project telemetry.</strong> Games that enable SpawnKit telemetry can send events, errors and
          measurements selected by their developers. Records can include release, environment, temporary session
          identifiers and developer-supplied attributes. The SpawnKit logger does not capture events until the
          application grants its consent setting. Developers are responsible for obtaining any required player consent
          and avoiding unnecessary personal information in telemetry.
        </p>
      </section>
      <section>
        <h2>How we use information</h2>
        <p>
          We use information to create and authenticate accounts, maintain sessions, manage projects, provide hosting
          and requested integrations, diagnose problems, respond to support requests, prevent abuse and meet legal
          obligations. We use Google account information to provide sign-in, maintain your linked account and protect
          account security.
        </p>
        <p>
          We do not sell personal information or use it for targeted advertising. We do not use information received
          from Google to train general-purpose AI models. Our use and transfer of information received from Google APIs
          follows the{" "}
          <a
            className="underline underline-offset-4"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          , including applicable Limited Use requirements.
        </p>
      </section>
      <section>
        <h2>Who receives information</h2>
        <p>
          We use service providers to operate SpawnKit. These include Clerk for authentication and account management,
          and Cloudflare for hosting, network delivery, storage and security. Google or GitHub processes sign-in
          requests when you choose that provider; GitHub also processes repository integration requests when you connect
          repositories. These providers also have their own privacy notices governing their services.
        </p>
        <p>
          We may disclose information when you direct us to do so, when necessary to comply with law, or to investigate
          abuse and protect people and the service. Access by people operating SpawnKit is limited to legitimate
          operational needs.
        </p>
        <p>
          Files served by a public game deployment can be accessed by its visitors. Avoid including credentials or
          private information in public game assets. A game's developer determines what its game collects and which
          additional services it uses. Consult that developer's privacy notice for those practices; hosting a game on a
          SpawnKit subdomain does not make its developer's data practices the same as ours.
        </p>
      </section>
      <section>
        <h2>Cookies and local storage</h2>
        <p>
          We use cookies and similar storage for authentication, security and remembering interface preferences. Your
          browser also stores the anonymous identifier used to avoid duplicate game counts and local interface drafts.
          You can clear browser storage or restrict cookies in your browser settings, although doing so may sign you out
          or prevent features from working. Clearing browser storage does not delete information already stored by
          SpawnKit or its providers.
        </p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          We retain account and project information while needed to provide the service, maintain requested deployment
          history, resolve disputes, protect security or meet legal obligations. Signing out, removing a social-provider
          connection or uninstalling the GitHub App does not by itself delete your SpawnKit account or existing project
          data.
        </p>
        <p>
          SpawnKit project telemetry has a seven-day retention window. Expired records are excluded from queries and
          removed by scheduled cleanup. This window applies to project telemetry, not to account records, deployment
          history or our providers' security logs.
        </p>
        <p>
          Contact <PrivacyContact /> to request account or personal-information deletion. We may ask for information to
          verify that the request is yours. We will explain any information that must be retained and the reason.
          Removal from backups and provider systems follows their applicable retention and deletion processes.
        </p>
      </section>
      <section>
        <h2>Your choices and rights</h2>
        <p>
          You can manage available account settings and revoke SpawnKit's access through your Google or GitHub account
          settings. Revocation prevents future access through that authorization; it does not automatically erase
          information already received. You can contact us to request access, correction or deletion of your personal
          information. Depending on where you live, you may also have rights to a copy of your data, to restrict or
          object to processing, to withdraw consent, or to complain to a privacy regulator.
        </p>
        <p>
          For information collected by an independently operated game, contact its developer. We can help identify the
          relevant developer when reasonably possible.
        </p>
      </section>
      <section>
        <h2>Security and international processing</h2>
        <p>
          We use HTTPS and access controls to protect information. No service can guarantee absolute security. Our
          providers operate internationally, so your information may be processed outside the country where you live.
          Applicable transfer requirements and safeguards depend on the service, location and governing law.
        </p>
      </section>
      <section>
        <h2>Children</h2>
        <p>
          SpawnKit developer accounts are not intended for children under 13, or a higher minimum age where required by
          law. If you believe a child has provided personal information contrary to this policy, contact us so we can
          investigate and take appropriate action. Developers of games hosted on SpawnKit are responsible for their
          games' audience settings, notices and applicable consent requirements.
        </p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>
          We will update this policy when our practices change and revise its effective date. We will provide additional
          notice or request consent where required. Privacy questions and requests can be sent to <PrivacyContact />.
        </p>
      </section>
    </ContentPage>
  )
}
