# Token Estimation Reference

Practical guide for estimating token consumption across CSP operations.

## Base Consumption Rates

### Per-Operation Estimates

| Operation | Min Tokens | Max Tokens | Typical | Notes |
|-----------|-----------|------------|---------|-------|
| Skill load (SKILL.md only) | 200 | 400 | 300 | Frontmatter + instructions |
| Skill load (with references) | 400 | 800 | 600 | Includes 1-2 reference files |
| File read (< 100 lines) | 100 | 200 | 150 | Small config/source files |
| File read (100-500 lines) | 200 | 400 | 300 | Medium source files |
| File read (> 500 lines) | 400 | 800 | 600 | Large files, consider chunking |
| Code generation (simple) | 300 | 600 | 450 | Functions, configs, tests |
| Code generation (complex) | 800 | 2000 | 1400 | Multi-file refactors, architectures |
| Web search result | 500 | 1500 | 1000 | Per search query |
| Web fetch (page) | 1000 | 3000 | 2000 | Full page content as markdown |
| Subagent spawn | 2000 | 3000 | 2500 | Context transfer overhead |
| Subagent result merge | 1000 | 2000 | 1500 | Summarization cost |
| Conversation turn (user) | 100 | 300 | 200 | User message only |
| Conversation turn (assistant) | 400 | 700 | 550 | Response without tool calls |
| Tool call + result | 200 | 500 | 350 | Single tool invocation cycle |

### System Prompt Overhead

| Component | Tokens | Notes |
|-----------|--------|-------|
| Base system prompt | ~2000 | Platform and model instructions |
| CLAUDE.md (project) | ~1500 | CSP project instructions |
| CLAUDE.md (user) | ~500 | User-level instructions |
| Memory files | ~200-800 | Varies by memory size |
| Active skill context | ~300-800 | Currently loaded skill |
| MCP tool definitions | ~1000-3000 | Depends on connected servers |

**Baseline session start:** ~5000-8000 tokens before any user interaction.

---

## Model Token Efficiency Comparison

### Output Quality per Token

| Model | Input Cost/MTok | Output Cost/MTok | Quality Score | Efficiency Ratio | Best For |
|-------|----------------|-----------------|---------------|-----------------|----------|
| opus | $15 | $75 | 10/10 | 0.13 | Complex architecture, nuanced review |
| sonnet | $3 | $15 | 8/10 | 0.53 | Standard development, balanced |
| haiku | $0.80 | $4 | 6/10 | 1.50 | Simple tasks, status checks, summaries |

*Efficiency Ratio = Quality Score / (Input + Output cost normalized)*

### When to Use Each Tier

**Opus (high budget, complex tasks):**
- Architecture decisions and ADRs
- Security reviews and threat modeling
- Multi-file refactoring with subtle dependencies
- Spec writing and contract design

**Sonnet (moderate budget, standard work):**
- Feature implementation
- Test writing and debugging
- Code review (standard)
- Documentation generation

**Haiku (low budget, simple tasks):**
- Status checks and reporting
- Simple file edits and renames
- Summarization and extraction
- Budget management operations
- Help and command reference

---

## Estimation Formulas

### Session Total Estimate

```
session_tokens = baseline
               + sum(skill_loads)
               + sum(file_reads)
               + sum(conversation_turns)
               + sum(tool_calls)
               + sum(subagent_costs)
               + sum(web_operations)
```

### Skill Load Estimate

```
skill_tokens = base_skill_md (300)
             + num_references * avg_reference_size (400)
             + has_scripts * script_overhead (200)
```

### Subagent Cost Estimate

```
subagent_total = spawn_overhead (2500)
               + agent_execution_estimate
               + result_merge (1500)
               + context_sync_overhead (500)

# Rule of thumb: subagent costs 2-3x the equivalent direct execution
```

### Workflow Node Estimate

```
node_tokens = planning_overhead (500)
            + execution_estimate (varies by node type)
            + verification_overhead (300)
            + state_update (200)
```

### Budget Percent Calculation

```
budget_percent_used = (input_total + output_total) / budget_ceiling * 100

estimated_remaining = budget_ceiling - (input_total + output_total)

# With safety margin (recommended):
effective_remaining = estimated_remaining * 0.9  # 10% buffer for estimation error
```

---

## Optimization Strategies

### Reduce Skill Loading Cost

1. **Lazy loading**: Only load skills when explicitly needed, not preemptively
2. **Reference deferral**: Skip loading `references/` unless the task requires detailed guidance
3. **Skill caching**: Reuse already-loaded skill context within the same session
4. **Minimal frontmatter**: Keep SKILL.md descriptions concise (under 150 chars)

### Reduce Conversation Cost

1. **Concise prompts**: Shorter user messages reduce input tokens
2. **Batched requests**: Combine multiple questions into one turn
3. **Avoid re-reading**: Don't re-read files already in context
4. **Targeted file reads**: Use offset/limit for large files instead of reading entire contents

### Reduce Subagent Cost

1. **Minimize spawns**: Prefer direct execution over subagent delegation when possible
2. **Narrow scope**: Give subagents focused tasks with minimal context transfer
3. **Result summarization**: Request condensed outputs from subagents
4. **Sequential over parallel**: Sequential agents share context more efficiently

### Model Selection Strategy

1. **Start with sonnet** for most tasks — best balance of quality and cost
2. **Escalate to opus** only for tasks requiring deep reasoning or nuance
3. **Downgrade to haiku** for mechanical tasks (status, save, simple edits)
4. **Use budget tier** to automate this decision when budget pressure increases

### Caching and Reuse

1. **Content hash caching**: Avoid reprocessing unchanged files (see `content-hash-cache-pattern` skill)
2. **Checkpoint reuse**: Resume from checkpoints instead of restarting workflows
3. **Memory consolidation**: Periodically compact memory to reduce baseline overhead
4. **Tool result caching**: Cache expensive tool results (web fetches, searches) within session

---

## Monitoring and Alerts

### Recommended Check Intervals

| Session Phase | Check Frequency | Action on Alert |
|--------------|----------------|-----------------|
| Initial setup | After skill loading | Verify baseline is reasonable |
| Active development | Every 3-5 workflow nodes | Adjust pace if WARNING |
| Long research/exploration | Every 10 minutes | Consider switching to haiku |
| Near budget limit | Every operation | Aggressive conservation |

### Warning Thresholds

- **50%**: Informational — "Halfway through budget, pacing well"
- **75%**: WARNING tier — begin conservation measures
- **90%**: SOFT_LIMIT — active degradation
- **100%**: HARD_LIMIT — emergency conservation

### Diagnostic Commands

- `/csp-budget-status` — current usage breakdown by category
- Review `.csp/budget-checkpoint.json` for historical trend data
- Compare `estimated_remaining` vs actual to calibrate future estimates
