# Dimension Extractors

Extraction prompts and signal classification rules for each of the 5 dimensions.

## Signal Detection Patterns

### Universal Signals (all dimensions)

Scan session transcript for:
- **User corrections**: "不要...", "应该...", "stop", "别...", "怎么又..."
- **User approvals**: "perfect", "对了", "很好", "keep doing", "正是我要的"
- **Explicit statements**: "我喜欢...", "我的习惯是...", "以后都..."
- **Tool failures**: Error messages, stack traces, build failures
- **Repeated patterns**: Same type of task appearing 3+ times

---

## Dimension 1: Project Core

**What to extract:**
- Tech stack facts (runtime, frameworks, package manager, test runner)
- Architecture decisions (why X over Y, trade-offs made)
- Naming conventions (file naming, variable naming, commit conventions)
- Key patterns (error handling, async patterns, state management)

**Extraction prompt:**
```
Review the session transcript. Extract facts about:
1. What technology stack is used (languages, frameworks, tools)
2. Any architecture decisions discussed or revealed
3. Naming conventions observed in code edits
4. Recurring patterns in the codebase

For each fact, rate confidence (0.0-1.0):
- 1.0: Explicitly stated by user or confirmed in code
- 0.8: Clearly observed in code edits
- 0.6: Inferred from context
- <0.5: Uncertain, skip

Format: "- [DATE] fact | confidence: X | source: skill-name"
```

**Section routing:**
| Signal Type | Target Section |
|---|---|
| Language/framework detection | Tech Stack |
| "We chose X because..." | Architecture Decisions |
| File naming observed | Conventions |
| Error handling pattern | Key Patterns |

---

## Dimension 2: User Needs

**What to extract:**
- Recurring tasks (code review, debugging, planning)
- Preferred workflows (TDD, plan-first, direct coding)
- Common commands/skills invoked
- Explicit preferences ("I want...", "Always...")

**Extraction prompt:**
```
Review the session transcript. Extract:
1. What tasks did the user perform? (categorize: coding, debugging, planning, review, docs)
2. What workflow did they follow? (plan-first, TDD, direct, iterative)
3. What skills/commands did they invoke?
4. Any explicit preferences stated? ("I prefer...", "Don't...", "Always...")

Mark each as explicit (user stated) or inferred (observed).
Format: "- [DATE] preference | explicit: true/false | frequency: N"
```

**Section routing:**
| Signal Type | Target Section |
|---|---|
| Same task 3+ sessions | Recurring Tasks |
| Workflow pattern observed | Preferred Workflows |
| Skill invocation | Common Commands |
| "I want..." / "Don't..." | Explicit Preferences |

---

## Dimension 3: Developer Profile

**What to extract:**
- Coding style (functional vs OOP, verbosity, comment density)
- Expertise signals (generic types, error handling sophistication, testing patterns)
- Working habits (session length, break patterns, review discipline)
- Communication preferences (language, detail level, emoji usage)

**Extraction prompt:**
```
Review the session transcript. Analyze the developer's:
1. Coding style preferences (functional/OOP, verbose/concise, comment density)
2. Expertise level per technology (beginner/intermediate/advanced)
   - Advanced: uses generics, writes custom hooks, debugs async
   - Intermediate: competent but asks questions
   - Beginner: struggles with basics
3. Working habits (session duration, self-review before asking, testing discipline)
4. Communication style (language preference, detail level)

Provide evidence count (how many observations support each finding).
Format: "- [DATE] observation | evidence_count: N | confidence: X"
```

**Section routing:**
| Signal Type | Target Section |
|---|---|
| Code edit style | Coding Style |
| Complexity of code written | Expertise Level |
| Session patterns | Working Habits |
| Language/tone used | Communication Preferences |

---

## Dimension 4: Long-term Memory

**What to extract:**
- Lessons learned (hard-won insights, debugging breakthroughs)
- Past decisions (why X was chosen over Y)
- Durable facts (project statistics, configurations)
- Gotchas (non-obvious behaviors, edge cases)

**Quality gate (inherited from csp-learner):**
- Could someone Google this in 5 minutes? → NO (must pass)
- Is this specific to THIS project? → YES (must pass)
- Did this take real effort to discover? → YES (must pass)

**Extraction prompt:**
```
Review the session transcript. Extract DURABLE knowledge:
1. Lessons learned from debugging or problem-solving
2. Decisions made and their rationale
3. Facts that will be useful in future sessions
4. Gotchas or non-obvious behaviors discovered

Apply quality gate:
- Skip if Googleable
- Skip if generic programming knowledge
- Skip if already in auto-memory

Format: "- [DATE] lesson | confidence: X | source: skill | context: brief"
```

**Section routing:**
| Signal Type | Target Section |
|---|---|
| Bug fix insight | Lessons Learned |
| "We chose X" | Past Decisions |
| Config fact | Durable Facts |
| "Watch out for..." | Gotchas |

---

## Dimension 5: Skill Feedback

**What to extract:**
- Positive signals (user praised a skill's output)
- Negative signals (user corrected or expressed frustration)
- Missing coverage (user asked for something no skill handles)
- Optimization suggestions (user explicitly said "skill X should...")

**Extraction prompt:**
```
Review the session transcript. Extract skill performance signals:
1. Positive: User approved skill output ("perfect", "exactly right", "对了")
2. Negative: User corrected skill output ("不对", "wrong", "should be...")
3. Missing: User asked for functionality that no skill provided
4. Suggestion: User explicitly suggested skill improvement

For each signal, identify:
- Which skill (if any)
- Gap type: missing_trigger, missing_rule, missing_context, loophole, stale, bloat
- Severity: high (explicit correction), medium (frustration), low (suggestion)

Format: "- [DATE] signal | skill: X | gap_type: Y | severity: Z"
```

**Section routing:**
| Signal Type | Target Section |
|---|---|
| User praised output | Positive Signals |
| User corrected output | Negative Signals |
| No skill matched need | Missing Coverage |
| "Skill X should..." | Optimization Suggestions |
