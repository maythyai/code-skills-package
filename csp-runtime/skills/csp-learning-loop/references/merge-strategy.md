# Merge Strategy

Rules for incrementally updating `.csp/intel/` dimension files without full rewrites.

## Core Principles

1. **Delta-only**: Never rewrite a dimension file — only append or update entries
2. **Idempotent**: Running merge twice produces the same result as once
3. **Audit trail**: Every change logged to `changelog.jsonl`
4. **Bounded size**: Each dimension stays under 2000 tokens

---

## Deduplication

### Content Similarity Check

Before adding a new entry, compare against all existing entries in the same section:

```
Similarity = (shared_keywords / total_keywords) * structural_match_factor

structural_match_factor:
  - Same section: 1.0
  - Adjacent sections: 0.5
  - Different sections: 0.2

Threshold: 0.85
```

**If similarity > 0.85:**
- Merge into existing entry
- Combine evidence (increase confidence)
- Append new source to source list
- Update date to latest

**If similarity < 0.85:**
- Add as new entry
- Assign initial confidence from extraction

### Exact Match Shortcut

If new entry text is substring of existing entry (or vice versa), treat as duplicate immediately.

---

## Confidence Management

### Initial Confidence

| Source | Base Confidence |
|--------|----------------|
| User explicitly stated | 0.95 |
| Confirmed in code | 0.85 |
| Observed in transcript | 0.70 |
| Inferred from context | 0.55 |

### Re-confirmation Boost

When an entry is re-confirmed in a new session:
```
new_confidence = min(1.0, max(old_confidence, new_confidence) + 0.05)
```

### Decay

At each full extraction pass, entries NOT re-confirmed:
```
new_confidence = old_confidence - 0.02
```

### Archival

Entries below 0.3 confidence are moved to an `## Archive` section at the bottom of the file. Archived entries are:
- Still readable for reference
- Not included in aggregate confidence calculation
- Restored if re-confirmed in a future session

---

## Conflict Resolution

When new information contradicts an existing entry:

1. **Check dates**: Newer information wins by default
2. **Check confidence**: If old entry has confidence > 0.9 and new entry < 0.7, flag for review
3. **Resolution strategies**:
   - **Replace**: New fact supersedes old (e.g., tech stack upgraded)
   - **Coexist**: Both are valid in different contexts (add context qualifiers)
   - **Flag**: Add `[CONFLICT]` marker for manual resolution

**Format for conflicts:**
```markdown
- [DATE] New fact | confidence: X | source: Y
  - ⚠️ Conflicts with: [old entry date] "old fact" (confidence: Z)
  - Resolution: replaced / coexists / flagged
```

---

## Compression

When a dimension file exceeds 2000 tokens:

### Step 1: Archive Low-Confidence Entries
Move entries with confidence < 0.4 to `## Archive` section.

### Step 2: Merge Similar Entries
Find entries with similarity > 0.7 and merge into summaries:
```markdown
## Key Patterns
- Error handling: try/catch with specific error types, async errors wrapped individually
  (merged from 5 entries, avg confidence: 0.82)
```

### Step 3: Summarize Sections
If still over limit, summarize entire sections:
```markdown
## Conventions (summary, 12 entries archived)
- File naming: kebab-case with csp- prefix
- Commits: type(scope): description with co-author
- YAML frontmatter required for all skill files
```

### Step 4: Truncate Archive
If archive section grows too large, keep only the 20 most recent archived entries.

---

## Changelog Format

Every merge operation appends to `changelog.jsonl`:

```json
{
  "ts": "2026-06-19T14:30:00Z",
  "session": "abc123",
  "dimension": "project-core",
  "action": "merge",
  "entries_added": 2,
  "entries_updated": 1,
  "entries_archived": 0,
  "source": "csp-compound",
  "tokens_delta": 150
}
```

**Action values:**
- `append` — New entries added
- `merge` — Existing entries updated/merged
- `update` — Metadata-only changes (timestamps, confidence)
- `compress` — Compression pass executed
- `archive` — Low-confidence entries archived

---

## File Update Algorithm

```
function mergeDelta(dimensionFile, newEntries, sessionMeta):
  1. Read existing dimension file
  2. Parse frontmatter and sections
  3. For each newEntry:
     a. Find most similar existing entry in target section
     b. If similar enough (>0.85): update existing entry
     c. Else: append to section
  4. Apply confidence decay to non-confirmed entries
  5. Archive entries below threshold
  6. Check total token count, compress if needed
  7. Update frontmatter (updated_at, session_id, confidence)
  8. Write updated file
  9. Append to changelog.jsonl
  10. Update _meta.json
```

---

## Atomic Write Safety

To prevent corruption during hook execution:

1. Write to temporary file: `.csp/intel/project-core.md.tmp`
2. Verify file is valid (frontmatter parses, not empty)
3. Atomic rename: `mv tmp → project-core.md`
4. If any step fails, discard tmp and exit 0
