import { createFileRoute } from "@tanstack/react-router"
import { proxyPlatform } from "@/lib/platform-proxy"

export const Route = createFileRoute("/api/platform/v1/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyPlatform(request),
      POST: ({ request }) => proxyPlatform(request),
      PUT: ({ request }) => proxyPlatform(request),
      PATCH: ({ request }) => proxyPlatform(request),
      DELETE: ({ request }) => proxyPlatform(request)
    }
  }
})
