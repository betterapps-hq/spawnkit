# SpawnKit CLI

Create and extend standalone TypeScript browser games, then publish them to SpawnKit.
Node.js 24 or newer is required. Creating and running a game locally does not require an account.

## Create a game

```sh
pnpm dlx @spawnkit/cli init phaser my-game --physics arcade --with vitest,playwright --yes
cd my-game
pnpm install
pnpm dev
```

Run `pnpm dlx @spawnkit/cli init` with no arguments in a terminal to choose the renderer, physics, UI, simulation,
telemetry and tools step by step. `--dry-run` shows the plan without writing anything, and `--json` prints it for scripts
and agents.

Start from a starter kit with `--preset`: `spawn init --preset phaser-arcade my-game` makes that kit's game, and other
flags change its answers. `spawn init --help` lists the kits. In a terminal, `init` also asks for the settings the game
reads from its environment, such as Sentry's public DSN, and writes them to the game's ignored `.env`.

The generated project belongs to you. It has its own package manifest, source, tests, and build configuration; it does not depend on the SpawnKit repository.

```sh
pnpm test
pnpm build
```

For repeated use, install the CLI globally:

```sh
pnpm add --global @spawnkit/cli
spawn --help
spawn catalog
spawn add playwright --dry-run
```

Use `spawn add playwright --yes` to apply the plan, and `spawn add --physics matter --replace arcade` to swap one add-on
for another. `spawn upgrade` brings a game to the CLI's catalog version and merges your edits to starter files.
`spawn status` shows the files SpawnKit manages and whether you changed them. Changes never overwrite your edits
silently: a conflict stops and asks.

### Templates from npm

Anyone can publish SpawnKit templates as an npm package, and `init` installs one by name:

```sh
pnpm dlx @spawnkit/cli init @acme/tower-defense my-game
```

Add a version or a range (`@acme/tower-defense@^2`), and `#<template>` to pick one of several
(`@acme/starters#tower`). `spawn catalog @acme/starters` lists a package's templates. npm installs the package into
your user cache folder without running its scripts, and the game's lock records its version and integrity, so later
commands use that exact copy. The plan says when a template comes from a package, because applying it runs the package
author's code. `spawn upgrade` moves the package to its newest version that works with your CLI.

## Publish a game

```sh
spawn login --site https://spawnkit.cloud
spawn link
spawn deploy --dry-run
spawn deploy --yes
```

Publishing requires a SpawnKit account and access to the target project. Review the deployment plan before submitting. Run a command with `--help` to see its options; automation can use `--json` for structured output.

- [CLI commands](https://spawnkit.cloud/docs/cli)
- [Create with the CLI](https://spawnkit.cloud/docs/create-with-cli)
- [Testing and debugging](https://spawnkit.cloud/docs/testing)
- [Account access](https://spawnkit.cloud/auth.md)

Third-party notices are included in `dist/THIRD-PARTY-LICENSES.md`.
