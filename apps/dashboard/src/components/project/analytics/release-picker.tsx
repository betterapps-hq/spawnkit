/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A searchable ARIA combobox uses a popup listbox; native select/option cannot contain the release metadata. */
import { Check, ChevronDown, ChevronLeft, ChevronRight, GitCommitHorizontal, Search, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { number } from "./model"
import { searchReleases, type ReleaseEntry } from "./release-catalog"
import "./release-picker.css"

const PAGE_SIZE = 20
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

export function ReleasePicker({
  releases,
  value,
  onChange,
  label,
  allowAll = false,
  className = ""
}: {
  releases: ReleaseEntry[]
  value: string
  onChange: (value: string) => void
  label: string
  allowAll?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("")
  const [page, setPage] = useState(0),
    [active, setActive] = useState(0)
  const id = useId(),
    listId = `${id}-list`,
    dialogId = `${id}-dialog`
  const input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const matches = useMemo(() => searchReleases(releases, query), [releases, query])
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1))
  const offset = currentPage * PAGE_SIZE
  const visible = matches.slice(offset, offset + PAGE_SIZE)
  const pinned =
    !query.trim() && value && value !== "all" && !visible.some((release) => release.version === value)
      ? (releases.find((release) => release.version === value) ?? { version: value })
      : null
  const choices: ReleaseEntry[] = [
    ...(allowAll && !query.trim() ? [{ version: "all" }] : []),
    ...(pinned ? [pinned] : []),
    ...visible
  ]
  const activeIndex = Math.min(active, choices.length - 1)
  useEffect(() => {
    list.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, currentPage, query, open])
  function changeOpen(next: boolean) {
    if (next) {
      setQuery("")
      setPage(0)
      const selected = releases.findIndex((release) => release.version === value)
      setActive(value === "all" ? 0 : (allowAll ? 1 : 0) + (selected >= 0 && selected < PAGE_SIZE ? selected : 0))
    }
    setOpen(next)
  }
  function select(version: string) {
    onChange(version)
    setOpen(false)
  }
  function changePage(direction: number) {
    setPage(currentPage + direction)
    setActive(0)
    list.current?.scrollTo({ top: 0 })
    input.current?.focus()
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setActive(Math.max(0, Math.min(choices.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1))))
    } else if (event.key === "Enter" && choices[activeIndex]) {
      event.preventDefault()
      select(choices[activeIndex].version)
    } else if (event.key === "PageDown" && offset + PAGE_SIZE < matches.length) {
      event.preventDefault()
      changePage(1)
    } else if (event.key === "PageUp" && currentPage > 0) {
      event.preventDefault()
      changePage(-1)
    }
  }
  const displayValue = value === "all" ? "All releases" : value || "Select release"
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={dialogId}
          aria-label={label}
          className={`an-release-trigger ${className}`}
          title={displayValue}
        >
          <span>{displayValue}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={popup}
        id={dialogId}
        className="an-release-popover"
        align="end"
        collisionPadding={12}
        aria-label={`Choose ${label.toLowerCase()}`}
        aria-hidden={!open}
        inert={!open}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          input.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (document.activeElement === document.body || popup.current?.contains(document.activeElement))
            trigger.current?.focus()
        }}
      >
        <div className="an-release-search">
          <Search className="size-4 text-muted-foreground" />
          <Input
            ref={input}
            role="combobox"
            aria-label="Search releases"
            placeholder="Version or commit…"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={choices[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
              setActive(0)
              list.current?.scrollTo({ top: 0 })
            }}
            onKeyDown={keyDown}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear release search"
              onClick={() => {
                setQuery("")
                setPage(0)
                setActive(0)
                input.current?.focus()
              }}
            >
              <X />
            </Button>
          )}
        </div>
        <div className="an-release-list-heading">
          {query.trim() ? "Search results" : pinned ? "Selected and recent" : "Newest first"}
        </div>
        <div id={listId} ref={list} role="listbox" aria-label="Releases" className="an-release-list">
          {choices.map((release, index) => (
            <div
              key={release.version}
              role="option"
              id={`${id}-option-${index}`}
              aria-label={release.version === "all" ? "All releases" : release.version}
              aria-selected={value === release.version}
              tabIndex={-1}
              data-index={index}
              data-active={index === activeIndex}
              data-pinned={release === pinned || release.version === "all"}
              className="an-release-option"
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={(event) => {
                if (event.pointerType === "mouse") setActive(index)
              }}
              onClick={() => select(release.version)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  select(release.version)
                }
              }}
            >
              <div className="an-release-option-title">
                <span title={release.version}>{release.version === "all" ? "All releases" : release.version}</span>
                {value === release.version && <Check className="size-3.5 shrink-0 text-primary" />}
              </div>
              {release.version !== "all" && (
                <div className="an-release-option-meta">
                  <span>
                    {release.createdAt !== undefined
                      ? date.format(release.createdAt)
                      : release.firstObservedAt !== undefined
                        ? `First seen ${date.format(release.firstObservedAt)}`
                        : ""}
                  </span>
                  {release.commit && (
                    <span title={release.commit}>
                      <GitCommitHorizontal className="size-3" />
                      {release.commit.slice(0, 7)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {!matches.length && (
          <div className="an-release-empty">{query.trim() ? "No matching releases" : "No releases yet"}</div>
        )}
        <div className="an-release-picker-footer">
          <output aria-live="polite">
            {matches.length > PAGE_SIZE
              ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, matches.length)} of ${number(matches.length)}`
              : `${number(matches.length)} ${matches.length === 1 ? "release" : "releases"}`}
          </output>
          {matches.length > PAGE_SIZE && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Previous releases"
                disabled={currentPage === 0}
                onClick={() => changePage(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Next releases"
                disabled={offset + PAGE_SIZE >= matches.length}
                onClick={() => changePage(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
