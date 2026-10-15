import { ClerkProvider } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { ThemeProvider, themeScript } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSession } from "@/lib/server"
import styles from "../style.css?url"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getSession(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SpawnKit — Your games, in one place" }
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }
    ]
  }),
  component: Root,
  notFoundComponent: () => (
    <main className="p-12">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <a href="/" className="text-primary underline">
        Return to game discovery
      </a>
    </main>
  ),
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
  const session = Route.useLoaderData()
  const content = (
    <ThemeProvider>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    </ThemeProvider>
  )
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {session.configured ? (
          <ClerkProvider
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
