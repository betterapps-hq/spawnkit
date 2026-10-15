import { focusManager } from "@tanstack/react-query"

/** Query polling requires both a visible tab and a focused browser window. */
export function configureQueryFocus() {
  if (typeof window === "undefined") return
  focusManager.setEventListener((setFocused) => {
    const update = () => setFocused(document.visibilityState === "visible" && document.hasFocus())
    window.addEventListener("focus", update)
    window.addEventListener("blur", update)
    document.addEventListener("visibilitychange", update)
    update()
    return () => {
      window.removeEventListener("focus", update)
      window.removeEventListener("blur", update)
      document.removeEventListener("visibilitychange", update)
    }
  })
}
