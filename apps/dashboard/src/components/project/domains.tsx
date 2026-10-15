import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  Globe2,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react"
import { useState } from "react"
import { normalizeHostname } from "@/lib/domain-config"
import { ProjectInputError } from "@/lib/project-records"
import { cn } from "@/lib/utils"
import { CopyButton } from "../copy-button"
import { SelectField } from "../select-field"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { ActionHandler, EnvironmentName, ProjectDomain, ProjectModel } from "./model"
import { EmptyState, Notice } from "./primitives"

export function domainIsReady(domain: ProjectDomain) {
  return (
    domain.status === "active" &&
    domain.certificate === "active" &&
    domain.records.length > 0 &&
    domain.records.every((record) => record.verified)
  )
}
export function primaryHostname(project: ProjectModel, environment: EnvironmentName) {
  return (
    project.domains.find((domain) => domain.environment === environment && domain.primary && domainIsReady(domain))
      ?.hostname ??
    project[environment]?.url ??
    project.production.url
  )
}
export function DomainStatus({ domain }: { domain: ProjectDomain }) {
  const ready = domainIsReady(domain)
  const error = domain.status === "error" || domain.certificate === "error"
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-[10px]",
        ready
          ? "border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : error
            ? "border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
            : "border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
      )}
    >
      {ready ? (
        <CheckCircle2 className="size-3" />
      ) : error ? (
        <Circle className="size-3" />
      ) : (
        <LoaderCircle className={cn("size-3", domain.status === "issuing" && "animate-spin")} />
      )}
      {domain.status === "unverified"
        ? "Not verified"
        : ready
          ? "Connected"
          : error
            ? "Needs attention"
            : domain.status === "issuing"
              ? "Issuing certificate"
              : "Awaiting DNS"}
    </Badge>
  )
}

export function Domains({
  project,
  canEdit,
  onAction,
  connectOpen,
  onConnectOpenChange,
  initialDomain,
  cloudEnabled = true
}: {
  project: ProjectModel
  canEdit: boolean
  onAction?: ActionHandler | undefined
  connectOpen: boolean
  onConnectOpenChange: (open: boolean) => void
  initialDomain?: string | undefined
  cloudEnabled?: boolean
}) {
  const [environment, setEnvironment] = useState<EnvironmentName>(
    project.domains.find((item) => item.id === initialDomain || item.hostname === initialDomain)?.environment ??
      "production"
  )
  const [selected, setSelected] = useState<string | null>(initialDomain ?? null)
  const [hostname, setHostname] = useState("")
  const [target, setTarget] = useState<EnvironmentName>("production")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [intent, setIntent] = useState<"primary" | "remove" | null>(null)
  const domain = project.domains.find((item) => item.id === selected || item.hostname === selected)
  const editable = canEdit && Boolean(onAction) && !pending
  const domains = project.domains.filter((item) => item.environment === environment)
  const managed = project[environment]!
  async function request(kind: Parameters<ActionHandler>[0]["kind"], values: Record<string, unknown>) {
    if (!editable || !onAction) return false
    setPending(true)
    setError("")
    setNotice("")
    try {
      await onAction({ kind, projectId: project.id, values })
      return true
    } catch (reason) {
      setError(
        reason instanceof ProjectInputError
          ? reason.message
          : "We couldn't confirm this change. Your entries are preserved. Check the domain status before retrying."
      )
      return false
    } finally {
      setPending(false)
    }
  }
  async function connect() {
    let value: string
    try {
      value = normalizeHostname(hostname)
    } catch (reason) {
      setError((reason as Error).message)
      return
    }
    if (
      project.domains.some((item) => item.hostname === value) ||
      [project.production.url, project.sandbox?.url].includes(value)
    ) {
      setError("This domain is already connected to this project.")
      return
    }
    if (await request(cloudEnabled ? "connect-domain" : "save-domain", { hostname: value, environment: target })) {
      onConnectOpenChange(false)
      setEnvironment(target)
      setSelected(value)
      setHostname("")
    }
  }
  function inspect(item: ProjectDomain) {
    setSelected(item.id)
    setError("")
    setNotice("")
    setIntent(null)
  }
  return (
    <div className="space-y-5">
      {notice && <Notice tone="success">{notice}</Notice>}
      {error && !domain && !connectOpen && <Notice>{error}</Notice>}
      <Tabs
        value={environment}
        onValueChange={(value) => {
          setEnvironment(value as EnvironmentName)
          setTarget(value as EnvironmentName)
        }}
        className="gap-5"
      >
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="production" className="flex-none">
            Production
          </TabsTrigger>
          {project.sandbox && (
            <TabsTrigger value="sandbox" className="flex-none">
              Sandbox
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value={environment} className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-4">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/60 text-primary">
              <Globe2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-medium">SpawnKit domain</h2>
                {managed.url && !domains.some((item) => item.primary) && (
                  <Badge variant="secondary" className="text-[10px]">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 break-all text-xs text-muted-foreground">{managed.url || "No address assigned"}</p>
            </div>
            {managed.url && (
              <>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <LockKeyhole className="size-3" />
                  HTTPS
                </span>
                <CopyButton value={`https://${managed.url}`} label="Copy SpawnKit domain" compact />
              </>
            )}
            {domains.some((item) => item.primary) && (
              <Button
                size="sm"
                variant="outline"
                disabled={!editable}
                onClick={async () => {
                  if (await request("primary-domain", { environment, domainId: null }))
                    setNotice("The SpawnKit domain is now primary.")
                }}
              >
                Use as primary
              </Button>
            )}
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Custom domains</h2>
              <span className="text-xs text-muted-foreground">{domains.length} domains</span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {domains.length ? (
                <div className="divide-y">
                  {domains.map((item) => (
                    <article key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/20">
                        <Link2 className="size-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all text-sm font-medium">{item.hostname}</h3>
                          {item.primary && (
                            <Badge variant="secondary" className="text-[10px]">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {item.certificate === "active"
                            ? "HTTPS secured"
                            : item.certificate === "error"
                              ? "Certificate needs attention"
                              : "HTTPS pending"}
                          {item.checked && (
                            <>
                              <span className="mx-2 border-l" />
                              Checked {item.checked}
                            </>
                          )}
                        </p>
                      </div>
                      <DomainStatus domain={item} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => inspect(item)}
                        aria-label={`${domainIsReady(item) ? "Manage" : "Set up"} ${item.hostname}`}
                      >
                        {domainIsReady(item) ? "Manage" : "Set up"}
                        <ArrowRight className="size-3" />
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Globe2 />}
                  title="Give your game its own address"
                  description="Connect a domain you already own, such as play.yourgame.com."
                  action={
                    <Button
                      variant="outline"
                      disabled={!editable}
                      onClick={() => {
                        setTarget(environment)
                        setError("")
                        onConnectOpenChange(true)
                      }}
                    >
                      <Plus />
                      Connect domain
                    </Button>
                  }
                />
              )}
            </div>
          </section>
          <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Domains follow this environment across promotions and rollbacks. Pull request previews keep their own
              generated addresses.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      <Sheet
        open={connectOpen}
        onOpenChange={(open) => {
          if (!pending) {
            onConnectOpenChange(open)
            setError("")
          }
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg" showCloseButton={!pending}>
          <SheetHeader className="border-b p-6">
            <SheetTitle>Connect a domain</SheetTitle>
            <SheetDescription>
              Use an address you own for your game. You can set this up before deploying.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void connect()
            }}
            className="flex flex-1 flex-col"
          >
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="domain-hostname">Domain</Label>
                <Input
                  id="domain-hostname"
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  placeholder="play.yourgame.com"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                  aria-invalid={Boolean(error)}
                  aria-describedby="domain-hint"
                />
                <p id="domain-hint" className="text-xs leading-5 text-muted-foreground">
                  Enter just the hostname. You'll add DNS records where you manage your domain.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain-environment">Environment</Label>
                <fieldset disabled={pending}>
                  <SelectField
                    id="domain-environment"
                    label="Domain environment"
                    value={target}
                    onChange={(value) => setTarget(value as EnvironmentName)}
                    options={[
                      { value: "production", label: "Production" },
                      ...(project.sandbox ? [{ value: "sandbox", label: "Sandbox" }] : [])
                    ]}
                  />
                </fieldset>
                <p className="text-xs leading-5 text-muted-foreground">
                  {target === "production"
                    ? "The address your players will use."
                    : "A separate address for testing. It does not change your production domain."}
                </p>
              </div>
              <div className="space-y-4 rounded-lg bg-muted/50 p-4">
                {["Connect your domain", "Add the DNS records", "Verify and secure with HTTPS"].map((label, i) => (
                  <div key={label} className="flex items-center gap-3 text-xs">
                    <span className="grid size-6 place-items-center rounded-full border bg-card font-mono text-[10px]">
                      {i + 1}
                    </span>
                    {label}
                  </div>
                ))}
              </div>
              {error && <Notice>{error}</Notice>}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t p-6">
              <Button type="button" variant="outline" disabled={pending} onClick={() => onConnectOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editable}>
                {pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                {cloudEnabled ? "Continue to DNS" : "Save domain"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(domain)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setSelected(null)
            setError("")
            setIntent(null)
          }
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-[600px]" showCloseButton={!pending}>
          {domain && (
            <>
              <SheetHeader className="border-b p-6">
                <SheetTitle className="break-all pr-6">{domain.hostname}</SheetTitle>
                <SheetDescription className="capitalize">{domain.environment} domain</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DomainStatus domain={domain} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!editable || !cloudEnabled}
                    onClick={async () => {
                      if (await request("verify-domain", { domainId: domain.id })) setNotice("Domain status checked.")
                    }}
                  >
                    {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}Check status
                  </Button>
                </div>
                <ol className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Ownership",
                      done:
                        domain.records.some((r) => r.type === "TXT") &&
                        domain.records.filter((r) => r.type === "TXT").every((r) => r.verified)
                    },
                    {
                      label: "DNS routing",
                      done:
                        domain.records.some((r) => r.type === "CNAME") &&
                        domain.records.filter((r) => r.type === "CNAME").every((r) => r.verified)
                    },
                    { label: "HTTPS", done: domain.certificate === "active" }
                  ].map((step) => (
                    <li key={step.label} className="flex items-center gap-2 border-b pb-3 text-xs">
                      {step.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      {step.label}
                    </li>
                  ))}
                </ol>
                {domain.issue && <Notice>{domain.issue}</Notice>}
                {domain.status === "issuing" && (
                  <Notice tone="info">
                    DNS is verified. Your HTTPS certificate is being issued. Keep the DNS records in place.
                  </Notice>
                )}
                {domain.status === "unverified" && (
                  <Notice tone="info">Domain saved. DNS verification is not available yet.</Notice>
                )}
                {domain.status !== "unverified" && !domainIsReady(domain) && (
                  <div>
                    <h3 className="text-sm font-medium">Add these DNS records</h3>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      Open your domain provider's DNS settings and add the records below. TXT proves you own the
                      address; CNAME sends visitors to your game. Changes can take time to appear.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {domain.records.map((record) => (
                    <section key={record.type + record.name} className="rounded-lg border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-semibold">{record.type} record</h3>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px]",
                            record.verified ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground"
                          )}
                        >
                          {record.verified && <Check className="size-3" />}
                          {record.verified ? "Verified" : "Not detected"}
                        </span>
                      </div>
                      {[
                        { label: "Name", value: record.name },
                        { label: "Value", value: record.value }
                      ].map((field) => (
                        <div key={field.label} className="mt-2">
                          <p className="mb-1 text-[10px] text-muted-foreground">{field.label}</p>
                          <div className="flex items-center gap-2 rounded-md bg-muted/50 pl-3 pr-1">
                            <code className="min-w-0 flex-1 break-all py-2 text-[11px]">{field.value}</code>
                            <CopyButton
                              value={field.value}
                              label={`Copy ${record.type} ${field.label.toLowerCase()}`}
                              compact
                            />
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
                {domainIsReady(domain) && (
                  <div className="flex flex-wrap gap-2">
                    {project[domain.environment]?.release && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://${domain.hostname}`} target="_blank" rel="noreferrer">
                          Visit domain
                          <ArrowUpRight />
                        </a>
                      </Button>
                    )}
                    {!domain.primary && (
                      <Button size="sm" disabled={!editable} onClick={() => setIntent("primary")}>
                        Set as primary
                      </Button>
                    )}
                    {domain.primary && <Badge variant="secondary">Primary domain</Badge>}
                  </div>
                )}
                {error && <Notice>{error}</Notice>}
                {intent && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-medium">
                      {intent === "primary"
                        ? "Use as the primary address?"
                        : domain.status === "unverified"
                          ? "Remove this domain?"
                          : "Disconnect this domain?"}
                    </h3>
                    <p className="text-xs leading-6 text-muted-foreground">
                      {intent === "primary"
                        ? "SpawnKit will use this address when you open or share the game. Your other domains keep working; no redirects are added."
                        : domain.status === "unverified"
                          ? "This removes the saved hostname from this project. No DNS records or routing will be changed."
                          : `Visitors will no longer reach this game at ${domain.hostname}. The SpawnKit address stays available. Your versions and game data are kept.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={intent === "remove" ? "destructive" : "default"}
                        size="sm"
                        disabled={!editable}
                        onClick={async () => {
                          const operation = intent
                          if (
                            await request(operation === "primary" ? "primary-domain" : "remove-domain", {
                              domainId: domain.id,
                              environment: domain.environment
                            })
                          ) {
                            setIntent(null)
                            if (operation === "remove") {
                              setSelected(null)
                              setNotice(
                                domain.status === "unverified"
                                  ? "Domain removed."
                                  : "Domain disconnected. You can remove its DNS records at your domain provider."
                              )
                            } else setNotice("Primary domain updated.")
                          }
                        }}
                      >
                        {pending && <LoaderCircle className="animate-spin" />}
                        {intent === "primary"
                          ? "Confirm primary domain"
                          : domain.status === "unverified"
                            ? "Remove domain"
                            : "Disconnect domain"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setIntent(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between border-t p-6">
                <span className="text-[11px] text-muted-foreground">
                  {domain.checked ? `Last checked ${domain.checked}` : "Not yet verified"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={!editable}
                  onClick={() => setIntent("remove")}
                >
                  <Trash2 className="size-3" />
                  {domain.status === "unverified" ? "Remove" : "Disconnect"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
