import { scopeDates } from "./model"
import type { AnalyticsIssue, AnalyticsScope, AnalyticsSession } from "./model"

export interface InvestigationRequest {
  issue: AnalyticsIssue
  sessions: AnalyticsSession[]
  scope: AnalyticsScope
  context: string
}
export type InvestigationEvidence = { id: string; title: string; detail: string } & (
  | { source: "code"; location: string }
  | { source: "sessions"; sessionIds: string[] }
  | { source: "trace"; sessionId: string; operation: NonNullable<AnalyticsIssue["operation"]> }
)
export interface InvestigationResult {
  title: string
  cause: string
  uncertainty: string
  evidence: InvestigationEvidence[]
  solution: string
  patch?: string
  checks: string[]
}
export type Investigator = (
  request: InvestigationRequest,
  options: {
    signal: AbortSignal
    onProgress: (step: number) => void
  }
) => Promise<InvestigationResult>

export function investigationBrief(request: InvestigationRequest, result: InvestigationResult) {
  return [
    `${request.issue.id}: ${request.issue.title}`,
    `Scope: ${request.scope.environment}, ${request.scope.release}, ${scopeDates(request.scope)}`,
    request.context ? `Developer context: ${request.context}` : "",
    `Hypothesis: ${result.title}\n${result.cause}\nUncertainty: ${result.uncertainty}`,
    "Evidence:",
    ...result.evidence.map((evidence) => `- [${evidence.id}] ${evidence.title}: ${evidence.detail}`),
    `Proposed solution: ${result.solution}`,
    result.patch ?? "",
    "Verify:",
    ...result.checks.map((check) => `- [ ] ${check}`)
  ]
    .filter(Boolean)
    .join("\n\n")
}
