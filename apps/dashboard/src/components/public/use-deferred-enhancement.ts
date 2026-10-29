import { useEffect, useState, type RefObject } from "react"

/** Leave the server-rendered still visible while critical resources load and paint. */
export function useDeferredEnhancement(ref: RefObject<Element | null>) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    let loaded = document.readyState === "complete"
    let visible = false
    let activated = false
    let scheduled = false
    let frame = 0
    let idle = 0
    let timer = 0
    function cancel() {
      cancelAnimationFrame(frame)
      if (idle) window.cancelIdleCallback(idle)
      clearTimeout(timer)
      frame = idle = timer = 0
      scheduled = false
    }
    function activate() {
      scheduled = false
      if (!visible || document.hidden) return
      activated = true
      observer.disconnect()
      setReady(true)
    }
    function schedule() {
      if (!loaded || !visible || document.hidden || activated || scheduled) return
      scheduled = true
      // Allow a paint before optional imports, video downloads or animation timers.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (typeof window.requestIdleCallback === "function")
            idle = window.requestIdleCallback(activate, { timeout: 1500 })
          else timer = window.setTimeout(activate, 200)
        })
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) schedule()
      else cancel()
    })
    const onLoad = () => {
      loaded = true
      schedule()
    }
    const onVisibility = () => {
      if (document.hidden) cancel()
      else schedule()
    }
    observer.observe(element)
    window.addEventListener("load", onLoad, { once: true })
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancel()
      observer.disconnect()
      window.removeEventListener("load", onLoad)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [ref])
  return ready
}
