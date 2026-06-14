<purpose>
Analyze freeform text from the user and route to the most appropriate CSP command. This is a dispatcher — it never does the work itself. Match user intent to the best command, confirm the routing, and hand off.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="validate">
**Check for input.**


**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
If `$ARGUMENTS` is empty, ask via AskUserQuestion:

```
What would you like to do? Describe the task, bug, or idea and I'll route it to the right CSP command.
```

Wait for response before continuing.
</step>

<step name="check_project">
**Check if project exists.**

```bash
INIT=$(csp-sdk query state.load 2>/dev/null)
```

Track whether `.planning/` exists — some routes require it, others don't.
</step>

<step name="route">
**Match intent to command.**

Evaluate `$ARGUMENTS` against these routing rules. Apply the **first matching** rule:

| If the text describes... | Route to | Why |
|--------------------------|----------|-----|
| Starting a new project, "set up", "initialize" | `/csp-new-project` | Needs full project initialization |
| Mapping or analyzing an existing codebase | `/csp-map-codebase` | Codebase discovery |
| A bug, error, crash, failure, or something broken | `/csp-debug` | Needs systematic investigation |
| Spiking, "test if", "will this work", "experiment", "prove this out", validate feasibility | `/csp-spike` | Throwaway experiment to validate feasibility |
| Sketching, "mockup", "what would this look like", "prototype the UI", "design this", explore visual direction | `/csp-sketch` | Throwaway HTML mockups to explore design |
| Wrapping up spikes, "package the spikes", "consolidate spike findings" | `/csp-spike --wrap-up` | Package spike findings into reusable skill |
| Wrapping up sketches, "package the designs", "consolidate sketch findings" | `/csp-sketch --wrap-up` | Package sketch findings into reusable skill |
| Exploring, researching, comparing, or "how does X work" | `/csp-explore` | Socratic ideation and idea routing |
| Discussing vision, "how should X look", brainstorming | `/csp-discuss-phase` | Needs context gathering |
| A complex task: refactoring, migration, multi-file architecture, system redesign | `/csp-phase` | Needs a full phase with plan/build cycle |
| Planning a specific phase or "plan phase N" | `/csp-plan-phase` | Direct planning request |
| Executing a phase or "build phase N", "run phase N" | `/csp-execute-phase` | Direct execution request |
| Running all remaining phases automatically | `/csp-autonomous` | Full autonomous execution |
| A review or quality concern about existing work | `/csp-verify-work` | Needs verification |
| Checking progress, status, "where am I" | `/csp-progress` | Status check |
| Resuming work, "pick up where I left off" | `/csp-resume-work` | Session restoration |
| A note, idea, or "remember to..." | `/csp-capture` | Capture for later |
| Adding tests, "write tests", "test coverage" | `/csp-add-tests` | Test generation |
| Completing a milestone, shipping, releasing | `/csp-complete-milestone` | Milestone lifecycle |
| A specific, actionable, small task (add feature, fix typo, update config) | `/csp-quick` | Self-contained, single executor |

**Requires `.planning/` directory:** All routes except `/csp-new-project`, `/csp-map-codebase`, `/csp-spike`, `/csp-sketch`, and `/csp-help`. If the project doesn't exist and the route requires it, suggest `/csp-new-project` first.

**Ambiguity handling:** If the text could reasonably match multiple routes, ask the user via AskUserQuestion with the top 2-3 options. For example:

```
"Refactor the authentication system" could be:
1. /csp-phase — Full planning cycle (recommended for multi-file refactors)
2. /csp-quick — Quick execution (if scope is small and clear)

Which approach fits better?
```
</step>

<step name="display">
**Show the routing decision.**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CSP ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Input:** {first 80 chars of $ARGUMENTS}
**Routing to:** {chosen command}
**Reason:** {one-line explanation}
```
</step>

<step name="dispatch">
**Invoke the chosen command.**

Run the selected `/csp-*` command, passing `$ARGUMENTS` as args.

If the chosen command expects a phase number and one wasn't provided in the text, extract it from context or ask via AskUserQuestion.

After invoking the command, stop. The dispatched command handles everything from here.
</step>

</process>

<success_criteria>
- [ ] Input validated (not empty)
- [ ] Intent matched to exactly one CSP command
- [ ] Ambiguity resolved via user question (if needed)
- [ ] Project existence checked for routes that require it
- [ ] Routing decision displayed before dispatch
- [ ] Command invoked with appropriate arguments
- [ ] No work done directly — dispatcher only
</success_criteria>
