---
name: csp-graph-refactor
description: "Graph-powered safe refactoring. Use when renaming symbols, moving code between modules, extracting functions, detecting dead code, or validating that a refactoring won't break dependents. Covers rename preview, dependency-safe moves, dead code detection, and post-refactor verification."
layer: 2
category: workflow
version: 1.0.0
phase: build
domain: architecture
role: specialist
scope: implementation
tools: [Bash, Read, Grep, Glob, Edit]
triggers:
  keywords: ["refactor", "rename", "move function", "extract", "dead code", "unused", "safe rename", "dependency check"]
  intents: ["user wants to rename a symbol safely", "user wants to detect dead code", "user wants to move code without breaking things"]
  patterns: ["refactor_tool", "apply_refactor"]
dependencies:
  skills: [csp-code-graph, csp-graph-build]
related_skills: [csp-graph-impact, csp-graph-architecture, csp-code-review]
anti_rationalizations:
  "I'll just find-and-replace": "Text replacement misses dynamic references, string-based imports, and cross-language calls. The graph tracks all edge types."
  "This code is obviously unused": "The graph checks callers, references, dynamic dispatch, and test usage. 'Obviously unused' often has hidden consumers."
---

# Graph-Powered Safe Refactoring

Plan and execute refactoring operations with full dependency awareness. The knowledge graph tracks all structural relationships — callers, importers, inheritors, test references — so you can preview the full impact of a rename, move, or extraction before touching a single line.

## When to Use

- Renaming a function, class, or module (preview all affected references)
- Moving code between modules/files (verify no broken imports)
- Extracting a function or class (identify the minimal dependency set)
- Detecting dead code (nodes with zero inbound edges)
- Validating a refactoring didn't break anything (post-change graph diff)
- Planning a large-scale decomposition (community-guided boundary drawing)

## Phase 1: Rename Preview

Before renaming, see every reference that needs updating:

```bash
# Preview rename impact (dry run)
code-review-graph refactor rename --from "validate_token" --to "verify_auth_token" --dry-run

# Apply rename (updates all references)
code-review-graph refactor rename --from "validate_token" --to "verify_auth_token" --apply
```

### Preview Output

```
Rename: validate_token → verify_auth_token
Affected references (23 total):
  
  Direct callers (CALLS edges):
    src/api/middleware.py:45    result = validate_token(header)
    src/api/routes.py:112       user = validate_token(request.token)
    src/cli/auth.py:28          if validate_token(saved_token):
    ... (20 more)
  
  Test references (TESTED_BY edges):
    tests/test_auth.py:34       def test_validate_token_valid():
    tests/test_auth.py:67       def test_validate_token_expired():
    tests/test_integration.py:89  mock.patch('auth.validate_token')
  
  String references (REFERENCES edges):
    src/config/routes.yaml:12   handler: "validate_token"
    docs/api.md:45              Calls `validate_token` internally
  
  Dynamic references (INFERRED confidence):
    src/plugins/loader.py:78    getattr(auth_module, 'validate_token')
  
  Total: 23 references across 14 files
  Estimated effort: LOW (mechanical replacement)
  Risk: MEDIUM (string-based references may be missed by IDE rename)
```

### Rename Safety Levels

| Level | Meaning | Action |
|-------|---------|--------|
| SAFE | All references are static AST edges | Auto-apply with confidence |
| CAUTION | Has INFERRED or string references | Apply + manual verification |
| RISKY | Has AMBIGUOUS edges or cross-language refs | Manual rename with graph as guide |

## Phase 2: Dead Code Detection

Find code with no consumers:

```bash
# Detect dead code (zero inbound edges)
code-review-graph refactor dead-code

# Include test-only code (functions only called from tests)
code-review-graph refactor dead-code --include-test-only
```

### Output

```
Dead code candidates (0 inbound edges):
  [DEAD] src/utils/legacy.py::old_format_date
    - Last modified: 14 months ago
    - Community: utils-cluster (peripheral)
    - Confidence: HIGH (no callers, no references, no string matches)
  
  [DEAD] src/api/deprecated.py::v1_handler
    - Last modified: 8 months ago
    - Note: Referenced in docs/api-v1.md (documentation only)
    - Confidence: MEDIUM (may have external API consumers)
  
  [TEST-ONLY] src/utils/debug.py::dump_state
    - Only caller: tests/test_debug.py
    - Confidence: LOW (may be used in production debugging)

Total: 12 dead code candidates (est. 340 lines removable)
```

### Verification Protocol

Before removing "dead" code:

1. **Check EXTRACTED confidence** — only remove HIGH confidence dead code automatically
2. **Search for string references** — `grep -r "function_name"` for dynamic dispatch
3. **Check external consumers** — API endpoints may have external callers not in graph
4. **Verify with git blame** — recently added code might be WIP, not dead
5. **Run tests after removal** — the graph might miss a dynamic reference

## Phase 3: Move/Extract Planning

Plan moving code between modules with dependency awareness:

```bash
# Plan moving a function to a new module
code-review-graph refactor move --node "src/utils/format.py::format_currency" --to "src/money/formatting.py"

# Plan extracting a class from a god object
code-review-graph refactor extract --node "src/core/config.py::Config" --members "db_host,db_port,db_name"
```

### Move Analysis

```
Move: format_currency → src/money/formatting.py

Dependency analysis:
  Inbound (who calls format_currency): 8 callers
    - src/api/serializers.py (3 calls) — will need import update
    - src/reports/generator.py (2 calls) — will need import update
    - src/invoices/pdf.py (3 calls) — will need import update
  
  Outbound (what format_currency depends on):
    - src/utils/format.py::format_number (CONTAINS sibling)
    - src/currency/rates.py::get_rate (CALLS)
    - Python stdlib: decimal, locale
  
  Community impact:
    - Leaving: utils-cluster (reduces size by 1)
    - Joining: money-cluster (already has 3 related functions)
    - New cross-community edge: utils→money (format_number dependency)
  
  Recommendation: PROCEED
    - Update 8 import statements
    - Consider also moving format_number (tight coupling)
    - No circular dependency introduced
```

## Phase 4: Post-Refactor Verification

After applying a refactoring, verify structural integrity:

```bash
# Verify graph integrity after changes
code-review-graph verify

# Compare graph before/after refactoring
code-review-graph diff --since-last-snapshot
```

### Verification Checklist

```
Post-refactor verification:
  [✓] No dangling edges (all references resolve)
  [✓] No new circular dependencies introduced
  [✓] Community structure stable (no unexpected splits)
  [✓] All TESTED_BY edges still valid (tests reference correct paths)
  [!] 2 INFERRED edges unresolved (string-based references)
      → src/config/handlers.yaml: "old_function_name"
      → src/plugins/registry.py: getattr(module, 'old_name')
  
  Action: Manually update 2 string references, then re-verify
```

## Phase 5: Community-Guided Decomposition

For large-scale refactoring, use community structure to guide boundary drawing:

```bash
# Suggest decomposition based on community structure
code-review-graph refactor decompose --community god-object-cluster
```

### Strategy

1. **Identify the problem** — god object or oversized community
2. **Analyze internal structure** — sub-communities within the cluster
3. **Find natural seams** — low-weight internal edges = good split points
4. **Plan extraction order** — least-coupled sub-groups first
5. **Validate each step** — verify no new cross-community coupling

## Integration Points

- **Before refactoring:** Run `csp-graph-architecture` to understand current structure
- **During planning:** Use `csp-graph-impact` to preview blast radius of the refactoring
- **After applying:** Run `csp-graph-review` pre-merge check to validate
- **Ongoing:** Graph auto-updates via hooks, keeping refactoring state current
