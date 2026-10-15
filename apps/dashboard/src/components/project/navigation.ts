import { ChartNoAxesCombined, Globe2, House, Rocket, Server, Settings2, Terminal, Users } from "lucide-react"

export const projectNavigation = [
  { id: "overview", label: "Overview", icon: House },
  { id: "deployments", label: "Deployments", icon: Rocket },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { id: "logs", label: "Logs", icon: Terminal },
  { id: "users", label: "Users", icon: Users },
  { id: "backend", label: "Backend", icon: Server },
  { id: "settings", label: "Settings", icon: Settings2 }
] as const
