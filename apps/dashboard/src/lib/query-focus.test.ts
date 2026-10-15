import { focusManager } from "@tanstack/react-query"
import { expect, it, vi } from "vitest"
import { configureQueryFocus } from "./query-focus"

it("requires window focus and tab visibility, initializes immediately, and replaces listeners cleanly", () => {
  const browser = new EventTarget()
  const page = Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: () => focused })
  let focused = true
  vi.stubGlobal("window", browser)
  vi.stubGlobal("document", page)
  try {
    configureQueryFocus()
    expect(focusManager.isFocused()).toBe(true)
    focused = false
    browser.dispatchEvent(new Event("blur"))
    expect(focusManager.isFocused()).toBe(false)
    focused = true
    page.visibilityState = "hidden"
    browser.dispatchEvent(new Event("focus"))
    expect(focusManager.isFocused()).toBe(false)
    page.visibilityState = "visible"
    page.dispatchEvent(new Event("visibilitychange"))
    expect(focusManager.isFocused()).toBe(true)
    focused = false
    configureQueryFocus()
    expect(focusManager.isFocused()).toBe(false)
    focusManager.setEventListener(() => () => {})
    focused = true
    browser.dispatchEvent(new Event("focus"))
    expect(focusManager.isFocused()).toBe(false)
  } finally {
    focusManager.setEventListener(() => () => {})
    focusManager.setFocused(undefined)
    vi.unstubAllGlobals()
  }
})
