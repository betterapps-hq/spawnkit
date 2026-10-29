import { ClerkProvider } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"
import type { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useRouterState
} from "@tanstack/react-router"
import { NotFoundPage } from "@/components/public/not-found-page"
import { ThemeProvider, themeScript } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getAuthConfiguration } from "@/lib/server"
import styles from "../style.css?url"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getAuthConfiguration(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SpawnKit | Your games, in one place" }
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "preload", href: interLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }
    ]
  }),
  component: Root,
  notFoundComponent: NotFoundPage,
  errorComponent: () => (
    <main className="p-12">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2">Refresh the page to try again.</p>
      <a href="/" className="text-primary underline">
        Return to game discovery
      </a>
    </main>
  )
})
function Root() {
  const nonce = useRouter().options.ssr?.nonce
  const cliAuthorization = useRouterState({ select: (state) => state.location.pathname.startsWith("/cli/") })
  const session = Route.useLoaderData()
  const content = (
    <ThemeProvider>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    </ThemeProvider>
  )
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {session.configured ? (
          <ClerkProvider
            {...(nonce ? { nonce } : {})}
            {...(cliAuthorization ? {} : { prefetchUI: false })}
            signInUrl="/sign-in"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            afterSignOutUrl="/sign-in"
            taskUrls={{
              "choose-organization": "/session-tasks",
              "reset-password": "/session-tasks",
              "setup-mfa": "/session-tasks"
            }}
            appearance={{ theme: { ...shadcn, cssLayerName: "clerk" } }}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
        <Scripts />
      </body>
    </html>
  )
}
