import type { AgentDocument, DocBlock } from "./agent-docs"

const p = (text: string): DocBlock => ({ type: "paragraph", text })
const code = (label: string, language: string, code: string): DocBlock => ({ type: "code", label, language, code })
const table = (columns: string[], rows: string[][]): DocBlock => ({ type: "table", columns, rows })
const note = (title: string, text: string): DocBlock => ({ type: "note", title, text })

export const referenceDocuments: AgentDocument[] = [
  {
    id: "cli",
    navTitle: "CLI reference",
    group: "Reference",
    title: "SpawnKit CLI reference",
    description: "Use @spawnkit/cli to create and extend games, connect a project, and manage deployments.",
    summary:
      "A command-by-command reference to the implemented CLI. Local generation works without an account; hosted operations require access to a project.",
    sections: [
      {
        id: "installation",
        title: "Install or run @spawnkit/cli",
        blocks: [
          p(
            "Install Node.js 24 or newer and pnpm 12. Run the CLI directly without a global install. Both tabs invoke the same @spawnkit/cli package; generated game projects use pnpm for their dependencies and scripts."
          ),
          {
            type: "tabs",
            label: "Run the CLI",
            examples: [
              {
                label: "pnpm",
                language: "sh",
                code: "pnpm dlx @spawnkit/cli --help\npnpm dlx @spawnkit/cli --version"
              },
              { label: "npm / npx", language: "sh", code: "npx @spawnkit/cli --help\nnpx @spawnkit/cli --version" }
            ]
          },
          p(
            "The examples throughout these guides use `pnpm dlx @spawnkit/cli`. Replace that prefix with `npx @spawnkit/cli` if you prefer npm to launch the CLI. This does not change the generated project's package manager. See [Create a game with the CLI](/docs/create-with-cli) for the complete create, install, run, test, and build sequence."
          ),
          code("Optional global installation", "sh", "pnpm add --global @spawnkit/cli\nspawn --help\nspawn --version"),
          p(
            "After a global installation, use `spawn` in place of `pnpm dlx @spawnkit/cli`. The package is distributed on [npm](https://www.npmjs.com/package/@spawnkit/cli) and bundles its own runtime dependencies."
          )
        ]
      },
      {
        id: "create",
        title: "Discover and create",
        blocks: [
          code("Inspect every question and its choices", "sh", "pnpm dlx @spawnkit/cli catalog --json"),
          code(
            "Preview, then create a standalone game",
            "sh",
            "pnpm dlx @spawnkit/cli create phaser my-game --physics arcade --with vitest --dry-run\npnpm dlx @spawnkit/cli create phaser my-game --physics arcade --with vitest\ncd my-game\npnpm install\npnpm dev"
          ),
          p(
            "`create` takes a template (`pixi`, `phaser`, `babylon` or `three`) and a new or empty folder whose parent exists. Generation writes files but does not install dependencies. In a terminal, `create` asks each question the flags left open; run `pnpm dlx @spawnkit/cli create` with no arguments for guided setup."
          ),
          table(
            ["Option", "Behavior"],
            [
              [
                "`--physics`, `--ui`, `--simulation`, `--telemetry <add-on>`",
                "Answer a question, such as `--physics rapier2d`. The catalog lists each template's choices."
              ],
              ["`--no-<question>`", "Answer no to an optional question, such as `--no-telemetry`."],
              ["`--with <add-ons>`", "Comma-separated tools: `vitest`, `playwright`, `storybook`; repeatable."],
              [
                "`--preset <kit>`",
                "Start from a kit's answers, such as `init --preset phaser-arcade my-game`. It writes the same files as the kit's download."
              ],
              ["`--name <name>`", "Package name; defaults to the folder name."],
              ["`--dry-run`", "Show the plan without writing files."],
              ["`--yes`", "Apply without asking. Unanswered questions take their defaults."],
              ["`--json`", "Machine-readable output; interactive prompts are unavailable."]
            ]
          )
        ]
      },
      {
        id: "modules",
        title: "Add modules to an existing game",
        blocks: [
          code(
            "Review a module addition",
            "sh",
            "pnpm dlx @spawnkit/cli add vitest --cwd ./my-game --dry-run\npnpm dlx @spawnkit/cli add vitest --cwd ./my-game"
          ),
          table(
            ["Option", "Behavior"],
            [
              ["`--cwd <path>`", "Existing game folder; defaults to the current directory."],
              [
                "`--replace <add-on>`",
                "Swap the add-on that answers a question, such as `add koota --replace bitecs`; inspect the proposed changes first."
              ],
              ["`--yes`", "Accept a resolved plan. It does not permit overwriting conflicting edits."],
              ["`--dry-run --json`", "Inspect file changes and unresolved choices without writing."]
            ]
          ),
          p(
            "`status` shows the files SpawnKit manages and whether you changed them, and `upgrade` moves a game to the CLI's catalog version. Read [Updating an existing game](/docs/updating) for ownership records, conflict recovery, and verification. Renderer switching is not supported by `pnpm dlx @spawnkit/cli add`."
          )
        ]
      },
      {
        id: "account",
        title: "Sign in and select a project",
        blocks: [
          code(
            "Authorize and verify a project",
            "sh",
            "pnpm dlx @spawnkit/cli login --site https://spawnkit.cloud\npnpm dlx @spawnkit/cli auth status\npnpm dlx @spawnkit/cli link --project YOUR_PROJECT_ID"
          ),
          table(
            ["Command", "Contract"],
            [
              [
                "`pnpm dlx @spawnkit/cli login --site <url>`",
                "Open browser authorization. `--no-browser` prints the link instead. `SPAWN_SITE_URL` can supply the site."
              ],
              [
                "`pnpm dlx @spawnkit/cli auth status`",
                "Inspect local credentials only; it does not verify remote access."
              ],
              [
                "`pnpm dlx @spawnkit/cli link [--project <id>]`",
                "Verify access and save the game folder association. Without an ID, interactive mode offers project selection."
              ],
              ["`pnpm dlx @spawnkit/cli unlink`", "Remove the local association; hosted projects and releases remain."],
              [
                "`pnpm dlx @spawnkit/cli login --remote --email <email> --project <id>`",
                "Request one hour of access to one existing project. The owner approves a six-digit code in their browser; no localhost callback is needed."
              ],
              [
                "`pnpm dlx @spawnkit/cli logout`",
                "Revoke a remote-agent grant, then remove local credentials. Local OAuth and browser sessions are separate."
              ]
            ]
          ),
          p(
            "Link and unlink accept `--directory <path>` and `--json`. In the dashboard, open your project → Settings → General → Copy project ID. Replace YOUR_PROJECT_ID with that value and DEPLOYMENT_ID with the relevant deployment ID. See [Accounts and access](/docs/authentication) for sign-in recovery."
          )
        ]
      },
      {
        id: "deployments",
        title: "Deployment command surface",
        blocks: [
          table(
            ["Command", "Purpose and command-specific flags"],
            [
              [
                "`pnpm dlx @spawnkit/cli deploy`",
                "Upload source and follow the build. `--env sandbox|production`, `--dry-run`, `--yes`, `--no-wait`, `--request-id <id>`."
              ],
              ["`pnpm dlx @spawnkit/cli releases`", "List retained releases. `--cursor <cursor>` paginates results."],
              [
                "`pnpm dlx @spawnkit/cli status <deployment-id>`",
                "Read deployment state. Failed, cancelled, or superseded operations return exit code 1."
              ],
              [
                "`pnpm dlx @spawnkit/cli logs <deployment-id>`",
                "Read build output. `--cursor <cursor>` resumes pagination; `--follow` or `-f` watches until completion."
              ],
              [
                "`pnpm dlx @spawnkit/cli promote <release-id>`",
                "Promote a successful Sandbox release without rebuilding. Supports `--dry-run`, `--yes`, `--request-id <id>`."
              ],
              [
                "`pnpm dlx @spawnkit/cli rollback <release-id> --env <environment>`",
                "Activate retained compatible artifacts. Environment is required. Supports `--dry-run`, `--yes`, `--request-id <id>`."
              ]
            ]
          ),
          p(
            "All deployment commands accept `--project <id>`, `--directory <path>`, `--json`, and `--help`. The project is otherwise inferred from the nearest game folder. Deploy defaults to Sandbox when enabled, otherwise production; specify the environment explicitly when the target matters."
          ),
          code(
            "Inspect before deploying",
            "sh",
            "pnpm dlx @spawnkit/cli deploy --project YOUR_PROJECT_ID --env production --dry-run\npnpm dlx @spawnkit/cli deploy --project YOUR_PROJECT_ID --env production"
          ),
          note(
            "Source deployment requirements",
            "The game must include `game.config.json`, `package.json`, and `pnpm-lock.yaml`. Hosted installs use pnpm with a frozen lockfile and lifecycle scripts disabled. Private registries, Git dependencies, and build-time downloads are unsupported. Browser ZIP publishing accepts already-built output instead."
          ),
          p(
            "Ctrl+C stops watching, not the remote deployment. Use `pnpm dlx @spawnkit/cli logs DEPLOYMENT_ID --project YOUR_PROJECT_ID --follow` to reconnect. Rollback does not undo database migrations."
          )
        ]
      },
      {
        id: "automation",
        title: "Machine output and safe retries",
        blocks: [
          code(
            "Noninteractive plan and deployment",
            "sh",
            "pnpm dlx @spawnkit/cli deploy --project YOUR_PROJECT_ID --env production --dry-run --json\npnpm dlx @spawnkit/cli deploy --project YOUR_PROJECT_ID --env production --yes --json"
          ),
          p(
            "Successful command results go to stdout. Live deployment logs go to stderr in JSON mode. Login emits newline-delimited authorization and completion records. Check the process exit code and returned status; do not assume that receiving a deployment ID means the build succeeded."
          ),
          p(
            "Mutations in noninteractive mode require `--yes`. For retryable deployment mutations, choose a stable `--request-id` for that operation and reuse it only when retrying the same operation. Keep deployment IDs separately from release IDs: status/logs use deployment IDs, while promote/rollback use release IDs."
          ),
          code(
            "Inspect the installed version's contract",
            "sh",
            "pnpm dlx @spawnkit/cli --help\npnpm dlx @spawnkit/cli deploy --help\npnpm dlx @spawnkit/cli logs --help\npnpm dlx @spawnkit/cli rollback --help"
          )
        ]
      }
    ]
  },
  {
    id: "project-structure",
    navTitle: "Project structure",
    group: "Reference",
    title: "Project structure and configuration",
    description:
      "Understand the files in a generated game, configure its listing, and keep source, secrets, and build output separate.",
    summary:
      "Your downloaded kit is a standalone TypeScript project. Its files belong to you and do not depend on the SpawnKit repository.",
    sections: [
      {
        id: "files",
        title: "Find the file you need",
        blocks: [
          code(
            "Typical generated project; optional tools add more files",
            "text",
            "my-game/\n├── src/\n│   ├── main.ts\n│   └── score.ts\n├── public/media/cover.svg\n├── spawnkit/config.ts\n├── spawnkit/game.ts\n├── spawnkit/vite.ts\n├── spawnkit.config.ts\n├── spawn.jsonc\n├── game.config.json\n├── dev-domains.config.mjs\n├── vite.config.ts\n├── package.json\n├── tsconfig.json\n└── .spawn/lock.json"
          ),
          table(
            ["File or folder", "Responsibility"],
            [
              ["`src/`", "Game source. The renderer and selected modules determine its exact structure."],
              ["`public/`", "Static files copied to the build without import processing."],
              ["`game.config.json`", "Versioned scaffolding manifest; not the public game listing."],
              [
                "`spawnkit.config.ts` or `spawnkit.config.json`",
                "One configuration for title, description, genre, dimension, and release-relative media paths."
              ],
              [
                "`spawnkit/`",
                "Generated files: listing types, validation, the Vite plugin, and `game.ts`, which starts the add-ons. Change them through the CLI rather than by hand. No private package required."
              ],
              ["`dev-domains.config.mjs`", "Named local HTTPS endpoints."],
              ["`spawn.jsonc`", "The template and add-ons you chose. `spawn add` and `spawn config` change it."],
              [
                "`.spawn/lock.json`",
                "What SpawnKit generated, so later changes can keep your edits. Commit it; don't edit it by hand."
              ],
              ["`.spawn/project.json`", "Created by CLI linking; associates this folder with a hosted project."],
              [
                "`pnpm-lock.yaml`",
                "Created by installation. Commit it for reproducible installs and source deployment."
              ],
              ["`dist/`", "Generated browser build. Rebuild instead of editing these files."]
            ]
          )
        ]
      },
      {
        id: "scripts",
        title: "Run the project's scripts",
        blocks: [
          code(
            "Install, develop, and validate",
            "sh",
            "pnpm install\npnpm dev\n# Stop the development server before continuing.\npnpm lint\npnpm build\npnpm preview"
          ),
          p(
            "`build` checks TypeScript and creates the Vite production output. `preview` serves that output locally. Test, E2E, and Storybook scripts exist only when their add-ons are selected; inspect `package.json` before using them. Generated projects and hosted source builds currently use pnpm."
          )
        ]
      },
      {
        id: "assets",
        title: "Asset paths from source to release",
        blocks: [
          code(
            "Static file mapping",
            "text",
            "public/media/cover.webp → dist/media/cover.webp\nListing coverPath: media/cover.webp\nBrowser URL: /media/cover.webp"
          ),
          p(
            "Use `public/` for assets that need a stable filename. Assets imported from source are processed by Vite and may receive hashed filenames. Keep listing media under `public/` so their release-relative paths remain predictable. Match filename capitalization exactly; hosted files are case-sensitive."
          ),
          p("For a full listing configuration and ZIP commands, see [Publishing examples](/docs/publishing-examples).")
        ]
      },
      {
        id: "environment",
        title: "Local environment and public configuration",
        blocks: [
          code("Optional .env override", "sh", "SPAWN_GAME_DOMAIN=my-game.spawnkit.games"),
          p(
            "No domain override is needed for local development. If you set `SPAWN_GAME_DOMAIN`, use your project's assigned production hostname, not an arbitrary custom name. Verified CLI linking normally supplies the assigned hostname automatically. Run `pnpm exec dev-domains urls` to see the addresses and `pnpm exec dev-domains doctor` to diagnose local setup."
          ),
          note(
            "Browser-visible values",
            "Vite's `VITE_` variables are compiled into browser code. Never put private API keys, account tokens, or server credentials in them. Keep local `.env` files and credentials out of uploaded artifacts."
          ),
          p(
            "Changing the listing configuration requires a new production build. Changing `.spawn/project.json` by hand is not an authorization mechanism; use the CLI link flow to verify account access."
          )
        ]
      }
    ]
  },
  {
    id: "publishing-examples",
    navTitle: "Publishing examples",
    group: "Reference",
    title: "A complete publishing example",
    description:
      "Configure a game listing, build and package browser files, verify the release, and publish an update.",
    summary:
      "Follow a small example from editable source to a ZIP with index.html at its root. Use your own game title, description, and artwork.",
    sections: [
      {
        id: "listing",
        title: "1. Configure the listing",
        blocks: [
          p(
            "Choose one format for the same game listing. New kits detect `spawnkit.config.ts` or `spawnkit.config.json` at the project root and produce `dist/spawnkit.config.json`. TypeScript adds editor type checks; JSON needs no code. Keep one source file, because duplicate configurations stop the build."
          ),
          {
            type: "tabs",
            label: "Game listing format",
            examples: [
              {
                label: "TypeScript",
                language: "ts",
                code: 'import { defineConfig } from "./spawnkit/config"\n\nexport default defineConfig({\n  title: "Golden Dash",\n  description: "Collect gold and dodge obstacles in a fast arcade challenge.",\n  genre: "Arcade",\n  dimension: "2D",\n  coverPath: "media/cover.webp",\n  details: {\n    objective: "Collect as much gold as possible.",\n    controls: "Move with the arrow keys.",\n    devices: "Desktop keyboard"\n  }\n})'
              },
              {
                label: "JSON",
                language: "json",
                code: '{\n  "schemaVersion": 1,\n  "title": "Golden Dash",\n  "description": "Collect gold and dodge obstacles in a fast arcade challenge.",\n  "genre": "Arcade",\n  "dimension": "2D",\n  "coverPath": "media/cover.webp",\n  "details": {\n    "objective": "Collect as much gold as possible.",\n    "controls": "Move with the arrow keys.",\n    "devices": "Desktop keyboard"\n  }\n}'
              }
            ]
          },
          p(
            "Save the TypeScript example as `spawnkit.config.ts`, or the JSON alternative as `spawnkit.config.json`, beside `package.json`. Supply a real `public/media/cover.webp` file up to 1 MiB. To add video, set `trailerPath` to `media/trailer.mp4` and supply that file under `public/`: at most 2 MiB and 60 seconds. Start on gameplay; the preview uses the beginning of the clip."
          )
        ]
      },
      {
        id: "build",
        title: "2. Build and inspect",
        blocks: [
          code("From your game folder", "sh", "pnpm lint\npnpm build\npnpm preview"),
          p(
            "Open the preview URL. Play through movement, scoring, restart, and any audio interaction. Check the browser console and network panel. Confirm `dist/index.html`, `dist/spawnkit.config.json`, and your referenced media exist. Stop preview before packaging."
          )
        ]
      },
      {
        id: "zip",
        title: "3. Package the contents of dist",
        blocks: [
          p(
            "Run one of these from your game root. The Bash example needs the `zip` utility installed. Both examples stop if `game-release.zip` already exists, so an older archive cannot silently retain stale files."
          ),
          {
            type: "tabs",
            label: "Create the release archive",
            examples: [
              {
                label: "PowerShell",
                language: "powershell",
                code: 'if (Test-Path -LiteralPath "game-release.zip") {\n  throw "game-release.zip already exists; choose a new filename."\n}\nCompress-Archive -Path "dist/*" -DestinationPath "game-release.zip"'
              },
              {
                label: "Bash / Zsh",
                language: "sh",
                code: 'if [ -e game-release.zip ]; then\n  echo "game-release.zip already exists; choose a new filename." >&2\nelse\n  (cd dist && zip -r ../game-release.zip .)\nfi'
              }
            ]
          },
          code(
            "Inspect the archive before uploading",
            "text",
            "game-release.zip\n├── index.html\n├── assets/\n├── media/cover.webp\n└── spawnkit.config.json"
          ),
          p(
            "There must be no outer `dist/` directory in the archive. Keep the expanded build below 20 MiB and fewer than 1,996 files. See [Publish your game](/docs/publishing#upload) for upload limits and the dashboard steps."
          )
        ]
      },
      {
        id: "verify",
        title: "4. Publish and verify the live game",
        blocks: [
          p(
            "Open [Upload game](/dashboard/upload), select the archive, review the imported details and media, and deploy. This flow creates a new project. Wait for a successful result, then open the returned game URL in a fresh browser tab."
          ),
          table(
            ["Check", "Expected result"],
            [
              ["First load", "The game starts and required requests succeed."],
              ["Gameplay", "Controls, scoring, and restart match your local preview."],
              ["Media", "Cover and optional trailer appear, or the deployment reports an actionable omission warning."],
              ["Discovery", "Listing approval is tracked separately from successful hosting."]
            ]
          )
        ]
      },
      {
        id: "updates",
        title: "5. Update the same hosted project",
        blocks: [
          p(
            "Keep the existing project ID. Repeatedly using the new-game upload flow creates separate projects. After @spawnkit/cli is published, link your source folder to the intended project and review the deployment plan before sending an update."
          ),
          code(
            "Update a generated game",
            "sh",
            "pnpm dlx @spawnkit/cli login --site https://spawnkit.cloud\npnpm dlx @spawnkit/cli link --project YOUR_PROJECT_ID\npnpm install\npnpm lint\npnpm build\npnpm dlx @spawnkit/cli deploy --env production --dry-run\npnpm dlx @spawnkit/cli deploy --env production"
          ),
          p(
            "This source-deployment example is for a generated SpawnKit game with game.config.json and a pnpm lockfile. It does not adopt an arbitrary uploaded HTML game. It is a separate path from uploading a built ZIP. Use the [CLI reference](/docs/cli#deployments) for logs, release promotion, and rollback. Until the package is published, use [support](/contact#support) for an existing-project publishing path rather than creating a duplicate."
          )
        ]
      }
    ]
  },
  {
    id: "testing",
    navTitle: "Testing and debugging",
    group: "Reference",
    title: "Test and debug your game",
    description:
      "Check game logic, run browser tests, diagnose blank canvases, and reproduce production-only failures.",
    summary:
      "Combine automated checks with a short playthrough of the production build. A successful build alone does not verify gameplay.",
    sections: [
      {
        id: "baseline",
        title: "Start with the available checks",
        blocks: [
          code("Every generated kit", "sh", "pnpm lint\npnpm build\npnpm preview"),
          p(
            "Read `package.json` before running optional scripts. The Vitest add-on provides `test`; the Playwright add-on provides `e2e` and `e2e:ui`. Both use Chromium. New kits prepare the matching browser automatically when you run tests locally; later runs reuse the download."
          ),
          code("When the test add-ons are installed", "sh", "pnpm test\npnpm e2e"),
          p(
            "Use [Updating an existing game](/docs/updating) to add missing test tools safely. A missing script is a configuration issue, not a failing game test."
          )
        ]
      },
      {
        id: "browser-setup",
        title: "Prepare the test environment",
        blocks: [
          p(
            "With either test add-on selected, `pnpm run setup` prepares local HTTPS and Chromium together. Your operating system may ask you to trust a local development certificate. This does not create a cloud project or register a public domain. To prepare only the browser, run `pnpm test:setup`. Dependency installation itself does not download browsers or change certificate trust."
          ),
          code("Optional setup before the first test", "sh", "pnpm run setup"),
          code("Interactive Playwright tests", "sh", "pnpm e2e:ui\npnpm e2e --grep keyboard"),
          p(
            "These commands require the Playwright add-on. The test server starts automatically at `http://127.0.0.1:4173`; you do not need domain setup or a running `pnpm dev`. Set `SPAWN_E2E_HTTPS=1` to test a named HTTPS origin after local domain setup; CI always uses loopback. Change `e2e/game.spec.ts` to test your game's behavior."
          ),
          code(
            "Linux CI runner; both test add-ons selected",
            "sh",
            "pnpm install --frozen-lockfile\npnpm test:setup --with-deps\npnpm test\npnpm e2e"
          ),
          p(
            "Commit your lockfile before using this CI example. CI skips automatic browser downloads and uses a loopback test server. On supported Linux runners, `--with-deps` installs system libraries and may require administrator access. For an already prepared offline machine, set `SPAWN_SKIP_BROWSER_INSTALL=1`. If a download fails, tests stop: check network/proxy access and retry `pnpm test:setup`."
          )
        ]
      },
      {
        id: "logic",
        title: "Test a game rule",
        blocks: [
          p(
            "The generated `src/score.ts` exports `advanceScore`. Its test belongs in `src/score.test.ts`. Test behavior players depend on, including boundary values, rather than copying the function's implementation."
          ),
          code(
            "src/score.test.ts; requires the Vitest add-on",
            "ts",
            'import { expect, it } from "vitest"\nimport { advanceScore } from "./score"\n\nit("awards the first collectible", () => {\n  expect(advanceScore(0)).toBe(1)\n})\n\nit("preserves the accumulated score", () => {\n  expect(advanceScore(41)).toBe(42)\n})'
          ),
          p(
            "Run `pnpm test`. Both assertions should pass with the generated score function. If you change the scoring rules, update the expected behavior deliberately. Keep coverage checks enabled and add cases for new branches."
          )
        ]
      },
      {
        id: "browser",
        title: "Verify behavior in a real browser",
        blocks: [
          p(
            "Use the generated Playwright configuration and existing test location as your starting point. It supplies the application's test origin and server. Canvas presence is a useful smoke check, but it does not prove the player moved or the game rules worked."
          ),
          code(
            "e2e/smoke.spec.ts; requires the Playwright add-on",
            "ts",
            'import { expect, test } from "@playwright/test"\n\ntest("opens the game without an uncaught error", async ({ page }) => {\n  const errors: string[] = []\n  page.on("pageerror", error => errors.push(error.message))\n  await page.goto("/")\n  await expect(page.locator("canvas")).toBeVisible()\n  await page.keyboard.press("ArrowRight")\n  expect(errors).toEqual([])\n})'
          ),
          p(
            "Save the example as `e2e/smoke.spec.ts` and run `pnpm e2e`. Extend it with observable outcomes specific to your game: a score label changes, a restart button resets the scene, or a level-complete screen appears. Test touch controls on a phone-sized viewport when you advertise mobile support. Check audio after a user gesture."
          )
        ]
      },
      {
        id: "diagnosis",
        title: "Diagnose the first failure",
        blocks: [
          p(
            "To find a browser error, open your browser's developer tools from its menu, choose Console, and reload the game. Start with the first red error. In Network, reload again and look for failed file requests; their URLs can reveal a wrong asset path. Share the error text with your agent, without credentials."
          ),
          table(
            ["Symptom", "Check next"],
            [
              [
                "Blank canvas",
                "Read the first console error. Confirm the renderer initializes, the canvas has a size, and required assets load."
              ],
              [
                "Missing artwork or sound",
                "Inspect the failed network URL, filename case, and whether the file exists in dist. A public/ prefix is not part of the browser URL."
              ],
              [
                "Local HTTPS does not open",
                "Run `pnpm exec dev-domains doctor` and `pnpm exec dev-domains urls`. Follow certificate setup; check the printed origin."
              ],
              [
                "Browser executable missing",
                "Retry `pnpm test:setup`. Check network/proxy access if the download fails."
              ],
              [
                "Works in development only",
                "Rebuild and use `pnpm preview`. Check browser-visible environment variables and production asset paths."
              ],
              [
                "Hosted source install fails",
                "Commit an up-to-date pnpm lockfile. Check for private registries, Git dependencies, or required install scripts."
              ],
              [
                "Old behavior after deployment",
                "Confirm the project, active release, and URL; inspect cache/service-worker behavior in the browser."
              ]
            ]
          ),
          p(
            "Fix the earliest actionable error, then rerun the same steps. Avoid changing multiple unrelated systems before you can reproduce the failure."
          )
        ]
      },
      {
        id: "report",
        title: "Make a useful failure report",
        blocks: [
          p(
            "Open [Dashboard → Deployments → release → Build logs](/docs/dashboard#deployments) for the working browser path. Use [CLI installation](/docs/cli#installation) to run the deployment commands below. Record the exact steps, expected result, actual result, browser/device, and whether it happens in development, preview, or the hosted release. Include the first console error and relevant failed request. For hosted builds, include the project and deployment IDs plus the failing log excerpt. Remove tokens and credentials before sharing."
          ),
          code(
            "Retrieve deployment diagnostics",
            "sh",
            "pnpm dlx @spawnkit/cli status DEPLOYMENT_ID --project YOUR_PROJECT_ID\npnpm dlx @spawnkit/cli logs DEPLOYMENT_ID --project YOUR_PROJECT_ID"
          )
        ]
      }
    ]
  },
  {
    id: "updating",
    navTitle: "Add tools and modules",
    group: "Reference",
    title: "Add tools to an existing game",
    description:
      "Add modules without losing custom code, handle conflicts, and validate changes before publishing an update.",
    summary: "Keep a recoverable baseline, inspect the proposed changes, and verify one addition at a time.",
    sections: [
      {
        id: "baseline",
        title: "1. Save a working baseline",
        blocks: [
          p(
            "Commit your working game or make a separate backup before changing modules. Record what currently passes: lint, build, installed tests, and a short playthrough. Keep `spawn.jsonc`, `.spawn/lock.json`, `game.config.json`, and your pnpm lockfile; they describe the generated project and its dependency state."
          ),
          code("Inspect and verify the current project", "sh", "git status --short\npnpm lint\npnpm build"),
          p(
            "If the folder is not a Git repository, use your backup workflow instead of the Git command. Do not delete edited files to make an addition succeed."
          )
        ]
      },
      {
        id: "preview",
        title: "2. Preview a module addition",
        blocks: [
          note(
            "Review before applying",
            "Use [CLI installation](/docs/cli#installation) to run the commands below. A dry run shows files and conflicts before any changes are applied."
          ),
          code(
            "Inspect available modules and proposed changes",
            "sh",
            "pnpm dlx @spawnkit/cli catalog --json\npnpm dlx @spawnkit/cli status\npnpm dlx @spawnkit/cli add vitest --dry-run"
          ),
          p(
            "`.spawn/lock.json` records what SpawnKit generated, so it can compare that with the new generated file and your current file. Starter files merge with your edits, and your keys in JSON files are kept; a conflicting edit stops the operation and asks. The CLI does not switch renderers through `pnpm dlx @spawnkit/cli add`."
          )
        ]
      },
      {
        id: "apply",
        title: "3. Apply and inspect",
        blocks: [
          code(
            "Add tests, then install their dependencies",
            "sh",
            "pnpm dlx @spawnkit/cli add vitest\npnpm install\ngit diff --stat\ngit diff"
          ),
          p(
            "Review and accept the CLI confirmation before installation. In automation, pass `--yes` only after reviewing a resolved dry run. Review source and configuration changes, not just the file count. Keep your game-specific logic, listing, and user-written `AGENTS.md` instructions. Commit the updated lockfile with the addition. `--yes` accepts a resolved plan; it cannot force an overwrite of conflicting edits."
          )
        ]
      },
      {
        id: "conflicts",
        title: "Handle conflicts",
        blocks: [
          table(
            ["Problem", "Safe next step"],
            [
              [
                "Edited file conflicts with the new module",
                "Read the proposed changes, compare against a separate generated project, and merge intentionally."
              ],
              [
                "Another add-on already answers that question",
                "Inspect `pnpm dlx @spawnkit/cli catalog` and the dry run. Use `--replace <add-on>` only when you intend to replace it."
              ],
              [
                "Missing or unsupported ownership record",
                "Run the command from your generated project root. Do not fabricate or edit `.spawn/lock.json`."
              ],
              ["Different renderer desired", "Create a new project and port game logic and assets deliberately."]
            ]
          ),
          code(
            "Create a comparison project in a new directory",
            "sh",
            "pnpm dlx @spawnkit/cli create phaser comparison-game --with vitest --dry-run\npnpm dlx @spawnkit/cli create phaser comparison-game --with vitest"
          ),
          p(
            "Choose your actual renderer and modules; the example uses Phaser. The destination must be a new or empty folder. A comparison project is a reference, not a replacement for the original."
          )
        ]
      },
      {
        id: "verify",
        title: "4. Verify and release",
        blocks: [
          code("After adding the Vitest module", "sh", "pnpm lint\npnpm test\npnpm build\npnpm preview"),
          p(
            "Play through existing behavior and the feature you changed. If the checks pass, review the diff and save the new baseline. Follow [Publishing an update](/docs/publishing-examples#updates) to target the same hosted project."
          ),
          p(
            "If the addition fails verification, preserve any new work before restoring your known-good baseline. Reinstall from the restored lockfile and repeat the checks. Hosted rollback is a separate operation; it restores retained release artifacts and does not undo database migrations."
          )
        ]
      }
    ]
  }
]
