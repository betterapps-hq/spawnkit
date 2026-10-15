import { frontendSandboxProject } from "./fixtures"
import type { EnvironmentName, ProjectDomain, ProjectModel } from "./model"

// Illustrative DNS records for Storybook only. Actual records must come from the control API.
export function exampleDomain(
  hostname: string,
  environment: EnvironmentName,
  status: ProjectDomain["status"] = "pending-dns"
): ProjectDomain {
  const verified = status === "active" || status === "issuing"
  return {
    id: `domain-${hostname}`,
    hostname,
    environment,
    primary: false,
    status,
    certificate: status === "active" ? "active" : "pending",
    checked: "just now",
    issue: null,
    records: [
      {
        type: "TXT",
        name: `_spawn-verification.${hostname}`,
        value: "spawn-domain-verification=illustrative-token",
        verified
      },
      { type: "CNAME", name: hostname, value: "routing.example.com", verified }
    ]
  }
}
export const domainProject: ProjectModel = {
  ...frontendSandboxProject,
  domains: [
    { ...exampleDomain("play.clockwork.example.com", "production", "active"), primary: true, checked: "2 minutes ago" },
    exampleDomain("www.clockwork.example.com", "production"),
    exampleDomain("test.clockwork.example.com", "sandbox", "issuing")
  ]
}
