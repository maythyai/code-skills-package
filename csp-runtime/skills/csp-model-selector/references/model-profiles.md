# Model Profiles

Detailed performance characteristics for each model tier.

## Haiku

| Attribute | Value |
|-----------|-------|
| Cost (input) | ~$0.25 / 1M tokens |
| Cost (output) | ~$1.25 / 1M tokens |
| Speed | Fastest (~100+ tokens/sec) |
| Context window | 200K tokens |

**Best for:**
- Simple file operations (read, write, rename)
- Formatting and linting fixes
- Boilerplate generation
- Quick lookups and searches
- Status checks and help commands

**Limitations:**
- Struggles with multi-step reasoning
- May miss subtle bugs in code review
- Not suitable for architecture decisions
- Limited understanding of complex codebases

## Sonnet

| Attribute | Value |
|-----------|-------|
| Cost (input) | ~$3 / 1M tokens |
| Cost (output) | ~$15 / 1M tokens |
| Speed | Moderate (~60-80 tokens/sec) |
| Context window | 200K tokens |

**Best for:**
- Code review and PR feedback
- Feature implementation with clear specs
- Test writing and debugging
- Documentation generation
- Refactoring with guidance
- Standard workflow execution

**Limitations:**
- May struggle with novel architectural patterns
- Can miss edge cases in complex systems
- Not ideal for security-critical analysis
- Slower than haiku for simple tasks

## Opus

| Attribute | Value |
|-----------|-------|
| Cost (input) | ~$15 / 1M tokens |
| Cost (output) | ~$75 / 1M tokens |
| Speed | Slowest (~30-50 tokens/sec) |
| Context window | 200K tokens |

**Best for:**
- Architecture design and system planning
- Security audits and threat modeling
- Complex debugging across multiple systems
- Novel problem solving without clear patterns
- Cross-domain reasoning
- Critical production incident response

**Limitations:**
- Highest cost per token
- Slowest response time
- Overkill for simple tasks
- Budget consumption requires monitoring

## Decision Tree for Edge Cases

```
Is the task user-facing or safety-critical?
├── Yes → Use at least sonnet
│   └── Is it security/architecture related?
│       ├── Yes → Use opus
│       └── No → Use sonnet
└── No → Continue below

Does the task require multi-step reasoning?
├── Yes → Use at least sonnet
│   └── Are there >3 interdependent steps?
│       ├── Yes → Use opus
│       └── No → Use sonnet
└── No → Continue below

Is the task pattern-matching or template-based?
├── Yes → Use haiku
└── No → Use sonnet (default safe choice)
```

## Override Syntax and Precedence

### Precedence Order (highest to lowest)

1. **User explicit override** — `--model opus` or `/model opus`
2. **Budget hard limit** — Forces haiku regardless of other rules
3. **Special task rules** — Review ≥ sonnet, architecture ≥ opus
4. **Budget soft limit** — Downgrade one tier
5. **Complexity mapping** — Default table lookup

### Override Commands

```bash
# Force specific model for current task
/model-selector --force opus

# Set minimum model tier
/model-selector --min sonnet

# Reset to automatic selection
/model-selector --auto

# Check current selection without changing
/model-selector --status
```

### Configuration in settings.json

```json
{
  "csp.model_selector": {
    "default_model": "sonnet",
    "budget_aware": true,
    "allow_downgrade": true,
    "min_model_for_review": "sonnet",
    "min_model_for_architecture": "opus"
  }
}
```

## Cost Estimation Helper

For a typical session with 50K input + 10K output tokens:

| Model | Estimated Cost | Relative |
|-------|---------------|----------|
| Haiku | ~$0.025 | 1x |
| Sonnet | ~$0.30 | 12x |
| Opus | ~$1.50 | 60x |

Use this to estimate budget impact before selecting a higher tier.
