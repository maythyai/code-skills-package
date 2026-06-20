---
name: csp-doubt-driven-development
description: Subjects every non-trivial decision to a fresh-context adversarial review before it stands. Use when correctness matters more than speed, when working in unfamiliar code, when stakes are high (production, security-sensitive logic, irreversible operations), or any time a confident output would be cheaper to verify now than to debug later.
layer: 1
category: meta
---

| Rationalization | Counter |
|-----------------|---------|
| "I'm confident, skip the doubt step" | Confidence correlates poorly with correctness on novel problems. Moments of certainty are exactly when blind spots hide. |
| "Spawning a reviewer is expensive" | Debugging a wrong commit in production is more expensive. The check is bounded; the bug isn't. |
| "The reviewer will just nitpick" | Only if unscoped. Constrain the prompt to "issues that would make this fail under the contract." |
| "I'll do doubt at the end with `/review`" | `/review` is a final gate. Doubt-driven catches wrong directions early when course-correction is cheap. By PR time it's too late. |
| "If I doubt every step I'll never ship" | The skill applies to non-trivial decisions, not every keystroke. Re-read "When NOT to Use." |
| "Two opinions are always better than one" | Not when the second has less context and produces noise. Reconcile, don't defer. |
| "The reviewer disagreed so I was wrong" | The reviewer lacks your context — disagreement is information, not verdict. Re-read the artifact, classify, then decide. |
| "Cross-model is always better" | Cross-model catches blind spots a single model shares with itself, but it adds cost and tool fragility. Offer it every interactive doubt cycle — the user decides whether the artifact warrants it. The agent's job is to surface the choice, not to gate it. |
| "User said yes once, so I can keep invoking the CLI" | Each invocation is its own authorization. The artifact, the prompt, and the flags change between calls — re-confirm the exact command with the user before every run. |

## Red Flags

- Spawning a fresh-context reviewer for a one-line rename or formatting change
- Treating reviewer output as authoritative without re-reading the artifact text
- Looping >3 cycles without escalating to the user
- Prompting the reviewer with "is this good?" instead of "find issues"
- Skipping doubt under time pressure on a high-stakes decision
- Re-spawning fresh-context on an unchanged artifact (you'll get the same findings; you're stalling)
- **Doubt theater (checkable signal)**: across 2 or more cycles where the reviewer surfaced substantive findings, zero findings were classified as actionable. You are validating, not doubting. Stop and escalate.
- Doubting only after committing — that's `/review`, not doubt-driven development
- Hardcoding an external CLI invocation without confirming with the user that the tool exists, is configured, and accepts that exact syntax
- **Silently skipping cross-model in an interactive doubt cycle.** Even when not recommending it, the offer must be visible. Skipping is fine; silent skipping is not.
- Falling back silently when an external CLI errors or is missing — surface the failure and let the user redirect
- Stripping the contract from the reviewer's input
- Passing the CLAIM to the reviewer (biases toward agreement)

## Interaction with Other Skills

- **`csp-code-review-and-quality` / `/review`**: complementary. `/review` is post-hoc PR verdict; doubt-driven is in-flight per-decision. Use both.
- **`csp-source-driven-development`**: SDD verifies *facts about frameworks* against official docs. Doubt-driven verifies *your reasoning about the artifact*. SDD checks the API exists; doubt-driven checks you used it correctly under the contract.
- **`csp-test-driven-development`**: TDD's RED step is doubt made concrete — a failing test is a disproof attempt. When TDD applies, that failing test *is* the doubt step for behavioral claims.
- **`csp-debugging-and-error-recovery`**: when the reviewer surfaces a real failure mode, drop into the debugging skill to localize and fix.
- **Repo orchestration rules** (`references/orchestration-patterns.md`): this skill orchestrates from the main session. A persona calling another persona is anti-pattern B — see Loading Constraints above.

## Verification

After applying doubt-driven development:

- [ ] Every non-trivial decision (per the definition above) was named explicitly as a CLAIM before standing
- [ ] At least one fresh-context review per non-trivial artifact (a failing test produced by TDD's RED step satisfies this for behavioral claims, per Interaction with Other Skills)
- [ ] The reviewer received ARTIFACT + CONTRACT — NOT the CLAIM, NOT your reasoning
- [ ] The reviewer's prompt was adversarial ("find issues"), not validating ("is it good")
- [ ] Findings were classified against the artifact text (not rubber-stamped) using the precedence: contract misread / actionable / trade-off / noise
- [ ] A stop condition was met (trivial findings, 3 cycles, or user override)
- [ ] In interactive mode, cross-model was **explicitly offered** to the user (regardless of artifact stakes) and the response was acknowledged in the output
- [ ] In non-interactive mode, cross-model was skipped and the skip was announced
- [ ] Any external CLI invocation was preceded by a PATH check, a working-binary test, syntax confirmation with the user, and explicit authorization to run
