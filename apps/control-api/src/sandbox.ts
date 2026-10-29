import { Sandbox as CloudflareSandbox } from "@cloudflare/sandbox"
import { blockedBuildRequest, dependencyRequest } from "./build-network"

/** The provider network boundary applies even if creator code gains root inside its container. */
export class Sandbox extends CloudflareSandbox<Env> {
  override enableInternet = false
  override interceptHttps = true
}
Sandbox.outbound = blockedBuildRequest
Sandbox.outboundHandlers = { dependencies: dependencyRequest, blocked: blockedBuildRequest }
