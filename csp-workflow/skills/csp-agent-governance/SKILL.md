---
name: csp-agent-governance
description: >
  Patterns and techniques for adding governance, safety, and trust controls
  to AI agents. Covers 6 governance patterns (policy composition, semantic
  intent classification, tool-level decorators, trust scoring, audit trails,
  framework integration) with full Python reference implementations and 4
  governance levels. Use when building or auditing agent systems that need
  safety guardrails.
version: 1.0.0
layer: 3
category: patterns
phase: build
domain: security
role: specialist
scope: implementation
tools: [Read, Write, Edit, Bash, Glob, Grep]
related_skills:
  - [[csp-security-review]]
  - [[csp-coding-standards]]
  - [[csp-api-governance]]

anti_rationalizations:
  "Agents don't need governance, they're just tools": "Agents execute arbitrary code and access production data. Without governance, they're a security liability with a chat interface."
  "I'll add safety checks after the prototype works": "Safety retrofitting breaks the agent's behavioral model. Design governance into the agent from day one."
  "Rate limiting is enough": "Rate limiting prevents abuse, but it doesn't prevent data exfiltration, prompt injection, or privilege escalation."
---

# Agent Governance

Safety and trust controls for AI agents that execute code and access data.

## Governance Levels

| Level | Controls | Use Case |
|-------|----------|----------|
| **Open** | Audit only, no restrictions | Internal dev/testing |
| **Standard** | Tool allowlist + content filters | General production agents |
| **Strict** | All controls + human approval for sensitive ops | Financial, healthcare, legal |
| **Locked** | Allowlist only, no dynamic tools, full audit | Compliance-critical systems |

---

## Pattern 1: Governance Policy (Composable Rules)

Define security policies as composable dataclasses with most-restrictive-wins merge semantics.

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class GovernancePolicy:
    """Composable governance policy for agent operations."""
    name: str
    allowed_tools: set[str] = field(default_factory=set)
    blocked_tools: set[str] = field(default_factory=set)
    max_tokens_per_request: Optional[int] = None
    max_requests_per_minute: Optional[int] = None
    require_human_approval_for: set[str] = field(default_factory=set)

    def merge(self, other: "GovernancePolicy") -> "GovernancePolicy":
        """Merge two policies with most-restrictive-wins semantics."""
        return GovernancePolicy(
            name=f"{self.name}+{other.name}",
            allowed_tools=self.allowed_tools & other.allowed_tools if self.allowed_tools and other.allowed_tools else self.allowed_tools | other.allowed_tools,
            blocked_tools=self.blocked_tools | other.blocked_tools,
            max_tokens_per_request=min(filter(None, [self.max_tokens_per_request, other.max_tokens_per_request]), default=None),
            max_requests_per_minute=min(filter(None, [self.max_requests_per_minute, other.max_requests_per_minute]), default=None),
            require_human_approval_for=self.require_human_approval_for | other.require_human_approval_for,
        )
```

---

## Pattern 2: Semantic Intent Classification

Regex-based threat signal detection with weighted confidence scores. Catches data exfiltration, privilege escalation, system destruction, and prompt injection BEFORE tool execution.

```python
import re
from dataclasses import dataclass
from typing import ClassVar

@dataclass
class IntentSignal:
    category: str  # data_exfiltration, privilege_escalation, system_destruction, prompt_injection
    pattern: re.Pattern
    weight: float  # 0.0-1.0 contribution to category confidence

class IntentClassifier:
    SIGNALS: ClassVar[list[IntentSignal]] = [
        IntentSignal("data_exfiltration", re.compile(r"\b(?:send|email|upload|export|download)\b.*\b(?:all\s+(?:user|data|customer)s?|entire\s+database|every\s+record)", re.I), 0.9),
        IntentSignal("data_exfiltration", re.compile(r"\bcurl\b.*\|.*\bbase64\b", re.I), 0.8),
        IntentSignal("privilege_escalation", re.compile(r"\b(?:sudo|chmod\s+777|chown|setuid)\b", re.I), 0.9),
        IntentSignal("privilege_escalation", re.compile(r"\b(?:add\s+user|create\s+admin|grant\s+all)\b", re.I), 0.8),
        IntentSignal("system_destruction", re.compile(r"\b(?:rm\s+-rf|DROP\s+(?:TABLE|DATABASE)|format\s+(?:C:|/dev/))", re.I), 1.0),
        IntentSignal("prompt_injection", re.compile(r"\b(?:ignore\s+(?:previous|all|above)\s+instructions?|you\s+are\s+now\s+DAN|system\s+prompt\s*[:=])", re.I), 0.9),
        IntentSignal("prompt_injection", re.compile(r"\[INST\].*\[/INST\]|<<SYS>>.*<</SYS>>", re.I), 0.7),
    ]

    def classify(self, text: str) -> dict[str, float]:
        """Return per-category confidence scores (0.0-1.0)."""
        scores: dict[str, float] = {}
        for signal in self.SIGNALS:
            if signal.pattern.search(text):
                scores[signal.category] = max(scores.get(signal.category, 0), signal.weight)
        return scores

    def is_safe(self, text: str, threshold: float = 0.7) -> bool:
        scores = self.classify(text)
        return all(s < threshold for s in scores.values())
```

---

## Pattern 3: Tool-Level Governance Decorator

Decorator that enforces 4 checks per tool call: allowlist, rate limit, content filter, then execute + audit log.

```python
import time, json
from functools import wraps
from collections import defaultdict
from typing import Callable

class ToolGovernor:
    def __init__(self, policy: GovernancePolicy, audit_trail: "AuditTrail"):
        self.policy = policy
        self.audit = audit_trail
        self.request_counts: dict[str, list[float]] = defaultdict(list)
        self.classifier = IntentClassifier()

    def govern(self, tool_name: str):
        """Decorator that applies governance to a tool function."""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Check 1: Tool allowlist/blocklist
                if tool_name in self.policy.blocked_tools:
                    raise PermissionError(f"Tool '{tool_name}' is blocked by policy")
                if self.policy.allowed_tools and tool_name not in self.policy.allowed_tools:
                    raise PermissionError(f"Tool '{tool_name}' not in allowlist")

                # Check 2: Rate limit
                if self.policy.max_requests_per_minute:
                    now = time.time()
                    window = now - 60
                    self.request_counts[tool_name] = [t for t in self.request_counts[tool_name] if t > window]
                    if len(self.request_counts[tool_name]) >= self.policy.max_requests_per_minute:
                        raise PermissionError(f"Rate limit exceeded for '{tool_name}'")
                    self.request_counts[tool_name].append(now)

                # Check 3: Content filter on arguments
                arg_str = json.dumps({"args": args, "kwargs": kwargs}, default=str)
                if not self.classifier.is_safe(arg_str):
                    # Block execution, log attempt
                    self.audit.log("content_filter_blocked", tool_name, {"reason": "intent_classification"})
                    raise PermissionError(f"Content filter blocked '{tool_name}': unsafe intent detected")

                # Check 4: Execute + audit
                result = func(*args, **kwargs)
                self.audit.log("tool_executed", tool_name, {"args_preview": str(args)[:200]})
                return result
            return wrapper
        return decorator
```

---

## Pattern 4: Trust Scoring

Exponential temporal decay so older successes/failures carry less weight. Multi-agent trust registry for delegation decisions.

```python
import time, math

@dataclass
class TrustScore:
    successes: int = 0
    failures: int = 0
    last_updated: float = field(default_factory=time.time)

    DECAY_HALF_LIFE = 86400 * 7  # 7 days

    @property
    def reliability(self) -> float:
        if self.successes + self.failures == 0:
            return 0.5  # neutral default
        decay = 0.5 ** ((time.time() - self.last_updated) / self.DECAY_HALF_LIFE)
        raw = self.successes / (self.successes + self.failures)
        return raw * decay + 0.5 * (1 - decay)

    def record_success(self):
        self.successes += 1
        self.last_updated = time.time()

    def record_failure(self):
        self.failures += 1
        self.last_updated = time.time()

class AgentTrustRegistry:
    def __init__(self):
        self.agents: dict[str, TrustScore] = defaultdict(TrustScore)

    def can_delegate_to(self, agent_id: str, min_reliability: float = 0.7) -> bool:
        return self.agents[agent_id].reliability >= min_reliability
```

---

## Pattern 5: Audit Trail

Append-only JSONL audit log for every governed operation.

```python
import json, os
from datetime import datetime, timezone

@dataclass
class AuditEntry:
    timestamp: str
    event_type: str
    agent_id: str
    tool_name: str
    details: dict

class AuditTrail:
    def __init__(self, log_path: str = "audit.jsonl"):
        self.log_path = log_path

    def log(self, event_type: str, tool_name: str, details: dict, agent_id: str = "default"):
        entry = AuditEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            agent_id=agent_id,
            tool_name=tool_name,
            details=details,
        )
        with open(self.log_path, "a") as f:
            f.write(json.dumps(entry.__dict__, default=str) + "\n")

    def query(self, event_type: str | None = None, agent_id: str | None = None):
        """Generator-based query over audit log."""
        if not os.path.exists(self.log_path):
            return
        with open(self.log_path) as f:
            for line in f:
                entry = json.loads(line)
                if event_type and entry["event_type"] != event_type:
                    continue
                if agent_id and entry["agent_id"] != agent_id:
                    continue
                yield entry
```

---

## Pattern 6: Framework Integration

### PydanticAI
```python
from pydantic_ai import Agent, Tool

agent = Agent("openai:gpt-4o")
governor = ToolGovernor(policy, audit)

@agent.tool
@governor.govern("search_database")
async def search_database(query: str) -> list[dict]:
    return await db.search(query)
```

### OpenAI Agents SDK
```python
from agents import Agent, function_tool

@function_tool
@governor.govern("delete_record")
def delete_record(record_id: str) -> bool:
    return db.delete(record_id)
```

---

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Compose policies, don't duplicate | Most-restrictive-wins merge prevents policy drift |
| Classify intent before tool execution | Catch dangerous requests before they hit the tool |
| Audit everything | Append-only JSONL makes post-incident forensics possible |
| Decay trust scores over time | Yesterday's reliable agent may be compromised today |
| Human approval for sensitive operations | Some actions should never be fully automated |
| Use tiered governance levels | Not every agent needs Strict mode; match controls to risk |

## Quick Start Checklist

### Setup
- [ ] Define governance levels for each agent
- [ ] Create tool allowlist per agent
- [ ] Set up audit trail logging

### Implementation
- [ ] Apply `@governor.govern()` decorator to all agent tools
- [ ] Add content filtering before tool execution
- [ ] Implement rate limiting per tool

### Validation
- [ ] Test with adversarial prompts (prompt injection attempts)
- [ ] Verify audit trail captures all tool executions
- [ ] Check trust scores degrade over time

## Related Skills

- [[csp-security-review]] — Security audit for agent implementations
- [[csp-coding-standards]] — Coding standards for production agent code
- [[csp-api-governance]] — API-level governance and access control patterns