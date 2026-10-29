import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark" | "system"
const storageKey = "spawn:theme"
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null)
function parseTheme(value: string | null): Theme {
  return value === "light" || value === "dark" || value === "system" ? value : "dark"
}
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

// Runs before the first paint; the provider takes over after hydration.
export const themeScript = `(function(){var t='dark';try{var s=localStorage.getItem('${storageKey}');if(s==='light'||s==='dark'||s==='system')t=s}catch{}var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'})()`

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setCurrentTheme] = useState<Theme>("dark")
  useEffect(() => {
    let current: Theme = "dark"
    try {
      current = parseTheme(localStorage.getItem(storageKey))
    } catch {
      /* Storage is optional. */
    }
    // Browser storage is restored after SSR so the server and initial client markup agree.
    // oxlint-disable-next-line react/set-state-in-effect
    setCurrentTheme(current)
    applyTheme(current)
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) {
        const next = parseTheme(event.newValue)
        setCurrentTheme(next)
        applyTheme(next)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () => applyTheme(theme)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [theme])
  function setTheme(next: Theme) {
    setCurrentTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      /* Keep the choice for this session. */
    }
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme requires ThemeProvider")
  return context
}
