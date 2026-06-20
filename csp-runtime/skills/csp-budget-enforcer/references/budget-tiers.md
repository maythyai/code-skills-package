# Budget Tiers — Detailed Reference

Comprehensive reference for the four-tier budget degradation system.

## Tier Definitions

### Tier 0: OK (< 75%)

**Trigger condition:** `budget_percent_used < 75`

**Behavior:**
- All operations execute normally
- Default model selection (user preference or task-optimized)
- No skill restrictions
- Unlimited subagent spawning (within platform limits)
- Full workflow DAG execution

**Transition to WARNING:** When `budget_percent_used >= 75`, emit warning banner and log transition timestamp.

---

### Tier 1: WARNING (75% - 90%)

**Trigger condition:** `75 <= budget_percent_used < 90`

**Behavior:**
- Display budget warning in every response output
- Suggest concise response mode to user
- Skip loading optional references within skills
- Reduce context window allocation for non-critical data
- Log all tier transitions for audit

**Restrictions:**
- Prefer single-pass responses over multi-step exploration
- Defer non-urgent documentation generation
- Limit file reads to essential files only

**Transition to SOFT_LIMIT:** When `budget_percent_used >= 90`, initiate model downgrade and skill filtering.

---

### Tier 2: SOFT_LIMIT (90% - 100%)

**Trigger condition:** `90 <= budget_percent_used < 100`

**Behavior:**
- Automatic model downgrade per mapping table below
- Filter skills by classification (essential + standard only)
- Cap parallel subagents at 1
- Disable auto-generated artifacts (docs, reports, summaries)
- Show soft limit banner with current model and disabled skill count

**Restrictions:**
- No new optional skill loading
- No deep-research or web search unless explicitly requested
- Workflow nodes marked `optional: true` are skipped
- Subagent results are summarized aggressively before returning

**Transition to HARD_LIMIT:** When `budget_percent_used >= 100`, freeze execution and save checkpoint.

---

### Tier 3: HARD_LIMIT (> 100%)

**Trigger condition:** `budget_percent_used >= 100`

**Behavior:**
- Freeze all workflow execution immediately
- Save session state to `.csp/budget-checkpoint.json`
- Display hard limit message with recovery instructions
- Enter restricted command mode

**Allowed operations (essential only):**
- `help` — display available commands
- `status` / `budget-report` — show budget breakdown
- `save-session` — persist current work to disk
- `/csp-budget-extend` — unlock and continue
- `/csp-budget-set {tokens}` — adjust budget ceiling

**Blocked operations:**
- All code generation and modification
- Skill loading (except essential)
- Subagent spawning
- File writes (except checkpoint and session save)
- Web searches and external API calls

---

## Model Downgrade Mapping

| Current Model | WARNING | SOFT_LIMIT | Notes |
|--------------|---------|------------|-------|
| opus | opus | sonnet | Preserve quality as long as possible |
| sonnet | sonnet | haiku | Significant cost reduction |
| haiku | haiku | haiku | Already minimal; consider ending session |
| default | default | haiku | Safe fallback for unspecified models |

**Downgrade rules:**
1. Never upgrade automatically — downgrades are one-way within a session
2. User can override via `/csp-budget-set` which resets tier to OK
3. After HARD_LIMIT unlock, resume at SOFT_LIMIT tier (not OK)
4. Model preference is stored in checkpoint for cross-session consistency

---

## Skill Classification

### Essential Skills (always available)

These skills protect session integrity and user data:

- `help` — command reference
- `status` — session status
- `save-session` / `ecc:save-session` — persist state
- `budget-report` — budget diagnostics
- `csp-budget-enforcer` — self (budget management)
- `cancel` — abort active operations
- `csp-doctor` — diagnose issues

### Standard Skills (available through SOFT_LIMIT)

Core development workflow skills:

- `plan` / `writing-plans` — planning
- `execute` / `executing-plans` — implementation
- `verify` / `csp-verification` — validation
- `code-review` / `requesting-code-review` — review
- `debug` / `systematic-debugging` — troubleshooting
- `test` / `csp-tdd` — testing
- `git-workflow` / `finishing-a-development-branch` — git operations
- `ralph` — loop execution (with iteration cap)
- Language-specific patterns and reviewers

### Optional Skills (disabled at SOFT_LIMIT)

Enhancement and exploration skills:

- `brainstorming` / `csp-brainstorming` — ideation
- `deep-research` — web research
- `wiki` — knowledge base
- `self-improve` — autonomous improvement
- `ultrawork` — parallel execution
- `team` / `csp-teams` — multi-agent coordination
- `autopilot` — full autonomous mode
- `learner` — skill extraction
- `article-writing` / `content-engine` — content generation
- `market-research` / `investor-materials` — business analysis
- All L3 pattern skills not directly related to current task

---

## Workflow Engine Integration Points

### Pre-node Check

Before executing any workflow DAG node:

```
1. Read current budget_percent_used
2. Determine active tier
3. If tier == HARD_LIMIT → pause DAG, save checkpoint
4. If tier == SOFT_LIMIT && node.optional → skip node, log reason
5. If tier == WARNING → execute node, append budget warning to output
6. If tier == OK → execute node normally
```

### Post-node Update

After each node completes:

```
1. Estimate tokens consumed by this node
2. Update running totals in checkpoint
3. Re-evaluate tier (may have changed during execution)
4. If tier escalated → apply new restrictions immediately
```

### Checkpoint Schema

```json
{
  "version": "1.0",
  "session_id": "uuid",
  "session_tokens": {
    "input_total": 45000,
    "output_total": 12000,
    "estimated_remaining": 23000,
    "budget_ceiling": 200000,
    "budget_percent_used": 71.25
  },
  "current_tier": "OK",
  "tier_history": [
    {
      "tier": "OK",
      "entered_at": "2026-06-19T09:00:00Z",
      "percent_at_entry": 0.0
    }
  ],
  "model_preference": "default",
  "model_override": null,
  "skills_disabled": [],
  "workflow_state": {
    "dag_id": "autopilot-123",
    "current_node": "implement-auth",
    "completed_nodes": ["requirements", "design"],
    "paused": false
  },
  "checkpoint_timestamp": "2026-06-19T10:00:00Z"
}
```

---

## Recovery and Extension Procedures

### Extending Budget (HARD_LIMIT → SOFT_LIMIT)

1. User invokes `/csp-budget-extend`
2. System displays current usage summary and asks for confirmation
3. On confirmation:
   - Increase budget ceiling by 50% (or user-specified amount)
   - Set tier to SOFT_LIMIT (not OK)
   - Resume workflow from paused node
   - Log extension event in tier_history

### Setting New Budget Ceiling

1. User invokes `/csp-budget-set {tokens}`
2. System validates input (minimum 10K tokens)
3. Recalculate `budget_percent_used` against new ceiling
4. Re-evaluate tier based on new percentage
5. If new tier is lower → apply restrictions
6. If new tier is higher → lift restrictions accordingly

### Session Recovery from Checkpoint

1. On session start, check for `.csp/budget-checkpoint.json`
2. If found and less than 24 hours old:
   - Offer to restore previous budget state
   - Restore tier, model preference, and disabled skills
   - Resume workflow if it was paused
3. If older than 24 hours:
   - Archive checkpoint as `.csp/budget-checkpoint.archive.json`
   - Start fresh with default budget
