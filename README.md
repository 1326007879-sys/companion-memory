# dsh-companion-memory-core (v0 skeleton)

Local, host-independent long-term memory core for DeepSeek Harness. Plain-text
notes, a bounded index, auditable evidence. No runtime dependencies, no external
services, no native modules.

Design notes live in the project plan and are not shipped in the npm package.

## Current status

This is the **v0 skeleton**: package layout, configuration, data contract, store
initialization, indexing and recall primitives are in place. `lib/` is generated
by `npm run build` and shipped in the package. Not yet wired:

- LLM-backed review (disabled by default via `maintenanceMode: off`; the reviewer
  is still a no-op until it is wired to the host model)
- the real host `llm/stream` adapter and the sidebar panel slots

Nothing here is published to npm yet.

## Layout

```
src/core/        host-independent: paths, schema, store, indexer, recall,
                 disclosure, review, writer, llm-adapter
src/host/dsh/    the only layer allowed to touch the harness
src/client/      read-only sidebar panel
lib/             build output, the only code shipped in the npm package
```

## Build and install (once the toolchain is available)

```sh
pnpm install
pnpm build                 # emits lib/**/*.js + .d.ts
npm pack                   # sanity-check the tarball contents
dsh plugin --profile test add .
```

Local verification should use a dedicated `test` profile, never the daily one.

## Data location

Default `~/.companion/`, overridable with `config.memoryRoot` or the
`COMPANION_MEMORY_ROOT` environment variable. Everything is plain text and
stays on the machine:

```
MEMORY.md          bounded index (200 lines / 25 KB)
meta.json          schema version, writer epoch, review watermark
notes/*.md         one fact per file, with evidence and sourceRefs
cold/*.jsonl       append-only raw conversation lines
journal/           reserved for v1
persona.md         reserved for v1
profile.md         reserved for v1
state.json         reserved for v1
archive/           soft-archived notes
index/             rebuildable keyword index
```

Uninstalling the plugin never deletes this directory. `memory_forget` archives a
note and removes its index entry; it does not touch the host's own chat history.

## Privacy and capability boundaries

- Memory is **unencrypted plain text**; any local process can read it. Never
  store credential values, only pointers to where they live.
- The core never reads credentials and never opens network connections.
- Review requests borrow the host's model through `LlmAdapter`; the package ships
  no API key and no fallback provider.
- `maintenanceMode: off` must produce zero model calls.

## Before publishing

1. Confirm peer ranges against the actual dsh release in use.
2. Run `npm run build`, verify `lib/` is in the tarball, then `npm publish`.
3. Add the `dsh-plugin` topic after the repository is at least one day old, then
   submit one catalog YAML entry. Note the 24-hour npm release-age window.
4. Keep descriptions factual: stable memory, local notes, bounded index. Do not
   claim consciousness, emotions, or model training.

## Out of scope for v0

Persona/state injection, moods, proactive messages, journaling, vectors, graph
links, star map, cross-host adapters, encryption, hash-chain audit, standalone
service, model training.
