import { notFoundMarkup, notFoundTitle } from "@spawn/platform/not-found"
import styles from "@spawn/platform/not-found.css?raw"

const html = `<!doctype html>
<html lang="en" class="spawn-host-error">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
  <title>${notFoundTitle}</title>
  <style>body{margin:0}${styles}</style>
</head>
<body>${notFoundMarkup("https://spawnkit.cloud/")}</body>
</html>`

export function gameNotFound(request: Request) {
  return new Response(request.method === "HEAD" ? null : html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
    }
  })
}
