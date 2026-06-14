# Contributing to CSP

Thanks for your interest in contributing! CSP is a skill pack that integrates 6 open-source AI coding projects. Here's how to help.

## Ways to Contribute

- **Add a new skill**: Create `SKILL.md` in the appropriate `csp-*/` layer directory
- **Improve a description**: Fix unclear or incomplete skill descriptions in `registry.json` or `SKILL.md` frontmatter
- **Fix a bug**: Open a PR with the fix and a clear description of what was wrong
- **Report an issue**: Use [GitHub Issues](../../issues) with a clear reproduction

## Skill Guidelines

When adding a new skill:

1. **Pick the right layer**:
   - `csp-meta/` — methodology skills (TDD, debugging, planning)
   - `csp-workflow/` — project management workflows (plan → execute → verify)
   - `csp-meta/skills/spec-driven-development/` — 规范驱动方法论
   - `csp-patterns/` — language/framework-specific patterns and reviewers
   - `csp-runtime/` — runtime agents and commands

2. **Use the standard format**:
   - `SKILL.md` with YAML frontmatter (`name`, `description`)
   - Description follows: `"Use when [trigger], [what it does], [why]"`

3. **Register it**: Add an entry to `csp-router/registry.json` with name, description, layer, category, triggers, and path

4. **Test it**: Verify the router correctly activates the skill for its trigger conditions

## Description Format

All skill descriptions should follow this pattern:

```
Use when [trigger condition], [what the skill does], [why it matters].
```

Good:
- "Use when implementing any feature or bugfix, before writing implementation code"
- "Use when encountering all bug, test failure, or unexpected behavior, before proposing fixes"

Avoid:
- "Plan phase" (too short)
- "This skill does stuff" (not specific)

## PR Process

1. Fork the repo
2. Make your changes in a feature branch
3. Ensure descriptions follow the format above
4. Open a PR with a clear title and description
5. A maintainer will review

## Code of Conduct

Be respectful. Focus on constructive feedback. No spam or self-promotion without context.
