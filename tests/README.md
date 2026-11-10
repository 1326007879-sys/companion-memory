Run `npm run build` first, then `npm test`. Tests import the compiled
`lib/core` entry, so they exercise exactly what would be published.

Coverage in v0:

- Chinese bigram features and IDF relevance
- zero-hit recall (no fallback)
- review timing formula (15s / 60s)
- summary token budget and de-duplication

Host-layer wiring is verified manually against the v0 plan's acceptance cases.
