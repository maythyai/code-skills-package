---
name: csp-llm-app-development
description: Production LLM application development patterns covering prompt engineering, function calling, streaming, multi-model routing, guardrails, context management, structured output, error handling, and cost optimization. Use when building, reviewing, or hardening applications that call LLM APIs.
metadata:
  origin: CSP
layer: 4
category: patterns
---

# LLM Application Development

Use this skill to build reliable, cost-effective applications on top of LLM APIs with proper prompt management, tool use, output validation, error handling, and multi-model orchestration.

## When to Activate

- Building a new application that calls LLM APIs (OpenAI, Anthropic, local models)
- Adding function calling / tool use to an existing LLM integration
- Designing prompt template systems with versioning and A/B testing
- Implementing streaming responses, context window management, or conversation memory
- Adding guardrails for input/output validation, safety filtering, or structured output
- Optimizing cost through caching, batching, model selection, or prompt compression
- Handling LLM API failures, rate limits, retries, and fallback strategies

## Related Skills

- `csp-prompt-engineering` for deep prompt template management and evaluation
- `csp-rag-architecture` for retrieval-augmented generation pipelines
- `csp-vllm-serving` for self-hosted model inference
- `api-design` and `backend-patterns` for API architecture and service patterns
- `cost-aware-llm-pipeline` and `token-budget-advisor` for cost modeling

## Core Patterns

### 1. Prompt Template Management

Treat prompts as code artifacts with versioning, testing, and deployment.

```python
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from string import Template


class PromptVersion(Enum):
    DRAFT = "draft"
    TESTING = "testing"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"


@dataclass(frozen=True)
class PromptTemplate:
    """Immutable prompt template with version tracking.

    Store these in a prompts/ directory as YAML or load from a database
    for A/B testing and gradual rollout.
    """
    name: str
    version: str
    status: PromptVersion
    system_template: str
    user_template: str
    model: str
    temperature: float
    max_tokens: int
    metadata: dict = field(default_factory=dict)

    @property
    def content_hash(self) -> str:
        content = f"{self.system_template}:{self.user_template}"
        return hashlib.sha256(content.encode()).hexdigest()[:12]

    def render(self, **kwargs) -> list[dict]:
        """Render the template with variable substitution."""
        system = Template(self.system_template).safe_substitute(**kwargs)
        user = Template(self.user_template).safe_substitute(**kwargs)
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": user})
        return messages


# Example: Version-controlled prompt for code review
CODE_REVIEW_PROMPT_V1 = PromptTemplate(
    name="code-review",
    version="1.2.0",
    status=PromptVersion.PRODUCTION,
    system_template="You are a senior code reviewer. Focus on $focus_areas.",
    user_template="""Review the following code change:

File: $filename
Language: $language

Diff:
```
$diff
```

Provide findings as a JSON array of objects with fields:
- severity: "critical" | "warning" | "info"
- line: line number or null
- category: bug | security | performance | style | design
- finding: one-sentence description
- suggestion: recommended fix

If no issues found, return an empty array.""",
    model="gpt-4o",
    temperature=0.1,
    max_tokens=2048,
    metadata={"owner": "platform-team", "last_eval": "2026-05-15"},
)
```

### Prompt Registry with A/B Testing

```python
import random
from collections import defaultdict


class PromptRegistry:
    """Manage prompt versions with traffic splitting for A/B testing."""

    def __init__(self):
        self._prompts: dict[str, list[PromptTemplate]] = defaultdict(list)
        self._traffic_weights: dict[str, list[tuple[str, float]]] = {}

    def register(self, prompt: PromptTemplate) -> None:
        self._prompts[prompt.name].append(prompt)

    def set_traffic(self, name: str, weights: list[tuple[str, float]]) -> None:
        """Set traffic weights for prompt versions. E.g. [("1.0.0", 0.9), ("1.1.0", 0.1)]"""
        total = sum(w for _, w in weights)
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Traffic weights must sum to 1.0, got {total}")
        self._traffic_weights[name] = weights

    def get(self, name: str) -> PromptTemplate:
        """Get a prompt version based on traffic weights or latest production."""
        if name in self._traffic_weights:
            versions = dict(
                (p.version, p) for p in self._prompts[name]
            )
            chosen_version = random.choices(
                [v for v, _ in self._traffic_weights[name]],
                weights=[w for _, w in self._traffic_weights[name]],
            )[0]
            return versions[chosen_version]

        # Default: latest production version
        production = [p for p in self._prompts[name] if p.status == PromptVersion.PRODUCTION]
        if not production:
            raise ValueError(f"No production prompt found for '{name}'")
        return max(production, key=lambda p: p.version)


# Usage
registry = PromptRegistry()
registry.register(CODE_REVIEW_PROMPT_V1)
registry.register(CODE_REVIEW_PROMPT_V1.__class__(
    **{**vars(CODE_REVIEW_PROMPT_V1), "version": "1.3.0", "status": PromptVersion.TESTING}
))
registry.set_traffic("code-review", [("1.2.0", 0.8), ("1.3.0", 0.2)])
```

### 2. Function Calling / Tool Use

Structure tool definitions for reliable LLM function calling.

```python
import json
from typing import Any, Callable

from openai import OpenAI


def define_tools() -> list[dict]:
    """Define tools with clear descriptions, parameter validation, and examples."""
    return [
        {
            "type": "function",
            "function": {
                "name": "search_documents",
                "description": (
                    "Search internal documents by keyword or topic. "
                    "Returns document titles, summaries, and relevance scores. "
                    "Use this when the user asks about company policies, procedures, or past decisions."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query in natural language",
                        },
                        "doc_type": {
                            "type": "string",
                            "enum": ["policy", "runbook", "adr", "rfc", "meeting-notes"],
                            "description": "Filter by document type (optional)",
                        },
                        "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 20,
                            "default": 5,
                        },
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "execute_sql",
                "description": (
                    "Execute a read-only SQL query against the analytics database. "
                    "Only SELECT statements are allowed. The database contains tables: "
                    "users, orders, products, events. Always use LIMIT."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL SELECT query (read-only, must include LIMIT)",
                        },
                    },
                    "required": ["query"],
                },
            },
        },
    ]


class ToolExecutor:
    """Safe tool execution with validation, timeouts, and result formatting."""

    def __init__(self):
        self._handlers: dict[str, Callable] = {}

    def register(self, name: str, handler: Callable) -> None:
        self._handlers[name] = handler

    async def execute(self, name: str, arguments: dict) -> dict[str, Any]:
        """Execute a tool call with error handling and result formatting."""
        if name not in self._handlers:
            return {"error": f"Unknown tool: {name}", "available_tools": list(self._handlers.keys())}

        try:
            handler = self._handlers[name]
            result = await handler(**arguments)
            return {"success": True, "data": result}
        except ValueError as e:
            return {"error": f"Invalid arguments: {e}", "arguments_received": arguments}
        except TimeoutError:
            return {"error": f"Tool '{name}' timed out after 30s"}
        except Exception as e:
            return {"error": f"Tool execution failed: {type(e).__name__}: {e}"}


async def run_agent_loop(
    client: OpenAI,
    model: str,
    messages: list[dict],
    tools: list[dict],
    executor: ToolExecutor,
    max_turns: int = 10,
) -> str:
    """Run an agentic loop with function calling until the LLM produces a final answer."""
    for turn in range(max_turns):
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        msg = response.choices[0].message
        messages.append(msg.model_dump())

        if not msg.tool_calls:
            return msg.content or ""

        # Execute each tool call
        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            try:
                arguments = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                arguments = {}

            result = await executor.execute(name, arguments)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result, default=str),
            })

    return "Agent loop exceeded maximum turns."
```

### 3. Streaming Responses

```python
import asyncio
from collections.abc import AsyncIterator

from openai import AsyncOpenAI


async def stream_response(
    client: AsyncOpenAI,
    model: str,
    messages: list[dict],
    on_token: callable = None,
    on_tool_call: callable = None,
) -> str:
    """Stream LLM response token-by-token with tool call handling.

    Usage:
        async def handle_token(token: str):
            await websocket.send(token)

        full_response = await stream_response(client, "gpt-4o", messages, on_token=handle_token)
    """
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        stream_options={"include_usage": True},
    )

    full_content = ""
    tool_calls: dict[int, dict] = {}

    async for chunk in stream:
        if not chunk.choices:
            # Usage chunk at the end
            if chunk.usage and on_token:
                await on_token("", usage=chunk.usage.model_dump())
            continue

        delta = chunk.choices[0].delta

        # Content tokens
        if delta.content:
            full_content += delta.content
            if on_token:
                await on_token(delta.content)

        # Tool call deltas (streamed incrementally)
        if delta.tool_calls:
            for tc_delta in delta.tool_calls:
                idx = tc_delta.index
                if idx not in tool_calls:
                    tool_calls[idx] = {"id": "", "function": {"name": "", "arguments": ""}}
                if tc_delta.id:
                    tool_calls[idx]["id"] = tc_delta.id
                if tc_delta.function:
                    if tc_delta.function.name:
                        tool_calls[idx]["function"]["name"] += tc_delta.function.name
                    if tc_delta.function.arguments:
                        tool_calls[idx]["function"]["arguments"] += tc_delta.function.arguments

    # Notify about completed tool calls
    if tool_calls and on_tool_call:
        for tc in sorted(tool_calls.values(), key=lambda x: x["id"]):
            await on_tool_call(tc)

    return full_content
```

### 4. Multi-Model Routing

Route requests to different models based on task complexity, cost constraints, and latency requirements.

```python
import time
from dataclasses import dataclass
from enum import Enum


class TaskComplexity(Enum):
    SIMPLE = "simple"       # Classification, extraction, formatting
    MODERATE = "moderate"   # Summarization, translation, basic reasoning
    COMPLEX = "complex"     # Multi-step reasoning, code generation, analysis


@dataclass
class ModelProfile:
    name: str
    provider: str
    complexity: list[TaskComplexity]
    cost_per_1k_input: float
    cost_per_1k_output: float
    avg_latency_ms: int
    max_context_tokens: int
    supports_tools: bool
    supports_json_mode: bool


MODEL_CATALOG = {
    "gpt-4o-mini": ModelProfile(
        name="gpt-4o-mini", provider="openai",
        complexity=[TaskComplexity.SIMPLE],
        cost_per_1k_input=0.00015, cost_per_1k_output=0.00060,
        avg_latency_ms=300, max_context_tokens=128_000,
        supports_tools=True, supports_json_mode=True,
    ),
    "gpt-4o": ModelProfile(
        name="gpt-4o", provider="openai",
        complexity=[TaskComplexity.COMPLEX, TaskComplexity.MODERATE],
        cost_per_1k_input=0.0025, cost_per_1k_output=0.01,
        avg_latency_ms=800, max_context_tokens=128_000,
        supports_tools=True, supports_json_mode=True,
    ),
    "claude-sonnet-4": ModelProfile(
        name="claude-sonnet-4", provider="anthropic",
        complexity=[TaskComplexity.COMPLEX],
        cost_per_1k_input=0.003, cost_per_1k_output=0.015,
        avg_latency_ms=1200, max_context_tokens=200_000,
        supports_tools=True, supports_json_mode=False,
    ),
}


class ModelRouter:
    """Route LLM requests by task complexity, budget, and capability requirements."""

    def __init__(self, catalog: dict[str, ModelProfile] = MODEL_CATALOG):
        self.catalog = catalog
        self.usage_log: list[dict] = []

    def select_model(
        self,
        complexity: TaskComplexity,
        requires_tools: bool = False,
        requires_json: bool = False,
        max_cost_per_1k: float = 0.01,
        max_latency_ms: int = 5000,
        preferred_model: str | None = None,
    ) -> ModelProfile:
        """Select the best model for the given task constraints."""
        if preferred_model and preferred_model in self.catalog:
            return self.catalog[preferred_model]

        candidates = [
            m for m in self.catalog.values()
            if complexity in m.complexity
            and (not requires_tools or m.supports_tools)
            and (not requires_json or m.supports_json_mode)
            and m.cost_per_1k_output <= max_cost_per_1k
            and m.avg_latency_ms <= max_latency_ms
        ]

        if not candidates:
            raise ValueError(f"No model satisfies constraints: complexity={complexity}, "
                           f"tools={requires_tools}, json={requires_json}")

        # Prefer cheapest model that meets requirements
        return min(candidates, key=lambda m: m.cost_per_1k_output)

    def estimate_cost(self, model_name: str, input_tokens: int, output_tokens: int) -> float:
        m = self.catalog[model_name]
        return (input_tokens / 1000 * m.cost_per_1k_input) + (output_tokens / 1000 * m.cost_per_1k_output)

    def log_usage(self, model_name: str, input_tokens: int, output_tokens: int, latency_ms: int) -> None:
        self.usage_log.append({
            "timestamp": time.time(),
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
            "cost_usd": self.estimate_cost(model_name, input_tokens, output_tokens),
        })
```

### 5. Guardrails: Input/Output Validation

```python
import re
from dataclasses import dataclass


@dataclass
class GuardrailResult:
    passed: bool
    reason: str | None = None
    sanitized_input: str | None = None


class InputGuardrails:
    """Validate and sanitize LLM inputs before sending to the API."""

    def __init__(self, max_input_chars: int = 50_000, blocked_patterns: list[str] | None = None):
        self.max_input_chars = max_input_chars
        self.blocked_patterns = [
            re.compile(p, re.IGNORECASE)
            for p in (blocked_patterns or [
                r"ignore (all )?previous instructions",
                r"you are now (a|an) ",
                r"system prompt",
                r"\[INST\]",  # Prompt injection markers
            ])
        ]

    def validate(self, user_input: str) -> GuardrailResult:
        # Length check
        if len(user_input) > self.max_input_chars:
            return GuardrailResult(
                passed=False,
                reason=f"Input exceeds max length ({len(user_input)} > {self.max_input_chars})",
            )

        # Injection pattern detection
        for pattern in self.blocked_patterns:
            if pattern.search(user_input):
                return GuardrailResult(
                    passed=False,
                    reason=f"Input contains potential prompt injection pattern: {pattern.pattern}",
                )

        return GuardrailResult(passed=True)


class OutputGuardrails:
    """Validate LLM outputs before returning to the user."""

    def __init__(self, pii_patterns: list[str] | None = None):
        self.pii_patterns = [
            re.compile(p) for p in (pii_patterns or [
                r"\b\d{3}-\d{2}-\d{4}\b",           # SSN
                r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b",  # Email
                r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",      # Credit card
            ])
        ]

    def validate(self, output: str, redact_pii: bool = True) -> GuardrailResult:
        for pattern in self.pii_patterns:
            matches = pattern.findall(output)
            if matches:
                if redact_pii:
                    output = pattern.sub("[REDACTED]", output)
                    return GuardrailResult(passed=True, sanitized_input=output, reason="PII redacted")
                return GuardrailResult(passed=False, reason=f"Output contains PII matching: {pattern.pattern}")

        return GuardrailResult(passed=True, sanitized_input=output)
```

### 6. Context Window Management

```python
from dataclasses import dataclass


@dataclass
class ContextBudget:
    """Manage token budget across system prompt, history, and retrieved context."""
    model_max_tokens: int
    reserved_for_output: int = 1024
    system_prompt_tokens: int = 0
    max_history_turns: int = 10
    max_context_tokens: int = 4000

    @property
    def available_for_input(self) -> int:
        return self.model_max_tokens - self.system_prompt_tokens - self.reserved_for_output

    def truncate_history(self, messages: list[dict], tokenizer) -> list[dict]:
        """Keep the most recent messages that fit within the history budget."""
        if len(messages) <= 2:
            return messages

        # Always keep system message
        system = [m for m in messages if m["role"] == "system"]
        non_system = [m for m in messages if m["role"] != "system"]

        # Keep most recent turns within budget
        kept = []
        token_count = 0
        for msg in reversed(non_system):
            msg_tokens = len(tokenizer.encode(msg["content"]))
            if token_count + msg_tokens > self.available_for_input:
                break
            kept.insert(0, msg)
            token_count += msg_tokens

        return system + kept


def summarize_old_messages(
    client,
    messages: list[dict],
    keep_recent: int = 5,
    model: str = "gpt-4o-mini",
) -> list[dict]:
    """Summarize older messages to compress conversation history.

    Keeps the most recent N messages verbatim and summarizes the rest
    into a single system message. This preserves recent context while
    reducing token usage for long conversations.
    """
    if len(messages) <= keep_recent + 1:
        return messages

    system_msgs = [m for m in messages if m["role"] == "system"]
    user_assistant = [m for m in messages if m["role"] != "system"]

    old = user_assistant[:-keep_recent]
    recent = user_assistant[-keep_recent:]

    if not old:
        return messages

    old_text = "\n".join(f"{m['role']}: {m['content']}" for m in old)
    summary_response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": f"Summarize this conversation history concisely:\n{old_text}"}],
        max_tokens=512,
    )
    summary = summary_response.choices[0].message.content

    return system_msgs + [
        {"role": "system", "content": f"[Previous conversation summary]: {summary}"}
    ] + recent
```

### 7. Structured Output with Schema Enforcement

```python
import json
from pydantic import BaseModel, ValidationError


class CodeReviewFinding(BaseModel):
    severity: str  # critical, warning, info
    line: int | None
    category: str  # bug, security, performance, style, design
    finding: str
    suggestion: str


class CodeReviewResponse(BaseModel):
    findings: list[CodeReviewFinding]
    summary: str
    overall_quality: str  # good, needs-work, needs-major-changes


def call_with_structured_output(
    client,
    model: str,
    messages: list[dict],
    response_model: type[BaseModel],
) -> BaseModel:
    """Call LLM with JSON schema enforcement via response_format.

    Uses OpenAI's response_format with json_schema for guaranteed
    output structure. Falls back to manual parsing if the model
    doesn't support native structured output.
    """
    schema = response_model.model_json_schema()

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": response_model.__name__,
                "strict": True,
                "schema": schema,
            },
        },
    )

    raw = response.choices[0].message.content
    try:
        return response_model.model_validate_json(raw)
    except ValidationError as e:
        # Log the raw output for debugging, raise with context
        raise ValueError(
            f"LLM output failed schema validation for {response_model.__name__}: {e}\n"
            f"Raw output: {raw[:500]}"
        ) from e


# For models without native JSON mode, use extraction with retry
def extract_json_with_retry(
    client,
    model: str,
    messages: list[dict],
    response_model: type[BaseModel],
    max_retries: int = 2,
) -> BaseModel:
    """Extract structured data from LLM output with retry on parse failure."""
    schema_hint = json.dumps(response_model.model_json_schema(), indent=2)
    augmented = messages + [{
        "role": "system",
        "content": f"Respond ONLY with valid JSON matching this schema:\n{schema_hint}",
    }]

    for attempt in range(max_retries + 1):
        response = client.chat.completions.create(model=model, messages=augmented)
        raw = response.choices[0].message.content.strip()

        # Try to extract JSON from markdown code blocks
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        try:
            return response_model.model_validate_json(raw)
        except (ValidationError, json.JSONDecodeError):
            if attempt == max_retries:
                raise
            augmented.append({"role": "assistant", "content": raw})
            augmented.append({
                "role": "user",
                "content": "Your response was not valid JSON matching the schema. Fix it and respond again.",
            })

    raise RuntimeError("Unreachable")
```

### 8. Error Handling and Retry Strategy

```python
import time
from functools import wraps

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


class LLMRetryConfig:
    """Retry configuration for LLM API calls."""
    max_retries: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 30.0
    retryable_exceptions: tuple = (
        APIConnectionError,
        APITimeoutError,
        InternalServerError,
        RateLimitError,
    )


def with_llm_retry(config: LLMRetryConfig | None = None):
    """Decorator for retrying LLM API calls with exponential backoff."""
    if config is None:
        config = LLMRetryConfig()

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e
                    if attempt == config.max_retries:
                        break

                    # Exponential backoff with jitter
                    delay = min(
                        config.base_delay_seconds * (2 ** attempt),
                        config.max_delay_seconds,
                    )
                    # Add jitter: 50-150% of computed delay
                    import random
                    delay *= 0.5 + random.random()

                    if isinstance(e, RateLimitError):
                        # Respect Retry-After header if available
                        retry_after = getattr(e, "retry_after", None)
                        if retry_after:
                            delay = max(delay, float(retry_after))

                    time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator


@with_llm_retry()
def call_llm(client, model: str, messages: list[dict], **kwargs):
    """Call LLM with automatic retry on transient failures."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        timeout=30,
        **kwargs,
    )
```

### 9. Cost Optimization

```python
import hashlib
from dataclasses import dataclass


@dataclass
class CostTracker:
    """Track LLM costs across requests with budget enforcement."""
    daily_budget_usd: float = 50.0
    _daily_spend: float = 0.0
    _request_count: int = 0

    @property
    def remaining_budget(self) -> float:
        return max(0.0, self.daily_budget_usd - self._daily_spend)

    @property
    def budget_exhausted(self) -> bool:
        return self.remaining_budget <= 0

    def record_request(self, cost_usd: float) -> None:
        self._daily_spend += cost_usd
        self._request_count += 1

    def should_use_cache(self, estimated_cost: float) -> bool:
        """Use cache when remaining budget is below 20% or estimated cost is high."""
        return (
            self.remaining_budget < self.daily_budget_usd * 0.2
            or estimated_cost > self.remaining_budget * 0.1
        )


class SemanticCache:
    """Cache LLM responses for semantically similar queries."""

    def __init__(self, embedding_fn, similarity_threshold: float = 0.95, store=None):
        self.embedding_fn = embedding_fn
        self.threshold = similarity_threshold
        self.store = store or {}  # In production, use Redis with vector search

    def _exact_key(self, prompt: str, model: str) -> str:
        return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()

    def get(self, prompt: str, model: str) -> str | None:
        """Check cache with exact match first, then semantic similarity."""
        # Exact match
        key = self._exact_key(prompt, model)
        if key in self.store:
            return self.store[key]

        # Semantic match
        query_embedding = self.embedding_fn(prompt)
        for cached_key, cached_data in self.store.items():
            if cached_data.get("model") != model:
                continue
            cached_embedding = cached_data.get("embedding")
            if cached_embedding is None:
                continue
            similarity = _cosine_sim(query_embedding, cached_embedding)
            if similarity >= self.threshold:
                return cached_data["response"]

        return None

    def set(self, prompt: str, model: str, response: str) -> None:
        key = self._exact_key(prompt, model)
        self.store[key] = {
            "model": model,
            "response": response,
            "embedding": self.embedding_fn(prompt),
            "prompt": prompt,
        }


def _cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    return dot / (norm_a * norm_b + 1e-8)
```

## Review Checklist

- [ ] Prompts are versioned, templated, and stored outside of application code
- [ ] Function calling tools have clear descriptions, parameter validation, and error handling
- [ ] Streaming implemented for user-facing applications to reduce perceived latency
- [ ] Model routing configured based on task complexity, cost, and latency requirements
- [ ] Input guardrails check for injection patterns and length limits
- [ ] Output guardrails validate structure and redact PII
- [ ] Context window managed with history truncation or summarization
- [ ] Structured output enforced via JSON schema or extraction with retry
- [ ] Retry logic handles rate limits, timeouts, and server errors with backoff
- [ ] Cost tracked per request with daily budget enforcement
- [ ] Semantic caching implemented for repeated or similar queries

## Anti-Patterns

- Hardcoding prompts as string literals scattered across application code
- Ignoring rate limits and retrying without backoff
- Sending entire conversation history without truncation until context window overflows
- Using the most expensive model for every request regardless of task complexity
- Trusting LLM output without schema validation
- No cost tracking until the monthly bill arrives
- Treating tool call arguments as trusted input without validation
- Caching LLM responses without invalidation when underlying data changes

## Output Expectations

When using this skill, return concrete artifacts: prompt template definitions, tool schemas, model routing configuration, guardrail rules, retry policies, or cost budgets. Name model-specific behaviors that require testing instead of assuming API consistency across providers.
