import { createFileRoute } from "@tanstack/react-router"
import { cliAuthConfiguration } from "@/lib/cli-auth"

export const Route = createFileRoute("/api/cli/auth")({
  server: {
    handlers: {
      GET: () => {
        try {
          return Response.json(cliAuthConfiguration(process.env), { headers: { "Cache-Control": "no-store" } })
        } catch {
          return Response.json({ error: "CLI sign-in is not configured." }, { status: 503 })
        }
      }
    }
  }
})
