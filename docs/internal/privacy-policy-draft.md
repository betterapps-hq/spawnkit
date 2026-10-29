# SpawnKit privacy policy source

Approved by the owner and published on 2026-10-14, with SpawnKit as the operator and `hello@spawnkit.cloud` as the contact address. The address is a requested placeholder; a monitored mailbox has not been configured. This source covers the website, developer accounts, CLI, hosting and optional project telemetry. The public implementation is `apps/dashboard/src/components/public/privacy-policy.tsx`, deployed at `/privacy` on production, staging and `preview-latest`. Google's branding configuration now links to the production homepage and privacy policy; Google sign-in remains unpublished.

## Public policy

Effective date: **October 14, 2026**

SpawnKit ("we", "us") operates the SpawnKit service. This policy explains how we handle personal information when you visit spawnkit.cloud, use a SpawnKit developer account or CLI, or use our hosting services. Contact us at **hello@spawnkit.cloud** about privacy or your information.

### Information we collect

**Account information.** We receive information you provide when registering or managing an account, such as your email address and name. Our authentication provider, Clerk, processes sign-in credentials, linked accounts, sessions and security information on our behalf.

**Google and GitHub sign-in.** When you choose a social sign-in provider, we receive your provider account identifier, email address and basic profile information, such as your name and profile picture, as available. Google sign-in requests only identity, email and basic profile access. It does not request access to Gmail messages, Drive files, contacts or calendars. We do not receive your Google or GitHub password.

**Projects and deployments.** We process project names, configuration, uploaded source files, deployment artifacts, deployment history and associated operational records. If you separately install our GitHub App, we can read content and pull request information from repositories you select and receive relevant repository events. GitHub sign-in alone does not grant this repository access.

**Technical information.** Our hosting and authentication services process information such as IP addresses, browser and device information, request times, security events and errors to deliver and protect the service. Support requests contain the information you choose to send us.

**Optional project telemetry.** Games that enable SpawnKit telemetry can send events, errors and measurements selected by their developers. Records can include release, environment, temporary session identifiers and developer-supplied attributes. The SpawnKit logger does not capture events until the application grants its consent setting. Developers are responsible for obtaining any required player consent and avoiding unnecessary personal information in telemetry.

### How we use information

We use information to create and authenticate accounts, maintain sessions, manage projects, provide hosting and requested integrations, diagnose problems, respond to support requests, prevent abuse and meet legal obligations. We use Google account information to provide sign-in, maintain your linked account and protect account security.

We do not sell personal information or use it for targeted advertising. We do not use information received from Google to train general-purpose AI models. Our use and transfer of information received from Google APIs follows the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including applicable Limited Use requirements.

### Who receives information

We use service providers to operate SpawnKit. These include Clerk for authentication and account management, and Cloudflare for hosting, network delivery, storage and security. Google or GitHub processes sign-in requests when you choose that provider; GitHub also processes repository integration requests when you connect repositories. These providers also have their own privacy notices governing their services.

We may disclose information when you direct us to do so, when necessary to comply with law, or to investigate abuse and protect people and the service. Access by people operating SpawnKit is limited to legitimate operational needs.

Files served by a public game deployment can be accessed by its visitors. Avoid including credentials or private information in public game assets. A game's developer determines what its game collects and which additional services it uses. Consult that developer's privacy notice for those practices; hosting a game on a SpawnKit subdomain does not make its developer's data practices the same as ours.

### Cookies and local storage

We use cookies and similar storage for authentication, security and remembering interface preferences. Your browser may also store local interface drafts. You can clear browser storage or restrict cookies in your browser settings, although doing so may sign you out or prevent features from working. Clearing browser storage does not delete information already stored by SpawnKit or its providers.

### Retention and deletion

We retain account and project information while needed to provide the service, maintain requested deployment history, resolve disputes, protect security or meet legal obligations. Signing out, removing a social-provider connection or uninstalling the GitHub App does not by itself delete your SpawnKit account or existing project data.

SpawnKit project telemetry has a seven-day retention window. Expired records are excluded from queries and removed by scheduled cleanup. This window applies to project telemetry, not to account records, deployment history or our providers' security logs.

Contact hello@spawnkit.cloud to request account or personal-information deletion. We may ask for information to verify that the request is yours. We will explain any information that must be retained and the reason. Removal from backups and provider systems follows their applicable retention and deletion processes.

### Your choices and rights

You can manage available account settings and revoke SpawnKit's access through your Google or GitHub account settings. Revocation prevents future access through that authorization; it does not automatically erase information already received. You can contact us to request access, correction or deletion of your personal information. Depending on where you live, you may also have rights to a copy of your data, to restrict or object to processing, to withdraw consent, or to complain to a privacy regulator.

For information collected by an independently operated game, contact its developer. We can help identify the relevant developer when reasonably possible.

### Security and international processing

We use HTTPS and access controls to protect information. No service can guarantee absolute security. Our providers operate internationally, so your information may be processed outside the country where you live. Applicable transfer requirements and safeguards depend on the service, location and governing law.

### Children

SpawnKit developer accounts are not intended for children under 13, or a higher minimum age where required by law. If you believe a child has provided personal information contrary to this policy, contact us so we can investigate and take appropriate action. Developers of games hosted on SpawnKit are responsible for their games' audience settings, notices and applicable consent requirements.

### Changes and contact

We will update this policy when our practices change and revise its effective date. We will provide additional notice or request consent where required. Privacy questions and requests can be sent to hello@spawnkit.cloud.

## Operational notes

These notes are internal and are not part of the public policy. Approval of the text does not establish that the operational work below is complete.

- The owner supplied SpawnKit as the operator name. No business address or operating jurisdiction was supplied; none has been invented.
- Configure and monitor the branded contact mailbox before enabling Google production sign-in. Google requires an eligible verified support email; its existing personal support/admin address has not been replaced with an unverified placeholder. The public policy and contact page use `hello@spawnkit.cloud` as requested.
- The owner approved the policy's minimum age and commitments on no sale, targeted advertising or general-purpose AI training. Changes to those practices require a policy review. Assess any first-party game or discovery experience aimed at children separately.
- Establish the account/project deletion procedure, retention limits for deployment history, support records and security logs, and Clerk/Cloudflare backup deletion handling. The implementation has seven-day project telemetry retention; it does not yet establish a comprehensive account/project erasure workflow. Do not promise a fixed deletion deadline until it is supported operationally.
- Confirm actual processing locations, provider contracts, international-transfer arrangements and the countries served before adding jurisdiction-specific legal bases, notices or representatives. This policy is not a determination of compliance with a particular privacy law.
- Review any additional processors or tracking added outside this repository. Optional customer-configured Sentry integrations and customer games need their own accurate notices; no blanket statement that every game is free of tracking is made.
- Google's production OAuth policy also requires a homepage link to terms of service. The owner approved the [terms](terms-of-service-draft.md), now published at `/terms` and linked from Google's branding configuration. Google sign-in still awaits the branded support identity the owner will provide.

## Evidence used for this policy

- `docs/telemetry-design.md`, `packages/telemetry/src/protocol.ts`, `packages/telemetry/src/index.ts` and `apps/telemetry/src/index.ts`: consent gating, record contents, transient IP rate limiting and seven-day telemetry retention.
- `apps/control-api/src/github.ts`, `apps/control-api/src/maintenance.ts` and `docs/internal/platform-operations.md`: repository permissions, credentials, source processing and limited cleanup currently implemented.
- Production Clerk and provider configuration: Google identity/email/profile scopes, GitHub profile/email scopes, separate read-only repository App, and separate staging/production accounts.
- [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies), [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) and [Google verification requirements](https://support.google.com/cloud/answer/13464321?hl=en): accurate disclosures, Google data handling, public policy/homepage links and production branding requirements.
