import { Check, ChevronsUpDown, Folder, Plus } from "lucide-react"
import type { LocalProject } from "@/lib/project-records"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "./ui/sidebar"

export function ProjectSwitcher({
  projects,
  active,
  onSelect,
  onAll,
  onCreate
}: {
  projects: Pick<LocalProject, "id" | "name">[]
  active: Pick<LocalProject, "id" | "name"> | null
  onSelect: (project: Pick<LocalProject, "id" | "name">) => void
  onAll: () => void
  onCreate: () => void
}) {
  const { state } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={active?.name ?? "All projects"}
              aria-label={`Switch project: ${active?.name ?? "All projects"}`}
              className="gap-3 rounded-lg data-[state=open]:bg-sidebar-accent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Folder className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                {active?.name ?? "All projects"}
              </span>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={state === "collapsed" ? "right" : "bottom"}
            sideOffset={4}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
            <DropdownMenuItem onSelect={onAll} className="gap-2 p-2">
              <Folder className="size-4" />
              All projects{!active && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem key={project.id} onSelect={() => onSelect(project)} className="gap-2 p-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-sm border">
                  <Folder className="size-3.5" />
                </span>
                <span className="truncate">{project.name}</span>
                {active?.id === project.id && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCreate} className="gap-2 p-2">
              <span className="flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </span>
              Create project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
