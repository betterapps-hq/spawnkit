import { Bell, Check, CheckCheck, CircleCheck, CircleAlert, GitPullRequest } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { StudioLocation } from "./project/model"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export type StudioNotification = {
  id: string
  title: string
  description: string
  time: string
  kind: "success" | "error" | "preview"
  read?: boolean
  target?: StudioLocation
}
const emptyNotifications: StudioNotification[] = []

export function Notifications({
  items = emptyNotifications,
  onNavigate
}: {
  items?: StudioNotification[] | undefined
  onNavigate: (location: StudioLocation) => void
}) {
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState("all")
  const isRead = (item: StudioNotification) => item.read || read.has(item.id)
  const unread = items.filter((item) => !isRead(item))
  const visible = filter === "unread" ? unread : items
  function markRead(id: string) {
    setRead((previous) => new Set([...previous, id]))
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
          className="relative size-9 rounded-lg text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <Bell className="size-[18px]" />
          {unread.length > 0 && (
            <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        aria-label="Notifications"
        className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-0 shadow-xl shadow-black/5"
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mark all as read"
            title="Mark all as read"
            disabled={!unread.length}
            onClick={() => setRead(new Set(items.map((item) => item.id)))}
          >
            <CheckCheck />
          </Button>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="gap-0">
          <div className="border-b px-4 pb-3">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="gap-1.5 text-xs">
                Unread<span className="rounded bg-background/70 px-1.5 text-[10px] tabular-nums">{unread.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value={filter} className="m-0 max-h-[min(420px,65svh)] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-4 flex size-11 items-center justify-center rounded-full border bg-muted/50">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">You're all caught up</p>
                <p className="mt-1.5 max-w-60 text-xs leading-5 text-muted-foreground">
                  {filter === "unread"
                    ? "No unread notifications."
                    : "Project and deployment updates will appear here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {visible.map((item) => {
                  const Icon =
                    item.kind === "error" ? CircleAlert : item.kind === "preview" ? GitPullRequest : CircleCheck
                  return (
                    <li
                      key={item.id}
                      className={cn("flex items-start gap-2 px-3 py-3", !isRead(item) && "bg-accent/25")}
                    >
                      <button
                        disabled={!item.target}
                        onClick={() => {
                          markRead(item.id)
                          if (item.target) {
                            onNavigate(item.target)
                            setOpen(false)
                          }
                        }}
                        className="flex min-w-0 flex-1 gap-3 rounded-md p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted",
                            item.kind === "error" ? "text-destructive" : "text-primary"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="grid min-w-0 gap-1">
                          <span className="text-xs font-medium leading-5">{item.title}</span>
                          <span className="text-xs leading-5 text-muted-foreground">{item.description}</span>
                          <span className="mt-1 text-[10px] text-muted-foreground">{item.time}</span>
                        </span>
                      </button>
                      {!isRead(item) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Mark ${item.title} as read`}
                          onClick={() => markRead(item.id)}
                          className="mt-1 shrink-0"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
