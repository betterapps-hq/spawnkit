import { ArrowRight, Box, Check, Code2, ExternalLink, GitBranch, Globe2, PackageCheck, RotateCcw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const steps = [
  {
    id: "build",
    name: "Build",
    icon: Code2,
    title: "Your source. One inspectable release.",
    text: "Upload supported source for an isolated build. Keep the output tied to the source that produced it, with build logs available when the process finishes.",
    detail: "SOURCE → ISOLATED BUILD → ARTIFACT",
    status: "Build complete"
  },
  {
    id: "check",
    name: "Check",
    icon: PackageCheck,
    title: "Open the exact game you built.",
    text: "Every retained release has its own URL. Play through the change and check the result before moving an environment to that version.",
    detail: "ONE VERSION · ITS OWN URL",
    status: "Ready to inspect"
  },
  {
    id: "release",
    name: "Release",
    icon: Globe2,
    title: "Same build. New destination.",
    text: "Promote a tested artifact into the intended environment. The optional Sandbox keeps staging separate from the game your players open.",
    detail: "PROMOTE THE ARTIFACT · NO REBUILD",
    status: "Production release"
  },
  {
    id: "improve",
    name: "Improve",
    icon: RotateCcw,
    title: "Know what changed. Choose what comes next.",
    text: "Use release history and configured telemetry to investigate problems. Return to a previous artifact when you need to; rollback does not undo database changes or player data.",
    detail: "RELEASE HISTORY · LOGS · ROLLBACK",
    status: "Release history"
  }
]

export function ReleaseWalkthrough() {
  return (
    <Tabs defaultValue="build" className="mk-release-walkthrough">
      <TabsList className="mk-release-tabs" aria-label="Release walkthrough">
        {steps.map(({ id, name, icon: Icon }, index) => (
          <TabsTrigger key={id} value={id}>
            <span>0{index + 1}</span>
            <Icon size={18} />
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
      {steps.map(({ id, title, text, detail, status, icon: Icon }) => (
        <TabsContent value={id} key={id} className="mk-release-panel">
          <div className="mk-release-copy">
            <span className="mk-feature-label">
              <Icon size={17} /> {status}
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="mk-release-detail">{detail}</span>
          </div>
          <div className="mk-release-visual" aria-label={`Example ${id} stage for release v1.2`}>
            <div className="mk-release-art">
              <img src="/examples/snake.webp" alt="Orchard Trail game artwork" loading="lazy" />
              <span>
                <Box size={15} /> Orchard Trail <b>v1.2</b>
              </span>
            </div>
            {id === "build" && (
              <div className="mk-release-log">
                <p>
                  <Check size={14} /> Source received
                </p>
                <p>
                  <Check size={14} /> Build completed
                </p>
                <p>
                  <Check size={14} /> Artifact saved <code>v1.2</code>
                </p>
              </div>
            )}
            {id === "check" && (
              <div className="mk-release-destinations">
                <span>
                  <ExternalLink size={17} />
                  <b>Release URL</b>
                  <small>Always opens v1.2</small>
                </span>
                <span>
                  <Globe2 size={17} />
                  <b>Production URL</b>
                  <small>Still opens v1.1</small>
                </span>
              </div>
            )}
            {id === "release" && (
              <div className="mk-release-destinations">
                <span>
                  <GitBranch size={17} />
                  <b>Sandbox</b>
                  <small>v1.2 · tested</small>
                </span>
                <ArrowRight className="mk-promote-arrow" size={20} />
                <span>
                  <Globe2 size={17} />
                  <b>Production</b>
                  <small>v1.2 · same artifact</small>
                </span>
              </div>
            )}
            {id === "improve" && (
              <div className="mk-release-log">
                <p>
                  <Check size={14} /> v1.2 <span>Current release</span>
                </p>
                <p>
                  <RotateCcw size={14} /> v1.1 <span>Retained artifact</span>
                </p>
                <p>
                  <Box size={14} /> v1.0 <span>Retained artifact</span>
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
