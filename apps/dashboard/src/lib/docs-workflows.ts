import type { AgentDocument, DocBlock } from "./agent-docs"

const p = (text: string): DocBlock => ({ type: "paragraph", text })
const code = (label: string, language: string, code: string): DocBlock => ({ type: "code", label, language, code })
const steps = (...items: string[]): DocBlock => ({ type: "list", ordered: true, items })

export const workflowDocuments: AgentDocument[] = [
  {
    id: "create-with-cli",
    navTitle: "Create with the CLI",
    group: "Build",
    title: "Create and build a game with @spawnkit/cli",
    description:
      "Create a standalone game project with @spawnkit/cli, install dependencies, run the game, and build browser files for publishing.",
    summary:
      "Start in a parent folder, generate your game, then run every development command inside the new game folder.",
    sections: [
      {
        id: "prerequisites",
        title: "Before you start",
        blocks: [
          p(
            "You need Node.js 24 or newer and pnpm 12. Local game creation needs no SpawnKit account. Run the published `@spawnkit/cli` package with pnpm or npm. You can also start from a [downloadable starter kit](/docs/getting-started)."
          ),
          code("Check the game development tools", "sh", "node --version\npnpm --version"),
          p(
            "You work in your own game project. Keep all work inside your own game folder. See [tool installation and version checks](/docs/getting-started#before-you-start) if either command is missing."
          )
        ]
      },
      {
        id: "generate",
        title: "1. Generate a new game",
        blocks: [
          p(
            "Open a terminal in the folder where you keep your projects. Choose a new directory name: the CLI refuses to overwrite an existing folder. These tabs launch the same CLI package."
          ),
          {
            type: "tabs",
            label: "Create a game",
            examples: [
              {
                label: "pnpm",
                language: "sh",
                code: "pnpm dlx @spawnkit/cli create phaser my-game --with vitest --dry-run\npnpm dlx @spawnkit/cli create phaser my-game --with vitest"
              },
              {
                label: "npm / npx",
                language: "sh",
                code: "npx @spawnkit/cli create phaser my-game --with vitest --dry-run\nnpx @spawnkit/cli create phaser my-game --with vitest"
              }
            ]
          },
          p(
            "The dry run shows the proposed files and add-ons. In a terminal, the second command asks the questions the flags left open, such as physics and the game interface, then asks for confirmation; review and accept it to create the files. In a noninteractive agent session, use `--yes` only after reviewing the dry-run plan. Phaser supplies the renderer and Vitest supplies tests. Answer other questions with flags such as `--physics arcade` or `--no-telemetry`, or start from a kit with `--preset phaser-arcade`. Run `pnpm dlx @spawnkit/cli catalog --json` for every question and its choices; use `pnpm dlx @spawnkit/cli create` alone for interactive setup."
          )
        ]
      },
      {
        id: "run",
        title: "2. Install and run your game",
        blocks: [
          code("Enter the generated game folder", "sh", "cd my-game\npnpm install\npnpm dev"),
          p(
            "Open the HTTPS address printed in the terminal. The starter scene should appear; use the arrow keys to collect gold. Follow the certificate setup if prompted. Run `pnpm exec dev-domains doctor` if the local address does not open. Leave the server running while editing. Open a second terminal in `my-game` for the checks below, or stop the server with Ctrl+C first."
          ),
          p(
            "Open this same `my-game` folder in your editor or AI agent. `package.json`, `src/`, and `AGENTS.md` are at its root. See the [Codex](/docs/codex), [Claude Code](/docs/claude-code), and [Cursor](/docs/cursor) guides."
          )
        ]
      },
      {
        id: "build",
        title: "3. Test and create a production build",
        blocks: [
          code("Inside my-game; Vitest was selected above", "sh", "pnpm lint\npnpm test\npnpm build\npnpm preview"),
          p(
            "The build checks TypeScript and writes browser files to `dist/`. Preview serves that build locally and keeps running until you stop it with Ctrl+C. Play through the scene and check the browser console before publishing. If you chose a kit without tests, use only the scripts present in its `package.json`."
          ),
          p(
            "A successful local build does not upload anything. Follow [Publish your game](/docs/publishing) to ZIP the contents of `dist/` and upload them, or use the [CLI deployment reference](/docs/cli#deployments) to deploy source."
          )
        ]
      }
    ]
  },
  {
    id: "upload-existing-game",
    navTitle: "Upload an existing game",
    group: "Build",
    title: "Upload an existing browser game",
    description:
      "Bring an existing HTML game or browser export to SpawnKit without changing engines or adopting a starter template.",
    summary:
      "Upload a self-contained browser build. Your original source, engine, and build tools can stay as they are.",
    sections: [
      {
        id: "requirements",
        title: "What you can upload",
        blocks: [
          p(
            "Use a static browser build with `index.html` as its entry point. This can be a JavaScript game, an existing HTML game, or an engine's web export. Native executables and projects that require a server process cannot run as a static browser upload. Features requiring special browser headers or server APIs need a compatibility check."
          ),
          p(
            "You do not need `game.config.json`, `spawn.jsonc`, pnpm, or the SpawnKit CLI for browser ZIP upload. Those requirements belong to generated projects and CLI source deployment."
          )
        ]
      },
      {
        id: "export",
        title: "1. Build or export using your existing tools",
        blocks: [
          p(
            "Use the build command already defined by your project, or your engine's web export. For a plain HTML game, collect its HTML, scripts, styles, and media into one output folder. Keep relative references valid and test the result with a local HTTP server, not only a file:// URL."
          ),
          {
            type: "tabs",
            label: "Existing JavaScript project with a build script",
            examples: [
              { label: "npm", language: "sh", code: "npm run build" },
              { label: "pnpm", language: "sh", code: "pnpm run build" },
              { label: "Yarn", language: "sh", code: "yarn run build" },
              { label: "Bun", language: "sh", code: "bun run build" }
            ]
          },
          p(
            "These commands run your existing build script; they do not install or switch package managers. Output may be called `dist`, `build`, or `web-export`. Use the directory your tool actually produces. Hosted source-build support is separate from this locally built ZIP workflow."
          )
        ]
      },
      {
        id: "archive",
        title: "2. ZIP the browser files",
        blocks: [
          code("Archive root", "text", "my-game.zip\n├── index.html\n├── game.js\n├── styles.css\n└── assets/"),
          p(
            "ZIP the contents of the output folder, not the folder itself. Keep the expanded game below 20 MiB and fewer than 1,996 files. ZIP selection is limited to 64 MiB; that does not raise the expanded limit. Exclude source secrets, `.env`, `node_modules`, and editor files. See [packaging commands](/docs/publishing-examples#zip) for PowerShell and Bash examples; substitute your output directory for `dist`."
          ),
          p(
            "Listing metadata is optional in the archive. If you have no `spawnkit.config.json`, enter your title, description, genre, and media in the upload form. You do not need to add the SpawnKit Vite plugin to an existing project."
          )
        ]
      },
      {
        id: "upload",
        title: "3. Upload through the dashboard",
        blocks: [
          steps(
            "Open [Upload game](/dashboard/upload) and sign in.",
            "Select your ZIP in Game files. Review any imported listing values.",
            "Complete Details with the title, description, genre, and 2D/3D selection.",
            "Add or review the cover and optional trailer in Media.",
            "Choose Deploy game and follow the deployment output. Keep the resulting project and game links. This creates a new project; see [Publishing an update](/docs/publishing-examples#updates) before uploading another release of the same game."
          ),
          p(
            "A cover can be PNG, JPEG, WebP, or SVG up to 1 MiB. A trailer can be MP4/WebM up to 2 MiB and 60 seconds. Start the clip on gameplay. Media processing warnings can omit invalid listing media without preventing the game from deploying."
          )
        ]
      },
      {
        id: "check",
        title: "4. Check the hosted game",
        blocks: [
          steps(
            "Open the returned game URL and wait for the game to start.",
            "Test movement, start/restart, sound after a user gesture, and loading additional levels.",
            "Check browser errors and failed asset requests. Match filename capitalization exactly.",
            "Test on the devices you plan to list as supported."
          ),
          p(
            "This upload flow creates a new project. It is not an update-existing-project control. Keep your project ID and consult the [dashboard guide](/docs/dashboard) for monitoring and the [publishing guide](/docs/publishing-examples#updates) for current update paths. Public discovery approval is separate from hosting success."
          )
        ]
      }
    ]
  },
  {
    id: "dashboard",
    navTitle: "Using the dashboard",
    group: "Guides",
    title: "Use the SpawnKit dashboard",
    description:
      "Find your games, upload a browser build, inspect deployments and logs, and navigate project management in the SpawnKit dashboard.",
    summary:
      "The dashboard manages your hosted games. Your editor or AI agent remains where you change and build your game source.",
    sections: [
      {
        id: "start",
        title: "Sign in and find your project",
        blocks: [
          steps(
            "Open [Dashboard](/dashboard) and sign in with the account that owns or can access the game.",
            "Choose your project from the project list. Confirm its name and game URL before making changes.",
            "Use the project's navigation to open Overview, Deployments, Logs, Domains, or Settings."
          ),
          p(
            "If a game is missing, check the signed-in account and project access. Downloading a kit does not create a hosted project. Local game development needs no account; dashboard operations use your authenticated access."
          )
        ]
      },
      {
        id: "create",
        title: "Create locally or upload a finished game",
        blocks: [
          p(
            "Use the [starter builder](/templates) to choose an engine and tools and download source for local development. Use [Upload game](/dashboard/upload) when you already have a working browser build. These are different starting points: a source kit is editable code; an upload is a built release."
          ),
          p(
            "Follow [Upload an existing game](/docs/upload-existing-game) for packaging, listing details, media, deployment progress, and the final live check. No platform repository checkout is needed."
          )
        ]
      },
      {
        id: "deployments",
        title: "Read deployment progress and releases",
        blocks: [
          steps(
            "Open Deployments for the selected project.",
            "Inspect the environment and release before taking an action. A build in progress is not yet a successful live release.",
            "Open a release, then choose Build logs to inspect its output. Use Copy version ID in its details when sharing the release ID; deployment IDs and release IDs serve different purposes.",
            "When the deployment succeeds, open Overview and use Copy production URL, or open the hostname link. Paste that URL into a new browser tab and verify gameplay."
          ),
          p(
            "Look for the first failure in build output and any media warnings. A warning about an omitted cover or trailer differs from a failed game build. Use available environment and release filters to find the run you intended; do not confuse an older successful release with the latest attempt."
          ),
          p(
            "Promotion and rollback depend on the project's environment, retained releases, permissions, and enabled capabilities. Review the displayed action and target before confirming. Rollback restores compatible artifacts, not database history."
          )
        ]
      },
      {
        id: "navigation",
        title: "Know where to look",
        blocks: [
          {
            type: "table",
            columns: ["Area", "Use it for"],
            rows: [
              ["Overview", "Orient yourself in the selected project and its current activity."],
              ["Deployments", "Inspect releases, environments, and deployment activity."],
              ["Logs", "Inspect available project logs; use the release's build output for a build failure."],
              ["Domains", "Inspect which hostname points to each environment before sharing it."],
              ["Analytics", "Review recorded activity; empty data is not proof that loading is broken."],
              [
                "Settings",
                "In General, read the Project ID and use Copy project ID. Project name is the dashboard label."
              ],
              [
                "Users / Backend",
                "These areas require the relevant configured game services. They are not required for a static browser upload."
              ]
            ]
          },
          p(
            "Some controls depend on account permissions, the selected plan, and backend availability. An unavailable or preview control does not complete a hosted operation. Read the result shown by the dashboard and verify the resulting project state."
          )
        ]
      },
      {
        id: "help",
        title: "Recover from a failed operation",
        blocks: [
          p(
            "Record the project, environment, deployment ID, and the first relevant error. Check [Testing and debugging](/docs/testing#diagnosis) for asset and build problems, or [Accounts and access](/docs/authentication) for sign-in problems. If the dashboard cannot perform the operation you need, contact [support](/contact#support) with those details, excluding credentials."
          )
        ]
      }
    ]
  },
  ...[
    {
      id: "codex",
      name: "Codex",
      setup:
        "Install and sign in using the official Codex quickstart. Open or select the extracted game folder as the project for your chat. Work locally in that folder so the agent can inspect and edit the actual game files.",
      instructions:
        "Codex recognizes AGENTS.md as project guidance. Keep the kit's existing instructions and add project-specific rules there when needed. Confirm the selected working folder contains your game's package.json.",
      source: "https://developers.openai.com/codex/quickstart",
      rules: "https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex"
    },
    {
      id: "claude-code",
      name: "Claude Code",
      setup:
        "Install Claude Code using its official quickstart. In a terminal, change into the extracted game folder and run claude. Complete the sign-in flow if prompted. The session should show your game folder as its working directory.",
      instructions:
        "Keep the generated AGENTS.md. If your Claude Code setup uses CLAUDE.md instead, add an @AGENTS.md import to CLAUDE.md without overwriting existing instructions. Run /context to inspect loaded memory files. Instruction loading can depend on your Claude Code version and settings.",
      source: "https://code.claude.com/docs/en/quickstart",
      rules: "https://code.claude.com/docs/en/memory"
    },
    {
      id: "cursor",
      name: "Cursor",
      setup:
        "Open the extracted game folder in Cursor and start an Agent conversation for that codebase. Select the actual game folder containing package.json, rather than its parent downloads folder. Ask Agent to inspect the project before changing it.",
      instructions:
        "Cursor supports AGENTS.md project instructions and more detailed .cursor/rules files. The generated AGENTS.md is a useful starting point. Keep additional rules specific to your game's conventions and avoid introducing a different framework or build tool by default.",
      source: "https://cursor.com/docs/agent/overview",
      rules: "https://cursor.com/docs/rules"
    }
  ].map((agent): AgentDocument => ({
    id: agent.id,
    navTitle: `Build with ${agent.name}`,
    group: "Guides",
    title: `Make a browser game with ${agent.name}`,
    description: `Set up a SpawnKit game in ${agent.name}, give the agent project context, make a playable change, and verify the production build.`,
    summary: `Use ${agent.name} with a standalone TypeScript game kit. Start with a working scene and improve it one playable change at a time.`,
    sections: [
      {
        id: "get-kit",
        title: "1. Start with a standalone game",
        blocks: [
          p(
            "Download a kit from the [starter builder](/templates) and extract it into a new folder, such as `my-game`. Install Node.js 24 or newer and pnpm 12. Open the folder containing `package.json`, `src/`, and `AGENTS.md`. Local development needs no SpawnKit account. Follow [tool installation and version checks](/docs/getting-started#before-you-start) if Node or pnpm is missing. Paste shell commands into a terminal opened in the game folder."
          ),
          code("Run inside the extracted game folder", "sh", "pnpm install\npnpm dev"),
          p(
            "Open the address printed in the terminal and check the starter scene works. This gives you a working version to compare against. Keep that terminal running while the agent edits; open a second terminal in the same game folder for checks. [CLI creation](/docs/create-with-cli) is an alternative to downloading the kit."
          )
        ]
      },
      {
        id: "agent",
        title: `2. Open the game in ${agent.name}`,
        blocks: [
          p(agent.setup),
          p(
            `See the [official ${agent.name} setup guide](${agent.source}) for installation and sign-in. Your agent account is separate from a SpawnKit hosting account.`
          ),
          p(
            "If the agent cannot reach the package registry or write to the package cache, run `pnpm install` in your own terminal inside the game folder, then ask it to continue. This also applies to access-denied errors for `pnpm-store-operation-locks`. Keep pnpm and the existing lockfile; switching package managers does not fix an agent's permissions. If browser tests need Chromium, run `pnpm test:setup` in that terminal too."
          ),
          p(
            "If the agent cannot open a documentation URL, open the guide in your browser and use Copy as Markdown to share it. Keep network and sandbox protections enabled; report blocked steps separately from completed checks."
          ),
          p(agent.instructions),
          p(`See the [official project-instruction documentation](${agent.rules}) for details.`)
        ]
      },
      {
        id: "context",
        title: "3. Give the agent the right context",
        blocks: [
          code(
            "First task to paste into your agent",
            "text",
            "Read AGENTS.md, README.md, and package.json in this game folder.\nExplain how to run the game and which engine it uses.\nChange collectible scoring from one point to five points.\nKeep the existing engine, controls, and project structure.\nUpdate the relevant tests, run the available checks, and report results.\nShow me what changed and how to verify the score in the game."
          ),
          p(
            "Ask it to read `AGENTS.md`, `README.md`, and `package.json`, identify the selected engine, and explain where input, simulation, rendering, and score updates live. Share the [project structure guide](/docs/project-structure) when it needs orientation. It should use the existing game scripts and preserve your engine and local configuration."
          ),
          p(
            "Describe one concrete change, such as awarding five points per collectible. State what the player should see, which behavior must stay the same, and how you will check it. Ask for a focused change and a summary of affected files. Do not ask the agent to regenerate over an existing game."
          )
        ]
      },
      {
        id: "verify",
        title: "4. Review and play the change",
        blocks: [
          code("Inside the game folder", "sh", "pnpm lint\npnpm build\npnpm preview"),
          p(
            "Run `pnpm test` too if the game includes that script. Ask the agent to report which checks actually ran and their results. Open preview yourself and verify the change in gameplay; a passing build does not prove the controls or scoring work."
          ),
          p(
            "Review the changed files in your editor and ask the agent to explain anything unclear. Save a Git commit, or stop the development server and copy the project to a separate backup folder before the next feature. Keep changes inside this game folder."
          )
        ]
      },
      {
        id: "publish",
        title: "5. Share the finished game",
        blocks: [
          p(
            "Build again after your final edits. Follow [Publish your game](/docs/publishing) to upload the contents of dist, or [Upload an existing game](/docs/upload-existing-game) for a different browser export. Browser upload creates a new project. For an already-hosted game, follow [Publishing an update](/docs/publishing-examples#updates) instead. Verify the live game after deployment."
          )
        ]
      }
    ]
  }))
]
