---
name: csp-ultraqa
description: QA cycling workflow - test, verify, fix, repeat until goal met
argument-hint: "[--tests|--build|--lint|--typecheck|--custom <pattern>] [--interactive]"
layer: 3
---

| Command | Goal Type | Success Criteria |
|---------|-----------|------------------|
| `/code-skills-package:ultraqa --tests`            | tests     | All test suites pass             |
| `/code-skills-package:ultraqa --build`            | build     | Build succeeds with exit 0       |
| `/code-skills-package:ultraqa --lint`             | lint      | No lint errors                   |
| `/code-skills-package:ultraqa --typecheck`        | typecheck | No TypeScript errors             |
| `/code-skills-package:ultraqa --custom "pattern"` | custom    | Custom success pattern in output |

If no structured goal provided, interpret the argument as a custom goal.

## Cycle Workflow

### Cycle N (Max 5)

1. **RUN QA**: Execute verification based on goal type
   - `--tests`: Run the project's test command
   - `--build`: Run the project's build command
   - `--lint`: Run the project's lint command
   - `--typecheck`: Run the project's type check command
   - `--custom`: Run appropriate command and check for pattern
   - `--interactive`: Use qa-tester for interactive CLI/service testing:
     ```
     Task(subagent_type="code-skills-package:qa-tester", model="sonnet", prompt="TEST:
     Goal: [describe what to verify]
     Service: [how to start]
     Test cases: [specific scenarios to verify]")
     ```

2. **CHECK RESULT**: Did the goal pass?
   - **YES** → Exit with success message
   - **NO** → Continue to step 3

3. **ARCHITECT DIAGNOSIS**: Spawn architect to analyze failure

   ```
   Task(subagent_type="code-skills-package:architect", model="opus", prompt="DIAGNOSE FAILURE:
   Goal: [goal type]
   Output: [test/build output]
   Provide root cause and specific fix recommendations.")
   ```

4. **FIX ISSUES**: Apply architect's recommendations

   ```
   Task(subagent_type="code-skills-package:executor", model="sonnet", prompt="FIX:
   Issue: [architect diagnosis]
   Files: [affected files]
   Apply the fix precisely as recommended.")
   ```

5. **REPEAT**: Go back to step 1

## Exit Conditions

| Condition             | Action                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| **Goal Met**          | Exit with success: "ULTRAQA COMPLETE: Goal met after N cycles"                |
| **Cycle 5 Reached**   | Exit with diagnosis: "ULTRAQA STOPPED: Max cycles. Diagnosis: ..."            |
| **Same Failure 3x**   | Exit early: "ULTRAQA STOPPED: Same failure detected 3 times. Root cause: ..." |
| **Environment Error** | Exit: "ULTRAQA ERROR: [tmux/port/dependency issue]"                           |

## Observability

Output progress each cycle:

```
[ULTRAQA Cycle 1/5] Running tests...
[ULTRAQA Cycle 1/5] FAILED - 3 tests failing
[ULTRAQA Cycle 1/5] Architect diagnosing...
[ULTRAQA Cycle 1/5] Fixing: auth.test.ts - missing mock
[ULTRAQA Cycle 2/5] Running tests...
[ULTRAQA Cycle 2/5] PASSED - All 47 tests pass
[ULTRAQA COMPLETE] Goal met after 2 cycles
```

## State Tracking

Track state in `.csp/ultraqa-state.json`:

```json
{
  "active": true,
  "goal_type": "tests",
  "goal_pattern": null,
  "cycle": 1,
  "max_cycles": 5,
  "failures": ["3 tests failing: auth.test.ts"],
  "started_at": "2024-01-18T12:00:00Z",
  "session_id": "uuid"
}
```

## Cancellation

User can cancel with `/code-skills-package:cancel` which clears the state file.

## Important Rules

1. **PARALLEL when possible** - Run diagnosis while preparing potential fixes
2. **TRACK failures** - Record each failure to detect patterns
3. **EARLY EXIT on pattern** - 3x same failure = stop and surface
4. **CLEAR OUTPUT** - User should always know current cycle and status
5. **CLEAN UP** - Clear state file on completion or cancellation

## STATE CLEANUP ON COMPLETION

**IMPORTANT: Delete state files on completion - do NOT just set `active: false`**

When goal is met OR max cycles reached OR exiting early:

```bash
# Delete ultraqa state file
rm -f .csp/state/ultraqa-state.json
```

This ensures clean state for future sessions. Stale state files with `active: false` should not be left behind.

## Parallel session caveats

- **Multi-repo workspace anchor:** drop a `.csp-workspace` marker at the parent directory so multiple sessions across sub-repos share one `.csp/`. Resolution order: `CSP_STATE_DIR > .csp-workspace > git > cwd`. See `docs/REFERENCE.md`.
- **Session id source:** CSP_SESSION_ID env var wins in CLI contexts; hook payload data.session_id wins in hook contexts.
- **Plan id (when applicable):** UltraQA state is session-scoped. Mutual-exclusion with ralph applies only within the same session.
- **Parallel verdict:** supported (session-scoped state)

---

Begin ULTRAQA cycling now. Parse the goal and start cycle 1.
