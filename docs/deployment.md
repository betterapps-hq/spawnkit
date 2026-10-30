# Deployment process

## Purpose and scope

Deploy locally authored games through hosted source builds to sandbox/staging and production. Support promotion, rollback, and GitHub Actions. The CLI, dashboard, and CI use the same coordinator and deployment records.

Agreed: source builds run on the platform; production and one optional Sandbox are supported at launch. A project can configure multiple regions within either environment. Proposed: production promotion reuses immutable successful sandbox artifacts. Direct production source builds are supported for GitHub Actions and CLI, subject to the eventual production permission policy.

## Core records

| Record | Contents |
| --- | --- |
| Source snapshot | Archive digest, manifest, dependency lockfile, optional Git revision, upload actor |
| Build | Source digest, pinned toolchain, commands, logs, checks, artifact digests, result |
| Deployment attempt | Game/environment, build ID, resource plan, completed steps, error, idempotency key |
| Release | Build/artifacts, configuration version, migration ledger, provider references, activation time |
| Environment | Desired release, current release, secrets references, URLs, resources, runtime tier |

A build can back releases in both environments. A failed deployment does not invalidate a successful build. Logs and credentials are never stored inside public artifact manifests.

## 1. Prepare and plan

1. Authenticate the developer; select the game and target environment explicitly in noninteractive use.
2. Read the project manifest and inspect imports without executing customer code in the control plane.
3. Resolve renderer/runtime, source roots, build commands, output paths, resources, and service modules.
4. Report unsupported capabilities and ambiguous inference. An explicit manifest overrides inference.
5. Return a resource and cost plan; distinguish rate estimates from exact future charges.
6. Check permissions, account standing, resource quotas, and entitlement for paid sandbox/compute.

The implemented CLI includes `login`, `create`, `plan`, `deploy`, `promote`, `rollback`, `status`, and `logs`. Import remains proposed.

`spawn deploy` waits for the deployment to finish by default, displaying build output as it arrives and then the game, immutable deployment and project dashboard URLs. `--no-wait` returns after acceptance. `spawn logs <deployment-id> --project <project-id> --follow` resumes watching an existing deployment without submitting it again. Logs use sequence cursors, so reconnecting does not repeat lines. `--json` keeps stdout to one final result object and sends live output to stderr. Failed deployments exit nonzero. Ctrl+C stops local watching with exit 130; the remote build continues. Watching stops after 30 minutes with commands to resume or check status.

The platform streams stdout/stderr from the isolated build into durable logs before the command exits. The CLI checks every three seconds; the focused project dashboard refreshes every five seconds while work is active. Its build-output panel follows new lines, allows pausing or scrolling back, and can copy the output. Media processing warnings are saved with the release and appear in the final CLI result, version details and current production overview. Invalid optional media does not prevent the game from deploying. Creator-facing results contain no submission or approval status.

## 2. Upload source

- Package source with a mandatory denylist for `.env` files, credentials, VCS internals, dependencies, and local outputs, plus user-configurable ignore rules.
- Allow explicit nonsecret configuration files needed by builds. Store build secrets through a separate secret mechanism.
- Reject traversal paths, unsafe archive links, oversized archives, and invalid digests.
- Upload through a short-lived game-scoped authorization; validate digest and size before accepting the snapshot.
- Record a source revision when present, but use the archive digest as the authoritative content identity.
- Return a durable deployment ID that supports status polling and log streaming after CLI disconnection.

## 3. Isolated build

1. Schedule a fresh job with pinned Node.js/toolchain versions.
2. Extract source, install with its supported lockfile in frozen mode, and run configured checks/build commands.
3. Produce frontend assets and, when required, an OCI Colyseus image.
4. Validate declared output paths, frontend size, image identity, and runtime entrypoint.
5. Persist artifacts by digest, record results, and destroy job-local files and credentials.

Customer scripts execute only in build isolation. Jobs have CPU, memory, disk, duration, process, and egress limits. Platform provider tokens and node-control credentials are unavailable. Any cache must resist cross-game data leakage and cannot allow mutable entries to replace recorded release artifacts.

Build check policy is open: generated templates should provide type checking, linting, unit tests, and build scripts; decide which are mandatory publication gates and when Playwright runs. Unsupported imported projects fail with concrete remediation.

## 4. Stage resources and verify

- Acquire a per-environment release lock and recheck the intended predecessor release.
- Reconcile D1/R2/Neon/container requirements using ownership tags and an operation ledger. Retries must not duplicate resources.
- Apply reviewed migrations once with recorded checksums; production migrations must be compatible with code serving during overlap.
- Stage frontend artifacts and a backend candidate with scoped environment secrets.
- Verify frontend reachability, server readiness, and an appropriate disposable Colyseus room join/state exchange.
- Never release a failed candidate. Clean up newly created transient resources; preserve persistent game data.

Cloudflare automation uses `cf` unless an existing project has a Wrangler configuration. Any Void adapter is experimental until source/license, credentials, artifacts, logs, environments, and recovery semantics are verified.

## 5. Activate and drain

Proposed: expose a single release descriptor so the frontend discovers backend endpoints and public configuration for its compatible release. Avoid baking environment URLs into frontend bundles.

Activation is coordinated across providers, not a globally atomic provider transaction. Record each cutover and compensate on failure. Existing clients may retain old cached assets; old releases must either retain compatible room access or receive an explicit reload/reconnect response.

For multiplayer:

1. Start accepting new rooms on the new release.
2. Keep established rooms reachable at their original release endpoint.
3. Disable new room creation on the draining release.
4. Stop it when empty or when the agreed deadline/forced-shutdown policy applies.

Do not promise live room migration. A reconnect must return to the room-owning process while that process exists. Capacity reservation and charges during overlap are open decisions.

## Promotion

Input: successful sandbox build ID and expected production release ID.

- Reuse frontend and image digests; do not rebuild source.
- Supply production configuration, secrets, and resource bindings.
- Plan/apply production migrations and run production readiness checks.
- Activate using the same release/drain process.
- Never copy sandbox accounts, saves, database contents, or secrets automatically.
- Explain any configuration incompatible with artifact reuse before activation.

## Rollback

Input: target environment, retained prior version ID, expected current destination version ID. A prior version may originate in production, Sandbox, or a PR preview; it does not need to have previously served production. Version identity and activation-attempt identity are separate.

- Validate artifact availability and current-schema compatibility.
- Stage prior artifacts with the recorded compatible configuration, resolving valid secret references.
- Verify, activate, and drain using the standard release path.
- Record rollback as a new audited release operation referencing its source release.
- Never reverse migrations or delete data automatically. If schema compatibility cannot be established, block with an actionable reason.
- Rollback does not restore lost in-memory rooms or override current billing/suspension policy.

## GitHub Actions

The [project dashboard design](project-dashboard-storybook.md) also models optional isolated environments for open PRs: new commits build versions, successful builds advance the preview pointer, and closure/merge schedules cleanup independently of artifact retention. Ready preview versions can move unchanged into the persistent Sandbox. Preview pricing, quotas, trust policy, retention, and provisioning remain unresolved implementation work.

Generate workflows that upload source and request hosted builds. GitHub runners do not perform the authoritative production build.

Proposed workflow mappings:

- An explicitly configured branch/manual trigger builds and releases sandbox.
- A manual production workflow promotes a sandbox build by ID.
- A production branch/tag/manual workflow can request a direct production build when permitted.

Use short-lived OIDC credentials bound to the trusted repository, workflow/ref, game, environment, and requested operation. Fork pull requests receive no deployment privileges by default. Configure concurrency per game/environment, scoped permissions, optional GitHub environment approvals, and a timeout with a durable status link. Retrying a workflow reuses its operation identity where appropriate.

## Proposed states and recovery

```text
awaiting_upload -> queued -> building -> validating -> provisioning
 -> migrating -> staging -> checking -> activating -> draining -> succeeded
```

Attempts may fail or be cancelled. Cancellation after activation is a compensating operation, not merely stopping a job. Persist step outcomes; recover stalled jobs through leases/heartbeats; distinguish retryable provider failures from permanent validation failures. Redact secrets from logs and errors.

## Acceptance criteria

- A source upload produces a reproducible artifact record and sandbox URL.
- Promotion uses exactly the recorded sandbox artifact digests with production resources.
- CLI, dashboard, and GitHub Actions show the same deployment result.
- A failed candidate leaves the prior release serving; a cutover failure records compensation.
- Retried operations do not duplicate databases, containers, or billed intervals.
- Rollback restores retained compatible code without reversing data migrations.
- Two players can remain in an old room during a deployment while new rooms use the new release.
- An uploaded `.env` or traversal archive is rejected/excluded without exposing its contents.
