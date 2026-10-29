import { findStarterKit } from "@spawn/templates/kits"
import { gameCategories } from "@spawn/templates/listing"
import { documentIds } from "./document-ids"
import type { PublishedGame } from "./publishing"

export const publicOrigin = "https://spawnkit.cloud"
export const publicPages = {
  "/": {
    title: "Free browser games — SpawnKit",
    description:
      "Play free browser games on SpawnKit. Discover games, find your next favorite, or download a starter kit to make a game of your own.",
    name: "Discover games"
  },
  "/create": {
    title: "Make browser games with AI coding tools — SpawnKit",
    description:
      "Start making a browser game with a free TypeScript kit. Choose your engine, keep the source, and build locally with your preferred AI coding tools.",
    name: "For creators"
  },
  "/templates": {
    title: "Browser game starter kits for TypeScript — SpawnKit",
    description:
      "Choose PixiJS, Phaser, Babylon.js, or Three.js. Add compatible physics and testing tools, then download a standalone TypeScript game project.",
    name: "Starter kits"
  },
  "/browse": {
    title: "Browse free browser games — SpawnKit",
    description:
      "Explore the complete SpawnKit catalog of free browser games. Find a game, read its description and play in your browser.",
    name: "Browse games"
  },
  "/cloud": {
    title: "Browser game hosting and pricing — SpawnKit Cloud",
    description:
      "Publish browser games with free single-player hosting, source builds, and release controls. Explore pricing and upcoming multiplayer services.",
    name: "Game hosting"
  },
  "/docs": {
    title: "SpawnKit documentation — Build and publish browser games",
    description:
      "Start a browser game, build with AI coding agents, use the dashboard, and find CLI commands, configuration examples and publishing guides.",
    name: "Documentation"
  },
  "/about": {
    title: "About SpawnKit — Browser games and game creation",
    description:
      "Discover SpawnKit: free browser games, editable TypeScript starter kits, and hosting for independent game creators. See current platform availability.",
    name: "About SpawnKit"
  },
  "/help": {
    title: "SpawnKit help — Playing, building and publishing games",
    description:
      "Learn how to play browser games, download a SpawnKit starter, install dependencies, run your game locally, and get started with hosting.",
    name: "Help center"
  },
  "/contact": {
    title: "Contact SpawnKit — Game, account and publishing support",
    description:
      "Contact SpawnKit about your account, game or deployment. Find setup guides and learn what details to include when asking for help.",
    name: "Contact"
  },
  "/community-guidelines": {
    title: "Community guidelines — SpawnKit",
    description:
      "Read SpawnKit's rules for publishing games, leaving feedback, reporting problems, and participating in the player and creator community.",
    name: "Community guidelines"
  },
  "/privacy": {
    title: "Privacy policy — SpawnKit",
    description: "Learn how SpawnKit handles account information, game activity, hosting data, and privacy requests.",
    name: "Privacy policy"
  },
  "/terms": {
    title: "Terms of service — SpawnKit",
    description: "Read the terms for using SpawnKit's website, game hosting, starter kits, and community features.",
    name: "Terms of service"
  }
} as const

export type PublicPath = keyof typeof publicPages
const gamePath = /^\/play\/[A-Za-z0-9_-]{1,128}$/
const discoveryParameters = [
  "q",
  "genre",
  "dimension",
  "availability",
  "rating",
  "reviews",
  "sort",
  "page",
  "project",
  "view"
]

export function indexablePath(pathname: string, search = "") {
  const collection =
    pathname === "/browse" || gameCategories.some((category) => pathname === `/categories/${category.slug}`)
  const kit = pathname.startsWith("/kits/") && Boolean(findStarterKit(pathname.slice(6)))
  if (
    !(
      Object.hasOwn(publicPages, pathname) ||
      gamePath.test(pathname) ||
      kit ||
      collection ||
      documentIds.some((id) => pathname === `/docs/${id}`)
    )
  )
    return false
  const parameters = new URLSearchParams(search)
  if (collection)
    return (
      [...parameters.keys()].every(
        (key) => key === "page" || key.startsWith("utm_") || ["gclid", "fbclid"].includes(key)
      ) &&
      (!parameters.has("page") || /^[1-9]\d{0,5}$/.test(parameters.get("page")!))
    )
  return pathname !== "/" || !discoveryParameters.some((key) => parameters.has(key))
}

// Escape the HTML script delimiter even when a creator controls titles and descriptions.
export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function pageHead(
  path: string,
  title: string,
  description: string,
  name: string,
  options: {
    noindex?: boolean
    image?: string | null
    entity?: Record<string, unknown>
  } = {}
) {
  const url = `${publicOrigin}${path}`
  const image = options.image || `${publicOrigin}/social-card.png`
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: title,
      description,
      isPartOf: { "@id": `${publicOrigin}/#website` }
    },
    ...(path === "/"
      ? [
          {
            "@type": "Organization",
            "@id": `${publicOrigin}/#organization`,
            name: "SpawnKit",
            url: `${publicOrigin}/`,
            logo: `${publicOrigin}/favicon.svg`
          },
          {
            "@type": "WebSite",
            "@id": `${publicOrigin}/#website`,
            name: "SpawnKit",
            url: `${publicOrigin}/`,
            publisher: { "@id": `${publicOrigin}/#organization` }
          }
        ]
      : [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "SpawnKit", item: `${publicOrigin}/` },
              { "@type": "ListItem", position: 2, name, item: url }
            ]
          }
        ]),
    ...(options.entity ? [options.entity] : [])
  ]
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SpawnKit" },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      ...(options.noindex ? [{ name: "robots", content: "noindex, follow" }] : [])
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: serializeStructuredData({ "@context": "https://schema.org", "@graph": graph })
      }
    ]
  }
}

export function publicPageHead(path: PublicPath, noindex = false) {
  const page = publicPages[path]
  return pageHead(path, page.title, page.description, page.name, { noindex })
}

export function gamePageHead(game: PublishedGame) {
  const path = `/play/${game.projectId}`
  return pageHead(path, `${game.title} — Play free on SpawnKit`, game.description, game.title, {
    image: game.coverUrl ?? null,
    noindex: game.discoverable === false,
    entity: {
      "@type": "VideoGame",
      "@id": `${publicOrigin}${path}#game`,
      name: game.title,
      description: game.description,
      url: `${publicOrigin}${path}`,
      isAccessibleForFree: true,
      ...(game.coverUrl ? { image: game.coverUrl } : {}),
      ...(game.genre ? { genre: game.genre } : {})
    }
  })
}
