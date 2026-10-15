import { IncludedTool } from "./included-tool"

export function Toolchain() {
  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      {[
        {
          title: "Language",
          tools: [
            {
              name: "TypeScript",
              what: "Typed JavaScript for your game code.",
              why: "Catch type errors and get editor completion.",
              href: "https://www.typescriptlang.org/"
            }
          ]
        },
        {
          title: "Linting & formatting",
          tools: [
            {
              name: "Oxlint",
              what: "Code linting.",
              why: "Find common mistakes before building.",
              href: "https://oxc.rs/docs/guide/usage/linter"
            },
            {
              name: "Oxfmt",
              what: "Code formatting.",
              why: "Keep source formatting consistent.",
              href: "https://oxc.rs/docs/guide/usage/formatter"
            }
          ]
        }
      ].map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="mb-4 text-sm font-semibold">{group.title}</h2>
          <div className="space-y-3">
            {group.tools.map((tool) => (
              <IncludedTool
                key={tool.name}
                name={tool.name}
                what={tool.what}
                why={tool.why}
                includes="Included in every starter kit."
                links={[{ label: "Website", href: tool.href }]}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
