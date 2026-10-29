import { ChevronsUpDown, KeyRound, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "./ui/sidebar"

export type StudioAccount = {
  name: string
  email?: string | undefined
  imageUrl?: string | undefined
  onManage?: (() => void) | undefined
  onSignOut?: (() => void) | undefined
}

export function SidebarAccount({ account }: { account: StudioAccount }) {
  const { isMobile, state, setOpenMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const initials = account.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  const appearance = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor }
  ] as const
  function act(action?: () => void) {
    setOpenMobile(false)
    action?.()
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Your account"
              aria-label="Open user menu"
              className="gap-3 data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="rounded-lg">
                <AvatarImage src={account.imageUrl} alt="" />
                <AvatarFallback className="rounded-lg bg-primary/10 font-medium text-accent-foreground">
                  {initials || <UserRound className="size-4" />}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 gap-0.5 text-left group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{account.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {account.email ?? "Personal account"}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile && state === "expanded" ? "top" : "right"}
            align="end"
            sideOffset={8}
            className="w-64 rounded-xl p-1.5"
          >
            <DropdownMenuLabel className="grid gap-1 px-2 py-2.5">
              <span className="truncate">{account.name}</span>
              {account.email && (
                <span className="truncate text-xs font-normal text-muted-foreground">{account.email}</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!account.onManage}
              onSelect={() => act(account.onManage)}
              className="gap-2 rounded-lg py-2.5"
            >
              <UserRound />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 rounded-lg py-2.5">
              <a href="/cli/access">
                <KeyRound />
                Agent access
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-2.5">
              <p id="theme-label" className="mb-2 text-xs font-medium text-muted-foreground">
                Appearance
              </p>
              <DropdownMenuRadioGroup
                value={theme}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                  const choices = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
                  )
                  const index = choices.indexOf(document.activeElement as HTMLElement)
                  if (index < 0) return
                  event.preventDefault()
                  event.stopPropagation()
                  choices[(index + (event.key === "ArrowRight" ? 1 : choices.length - 1)) % choices.length]?.focus()
                }}
                onValueChange={(value) => {
                  if (value === "light" || value === "dark" || value === "system") setTheme(value)
                }}
                aria-labelledby="theme-label"
                className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
              >
                {appearance.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuRadioItem
                    key={value}
                    value={value}
                    onSelect={(event) => event.preventDefault()}
                    className="flex flex-col items-center gap-1.5 rounded-md px-2 py-2 text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm [&>span]:hidden"
                  >
                    <Icon className="size-4" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!account.onSignOut}
              onSelect={() => act(account.onSignOut)}
              className="gap-2 rounded-lg py-2.5"
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
