import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CircleAlert,
  CheckCircle2,
  Info,
  TriangleAlert,
  Flag,
  Gamepad2,
  Gauge,
  Inbox,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Upload,
  X
} from "lucide-react"
import { Fragment, useId, useRef, type ReactNode } from "react"
import { BrandSymbol, BrandWordmark } from "../../brand"
import { useTheme } from "../../theme-provider"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "../../ui/sidebar"
import type { SafetyRole } from "./safety-fixtures"
import "./safety.css"

export function Metadata({ items }: { items: ReactNode[] }) {
  return (
    <span className="safety-metadata">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && " "}
          <span>{item}</span>
        </Fragment>
      ))}
    </span>
  )
}
export function StatusPill({
  children,
  tone = "quiet"
}: {
  children: ReactNode
  tone?: "quiet" | "green" | "amber" | "red" | "purple"
}) {
  return (
    <Badge variant="outline" className="safety-pill" data-tone={tone}>
      {children}
    </Badge>
  )
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="safety-avatar" aria-hidden="true">
      {name === "You"
        ? "AC"
        : name
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join("")}
    </span>
  )
}
export function Notice({
  children,
  tone = "purple",
  close
}: {
  children: ReactNode
  tone?: "purple" | "amber" | "red" | "green"
  close?: () => void
}) {
  const Icon = tone === "red" ? CircleAlert : tone === "amber" ? TriangleAlert : tone === "green" ? CheckCircle2 : Info
  return (
    <div className="safety-notice" data-tone={tone} role={tone === "red" ? "alert" : "status"}>
      <Icon size={17} />
      <div>{children}</div>
      {close && (
        <Button variant="ghost" size="icon-xs" aria-label="Dismiss notice" onClick={close}>
          <X />
        </Button>
      )}
    </div>
  )
}
export function FilterSegments({
  value,
  onChange,
  label,
  items,
  line = false
}: {
  value: string
  onChange: (value: string) => void
  label: string
  items: { value: string; label: ReactNode }[]
  line?: boolean
}) {
  return (
    <fieldset className="safety-segments" data-line={line}>
      <legend className="sr-only">{label}</legend>
      {items.map((item) => (
        <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </fieldset>
  )
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="safety-empty">
      <span>
        <Inbox size={24} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
export function PreviewDialog({
  open,
  onClose,
  title,
  description,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string | undefined
  children: ReactNode
}) {
  const returnFocus = useRef<HTMLElement | null>(null)
  const descriptionId = useId()
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        className="safety-dialog"
        aria-describedby={description ? descriptionId : undefined}
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement as HTMLElement
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault()
            returnFocus.current.focus()
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription id={descriptionId}>{description}</SheetDescription>}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
export function SafetyShell({
  page,
  accountRole: role = "Admin",
  children,
  actions,
  headerActions
}: {
  page: "Reports" | "Team" | "Media & storage" | "Notifications" | "Upload game"
  accountRole?: SafetyRole | "Creator"
  children: ReactNode
  actions?: ReactNode
  headerActions?: ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const destinations = [
    { label: "Reports", icon: Flag, id: "administration-reports--inbox" },
    { label: "Team", icon: Users, id: "administration-team--members" }
  ]
  return (
    <SidebarProvider>
      <div className="safety-root">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 pt-5 pb-6">
            <div className="flex items-center gap-2.5 px-1">
              <BrandSymbol />
              <BrandWordmark className="group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup aria-label="Workspace">
              <SidebarMenu>
                {[
                  { label: "Dashboard", icon: Gauge, path: "https://spawnkit.cloud/dashboard" },
                  {
                    label: "Notifications",
                    icon: Bell,
                    path: `?id=administration-notifications--${role === "Creator" ? "creator" : "inbox"}&viewMode=story`
                  },
                  { label: "Upload game", icon: Upload, path: "?id=publishing-upload-game--upload&viewMode=story" }
                ].map(({ label, icon: Icon, path }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton asChild isActive={page === label} tooltip={label}>
                      <a href={path} aria-current={page === label ? "page" : undefined}>
                        <Icon />
                        <span>{label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            {page === "Media & storage" && (
              <SidebarGroup aria-label="Project">
                <SidebarGroupLabel>Project</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={page === "Media & storage"} tooltip="Media & storage">
                      <a href="?id=project-dashboard-media-and-storage--overview&viewMode=story">
                        <Gamepad2 />
                        <span>Media & storage</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )}
            {role !== "Creator" && (
              <SidebarGroup aria-label="Administration">
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarMenu>
                  {[
                    { label: "Submissions", icon: Inbox, path: "/dashboard/submissions" },
                    { label: "Manage", icon: ShieldCheck, path: "/dashboard/manage" }
                  ].map(({ label, icon: Icon, path }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton asChild tooltip={label}>
                        <a href={`https://spawnkit.cloud${path}`} target="_blank" rel="noreferrer">
                          <Icon />
                          <span>{label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {destinations.map(({ label, icon: Icon, id }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton asChild isActive={page === label} tooltip={label}>
                        <a href={`?id=${id}&viewMode=story`} aria-current={page === label ? "page" : undefined}>
                          <Icon />
                          <span>{label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter className="p-3">
            <div className="safety-account">
              <Avatar name="Andrew Craswell" />
              <span className="group-data-[collapsible=icon]:hidden">
                <strong>Andrew Craswell</strong>
                <small>{role}</small>
              </span>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="min-w-0">
          <header className="safety-topbar">
            <div>
              <SidebarTrigger />
              <span className="safety-divider" />
              <span>Dashboard</span>
              <ChevronRight size={13} />
              <strong>{page}</strong>
            </div>
            <div>
              {headerActions}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </Button>
            </div>
          </header>
          <main id="main" className="safety-main">
            <div className="safety-page-heading">
              <div>
                {page === "Media & storage" && <div className="safety-eyebrow">Orchard Snake</div>}
                <h1>{page}</h1>
              </div>
              <div className="safety-page-actions">{actions}</div>
            </div>
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="safety-mobile-back" variant="ghost" size="sm" onClick={onClick}>
      <ArrowLeft />
      All reports
    </Button>
  )
}
