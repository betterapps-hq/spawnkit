import { ArrowRight, Box, Mail, Menu, MessageCircle, X } from "lucide-react"
import { useState, useSyncExternalStore, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Brand } from "../brand"
import { GithubMark } from "../github-mark"
import { useTheme } from "../theme-provider"
import "./public.css"

const navigation = [
  { href: "/", label: "Discover" },
  { href: "/create", label: "For creators" },
  { href: "/cloud", label: "Cloud" }
]
const footerGroups = [
  {
    title: "Explore",
    links: [
      ["Browse games", "/#games"],
      ["Playable demos", "/?availability=playable#games"],
      ["Game concepts", "/?availability=concept#games"]
    ]
  },
  {
    title: "Create",
    links: [
      ["For creators", "/create"],
      ["Starter kit builder", "/templates"],
      ["Game cloud", "/cloud"],
      ["Cloud pricing", "/cloud#pricing"]
    ]
  },
  {
    title: "Resources",
    links: [
      ["Getting started", "/help"],
      ["Game controls", "/help#playing"],
      ["Community guidelines", "/community-guidelines"],
      ["Support", "/contact#support"]
    ]
  },
  {
    title: "SpawnKit",
    links: [
      ["About", "/about"],
      ["Platform availability", "/about#availability"],
      ["Contact", "/contact"],
      ["Your dashboard", "/dashboard"]
    ]
  }
]
const subscribe = () => () => {}
export function PublicShell({ active, children }: { active: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  return (
    <div className="public-site" data-ready={ready}>
      <a className="p-skip" href="#main">
        Skip to content
      </a>
      <header className="p-header">
        <div className="p-header-inner">
          <Brand />
          <nav className="p-desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} aria-current={active === item.href ? "page" : undefined}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="p-header-actions">
            <a href="/dashboard" className="p-sign-in">
              Dashboard <ArrowRight size={14} />
            </a>
            <Button asChild>
              <a className="p-button p-button-small" href="/templates">
                Make a game <ArrowRight size={15} />
              </a>
            </Button>
            <Button
              className="p-menu"
              disabled={!ready}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav id="public-mobile-nav" className="p-mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} aria-current={active === item.href ? "page" : undefined}>
                {item.label}
                <ArrowRight size={16} />
              </a>
            ))}
            <a href="/dashboard">
              Dashboard
              <ArrowRight size={16} />
            </a>
          </nav>
        )}
      </header>
      <main id="main">
        <fieldset disabled={!ready} className="p-hydration" aria-label="Page controls">
          {children}
        </fieldset>
      </main>
      <footer className="p-company-footer">
        <div className="p-container">
          <div className="p-footer-top">
            <div className="p-footer-brand">
              <Brand />
              <p>
                Play browser games.
                <br />
                Build and share your own.
              </p>
              <nav className="p-social-links" aria-label="Social links">
                <a href="/contact#github" aria-label="GitHub preview" title="GitHub">
                  <GithubMark size={18} />
                </a>
                <a href="/contact#social" aria-label="Discord preview" title="Discord">
                  <MessageCircle size={18} />
                </a>
                <a href="/contact#updates" aria-label="X preview" title="X">
                  <span aria-hidden="true">𝕏</span>
                </a>
                <a href="/contact#support" aria-label="Email support preview" title="Email support">
                  <Mail size={18} />
                </a>
              </nav>
            </div>
            <nav className="p-footer-links" aria-label="Footer navigation">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h2>{group.title}</h2>
                  {group.links.map(([label, href]) => (
                    <a key={href} href={href}>
                      {label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          <div className="p-footer-bottom">
            <span>© 2026 SpawnKit</span>
            <nav className="p-legal-links" aria-label="Legal">
              <a href="/privacy">Privacy policy</a>
              <a href="/terms">Terms of service</a>
            </nav>
            <label htmlFor="public-appearance" className="p-theme-select">
              Appearance
              <NativeSelect
                id="public-appearance"
                aria-label="Appearance"
                value={theme}
                disabled={!ready}
                onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
              >
                <NativeSelectOption value="system">System</NativeSelectOption>
                <NativeSelectOption value="light">Light</NativeSelectOption>
                <NativeSelectOption value="dark">Dark</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>
        </div>
      </footer>
    </div>
  )
}
export function CreatorBanner() {
  return (
    <section className="p-creator-banner">
      <div className="p-banner-mark" aria-hidden="true">
        <Box />
      </div>
      <div>
        <h2>Build your own game</h2>
        <p>Choose an engine. Download a free TypeScript project with your physics and testing tools.</p>
      </div>
      <Button asChild>
        <a href="/templates" className="p-button">
          Build a starter kit <ArrowRight size={18} />
        </a>
      </Button>
    </section>
  )
}
