declare module "virtual:docs-code" {
  const tokens: Record<string, { text: string; light: string; dark: string }[][]>
  export default tokens
}
