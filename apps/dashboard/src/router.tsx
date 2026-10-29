import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { getCspNonce } from "./lib/csp-nonce"
import { configureQueryFocus } from "./lib/query-focus"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const nonce = getCspNonce()
  configureQueryFocus()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchIntervalInBackground: false } }
  })
  return createRouter({
    ssr: nonce ? { nonce } : {},
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  })
}
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
