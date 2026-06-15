# Multi-Agent Architect — Detailed Reference

## Context Architecture Code Examples

### Structured State Object
```json
{
  "task_id": "uuid",
  "original_input": "...",
  "constraints": ["...", "..."],
  "agent_outputs": {
    "researcher": { "summary": "...", "sources": [], "confidence": 0.85 },
    "analyst": { "findings": "...", "risks": [] },
    "writer": { "draft": "..." }
  },
  "decisions": [],
  "current_step": "writer",
  "status": "in_progress"
}
```

### Context Scoping Rules
- Each agent's system prompt specifies exactly what it reads and writes
- Agents never receive another agent's full system prompt
- Sensitive data (PII, credentials) excluded from inter-agent state
- Define context ownership model: who can overwrite which fields

## Failure Taxonomy (Detailed)

| Failure Type | Description | Detection | Recovery |
|---|---|---|---|
| Hard failure | Error, exception, timeout | Error code / timeout | Retry with backoff → fallback → human |
| Silent failure | Output wrong or hallucinated | Evaluator; schema validation | Correction prompt → human review |
| Partial failure | Truncated, missing fields | Schema validation | Request specific missing fields |
| Contradiction | Conflicting outputs | Contradiction detector | Arbitration → human |
| Cascade failure | Bad output poisons downstream | Checkpoint validation | Rollback to checkpoint |
| Loop failure | Never converges | Iteration counter + plateau | Force exit; escalate |
| Context failure | Ignores instructions (overload) | Schema validation | Trim context; re-run |

## Trust & Permission Scoping

### Tool Access Matrix Example
| Agent | Web Search | Code Exec | File Write | External API | DB Read | DB Write |
|---|---|---|---|---|---|---|
| Researcher | ✅ | ❌ | ❌ | Read-only | ✅ | ❌ |
| Analyst | ❌ | ✅ sandbox | ❌ | ❌ | ✅ | ❌ |
| Writer | ❌ | ❌ | ✅ drafts | ❌ | ❌ | ❌ |
| Publisher | ❌ | ❌ | ✅ | ✅ publish | ❌ | ✅ status |

### Prompt Injection Defense
- Separate content from instructions: never concatenate external content into system prompt
- Use "sanitizer" agent for untrusted content extraction
- Validate structured outputs with schema enforcement
- Flag agent output containing instruction-like language (imperative verbs + tool names)

## Evaluation Framework

### Agent-Level Evals
| Type | Tests | Method |
|---|---|---|
| Functional | Correctness | Input/output pairs with known answers |
| Instruction adherence | Follows constraints | Adversarial inputs |
| Schema compliance | Output matches schema | Automated validation on 100+ samples |
| Confidence calibration | Stated vs actual accuracy | Compare confidence to accuracy |
| Edge cases | Empty/malformed/OOD input | Boundary test cases |

### Pipeline-Level Evals
- End-to-end accuracy
- Failure recovery correctness
- Cost compliance (within token/cost budget)
- Latency SLA
- HITL trigger rate (not too high, not too low)
- Regression (previously passing cases still pass)

## Architecture Review Checklist

**Design**: Topology documented with data flow · Each agent has role/input/output contracts · No excess tool/data access · Context budget calculated for worst case · All failure modes documented with recovery paths

**Failure Resilience**: Circuit breakers for retry-eligible agents · Fallback chain for every agent · Side-effecting agents are idempotent or have compensation · Checkpoint/rollback at every irreversible action

**HITL**: All irreversible/high-blast/low-confidence actions gated · Timeout behavior defined · Interface shows reasoning trace + alternatives + consequence · Escalation rate monitored

**Observability**: Structured log per agent call with trace_id · Consolidated pipeline trace · Cost/latency tracked per agent and per run · Alert thresholds for failure rate, cost, latency, escalation

**Evaluation**: Each agent has eval suite (≥20 cases) · Pipeline has E2E eval · Baseline scores recorded · Deployment gate: meet or exceed baseline

**Security**: Prompt injection mitigations for external content · Agent identity verified · Audit log covers all tool calls · Sensitive data excluded from inter-agent state
