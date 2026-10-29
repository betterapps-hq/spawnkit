import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"

export const getCspNonce = createIsomorphicFn()
  .server(() => getRequestHeader("x-spawn-nonce"))
  .client(() => document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content)
