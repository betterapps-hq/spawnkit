# CLI platform handoff

Status: CLI and backend integration implemented. `/api/platform/v1` and `spawn-source-v1` are the current contracts. The dashboard proxies same-origin requests to the control Worker, which verifies credentials and enforces project access. The public package is `@spawnkit/cli`; see the [release and remote-agent verification](../../specs/seo/cli-release-and-remote-agents.md).

## Authentication

Reuse `~/.spawn/credentials.json` from Clerk PKCE login. Windows storage is current-user DPAPI; Unix is mode 0600. The stored `accessToken` is an OAuth access token, NOT a Clerk browser session token. Requests go only to the stored website origin, under `/api/platform/v1`, with `Authorization: Bearer …`; redirects are rejected. No arbitrary API origin flag. Current scope is `openid`; the control API must verify OAuth token issuer, expiry, authorized client/application and user subject using Clerk's supported OAuth verifier/introspection, then enforce project membership and operation permissions server-side. Do not accept unverified JWT payloads or treat openid as deployment authorization. Expired credentials require logout/login (refresh deferred).

## Proposed API

All responses JSON; errors use HTTP status with `{error:{code,message}}` (redacted). IDs use `[A-Za-z0-9_-]`, maximum 128 characters. Environment enum: `sandbox | production`.

* `GET /projects/:projectId` → `{id,name,environments:{production:{enabled:true,currentReleaseId:string|null},sandbox:{enabled:boolean,currentReleaseId:string|null}}}`.
* `POST /projects/:projectId/uploads` body `{format:"spawn-source-v1",sha256,sizeBytes}` → `{id}`. Authenticated, short-lived, project-scoped upload; no cross-origin signed URL is required for this first contract.
* `PUT /projects/:projectId/uploads/:uploadId` body gzip bytes, content type `application/gzip`, `X-Content-SHA256` digest. Response `{id,sha256,sizeBytes}`. Server independently validates compressed size, digest, decompression limits, archive paths, duplicates and prohibited files before accepting.
* `POST /projects/:projectId/deployments` body `{uploadId,environment,expectedReleaseId}` → deployment record below. Build occurs ONLY on the platform.
* `GET /projects/:projectId/releases` → `{releases:[{id,buildId,status,environment,createdAt,url?}],nextCursor?:string}`; optional `?cursor=`.
* `GET /projects/:projectId/deployments/:deploymentId` → `{id,status,environment,releaseId?:string,url?:string}`.
* `GET /projects/:projectId/deployments/:deploymentId/logs?cursor=` → `{entries:[{sequence:number,message:string}],nextCursor?:string}`. One page per CLI invocation; no false streaming claim.
* `POST /projects/:projectId/promotions` body `{releaseId,environment:"production",expectedReleaseId}` → deployment record. Validate successful Sandbox source and reuse exact build/artifact digests; NEVER rebuild.
* `POST /projects/:projectId/rollbacks` body `{releaseId,environment,expectedReleaseId}` → deployment record. Validate retained compatible version/artifacts. No migration reversal.

Mutating JSON requests carry `Idempotency-Key`. CLI supports `--request-id` for explicit retry identity; defaults to a UUID and prints it in results. Expected predecessor is read before confirmation; conflict (409) must not overwrite a newer activation. Enforce locks, membership, health checks and compensation in the API.

## Source format and limits

`spawn-source-v1`: gzip of UTF-8 JSON `{version:1,files:[{path:string,content:string}]}`, content is canonical base64, paths are relative POSIX. Sorted paths. Maximum 2000 files, 20 MiB total source bytes and 20 MiB compressed payload. No symlinks, hard links, absolute paths, traversal, backslashes, Windows ADS/device paths or duplicate/case-colliding paths. Mandatory exclusions: env files (including examples), credential/key files, VCS, `.spawn`, dependencies, caches, logs and build outputs (including manifest-declared output). `.spawnignore` supports additive glob exclusions; negation is rejected so it cannot override mandatory exclusions. No scripts/builds run locally. Required files: `game.config.json`, `package.json`, `pnpm-lock.yaml`. A conservative secret-content scan rejects common private-key/token signatures; custom secrets must still be kept outside source.

## Commands and UI

`deploy`, `releases`, `status <deployment-id>`, `logs <deployment-id>`, `promote <release-id>`, `rollback <release-id>`. Infer nearest game root upward; `--directory` and `--project` override. Deploy defaults to enabled Sandbox, otherwise production. Rollback requires explicit `--env`. Mutation preview displays target/current release; terminal asks confirmation, automation requires `--yes`. `--dry-run` prepares/validates without mutation. `--json` is a single structured result, never prompts, requires `--yes` for mutation. Accepted/queued is not reported as deployed.

## Integration questions

Endpoint/source format accepted by backend owner. Upload auth may later move to signed object-storage URLs; current CLI intentionally sends bearer tokens only to the logged-in origin. Need final OAuth client binding/deployment scope policy, resource quotas, artifact retention and public environment URL contract. Multiplayer/billing deferred. Project creation/picker API remains separate work.

## Exact response shapes

CLI review follow-up: added authenticated `spawn link --project <id>` using the existing `GET /projects/:id` contract, plus local-only `spawn unlink`. All local project commands now infer the nearest ancestor game root. Failed/cancelled deployment status returns exit code 1; environment validation occurs before API calls. See `cli-judge-review.md` for findings and validation (69 CLI tests passing). The interactive New/Existing/Skip flow still needs list/create endpoints.

These are the CLI's local types in `packages/cli/src/platform-api.ts` (no shared package was edited):

```ts
type Environment = "sandbox" | "production"
type Project = {
  id: string
  name: string
  environments: Record<Environment, {
    enabled: boolean
    currentReleaseId: string | null
  }>
}
type Deployment = {
  id: string
  status: string
  environment: Environment
  releaseId?: string
  url?: string
}
type Release = {
  id: string
  buildId: string
  status: string
  environment: Environment
  createdAt: string
  url?: string
}
type UploadCreated = { id: string }
type UploadAccepted = { id: string; sha256: string; sizeBytes: number }
type ReleasePage = { releases: Release[]; nextCursor?: string }
type LogPage = {
  entries: { sequence: number; message: string }[]
  nextCursor?: string
}
```

Always include both environment objects, including disabled Sandbox; absent current release must be explicit `null`. Production must be enabled. The CLI checks returned project ID and activation environment against its request. Status is intentionally extensible (e.g. `queued`, `building`, `succeeded`, `failed`); it is displayed verbatim, not collapsed into a success state. Omit absent optional strings rather than returning null. `createdAt` is an ISO timestamp. Cursors are opaque strings and encoded by the client; omit them at end of pagination. Log messages must be secret-redacted server-side; the CLI removes terminal escape/control sequences for display.

Return JSON for every successful endpoint, including PUT upload (not 204). `UploadAccepted.sha256` is the lowercase hexadecimal SHA-256 of the exact compressed request bytes, and `sizeBytes` is their byte length, not the decompressed size. Upload uses `Content-Type: application/gzip` and `X-Content-SHA256`; it does NOT send `Content-Encoding: gzip` (proxy must not transparently decompress the body before digest verification). Any acknowledgement mismatch stops deployment submission.

All mutations carry the predecessor captured before confirmation as `expectedReleaseId`, including null on an empty environment. The service is responsible for conditional activation, not merely checking the predecessor once at submission time. Retry idempotency must bind method/project/actor/request body and return the original durable operation when appropriate. API errors are mapped to safe CLI messages by status; the CLI currently does not echo the server error body. Network/response failures during mutation include `--request-id` for reconciliation. No automatic retry is performed.

## Checks and completion

Implemented `platform-api.ts` (injectable HTTP transport), `platform.ts` (commands/plans/confirmation), `source.ts` (bounded source packaging and upward game-root lookup), credential decryption/expiry validation in `auth.ts`, and CLI/Clack routing. No root configuration, dependency/lockfile, dashboard, shared-contract or backend changes were needed.

Validation: 66 CLI tests passed across seven files; CLI TypeScript, Oxlint and bundled build pass. Tests cover actual client request paths/headers/body/digests, source content exclusions, custom output directories, unsafe archive paths/hard links, source byte limit, required lockfile, no local build execution, Sandbox/default/alias behavior, cancellation, JSON, expected predecessor, immutable promotion/rollback, HTTP auth/conflict errors, and Windows DPAPI credential round trip. Coverage run passed the CLI's existing configuration (no new 90% threshold introduced for SpawnKit itself). `pnpm verify` stops at formatting in the pre-existing `verdun` generated folder (13 files). No dashboard change means no new browser acceptance surface for this slice; no live provider operations performed.

Console previews for promotion, rollback, releases, status and logs were exercised with the injected fixture API and explicitly labeled fixture data. `pnpm cli deploy --help` also verified the installed source entry point. Queued/building results remain queued/building, never fabricated success.

Implementation details to preserve during integration:

* Upload request idempotency key is `<requestId>-upload` for request IDs up to 121 characters. For longer IDs it is `upload-<SHA256(requestId)>` (lowercase hexadecimal), keeping every upload key within the backend's 128-character limit. Activation uses the original `<requestId>`. Reusing a request ID with unchanged source preserves both keys and request bodies. Mutation errors include the retry identity, including JSON-mode error messages, even when the API response is lost.
* Source tree traversal is additionally limited to 10000 entries. Expanded JSON/base64 size can exceed 20 MiB even though raw source is capped at 20 MiB; server parsing should allow about 32 MiB for the bounded JSON and then enforce decoded file/total limits independently.
* `.spawnignore` is additive glob syntax, not Git ignore syntax. `.gitignore` is not interpreted. Its negate rules cannot accidentally reinclude env files. Current scan is a defense for common credential signatures, not proof that arbitrary source content contains no secret; hosted secrets must use a separate configuration API.
* Current source schema is gzip JSON, NOT tar/zip. Confirm backend support or explicitly negotiate a replacement format before connecting real uploads.
* Listing/log commands return one page and expose continuation cursors. No watch/tail/reconnect support yet. Deployment acceptance returns durable IDs for later status/log commands.
* `spawn link` verifies access and saves the selected project. Interactive linking supports creating a project, selecting an existing project, or skipping.
* Authentication has no refresh token flow. API must accept and verify Clerk OAuth access tokens (not session cookies), enforce allowed OAuth client and project membership, and decide any additional deployment scopes before production.

## Project picker integration (October 14)

`spawn link` and post-login linking now offer New project / Existing project / Skip in interactive terminals. The client calls GET `/projects` returning `{ projects: [{ id, name }] }`, POST `/projects` with `{ id, name, configuration: { sandbox: false } }`, and GET `/projects/:id` to verify access before saving the local association. POST includes `Idempotency-Key` matching the supplied UUID. This matches the current control API's caller-supplied-ID creation behavior. Production-only creation does not enable paid Sandbox resources. JSON automation uses `link --project <id>`.

82 CLI tests pass, including new/existing/skip/cancel/empty account/uncertain creation and post-login behavior. Login accepts `--directory` so the repository development command can link a game elsewhere. Live authenticated project creation and provider deployment remain separate from fixture-based checks; no live resources were created for these tests. Verdun is now absent.

After the backend update, live authenticated project listing succeeds (one existing project). The prior HTTP 500 is resolved. Backend deployment status `superseded` is now reported with exit code 1 alongside failed/cancelled, preserving the structured result; regression tests cover all three. Builds remain gated by Workers Paid according to the backend owner. No existing project was modified or deleted.

## Updated upload and release contract verification

85 CLI tests pass after checking the updated backend contract. HTTP-level deployment tests now repeat a request and assert identical upload keys, source metadata, activation keys, and activation bodies. Boundary tests cover 121- and 128-character request IDs and distinguish different long IDs. Release commands forward cursors, display continuation only when `nextCursor` exists, and omit it from exhausted JSON pages. Successful deployment URLs are preserved in both human-readable and JSON status/promotion output. CLI types, lint, and bundled build pass. No live mutations or builds were initiated for this verification. Repository verification remains blocked by formatting in concurrent telemetry/dashboard work.

## Live staging CLI acceptance — October 14, 2026

Waited for existing Sandbox deployment `496b5ac8-e92f-496d-b662-4a0959f78607` to succeed before submitting another build. Ran the real `runCli` / HTTP client against `https://api.staging.spawnkit.cloud/api/platform/v1`, using the existing OAuth token in memory and overriding only the API object's site. The user's credential file was checked byte-for-byte by SHA-256 before/after each invocation and remained unchanged. No credentials were printed or copied into a fixture. The CLI's standard progress callback was connected to console output in the acceptance harness; this was not a fresh browser login or a separate packaged-binary credential-profile test.

Project: `verify-d269cfde-d6ec-4de8-aae8-c90ccf972c70` (Platform verification). Source: `D:/spawn/work/platform-smoke`, 17 files / 22520 compressed bytes. `deploy --dry-run` selected enabled Sandbox and printed the predecessor without uploading. `deploy --yes --request-id cli-acceptance-20261014-01` uploaded and verified the source, then returned a queued deployment. Status subsequently reported success:

- Deployment: `8fd1fccf-fbd3-4383-b377-6ac8577f51c0`
- Release: `06255d46-f0be-4189-9729-47d0ccb8b792`
- Environment URL: https://staging.platform-verification.staging.spawnkit.cloud
- Immutable deployment URL: https://d-00f759f6.platform-verification.staging.spawnkit.cloud

Log pages showed the isolated Node.js 24 / pnpm 12 build, installation, TypeScript/Vite build, and immutable artifact completion. Cursors 72 and 100 were followed; the last page was empty. Two CLI-only improvements resulted: human-readable status now includes the immutable `deploymentUrl` supplied by the server, and an exhausted log cursor says `No additional logs.` instead of `No logs yet.` JSON retains both URLs. Regression tests cover both behaviors.

Playwright verified both URLs returned HTTP 200 and the expected `platform-smoke` title, rendered a canvas, collected an item using ArrowRight, paused via the button, resumed using Escape, and produced no page errors. Evidence is in ignored `work/cli-staging-browser-results.json` and `work/cli-staging-{environment,immutable}.png`. No production deployment, promotion, rollback, project creation, or backend configuration edit was performed.
Validation after these fixes: all 96 CLI tests, CLI TypeScript, lint, and bundled build pass. Live status displays both URLs, and the final log page displays the corrected message. `pnpm verify` stops at formatting in 21 concurrently edited control-api/dashboard/platform files outside this change; those files were left untouched.
