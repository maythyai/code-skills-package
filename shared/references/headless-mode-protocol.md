# Headless Mode Protocol

All CSP skills support `mode:headless` for non-interactive automation and skill-to-skill composition.

## Activation

Include `mode:headless` in skill arguments:

```
Skill("csp-strategy", "mode:headless")
Skill("csp-product-pulse", "mode:headless --from 2026-06-01")
```

## Behavior

**Headless mode changes interaction, not classification.** The skill applies the same judgment and produces the same artifacts. The only differences:

1. **No blocking questions** — skip all user-facing prompts (routing questions, confirmation dialogs, bulk previews)
2. **Structured output** — produce terminal report suitable for programmatic consumption
3. **Silent side effects** — apply `safe_auto` fixes without confirmation
4. **Completion signal** — end with "Documentation complete", "Review complete", or similar deterministic phrase

## Argument Parsing

Arguments may contain both flags and positional values. Tokens starting with `mode:` are flags — strip them and use remaining tokens as positional arguments.

```
Arguments: "mode:headless docs/plans/feature.md"
  → Flag: mode:headless (activate headless mode)
  → Positional: docs/plans/feature.md (document path)
```

## Required vs Optional Headless Arguments

Some skills require arguments in headless mode (e.g., `csp-doc-review` requires a document path). If a required argument is missing in headless mode:

```
Output: "Review failed: headless mode requires a document path. Re-invoke with: Skill(\"csp-doc-review\", \"mode:headless <path>\")"
```

Do not prompt the user — fail fast with remediation instructions.

## Output Format

Headless mode produces two outputs:

1. **Artifact** — the primary deliverable (report, document, findings) written to the expected location
2. **Terminal message** — brief completion signal for the caller

```
# csp-doc-review headless output
Wrote: /tmp/csp-doc-review/abc123/findings.json
Review complete
```

## Error Handling

In headless mode, errors that would normally trigger a user-facing question should:

1. Log the issue in the terminal output
2. Apply the most conservative default behavior
3. Include the issue in the terminal report

Example:
```
Warning: csp-feasibility-reviewer failed to dispatch. Proceeding with 6 reviewers.
Review complete
```

## Skill-Specific Headless Behavior

Each skill documents its headless behavior in its SKILL.md Phase 0 or Mode Detection section. See:

- `csp-doc-review` — silent fix application, structured findings JSON
- `csp-compound` — no session history scan, silent discoverability check
- `csp-compound-refresh` — silent keep/update/consolidate/replace/delete actions
- `csp-strategy` — no interview pushback, use most recent STRATEGY.md as anchor
- `csp-product-pulse` — no configuration interview, use existing `.csp/config.local.yaml`
