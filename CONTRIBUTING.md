# Contributing to CSP

Thanks for your interest in contributing! CSP is a skill pack that integrates 6 open-source AI coding projects. Here's how to help.

## Ways to Contribute

- **Add a new skill**: Create `SKILL.md` in the appropriate `csp-*/` layer directory
- **Improve a description**: Fix unclear or incomplete skill descriptions in `registry.json` or `SKILL.md` frontmatter
- **Fix a bug**: Open a PR with the fix and a clear description of what was wrong
- **Report an issue**: Use [GitHub Issues](../../issues) with a clear reproduction

## Skill Guidelines

### Layer Selection

| Layer | Directory | Purpose |
|-------|-----------|---------|
| L0 | `csp-router/` | Task classification + skill auto-routing (always loaded, ~800 tokens) |
| L1 | `csp-meta/` | Methodology: brainstorming, TDD, debugging, spec-driven |
| L2 | `csp-workflow/` | Project lifecycle: plan → execute → verify → ship |
| L3 | `csp-patterns/` | Language/framework patterns, reviewers, build-resolvers |
| L4 | `csp-runtime/` | Runtime: autopilot, ralph, wiki, remember, self-improve |

### Standard Format

Every skill must have:
- `SKILL.md` with YAML frontmatter (`name`, `description`)
- Description follows: `Use when [trigger], [what it does], [why]`

Good:
- "Use when implementing any feature or bugfix, before writing implementation code"
- "Use when encountering all bug, test failure, or unexpected behavior, before proposing fixes"

Avoid:
- "Plan phase" (too short)
- "This skill does stuff" (not specific)

### Naming Conventions

- Skill slug: `csp-<name>` in kebab-case, lowercase
- Directory name matches slug exactly
- Use full words, avoid abbreviations
- Maximum 4 words in the slug

## Adding a New Skill

### 1. Create the Skill Directory

```bash
mkdir -p csp-patterns/skills/<your-skill-slug>/
```

### 2. Copy the Template

```bash
cp shared/templates/SKILL-TEMPLATE.md csp-patterns/skills/<your-skill-slug>/SKILL.md
```

### 3. Fill in Frontmatter

```yaml
---
name: csp-your-skill-slug
description: Use when [trigger condition], [what the skill does], [why it matters].
layer: L3
category: patterns
origin: csp-native
---
```

Required fields: `name`, `description`, `layer`, `category`. If migrating from another project, set `origin` to the source.

### 4. Register in `registry.json`

Add an entry to `csp-router/registry.json`:

```json
{
  "name": "csp-your-skill",
  "description": "One-line description",
  "layer": "L3",
  "category": "your-category",
  "triggers": {
    "keywords": ["keyword1", "keyword2"],
    "file_patterns": ["*.ext"],
    "context": ["review", "build"]
  },
  "stack_detection": false,
  "path": "csp-patterns/skills/your-skill-slug/SKILL.md",
  "deps": [],
  "priority": 10
}
```

### 5. Add Trigger Words

In `csp-router/triggers.yaml`, add both English and Chinese trigger words:

```yaml
"your skill name":
  skills: [csp-your-skill]
  weight: 50
"你的技能名":
  skills: [csp-your-skill]
  weight: 50
```

### 6. Update Documentation

- Add the skill to `docs/SKILL-INDEX.md`
- If it's a major feature, update `README.md` and `README_zh.md`
- Record it in `CHANGELOG.md`

### 7. Verify

```bash
# Check path consistency: every registered path must exist
node shared/scripts/audit-registry.js

# Check frontmatter completeness
node shared/scripts/standardize-frontmatter.js --report

# Dry-run installation
./install.sh --platform claude-code --dry-run
```

## PR Checklist

- [ ] `SKILL.md` contains standard frontmatter (`name`/`description`/`layer`/`category`)
- [ ] Path is registered in `registry.json`
- [ ] `audit-registry.js` reports no MISSING paths
- [ ] `standardize-frontmatter.js --report` passes
- [ ] Triggers are added to `triggers.yaml` (both English and Chinese)
- [ ] Entry added to `docs/SKILL-INDEX.md`
- [ ] Content has no internal dependencies

## PR Process

1. Fork the repo
2. Make your changes in a feature branch
3. Ensure descriptions follow the format above
4. Open a PR with a clear title and description
5. A maintainer will review

## Code of Conduct

Be respectful. Focus on constructive feedback. No spam or self-promotion without context.
