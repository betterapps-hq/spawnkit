# Documentation experience

Redesign requested 2026-10-17. Documentation should help a reader complete a real task, return to a specific answer, and give the same maintained instructions to an agent.

## Delivered design and content

- [x] Replace inherited marketing typography with a scoped documentation hierarchy: 38px desktop / 30px mobile page titles and 23px / 21px section headings.
- [x] Provide a bounded reading column, grouped guide navigation, sticky desktop section outline, section permalinks, and previous/next guides.
- [x] Provide native expandable navigation and section outlines on mobile, with light and dark themes.
- [x] Add local full-text search over guide sections, commands and reference tables, with direct section links, keyboard navigation, Ctrl/Cmd+K and Escape.
- [x] Rewrite all five guides with prerequisites, actionable steps, expected outcomes, examples, troubleshooting and useful next links.
- [x] Correct dashboard publishing to the live browser-build ZIP workflow: zip the contents of dist, place index.html at the archive root, review Details and Media, then deploy.
- [x] Keep source-upload CLI instructions separate and explicitly limited to existing official installations.
- [x] Render commands, file layouts, lists, callouts, inline code and reference tables as appropriate semantic elements.
- [x] Offer copying for individual code examples and whole-page Markdown, with failure feedback.
- [x] Generate HTML, Markdown and downloadable skill references from the same structured content. Convert website-relative links to absolute links in portable Markdown.

## Authoring and maintenance

`apps/dashboard/src/lib/agent-docs.ts` owns the guides. Add explicit, stable section IDs so saved links and search results remain useful. Supported blocks are paragraphs, lists, code, notes and tables; inline content supports links, bold text and code. Keep deployment and authentication instructions grounded in the current product. Use the verified `@spawnkit/cli` installation commands.

`apps/dashboard/src/routes/docs.$slug.tsx` renders the documentation and navigation. `docs-search.tsx` searches the maintained content locally without sending a query to an external service. `agent-docs.css` deliberately scopes selectors above the public marketing rules, independent of stylesheet load order.

## Acceptance

- [x] Final full repository verification after the search addition (`work/docs-redesign-verify-final.log`).
- [x] All 18 desktop/mobile SEO acceptance checks pass, including every guide in both themes, exact Markdown copying, code copying, anchors, navigation, search results, keyboard selection, no-results state and Escape (`work/docs-redesign-browser-final.log`).
- [x] Production deployment and live verification. Dashboard version `5e577ce7-2001-486b-b3a5-c16c477b80eb` is live. All five HTML guides return 200 with one canonical and their section anchors; all five Markdown responses match the maintained source (`work/docs-redesign-live.json`). Live Chrome checks confirmed search results and Escape behavior. Screenshot: `work/docs-redesign-live.png`.

Copy for your agent and editorial articles remain in the final phase. This redesign improves the existing product documentation.

The selected follow-up guides, syntax highlighting, example tabs, and decorative-dot cleanup are tracked in [Documentation reference expansion](docs-reference-expansion.md).
