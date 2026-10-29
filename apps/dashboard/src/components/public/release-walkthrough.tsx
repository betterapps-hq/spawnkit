import { Activity, ArrowRight, Code2, GitBranch, ShieldCheck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateIllustration, ChecksIllustration, DeployIllustration, MonitorIllustration } from "./cloud-illustrations"

const steps = [
  {
    id: "create",
    name: "Create",
    icon: Code2,
    visual: CreateIllustration,
    title: "Give your idea a working foundation.",
    text: "Choose a game engine and get a standalone TypeScript project with playable code. The CLI handles project setup and adds compatible tools as your game grows, so you and your preferred AI agent can spend your time on gameplay.",
    href: "/templates",
    link: "Explore the starter kits"
  },
  {
    id: "test",
    name: "Test",
    icon: ShieldCheck,
    visual: ChecksIllustration,
    title: "Catch regressions before your players do.",
    text: "Start with type checking, linting, and formatting already configured. Add Vitest with unit testing baselines for movement, world boundaries, and independent game sessions, plus Playwright for browser checks. Repeatable checks give your AI agent a way to verify a change instead of guessing whether it works.",
    href: "/create",
    link: "See the development tools"
  },
  {
    id: "deploy",
    name: "Deploy",
    icon: GitBranch,
    visual: DeployIllustration,
    title: "Keep building the game. We’ll handle delivery.",
    text: "Publish source with the CLI or a GitHub Actions workflow. SpawnKit builds it, keeps each version, and hosts the result. Try an update in Sandbox, promote the tested build to production, or roll back when you need to. You don’t have to assemble a hosting stack to ship your next fix.",
    href: "/dashboard",
    link: "Explore deployments"
  },
  {
    id: "monitor",
    name: "Monitor",
    icon: Activity,
    visual: MonitorIllustration,
    title: "Find out what happened during play.",
    text: "Track game events to understand player activity, and investigate errors with the surrounding logs. Filter by version or environment to find the affected sessions, then bring that context to your preferred AI agent to investigate the problem and test a fix.",
    href: "/templates",
    link: "Add telemetry to your starter"
  }
]

export function ReleaseWalkthrough({
  defaultStep = "create"
}: {
  defaultStep?: "create" | "test" | "deploy" | "monitor"
}) {
  return (
    <Tabs defaultValue={defaultStep} className="mk-release-walkthrough">
      <TabsList className="mk-release-tabs" aria-label="Game development workflow">
        {steps.map(({ id, name, icon: Icon }) => (
          <TabsTrigger key={id} value={id}>
            <Icon size={18} />
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
      {steps.map(({ id, title, text, href, link, visual: Visual }) => (
        <TabsContent value={id} key={id} className="mk-release-panel">
          <div className="mk-release-copy">
            <h3>{title}</h3>
            <p>{text}</p>
            <a className="mk-secondary" href={href}>
              {link} <ArrowRight size={16} />
            </a>
          </div>
          <Visual />
        </TabsContent>
      ))}
    </Tabs>
  )
}
