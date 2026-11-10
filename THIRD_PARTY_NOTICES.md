# Third-party notices

This project does not vendor third-party source code. The following projects
were studied for their data formats, operating rules, and parameter defaults;
only concepts and field names are reused.

| Project | License | What is referenced |
|---|---|---|
| `tinqiao-oss/engramory` | MIT | One fact per Markdown file, bounded `MEMORY.md` index, write-before-limit discipline, single-writer/many-readers rule |
| `Soulmate793/dsh-memory` | MIT | Recall score weights, decay and consolidation parameter defaults |
| `123zxs345/dsh-plugin-companion-memory` | MIT | Session event filtering rules, stable source identity, layered disclosure shape |
| `painter-7/memory-starmap` | **no LICENSE** | Data contract shape only (`cold` / `dream` / `daybook`, `evidence`, `supersededBy`). No code copied. |

## Publishing notes

This file is included in the published package via `package.json.files`. The
catalog icon is a bitmap (`icon.png`), not SVG.
