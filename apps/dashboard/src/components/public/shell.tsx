import {
  ArrowRight,
  Zap,
  Cloud,
  Gamepad2,
  WandSparkles,
  Sun,
  Moon,
  Monitor,
  Mail,
  Menu,
  MessageCircle,
  X
} from "lucide-react"
import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu"
import { Brand } from "../brand"
import { GithubMark } from "../github-mark"
import { useTheme } from "../theme-provider"
import "./public.css"
import "./navigation.css"

const navigation = [
  { href: "/", label: "Discover", icon: Gamepad2 },
  { href: "/create", label: "For creators", icon: WandSparkles },
  { href: "/cloud", label: "Cloud", icon: Cloud }
]
const footerGroups = [
  {
    title: "Explore",
    links: [
      ["Browse games", "/#games"],
      ["Play now", "/?availability=playable#games"],
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
  const menuButton = useRef<HTMLButtonElement>(null)
  function closeMenuOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      menuButton.current?.focus()
    }
  }
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
      <header className="p-header p-header-refined">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-theme-button"
                  aria-label="Change theme"
                  disabled={!ready}
                >
                  {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Monitor />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-theme-menu">
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                >
                  <DropdownMenuRadioItem value="light">
                    <Sun size={15} />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon size={15} />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor size={15} />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="/dashboard" className="p-sign-in">
              Dashboard
            </a>
            <Button asChild>
              <a className="p-button p-button-small" href="/templates">
                Make a game <ArrowRight size={16} />
              </a>
            </Button>
            <Button
              className="p-menu"
              ref={menuButton}
              variant="ghost"
              size="icon"
              disabled={!ready}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              onClick={() => setOpen(!open)}
              onKeyDown={closeMenuOnEscape}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav id="public-mobile-nav" className="p-mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={active === item.href ? "page" : undefined}
                onKeyDown={closeMenuOnEscape}
              >
                <item.icon size={19} />
                {item.label}
                <ArrowRight size={16} />
              </a>
            ))}
            <a href="/dashboard" onKeyDown={closeMenuOnEscape}>
              Dashboard
              <ArrowRight size={16} />
            </a>
            <a href="/templates" className="p-mobile-create" onKeyDown={closeMenuOnEscape}>
              Make a game <ArrowRight size={16} />
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
                <a href="/contact#github" aria-label="GitHub" title="GitHub">
                  <GithubMark size={18} />
                </a>
                <a href="/contact#social" aria-label="Discord" title="Discord">
                  <MessageCircle size={18} />
                </a>
                <a href="/contact#updates" aria-label="X" title="X">
                  <span aria-hidden="true">𝕏</span>
                </a>
                <a href="/contact#support" aria-label="Email support" title="Email support">
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
        <Zap fill="currentColor" />
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
