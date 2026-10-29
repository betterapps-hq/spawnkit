# SpawnKit CLI

Create and extend standalone TypeScript browser games, then publish them to SpawnKit.
Node.js 24 or newer is required. Creating and running a game locally does not require an account.

## Create a game

```sh
pnpm dlx @spawnkit/cli init my-game --add phaser,vitest,playwright --yes
cd my-game
pnpm install
pnpm dev
```

The generated project belongs to you. It has its own package manifest, source, tests, and build configuration; it does not depend on the SpawnKit repository.

```sh
pnpm test
pnpm build
```

For repeated use, install the CLI globally:

```sh
pnpm add --global @spawnkit/cli
spawn --help
spawn addons
spawn add playwright --dry-run
```

Use `spawn add playwright --yes` to apply the plan. Existing files are checked before changes; unresolved conflicts need your decision.

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
