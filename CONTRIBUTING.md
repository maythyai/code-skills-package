# Contributing to CSP

Thanks for your interest in contributing! CSP is a skill pack that integrates 6 open-source AI coding projects. Here's how to help.

## Ways to Contribute

- **Add a new skill**: Create `SKILL.md` in the appropriate `csp-*/` layer directory
- **Improve a description**: Fix unclear or incomplete skill descriptions in `registry.json` or `SKILL.md` frontmatter
- **Fix a bug**: Open a PR with the fix and a clear description of what was wrong
- **Report an issue**: Use [GitHub Issues](../../issues) with a clear reproduction
- **Review skills**: Check existing skills against the [Quality Guidelines](#skill-quality-guidelines) and suggest improvements

## AI Usage Policy

We encourage using AI tools to help with contributions — they can be a great way to
write better skills, catch issues early, and navigate the skill ecosystem.

That said, **we will not review fully AI-generated PRs from first-time contributors.**
Our review resources are limited, and reviewing agent-generated skill content is
especially costly when the contributor cannot engage meaningfully in the discussion
or vouch for the correctness of the descriptions and routing logic.

This applies to issues too. A report produced by automated analysis, with no account
of how a user would hit the problem, costs us more than it saves. Tell us what you
hit in real use, and say so when you did not.

---

## Skill Quality Guidelines

### Quality Tiers

Skills are classified into three tiers based on structural completeness:

| Tier | Name | Criteria | Token Budget |
|------|------|----------|-------------|
| **A** | Reference | All Required Sections present; tables, code examples, verification checklist included | 300-800 |
| **B** | Standard | Core sections present (Purpose, When to Use, Process, Verification); code examples | 200-500 |
| **C** | Basic | Minimum structure: Purpose, When to Use, Process | 100-300 |

New skills should target **Tier B** or higher. See [SKILL-SPEC.md](docs/reference/SKILL-SPEC.md#22-required-sections-by-skill-type) for the complete Required Sections matrix by skill type.

### Description Writing Standards

The `description` field is the primary discovery mechanism. Follow these rules:

1. **Start with "Use when..."** — describes triggering conditions, NOT what the skill does
   - ✅ Good: `Use when creating new skills, editing existing skills, or verifying skills work before release.`
   - ❌ Bad: `A skill that helps you write and test new CSP skills.` (describes what, not when)

2. **Include specific symptoms and contexts** — error messages, tool names, situations
   - ✅ Good: `Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.`
   - ❌ Bad: `For debugging.`

3. **Add keyword coverage** — both English and Chinese keywords at the end
   ```yaml
   description: >
     Use when [trigger]. Keywords: keyword1, 中文关键词1, keyword2, 中文关键词2.
   ```

4. **Keep under 500 characters** — shorter descriptions load faster in routing context

### Content Hygiene (Required)

Skills ship as pure content — no provenance, no persons, no internal infrastructure:

- **No author info**: no `author:` field, personal names, or attribution footers
- **No LICENSE/NOTICE/COPYING files** inside skill directories — package license is the root `LICENSE` (MIT)
- **No lineage fields**: `origin:` is forbidden in frontmatter (including nested under `metadata:`); `source:` may only reference public projects (e.g. GitHub repos)
- **No internal URLs**: `*.alibaba-inc.com`, `*.antfin.com`, etc. are forbidden — parameterize functional URLs with placeholders (e.g. `{CR_API_BASE}`) + environment variables. Public links (github.com, official docs) are kept
- **No personal-environment hardcoding**: local paths/ports must be parameterized (env vars or relative paths)
- **No build artifacts**: `__pycache__/`, `*.pyc`, `*.bak`, `.DS_Store` must not be committed
- **Porting external skills**: verify license compatibility first (content under NC/SA-style restrictions must not be brought into this MIT package); rewrite/genericize content without source attribution

### Consistency Requirements

Skills within the same layer should follow the same structural pattern. This principle is
borrowed from TRL's "consistency over correctness" rule:

- **Same structure**: If `csp-simple-dev` uses "Step 1/N: Name (Time)" headers, other
  L2 workflow skills should do the same.
- **Same section names**: Use the standard section headers from the template
  (`## When to Use`, `## Process`, `## Verification Checklist`).
- **Divergences only where the skill type requires it** — a guardian skill needs
  `## Rationalization Defense`, a technique skill does not.
- **When in doubt, match the best existing skill in the same layer** —
  `csp-simple-dev` for L2 workflow, `csp-brainstorming` for L1 meta,
  `csp-tdd` for L1 guardian.

**When modifying a duplicated pattern**: if you change a section structure that
exists in multiple skills within the same layer, apply the same change to all of them.
Not propagating a change is a bug.

### Naming Conventions

- Skill slug: `csp-<name>` in kebab-case, lowercase
- Directory name matches slug exactly
- Use full words, avoid abbreviations
- Maximum 4 words in the slug

---

## Layer Selection

| Layer | Directory | Purpose | Target Token Budget |
|-------|-----------|---------|---------------------|
| L0 | `csp-router/` | Task classification + skill auto-routing (always loaded) | ~2000 |
| L1 | `csp-meta/` | Methodology: brainstorming, TDD, debugging, spec-driven | ~300/skill |
| L2 | `csp-workflow/` | Project lifecycle: plan → execute → verify → ship | ~500/skill |
| L3 | `csp-patterns/` | Language/framework patterns, reviewers, build-resolvers | ~200-600/skill |
| L4 | `csp-runtime/` | Runtime: autopilot, ralph, wiki, remember, self-improve | ~300/skill |

---

## Adding a New Skill

### 1. Choose the Template

```bash
# Use v3 template for new skills (recommended)
cp shared/templates/SKILL-TEMPLATE-v3.md csp-patterns/skills/<your-skill-slug>/SKILL.md
```

### 2. Fill in Frontmatter

```yaml
---
name: csp-your-skill-slug
description: >
  Use when [specific trigger condition], [context], [expected outcome].
  Keywords: [English KW], [中文关键词].
version: "0.1.0"
layer: <1|2|3|4>
category: <meta|workflow|patterns|runtime>
type: <technique|pattern|reference|workflow|guardian>
phase: <define|plan|build|verify|review|ship>
domain: <language|quality|security|architecture|devops|testing|api|patterns|other>
role: <specialist|reviewer|guardian|orchestrator>
scope: <implementation|review|analysis|design|testing>
tools: [Read, Write, Edit, Glob, Grep]
related_skills: [csp-related-1, csp-related-2]
---
```

Required fields: `name`, `description`, `layer`, `category`.

### 3. Fill in Body Sections

Follow the template. At minimum (Tier C), include:
- **Purpose**: 1-2 sentence overview
- **When to Use**: ✅/❌ trigger conditions
- **Process**: Numbered steps with checkpoints

For Tier B, also include:
- **Verification Checklist**: 3+ checkbox items
- **Examples**: 1-2 concrete scenarios
- **Key Principles**: 3-5 core rules

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

- Add the skill to `docs/reference/SKILL-INDEX.md`
- If it's a major feature, update `README.md` and `README_zh.md`
- Record it in `CHANGELOG.md`

### 7. Verify

```bash
# Run all validations
npm run validate:all

# Full build
npm run build:all

# Full test suite
npm test

# Dry-run installation
./install.sh --platform claude-code --dry-run
```

---

## Deprecation and Backward Compatibility

When a skill becomes obsolete or is replaced by a better alternative:

1. **Mark as deprecated** in frontmatter:
   ```yaml
   deprecated: true
   redirect: csp-new-skill-name
   ```

2. **Keep the SKILL.md** for at least one major version cycle — the `redirect` field
   tells the router to load the replacement instead.

3. **Remove in the next major version** — deprecated skills are cleaned up during
   X.0 releases.

**Warning classification (borrowed from TRL):**

| State | Action |
|-------|--------|
| **Correct** (fully valid, recommended) | No warning |
| **Supported but not correct** (works, deprecated) | Warning with migration guidance |
| **Not supported** (invalid, broken) | Exception |

Example deprecation in a skill body:

```markdown
> **⚠️ Deprecated**: This skill is superseded by [[csp-new-skill]].
> It will be removed in v1.0.0. Please migrate your workflows.
```

---

## Skill Review Process

When reviewing a new skill PR, check:

### Structural Review

- [ ] Frontmatter has all required fields (`name`, `description`, `layer`, `category`)
- [ ] Description starts with "Use when..." and includes keywords
- [ ] Body has Purpose, When to Use, and Process sections (Tier C minimum)
- [ ] Verification checklist has 3+ objective, checkbox items
- [ ] Content hygiene rules pass (no author, no internal URLs, no personal paths)

### Consistency Review

- [ ] Section headers match the layer's standard pattern
- [ ] Process steps follow the same format as the best reference skill in the layer
- [ ] Naming conventions followed (`csp-` prefix, kebab-case)
- [ ] Related skills use wiki-link format with when-to-use notes

### Routing Review

- [ ] Triggers do not conflict with existing skills
- [ ] Routing to this skill is discoverable (keywords in description match trigger words)
- [ ] Anti-conditions are clear (when NOT to use this skill)

### Content Quality Review

- [ ] One excellent example > many mediocre ones
- [ ] No narrative storytelling
- [ ] Code examples are minimal and runnable
- [ ] Anti-patterns table is present for guardian/discipline skills
- [ ] Token count is within layer budget

---

## PR Checklist

Before submitting a PR:

- [ ] `SKILL.md` contains standard frontmatter (`name`/`description`/`layer`/`category`)
- [ ] Description follows "Use when..." format with keywords
- [ ] Body meets Tier B quality: Purpose, When to Use, Process, Verification, Examples
- [ ] Path is registered in `registry.json`
- [ ] `audit-registry.js` reports no MISSING paths
- [ ] `standardize-frontmatter.js --report` passes
- [ ] `node scripts/validate-skill-v3.mjs` passes on the new skill
- [ ] Triggers are added to `triggers.yaml` (both English and Chinese)
- [ ] Entry added to `docs/reference/SKILL-INDEX.md`
- [ ] Content has no internal dependencies, author info, or internal URLs
- [ ] Token count is within layer budget

## PR Process

1. Fork the repo
2. Make your changes in a feature branch
3. Ensure all validations pass (`npm run validate:all && npm test`)
4. Open a PR with a clear title and description
5. Reference any related issues
6. A maintainer will review against the [Skill Review Process](#skill-review-process)

## Code of Conduct

Be respectful. Focus on constructive feedback. No spam or self-promotion without context.