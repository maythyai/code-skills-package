---
name: csp-skill-authoring
description: Skill Authoring Best Practices — Format, Structure, Content Guidelines
---

# Skill Authoring Best Practices

## Golden Rules

1. **Clear Triggers**: Explain when to use and when not to use
2. **Executable Process**: Steps are imperative (commands), not descriptive text
3. **Reusable Content**: Focus on methodology, not specific tool versions
4. **Appropriate Length**: 800-2000 words. Split if over 3000 words

## Frontmatter Standards

```yaml
---
name: csp-skill-slug          # kebab-case, starts with csp-
description: When to use + what it does     # Verb first, one sentence
version: 0.1.0                # semver
layer: 4                      # 1=meta, 2=workflow, 4=patterns, 5=runtime
category: patterns            # Category label
---
```

**Required Fields**: name, description, layer, category

**Common Mistakes**:
- Using `csp-layer` instead of `layer` → Must be `layer`
- Using `level` instead of `layer` → Must be `layer`
- Description too long (>120 words) → Keep to one sentence

## Recommended Structure

```markdown
# Human-Readable Name

Overview: What scenarios to use it, what it does.

## When to Use
- Trigger condition 1
- Trigger condition 2

## When NOT to Use
- Non-trigger scenarios

## Process
1. Step one (specific action)
2. Step two
3. Step three

## Key Principles
- Principle 1
- Principle 2

## Examples (Optional)
Specific examples or code snippets.

## Related Skills
- [[related-skill]] — When to use that
```

## Trigger Design

Configure triggers in `registry.json`:

```json
"triggers": {
  "keywords": ["review", "code quality"],      // Keyword matching
  "file_patterns": ["*.rs", "Cargo.toml"],     // File pattern matching
  "context": ["review", "build"]               // Context matching
}
```

**Priority**:
- `keywords`: General trigger words, don't be overly specific
- `file_patterns`: Language/framework related files
- `context`: Task context (review, build, debug, test, etc.)

## Layer Selection

| If your skill... | Put in |
|------------------|--------|
| Is methodology/workflow (TDD, debugging, brainstorming) | L1 csp-meta |
| Is project lifecycle workflow (plan, execute, verify, ship) | L2 csp-workflow |
| Is language/framework specific patterns (Python, Rust, React patterns) | L4 csp-patterns |
| Is runtime functionality (auto-routing, memory, self-improve) | L5 csp-runtime |

## Testing Checklist

1. **Path Validation**: `node shared/scripts/audit-registry.js`
2. **Frontmatter**: `node shared/scripts/standardize-frontmatter.js --report`
3. **Local Installation**: `./install.sh --platform claude-code --dry-run`
4. **Content Review**: No internal dependencies, no hardcoded paths

## Splitting Principles

One skill does one thing. If the following occurs, consider splitting:

- File exceeds 3000 words
- "When to Use" exceeds 5 conditions
- Contains two or more independent sub-processes
- Involves unrelated topics like both "code review" and "performance optimization"

## Migration from Other Projects

1. Keep original document's methodology content
2. Remove internal path references
3. Replace with CSP standard paths and tool names
4. Adjust frontmatter to standard format