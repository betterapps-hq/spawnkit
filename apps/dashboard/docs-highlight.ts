import { createHighlighter, type BundledLanguage, type SpecialLanguage } from "shiki"
import type { Plugin } from "vite"
import { agentDocuments } from "./src/lib/agent-docs"

/** Tokenize at build time; neither grammars nor the highlighter reach the browser. */
export function docsHighlight(): Plugin {
  return {
    name: "docs-highlight",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:docs-code") return "\0virtual:docs-code"
    },
    async load(id) {
      if (id !== "\0virtual:docs-code") return
      const blocks = agentDocuments.flatMap((doc) => doc.sections.flatMap((section) => section.blocks))
      const samples = blocks.flatMap((block) =>
        block.type === "code" ? [block] : block.type === "tabs" ? block.examples : []
      )
      const highlighter = await createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: [...new Set(samples.map((sample) => sample.language))]
      })
      try {
        const entries = samples.map((sample) => {
          const tokens = highlighter.codeToTokensWithThemes(sample.code, {
            lang: sample.language as BundledLanguage | SpecialLanguage,
            themes: { light: "github-light", dark: "github-dark" }
          })
          return [
            sample.language + "\n" + sample.code,
            tokens.map((line) =>
              line.map((token) => ({
                text: token.content,
                light: token.variants.light?.color,
                dark: token.variants.dark?.color
              }))
            )
          ]
        })
        return `export default ${JSON.stringify(Object.fromEntries(entries))}`
      } finally {
        highlighter.dispose()
      }
    }
  }
}
