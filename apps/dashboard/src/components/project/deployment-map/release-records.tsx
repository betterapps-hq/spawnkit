import type {
  ReleaseCommit as Commit,
  ReleaseSourceRecord as SourceRecord,
  ReleaseChanges as ReleaseChangesData
} from "@spawn/platform/releases"
import { createContext, useContext, type ReactNode } from "react"
export type { ReleaseCommit as Commit, ReleaseSourceRecord as SourceRecord } from "@spawn/platform/releases"
type ReleaseRecord = {
  version: string
  label?: string
  sha: string
  time: string
  commits: Commit[]
  status?: string
}
export type ReleaseRecords = {
  repository: string | null
  releases: ReleaseRecord[]
  pullRequests: SourceRecord[]
  issues: SourceRecord[]
  compare: (current: string, target: string) => Pick<ReleaseChangesData, "commits" | "direction">
}
const Context = createContext<ReleaseRecords | null>(null)
export function ReleaseDataProvider({ value, children }: { value: ReleaseRecords; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useReleaseRecords() {
  const records = useContext(Context)
  if (!records) throw new Error("Release data is required.")
  return records
}
