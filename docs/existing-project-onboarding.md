# Existing-project onboarding

Status: proposed CLI contract, grounded in the current implementation on 17 October 2026. The commands below describe the proposed experience; `spawn connect` and prebuilt deployment are not implemented yet.

## Goal

A developer should be able to connect an existing game without generating a new game, switching engine, adopting our development tools or replacing their CI. Platform capabilities are optional and can be added later. New-game scaffolding remains a separate use of the CLI.

## Current gaps

- `spawn link` calls `findGameRoot`, which requires `game.config.json`. It links an existing SpawnKit-shaped project; it does not adopt an arbitrary repository.
- `spawn add` requires `.spawn/state.json`, the generated-file ownership record. Handwritten games and other starters cannot use it; upload their static build instead.
- Hosted source deployment requires `game.config.json`, `package.json` and `pnpm-lock.yaml`. The runner installs with pnpm and executes the build script. This excludes many existing toolchains and prebuilt browser exports.
- The backend supports GitHub connections and pull-request preview jobs, but the CLI platform client has no guided GitHub-connection or preview-configuration commands.
- `spawnkit.config.ts` currently describes listing data and exports it through a Vite plugin. It is not a general integration configuration, and its strict validator rejects unrelated keys.
- Discovery currently depends on an approved release hosted by SpawnKit. External-host catalog registration does not exist.

## Proposed entry point

```text
spawn connect

Detected: Vite, pnpm, dist/
What would you like to use?
  [ ] Game hosting
  [ ] GitHub deployments
  [ ] Pull request previews
  [ ] SpawnKit game catalog
  [ ] Telemetry
```

Detection reads manifests, lockfiles, repository metadata and known build output markers. It must never execute project scripts or evaluate TypeScript configuration merely to inspect the project. Display uncertain values as choices, rather than guessing silently. In a monorepo, ask which application and workspace root to use; don't accidentally archive every project.

The same shared integration catalog should drive CLI choices and dashboard onboarding. Keep engine and tooling add-ons in the template-composition contract; platform integrations have independent capabilities, dependencies, costs and permissions. Put the shared catalog in `@spawn/templates` and expose a versioned integration contract, rather than maintaining separate CLI and dashboard lists.

| Selection | Result | Dependency |
| --- | --- | --- |
| Hosting | Publish a static browser build and receive a `.spawnkit.games` URL | Built output, either locally/externally or by a hosted build |
| GitHub deployments | Build selected branch changes after repository authorization | A supported source-build adapter and hosting |
| PR previews | Create isolated preview URLs and remove them when PRs close | A configured repository, preview deployment policy and hosting; production auto-deploy is optional |
| Game catalog | Provide title, description, genre, dimension and managed cover/trailer | A verified, playable release; external hosting is a separate policy decision |
| Telemetry | Configure a scoped write key and approved game origins | No requirement to move hosting or use a template |

Selecting a dependency displays why it is needed; never silently enroll the developer in unrelated services. A CI-only customer may disable catalog participation. Defining that opt-in must preserve automatic review of releases that do participate, with no creator approval-status UI.

## Guided sequence

1. Inspect the current directory and detect the game root, package manager, build command/output, engine when identifiable, existing config and repository remote.
2. Select platform capabilities. If a project is linked, show its existing selections and offer additions rather than starting over.
3. Ask only unresolved questions. A prebuilt Unity/Godot web export needs an output directory, not a fictitious JavaScript package manager.
4. Show a concrete plan: files added, small edits, account project, GitHub permissions, production branch, preview policy and any paid capabilities. Support `--dry-run` and structured JSON without login or writes for local inspection.
5. Authenticate only when provisioning needs it. Reuse the existing login and project link. Install/authorize the GitHub App through its existing browser flow; never ask developers to paste a personal access token.
6. Apply approved file changes exclusively. Preserve existing scripts, lockfiles, engine code, CI workflows and typed configuration. Report conflicts with exact paths; no `--yes` overwrite escape hatch. Re-running the same plan is a no-op.
7. Validate the chosen path and offer the first deployment. Stream build logs. Show the game URL, project dashboard URL and preview URLs when available.

Proposed automation equivalents:

```text
spawn connect --add hosting,github,previews --dry-run --json
spawn connect --add hosting --output dist --yes
spawn connect --add telemetry --yes
spawn deploy --prebuilt ./web-export
```

Configuration should be typed and versioned. Keep integration settings distinct from game listing metadata. Do not expand the existing strict listing validator casually. Commit integration settings; keep account tokens and temporary upload state outside committed config. Preserve `--directory` for scripts and monorepos.

## Support existing CI

Provide a prebuilt artifact admission path. Existing GitHub Actions, GitLab, other CI or an engine export can upload browser assets without sending source or using SpawnKit's build environment. Validate archive paths, count, bytes and HTML entrypoint independently. Run cover/trailer processing in the same trusted platform pipeline; do not trust submitter-provided derivatives. Hosting, isolation, content security, quotas and automatic moderation still apply.

CI should use short-lived, project/environment-scoped credentials. Browser login tokens are not an unattended CI design. Prefer an OIDC exchange with repository/ref/environment claims and a one-time browser authorization; implement scoped revocable deploy tokens only where OIDC is unavailable. A token for PR previews must not promote or overwrite production. Fork PR code never receives production credentials. Provide teardown for closed PRs and stale environments.

Source-build adapters should initially describe exactly supported package managers and lockfiles. Broader npm/yarn support must reach the validator, archiver, dependency network policy and runner together. Native engine exports use prebuilt deployment until their toolchain is explicitly supported. Don't make security exceptions to install arbitrary engine toolchains during an untrusted build.

## Distribution without moving hosts

This is distinct from deployment and is pending the product choice. If enabled, require domain or project ownership verification, stable HTTPS, compatible framing and platform-managed listing media. Never let the trusted app fetch arbitrary private-network URLs or render game content on its origin. A managed, immutable uploaded copy is the safer first distribution path for externally hosted games; external embeds need an explicit isolation, redirects, availability and update-review policy. Keep those limits visible in developer setup without surfacing moderation decisions.

## Implementation sequence

1. Define the shared integration catalog and a read-only detector/planner for arbitrary existing projects. Exercise npm/pnpm/yarn, monorepos, static exports, missing scripts and conflicting configs.
2. Implement hosting adoption and prebuilt deployment, including safe incremental file writes and server-side artifact validation.
3. Expose the existing GitHub connection and preview setup through the CLI, with production deployment and PR preview toggles separate.
4. Add scoped CI authentication, existing-CI examples and preview teardown acceptance.
5. Add catalog-only adoption according to the hosting policy, plus telemetry-only setup.

Acceptance must start from repositories not generated by SpawnKit. Demonstrate onboarding without changing an engine or package manager, rerunning safely, cancelling with no changes, recovering interrupted linking, unauthorized deployment rejection, an actual same-repository PR preview, and preserving the current production URL when a preview fails.
