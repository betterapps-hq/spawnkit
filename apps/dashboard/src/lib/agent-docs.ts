import { remoteAuthSections } from "./agent-auth-docs"
import { referenceDocuments } from "./docs-reference"
import { workflowDocuments } from "./docs-workflows"
import { documentIds } from "./document-ids"
/** Shared source for the website, Markdown guides and downloadable agent skill. */
export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "code"; label: string; code: string; language: string }
  | { type: "tabs"; label: string; examples: { label: string; code: string; language: string }[] }
  | { type: "note"; title: string; text: string }
  | { type: "table"; columns: string[]; rows: string[][] }
export type AgentDocument = {
  id: string
  navTitle: string
  group: string
  title: string
  description: string
  summary: string
  sections: { id: string; title: string; blocks: DocBlock[] }[]
}

export const agentDocuments: AgentDocument[] = [
  {
    id: "getting-started",
    navTitle: "Quickstart",
    group: "Build",
    title: "Build your first game",
    description:
      "Go from a starter kit to a playable browser game on your computer. Bring your own editor or coding agent.",
    summary: "Download a standalone game kit, run it locally, and make your first change.",
    sections: [
      {
        id: "before-you-start",
        title: "Before you start",
        blocks: [
          {
            type: "paragraph",
            text: "You need **Node.js 24 or newer**, **pnpm 12**, and a code editor. You can download a kit and build locally without a SpawnKit account."
          },
          {
            type: "paragraph",
            text: "Choose your starting point: [Create with the CLI](/docs/create-with-cli), download a kit below, or [upload an existing browser game](/docs/upload-existing-game). Building with an AI agent? Follow the [Codex](/docs/codex), [Claude Code](/docs/claude-code), or [Cursor](/docs/cursor) guide. Use the [dashboard guide](/docs/dashboard) when you are ready to manage a hosted game."
          },
          {
            type: "code",
            label: "Check your tools",
            code: "node --version\npnpm --version",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "If either command is missing, install [Node.js](https://nodejs.org/en/download) and [pnpm](https://pnpm.io/installation) before continuing."
          }
        ]
      },
      {
        id: "choose-a-kit",
        title: "1. Choose a starting point",
        blocks: [
          {
            type: "paragraph",
            text: "Each kit includes TypeScript source, a small playable scene, local development tools, and a production build. Not sure where to start? Choose [Phaser](/kits/phaser) for a simple 2D game. You can edit every part of the game."
          },
          {
            type: "table",
            columns: ["Kit", "Start here for"],
            rows: [
              ["[PixiJS](/kits/pixi)", "2D sprites and a lightweight rendering foundation."],
              ["[Phaser](/kits/phaser)", "2D games built around Phaser scenes."],
              ["[Babylon.js](/kits/babylon)", "3D games with Babylon.js rendering."],
              ["[Three.js](/kits/three)", "3D scenes built with Three.js."],
              ["[Phaser + Arcade Physics](/kits/phaser-arcade)", "A 2D starting scene with movement and collisions."],
              ["[Three.js + Rapier](/kits/three-rapier)", "A 3D starting scene with a dedicated physics engine."]
            ]
          },
          {
            type: "paragraph",
            text: "Download the ZIP from a kit page and extract it into a new folder. Open the extracted project folder containing `package.json` in your editor. Use the [kit builder](/templates) if you want to choose your own combination of tools."
          },
          {
            type: "note",
            title: "Already have a project?",
            text: "Extract into a separate folder to compare files. Follow [Extend a game](/docs/extend) to work on an existing project without replacing your changes."
          }
        ]
      },
      {
        id: "run-locally",
        title: "2. Run the game",
        blocks: [
          {
            type: "paragraph",
            text: "Open a terminal in the project folder, then install its dependencies and start the development server."
          },
          {
            type: "code",
            label: "Terminal · inside your game folder",
            code: "pnpm install\npnpm dev",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Open the local address printed in the terminal. In the starter scene, use the arrow keys to move and collect gold. Leave the terminal running while you edit; stop the server with Ctrl+C."
          },
          {
            type: "note",
            title: "First-time local HTTPS setup",
            text: "The development server uses a named HTTPS address. Follow the local certificate setup when prompted. If setup needs attention, run `pnpm exec dev-domains doctor`. For a plain local Vite server, stop the existing server and run `pnpm exec vite`; use the address it prints."
          }
        ]
      },
      {
        id: "make-a-change",
        title: "3. Make it yours",
        blocks: [
          {
            type: "paragraph",
            text: "Start with one visible change: update the heading in `index.html`, save it, and check the browser. Then open `src/main.ts` to change the scene, artwork, or game behavior."
          },
          {
            type: "table",
            columns: ["File or folder", "What it controls"],
            rows: [
              ["`src/main.ts`", "The entry point for your chosen rendering engine."],
              ["`src/`", "Game logic and any selected simulation modules."],
              ["`public/`", "Static artwork, audio, and other game assets."],
              ["`spawnkit.config.ts`", "The title, description, and media for your game listing."],
              ["`package.json`", "Installed dependencies and available commands."],
              ["`AGENTS.md`", "Project instructions for your coding agent."]
            ]
          },
          {
            type: "paragraph",
            text: "Working with an agent? Open the project in your agent and have it read `AGENTS.md` before editing. For the reusable create, extend, and publish workflow, see [Agent resources](/docs/api#agent-skill)."
          }
        ]
      },
      {
        id: "check-your-game",
        title: "4. Check the game and build",
        blocks: [
          {
            type: "paragraph",
            text: "Run these checks before sharing a build. Curated kits include browser-based Vitest tests; Chromium only needs to be installed once on each machine."
          },
          {
            type: "code",
            label: "Terminal · check and build",
            code: "pnpm lint\npnpm test\npnpm build",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "A successful build creates `dist/`, the files your players will load. Keep the `pnpm-lock.yaml` created during installation so future installs use the same resolved dependencies."
          },
          {
            type: "list",
            items: [
              "Play through the starter scene and check movement and scoring.",
              "Resize the browser and check that the game stays usable.",
              "Check the browser console for errors.",
              "If you chose a custom kit, run only the test scripts included in its `package.json`."
            ],
            ordered: false
          },
          {
            type: "paragraph",
            text: "Ready to share? Follow [Publish your game](/docs/publishing) to upload your browser build."
          }
        ]
      },
      {
        id: "troubleshooting",
        title: "If something gets stuck",
        blocks: [
          {
            type: "table",
            columns: ["What you see", "What to try"],
            rows: [
              [
                "`pnpm` or `node` is not recognized",
                "Install the required tool, reopen your terminal, and check its version."
              ],
              [
                "The local address does not open",
                "Keep the development terminal running. Run `pnpm exec dev-domains doctor`, or use `pnpm exec vite` for a plain local server."
              ],
              ["Tests cannot find a browser", "Run `pnpm test:setup`, then retry `pnpm test`."],
              [
                "The page is blank",
                "Check the terminal and browser console. Confirm you opened the development URL, rather than opening `index.html` directly."
              ]
            ]
          },
          {
            type: "note",
            title: "About the SpawnKit CLI",
            text: "Run `pnpm dlx @spawnkit/cli` to create or extend a game. See [Create with the CLI](/docs/create-with-cli) for the complete create, install, test, and build sequence."
          }
        ]
      }
    ]
  },
  {
    id: "extend",
    navTitle: "Extend a game",
    group: "Build",
    title: "Extend your game",
    description: "Add mechanics, replace artwork, and evolve your project without losing the work you already have.",
    summary: "Find the right files, make a focused change, and check it in a playable build.",
    sections: [
      {
        id: "get-oriented",
        title: "Understand your project",
        blocks: [
          {
            type: "paragraph",
            text: "A downloaded SpawnKit game is a standalone project. You can work on it with your editor and the packages it already includes; you do not need the SpawnKit repository."
          },
          {
            type: "list",
            items: [
              "Read `AGENTS.md` for the project's instructions.",
              "Check `package.json` for the installed engine, dependencies, and scripts.",
              "Read `spawn.jsonc` for the template and add-ons the game was created with.",
              "Start at `src/main.ts`, then follow its imports into the game logic."
            ],
            ordered: false
          },
          {
            type: "paragraph",
            text: "Before a larger change, save a Git commit or copy your game folder to a separate backup location. Keep existing artwork, saves, and local configuration. For generated tools, use [Add tools and modules](/docs/updating); for verification, see [Testing and debugging](/docs/testing)."
          }
        ]
      },
      {
        id: "change-the-game",
        title: "Build one playable change at a time",
        blocks: [
          {
            type: "paragraph",
            text: "Choose a small outcome you can test: a new collectible, a different movement speed, an obstacle, or a score display. Use the rendering engine already installed in the project."
          },
          {
            type: "list",
            items: [
              "Run `pnpm dev` and establish that the current game works.",
              "Make the smallest change that produces the behavior you want.",
              "Try it in the browser with real input, including its failure or reset state.",
              "Run the project's checks, then save that working version before the next change."
            ],
            ordered: true
          },
          {
            type: "note",
            title: "Adding assets",
            text: "Put static assets in `public/` and reference them using their browser path. For example, `public/art/player.png` is served at `/art/player.png`. Check file sizes before shipping large textures or audio."
          }
        ]
      },
      {
        id: "add-modules",
        title: "Add tools that fit your stack",
        blocks: [
          {
            type: "paragraph",
            text: "Use the [kit builder](/templates) to explore supported rendering, physics, UI, and testing combinations. The [versioned catalog](/catalog/v1.json) exposes those same compatibility rules for agents and tools."
          },
          {
            type: "paragraph",
            text: "A new kit download is a separate project, not an update to your existing folder. Compare its configuration and source before moving changes across. Physics kits provide example scenes you can extend, rather than finished controllers for every genre."
          },
          {
            type: "note",
            title: "Keep browser code public",
            text: "Anything bundled into a game can be inspected by players. Keep credentials out of source files, static assets, and `VITE_` environment variables."
          }
        ]
      },
      {
        id: "verify-changes",
        title: "Check the result",
        blocks: [
          {
            type: "code",
            label: "Terminal · core checks",
            code: "pnpm lint\npnpm build",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Run `pnpm test` and `pnpm e2e` if those scripts exist in `package.json`. Tests prepare Chromium automatically when they start. See [Test environment setup](/docs/testing#browser-setup) for CI and setup troubleshooting."
          },
          {
            type: "list",
            items: [
              "Exercise keyboard, pointer, and touch controls that your game claims to support.",
              "Check the game at a narrow phone size and a wide desktop size.",
              "Reload and check any saved progress.",
              "Test the built game with `pnpm preview`, using the address printed in the terminal."
            ],
            ordered: false
          }
        ]
      },
      {
        id: "cli-modules",
        title: "Add modules with @spawnkit/cli",
        blocks: [
          {
            type: "paragraph",
            text: "Inspect the available commands for your installed version. Preview a change before applying it."
          },
          {
            type: "code",
            label: "Terminal · inspect and preview",
            code: "pnpm dlx @spawnkit/cli add --help\npnpm dlx @spawnkit/cli catalog --json\npnpm dlx @spawnkit/cli add vitest --dry-run --json",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Review the plan for dependencies, files, and conflicts. Apply a resolved plan only when it matches the change you want. The generator protects modified files; if it reports a conflict, compare the affected files and resolve it explicitly."
          },
          {
            type: "paragraph",
            text: "Keep `spawn.jsonc` and `.spawn/lock.json`. They record the add-ons you chose and what SpawnKit generated; deleting them or replacing edited files to force an update removes that protection. `AGENTS.md` and `README.md` are yours after the first generation: additions never change them, and a deletion stays deleted."
          }
        ]
      }
    ]
  },
  {
    id: "publishing",
    navTitle: "Publish your game",
    group: "Build",
    title: "Publish your game",
    description: "Build your game, upload its browser files, and share the live link with players.",
    summary: "The dashboard accepts a ZIP of your built game. You will need an account to deploy it.",
    sections: [
      {
        id: "prepare-build",
        title: "2. Create a production build",
        blocks: [
          {
            type: "paragraph",
            text: "From your game project, run the checks and build command. Use `pnpm test` too if the project includes that script."
          },
          {
            type: "code",
            label: "Terminal · inside your game folder",
            code: "pnpm lint\npnpm build\npnpm preview",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Open the preview URL and play the game. Check controls, artwork, audio, and resizing. When you are ready, stop preview with Ctrl+C."
          },
          {
            type: "paragraph",
            text: "Create a ZIP of the **contents of `dist/`**. `index.html` must sit at the top level of the ZIP, alongside the game's assets. Do not zip the outer `dist` folder or your whole source project. Use the [PowerShell or Bash packaging examples](/docs/publishing-examples#zip)."
          },
          {
            type: "code",
            label: "Expected ZIP layout",
            code: "my-game.zip\n├── index.html\n├── assets/\n├── media/\n└── spawnkit.config.json",
            language: "text"
          },
          {
            type: "note",
            title: "What to leave out",
            text: "The browser upload needs built files only. Leave out `node_modules`, source credentials, `.env` files, and editor settings. If your game has no listing file, you can enter its details during upload."
          }
        ]
      },
      {
        id: "game-listing",
        title: "1. Prepare the game listing",
        blocks: [
          {
            type: "paragraph",
            text: "Use `spawnkit.config.ts` or `spawnkit.config.json` at the project root for the title, description, genre, dimension, and media paths. New kits detect either format. Update your chosen file before building; the build creates `spawnkit.config.json` in `dist/`."
          },
          {
            type: "paragraph",
            text: "Place a cover at a path such as `public/media/cover.webp` and set `coverPath` to `media/cover.webp`. Paths in the listing are relative to the build root, with no leading slash and no `public/` prefix."
          },
          {
            type: "table",
            columns: ["Item", "Requirement"],
            rows: [
              ["Title", "1–64 characters."],
              ["Description", "10–500 characters. Explain what the player does."],
              ["Cover", "PNG, JPEG, WebP, or SVG; up to 1 MiB."],
              ["Optional trailer", "MP4 or WebM; up to 2 MiB and 60 seconds. Start on gameplay."],
              ["Optional game facts", "Objective, controls, supported devices, and creator name."]
            ]
          },
          {
            type: "paragraph",
            text: "Keep one configuration source; duplicate formats cause a build error. You can also review and edit the listing in the dashboard upload flow."
          }
        ]
      },
      {
        id: "upload",
        title: "3. Upload and deploy",
        blocks: [
          {
            type: "paragraph",
            text: "Open [Upload game](/dashboard/upload) and sign in if prompted. This creates a new hosted project. To replace a release of an existing project, see [Publishing an update](/docs/publishing-examples#updates)."
          },
          {
            type: "list",
            items: [
              "In **Game files**, choose your ZIP. If it includes a listing, the form imports its details and media.",
              "In **Details**, check the title, description, genre, and 2D or 3D selection.",
              "In **Media**, review your cover and optional gameplay clip.",
              "Choose **Deploy game** and follow the build output.",
              "Once deployment succeeds, open the returned game URL and test the hosted game."
            ],
            ordered: true
          },
          {
            type: "paragraph",
            text: "The expanded browser build must stay below 20 MiB and contain fewer than 1,996 files. The ZIP selection limit is 64 MiB, but that does not increase the expanded deployment limit."
          },
          {
            type: "note",
            title: "Hosting and discovery",
            text: "A successful deployment gives you a hosted game. Appearing in SpawnKit's public discovery catalog requires approval and is a separate step. Do not treat a successful build as confirmation that a listing is approved."
          }
        ]
      },
      {
        id: "upload-troubleshooting",
        title: "Fix a failed upload",
        blocks: [
          {
            type: "table",
            columns: ["Problem", "Next step"],
            rows: [
              ["Missing `index.html`", "Zip the contents of `dist/`, not the containing folder."],
              ["Archive too large", "Reduce large textures, audio, or unused files, rebuild, and create a fresh ZIP."],
              ["Cover or trailer rejected", "Check its file type and size. Replace it in the Media step."],
              [
                "Build failed",
                "Read the build output for the first actionable error. Fix it, rebuild locally, and retry."
              ],
              [
                "Game deploys with a media warning",
                "Open the game to verify it works. Correct the rejected listing media before relying on its preview."
              ]
            ]
          }
        ]
      },
      {
        id: "cli-deployment",
        title: "Deploy source with @spawnkit/cli",
        blocks: [
          {
            type: "paragraph",
            text: "The CLI uploads source, rather than a browser-build ZIP. Keep `package.json`, `game.config.json`, and `pnpm-lock.yaml` in the project. Hosted builds install public npm dependencies with lifecycle scripts disabled; the build itself runs without external network access."
          },
          {
            type: "code",
            label: "Terminal · authorize, review, and deploy",
            code: "pnpm dlx @spawnkit/cli login --site https://spawnkit.cloud\npnpm dlx @spawnkit/cli auth status --json\npnpm dlx @spawnkit/cli link --project YOUR_PROJECT_ID\npnpm dlx @spawnkit/cli deploy --env production --dry-run --json\npnpm dlx @spawnkit/cli deploy --env production --yes --json",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Replace `YOUR_PROJECT_ID` with the project you intend to update. Review the dry run before running the final command. Source and built artifacts are limited to 2,000 files and 20 MiB."
          }
        ]
      },
      {
        id: "recover-deployment",
        title: "Resume an interrupted deployment",
        blocks: [
          {
            type: "paragraph",
            text: "With the CLI, Ctrl+C stops watching the output without cancelling the remote deployment. Use the returned deployment and project IDs to inspect it or reconnect to logs."
          },
          {
            type: "code",
            label: "Terminal · inspect and resume",
            code: "pnpm dlx @spawnkit/cli status DEPLOYMENT_ID --project YOUR_PROJECT_ID --json\npnpm dlx @spawnkit/cli logs DEPLOYMENT_ID --project YOUR_PROJECT_ID --follow --json",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "Inspect status before submitting another build. When retrying the same operation, keep its `--request-id`. Failed, cancelled, and superseded deployments exit nonzero. Rollback restores retained artifacts; it does not undo database migrations."
          },
          {
            type: "paragraph",
            text: "For automation, `--json` writes the final result to stdout and build progress to stderr. Failures return a JSON error on stderr and exit nonzero. Use the returned IDs and statuses rather than parsing progress messages."
          }
        ]
      }
    ]
  },
  {
    id: "authentication",
    navTitle: "Accounts and access",
    group: "Reference",
    title: "Accounts and access",
    description: "Know when you need an account, how to sign in, and how to reconnect an existing CLI.",
    summary: "Building locally is account-free. Publishing requires an account with access to the target project.",
    sections: [
      {
        id: "when-to-sign-in",
        title: "When you need an account",
        blocks: [
          {
            type: "table",
            columns: ["Task", "Account required?"],
            rows: [
              ["Download a kit or read the docs", "No."],
              ["Develop and test on your computer", "No."],
              ["Upload and host a game", "Yes."],
              ["Update an existing hosted project", "Yes, with permission to access that project."]
            ]
          },
          {
            type: "paragraph",
            text: "Open [Sign in](/sign-in) and choose the sign-in or sign-up option offered there. Complete identity verification and any required terms yourself. For access problems, contact [support](/contact#support)."
          }
        ]
      },
      {
        id: "browser-sign-in",
        title: "Publishing from the dashboard",
        blocks: [
          {
            type: "paragraph",
            text: "After signing in, use [Upload game](/dashboard/upload) to publish a new game. For an existing project, open it from [your dashboard](/dashboard). Project access is checked by the server on each operation."
          },
          {
            type: "paragraph",
            text: "If you use a coding agent, keep account verification in your own browser. Do not put passwords, tokens, or session cookies into project files, prompts, or build logs."
          }
        ]
      },
      {
        id: "cli-sign-in",
        title: "Connect @spawnkit/cli",
        blocks: [
          {
            type: "code",
            label: "Terminal · sign in",
            code: "pnpm dlx @spawnkit/cli login --site https://spawnkit.cloud",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "The CLI opens a browser for sign-in and access review. Complete the browser flow on the same computer. The local callback is `http://127.0.0.1:43819/callback`, and each authorization attempt expires after five minutes."
          },
          {
            type: "paragraph",
            text: "If the CLI cannot open a browser, `--no-browser` prints the sign-in link. It still needs the callback on the CLI's computer; it is not a remote device authorization flow. Start a fresh login attempt if the previous one expired."
          }
        ]
      },
      {
        id: "status-and-recovery",
        title: "Check and reconnect",
        blocks: [
          {
            type: "code",
            label: "Terminal · inspect local sign-in",
            code: "pnpm dlx @spawnkit/cli auth status --json",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "The result is `signed-in` or `sign-in-required`. This checks locally stored credentials and never returns the token. It does not contact the server, so a locally valid credential can still be rejected by a project operation."
          },
          {
            type: "paragraph",
            text: "For expired or unreadable local credentials, reconnect:"
          },
          {
            type: "code",
            label: "Terminal · reconnect",
            code: "pnpm dlx @spawnkit/cli logout\npnpm dlx @spawnkit/cli login --site https://spawnkit.cloud",
            language: "sh"
          },
          {
            type: "paragraph",
            text: "If sign-in works but a project operation is denied, check that you selected the correct project and that your account has access to it."
          }
        ]
      },
      {
        id: "logout",
        title: "What logout changes",
        blocks: [
          {
            type: "paragraph",
            text: "For remote-agent sessions, `pnpm dlx @spawnkit/cli logout` revokes the grant on the server before removing local credentials. If revocation fails, it keeps the credentials so you can retry. For local browser OAuth sessions, logout removes the local credential only. Browser sign-in is managed separately through its account controls."
          },
          {
            type: "note",
            title: "Revoke remote access from the website",
            text: "Open [Agent access](/cli/access) to revoke one grant or all active grants. Revocation prevents new requests and token renewal; it does not cancel builds that were already submitted."
          }
        ]
      },
      {
        id: "pricing-and-help",
        title: "Pricing and help",
        blocks: [
          {
            type: "paragraph",
            text: "Starter kits and single-player hosting are currently free. Check [hosting plans and availability](/cloud#pricing) for current limits. Upcoming services are not available for provisioning until they are marked available."
          },
          {
            type: "paragraph",
            text: "For an account or deployment issue, use [support](/contact#support). Include the relevant project or deployment ID and the error message, with any credentials removed."
          }
        ]
      }
    ]
  },
  {
    id: "api",
    navTitle: "API resources",
    group: "Reference",
    title: "Agents and API resources",
    description: "Give your tools the same kit information and guides that power the website.",
    summary: "Public discovery endpoints are account-free. Use the dashboard or @spawnkit/cli for publishing.",
    sections: [
      {
        id: "resource-map",
        title: "Find the right resource",
        blocks: [
          {
            type: "table",
            columns: ["Resource", "Use it for"],
            rows: [
              ["[llms.txt](/llms.txt)", "An index of the maintained guides and discovery files."],
              [
                "[Kit catalog](/catalog/v1.json)",
                "Every question `spawn create` asks and its choices, plus kit presets, commands, dependencies, scripts, and download URLs."
              ],
              ["[OpenAPI document](/openapi.json)", "The public catalog and curated download endpoint contracts."],
              ["[auth.md](/auth.md)", "Supported sign-in behavior and current limitations."],
              [
                "[Agent skill ZIP](/downloads/skills/spawnkit.zip)",
                "A reusable skill with create, extend, publish, and authentication references."
              ]
            ]
          },
          {
            type: "paragraph",
            text: "Every guide also has a Markdown version. Use **Copy as Markdown** at the top of a guide, or choose **View Markdown** to open the plain-text source. HTML and Markdown are generated from the same maintained content."
          }
        ]
      },
      {
        id: "catalog",
        title: "Read the kit catalog",
        blocks: [
          {
            type: "code",
            label: "HTTP · public catalog",
            code: "GET https://spawnkit.cloud/catalog/v1.json",
            language: "http"
          },
          {
            type: "paragraph",
            text: "The response is the questionnaire `pnpm dlx @spawnkit/cli catalog --json` prints, with `schemaVersion: 1` and SpawnKit's curated kits added. `templates` lists each template's questions by mode: physics, UI, simulation, telemetry and developer tools, with the add-ons that answer each one for that renderer. `addons`, with what each provides, requires and conflicts with, and `presets` describe the rest. Each kit names its preset and the `create --preset` command that creates the same files as its download, with its download URL and resolved scripts and dependencies."
          },
          {
            type: "paragraph",
            text: "Choose answers from a template's own questions before generating or changing a project. Use the add-on IDs the catalog returns, or their short names in commands (`@spawnkit/rapier2d` is `--physics rapier2d`); do not assume that any arbitrary combination of engines and add-ons is supported."
          },
          {
            type: "code",
            label: "JavaScript · find a kit download",
            code: "const response = await fetch('https://spawnkit.cloud/catalog/v1.json')\nif (!response.ok) throw new Error(`Catalog request failed: ${response.status}`)\n\nconst catalog = await response.json()\nconst kit = catalog.kits.find((kit) => kit.id === 'phaser')\nif (!kit) throw new Error('Kit unavailable')\n\nconsole.log(kit.downloadUrl)\nconsole.log(kit.command)\nconsole.log(kit.scripts)",
            language: "js"
          },
          {
            type: "paragraph",
            text: "Run this example in Node.js 24 or in your agent's tooling. Downloaded archives contain standalone source projects; downloading one does not install dependencies or run the game."
          }
        ]
      },
      {
        id: "agent-skill",
        title: "Use the SpawnKit skill",
        blocks: [
          {
            type: "paragraph",
            text: "Download the [SpawnKit skill ZIP](/downloads/skills/spawnkit.zip), extract the `spawnkit` folder, and add it using your agent's documented skill-installation mechanism."
          },
          {
            type: "code",
            label: "Skill package",
            code: "spawnkit/\n├── SKILL.md\n└── references/\n    ├── create.md\n    ├── extend.md\n    ├── publish.md\n    └── authentication.md",
            language: "text"
          },
          {
            type: "paragraph",
            text: "The skill directs your agent to the relevant guide. The project's `AGENTS.md` adds its own setup and validation instructions. Read and preserve any instructions already present in an existing game."
          },
          {
            type: "note",
            title: "Account access stays explicit",
            text: "A skill describes a workflow; it does not grant permission to access an account or deploy a game. Publishing still requires the user's authorization and access to the target project."
          }
        ]
      },
      {
        id: "api-scope",
        title: "API coverage and responses",
        blocks: [
          {
            type: "paragraph",
            text: "The [OpenAPI document](/openapi.json) covers the public catalog and curated kit downloads. Authenticated project, billing, and administrative APIs are outside its scope. For the implemented command interface, see the [CLI reference](/docs/cli)."
          },
          {
            type: "table",
            columns: ["Response", "Meaning"],
            rows: [
              ["`200`", "The requested resource is available."],
              ["`404`", "The kit or resource does not exist. Refresh the catalog before retrying an old kit ID."],
              ["`405`", "The HTTP method is unsupported. Read the `Allow` header; downloads support `GET` and `HEAD`."]
            ]
          },
          {
            type: "paragraph",
            text: "SpawnKit hasn't launched, so the catalog's shape can still change at this path. Clients should ignore unknown fields and update when the documented shape changes. Prefer the URLs returned by the catalog over constructing download paths."
          }
        ]
      },
      {
        id: "cli-output",
        title: "Automating an existing CLI",
        blocks: [
          {
            type: "paragraph",
            text: "`@spawnkit/cli` supports `--json` for machine output. See [CLI installation](/docs/cli#installation) for package-runner and global installation commands."
          },
          {
            type: "list",
            items: [
              "Successful commands write their JSON result to stdout.",
              "Login writes newline-delimited authorization and completion records.",
              "Live build progress goes to stderr; a failure returns a JSON error there and exits nonzero.",
              "Use `--dry-run --json` to inspect a mutation. JSON mode is noninteractive; mutations require `--yes`.",
              "Check returned status fields and preserve operation IDs when resuming or retrying."
            ],
            ordered: false
          },
          {
            type: "paragraph",
            text: "See [CLI deployment and recovery](/docs/publishing#cli-deployment) for the command sequence, and [Accounts and access](/docs/authentication) for local sign-in behavior."
          }
        ]
      }
    ]
  }
]

agentDocuments.push(...referenceDocuments)
agentDocuments.push(...workflowDocuments)
const authentication = agentDocuments.find((doc) => doc.id === "authentication")!
authentication.sections.splice(
  authentication.sections.findIndex((section) => section.id === "status-and-recovery"),
  0,
  ...remoteAuthSections
)
for (const doc of agentDocuments) {
  if (["extend", "publishing-examples", "testing", "updating"].includes(doc.id)) doc.group = "Guides"
}

agentDocuments.sort((a, b) => documentIds.indexOf(a.id) - documentIds.indexOf(b.id))
const publishing = agentDocuments.find((doc) => doc.id === "publishing")!
const listingIndex = publishing.sections.findIndex((section) => section.id === "game-listing")
publishing.sections.unshift(...publishing.sections.splice(listingIndex, 1))

function markdownBlock(block: DocBlock): string {
  switch (block.type) {
    case "tabs":
      return block.examples.map((example) => markdownBlock({ type: "code", ...example })).join("\n\n")
    case "paragraph":
      return block.text
    case "list":
      return block.items.map((item, index) => (block.ordered ? `${index + 1}. ` : "- ") + item).join("\n")
    case "code":
      return `**${block.label}**\n\n\`\`\`${block.language}\n${block.code}\n\`\`\``
    case "note":
      return `> **${block.title}**\n>\n> ${block.text}`
    case "table":
      return [
        "| " + block.columns.join(" | ") + " |",
        "| " + block.columns.map(() => "---").join(" | ") + " |",
        ...block.rows.map((row) => "| " + row.join(" | ") + " |")
      ].join("\n")
  }
}
export function documentMarkdown(doc: AgentDocument) {
  const source =
    [
      `# ${doc.title}`,
      doc.description,
      doc.summary,
      ...doc.sections.map(
        (section) =>
          `<a id="${section.id}"></a>\n\n## ${section.title}\n\n${section.blocks.map(markdownBlock).join("\n\n")}`
      )
    ].join("\n\n") + "\n"
  // Relative website links must also work in downloaded agent references.
  return source.replace(/\]\(\/(?!\/)([^)]+)\)/g, "](https://spawnkit.cloud/$1)")
}

export function skillFiles() {
  return {
    "SKILL.md": `---\nname: spawnkit\ndescription: Create, extend and publish standalone SpawnKit browser games from supported kits. Use when working with SpawnKit kits or an existing SpawnKit game project.\n---\n\n# SpawnKit\n\nUse the user's chosen engine and project scope. Local development needs no account. Use pnpm dlx @spawnkit/cli to create and extend games, or download an official kit. Read the project's AGENTS.md and preserve existing files.\n\n- Creating a game: read [Create](references/create.md).\n- Modifying a game: read [Extend](references/extend.md).\n- Publishing or recovering a build: read [Publish](references/publish.md) and [Authentication](references/authentication.md). Deployment requires the user's authorization and target-project access.\n\nThe current catalog is https://spawnkit.cloud/catalog/v1.json: every question \`spawn create\` asks, the add-ons that answer it for each renderer, and the kit presets. Choose from those before generating or changing add-ons. Verify the game with its actual package scripts and browser behavior. Report observed results; do not equate downloads with successful setup.\n`,
    "references/create.md": documentMarkdown(agentDocuments.find((doc) => doc.id === "getting-started")!),
    "references/extend.md": documentMarkdown(agentDocuments.find((doc) => doc.id === "extend")!),
    "references/publish.md": documentMarkdown(agentDocuments.find((doc) => doc.id === "publishing")!),
    "references/authentication.md": documentMarkdown(agentDocuments.find((doc) => doc.id === "authentication")!)
  }
}
