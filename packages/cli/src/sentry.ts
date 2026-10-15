export function validateSentryDsn(value: string = ""): string | undefined {
  if (!value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (
      url.protocol === "https:" &&
      /^[a-zA-Z0-9]+$/.test(url.username) &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /\/\d+$/.test(url.pathname) &&
      !/[\s"'`$\\]/.test(value.trim())
    )
      return undefined
  } catch {
    /* Show a helpful error without echoing the supplied value. */
  }
  return "Enter a public HTTPS Sentry DSN (https://public-key@host/project-id), or leave blank to set it up later."
}
