# SpawnKit

Repository checks, staging releases, manual production promotion and PR app/Storybook previews are documented in [CI/CD](docs/internal/ci-cd.md).

A web-game hosting platform in development. This first slice provides a composable game generator and a local dashboard for choosing a template.

Requires Node.js 24+ and pnpm 12 (exact development versions are pinned in `.nvmrc` and `package.json`).

```sh
pnpm install
pnpm dev:setup
pnpm dev
```

Create a standalone game from this checkout:

```sh
pnpm cli init ../my-game --template pixi --with bitecs,vitest
cd ../my-game
pnpm install
pnpm dev:setup
pnpm dev
```

Choose `pixi`, `phaser`, `babylon`, or `three`. Optional add-ons are bitECS, Vitest, Playwright, and Storybook. Run `pnpm cli init` for guided setup, including a Storybook question. Use `pnpm cli templates --json` to inspect choices and `--dry-run --json` on `init` to preview generated files. Existing directories are never overwritten.

The dashboard and CLI share the template catalog. Clerk sign-in connects the dashboard to authenticated project, deployment and telemetry APIs. Production and internal staging use separate credentials and data. Hosted builds still require Workers Paid. The production GitHub App is configured and its signed webhook ping is verified; repository-driven deployments remain unverified. Multiplayer orchestration and billing remain planned work.

Run `pnpm storybook` for the dashboard component workshop (Agency-derived config). Game scaffolds can select `--with storybook` for a standalone HTML/Vite workshop. Physics/UI and telemetry options are available through CLI flags and the dashboard.

Local development uses `https://local.spawnkit.cloud`; Storybook uses `https://stories.local.spawnkit.cloud`. Run `pnpm dev:urls` for API, telemetry and isolated test origins. See [the domain contract](docs/domains.md), [platform operations](docs/internal/platform-operations.md), [development](docs/development.md), [project templates](docs/project-templates.md), and [all product specifications](docs/README.md).
