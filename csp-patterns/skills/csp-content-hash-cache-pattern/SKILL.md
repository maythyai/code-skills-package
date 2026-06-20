---
name: csp-content-hash-cache-pattern
description: Cache expensive file processing results using SHA-256 content hashes — path-independent, auto-invalidating, with service layer separation.
origin: CSP
layer: 4
category: patterns
---

| Decision | Rationale |
|----------|-----------|
| SHA-256 content hash | Path-independent, auto-invalidates on content change |
| `{hash}.json` file naming | O(1) lookup, no index file needed |
| Service layer wrapper | SRP: extraction stays pure, cache is a separate concern |
| Manual JSON serialization | Full control over frozen dataclass serialization |
| Corruption returns `None` | Graceful degradation, re-processes on next run |
| `cache_dir.mkdir(parents=True)` | Lazy directory creation on first write |

## Best Practices

- **Hash content, not paths** — paths change, content identity doesn't
- **Chunk large files** when hashing — avoid loading entire files into memory
- **Keep processing functions pure** — they should know nothing about caching
- **Log cache hit/miss** with truncated hashes for debugging
- **Handle corruption gracefully** — treat invalid cache entries as misses, never crash

## Anti-Patterns to Avoid

```python
# BAD: Path-based caching (breaks on file move/rename)
cache = {"/path/to/file.pdf": result}

# BAD: Adding cache logic inside the processing function (SRP violation)
def extract_text(path, *, cache_enabled=False, cache_dir=None):
    if cache_enabled:  # Now this function has two responsibilities
        ...

# BAD: Using dataclasses.asdict() with nested frozen dataclasses
# (can cause issues with complex nested types)
data = dataclasses.asdict(entry)  # Use manual serialization instead
```

## When to Use

- File processing pipelines (PDF parsing, OCR, text extraction, image analysis)
- CLI tools that benefit from `--cache/--no-cache` options
- Batch processing where the same files appear across runs
- Adding caching to existing pure functions without modifying them

## When NOT to Use

- Data that must always be fresh (real-time feeds)
- Cache entries that would be extremely large (consider streaming instead)
- Results that depend on parameters beyond file content (e.g., different extraction configs)
