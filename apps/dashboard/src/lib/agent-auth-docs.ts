import type { AgentDocument } from "./agent-docs"

export const remoteAuthSections: AgentDocument["sections"] = [
  {
    id: "remote-agents",
    title: "Authorize a remote coding agent",
    blocks: [
      {
        type: "paragraph",
        text: "Use this flow when your agent runs on another computer or in a hosted environment. First, [create an account](/sign-in) and [create a project in the dashboard](/docs/dashboard). Copy its ID from Settings → General. The account owner must approve access in their own browser; the agent must not operate the approval page."
      },
      {
        type: "code",
        label: "Remote terminal · request project access",
        language: "sh",
        code: "pnpm dlx @spawnkit/cli login --remote --email YOU@example.com --project YOUR_PROJECT_ID\npnpm dlx @spawnkit/cli link --project YOUR_PROJECT_ID\npnpm dlx @spawnkit/cli deploy --env production --dry-run --json\npnpm dlx @spawnkit/cli deploy --env production --yes --json"
      },
      {
        type: "paragraph",
        text: "The CLI prints a link and a six-digit code. Open the link, sign in with the verified email used in the request, review the project and permissions, enter the code, and approve. The request expires after ten minutes. Approving grants one hour of access to that project, including its sandbox and production environments. The agent cannot create or delete projects, access another project, change account settings, or manage secrets."
      },
      {
        type: "paragraph",
        text: "Access tokens last up to 15 minutes. The CLI renews them when starting another command while the one-hour grant remains valid. If a long-running command reaches expiry, authorize again and resume with the saved deployment ID; do not submit the same deployment twice. Use [Agent access](/cli/access) or `pnpm dlx @spawnkit/cli logout` to revoke the grant early."
      },
      {
        type: "table",
        columns: ["Problem", "Next step"],
        rows: [
          [
            "Email does not match",
            "Sign in with a verified email on the account that owns the project, or start a new request with the correct email."
          ],
          [
            "Code expired or five attempts failed",
            "Start a fresh remote login request. Each code can approve only its own request."
          ],
          [
            "Operation is forbidden",
            "Check the project ID and granted scope. Remote access cannot list all projects or change account settings."
          ],
          ["Access expired or was revoked", "Start remote login again. Ask the owner to review the new request."],
          [
            "Agent cannot reach the service",
            "Use a runtime with outbound HTTPS access. Keep credentials out of prompts and project files."
          ]
        ]
      }
    ]
  },
  {
    id: "agent-protocol",
    title: "Integrate the user-claimed authorization flow",
    blocks: [
      {
        type: "paragraph",
        text: "SpawnKit supports the WorkOS-authored auth.md `service_auth` flow for existing projects. Read the [protected-resource metadata](https://api.spawnkit.cloud/.well-known/oauth-protected-resource) and [authorization-server metadata](https://api.spawnkit.cloud/.well-known/oauth-authorization-server) for endpoint and scope discovery. Anonymous access and provider identity assertions are not supported. Account creation and consent remain browser operations."
      },
      {
        type: "table",
        columns: ["Scope", "Permission on the approved project"],
        rows: [
          ["`projects:read`", "Read project configuration, release history, deployment status, and build logs."],
          ["`deployments:write`", "Upload source, deploy, promote, and roll back releases. Requires projects:read."]
        ]
      },
      {
        type: "code",
        label: "Register an access request",
        language: "sh",
        code: 'curl https://api.spawnkit.cloud/agent/identity \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"type":"service_auth","login_hint":"YOU@example.com","project_id":"YOUR_PROJECT_ID","scope":"projects:read deployments:write"}\''
      },
      {
        type: "paragraph",
        text: "The response includes `registration_id`, `claim_token`, and a `claim` object with `verification_uri`, `user_code`, `expires_in`, and `interval`. Show the link and code to the owner. Keep claim_token private. Poll the advertised token endpoint using a form-encoded POST with `grant_type=urn:workos:agent-auth:grant-type:claim` and `claim_token`. Wait at least interval seconds between requests. Continue on authorization_pending; add five seconds to the interval on slow_down. Stop on access_denied or expired_token."
      },
      {
        type: "paragraph",
        text: "After approval, the response contains a Bearer access_token, expires_in, scope, identity_assertion, and assertion_expires. Send the access token in the Authorization header to `https://spawnkit.cloud/api/platform/v1`. To renew it within the grant's lifetime, POST `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, `assertion=<identity_assertion>`, and `resource=https://spawnkit.cloud/api/platform/v1` to the token endpoint. No refresh token is issued. Store both credentials securely; never return them in agent conversation output."
      },
      {
        type: "paragraph",
        text: "Revoke an individual access token with a form-encoded POST to `https://api.spawnkit.cloud/oauth2/revoke` containing `token=<access_token>&token_type_hint=access_token`. The identity assertion remains valid. To end the entire grant, use SpawnKit's `token_type_hint=identity_assertion` extension with the identity assertion as token; this invalidates every token and prevents renewal. Revocation returns 200 for unknown or already-revoked credentials. The owner can also revoke grants at [Agent access](/cli/access)."
      },
      {
        type: "paragraph",
        text: "Registration and polling are rate-limited. Respect slow_down and stop repeated attempts on HTTP 429. API authentication failures include a WWW-Authenticate discovery hint. The public [OpenAPI file](/openapi.json) covers kit discovery and downloads; this section documents the remote authorization contract."
      }
    ]
  }
]
