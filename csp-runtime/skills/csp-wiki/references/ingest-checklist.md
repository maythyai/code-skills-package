# Ingest Checklist

> Acceptance criteria for compiling raw docs into the wiki layer.

## First-compile threshold

- Besides `index.md`/`log.md`, produce ≥ **3 substantive content pages**; never end after scaffolding only.
- If the user asked for topic subdirectories: ≥1 substantive page per topic dir (nav pages don't count).

## Sources quality

- Every substantive page: `sources` ≥1 entry.
- Every `sources[].file` must be a readable git-visible raw doc (`git cat-file` / `Read` succeeds).
- Every `sources[].title` is a non-empty string and **must not equal** the `file`/id (front-end would show a path instead of a name).
- `sources` must be raw docs, never wiki pages; never `index.md`/`log.md`/nav pages.
- Cross-repo: verify each source under its own `repo` root.

### sources.title write flow (batch ingest)

1. **Build mapping**: for each source repo, `git ls-files` + read front-matter/heading to extract `{file, title}`.
2. **Fill metadata**: `sources[].title` from the mapping; never `title: <path>` placeholder.
3. **Post-write verify**: re-read the wiki page frontmatter; every source must satisfy `title !== file` and non-empty; fix via update before ending ingest.

## Low-info source fallback

If a raw doc reads empty / placeholder-only (just `###`) / clearly insufficient to support a fact:
- **switch to a same-topic alternative source**; do not use the low-info source as the topic's main source.

## Wiki page quality standard (every page)

1. Contains **concrete facts / data / examples**, not vague overview.
2. **Every claim has an explicit `sources` citation.**
3. **Relationships and dependencies** between entities are stated.
4. **Open questions / knowledge gaps are marked** (don't fake completeness).
5. **Cross-references complete** — related pages linked via `seeAlso` or `[[link]]`.

## Deepening self-check (after compile)

- Any paragraph that's only vague overview lacking detail → supplement.
- Any important content from a source skipped → supplement.
- Cross-references complete → add `seeAlso` / `[[link]]`.

## Fixed closing verification

After compile, run in order against the wiki root (`.csp/wiki/`):

1. `ls .csp/wiki/` + read `index.md` — confirm structure and page placement.
2. Grep frontmatter across pages — confirm metadata completeness; **check each `sources[].title !== file`**.
3. Spot-check 1–2 pages — confirm body isn't placeholder, sources show real titles.

## Post-Ingest log.md format

```
## [YYYY-MM-DD HH:MM] ingest | <main page titles>
- Source repos: <repo list> (omit in single-repo)
- Created: <new page titles>
- Updated: <cascade-updated page titles>
- Depth: <shallow/medium/deep> (covered N source docs, extracted M entities)
- Duration: <e.g. 3m20s>
- Docs processed: <raw doc list>
- Notes: <brief>
```

## Incremental ingest (time/commit diff)

Filter changed docs since the last ingest:
1. For each source repo, `git log --since="<last ingest ts>" --name-only` (or compare against the commit recorded in `log.md`).
2. Read the most recent **ingest** entry's timestamp/commit in `log.md` (ignore lint/organize/query entries).
3. Docs newer than that ⇒ re-process.
