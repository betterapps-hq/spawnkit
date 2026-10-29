// Infer only the binding types, keeping Workers globals out of browser code.
declare module "cloudflare:workers" {
  type Config = import("cf/config").UnwrapConfig<typeof import("../cloudflare.config").default>
  type Worker = import("cf/config").UnwrapConfig<Config["worker"]>
  export const env: import("cf/config").InferEnv<Worker>
}
