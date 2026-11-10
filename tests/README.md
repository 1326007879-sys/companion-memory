Run `pnpm build` first, then `pnpm test`. Tests import the compiled `lib/core`
entry, so they exercise exactly what would be published.

Coverage in v0:

- Chinese bigram features and IDF relevance
- zero-hit recall (no fallback)
- review timing formula (15s / 60s)
- summary token budget and de-duplication

Host-layer wiring is verified manually against the acceptance cases in
`../../docs/v0-plan.md` §7.
