import { ArrowRight, Zap, Cloud, Gamepad2, WandSparkles, Sun, Moon, Monitor, Menu, BookOpen, X } from "lucide-react"
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
import { useTheme } from "../theme-provider"
import "./public.css"
import "./navigation.css"
import "./footer.css"

const navigation = [
  { href: "/", label: "Discover", icon: Gamepad2 },
  { href: "/create", label: "For creators", icon: WandSparkles },
  { href: "/cloud", label: "Cloud", icon: Cloud },
  { href: "/docs", label: "Documentation", icon: BookOpen }
]
const footerGroups = [
  {
    title: "Play",
    links: [
      ["Browse games", "/browse"],
      ["How to play", "/help#playing"],
      ["Community guidelines", "/community-guidelines"]
    ]
  },
  {
    title: "Starter kits",
    links: [
      ["Choose a starter kit", "/templates"],
      ["PixiJS starter kit", "/kits/pixi"],
      ["Phaser starter kit", "/kits/phaser"],
      ["Three.js starter kit", "/kits/three"],
      ["Babylon.js starter kit", "/kits/babylon"]
    ]
  },
  {
    title: "Documentation",
    links: [
      ["All documentation", "/docs"],
      ["Build your first game", "/docs/getting-started"],
      ["Upload an existing game", "/docs/upload-existing-game"],
      ["Use the dashboard", "/docs/dashboard"],
      ["Testing and debugging", "/docs/testing"],
      ["Publish your game", "/docs/publishing"]
    ]
  },
  {
    title: "Code with AI",
    links: [
      ["Build with Codex", "/docs/codex"],
      ["Build with Claude Code", "/docs/claude-code"],
      ["Build with Cursor", "/docs/cursor"],
      ["CLI reference", "/docs/cli"],
      ["API resources", "/docs/api"]
    ]
  },
  {
    title: "SpawnKit",
    links: [
      ["Hosting plans", "/cloud#pricing"],
      ["About SpawnKit", "/about"],
      ["Help center", "/help"],
      ["Contact", "/contact"]
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
                Make a game
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
              Make a game
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
          <div className="p-footer-intro">
            <div className="p-footer-brand">
              <Brand />
              <p>Discover browser games. Create and publish your own with AI.</p>
            </div>
            <div className="p-footer-start">
              <a href="/templates">
                Choose a free starter kit <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="/docs/getting-started">
                Read the quickstart <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
          <nav className="p-footer-links" aria-label="Footer navigation">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <a href={href}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
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
          Start with a kit
        </a>
      </Button>
    </section>
  )
}
