---
name: csp-prompt-engineering
description: Production prompt engineering covering template management with Jinja2/Mustache, version control, evaluation frameworks, prompt pattern libraries (chain-of-thought, few-shot, ReAct, structured output), guardrails and safety, systematic optimization, and multi-model adaptation. Use when designing, testing, versioning, or optimizing prompts for LLM applications.
metadata:
  origin: CSP
layer: 4
category: patterns
----
name: csp-prompt-engineering
description: Production prompt engineering covering template management with Jinja2/Mustache, version control, evaluation frameworks, prompt pattern libraries (chain-of-thought, few-shot, ReAct, structured output), guardrails and safety, systematic optimization, and multi-model adaptation. Use when designing, testing, versioning, or optimizing prompts for LLM applications.
metadata:
  origin: CSP
---

# Prompt Engineering

Use this skill to design, manage, evaluate, and optimize prompts as first-class engineering artifacts with version control, automated testing, safety guardrails, and systematic improvement workflows.

## When to Activate

- Designing prompt templates for new LLM features or refactoring ad-hoc prompts
- Building a prompt management system with versioning and A/B testing
- Creating evaluation frameworks to measure prompt quality automatically
- Implementing prompt patterns: chain-of-thought, few-shot, ReAct, self-consistency
- Adding guardrails for content filtering, output validation, and jailbreak prevention
- Optimizing prompts through systematic testing and regression detection
- Adapting prompts across different LLM providers and model versions
- Establishing prompt review processes in CI/CD pipelines

## Related Skills

- `csp-llm-app-development` for the application layer that consumes prompts
- `csp-rag-architecture` for retrieval-augmented prompts with context injection
- `eval-harness` for automated evaluation infrastructure
- `ai-regression-testing` for capturing prompt regressions as tests

## Prompt Template Management

### Jinja2-Based Template System

```python
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined


@dataclass
class PromptSpec:
    """Specification for a managed prompt template."""
    name: str
    version: str
    description: str
    tags: list[str] = field(default_factory=list)
    owner: str = ""
    created_at: str = ""
    updated_at: str = ""


class PromptTemplateEngine:
    """Jinja2-based prompt template engine with file-backed storage.

    Directory structure:
        prompts/
          code-review/
            v1.0.0.jinja
            v1.1.0.jinja
            metadata.yaml
          summarization/
            v2.0.0.jinja
            metadata.yaml
    """

    def __init__(self, prompts_dir: str | Path):
        self.prompts_dir = Path(prompts_dir)
        self.env = Environment(
            loader=FileSystemLoader(str(self.prompts_dir)),
            undefined=StrictUndefined,  # Fail on undefined variables
            trim_blocks=True,
            lstrip_blocks=True,
        )
        # Custom filters for prompt engineering
        self.env.filters["truncate_tokens"] = _truncate_tokens
        self.env.filters["format_list"] = _format_list
        self.env.filters["escape_xml"] = _escape_xml
        self.env.filters["json_dumps"] = _json_dumps

    def render(self, template_path: str, **kwargs) -> str:
        """Render a prompt template with variable substitution.

        Args:
            template_path: Relative path within prompts_dir (e.g., "code-review/v1.0.0.jinja")
            **kwargs: Template variables. Missing required variables raise UndefinedError.
        """
        template = self.env.get_template(template_path)
        return template.render(**kwargs)

    def list_versions(self, prompt_name: str) -> list[str]:
        """List all versions of a prompt template."""
        prompt_dir = self.prompts_dir / prompt_name
        if not prompt_dir.exists():
            return []
        return sorted(
            p.stem for p in prompt_dir.glob("*.jinja")
        )


def _truncate_tokens(text: str, max_tokens: int = 4000) -> str:
    """Truncate text to approximate token count."""
    # Rough approximation: 4 chars per token for English
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n[... truncated ...]"


def _format_list(items: list, bullet: str = "-", indent: int = 0) -> str:
    """Format a list as bullet points."""
    prefix = " " * indent + bullet + " "
    return "\n".join(f"{prefix}{item}" for item in items)


def _escape_xml(text: str) -> str:
    """Escape XML special characters for XML-tagged prompts."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _json_dumps(obj, indent: int = 2) -> str:
    """Serialize to JSON string."""
    import json
    return json.dumps(obj, indent=indent, default=str)
```

### Template Example (Jinja2)

```jinja
{# prompts/code-review/v1.0.0.jinja #}
You are a senior code reviewer specializing in {{ language | default("Python") }}.

## Review Focus
{% for area in focus_areas %}
- {{ area }}
{% endfor %}

## Code to Review
File: {{ filename }}
```{{ language | lower }}
{{ diff | escape_xml }}
```

{% if context_files %}
## Related Files for Context
{% for ctx in context_files %}
### {{ ctx.filename }}
```{{ ctx.language | lower }}
{{ ctx.content | truncate_tokens(1000) }}
```
{% endfor %}
{% endif %}

## Instructions
1. Identify bugs, security issues, performance problems, and design flaws.
2. For each finding, provide:
   - Severity: critical, warning, or info
   - Line number (if applicable)
   - Category: bug, security, performance, style, or design
   - One-sentence description
   - Suggested fix
3. {% if strict_mode %}Be thorough and flag even minor issues.{% else %}Focus on significant issues only.{% endif %}

Respond as a JSON array of finding objects. Return an empty array if no issues found.
```

### Version Control and Metadata

```yaml
# prompts/code-review/metadata.yaml
name: code-review
description: Code review prompt for diff analysis with structured findings
owner: platform-team
tags: [review, code-quality, security]

versions:
  v1.0.0:
    status: production
    created_at: "2026-03-15"
    eval_score: 0.82
    notes: "Initial production version"

  v1.1.0:
    status: testing
    created_at: "2026-06-01"
    eval_score: null
    notes: "Added context_files support and strict_mode toggle"
    changes:
      - "Added context_files parameter for multi-file review"
      - "Added strict_mode toggle for comprehensive vs focused review"
      - "Improved JSON output instructions"

  v0.9.0:
    status: deprecated
    created_at: "2026-01-10"
    eval_score: 0.71
    notes: "Deprecated: missing context file support"

# Evaluation configuration
eval:
  dataset: eval/datasets/code-review-golden-set.jsonl
  metrics:
    - finding_recall       # Did it find known issues?
    - false_positive_rate  # Did it flag non-issues?
    - severity_accuracy    # Were severities correct?
    - json_validity        # Was output valid JSON?
  threshold:
    finding_recall: 0.80
    json_validity: 0.99
```

## Evaluation Frameworks

### Automated Prompt Evaluation

```python
import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class EvalCase:
    """Single evaluation test case."""
    id: str
    input_vars: dict
    expected_behavior: str  # Human-readable description of expected output
    assertions: list[dict]  # Automated checks on the output


@dataclass
class EvalResult:
    """Result of evaluating a prompt on a single case."""
    case_id: str
    output: str
    passed: bool
    assertion_results: list[dict] = field(default_factory=list)
    latency_ms: float = 0.0
    token_count: int = 0
    cost_usd: float = 0.0


@dataclass
class EvalReport:
    """Aggregate evaluation report."""
    prompt_name: str
    prompt_version: str
    total_cases: int
    passed: int
    failed: int
    pass_rate: float
    avg_latency_ms: float
    total_cost_usd: float
    failures: list[dict] = field(default_factory=list)

    @property
    def passed_gate(self) -> bool:
        return self.pass_rate >= 0.80  # Configurable threshold


class PromptEvaluator:
    """Evaluate prompt versions against golden test datasets.

    Usage:
        evaluator = PromptEvaluator(llm_client, template_engine)
        report = evaluator.evaluate("code-review", "v1.1.0", dataset_path)
        if report.passed_gate:
            promote_to_production("code-review", "v1.1.0")
    """

    def __init__(self, llm_client, template_engine: PromptTemplateEngine):
        self.client = llm_client
        self.engine = template_engine

    def evaluate(
        self,
        prompt_name: str,
        version: str,
        dataset_path: str | Path,
        model: str = "gpt-4o",
    ) -> EvalReport:
        """Run evaluation suite against a prompt version."""
        cases = self._load_dataset(dataset_path)
        results: list[EvalResult] = []

        template_path = f"{prompt_name}/{version}.jinja"

        for case in cases:
            prompt_text = self.engine.render(template_path, **case.input_vars)
            import time
            start = time.time()

            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt_text}],
                temperature=0.1,
            )
            output = response.choices[0].message.content
            latency_ms = (time.time() - start) * 1000

            assertion_results = self._run_assertions(case, output)
            passed = all(a["passed"] for a in assertion_results)

            results.append(EvalResult(
                case_id=case.id,
                output=output,
                passed=passed,
                assertion_results=assertion_results,
                latency_ms=latency_ms,
                token_count=response.usage.total_tokens if response.usage else 0,
                cost_usd=_estimate_cost(response.usage, model) if response.usage else 0,
            ))

        passed_count = sum(1 for r in results if r.passed)
        failures = [
            {"case_id": r.case_id, "assertions": r.assertion_results}
            for r in results if not r.passed
        ]

        return EvalReport(
            prompt_name=prompt_name,
            prompt_version=version,
            total_cases=len(results),
            passed=passed_count,
            failed=len(results) - passed_count,
            pass_rate=passed_count / len(results) if results else 0,
            avg_latency_ms=sum(r.latency_ms for r in results) / len(results) if results else 0,
            total_cost_usd=sum(r.cost_usd for r in results),
            failures=failures,
        )

    def _run_assertions(self, case: EvalCase, output: str) -> list[dict]:
        """Run assertion checks against LLM output."""
        results = []
        for assertion in case.assertions:
            check_type = assertion["type"]
            result = {"assertion": assertion, "passed": False, "detail": ""}

            if check_type == "contains":
                result["passed"] = assertion["value"] in output
                result["detail"] = f"Output {'contains' if result['passed'] else 'missing'}: {assertion['value']}"

            elif check_type == "not_contains":
                result["passed"] = assertion["value"] not in output
                result["detail"] = f"Output {'correctly excludes' if result['passed'] else 'incorrectly contains'}: {assertion['value']}"

            elif check_type == "valid_json":
                try:
                    json.loads(output)
                    result["passed"] = True
                    result["detail"] = "Valid JSON"
                except json.JSONDecodeError as e:
                    result["detail"] = f"Invalid JSON: {e}"

            elif check_type == "json_schema":
                try:
                    parsed = json.loads(output)
                    # Validate against expected schema keys
                    required_keys = assertion.get("required_keys", [])
                    missing = [k for k in required_keys if k not in parsed]
                    result["passed"] = len(missing) == 0
                    result["detail"] = f"Missing keys: {missing}" if missing else "Schema valid"
                except json.JSONDecodeError as e:
                    result["detail"] = f"Invalid JSON: {e}"

            elif check_type == "length_range":
                length = len(output)
                min_len = assertion.get("min", 0)
                max_len = assertion.get("max", float("inf"))
                result["passed"] = min_len <= length <= max_len
                result["detail"] = f"Length {length} in range [{min_len}, {max_len}]"

            elif check_type == "regex_match":
                import re
                result["passed"] = bool(re.search(assertion["pattern"], output))
                result["detail"] = f"Regex {'matched' if result['passed'] else 'did not match'}: {assertion['pattern']}"

            elif check_type == "llm_judge":
                # Use another LLM to judge output quality
                judge_result = self._llm_judge(
                    output=output,
                    criteria=assertion["criteria"],
                    rubric=assertion.get("rubric", ""),
                )
                result["passed"] = judge_result["score"] >= assertion.get("threshold", 0.7)
                result["detail"] = f"LLM judge score: {judge_result['score']}, reasoning: {judge_result['reasoning']}"

            results.append(result)
        return results

    def _llm_judge(self, output: str, criteria: str, rubric: str = "") -> dict:
        """Use an LLM to evaluate output quality."""
        judge_prompt = f"""Evaluate the following output against these criteria:

Criteria: {criteria}
{f'Rubric: {rubric}' if rubric else ''}

Output:
{output}

Score from 0.0 to 1.0 and explain your reasoning.
Respond as JSON: {{"score": N, "reasoning": "..."}}"""

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": judge_prompt}],
            response_format={"type": "json_object"},
            temperature=0,
        )
        return json.loads(response.choices[0].message.content)

    def _load_dataset(self, path: str | Path) -> list[EvalCase]:
        """Load evaluation dataset from JSONL file."""
        cases = []
        for line in Path(path).read_text().strip().split("\n"):
            data = json.loads(line)
            cases.append(EvalCase(
                id=data["id"],
                input_vars=data["input"],
                expected_behavior=data["expected"],
                assertions=data["assertions"],
            ))
        return cases


def _estimate_cost(usage, model: str) -> float:
    """Estimate API cost from token usage."""
    rates = {
        "gpt-4o": {"input": 2.50 / 1_000_000, "output": 10.00 / 1_000_000},
        "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
    }
    rate = rates.get(model, rates["gpt-4o"])
    return (usage.prompt_tokens * rate["input"]) + (usage.completion_tokens * rate["output"])
```

### Regression Detection in CI

```python
import subprocess
import sys
from pathlib import Path


def run_prompt_regression_check(
    prompts_dir: str = "prompts",
    eval_dir: str = "eval",
    baseline_version: str | None = None,
) -> bool:
    """Run prompt regression checks as part of CI/CD.

    Compares current prompt versions against their evaluation baselines.
    Fails if any prompt version scores below its baseline threshold.
    """
    engine = PromptTemplateEngine(prompts_dir)
    evaluator = PromptEvaluator(llm_client=None, template_engine=engine)  # inject real client

    all_passed = True

    for prompt_dir in Path(prompts_dir).iterdir():
        if not prompt_dir.is_dir():
            continue

        metadata_path = prompt_dir / "metadata.yaml"
        if not metadata_path.exists():
            continue

        import yaml
        metadata = yaml.safe_load(metadata_path.read_text())
        eval_config = metadata.get("eval", {})
        dataset_path = eval_config.get("dataset")
        thresholds = eval_config.get("threshold", {})

        if not dataset_path:
            continue

        # Find the latest testing or production version
        versions = engine.list_versions(prompt_dir.name)
        if not versions:
            continue

        latest = versions[-1]
        template_path = f"{prompt_dir.name}/{latest}.jinja"

        print(f"Evaluating {template_path}...")

        # In CI, you'd inject a real LLM client here
        # report = evaluator.evaluate(prompt_dir.name, latest, dataset_path)
        # if not report.passed_gate:
        #     print(f"FAIL: {template_path} pass_rate={report.pass_rate:.2%}")
        #     all_passed = False
        # else:
        #     print(f"PASS: {template_path} pass_rate={report.pass_rate:.2%}")

    return all_passed
```

## Prompt Patterns Library

### Chain-of-Thought (CoT)

```jinja
{# prompts/patterns/chain-of-thought.jinja #}
You are solving a {{ problem_type | default("reasoning") }} problem.

## Problem
{{ problem }}

## Instructions
Think through this step by step:

1. First, identify what is being asked and what information is given.
2. Break the problem into smaller sub-problems.
3. For each sub-problem, show your reasoning explicitly.
4. Verify intermediate results before proceeding.
5. State your final answer clearly.

{% if examples %}
## Example
**Problem:** {{ examples[0].problem }}
**Step-by-step reasoning:**
{{ examples[0].reasoning }}
**Answer:** {{ examples[0].answer }}
{% endif %}

Show your work for each step. Do not skip reasoning steps.
```

### Few-Shot with Dynamic Example Selection

```python
import json
from dataclasses import dataclass


@dataclass
class FewShotExample:
    """A single few-shot example with input and expected output."""
    input_text: str
    output_text: str
    tags: list[str]
    embedding: list[float] | None = None


class DynamicFewShotSelector:
    """Select the most relevant few-shot examples for a given input.

    Uses embedding similarity to find examples most similar to the
    current input, ensuring the model sees relevant demonstrations.
    """

    def __init__(
        self,
        examples: list[FewShotExample],
        embedding_fn,
        max_examples: int = 3,
        min_similarity: float = 0.7,
    ):
        self.examples = examples
        self.embedding_fn = embedding_fn
        self.max_examples = max_examples
        self.min_similarity = min_similarity

        # Pre-compute embeddings for all examples
        if examples and examples[0].embedding is None:
            texts = [e.input_text for e in examples]
            embeddings = embedding_fn(texts)
            for ex, emb in zip(examples, embeddings):
                ex.embedding = emb

    def select(self, query: str) -> list[FewShotExample]:
        """Select the most relevant examples for the query."""
        query_embedding = self.embedding_fn([query])[0]

        scored = []
        for ex in self.examples:
            if ex.embedding is None:
                continue
            sim = _cosine_sim(query_embedding, ex.embedding)
            if sim >= self.min_similarity:
                scored.append((sim, ex))

        scored.sort(key=lambda x: x[0], reverse=True)

        # Return top examples, diverse in output patterns
        selected = []
        seen_outputs = set()
        for sim, ex in scored[:self.max_examples * 2]:
            output_key = ex.output_text[:50]  # Rough dedup
            if output_key not in seen_outputs:
                selected.append(ex)
                seen_outputs.add(output_key)
            if len(selected) >= self.max_examples:
                break

        return selected

    def format_for_prompt(self, examples: list[FewShotExample]) -> str:
        """Format selected examples for prompt injection."""
        parts = []
        for i, ex in enumerate(examples, 1):
            parts.append(f"Example {i}:\nInput: {ex.input_text}\nOutput: {ex.output_text}")
        return "\n\n".join(parts)


def _cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    return dot / (norm_a * norm_b + 1e-8)
```

### ReAct (Reasoning + Acting)

```jinja
{# prompts/patterns/react-agent.jinja #}
You are an agent that solves tasks by reasoning and taking actions.

## Available Tools
{% for tool in tools %}
- **{{ tool.name }}**: {{ tool.description }}
  Parameters: {{ tool.parameters | json_dumps }}
{% endfor %}

## Task
{{ task }}

## Response Format
Use this exact format for each step:

Thought: [Your reasoning about the current state and what to do next]
Action: [Tool name]
Action Input: [JSON parameters for the tool]

After receiving a tool result:

Thought: [Reasoning about the result]
Action: [Next tool or "Final Answer"]
Action Input: [Parameters or final answer text]

When you have enough information to answer:

Thought: [Final reasoning]
Final Answer: [Your answer to the task]

## Rules
- Always think before acting.
- Use one tool at a time.
- If a tool returns an error, try a different approach.
- Do not fabricate tool results.
- Provide a Final Answer when the task is complete.

## History
{% for step in history %}
{% if step.type == "thought" %}
Thought: {{ step.content }}
{% elif step.type == "action" %}
Action: {{ step.tool }}
Action Input: {{ step.input | json_dumps }}
{% elif step.type == "observation" %}
Observation: {{ step.content }}
{% endif %}
{% endfor %}
```

### Self-Consistency (Majority Vote)

```python
import json
from collections import Counter


def self_consistency_call(
    client,
    model: str,
    messages: list[dict],
    n_samples: int = 5,
    temperature: float = 0.7,
    extract_answer=None,
) -> dict:
    """Run self-consistency: sample multiple outputs and take majority vote.

    This significantly improves accuracy on reasoning tasks by reducing
    variance from any single generation path.

    Args:
        n_samples: Number of independent samples to generate
        extract_answer: Function to extract the answer from each response.
                       If None, uses the full response text as the answer.

    Returns:
        Dict with majority answer, confidence, and all samples.
    """
    answers = []
    raw_responses = []

    for _ in range(n_samples):
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        raw = response.choices[0].message.content
        raw_responses.append(raw)

        answer = extract_answer(raw) if extract_answer else raw.strip()
        answers.append(answer)

    # Majority vote
    counts = Counter(answers)
    majority_answer, majority_count = counts.most_common(1)[0]
    confidence = majority_count / len(answers)

    return {
        "answer": majority_answer,
        "confidence": confidence,
        "votes": dict(counts),
        "n_samples": n_samples,
        "all_responses": raw_responses,
    }


# Usage example with structured answer extraction
def extract_yes_no(text: str) -> str:
    """Extract YES/NO answer from a reasoning response."""
    text_upper = text.upper()
    if "FINAL ANSWER: YES" in text_upper or text_upper.strip().endswith("YES"):
        return "YES"
    if "FINAL ANSWER: NO" in text_upper or text_upper.strip().endswith("NO"):
        return "NO"
    return "UNKNOWN"
```

### Structured Output Prompt Pattern

```jinja
{# prompts/patterns/structured-output.jinja #}
{{ task_description }}

## Output Schema
You MUST respond with valid JSON matching this schema:
```json
{{ schema | json_dumps(indent=2) }}
```

## Rules
- Respond ONLY with the JSON object. No explanation, no markdown fences.
- All required fields must be present.
- Enum fields must use one of the listed values.
- If a field is unknown, use null (not a placeholder string).
- {% if allow_arrays %}Arrays should contain only items matching the item schema.{% endif %}

{% if examples %}
## Example Output
```json
{{ examples[0] | json_dumps(indent=2) }}
```
{% endif %}
```

### Role-Based Prompt Pattern

```jinja
{# prompts/patterns/role-based.jinja #}
You are {{ role }}.

## Your Expertise
{% for area in expertise_areas %}
- {{ area }}
{% endfor %}

## Your Communication Style
{{ communication_style | default("Clear, concise, and technically precise. Use examples when helpful.") }}

## Boundaries
{% for boundary in boundaries | default([]) %}
- {{ boundary }}
{% endfor %}

## Task
{{ task }}

{% if output_format %}
## Output Format
{{ output_format }}
{% endif %}
```

### Meta-Prompt Pattern (Prompt that Generates Prompts)

```jinja
{# prompts/patterns/meta-prompt.jinja #}
You are a prompt engineering expert. Your task is to create an optimized prompt
for an LLM to accomplish a specific goal.

## Goal
{{ goal }}

## Target Model
{{ target_model | default("GPT-4o or Claude Sonnet") }}

## Context
{{ context | default("No additional context provided.") }}

## Requirements
1. The prompt should be clear, specific, and unambiguous.
2. Include relevant constraints and output format specifications.
3. Use structured sections (role, task, format, constraints) when appropriate.
4. Include examples if the task benefits from few-shot learning.
5. Anticipate common failure modes and add instructions to prevent them.

## Output
Provide:
1. The optimized prompt (in a code block)
2. A brief explanation of key design decisions
3. Potential failure modes this prompt addresses
4. Suggestions for evaluation criteria
```

## Guardrails and Safety

### Content Filtering Pipeline

```python
import re
from dataclasses import dataclass
from enum import Enum


class FilterAction(Enum):
    PASS = "pass"
    WARN = "warn"
    BLOCK = "block"
    REDACT = "redact"


@dataclass
class FilterResult:
    action: FilterAction
    matched_rules: list[str]
    sanitized_text: str | None = None
    reason: str = ""


class PromptSafetyFilter:
    """Multi-layer safety filter for LLM inputs and outputs.

    Layers:
    1. Pattern matching (fast, deterministic)
    2. Classifier model (slower, catches novel attacks)
    3. LLM-based judge (most expensive, for edge cases)
    """

    def __init__(self, custom_blocklist: list[str] | None = None):
        self.injection_patterns = [
            re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)", re.I),
            re.compile(r"you\s+are\s+now\s+(a|an|in)\s+", re.I),
            re.compile(r"(system|developer)\s*:\s*", re.I),
            re.compile(r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>", re.I),
            re.compile(r"forget\s+(everything|all)\s+(you|that)\s+", re.I),
            re.compile(r"new\s+instructions?\s*:", re.I),
            re.compile(r"override\s+(your|the)\s+(instructions?|rules?|training)", re.I),
            re.compile(r"act\s+as\s+if\s+you\s+(are|have|can)", re.I),
            re.compile(r"pretend\s+(to\s+be|you\s+are|you'\s*re)", re.I),
            re.compile(r"(DAN|STAN|AIM|DUDE|Jailbreak)\s+mode", re.I),
        ]

        self.pii_patterns = [
            (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
            (re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"), "credit_card"),
            (re.compile(r"(?i)(api[_-]?key|secret[_-]?key|password|token)\s*[:=]\s*['\"]?[\w-]{16,}"), "credential"),
        ]

        self.custom_blocklist = [
            re.compile(re.escape(term), re.I)
            for term in (custom_blocklist or [])
        ]

    def filter_input(self, text: str) -> FilterResult:
        """Filter user input for injection attacks and PII."""
        matched = []

        # Check injection patterns
        for pattern in self.injection_patterns:
            if pattern.search(text):
                matched.append(f"injection:{pattern.pattern}")

        if matched:
            return FilterResult(
                action=FilterAction.BLOCK,
                matched_rules=matched,
                reason="Potential prompt injection detected",
            )

        # Check PII
        pii_found = []
        sanitized = text
        for pattern, pii_type in self.pii_patterns:
            matches = pattern.findall(text)
            if matches:
                pii_found.append(pii_type)
                sanitized = pattern.sub(f"[{pii_type.upper()} REDACTED]", sanitized)

        if pii_found:
            return FilterResult(
                action=FilterAction.REDACT,
                matched_rules=[f"pii:{t}" for t in pii_found],
                sanitized_text=sanitized,
                reason=f"PII detected and redacted: {pii_found}",
            )

        # Check custom blocklist
        for pattern in self.custom_blocklist:
            if pattern.search(text):
                matched.append(f"blocklist:{pattern.pattern}")

        if matched:
            return FilterResult(
                action=FilterAction.BLOCK,
                matched_rules=matched,
                reason="Input matched custom blocklist",
            )

        return FilterResult(action=FilterAction.PASS, matched_rules=[])

    def filter_output(self, text: str) -> FilterResult:
        """Filter LLM output for harmful content and PII leakage."""
        # Check for PII that the model might have generated
        pii_found = []
        sanitized = text
        for pattern, pii_type in self.pii_patterns:
            matches = pattern.findall(text)
            if matches:
                pii_found.append(pii_type)
                sanitized = pattern.sub(f"[REDACTED]", sanitized)

        if pii_found:
            return FilterResult(
                action=FilterAction.REDACT,
                matched_rules=[f"output_pii:{t}" for t in pii_found],
                sanitized_text=sanitized,
                reason=f"Output contains PII: {pii_found}",
            )

        # Check for system prompt leakage
        leakage_patterns = [
            re.compile(r"(my instructions|system prompt|I was told to)", re.I),
            re.compile(r"(ignore.*instructions|developer mode)", re.I),
        ]
        for pattern in leakage_patterns:
            if pattern.search(text):
                return FilterResult(
                    action=FilterAction.WARN,
                    matched_rules=[f"leakage:{pattern.pattern}"],
                    reason="Output may contain prompt leakage",
                )

        return FilterResult(action=FilterAction.PASS, matched_rules=[])
```

### Output Validation Layer

```python
import json
from pydantic import BaseModel, ValidationError
from typing import Type, TypeVar

T = TypeVar("T", bound=BaseModel)


class OutputValidator:
    """Validate and repair LLM outputs against expected schemas."""

    @staticmethod
    def validate_json(text: str, model_class: Type[T]) -> T:
        """Parse and validate JSON output against a Pydantic model.

        Handles common LLM output issues:
        - Markdown code fences around JSON
        - Trailing commas
        - Extra text before/after JSON
        """
        cleaned = OutputValidator._extract_json(text)
        try:
            return model_class.model_validate_json(cleaned)
        except ValidationError:
            # Attempt repair: fix trailing commas, missing brackets
            repaired = OutputValidator._repair_json(cleaned)
            return model_class.model_validate_json(repaired)

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON from potentially noisy LLM output."""
        text = text.strip()

        # Remove markdown code fences
        if "```json" in text:
            text = text.split("```json")[1]
            text = text.split("```")[0]
        elif "```" in text:
            text = text.split("```")[1]
            text = text.split("```")[0]

        # Find JSON boundaries if surrounded by text
        start = text.find("{")
        if start == -1:
            start = text.find("[")
        end = text.rfind("}")
        if end == -1:
            end = text.rfind("]")

        if start != -1 and end != -1 and end > start:
            text = text[start:end + 1]

        return text.strip()

    @staticmethod
    def _repair_json(text: str) -> str:
        """Attempt basic JSON repairs."""
        # Remove trailing commas before closing brackets
        import re
        text = re.sub(r",\s*([}\]])", r"\1", text)

        # Add missing closing bracket
        if text.count("{") > text.count("}"):
            text += "}"
        if text.count("[") > text.count("]"):
            text += "]"

        return text
```

## Prompt Optimization

### Systematic Testing Framework

```python
from itertools import product
from dataclasses import dataclass


@dataclass
class PromptVariant:
    """A specific combination of prompt parameters to test."""
    name: str
    parameters: dict
    template_path: str


class PromptOptimizer:
    """Systematically test prompt variations and find the best performer.

    This implements a structured approach to prompt optimization:
    1. Define the parameter space (temperature, examples, instructions, format)
    2. Test all combinations against the evaluation dataset
    3. Rank by target metric with cost awareness
    4. Detect regressions against the current production prompt
    """

    def __init__(self, evaluator: PromptEvaluator, template_engine: PromptTemplateEngine):
        self.evaluator = evaluator
        self.engine = template_engine

    def grid_search(
        self,
        base_template: str,
        parameter_grid: dict[str, list],
        dataset_path: str,
        model: str = "gpt-4o",
    ) -> list[dict]:
        """Run grid search over prompt parameter combinations.

        Args:
            base_template: Path to the base Jinja2 template
            parameter_grid: Dict of parameter names to value lists.
                Example: {"temperature": [0.0, 0.3, 0.7],
                          "include_examples": [True, False],
                          "chain_of_thought": [True, False]}
            dataset_path: Path to evaluation dataset

        Returns:
            List of results sorted by pass_rate descending.
        """
        param_names = list(parameter_grid.keys())
        param_values = list(parameter_grid.values())

        results = []
        for combo in product(*param_values):
            params = dict(zip(param_names, combo))
            variant_name = "_".join(f"{k}={v}" for k, v in params.items())

            report = self.evaluator.evaluate(
                prompt_name=base_template.split("/")[0],
                version=base_template.split("/")[1].replace(".jinja", ""),
                dataset_path=dataset_path,
                model=model,
            )

            results.append({
                "variant": variant_name,
                "parameters": params,
                "pass_rate": report.pass_rate,
                "avg_latency_ms": report.avg_latency_ms,
                "total_cost_usd": report.total_cost_usd,
                "failures": len(report.failures),
            })

        results.sort(key=lambda r: r["pass_rate"], reverse=True)
        return results

    def detect_regression(
        self,
        candidate_report,
        baseline_report,
        metric: str = "pass_rate",
        threshold: float = 0.02,
    ) -> dict:
        """Detect if a candidate prompt regresses compared to baseline.

        A regression is flagged when the candidate's metric drops below
        the baseline by more than the threshold (default 2%).
        """
        candidate_value = getattr(candidate_report, metric)
        baseline_value = getattr(baseline_report, metric)
        delta = candidate_value - baseline_value

        return {
            "metric": metric,
            "baseline": baseline_value,
            "candidate": candidate_value,
            "delta": delta,
            "is_regression": delta < -threshold,
            "threshold": threshold,
        }
```

### Multi-Model Prompt Adaptation

```python
from dataclasses import dataclass


@dataclass
class ModelPromptProfile:
    """Model-specific prompt tuning parameters."""
    name: str
    max_context_tokens: int
    prefers_system_role: bool
    supports_xml_tags: bool
    few_shot_sensitivity: str  # "low", "medium", "high"
    instruction_following: str  # "strict", "moderate", "loose"
    notes: str = ""


MODEL_PROFILES = {
    "gpt-4o": ModelPromptProfile(
        name="gpt-4o",
        max_context_tokens=128_000,
        prefers_system_role=True,
        supports_xml_tags=True,
        few_shot_sensitivity="medium",
        instruction_following="strict",
        notes="Strong instruction following, handles complex formatting well.",
    ),
    "gpt-4o-mini": ModelPromptProfile(
        name="gpt-4o-mini",
        max_context_tokens=128_000,
        prefers_system_role=True,
        supports_xml_tags=True,
        few_shot_sensitivity="high",
        instruction_following="moderate",
        notes="Benefits from more examples, may need simpler instructions.",
    ),
    "claude-sonnet-4": ModelPromptProfile(
        name="claude-sonnet-4",
        max_context_tokens=200_000,
        prefers_system_role=True,
        supports_xml_tags=True,
        few_shot_sensitivity="low",
        instruction_following="strict",
        notes="Excellent with XML tags, handles very long contexts.",
    ),
    "llama-3.1-70b": ModelPromptProfile(
        name="llama-3.1-70b",
        max_context_tokens=128_000,
        prefers_system_role=True,
        supports_xml_tags=False,
        few_shot_sensitivity="high",
        instruction_following="moderate",
        notes="Open-source, benefits from explicit formatting and more examples.",
    ),
}


class MultiModelPromptAdapter:
    """Adapt prompts for different model families and versions.

    Different models respond differently to:
    - System vs user role placement
    - XML tags vs markdown formatting
    - Few-shot example count and style
    - Instruction verbosity and specificity
    - Output format enforcement
    """

    def __init__(self, profiles: dict[str, ModelPromptProfile] = MODEL_PROFILES):
        self.profiles = profiles

    def adapt(self, base_prompt: str, model_name: str) -> str:
        """Adapt a base prompt for a specific model."""
        profile = self.profiles.get(model_name)
        if profile is None:
            return base_prompt  # No adaptation, use as-is

        adapted = base_prompt

        # Model-specific adaptations
        if not profile.supports_xml_tags:
            # Replace XML tags with markdown-style headers
            import re
            adapted = re.sub(r"<(\w+)>", r"## \1", adapted)
            adapted = re.sub(r"</(\w+)>", r"## /\1", adapted)

        if profile.few_shot_sensitivity == "high":
            # Add a note about following examples closely
            adapted += "\n\nFollow the provided examples closely in format and style."

        if profile.instruction_following == "loose":
            # Add reinforcement for critical instructions
            adapted = f"IMPORTANT: Follow these instructions exactly.\n\n{adapted}"

        return adapted

    def suggest_improvements(self, prompt: str, model_name: str, eval_results: list[dict]) -> list[str]:
        """Suggest prompt improvements based on evaluation failures for a specific model."""
        profile = self.profiles.get(model_name)
        suggestions = []

        # Analyze common failure patterns
        json_failures = [r for r in eval_results if "json" in str(r.get("assertions", "")).lower()]
        if len(json_failures) > len(eval_results) * 0.1:
            suggestions.append(
                "High JSON parse failure rate. Add explicit JSON format instructions "
                "and an example output."
            )

        if profile and profile.few_shot_sensitivity == "high":
            suggestions.append(
                f"{model_name} benefits from more few-shot examples. "
                "Consider adding 2-3 representative examples."
            )

        return suggestions
```

## Review Checklist

- [ ] Prompts stored as versioned Jinja2/Mustache templates, not inline strings
- [ ] Each prompt has metadata: owner, version, eval score, tags
- [ ] Evaluation dataset exists for every production prompt
- [ ] Automated eval runs in CI before prompt changes merge
- [ ] Regression detection compares candidates against production baseline
- [ ] Chain-of-thought, few-shot, and ReAct patterns used appropriately
- [ ] Self-consistency (majority vote) used for high-stakes reasoning tasks
- [ ] Structured output enforced with schema validation and JSON repair
- [ ] Input guardrails check for injection patterns and PII
- [ ] Output guardrails validate structure, redact PII, and detect leakage
- [ ] Multi-model adaptation handles differences in instruction following
- [ ] Prompt cost (tokens) tracked per request for budget management

## Anti-Patterns

- Prompts hardcoded as string literals scattered across application code
- No evaluation dataset -- relying on manual spot-checks
- Changing production prompts without regression testing
- Using the same prompt for all models without adaptation
- Overloading a single prompt with too many tasks (decompose instead)
- Ignoring output validation and trusting raw LLM text
- No version tracking -- cannot identify which prompt version caused a regression
- Adding few-shot examples without checking relevance to the current input
- Testing prompts only with happy-path inputs, ignoring edge cases and adversarial inputs

## Output Expectations

When using this skill, return concrete artifacts: Jinja2 template files, evaluation datasets, eval reports with pass rates, regression analysis, guardrail rule configurations, or prompt adaptation mappings. Name model-specific behaviors that require empirical testing instead of assuming consistency across providers.
