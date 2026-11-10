Reserved for v2. Cross-host adapters are **standing rule files plus a shared
read-only store**, not MCP-first tool servers:

- `codex/` → `~/.codex/AGENTS.md` snippet pointing at the canonical memory root
- `workbuddy/` → `mcp.json` / Skill wiring, read-only
- `reader/` → read-only recall rules for hosts that cannot write the store

One writer, many readers. A second writer would corrupt the append-only cold
store and the bounded index. This directory is intentionally empty in v0.
