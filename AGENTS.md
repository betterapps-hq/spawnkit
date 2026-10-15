# SpawnKit

Read [docs/development.md](docs/development.md) for commands and [docs/README.md](docs/README.md) for product specifications.

- pnpm 12, Node.js 24+, Turborepo. Shared config lives under `packages/`.
- Use TypeScript, Vite/Rolldown, Oxlint, Oxfmt, Vitest, and Playwright.
- Run `pnpm verify` and relevant browser acceptance checks after a coherent implementation.
- Template catalog and composition belong in `@spawn/templates`; CLI and dashboard consume that shared contract.
- Keep generated projects standalone. Never overwrite existing projects or user files silently.
- Keep dashboard development features honest about unavailable backend operations.
- Do not edit `D:\agency`; it is an architectural reference.
- Put worktrees under `D:\system\worktrees\<repo-name>\<worktree-name>` and clean them up after use.
- Use Cloudflare `cf` unless the project already has a Wrangler configuration.
