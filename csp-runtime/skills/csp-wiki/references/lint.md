# Lint Process

> Wiki health check. Split into **auto-fix items** and **report items**.

## Auto-fix items

### Index consistency

Compare `index.md` against actual wiki files (`ls .csp/wiki/*.md` + read frontmatter):
- File exists but missing from index → add entry.
- Index entry points to a non-existent file → mark `[MISSING]`.
- Page with severe bugs or exact duplicate → report to user; delete only after confirmation, then remove the index entry.

### Internal links

Check `[[link]]` and markdown links in wiki pages:
- Target doesn't exist → try to fix the path (e.g. renamed file); if unfixable, report.

### Sources references

Check whether the raw docs cited in frontmatter `sources` still exist:
- Verify each `sources[].file` is readable (`git cat-file` / `Read`).
- Raw doc deleted → remove the citation from `sources`, mark `[source deleted]` in body.
- Title validity: `sources[].title === file` or empty → resolve the real title from the source repo and update frontmatter.

### See Also

- Add obviously missing cross-references (same-topic pages not linked).
- Remove links to deleted files.

### Directory & metadata consistency (only when `.csp/wiki/` has subdirectories)

- Pages in the same subdir lacking mutual `seeAlso` → add.
- Page topic mismatches its subdir (e.g. an "auth" page under "deploy/") → **report only**, don't auto-move.

## Report items (do NOT auto-fix)

Surface to the user, who decides:

- **Factual contradictions** between pages.
- **Stale content** superseded by a newer doc.
- **Orphan pages** (no inbound `seeAlso` or `[[link]]`).
- **Repeatedly-mentioned concepts** with no dedicated page.
- **Missing cross-topic references.**
- **Archive pages** whose source has a major update *after* the archive snapshot.

## Suggested exploration

After lint, **proactively** suggest:
- New questions worth investigating (from knowledge gaps/contradictions).
- Source material to add (thin coverage areas).
- Potentially valuable cross-topic analyses.

## Steps

1. List all wiki pages (`ls .csp/wiki/*.md`) + read frontmatter.
2. Read `index.md`.
3. Run each auto-fix check.
4. Collect report items.
5. Apply fixes (update frontmatter, body, index.md).
6. Summarize: what was fixed + what was found + exploration suggestions.
7. Append `log.md`.

## Post-Lint log format

```
## [YYYY-MM-DD HH:MM] lint | <N> issues found, <M> auto-fixed
- Duration: <dur>
- Docs processed: <checked wiki page list>
```
